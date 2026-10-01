"""T7 end-to-end two-agent tests (written test-first).

This file was written BEFORE ``packages/protocol/agents.py`` existed. The
first run therefore failed at collection with
``ImportError: cannot import name 'agents' from 'packages.protocol' (unknown
location)`` (the full red output is pasted in the T7 report). That red run is
the evidence the tests are real and were not back-filled from the
implementation.

What is proven here
-------------------
Two explicit, non-LLM agent roles — :class:`RequesterAgent` and
:class:`ProviderAgent` — drive one synthetic digital task through the frozen
T6 write layer (``packages/protocol/ops.py``) from beginning to end:

    post task -> provider bid -> requester counter -> accept terms
              -> provider delivery -> requester verification

Every artifact moves through ``ops``; the two agents never receive a value
from each other by hand. The requester posts the task and reads the current
bid from the shared :class:`Market`; the provider discovers the task from the
same market and publishes its delivery there; the requester verifies the
delivery it finds in the market. A distinctive value minted in the provider's
bid (``TRACE``) is asserted to survive, un-retyped, all the way into the final
verification. The value appears nowhere in any fixture.

Authorization is enforced BY the gate (``authorize()``), not by role code:
each role holds a delegation scoped to exactly its own actions, and an action
outside that scope is refused with ``ACTION_NOT_ALLOWED``. Every denial carries
no ``data`` key, records no transition, and mutates nothing. A delegation that
expires mid-flow refuses the next step with ``DELEGATION_EXPIRED``.

Audit trail note: T8 formalises the append-only audit trail as its own
deliverable. Here the ``Market`` keeps the ordered transitions (actor,
principal, action, timestamp, evidence reference) only well enough to assert
ordering and linkage; this is NOT the T8 artifact.

``now`` is injected into every call; the system clock is never read, so the
same flow run twice produces identical artifacts and audit ordering.
"""
import copy
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parent.parent
PROTOCOL_DIR = ROOT / "packages" / "protocol"
FIX = PROTOCOL_DIR / "fixtures"

for _path in (str(ROOT), str(PROTOCOL_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from packages.protocol import agents, ops  # noqa: E402  # RED until agents.py exists


# --- injected time and distinctive (fixture-free) values --------------------

# One injected instant per step: post, bid, counter, accept, delivery, verify.
NOW = [
    "2026-10-01T12:00:00Z",
    "2026-10-01T12:01:00Z",
    "2026-10-01T12:02:00Z",
    "2026-10-01T12:03:00Z",
    "2026-10-01T12:04:00Z",
    "2026-10-01T12:05:00Z",
]

# Distinctive values that must not exist in any fixture. TRACE is minted in
# the provider's bid and must reach the final verification un-retyped.
TRACE = "trace-9f4c1d7a-nowhere-in-any-fixture"
BID_AMOUNT = 8123.5
COUNTER_AMOUNT = 7950.25

FLOW_ACTIONS = [
    "post_task",
    "submit_bid",
    "counter_offer",
    "accept_terms",
    "submit_delivery",
    "verify_delivery",
]

# --- helpers ----------------------------------------------------------------


def money(amount, note=None):
    """Hand-built money for a *refusal* payload only.

    The real flow never builds money in the test: each role derives its offer
    currency from its own delegation (see ``Agent._offer``).
    """
    return {
        "consideration_type": "monetary",
        "amount": amount,
        "currency": "TWD",
        "note": note,
    }


def task_request():
    """The synthetic digital task the requester principal asks its agent to post."""
    return {
        "task_id": "task-t7-0001",
        "task_type": "software_task",
        "goal": "Produce a deterministic CLI that validates one JSON file.",
        "requirements": ["Python 3.11+", "Include tests"],
        "constraints": ["No network dependency"],
        "budget": {
            "consideration_type": "monetary",
            "max_amount": 9000,
            "currency": "TWD",
            "note": None,
        },
        "deadline": None,
        "location": None,
        "required_credentials": [],
        "deliverables": [{"id": "d1", "description": "CLI source and tests"}],
        "acceptance_criteria": [
            {
                "id": "a1",
                "description": "Automated tests pass",
                "verification": "deterministic",
                "required": True,
            }
        ],
        "execution_mode": "agent",
        "approval_policy": {
            "accept_terms": "agent_allowed",
            "release_value": "agent_allowed",
            "max_autonomous_amount": 10000,
        },
        "privacy_level": "public",
        "extensions": {},
    }


def flow(requester_delegation=None, provider_delegation=None, nows=None):
    """Run all six steps and return the market, the agents, and the results.

    Nothing is asserted here so a broken step can be inspected; each test
    asserts the outcome it cares about. The agents only ever read the previous
    step from ``market`` and write their own output back to it.
    """
    nows = list(nows if nows is not None else NOW)
    market = agents.Market()
    requester = agents.RequesterAgent(
        requester_delegation or agents.requester_delegation(), market
    )
    provider = agents.ProviderAgent(
        provider_delegation or agents.provider_delegation(), market
    )
    results = {
        "post_task": requester.post_task(nows[0], task_request()),
        "submit_bid": provider.submit_bid(nows[1], amount=BID_AMOUNT, trace=TRACE),
        "counter_offer": requester.counter_offer(
            nows[2], amount=COUNTER_AMOUNT, note="Requester counter"
        ),
        "accept_terms": requester.accept_terms(nows[3]),
        "submit_delivery": provider.submit_delivery(
            nows[4], summary="Delivered CLI source and tests."
        ),
        "verify_delivery": requester.verify_delivery(nows[5]),
    }
    return market, requester, provider, results


def artifacts(results):
    """The produced artifact of each step, under a semantic name."""
    return {
        "task": results["post_task"]["data"]["task"],
        "bid": results["submit_bid"]["data"]["bid"],
        "counter": results["counter_offer"]["data"]["bid"],
        "contract": results["accept_terms"]["data"]["contract"],
        "delivery": results["submit_delivery"]["data"]["delivery"],
        "verification": results["verify_delivery"]["data"]["verification"],
    }


def assert_all_ok(results):
    for step in FLOW_ACTIONS:
        assert results[step]["ok"] is True, (step, results[step])
        assert results[step]["reason"] == "OK", (step, results[step])


def load_schema(name):
    with (PROTOCOL_DIR / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def schema_errors(schema_name, instance):
    schema = load_schema(schema_name)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return list(validator.iter_errors(instance))


def fixture_text():
    return "\n".join(
        path.read_text(encoding="utf-8") for path in sorted(FIX.glob("*.json"))
    )


def valid_provider_bid(task_id, amount=BID_AMOUNT):
    """A well-formed provider bid payload (used only by refusal tests)."""
    return {
        "bid_id": "bid-t7-rogue",
        "task_id": task_id,
        "provider": {"principal_id": "human-provider", "agent_id": "provider-agent"},
        "offer": money(amount),
        "estimated_duration": "2 hours",
        "assumptions": [],
        "exclusions": [],
        "evidence": [],
        "valid_until": None,
        "extensions": {"task_category": "software_task"},
    }


# --- happy path and chain links ---------------------------------------------


def test_full_flow_completes_with_every_step_ok():
    _market, _requester, _provider, results = flow()
    assert_all_ok(results)


def test_every_artifact_links_to_the_one_before_it():
    _market, _requester, _provider, results = flow()
    art = artifacts(results)

    assert art["bid"]["task_id"] == art["task"]["task_id"]
    assert art["counter"]["task_id"] == art["bid"]["task_id"]
    assert art["counter"]["parent_bid_id"] == art["bid"]["bid_id"]
    assert art["counter"]["bid_id"] != art["bid"]["bid_id"]
    assert art["contract"]["task_id"] == art["task"]["task_id"]
    assert art["contract"]["accepted_bid_id"] == art["counter"]["bid_id"]
    assert art["contract"]["provider"] == art["counter"]["provider"]
    assert art["delivery"]["contract_id"] == art["contract"]["contract_id"]
    assert art["delivery"]["task_id"] == art["contract"]["task_id"]
    assert art["delivery"]["provider"] == art["contract"]["provider"]
    assert art["verification"]["contract_id"] == art["contract"]["contract_id"]
    assert art["verification"]["delivery_id"] == art["delivery"]["delivery_id"]
    assert art["verification"]["task_id"] == art["contract"]["task_id"]


def test_contract_names_the_two_principals_and_their_agents():
    _market, requester, provider, results = flow()
    contract = results["accept_terms"]["data"]["contract"]
    assert contract["requester"] == {
        "principal_id": requester.principal_id,
        "agent_id": requester.agent_id,
    }
    assert contract["provider"] == {
        "principal_id": provider.principal_id,
        "agent_id": provider.agent_id,
    }


def test_flow_artifacts_validate_against_the_protocol_schemas():
    _market, _requester, _provider, results = flow()
    art = artifacts(results)
    assert schema_errors("task.schema.json", art["task"]) == []
    assert schema_errors("bid.schema.json", art["bid"]) == []
    assert schema_errors("bid.schema.json", art["counter"]) == []
    assert schema_errors("contract.schema.json", art["contract"]) == []


# --- zero manual copying ----------------------------------------------------


def test_requester_reads_the_bid_from_the_market_not_from_the_caller():
    market, requester, _provider, results = flow()
    counter = results["counter_offer"]["data"]["bid"]
    # The counter's parent is the provider's published bid, and the requester
    # was never handed that bid by the test.
    assert counter["parent_bid_id"] == market.bids[0]["bid_id"]
    assert counter["parent_bid_id"] == results["submit_bid"]["data"]["bid"]["bid_id"]


def test_provider_reads_the_contract_and_its_own_trace_from_the_market():
    market, _requester, _provider, results = flow()
    delivery = results["submit_delivery"]["data"]["delivery"]
    assert delivery["contract_id"] == market.contract["contract_id"]
    assert delivery["extensions"]["trace"] == market.bids[-1]["extensions"]["trace"]


def test_distinctive_provider_value_reaches_the_final_verification_untouched():
    _market, _requester, _provider, results = flow()
    art = artifacts(results)

    # It starts in the provider's bid ...
    assert art["bid"]["extensions"]["trace"] == TRACE
    # ... survives the requester's counter through the ops merge ...
    assert art["counter"]["extensions"]["trace"] == TRACE
    # ... is carried into the delivery from the market's current bid ...
    assert art["delivery"]["extensions"]["trace"] == TRACE
    # ... and is carried into the verification from the delivery output.
    assert art["verification"]["extensions"]["trace"] == TRACE
    assert art["verification"]["extensions"]["carried_from"] == art["delivery"]["delivery_id"]


def test_the_distinctive_values_appear_nowhere_in_any_fixture():
    text = fixture_text()
    assert TRACE not in text
    assert str(BID_AMOUNT) not in text
    assert str(COUNTER_AMOUNT) not in text


def test_offer_currency_comes_from_the_role_delegation_not_the_caller():
    # The test never types a currency: each role prices in the currency its own
    # delegation is scoped to, even when the two delegations differ.
    provider_delegation = agents.provider_delegation()
    provider_delegation["scope"]["max_spend"]["currency"] = "USD"
    provider_delegation["approval_thresholds"]["max_autonomous_spend"]["currency"] = "USD"
    market = agents.Market()
    requester = agents.RequesterAgent(agents.requester_delegation(), market)
    provider = agents.ProviderAgent(provider_delegation, market)
    assert requester.post_task(NOW[0], task_request())["ok"] is True

    result = provider.submit_bid(NOW[1], amount=BID_AMOUNT, trace=TRACE)

    assert result["ok"] is True, result
    assert result["data"]["bid"]["offer"]["currency"] == "USD"
    assert requester.currency == "TWD"


# --- authorization is enforced, not decorative ------------------------------


def test_requester_action_outside_its_delegation_denies_with_action_not_allowed():
    market = agents.Market()
    requester = agents.RequesterAgent(agents.requester_delegation(), market)
    assert requester.post_task(NOW[0], task_request())["ok"] is True
    task = market.task
    bid = valid_provider_bid(task["task_id"])
    audit_before = copy.deepcopy(market.audit)
    bid_before = copy.deepcopy(bid)

    result = requester.attempt("submit_bid", NOW[1], task=task, bid=bid)

    assert result["ok"] is False
    assert result["reason"] == "ACTION_NOT_ALLOWED", result
    assert "data" not in result
    assert market.audit == audit_before
    assert bid == bid_before


def test_provider_action_outside_its_delegation_denies_with_action_not_allowed():
    market = agents.Market()
    requester = agents.RequesterAgent(agents.requester_delegation(), market)
    provider = agents.ProviderAgent(agents.provider_delegation(), market)
    assert requester.post_task(NOW[0], task_request())["ok"] is True
    assert provider.submit_bid(NOW[1], amount=BID_AMOUNT, trace=TRACE)["ok"] is True
    audit_before = copy.deepcopy(market.audit)
    bid_before = copy.deepcopy(market.bids[-1])

    result = provider.attempt("accept_terms", NOW[2], bid=market.latest_bid())

    assert result["ok"] is False
    assert result["reason"] == "ACTION_NOT_ALLOWED", result
    assert "data" not in result
    assert market.audit == audit_before
    assert market.bids[-1] == bid_before


def test_a_delegation_that_permits_an_outside_role_action_is_still_refused():
    # Handed a delegation whose allowed_actions *permits* accept_terms, the
    # provider — whose role never accepts terms — is still refused by the gate,
    # because the delegation marks accept_terms as human-approval-required.
    market = agents.Market()
    requester = agents.RequesterAgent(agents.requester_delegation(), market)
    broad = agents.provider_delegation()
    broad["scope"]["allowed_actions"] = [
        "submit_bid",
        "submit_delivery",
        "accept_terms",
    ]
    broad["approval_thresholds"]["human_approval_actions"] = ["accept_terms"]
    provider = agents.ProviderAgent(broad, market)
    assert requester.post_task(NOW[0], task_request())["ok"] is True
    assert provider.submit_bid(NOW[1], amount=BID_AMOUNT, trace=TRACE)["ok"] is True

    result = provider.attempt("accept_terms", NOW[2], bid=market.latest_bid())

    assert result["ok"] is False
    assert result["reason"] == "REQUIRES_HUMAN_APPROVAL", result
    assert "data" not in result
    assert market.contract is None


def test_a_permitted_action_is_still_bounded_by_the_spend_threshold():
    market = agents.Market()
    requester = agents.RequesterAgent(agents.requester_delegation(), market)
    provider = agents.ProviderAgent(agents.provider_delegation(), market)
    assert requester.post_task(NOW[0], task_request())["ok"] is True
    assert provider.submit_bid(NOW[1], amount=BID_AMOUNT, trace=TRACE)["ok"] is True

    over_threshold = requester.counter_offer(NOW[2], amount=12000)
    assert over_threshold["ok"] is False
    assert over_threshold["reason"] == "THRESHOLD_EXCEEDED", over_threshold
    assert "data" not in over_threshold

    over_max = requester.counter_offer(NOW[3], amount=50000.01)
    assert over_max["ok"] is False
    assert over_max["reason"] == "SPEND_EXCEEDS_MAX", over_max
    assert "data" not in over_max
    assert market.latest_bid()["bid_id"] == market.bids[0]["bid_id"]


def test_a_delegation_that_expires_mid_flow_denies_the_next_step():
    expiring = agents.requester_delegation()
    # The requester delegation is valid for the first five steps (the last is
    # at 12:04:00) and has expired by the sixth step, injected at 13:00.
    expiring["validity"]["issued_at"] = "2026-10-01T11:00:00Z"
    expiring["validity"]["expires_at"] = "2026-10-01T12:04:30Z"
    nows = list(NOW)
    nows[5] = "2026-10-01T13:00:00Z"

    market, _requester, _provider, results = flow(
        requester_delegation=expiring, nows=nows
    )
    for step in FLOW_ACTIONS[:-1]:
        assert results[step]["ok"] is True, (step, results[step])

    denial = results["verify_delivery"]
    assert denial["ok"] is False
    assert denial["reason"] == "DELEGATION_EXPIRED", denial
    assert "data" not in denial
    assert market.verification is None
    assert [t["action"] for t in market.audit] == FLOW_ACTIONS[:-1]


def test_every_denial_carries_no_data_key_and_mutates_nothing():
    scenarios = []

    expired = agents.requester_delegation()
    expired["validity"]["expires_at"] = "2026-10-01T11:00:00Z"

    revoked = agents.requester_delegation()
    revoked["revocation"]["revoked_at"] = "2026-09-30T00:00:00Z"

    for label, requester_delegation, provider_delegation, step, now in (
        ("requester expired", expired, None, "post_task", NOW[0]),
        ("requester revoked", revoked, None, "post_task", NOW[0]),
        ("provider expired", None, expired, "submit_bid", NOW[1]),
    ):
        scenarios.append((label, requester_delegation, provider_delegation, step, now))

    for label, req_delegation, prov_delegation, step, now in scenarios:
        market = agents.Market()
        requester = agents.RequesterAgent(
            req_delegation or agents.requester_delegation(), market
        )
        provider = agents.ProviderAgent(
            prov_delegation or agents.provider_delegation(), market
        )
        # Seed the market so the step under test has something to act on.
        if step == "submit_bid":
            requester.post_task(NOW[0], task_request())
        snapshot = copy.deepcopy(market.audit)
        before = copy.deepcopy(
            {
                "task": market.task,
                "bids": market.bids,
                "contract": market.contract,
                "delivery": market.delivery,
                "verification": market.verification,
            }
        )

        if step == "post_task":
            result = requester.post_task(now, task_request())
        else:
            result = provider.submit_bid(now, amount=BID_AMOUNT, trace=TRACE)

        assert result["ok"] is False, (label, result)
        assert result["reason"] in agents.REASON_CODES, (label, result)
        assert "data" not in result, (label, result)
        assert result["error"], (label, result)
        assert market.audit == snapshot, (label, "audit changed")
        after = {
            "task": market.task,
            "bids": market.bids,
            "contract": market.contract,
            "delivery": market.delivery,
            "verification": market.verification,
        }
        assert after == before, (label, "market state mutated")


# --- audit trail ------------------------------------------------------------


def test_audit_trail_records_every_transition_in_order():
    market, requester, provider, results = flow()
    assert [t["action"] for t in market.audit] == FLOW_ACTIONS
    assert [t["timestamp"] for t in market.audit] == NOW

    for transition in market.audit:
        assert set(transition) == {
            "actor",
            "principal",
            "action",
            "timestamp",
            "evidence_ref",
        }
        assert all(transition.values()), transition

    # Actor/principal alternate roles exactly as the flow does.
    assert [t["actor"] for t in market.audit] == [
        requester.agent_id,
        provider.agent_id,
        requester.agent_id,
        requester.agent_id,
        provider.agent_id,
        requester.agent_id,
    ]
    assert [t["principal"] for t in market.audit] == [
        requester.principal_id,
        provider.principal_id,
        requester.principal_id,
        requester.principal_id,
        provider.principal_id,
        requester.principal_id,
    ]

    art = artifacts(results)
    assert [t["evidence_ref"] for t in market.audit] == [
        art["task"]["task_id"],
        art["bid"]["bid_id"],
        art["counter"]["bid_id"],
        art["contract"]["contract_id"],
        art["delivery"]["delivery_id"],
        art["verification"]["verification_id"],
    ]


def test_a_denied_transition_is_not_recorded():
    market = agents.Market()
    requester = agents.RequesterAgent(agents.requester_delegation(), market)
    provider = agents.ProviderAgent(agents.provider_delegation(), market)
    assert requester.post_task(NOW[0], task_request())["ok"] is True
    assert provider.submit_bid(NOW[1], amount=BID_AMOUNT, trace=TRACE)["ok"] is True
    recorded = list(market.audit)

    denied = provider.attempt("accept_terms", NOW[2], bid=market.latest_bid())

    assert denied["ok"] is False
    assert market.audit == recorded


# --- determinism ------------------------------------------------------------


def test_the_same_flow_run_twice_produces_the_same_result():
    market_a, _ra, _pa, results_a = flow()
    market_b, _rb, _pb, results_b = flow()

    assert results_a == results_b
    assert market_a.audit == market_b.audit
    assert market_a.bids == market_b.bids
    assert market_a.contract == market_b.contract
    assert market_a.delivery == market_b.delivery
    assert market_a.verification == market_b.verification


def test_artifact_timestamps_come_from_the_injected_now_not_the_system_clock():
    _market, _requester, _provider, results = flow()
    art = artifacts(results)
    assert art["bid"]["created_at"] == NOW[1]
    assert art["counter"]["created_at"] == NOW[2]
    assert art["contract"]["created_at"] == NOW[3]
    assert art["delivery"]["submitted_at"] == NOW[4]
    assert art["verification"]["verified_at"] == NOW[5]


def test_a_datetime_now_object_is_accepted_and_normalised():
    nows = [
        datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc),
        datetime(2026, 10, 1, 12, 1, tzinfo=timezone.utc),
        datetime(2026, 10, 1, 12, 2, tzinfo=timezone.utc),
        datetime(2026, 10, 1, 12, 3, tzinfo=timezone.utc),
        datetime(2026, 10, 1, 12, 4, tzinfo=timezone.utc),
        datetime(2026, 10, 1, 12, 5, tzinfo=timezone.utc),
    ]
    _market, _requester, _provider, results = flow(nows=nows)
    assert_all_ok(results)
    assert results["submit_bid"]["data"]["bid"]["created_at"] == NOW[1]


# --- role scoping -----------------------------------------------------------


def test_role_delegations_are_scoped_to_exactly_their_role():
    requester = agents.requester_delegation()
    provider = agents.provider_delegation()
    assert set(requester["scope"]["allowed_actions"]) == {
        "post_task",
        "counter_offer",
        "accept_terms",
        "verify_delivery",
    }
    assert set(provider["scope"]["allowed_actions"]) == {
        "submit_bid",
        "submit_delivery",
    }
    assert not (
        set(requester["scope"]["allowed_actions"])
        & set(provider["scope"]["allowed_actions"])
    )


def test_reason_codes_are_reexported_from_the_frozen_gate():
    assert agents.REASON_CODES == ops.REASON_CODES
    assert len(agents.REASON_CODES) == 12


# --- the reachable operation set -------------------------------------------


def test_only_the_five_frozen_operations_are_reachable_through_a_role():
    assert set(agents.SUPPORTED_OPERATIONS) == {
        "submit_bid",
        "counter_offer",
        "accept_terms",
        "submit_delivery",
        "verify_delivery",
    }
