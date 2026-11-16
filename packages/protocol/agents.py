"""T7: two explicit agent roles that can only act through the protocol layer.

This module is the proof-of-composition layer for the Agent Work Network. It
models the two market participants promised by ``TASKS.md`` T7 — a
**Requester Agent** and a **Provider Agent** — as small, explicit Python
classes. There is no LLM call, no network client, no Supabase access, and no
cryptography here: a role can only affect the world by calling one of the five
proposal operations in the reviewed, frozen :mod:`packages.protocol.ops`
module with its own T5 delegation, and every one of those operations is gated
by the frozen fail-closed :func:`authorize.authorize`.

Why a shared :class:`Market`
----------------------------
"Zero manual copying" means a human never carries a bid from one agent to the
other, and never retypes an amount, a currency, or a timestamp. The two roles
therefore exchange nothing directly. A single in-process :class:`Market`
holds the artifacts the protocol layer produces — the posted task, the bid
chain, the contract, the delivery, the verification — and each agent reads the
previous step from that market and writes its own output back to it. The
market also keeps the ordered transition record (actor, principal, action,
timestamp, evidence reference) that T7 needs to assert ordering. That record
is deliberately minimal: T8 formalises the append-only audit trail as its own
deliverable, and this is not it.

Role scoping
------------
:func:`requester_delegation` and :func:`provider_delegation` each build a T5
envelope in the shape of ``packages/protocol/fixtures/delegation.ops.valid.json``
whose ``allowed_actions`` are exactly the actions that role needs and no more:

* requester — ``post_task``, ``counter_offer``, ``accept_terms``,
  ``verify_delivery``;
* provider  — ``submit_bid``, ``submit_delivery``.

``post_task`` is not one of the five T6 write operations (there is no
``post_task`` in ``ops.py``), so the requester's task-posting act is checked
against the same frozen ``authorize()`` gate directly; the task itself is the
seed artifact the provider then bids on, not an artifact produced by T6.

``now`` is a parameter on every entry point; the system clock is never read,
so the same inputs always produce the same artifacts and the same audit
ordering.

Denial shape (identical to the ops layer)
-----------------------------------------
Success::

    {"ok": True, "reason": "OK", "data": {...}}

Denial::

    {"ok": False, "reason": "<authorize reason code>", "error": "<detail>"}

A denial never carries ``data``, never records a transition, and never mutates
its inputs.
"""
import copy
import sys
from datetime import datetime, timezone
from pathlib import Path

# The reviewed protocol package imports its siblings as top-level modules
# (``ops.py`` does ``from authorize import ...``), so make both the repository
# root and the protocol directory importable no matter how this module is
# reached. This mirrors ``mcp/protocol_tools.py``.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_PROTOCOL_DIR = Path(__file__).resolve().parent
for _path in (str(_REPO_ROOT), str(_PROTOCOL_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from authorize import REASON_CODES, authorize  # noqa: E402
from packages.protocol.ops import (  # noqa: E402
    accept_terms as _accept_terms,
    counter_offer as _counter_offer,
    submit_bid as _submit_bid,
    submit_delivery as _submit_delivery,
    verify_delivery as _verify_delivery,
)


__all__ = [
    "REASON_CODES",
    "SUPPORTED_OPERATIONS",
    "Market",
    "Agent",
    "RequesterAgent",
    "ProviderAgent",
    "requester_delegation",
    "provider_delegation",
]


SUPPORTED_OPERATIONS = frozenset({
    "submit_bid",
    "counter_offer",
    "accept_terms",
    "submit_delivery",
    "verify_delivery",
})

_OPERATIONS = {
    "submit_bid": _submit_bid,
    "counter_offer": _counter_offer,
    "accept_terms": _accept_terms,
    "submit_delivery": _submit_delivery,
    "verify_delivery": _verify_delivery,
}

# operation -> (data key, id field, timestamp field, market attribute)
_ARTIFACTS = {
    "submit_bid": ("bid", "bid_id", "created_at", "bids"),
    "counter_offer": ("bid", "bid_id", "created_at", "bids"),
    "accept_terms": ("contract", "contract_id", "created_at", "contract"),
    "submit_delivery": ("delivery", "delivery_id", "submitted_at", "delivery"),
    "verify_delivery": ("verification", "verification_id", "verified_at", "verification"),
}


# --- role delegations (shape of packages/protocol/fixtures/delegation.ops.valid.json)


def _delegation(
    *, role, delegation_id, principal_id, display_name, agent_id, agent_name,
    allowed_actions, allowed_tools,
):
    return {
        "delegation_id": delegation_id,
        "principal": {
            "id": principal_id,
            "display_name": display_name,
            "role": role,
        },
        "agent": {
            "id": agent_id,
            "name": agent_name,
            "public_key_ref": f"key:{agent_id}",
            "operator": "operator-local",
        },
        "scope": {
            "max_spend": {"amount": 50000, "currency": "TWD"},
            "allowed_task_categories": ["software_task"],
            "allowed_tools": list(allowed_tools),
            "allowed_actions": list(allowed_actions),
        },
        "approval_thresholds": {
            "max_autonomous_spend": {"amount": 10000, "currency": "TWD"},
            "human_approval_actions": [],
            "human_approval_categories": [],
        },
        "validity": {
            "issued_at": "2026-10-01T00:00:00Z",
            "expires_at": "2027-10-01T00:00:00Z",
        },
        "revocation": {
            "revocable": True,
            "revoked_at": None,
            "revocation_reason": None,
        },
        "constraints": {"notes": "Synthetic T7 end-to-end role delegation"},
    }


def requester_delegation():
    """The requester role's envelope: post, counter, accept and verify, no more."""
    return _delegation(
        role="requester",
        delegation_id="delegation-t7-requester",
        principal_id="human-requester",
        display_name="T7 Requester Principal",
        agent_id="requester-agent",
        agent_name="T7 Requester Agent",
        allowed_actions=["post_task", "counter_offer", "accept_terms", "verify_delivery"],
        allowed_tools=[
            "guild.post_task",
            "guild.counter_offer",
            "guild.accept_terms",
            "guild.verify_delivery",
        ],
    )


def provider_delegation():
    """The provider role's envelope: bid and deliver, no more."""
    return _delegation(
        role="provider",
        delegation_id="delegation-t7-provider",
        principal_id="human-provider",
        display_name="T7 Provider Principal",
        agent_id="provider-agent",
        agent_name="T7 Provider Agent",
        allowed_actions=["submit_bid", "submit_delivery"],
        allowed_tools=["guild.submit_bid", "guild.submit_delivery"],
    )


# --- total helpers ----------------------------------------------------------


def _deny(reason, detail):
    return {"ok": False, "reason": reason, "error": detail}


def _iso(now):
    """Normalise an injected instant the same way ``ops.py`` does."""
    if isinstance(now, datetime):
        parsed = now
    elif isinstance(now, str):
        try:
            parsed = datetime.fromisoformat(now.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            raise ValueError("now must be a timezone-aware datetime or ISO-8601 string")
    else:
        raise ValueError("now must be a timezone-aware datetime or ISO-8601 string")
    if parsed.tzinfo is None:
        raise ValueError("now must be a timezone-aware datetime or ISO-8601 string")
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _budget_money(task):
    """The requester's own spend for posting a task, for the gate to bound."""
    budget = task.get("budget") if isinstance(task, dict) else None
    if not isinstance(budget, dict):
        return None, None
    if budget.get("consideration_type") != "monetary":
        return 0, None
    return budget.get("max_amount"), budget.get("currency")


# --- the shared channel -----------------------------------------------------


class Market:
    """In-process transport and ordered transition record shared by both roles.

    It holds exactly the artifacts the protocol layer produced, so no value has
    to be retyped between agents. ``audit`` is a minimal T7 ordering record;
    T8 owns the formal append-only audit trail.
    """

    def __init__(self):
        self.task = None
        self.bids = []
        self.contract = None
        self.delivery = None
        self.verification = None
        self.audit = []

    def post_task(self, task):
        self.task = task

    def latest_bid(self):
        return self.bids[-1] if self.bids else None

    def record(self, *, actor, principal, action, timestamp, evidence_ref):
        self.audit.append(
            {
                "actor": actor,
                "principal": principal,
                "action": action,
                "timestamp": timestamp,
                "evidence_ref": evidence_ref,
            }
        )


# --- the two roles ----------------------------------------------------------


class Agent:
    """A role that can only act by calling the protocol layer.

    Subclasses add role-shaped convenience methods; :meth:`attempt` is the one
    door to the five operations and always presents *this* role's delegation to
    ``authorize()``, so the frozen gate — not the role code — decides.
    """

    role = None

    def __init__(self, delegation, market):
        self.delegation = delegation
        self.market = market
        self.agent_id = delegation["agent"]["id"]
        self.principal_id = delegation["principal"]["id"]
        # A role can only price in the currency its own delegation is scoped to,
        # so no caller ever has to type a currency.
        self.currency = delegation["scope"]["max_spend"]["currency"]

    def _offer(self, amount, note=None):
        return {
            "consideration_type": "monetary",
            "amount": amount,
            "currency": self.currency,
            "note": note,
        }

    def attempt(self, operation, now, **payload):
        """Call one protocol operation under this role's delegation."""
        operation_fn = _OPERATIONS.get(operation)
        if operation_fn is None:
            return _deny(
                "ACTION_NOT_ALLOWED",
                f"{self.role or 'agent'} has no operation {operation!r}",
            )
        result = operation_fn(self.delegation, now=now, **payload)
        if result.get("ok") is True:
            self._publish(operation, result["data"])
        return result

    def _publish(self, operation, data):
        kind, id_field, timestamp_field, attribute = _ARTIFACTS[operation]
        artifact = data[kind]
        if attribute == "bids":
            self.market.bids.append(artifact)
        else:
            setattr(self.market, attribute, artifact)
        self.market.record(
            actor=self.agent_id,
            principal=self.principal_id,
            action=operation,
            timestamp=artifact[timestamp_field],
            evidence_ref=artifact[id_field],
        )


class RequesterAgent(Agent):
    """Posts a task, counters bids, accepts terms, verifies deliveries."""

    role = "requester"

    def post_task(self, now, request):
        """Author and publish a task; the requester identity comes from the delegation."""
        task = copy.deepcopy(request)
        task["requester"] = {
            "principal_id": self.principal_id,
            "agent_id": self.agent_id,
        }
        task.setdefault("extensions", {})
        amount, currency = _budget_money(task)
        decision = authorize(
            self.delegation, "post_task", amount, now, currency=currency
        )
        if not decision.allowed:
            return _deny(decision.reason_code, decision.detail)
        self.market.post_task(task)
        self.market.record(
            actor=self.agent_id,
            principal=self.principal_id,
            action="post_task",
            timestamp=_iso(now),
            evidence_ref=task["task_id"],
        )
        return {"ok": True, "reason": "OK", "data": {"task": task}}

    def counter_offer(self, now, amount, note=None, **fields):
        """Counter the bid currently on the market; the parent is read, not passed in."""
        parent = self.market.latest_bid()
        if parent is None:
            return _deny("ACTION_NOT_ALLOWED", "There is no bid to counter")
        counter = {"offer": self._offer(amount, note)}
        counter.update(copy.deepcopy(fields))
        return self.attempt("counter_offer", now, bid=parent, counter=counter)

    def accept_terms(self, now):
        """Accept the bid currently on the market and publish the contract."""
        bid = self.market.latest_bid()
        if bid is None:
            return _deny("ACTION_NOT_ALLOWED", "There is no bid to accept")
        return self.attempt("accept_terms", now, bid=bid)

    def verify_delivery(self, now, result="accepted", criteria_results=None):
        """Verify the delivery on the market; ids and trace come from that output."""
        contract = self.market.contract
        delivery = self.market.delivery
        if contract is None or delivery is None:
            return _deny(
                "ACTION_NOT_ALLOWED", "There is no contract/delivery to verify"
            )
        extensions = copy.deepcopy(delivery.get("extensions", {}))
        extensions["carried_from"] = delivery["delivery_id"]
        verification = {
            "verification_id": f"verification::{delivery['delivery_id']}",
            "delivery_id": delivery["delivery_id"],
            "result": result,
            "criteria_results": copy.deepcopy(criteria_results or []),
            "extensions": extensions,
        }
        return self.attempt(
            "verify_delivery", now, contract=contract, verification=verification
        )


class ProviderAgent(Agent):
    """Discovers the posted task, bids on it, and delivers against a contract."""

    role = "provider"

    def submit_bid(self, now, amount, note=None, estimated_duration="2 hours", trace=None, **fields):
        """Discover the task on the market and bid; the task id comes from that output."""
        task = self.market.task
        if task is None:
            return _deny("ACTION_NOT_ALLOWED", "There is no posted task to bid on")
        extensions = {"task_category": task["task_type"]}
        if trace is not None:
            extensions["trace"] = trace
        bid = {
            "bid_id": f"bid::{task['task_id']}::{self.agent_id}",
            "task_id": task["task_id"],
            "provider": {
                "principal_id": self.principal_id,
                "agent_id": self.agent_id,
            },
            "offer": self._offer(amount, note),
            "estimated_duration": estimated_duration,
            "assumptions": copy.deepcopy(fields.get("assumptions", [])),
            "exclusions": copy.deepcopy(fields.get("exclusions", [])),
            "evidence": copy.deepcopy(fields.get("evidence", [])),
            "valid_until": fields.get("valid_until"),
            "extensions": extensions,
        }
        return self.attempt("submit_bid", now, task=task, bid=bid)

    def submit_delivery(self, now, summary, evidence=None):
        """Deliver against the contract on the market, carrying the bid's trace forward."""
        contract = self.market.contract
        if contract is None:
            return _deny("ACTION_NOT_ALLOWED", "There is no contract to deliver against")
        bid = self.market.latest_bid()
        extensions = copy.deepcopy(bid.get("extensions", {})) if bid else {}
        delivery = {
            "delivery_id": f"delivery::{contract['contract_id']}",
            "summary": summary,
            "evidence": copy.deepcopy(evidence or []),
            "extensions": extensions,
        }
        return self.attempt("submit_delivery", now, contract=contract, delivery=delivery)
