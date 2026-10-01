"""T6b MCP protocol-tool tests (written test-first).

This file was written BEFORE ``mcp/protocol_tools.py`` existed. The first run
therefore failed at collection with
``ModuleNotFoundError: No module named 'protocol_tools'`` — that red output is
the evidence the tests are real and were not back-filled from the
implementation.

The tests never need Supabase or the network. They import the local
``mcp/protocol_tools`` module directly by putting ``mcp/`` on ``sys.path``
(the directory is not a package and shares its name with the installed MCP
SDK, so it must be imported as a top-level module) and drive the five wrapper
tools with fixture data from ``packages/protocol/fixtures``.

Properties pinned here:

* all five tools exist, each with a well-formed JSON Schema;
* each ``inputSchema`` requires exactly the arguments its ``ops`` function
  takes, including an explicit ``now``;
* a permitted action returns ``ok=true`` with ``data``;
* the gate's exact reason code propagates for expired / revoked / over-budget /
  wrong-currency / disallowed-action delegations;
* a denial never carries a ``data`` key and never mutates its inputs;
* the eight pre-existing MCP tools are still present, in order.
"""
import copy
import importlib.util
import inspect
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
MCP_DIR = ROOT / "mcp"
FIX = ROOT / "packages" / "protocol" / "fixtures"

for _path in (str(MCP_DIR), str(ROOT)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

import protocol_tools  # noqa: E402
from packages.protocol import ops  # noqa: E402


NOW = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)
NOW_STR = "2026-10-01T12:00:00Z"
FUTURE_STR = "2028-01-01T00:00:00Z"

# The eight tools that existed before T6b. Their names, order, and behaviour
# must survive untouched.
EXISTING_TOOL_NAMES = [
    "search_quests",
    "get_quest_detail",
    "accept_quest",
    "submit_quest_proof",
    "release_quest_escrow",
    "cancel_quest",
    "get_profile",
    "post_quest",
]

TOOL_NAMES = [
    "submit_bid",
    "counter_offer",
    "accept_terms",
    "submit_delivery",
    "verify_delivery",
]

OP_FUNCTIONS = {
    "submit_bid": ops.submit_bid,
    "counter_offer": ops.counter_offer,
    "accept_terms": ops.accept_terms,
    "submit_delivery": ops.submit_delivery,
    "verify_delivery": ops.verify_delivery,
}

DATA_KEY = {
    "submit_bid": "bid",
    "counter_offer": "bid",
    "accept_terms": "contract",
    "submit_delivery": "delivery",
    "verify_delivery": "verification",
}


# --- fixture helpers --------------------------------------------------------


def load(name):
    with (FIX / name).open(encoding="utf-8") as handle:
        return json.load(handle)


def delegation():
    return load("delegation.ops.valid.json")


def task():
    return load("task.valid.json")


def bid():
    return load("bid.valid.json")


def counter():
    return load("bid.counter.valid.json")


def contract():
    result = ops.accept_terms(delegation(), counter(), NOW)
    assert result["ok"] is True, result
    return result["data"]["contract"]


def delivery():
    return {
        "delivery_id": "delivery-demo-001",
        "summary": "Source and passing tests delivered.",
        "evidence": [{"type": "test_result", "reference": "local://tests/pass"}],
    }


def verification():
    return {
        "verification_id": "verification-demo-001",
        "delivery_id": "delivery-demo-001",
        "result": "accepted",
        "criteria_results": [],
    }


def tool_arguments(name):
    """One well-formed argument object for each tool, with ``now`` explicit."""
    payloads = {
        "submit_bid": {"task": task(), "bid": bid()},
        "counter_offer": {"bid": bid(), "counter": counter()},
        "accept_terms": {"bid": counter()},
        "submit_delivery": {"contract": contract(), "delivery": delivery()},
        "verify_delivery": {"contract": contract(), "verification": verification()},
    }
    return {"delegation": delegation(), **payloads[name], "now": NOW_STR}


def call(name, arguments):
    return protocol_tools.call_protocol_tool(name, arguments)


def revoke(value):
    value["revocation"]["revoked_at"] = "2026-09-01T00:00:00Z"
    return value


def over_budget(value):
    value["scope"]["max_spend"]["amount"] = 1
    return value


def wrong_currency(value):
    value["scope"]["max_spend"]["currency"] = "USD"
    return value


def disallow_all(value):
    value["scope"]["allowed_actions"] = []
    return value


# (label, delegation mutation, now value, expected gate reason)
DENIAL_CASES = [
    ("expired delegation", lambda value: value, FUTURE_STR, "DELEGATION_EXPIRED"),
    ("revoked delegation", revoke, NOW_STR, "DELEGATION_REVOKED"),
    ("over budget", over_budget, NOW_STR, "SPEND_EXCEEDS_MAX"),
    ("wrong currency", wrong_currency, NOW_STR, "CURRENCY_MISMATCH"),
    ("action not allowed", disallow_all, NOW_STR, "ACTION_NOT_ALLOWED"),
]


# --- tool registration and schemas ------------------------------------------


def test_all_five_tools_are_registered():
    names = [tool.name for tool in protocol_tools.PROTOCOL_TOOLS]
    assert names == TOOL_NAMES, names
    assert tuple(names) == protocol_tools.PROTOCOL_TOOL_NAMES
    assert len(protocol_tools.PROTOCOL_TOOLS) == 5


def test_every_tool_has_a_description_and_well_formed_input_schema():
    for tool in protocol_tools.PROTOCOL_TOOLS:
        assert isinstance(tool.description, str) and tool.description.strip(), tool.name
        Draft202012Validator.check_schema(tool.inputSchema)
        assert tool.inputSchema["type"] == "object", tool.name
        assert isinstance(tool.inputSchema["properties"], dict), tool.name
        assert isinstance(tool.inputSchema["required"], list), tool.name
        assert tool.inputSchema["required"], tool.name


def test_input_schema_requires_exactly_the_ops_arguments():
    for tool in protocol_tools.PROTOCOL_TOOLS:
        params = set(inspect.signature(OP_FUNCTIONS[tool.name]).parameters)
        schema = tool.inputSchema
        assert set(schema["required"]) == params, tool.name
        assert set(schema["properties"]) == params, tool.name
        # No optional extra that ops does not accept, and no readable-only arg.
        assert set(schema["required"]) == set(schema["properties"]), tool.name


def test_now_is_an_explicit_required_string_argument_for_every_tool():
    for tool in protocol_tools.PROTOCOL_TOOLS:
        assert "now" in tool.inputSchema["required"], tool.name
        assert tool.inputSchema["properties"]["now"]["type"] == "string", tool.name


# --- happy paths ------------------------------------------------------------


def test_permitted_action_returns_ok_reason_and_data_for_every_tool():
    for name in TOOL_NAMES:
        result = call(name, tool_arguments(name))
        assert result["ok"] is True, (name, result)
        assert result["reason"] == "OK", (name, result)
        assert "data" in result, (name, result)
        assert "error" not in result, (name, result)
        assert DATA_KEY[name] in result["data"], (name, result)


def test_timestamps_come_from_the_now_argument_not_the_system_clock():
    first = call("submit_bid", tool_arguments("submit_bid"))
    arguments = tool_arguments("submit_bid")
    # A different but still-valid instant: the delegation runs 2026-10-01 to
    # 2027-10-01, so this must be authorised and must echo the supplied now.
    arguments["now"] = "2026-11-02T03:04:05Z"
    second = call("submit_bid", arguments)
    assert second["ok"] is True, second
    assert first["data"]["bid"]["created_at"] == NOW_STR
    assert second["data"]["bid"]["created_at"] == "2026-11-02T03:04:05Z"


def test_handler_returns_a_json_response_with_ok_reason_and_data():
    import asyncio

    content = asyncio.run(
        protocol_tools.handle_protocol_tool("submit_bid", tool_arguments("submit_bid"))
    )
    assert len(content) == 1
    payload = json.loads(content[0].text)
    assert payload["ok"] is True
    assert payload["reason"] == "OK"
    assert "data" in payload


# --- the gate's reason codes propagate --------------------------------------


def test_expired_delegation_denies_with_the_gates_reason():
    arguments = tool_arguments("submit_bid")
    arguments["now"] = FUTURE_STR
    result = call("submit_bid", arguments)
    assert result["ok"] is False, result
    assert result["reason"] == "DELEGATION_EXPIRED", result
    assert "data" not in result, result


def test_revoked_delegation_denies_with_delegation_revoked():
    arguments = tool_arguments("counter_offer")
    arguments["delegation"] = revoke(delegation())
    result = call("counter_offer", arguments)
    assert result["ok"] is False, result
    assert result["reason"] == "DELEGATION_REVOKED", result
    assert "data" not in result, result


def test_over_budget_denies_with_spend_exceeds_max():
    arguments = tool_arguments("accept_terms")
    arguments["delegation"] = over_budget(delegation())
    result = call("accept_terms", arguments)
    assert result["ok"] is False, result
    assert result["reason"] == "SPEND_EXCEEDS_MAX", result
    assert "data" not in result, result


def test_wrong_currency_denies_with_currency_mismatch():
    arguments = tool_arguments("submit_delivery")
    arguments["delegation"] = wrong_currency(delegation())
    result = call("submit_delivery", arguments)
    assert result["ok"] is False, result
    assert result["reason"] == "CURRENCY_MISMATCH", result
    assert "data" not in result, result


def test_action_outside_allowed_actions_denies_with_action_not_allowed():
    arguments = tool_arguments("verify_delivery")
    arguments["delegation"] = disallow_all(delegation())
    result = call("verify_delivery", arguments)
    assert result["ok"] is False, result
    assert result["reason"] == "ACTION_NOT_ALLOWED", result
    assert "data" not in result, result


def test_every_gate_denial_has_no_data_key_and_leaves_inputs_untouched():
    for name in TOOL_NAMES:
        for label, mutate, now_value, expected in DENIAL_CASES:
            arguments = tool_arguments(name)
            arguments["delegation"] = mutate(delegation())
            arguments["now"] = now_value
            snapshot = copy.deepcopy(arguments)

            result = call(name, arguments)

            assert result["ok"] is False, (name, label, result)
            assert result["reason"] == expected, (name, label, result)
            assert "data" not in result, (name, label, result)
            assert "error" in result and result["error"], (name, label, result)
            assert result["reason"] in ops.REASON_CODES, (name, label, result)
            assert set(result) == {"ok", "reason", "error"}, (name, label, result)
            assert arguments == snapshot, (name, label, "inputs were mutated")


def test_no_denial_ever_carries_a_data_key():
    denials = 0
    for name in TOOL_NAMES:
        for _label, mutate, now_value, _expected in DENIAL_CASES:
            arguments = tool_arguments(name)
            arguments["delegation"] = mutate(delegation())
            arguments["now"] = now_value
            result = call(name, arguments)
            assert "data" not in result, (name, result)
            denials += 1
    assert denials == len(TOOL_NAMES) * len(DENIAL_CASES)


def test_handler_denial_json_has_an_error_and_no_data_key():
    import asyncio

    arguments = tool_arguments("accept_terms")
    arguments["delegation"] = revoke(delegation())
    content = asyncio.run(
        protocol_tools.handle_protocol_tool("accept_terms", arguments)
    )
    payload = json.loads(content[0].text)
    assert payload["ok"] is False
    assert payload["reason"] == "DELEGATION_REVOKED"
    assert "data" not in payload
    assert payload["error"]


# --- server wiring regression guard -----------------------------------------


def _load_server_module():
    """Import the real mcp/server.py offline, with a placeholder credential."""
    os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-key")
    spec = importlib.util.spec_from_file_location("guild_mcp_server", MCP_DIR / "server.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_existing_eight_tools_are_still_listed_by_the_server_in_order():
    server = _load_server_module()
    names = [tool.name for tool in server.TOOLS]
    assert names[: len(EXISTING_TOOL_NAMES)] == EXISTING_TOOL_NAMES, names
    for expected in EXISTING_TOOL_NAMES:
        assert expected in names, (expected, names)


def test_server_now_also_lists_the_five_protocol_tools():
    server = _load_server_module()
    names = [tool.name for tool in server.TOOLS]
    for name in TOOL_NAMES:
        assert name in names, (name, names)
