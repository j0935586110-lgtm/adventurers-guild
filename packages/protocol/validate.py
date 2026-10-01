#!/usr/bin/env python3
"""Validate protocol v0.1 schemas and fixtures."""
from pathlib import Path
import json
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parent
FIX = ROOT / "fixtures"

CASES = [
    ("task.schema.json", "task.valid.json", True),
    ("bid.schema.json", "bid.valid.json", True),
    ("contract.schema.json", "contract.valid.json", True),
    ("task.schema.json", "task.invalid.json", False),
    ("delegation.schema.json", "delegation.valid.json", True),
    ("delegation.schema.json", "delegation.valid.full.json", True),
    ("delegation.schema.json", "delegation.expired.json", True),
    ("delegation.schema.json", "delegation.revoked.json", True),
    ("delegation.schema.json", "delegation.exceeds-spend.json", True),
    ("delegation.schema.json", "delegation.invalid.json", False),
]


def load(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def validate_case(schema_name, fixture_name, should_pass):
    schema = load(ROOT / schema_name)
    fixture = load(FIX / fixture_name)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(fixture), key=lambda e: list(e.path))
    passed = not errors
    if passed != should_pass:
        details = "; ".join(e.message for e in errors[:5]) or "unexpected success"
        raise AssertionError(f"{fixture_name}: {details}")
    print(f"PASS {fixture_name}: {'valid' if should_pass else 'rejected as expected'}")


def check_flow_links():
    task = load(FIX / "task.valid.json")
    bid = load(FIX / "bid.valid.json")
    contract = load(FIX / "contract.valid.json")
    assert bid["task_id"] == task["task_id"]
    assert contract["task_id"] == task["task_id"]
    assert contract["accepted_bid_id"] == bid["bid_id"]
    assert contract["provider"] == bid["provider"]
    print("PASS flow links: Task → Bid → Contract")


def main():
    for case in CASES:
        validate_case(*case)
    check_flow_links()
    print("Protocol v0.1 validation complete")


if __name__ == "__main__":
    main()
