from datetime import datetime, timezone
import copy
import json
from pathlib import Path

import authorize as auth
from authorize import authorize, check_action_allowed, check_revoked, check_spend, check_validity


ROOT = Path(__file__).resolve().parent


def delegation():
    with (ROOT / "fixtures/delegation.valid.full.json").open(encoding="utf-8") as handle:
        return json.load(handle)


NOW = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)


def assert_decision(decision, allowed, reason_code):
    assert decision.allowed is allowed, decision
    assert decision.reason_code == reason_code, decision


def test_spend_equal_limit_allowed_and_one_cent_over_rejected():
    value = delegation()
    assert check_spend(value, 50000).reason_code == "OK"
    assert check_spend(value, 50000.01).reason_code == "SPEND_EXCEEDS_MAX"


def test_action_and_category_boundaries():
    value = delegation()
    assert check_action_allowed(value, "submit_bid").reason_code == "OK"
    assert check_action_allowed(value, "unknown").reason_code == "ACTION_NOT_ALLOWED"
    assert check_action_allowed(value, {"name": "submit_bid", "category": "insurance"}).reason_code == "CATEGORY_NOT_ALLOWED"


def test_validity_uses_half_open_interval():
    value = delegation()
    assert check_validity(value, NOW).reason_code == "OK"
    assert check_validity(value, "2027-10-01T00:00:00Z").reason_code == "DELEGATION_EXPIRED"
    assert check_validity(value, "2025-09-30T23:59:59Z").reason_code == "DELEGATION_NOT_YET_VALID"


def test_revocation():
    value = delegation()
    value["revocation"]["revoked_at"] = "2026-10-01T01:00:00Z"
    assert check_revoked(value).reason_code == "DELEGATION_REVOKED"


def test_authorize_thresholds_and_human_approval():
    value = delegation()
    assert authorize(value, "submit_bid", 10000, NOW).reason_code == "OK"
    assert authorize(value, "submit_bid", 10000.01, NOW).reason_code == "THRESHOLD_EXCEEDED"
    assert authorize(value, "accept_terms", 100, NOW).reason_code == "REQUIRES_HUMAN_APPROVAL"
    assert authorize(value, {"name": "submit_bid", "category": "regulated_vertical"}, 100, NOW).reason_code == "REQUIRES_HUMAN_APPROVAL"


def test_authorize_checks_revocation_expiry_and_spend():
    value = delegation()
    revoked = copy.deepcopy(value)
    revoked["revocation"]["revoked_at"] = "2026-10-01T01:00:00Z"
    assert authorize(revoked, "submit_bid", 1, NOW).reason_code == "DELEGATION_REVOKED"
    assert authorize(value, "submit_bid", 1, "2027-10-01T00:00:00Z").reason_code == "DELEGATION_EXPIRED"
    assert authorize(value, "submit_bid", 50000.01, NOW).reason_code == "SPEND_EXCEEDS_MAX"


def test_fail_closed_on_malformed_inputs():
    value = delegation()
    assert check_spend({}, 1).allowed is False
    assert check_action_allowed(value, None).allowed is False
    assert check_validity(value, "bad timestamp").allowed is False
    assert check_revoked({}).allowed is False
    assert authorize(value, "submit_bid", "not-a-number", NOW).allowed is False


# --- T5 round 2 mandatory additions -----------------------------------------


def test_amount_negative_rejected():
    assert_decision(authorize(delegation(), "submit_bid", -1, NOW), False, "INVALID_AMOUNT")


def test_amount_zero_allowed():
    assert_decision(authorize(delegation(), "submit_bid", 0, NOW), True, "OK")


def test_amount_string_rejected():
    assert_decision(authorize(delegation(), "submit_bid", "abc", NOW), False, "INVALID_AMOUNT")


def test_amount_none_rejected():
    assert_decision(authorize(delegation(), "submit_bid", None, NOW), False, "INVALID_AMOUNT")


def test_amount_bool_rejected_before_numeric_path():
    assert_decision(authorize(delegation(), "submit_bid", True, NOW), False, "INVALID_AMOUNT")


def test_amount_infinity_rejected():
    assert_decision(authorize(delegation(), "submit_bid", float("inf"), NOW), False, "INVALID_AMOUNT")


def test_now_none_rejected():
    assert_decision(authorize(delegation(), "submit_bid", 100, None), False, "INVALID_DELEGATION")


def test_now_garbage_rejected():
    assert_decision(authorize(delegation(), "submit_bid", 100, "garbage"), False, "INVALID_DELEGATION")


def test_expires_without_timezone_rejected():
    value = delegation()
    value["validity"]["expires_at"] = "2026-12-31T00:00:00"
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_now_equal_expires_rejected():
    value = delegation()
    assert_decision(authorize(value, "submit_bid", 100, value["validity"]["expires_at"]), False, "DELEGATION_EXPIRED")


def test_now_one_second_before_expiry_allowed():
    value = delegation()
    almost = datetime(2027, 9, 30, 23, 59, 59, tzinfo=timezone.utc)
    assert_decision(authorize(value, "submit_bid", 100, almost), True, "OK")


def test_cross_timezone_same_instant_allowed():
    value = delegation()
    value["validity"]["issued_at"] = "2026-10-01T00:00:00Z"
    value["validity"]["expires_at"] = "2027-10-01T00:00:00Z"
    # 2026-10-01T08:00:00+08:00 is the same instant as 2026-10-01T00:00:00Z.
    assert_decision(authorize(value, "submit_bid", 100, "2026-10-01T08:00:00+08:00"), True, "OK")
    assert_decision(authorize(value, "submit_bid", 100, datetime(2026, 10, 1, 0, tzinfo=timezone.utc)), True, "OK")
    assert datetime.fromisoformat("2026-10-01T08:00:00+08:00") == datetime(2026, 10, 1, 0, tzinfo=timezone.utc)


def test_empty_allowed_actions_rejected():
    value = delegation()
    value["scope"]["allowed_actions"] = []
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "ACTION_NOT_ALLOWED")


def test_missing_allowed_actions_key_rejected():
    value = delegation()
    del value["scope"]["allowed_actions"]
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_missing_scope_key_rejected():
    value = delegation()
    del value["scope"]
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_missing_validity_key_rejected():
    value = delegation()
    del value["validity"]
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_missing_revocation_key_rejected():
    value = delegation()
    del value["revocation"]
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_missing_approval_thresholds_key_rejected():
    value = delegation()
    del value["approval_thresholds"]
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_missing_human_approval_actions_key_rejected():
    value = delegation()
    del value["approval_thresholds"]["human_approval_actions"]
    assert_decision(authorize(value, "submit_bid", 100, NOW), False, "INVALID_DELEGATION")


def test_currency_mismatch_on_max_spend_rejected():
    value = delegation()
    assert_decision(authorize(value, "submit_bid", 100, NOW, currency="USD"), False, "CURRENCY_MISMATCH")


def test_currency_mismatch_on_max_autonomous_spend_rejected():
    value = delegation()
    value["approval_thresholds"]["max_autonomous_spend"]["currency"] = "USD"
    # Request currency matches scope.max_spend (TWD) but not the autonomous threshold.
    assert_decision(authorize(value, "submit_bid", 100, NOW, currency="TWD"), False, "CURRENCY_MISMATCH")


def test_currency_match_allowed():
    value = delegation()
    assert_decision(authorize(value, "submit_bid", 100, NOW, currency="TWD"), True, "OK")


def test_currency_none_skips_check_and_changes_nothing_else():
    value = delegation()
    value["approval_thresholds"]["max_autonomous_spend"]["currency"] = "USD"
    # max_spend is TWD and the autonomous threshold is USD; an unspecified
    # request currency must skip the check rather than raise.
    assert_decision(authorize(value, "submit_bid", 100, NOW), True, "OK")
    assert_decision(authorize(value, "submit_bid", 100, NOW, currency=None), True, "OK")
    # Other behaviour is untouched: an over-threshold amount is still refused.
    assert_decision(authorize(value, "submit_bid", 10000.01, NOW), False, "THRESHOLD_EXCEEDED")


def test_category_not_allowed_rejected():
    action = {"name": "submit_bid", "category": "insurance"}
    assert_decision(authorize(delegation(), action, 100, NOW), False, "CATEGORY_NOT_ALLOWED")


def test_every_returned_reason_code_is_registered():
    value = delegation()
    revoked = copy.deepcopy(value)
    revoked["revocation"]["revoked_at"] = "2026-10-01T01:00:00Z"
    corpus = [
        authorize(value, "submit_bid", 100, NOW, currency="TWD"),
        authorize(value, "submit_bid", -1, NOW),
        authorize(value, "submit_bid", 50000.01, NOW),
        authorize(value, "submit_bid", 10000.01, NOW),
        authorize(value, "submit_bid", 100, NOW, currency="USD"),
        authorize(value, "unknown", 100, NOW),
        authorize(value, {"name": "submit_bid", "category": "insurance"}, 100, NOW),
        authorize(value, "accept_terms", 100, NOW),
        authorize(value, "submit_bid", 100, "2027-10-01T00:00:00Z"),
        authorize(value, "submit_bid", 100, "2025-09-30T23:59:59Z"),
        authorize(revoked, "submit_bid", 100, NOW),
        authorize({}, "submit_bid", 100, NOW),
    ]
    for decision in corpus:
        assert isinstance(decision.allowed, bool), decision
        assert decision.reason_code in auth.REASON_CODES, decision
    # The corpus exercises every registered code, so REASON_CODES has no orphan
    # entries and no returned code lives outside the set.
    assert {decision.reason_code for decision in corpus} == auth.REASON_CODES
