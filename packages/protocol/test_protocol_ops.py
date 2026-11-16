"""T6 protocol write-layer tests.

This file was written BEFORE ``ops.py`` existed, so the first run failed at
import (``ModuleNotFoundError: No module named 'ops'``). That red run is the
proof that the tests are real.

The tests pin the contract of the pure proposal-oriented layer:

* every operation calls ``authorize()`` and returns its exact reason code;
* malformed payloads fail closed with ``INVALID_DELEGATION``;
* ``now`` is a parameter, never the system clock, so output is deterministic;
* counter / contract / delivery / verification artifacts carry the chain links;
* no deny path emits partial data and no input is mutated.
"""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

import authorize as auth
import ops
from ops import accept_terms, counter_offer, submit_bid, submit_delivery, verify_delivery


ROOT = Path(__file__).resolve().parent
FIX = ROOT / "fixtures"
NOW = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)
NOW_STR = "2026-10-01T12:00:00Z"


# --- helpers ---------------------------------------------------------------


def load(name):
    with (FIX / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def ops_delegation():
    return load("delegation.ops.valid.json")


def full_delegation():
    return load("delegation.valid.full.json")


def task():
    return load("task.valid.json")


def bid():
    return load("bid.valid.json")


def counter():
    return load("bid.counter.valid.json")


def with_actions(delegation, *actions):
    value = copy.deepcopy(delegation)
    value["scope"]["allowed_actions"] = list(actions)
    return value


def require_ok(result):
    assert result["ok"] is True, result
    assert result["reason"] == "OK", result
    return result["data"]


def build_contract():
    """Accept the counter fixture under the ops delegation."""
    return require_ok(accept_terms(ops_delegation(), counter(), NOW))["contract"]


def delivery_payload():
    return {
        "delivery_id": "delivery-demo-001",
        "summary": "Source and passing tests delivered.",
        "evidence": [
            {"type": "test_result", "reference": "local://tests/pass", "note": None}
        ],
    }


def verification_payload():
    return {
        "verification_id": "verification-demo-001",
        "delivery_id": "delivery-demo-001",
        "result": "accepted",
        "criteria_results": [],
    }


def calls(delegation, contract):
    """Every operation paired with one well-formed argument tuple."""
    return [
        ("submit_bid", lambda: submit_bid(delegation, task(), bid(), NOW)),
        ("counter_offer", lambda: counter_offer(delegation, bid(), counter(), NOW)),
        ("accept_terms", lambda: accept_terms(delegation, counter(), NOW)),
        (
            "submit_delivery",
            lambda: submit_delivery(delegation, contract, delivery_payload(), NOW),
        ),
        (
            "verify_delivery",
            lambda: verify_delivery(delegation, contract, verification_payload(), NOW),
        ),
    ]


def load_schema(schema_name):
    with (ROOT / schema_name).open(encoding="utf-8") as handle:
        return json.load(handle)


def schema_errors(schema_name, instance):
    schema = load_schema(schema_name)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return list(validator.iter_errors(instance))


# --- happy paths and chain links -------------------------------------------


def test_submit_bid_happy_path_matches_fixture():
    data = require_ok(submit_bid(ops_delegation(), task(), bid(), NOW))
    assert data == {"bid": load("bid.submitted.valid.json")}


def test_counter_offer_links_to_parent_bid_and_matches_fixture():
    parent = bid()
    data = require_ok(counter_offer(ops_delegation(), parent, counter(), NOW))
    record = data["bid"]
    assert record["parent_bid_id"] == parent["bid_id"]
    assert record["task_id"] == parent["task_id"]
    assert record["bid_id"] != parent["bid_id"]
    assert record["status"] == "countered"
    assert record == load("bid.counter.valid.json")


def test_accept_terms_references_accepted_bid_and_matches_fixture():
    accepted = counter()
    contract = require_ok(accept_terms(ops_delegation(), accepted, NOW))["contract"]
    assert contract["accepted_bid_id"] == accepted["bid_id"]
    assert contract["task_id"] == accepted["task_id"]
    assert contract["provider"] == accepted["provider"]
    assert contract == load("contract.terms.valid.json")


def test_submit_delivery_references_contract():
    contract = build_contract()
    delivery = require_ok(
        submit_delivery(ops_delegation(), contract, delivery_payload(), NOW)
    )["delivery"]
    assert delivery["contract_id"] == contract["contract_id"]
    assert delivery["task_id"] == contract["task_id"]
    assert delivery["provider"] == contract["provider"]
    assert delivery["submitted_at"] == NOW_STR


def test_verify_delivery_references_contract_and_delivery():
    contract = build_contract()
    verification = require_ok(
        verify_delivery(ops_delegation(), contract, verification_payload(), NOW)
    )["verification"]
    assert verification["contract_id"] == contract["contract_id"]
    assert verification["delivery_id"] == verification_payload()["delivery_id"]
    assert verification["task_id"] == contract["task_id"]
    assert verification["verified_at"] == NOW_STR


def test_full_chain_links_task_bid_counter_contract_delivery_verification():
    delegation = ops_delegation()
    the_task, the_bid = task(), bid()
    submitted = require_ok(submit_bid(delegation, the_task, the_bid, NOW))["bid"]
    countered = require_ok(counter_offer(delegation, submitted, counter(), NOW))["bid"]
    contract = require_ok(accept_terms(delegation, countered, NOW))["contract"]
    delivery = require_ok(
        submit_delivery(delegation, contract, delivery_payload(), NOW)
    )["delivery"]
    verification = require_ok(
        verify_delivery(delegation, contract, verification_payload(), NOW)
    )["verification"]
    assert submitted["task_id"] == the_task["task_id"]
    assert countered["parent_bid_id"] == submitted["bid_id"]
    assert contract["accepted_bid_id"] == countered["bid_id"]
    assert contract["provider"] == countered["provider"]
    assert delivery["contract_id"] == contract["contract_id"]
    assert verification["contract_id"] == contract["contract_id"]
    assert verification["delivery_id"] == delivery["delivery_id"]


# --- authorization: the gate cannot be bypassed -----------------------------


def test_every_op_denies_when_action_not_allowed():
    delegation = with_actions(ops_delegation())  # empty allow-list
    contract = build_contract()
    for name, call in calls(delegation, contract):
        result = call()
        assert result["ok"] is False, (name, result)
        assert result["reason"] == "ACTION_NOT_ALLOWED", (name, result)


def test_every_op_denies_without_delegation():
    contract = build_contract()
    for name, call in calls(None, contract):
        result = call()
        assert result["ok"] is False, (name, result)
        assert result["reason"] == "INVALID_DELEGATION", (name, result)


def test_revoked_delegation_reason_propagates_for_every_op():
    delegation = ops_delegation()
    delegation["revocation"]["revoked_at"] = "2026-09-01T00:00:00Z"
    contract = build_contract()
    for name, call in calls(delegation, contract):
        result = call()
        assert result["ok"] is False, (name, result)
        assert result["reason"] == "DELEGATION_REVOKED", (name, result)


def test_expired_delegation_reason_propagates_for_every_op():
    delegation = ops_delegation()
    expired_now = datetime(2028, 1, 1, tzinfo=timezone.utc)
    contract = build_contract()
    calls_with_expired = [
        ("submit_bid", lambda: submit_bid(delegation, task(), bid(), expired_now)),
        ("counter_offer", lambda: counter_offer(delegation, bid(), counter(), expired_now)),
        ("accept_terms", lambda: accept_terms(delegation, counter(), expired_now)),
        (
            "submit_delivery",
            lambda: submit_delivery(delegation, contract, delivery_payload(), expired_now),
        ),
        (
            "verify_delivery",
            lambda: verify_delivery(delegation, contract, verification_payload(), expired_now),
        ),
    ]
    for name, call in calls_with_expired:
        result = call()
        assert result["ok"] is False, (name, result)
        assert result["reason"] == "DELEGATION_EXPIRED", (name, result)


def test_submit_bid_spend_gate_uses_bid_amount():
    expensive = bid()
    expensive["offer"]["amount"] = 50000.01
    assert submit_bid(ops_delegation(), task(), expensive, NOW)["reason"] == "SPEND_EXCEEDS_MAX"
    over_threshold = bid()
    over_threshold["offer"]["amount"] = 10000.01
    assert submit_bid(ops_delegation(), task(), over_threshold, NOW)["reason"] == "THRESHOLD_EXCEEDED"


def test_counter_offer_gate_uses_counter_amount_not_parent():
    parent = bid()  # 800
    over = counter()
    over["offer"]["amount"] = 10000.01
    assert counter_offer(ops_delegation(), parent, over, NOW)["reason"] == "THRESHOLD_EXCEEDED"
    too_much = counter()
    too_much["offer"]["amount"] = 50000.01
    assert counter_offer(ops_delegation(), parent, too_much, NOW)["reason"] == "SPEND_EXCEEDS_MAX"


def test_accept_terms_gate_uses_accepted_bid_amount():
    over = counter()
    over["offer"]["amount"] = 50000.01
    assert accept_terms(ops_delegation(), over, NOW)["reason"] == "SPEND_EXCEEDS_MAX"


def test_submit_delivery_gate_uses_contract_amount():
    contract = build_contract()
    contract["consideration"]["amount"] = 50000.01
    assert submit_delivery(ops_delegation(), contract, delivery_payload(), NOW)["reason"] == "SPEND_EXCEEDS_MAX"


def test_verify_delivery_gate_uses_contract_amount():
    contract = build_contract()
    contract["consideration"]["amount"] = 10000.01
    assert verify_delivery(ops_delegation(), contract, verification_payload(), NOW)["reason"] == "THRESHOLD_EXCEEDED"


def test_currency_mismatch_propagates_from_gate():
    usd = bid()
    usd["offer"]["currency"] = "USD"
    assert submit_bid(ops_delegation(), task(), usd, NOW)["reason"] == "CURRENCY_MISMATCH"


def test_accept_terms_requires_human_approval_when_scoped():
    raw = counter()
    assert accept_terms(full_delegation(), raw, NOW)["reason"] == "REQUIRES_HUMAN_APPROVAL"


def test_submit_bid_regulated_category_requires_human_approval():
    delegation = with_actions(ops_delegation(), "submit_bid")
    regulated = task()
    regulated["task_type"] = "regulated_vertical"
    assert submit_bid(delegation, regulated, bid(), NOW)["reason"] == "REQUIRES_HUMAN_APPROVAL"


def test_submit_bid_action_not_allowed():
    delegation = with_actions(ops_delegation(), "counter_offer")
    assert submit_bid(delegation, task(), bid(), NOW)["reason"] == "ACTION_NOT_ALLOWED"


def test_authority_denial_outranks_malformed_payload():
    delegation = ops_delegation()
    delegation["revocation"]["revoked_at"] = "2026-09-01T00:00:00Z"
    assert submit_bid(delegation, task(), {}, NOW)["reason"] == "DELEGATION_REVOKED"


# --- fail-closed on malformed input ----------------------------------------


def test_submit_bid_malformed_denies_invalid_delegation():
    delegation = ops_delegation()
    good_task, good_bid = task(), bid()
    for bad in (None, {}, {"bid_id": "x"}, {"bid_id": "x", "task_id": good_task["task_id"]}):
        result = submit_bid(delegation, good_task, bad, NOW)
        assert result["ok"] is False and result["reason"] == "INVALID_DELEGATION", (bad, result)
    assert submit_bid(delegation, {}, good_bid, NOW)["reason"] == "INVALID_DELEGATION"
    mismatch = copy.deepcopy(good_bid)
    mismatch["task_id"] = "task-other"
    assert submit_bid(delegation, good_task, mismatch, NOW)["reason"] == "INVALID_DELEGATION"
    negative = copy.deepcopy(good_bid)
    negative["offer"]["amount"] = -1
    assert submit_bid(delegation, good_task, negative, NOW)["reason"] == "INVALID_DELEGATION"
    nan = copy.deepcopy(good_bid)
    nan["offer"]["amount"] = float("nan")
    assert submit_bid(delegation, good_task, nan, NOW)["reason"] == "INVALID_DELEGATION"
    parent_set = copy.deepcopy(good_bid)
    parent_set["parent_bid_id"] = "bid-parent"
    assert submit_bid(delegation, good_task, parent_set, NOW)["reason"] == "INVALID_DELEGATION"
    assert submit_bid(delegation, good_task, good_bid, "not-a-time")["reason"] == "INVALID_DELEGATION"


def test_counter_offer_malformed_denies_invalid_delegation():
    delegation = ops_delegation()
    for bad in (
        None,
        {},
        {"offer": {}},
        {"offer": {"consideration_type": "monetary", "amount": -5, "currency": "TWD"}},
        {"bid_id": "", "offer": counter()["offer"]},
    ):
        result = counter_offer(delegation, bid(), bad, NOW)
        assert result["ok"] is False and result["reason"] == "INVALID_DELEGATION", (bad, result)
    assert counter_offer(delegation, {}, counter(), NOW)["reason"] == "INVALID_DELEGATION"


def test_accept_terms_malformed_or_negotiable_denies_invalid_delegation():
    delegation = ops_delegation()
    for bad in (
        None,
        {},
        {"bid_id": "x"},
        {"bid_id": "x", "task_id": "t", "offer": {"consideration_type": "negotiable", "amount": None, "currency": None}},
    ):
        result = accept_terms(delegation, bad, NOW)
        assert result["ok"] is False and result["reason"] == "INVALID_DELEGATION", (bad, result)
    negotiable = counter()
    negotiable["offer"] = {"consideration_type": "negotiable", "amount": None, "currency": None}
    assert accept_terms(delegation, negotiable, NOW)["reason"] == "INVALID_DELEGATION"


def test_submit_delivery_malformed_denies_invalid_delegation():
    delegation = ops_delegation()
    contract = build_contract()
    for bad in (None, {}, {"delivery_id": ""}):
        result = submit_delivery(delegation, contract, bad, NOW)
        assert result["ok"] is False and result["reason"] == "INVALID_DELEGATION", (bad, result)
    assert submit_delivery(delegation, {}, delivery_payload(), NOW)["reason"] == "INVALID_DELEGATION"
    bad_contract = copy.deepcopy(contract)
    bad_contract["consideration"]["amount"] = "lots"
    assert submit_delivery(delegation, bad_contract, delivery_payload(), NOW)["reason"] == "INVALID_DELEGATION"


def test_verify_delivery_malformed_denies_invalid_delegation():
    delegation = ops_delegation()
    contract = build_contract()
    for bad in (
        None,
        {},
        {"verification_id": "v"},
        {"verification_id": "v", "delivery_id": "d"},
        {"verification_id": "v", "delivery_id": "d", "result": ""},
    ):
        result = verify_delivery(delegation, contract, bad, NOW)
        assert result["ok"] is False and result["reason"] == "INVALID_DELEGATION", (bad, result)
    assert verify_delivery(delegation, {}, verification_payload(), NOW)["reason"] == "INVALID_DELEGATION"


def test_operations_never_raise_on_junk():
    delegation = ops_delegation()
    contract = build_contract()
    junk_values = [None, [], "x", 0, True, {"offer": []}, {"bid_id": None}, {"consideration": "x"}]
    for junk in junk_values:
        for name, call in (
            ("submit_bid", lambda j=junk: submit_bid(delegation, j, j, NOW)),
            ("counter_offer", lambda j=junk: counter_offer(delegation, j, j, NOW)),
            ("accept_terms", lambda j=junk: accept_terms(delegation, j, NOW)),
            ("submit_delivery", lambda j=junk: submit_delivery(delegation, j, j, NOW)),
            ("verify_delivery", lambda j=junk: verify_delivery(delegation, j, j, NOW)),
        ):
            result = call()
            assert result["ok"] is False, (name, junk, result)
            assert result["reason"] in ops.REASON_CODES, (name, junk, result)


# --- result shape, determinism, no partial state ----------------------------


def test_success_shape_is_exact_and_inputs_are_not_mutated():
    delegation, the_task, the_bid = ops_delegation(), task(), bid()
    snapshots = (copy.deepcopy(delegation), copy.deepcopy(the_task), copy.deepcopy(the_bid))
    result = submit_bid(delegation, the_task, the_bid, NOW)
    assert set(result) == {"ok", "reason", "data"}
    assert result["reason"] == "OK"
    assert result["data"]["bid"]["status"] == "proposed"
    assert (delegation, the_task, the_bid) == snapshots


def test_deny_shape_is_exact_and_has_no_data():
    delegation = ops_delegation()
    delegation["revocation"]["revoked_at"] = "2026-09-01T00:00:00Z"
    snapshot = copy.deepcopy(delegation)
    result = submit_bid(delegation, task(), bid(), NOW)
    assert set(result) == {"ok", "reason", "error"}
    assert "data" not in result
    assert delegation == snapshot


def test_operations_are_deterministic_and_now_is_a_parameter():
    delegation = ops_delegation()
    the_task, the_bid, the_counter = task(), bid(), counter()
    contract = build_contract()
    assert submit_bid(delegation, the_task, the_bid, NOW) == submit_bid(delegation, the_task, the_bid, NOW)
    assert submit_bid(delegation, the_task, the_bid, NOW) == submit_bid(delegation, the_task, the_bid, NOW_STR)
    assert counter_offer(delegation, the_bid, the_counter, NOW) == counter_offer(delegation, the_bid, the_counter, NOW)
    assert accept_terms(delegation, the_counter, NOW) == accept_terms(delegation, the_counter, NOW)
    assert submit_delivery(delegation, contract, delivery_payload(), NOW) == submit_delivery(
        delegation, contract, delivery_payload(), NOW
    )
    assert verify_delivery(delegation, contract, verification_payload(), NOW) == verify_delivery(
        delegation, contract, verification_payload(), NOW
    )


# --- reason codes and schema conformance ------------------------------------


def test_reason_codes_are_the_exact_authorize_set():
    assert ops.REASON_CODES == auth.REASON_CODES
    assert len(ops.REASON_CODES) == 12
    assert sorted(ops.REASON_CODES) == sorted(auth.REASON_CODES)


def test_every_returned_reason_is_registered():
    delegation = ops_delegation()
    revoked = copy.deepcopy(delegation)
    revoked["revocation"]["revoked_at"] = "2026-09-01T00:00:00Z"
    contract = build_contract()
    corpus = [
        submit_bid(delegation, task(), bid(), NOW),
        submit_bid(None, task(), bid(), NOW),
        submit_bid(revoked, task(), bid(), NOW),
        submit_bid(delegation, task(), {}, NOW),
        counter_offer(delegation, bid(), counter(), NOW),
        accept_terms(delegation, counter(), NOW),
        accept_terms(full_delegation(), counter(), NOW),
        submit_delivery(delegation, contract, delivery_payload(), NOW),
        verify_delivery(delegation, contract, verification_payload(), NOW),
        verify_delivery(delegation, contract, {}, NOW),
    ]
    for result in corpus:
        assert set(result) >= {"ok", "reason"}, result
        assert result["reason"] in ops.REASON_CODES, result


def test_op_outputs_validate_against_protocol_schemas():
    delegation = ops_delegation()
    submitted = require_ok(submit_bid(delegation, task(), bid(), NOW))["bid"]
    countered = require_ok(counter_offer(delegation, bid(), counter(), NOW))["bid"]
    contract = require_ok(accept_terms(delegation, counter(), NOW))["contract"]
    assert schema_errors("bid.schema.json", submitted) == []
    assert schema_errors("bid.schema.json", countered) == []
    assert schema_errors("contract.schema.json", contract) == []


def test_module_declares_its_purity_and_return_shape():
    assert "authorize" in ops.__doc__.lower()
    assert "deterministic" in ops.__doc__.lower()
