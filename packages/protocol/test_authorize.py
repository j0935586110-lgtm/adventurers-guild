from datetime import datetime, timezone
import copy
import json
from pathlib import Path

from authorize import authorize, check_action_allowed, check_revoked, check_spend, check_validity


ROOT = Path(__file__).resolve().parent


def delegation():
    with (ROOT / "fixtures/delegation.valid.full.json").open(encoding="utf-8") as handle:
        return json.load(handle)


NOW = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)


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
