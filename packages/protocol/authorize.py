"""Pure, fail-closed checks for Principal-to-Agent delegations."""
from dataclasses import dataclass
from datetime import datetime, timezone
import math
from typing import Any


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason_code: str
    detail: str


def _deny(code: str, detail: str) -> Decision:
    return Decision(False, code, detail)


def _parse_time(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return None
    else:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def _amount(value: Any) -> float | int | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value) or value < 0:
        return None
    return value


def _mapping(value: Any) -> bool:
    return isinstance(value, dict)


def check_spend(delegation, amount) -> Decision:
    try:
        if not _mapping(delegation) or not _mapping(delegation.get("scope")):
            return _deny("INVALID_DELEGATION", "Delegation scope is missing or malformed")
        requested = _amount(amount)
        limit = delegation["scope"]["max_spend"]
        maximum = _amount(limit["amount"])
        if requested is None or not isinstance(limit.get("currency"), str) or not limit["currency"]:
            return _deny("INVALID_DELEGATION", "Spend amount or maximum spend is malformed")
        if maximum is None:
            return _deny("INVALID_DELEGATION", "Maximum spend is malformed")
        if requested > maximum:
            return _deny("SPEND_EXCEEDS_MAX", f"Requested amount {requested} exceeds maximum {maximum}")
        return Decision(True, "OK", "Requested spend is within the delegation maximum")
    except (AttributeError, KeyError, TypeError):
        return _deny("INVALID_DELEGATION", "Delegation spend data is incomplete")


def _action_parts(action: Any) -> tuple[str, str | None] | None:
    if isinstance(action, str) and action:
        return action, None
    if isinstance(action, dict) and isinstance(action.get("name"), str) and action["name"]:
        category = action.get("category")
        if category is not None and (not isinstance(category, str) or not category):
            return None
        return action["name"], category
    return None


def check_action_allowed(delegation, action) -> Decision:
    try:
        if not _mapping(delegation) or not _mapping(delegation.get("scope")):
            return _deny("INVALID_DELEGATION", "Delegation scope is missing or malformed")
        parts = _action_parts(action)
        allowed = delegation["scope"]["allowed_actions"]
        categories = delegation["scope"]["allowed_task_categories"]
        if not isinstance(allowed, list) or not all(isinstance(item, str) and item for item in allowed):
            return _deny("INVALID_DELEGATION", "Allowed actions are malformed")
        if not isinstance(categories, list) or not all(isinstance(item, str) and item for item in categories):
            return _deny("INVALID_DELEGATION", "Allowed task categories are malformed")
        if parts is None:
            return _deny("INVALID_DELEGATION", "Action must be a non-empty name or action object")
        name, category = parts
        if name not in allowed:
            return _deny("ACTION_NOT_ALLOWED", f"Action is not allowed: {name}")
        if category is not None and category not in categories:
            return _deny("CATEGORY_NOT_ALLOWED", f"Task category is not allowed: {category}")
        return Decision(True, "OK", "Action is within the delegation scope")
    except (AttributeError, KeyError, TypeError):
        return _deny("INVALID_DELEGATION", "Delegation action data is incomplete")


def check_validity(delegation, now) -> Decision:
    try:
        if not _mapping(delegation) or not _mapping(delegation.get("validity")):
            return _deny("INVALID_DELEGATION", "Delegation validity is missing or malformed")
        current = _parse_time(now)
        issued = _parse_time(delegation["validity"]["issued_at"])
        expires = _parse_time(delegation["validity"]["expires_at"])
        if current is None or issued is None or expires is None or issued >= expires:
            return _deny("INVALID_DELEGATION", "Delegation validity timestamps are malformed")
        if current < issued:
            return _deny("DELEGATION_NOT_YET_VALID", "Delegation is not valid before issued_at")
        if current >= expires:
            return _deny("DELEGATION_EXPIRED", "Delegation expires at expires_at")
        return Decision(True, "OK", "Delegation is currently valid")
    except (AttributeError, KeyError, TypeError):
        return _deny("INVALID_DELEGATION", "Delegation validity data is incomplete")


def check_revoked(delegation) -> Decision:
    try:
        if not _mapping(delegation) or not _mapping(delegation.get("revocation")):
            return _deny("INVALID_DELEGATION", "Delegation revocation is missing or malformed")
        revocation = delegation["revocation"]
        if not isinstance(revocation.get("revocable"), bool):
            return _deny("INVALID_DELEGATION", "Revocable must be a boolean")
        revoked_at = revocation.get("revoked_at")
        if revoked_at is not None and _parse_time(revoked_at) is None:
            return _deny("INVALID_DELEGATION", "Revoked-at timestamp is malformed")
        if revoked_at is not None:
            return _deny("DELEGATION_REVOKED", "Delegation has been revoked")
        return Decision(True, "OK", "Delegation is not revoked")
    except (AttributeError, KeyError, TypeError):
        return _deny("INVALID_DELEGATION", "Delegation revocation data is incomplete")


def authorize(delegation, action, amount, now) -> Decision:
    """Authorize one action; malformed or incomplete input always denies."""
    try:
        revoked = check_revoked(delegation)
        if not revoked.allowed:
            return revoked
        validity = check_validity(delegation, now)
        if not validity.allowed:
            return validity
        action_decision = check_action_allowed(delegation, action)
        if not action_decision.allowed:
            return action_decision
        spend = check_spend(delegation, amount)
        if not spend.allowed:
            return spend

        thresholds = delegation["approval_thresholds"]
        if not _mapping(thresholds):
            return _deny("INVALID_DELEGATION", "Approval thresholds are missing or malformed")
        name, category = _action_parts(action)
        if name in thresholds["human_approval_actions"]:
            return _deny("REQUIRES_HUMAN_APPROVAL", f"Action requires human approval: {name}")
        if category is not None and category in thresholds["human_approval_categories"]:
            return _deny("REQUIRES_HUMAN_APPROVAL", f"Category requires human approval: {category}")
        autonomous = thresholds["max_autonomous_spend"]
        autonomous_amount = _amount(autonomous["amount"])
        if autonomous_amount is None or not isinstance(autonomous.get("currency"), str) or not autonomous["currency"]:
            return _deny("INVALID_DELEGATION", "Autonomous spend threshold is malformed")
        if amount > autonomous_amount:
            return _deny("THRESHOLD_EXCEEDED", f"Amount {amount} exceeds autonomous threshold {autonomous_amount}")
        return Decision(True, "OK", "Action and spend are authorized")
    except (AttributeError, KeyError, TypeError):
        return _deny("INVALID_DELEGATION", "Delegation approval data is incomplete")
