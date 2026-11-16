"""Pure, deterministic protocol write layer for Agent Work Network proposals.

This module adds the proposal-oriented operations the protocol defines
(``submit_bid``, ``counter_offer``, ``accept_terms``, ``submit_delivery``,
``verify_delivery``) **on top of** the frozen, fail-closed
:func:`authorize.authorize` gate. It is a pure-function layer: it performs no
I/O, no network access, no Supabase access, and no cryptography. Every entry
point takes plain dictionaries plus an explicit ``now`` and returns a plain
dictionary. ``now`` is always a parameter — the system clock is never read —
so the same inputs always produce the same output.

Return shape (one shape, used everywhere)
-----------------------------------------
Success::

    {"ok": True, "reason": "OK", "data": {...}}

Denial::

    {"ok": False, "reason": "<reason code>", "error": "<human detail>"}

``reason`` is always a member of :data:`REASON_CODES` (the exact closed set of
twelve re-exported from :mod:`authorize`). On the deny path ``reason`` is the
exact code returned by ``authorize()`` when the gate refused; downstream can
tell precisely why a write was refused. A deny never carries ``data`` and never
mutates its inputs.

Authorization order and precedence
----------------------------------
Every operation calls ``authorize()`` with the action, category, amount, and
currency the caller actually supplied (an unusable value is passed through as
``None``). Refusals that come from the delegation's own authority — revoked,
not-yet-valid, expired, action not allowed, category not allowed, human
approval required — are returned verbatim, even when the payload is also
malformed. When the gate allows the attempt (or its only complaint is the
caller's malformed money field, ``INVALID_AMOUNT`` / ``CURRENCY_MISMATCH``) but
the payload is structurally malformed, the layer fails closed with
``INVALID_DELEGATION``. There is no code path that builds or returns an
artifact without ``authorize()`` having allowed it.

Chain linking
-------------
``counter_offer`` links to its parent bid via ``parent_bid_id``;
``accept_terms`` produces contract terms whose ``accepted_bid_id`` references
the accepted bid; ``submit_delivery`` and ``verify_delivery`` reference the
contract (and the verification references the delivery).
"""
from datetime import datetime, timezone
import copy
import math

from authorize import REASON_CODES, authorize


__all__ = [
    "REASON_CODES",
    "submit_bid",
    "counter_offer",
    "accept_terms",
    "submit_delivery",
    "verify_delivery",
]


# Denials the delegation itself produces, independent of the payload. These
# win over a malformed payload; any other gate refusal is superseded by the
# uniform fail-closed ``INVALID_DELEGATION`` for malformed input.
_AUTHORITY_DENIALS = frozenset({
    "DELEGATION_REVOKED",
    "DELEGATION_EXPIRED",
    "DELEGATION_NOT_YET_VALID",
    "ACTION_NOT_ALLOWED",
    "CATEGORY_NOT_ALLOWED",
    "REQUIRES_HUMAN_APPROVAL",
})

_DEFAULT_MILESTONE = {
    "id": "m1",
    "description": "Deliver the agreed work as specified.",
    "release_fraction": 1,
}
_DEFAULT_CRITERION = {
    "id": "a1",
    "description": "Requester confirms the delivered work meets the agreed terms.",
    "verification": "requester_confirmation",
    "required": True,
}
_CANCELLATION_POLICY = "Human approval required after terms are accepted."
_DISPUTE_POLICY = "Freeze settlement and route to human review."


# --- small total helpers ----------------------------------------------------


def _ok(data):
    return {"ok": True, "reason": "OK", "data": data}


def _deny(reason, detail):
    return {"ok": False, "reason": reason, "error": detail}


def _nonempty_str(value):
    return isinstance(value, str) and bool(value)


def _action(name, category=None):
    if category is None:
        return name
    return {"name": name, "category": category}


def _money_of(container, key):
    """Return ``(amount, currency)`` for the gate, never raising.

    A non-monetary consideration spends no money, so it is gated as ``0`` with
    no currency. An unparseable shape yields ``(None, None)`` so the gate
    refuses and the payload check reports ``INVALID_DELEGATION``.
    """
    if not isinstance(container, dict):
        return None, None
    money = container.get(key)
    if not isinstance(money, dict):
        return None, None
    if money.get("consideration_type") == "non_monetary":
        return 0, None
    return money.get("amount"), money.get("currency")


def _extensions_category(record):
    if isinstance(record, dict):
        extensions = record.get("extensions")
        if isinstance(extensions, dict) and _nonempty_str(extensions.get("task_category")):
            return extensions["task_category"]
    return None


def _parse_now(now):
    if isinstance(now, datetime):
        parsed = now
    elif isinstance(now, str):
        try:
            parsed = datetime.fromisoformat(now.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            return None
    else:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def _require_iso(now):
    parsed = _parse_now(now)
    if parsed is None:
        raise ValueError("now must be a timezone-aware datetime or ISO-8601 string")
    return parsed.isoformat().replace("+00:00", "Z")


def _finish(decision, problem, builder):
    """Apply one uniform precedence rule for every operation."""
    if problem is not None:
        if decision.reason_code in _AUTHORITY_DENIALS:
            return _deny(decision.reason_code, decision.detail)
        return _deny("INVALID_DELEGATION", problem)
    if not decision.allowed:
        return _deny(decision.reason_code, decision.detail)
    try:
        return _ok(builder())
    except (AttributeError, KeyError, TypeError, ValueError):
        return _deny("INVALID_DELEGATION", "Input could not be assembled into a protocol artifact")


# --- payload shape checks (pure, total) -------------------------------------


def _party_problem(party, label):
    if not isinstance(party, dict):
        return f"{label} must be an object"
    for field in ("principal_id", "agent_id"):
        if not _nonempty_str(party.get(field)):
            return f"{label}.{field} must be a non-empty string"
    return None


def _offer_problem(money, *, allow_negotiable=False):
    if not isinstance(money, dict):
        return "consideration must be an object"
    consideration_type = money.get("consideration_type")
    if consideration_type == "monetary":
        amount = money.get("amount")
        if (
            isinstance(amount, bool)
            or not isinstance(amount, (int, float))
            or not math.isfinite(amount)
            or amount < 0
        ):
            return "monetary consideration amount must be a finite, non-negative number"
        if not _nonempty_str(money.get("currency")):
            return "monetary consideration currency must be a non-empty string"
        return None
    if consideration_type == "non_monetary":
        return None
    if consideration_type == "negotiable" and allow_negotiable:
        return None
    return f"consideration_type is missing or not accepted: {consideration_type!r}"


def _submit_bid_problem(task, bid):
    if not isinstance(task, dict) or not _nonempty_str(task.get("task_id")):
        return "task.task_id must be a non-empty string"
    if not _nonempty_str(task.get("task_type")):
        return "task.task_type must be a non-empty string"
    if not isinstance(bid, dict):
        return "bid must be an object"
    if not _nonempty_str(bid.get("bid_id")):
        return "bid.bid_id must be a non-empty string"
    if bid.get("task_id") != task["task_id"]:
        return "bid.task_id must match task.task_id"
    if bid.get("parent_bid_id") is not None:
        return "submit_bid must not carry a parent_bid_id; use counter_offer"
    problem = _party_problem(bid.get("provider"), "bid.provider")
    if problem:
        return problem
    return _offer_problem(bid.get("offer"))


def _counter_offer_problem(parent, counter):
    if not isinstance(parent, dict):
        return "bid must be an object"
    if not _nonempty_str(parent.get("bid_id")):
        return "bid.bid_id must be a non-empty string"
    if not _nonempty_str(parent.get("task_id")):
        return "bid.task_id must be a non-empty string"
    if not _nonempty_str(parent.get("estimated_duration")):
        return "bid.estimated_duration must be a non-empty string"
    problem = _party_problem(parent.get("provider"), "bid.provider")
    if problem:
        return problem
    problem = _offer_problem(parent.get("offer"), allow_negotiable=True)
    if problem:
        return problem
    if not isinstance(counter, dict):
        return "counter must be an object"
    bid_id = counter.get("bid_id")
    if bid_id is not None and not _nonempty_str(bid_id):
        return "counter.bid_id must be a non-empty string when present"
    return _offer_problem(counter.get("offer"))


def _accept_terms_problem(bid):
    if not isinstance(bid, dict):
        return "bid must be an object"
    if not _nonempty_str(bid.get("bid_id")):
        return "bid.bid_id must be a non-empty string"
    if not _nonempty_str(bid.get("task_id")):
        return "bid.task_id must be a non-empty string"
    problem = _party_problem(bid.get("provider"), "bid.provider")
    if problem:
        return problem
    return _offer_problem(bid.get("offer"))


def _contract_problem(contract):
    if not isinstance(contract, dict):
        return "contract must be an object"
    if not _nonempty_str(contract.get("contract_id")):
        return "contract.contract_id must be a non-empty string"
    if not _nonempty_str(contract.get("task_id")):
        return "contract.task_id must be a non-empty string"
    if not _nonempty_str(contract.get("accepted_bid_id")):
        return "contract.accepted_bid_id must be a non-empty string"
    problem = _party_problem(contract.get("provider"), "contract.provider")
    if problem:
        return problem
    return _offer_problem(contract.get("consideration"))


def _submit_delivery_problem(contract, delivery):
    problem = _contract_problem(contract)
    if problem:
        return problem
    if not isinstance(delivery, dict):
        return "delivery must be an object"
    if not _nonempty_str(delivery.get("delivery_id")):
        return "delivery.delivery_id must be a non-empty string"
    if "evidence" in delivery and not isinstance(delivery["evidence"], list):
        return "delivery.evidence must be an array when present"
    return None


def _verify_delivery_problem(contract, verification):
    problem = _contract_problem(contract)
    if problem:
        return problem
    if not isinstance(verification, dict):
        return "verification must be an object"
    if not _nonempty_str(verification.get("verification_id")):
        return "verification.verification_id must be a non-empty string"
    if not _nonempty_str(verification.get("delivery_id")):
        return "verification.delivery_id must be a non-empty string"
    if not _nonempty_str(verification.get("result")):
        return "verification.result must be a non-empty string"
    return None


# --- artifact builders ------------------------------------------------------


def _submit_bid_data(task, bid, now):
    record = copy.deepcopy(bid)
    record["bid_id"] = bid["bid_id"]
    record["task_id"] = task["task_id"]
    record["status"] = "proposed"
    record["parent_bid_id"] = None
    record["created_at"] = _require_iso(now)
    record.setdefault("extensions", {})
    return {"bid": record}


def _counter_offer_data(parent, counter, now):
    record = {
        "bid_id": counter.get("bid_id") or f"{parent['bid_id']}::counter",
        "task_id": parent["task_id"],
        "provider": copy.deepcopy(parent["provider"]),
        "offer": copy.deepcopy(counter["offer"]),
        "estimated_duration": counter.get("estimated_duration", parent.get("estimated_duration")),
        "assumptions": copy.deepcopy(counter.get("assumptions", parent.get("assumptions", []))),
        "exclusions": copy.deepcopy(counter.get("exclusions", parent.get("exclusions", []))),
        "evidence": copy.deepcopy(counter.get("evidence", parent.get("evidence", []))),
        "valid_until": counter.get("valid_until", parent.get("valid_until")),
        "status": "countered",
        "parent_bid_id": parent["bid_id"],
        "created_at": _require_iso(now),
        "extensions": {**parent.get("extensions", {}), **counter.get("extensions", {})},
    }
    return {"bid": record}


def _accept_terms_data(delegation, bid, now):
    offer = bid["offer"]
    extensions = bid.get("extensions")
    if not isinstance(extensions, dict):
        extensions = {}
    thresholds = delegation["approval_thresholds"]
    human_actions = thresholds.get("human_approval_actions", [])
    autonomous_amount = thresholds["max_autonomous_spend"]["amount"]
    contract = {
        "contract_id": f"contract::{bid['bid_id']}",
        "task_id": bid["task_id"],
        "accepted_bid_id": bid["bid_id"],
        "requester": {
            "principal_id": delegation["principal"]["id"],
            "agent_id": delegation["agent"]["id"],
        },
        "provider": {
            "principal_id": bid["provider"]["principal_id"],
            "agent_id": bid["provider"]["agent_id"],
        },
        "task_snapshot_hash": extensions.get("task_snapshot_hash"),
        "consideration": {
            "consideration_type": offer["consideration_type"],
            "amount": offer.get("amount"),
            "currency": offer.get("currency"),
            "note": offer.get("note"),
        },
        "milestones": copy.deepcopy(extensions.get("milestones") or [_DEFAULT_MILESTONE]),
        "acceptance_criteria": copy.deepcopy(
            extensions.get("acceptance_criteria") or [_DEFAULT_CRITERION]
        ),
        "approval_requirements": {
            "accept_terms": "human_required" if "accept_terms" in human_actions else "agent_allowed",
            "release_value": "human_required" if "release_value" in human_actions else "agent_allowed",
            "max_autonomous_amount": autonomous_amount,
        },
        "cancellation_policy": _CANCELLATION_POLICY,
        "dispute_policy": _DISPUTE_POLICY,
        "created_at": _require_iso(now),
        "audit_refs": [f"accepted_bid:{bid['bid_id']}"],
        "extensions": {},
    }
    return {"contract": contract}


def _submit_delivery_data(contract, delivery, now):
    record = {
        "delivery_id": delivery["delivery_id"],
        "contract_id": contract["contract_id"],
        "task_id": contract["task_id"],
        "provider": copy.deepcopy(contract["provider"]),
        "submitted_at": _require_iso(now),
        "status": "submitted",
        "summary": delivery.get("summary"),
        "evidence": copy.deepcopy(delivery.get("evidence", [])),
        "extensions": copy.deepcopy(delivery.get("extensions", {})),
    }
    return {"delivery": record}


def _verify_delivery_data(contract, verification, now):
    record = {
        "verification_id": verification["verification_id"],
        "contract_id": contract["contract_id"],
        "delivery_id": verification["delivery_id"],
        "task_id": contract["task_id"],
        "verified_at": _require_iso(now),
        "result": verification["result"],
        "criteria_results": copy.deepcopy(verification.get("criteria_results", [])),
        "extensions": copy.deepcopy(verification.get("extensions", {})),
    }
    return {"verification": record}


# --- operations -------------------------------------------------------------


def submit_bid(delegation, task, bid, now):
    """A provider agent proposes a bid on ``task``, gated by ``authorize()``."""
    amount, currency = _money_of(bid, "offer")
    category = task.get("task_type") if isinstance(task, dict) else None
    if not _nonempty_str(category):
        category = None
    decision = authorize(delegation, _action("submit_bid", category), amount, now, currency=currency)
    problem = _submit_bid_problem(task, bid)
    return _finish(decision, problem, lambda: _submit_bid_data(task, bid, now))


def counter_offer(delegation, bid, counter, now):
    """A requester agent counters ``bid``; the result links to its parent bid."""
    amount, currency = _money_of(counter, "offer")
    decision = authorize(
        delegation, _action("counter_offer", _extensions_category(bid)), amount, now, currency=currency
    )
    problem = _counter_offer_problem(bid, counter)
    return _finish(decision, problem, lambda: _counter_offer_data(bid, counter, now))


def accept_terms(delegation, bid, now):
    """A requester agent accepts ``bid`` and produces linked contract terms."""
    amount, currency = _money_of(bid, "offer")
    decision = authorize(
        delegation, _action("accept_terms", _extensions_category(bid)), amount, now, currency=currency
    )
    problem = _accept_terms_problem(bid)
    return _finish(decision, problem, lambda: _accept_terms_data(delegation, bid, now))


def submit_delivery(delegation, contract, delivery, now):
    """A provider agent submits work against ``contract``."""
    amount, currency = _money_of(contract, "consideration")
    decision = authorize(
        delegation,
        _action("submit_delivery", _extensions_category(contract)),
        amount,
        now,
        currency=currency,
    )
    problem = _submit_delivery_problem(contract, delivery)
    return _finish(decision, problem, lambda: _submit_delivery_data(contract, delivery, now))


def verify_delivery(delegation, contract, verification, now):
    """A requester agent verifies a delivery against ``contract``."""
    amount, currency = _money_of(contract, "consideration")
    decision = authorize(
        delegation,
        _action("verify_delivery", _extensions_category(contract)),
        amount,
        now,
        currency=currency,
    )
    problem = _verify_delivery_problem(contract, verification)
    return _finish(decision, problem, lambda: _verify_delivery_data(contract, verification, now))
