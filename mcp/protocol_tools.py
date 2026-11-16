"""MCP tool surface for the pure T6 protocol write layer.

The five proposal-oriented operations in ``packages/protocol/ops.py`` are pure
functions, each gated by the frozen fail-closed ``authorize()``. This module
turns them into MCP tools without reimplementing any logic: it defines the
``Tool`` objects, a synchronous dispatcher (``call_protocol_tool``) for tests
and local callers, and an async ``handle_protocol_tool`` that produces the
``TextContent`` response ``mcp/server.py`` returns.

Why this lives outside ``mcp/server.py``
----------------------------------------
``mcp/server.py`` raises at import time when ``SUPABASE_SERVICE_KEY`` is
unset, and it reads/writes Supabase. The protocol layer is local/in-memory for
now, so keeping the definitions here lets them be imported and tested with no
credentials and no network, while ``mcp/server.py`` stays the only module that
owns persistence. There is no payment, settlement, signing, or cryptography
here, and no Supabase access.

The response shape is the ops shape, normalised and guaranteed:

* success  -> ``{"ok": true, "reason": "OK", "data": {...}}``
* denial   -> ``{"ok": false, "reason": "<code>", "error": "<detail>"}`` and
  **no** ``data`` key.

``reason`` is always a member of ``authorize.REASON_CODES``. Every tool takes
``now`` as an explicit argument; the system clock is never read.
"""
import inspect
import json
import sys
from pathlib import Path

from mcp.types import TextContent, Tool

# ``mcp/server.py`` is run as a top-level script, and the reviewed protocol
# package imports its siblings as top-level modules (``ops.py`` does
# ``from authorize import ...``). Put the repository root and the protocol
# package directory on ``sys.path`` so ``packages.protocol.ops`` and that
# module's own imports both resolve without restructuring the frozen package.
_REPO_ROOT = Path(__file__).resolve().parent.parent
_PROTOCOL_DIR = _REPO_ROOT / "packages" / "protocol"
for _path in (str(_REPO_ROOT), str(_PROTOCOL_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from packages.protocol.ops import (  # noqa: E402
    REASON_CODES,
    accept_terms,
    counter_offer,
    submit_bid,
    submit_delivery,
    verify_delivery,
)


__all__ = [
    "REASON_CODES",
    "PROTOCOL_TOOLS",
    "PROTOCOL_TOOL_NAMES",
    "call_protocol_tool",
    "handle_protocol_tool",
]


# --- schemas ----------------------------------------------------------------

_DELEGATION = {
    "type": "object",
    "description": (
        "Principal-to-agent delegation. Every write is refused unless this "
        "delegation authorizes the action, category, amount, currency, and time."
    ),
}
_NOW = {
    "type": "string",
    "description": (
        "Explicit timezone-aware ISO-8601 timestamp used for every validity "
        "and created-at decision. Never read from the system clock."
    ),
}


def _payload(description):
    return {"type": "object", "description": description}


def _tool(name, description, properties, required):
    return Tool(
        name=name,
        description=description,
        inputSchema={
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": False,
        },
    )


PROTOCOL_TOOLS = [
    _tool(
        "submit_bid",
        "A provider agent submits a bid on a task. Gated by the delegation's "
        "authorize() check; returns ok/reason and the proposed bid under data.",
        {
            "delegation": _DELEGATION,
            "task": _payload("Task the bid targets; its task_type is the category."),
            "bid": _payload("Bid proposal carrying bid_id, task_id, provider, and offer."),
            "now": _NOW,
        },
        ["delegation", "task", "bid", "now"],
    ),
    _tool(
        "counter_offer",
        "A requester agent counters an existing bid. Gated by authorize(); the "
        "resulting bid links to the parent via parent_bid_id.",
        {
            "delegation": _DELEGATION,
            "bid": _payload("Parent bid being countered."),
            "counter": _payload("Counter proposal; its offer is what the gate prices."),
            "now": _NOW,
        },
        ["delegation", "bid", "counter", "now"],
    ),
    _tool(
        "accept_terms",
        "A requester agent accepts a bid and produces contract terms. Gated by "
        "authorize(); the contract references the accepted bid.",
        {
            "delegation": _DELEGATION,
            "bid": _payload("Bid being accepted."),
            "now": _NOW,
        },
        ["delegation", "bid", "now"],
    ),
    _tool(
        "submit_delivery",
        "A provider agent submits work against an accepted contract. Gated by "
        "authorize(); the delivery references the contract.",
        {
            "delegation": _DELEGATION,
            "contract": _payload("Accepted contract the delivery is against."),
            "delivery": _payload("Delivery record with delivery_id and optional evidence."),
            "now": _NOW,
        },
        ["delegation", "contract", "delivery", "now"],
    ),
    _tool(
        "verify_delivery",
        "A requester agent verifies a delivery against its contract. Gated by "
        "authorize(); the verification references both contract and delivery.",
        {
            "delegation": _DELEGATION,
            "contract": _payload("Accepted contract the delivery is against."),
            "verification": _payload(
                "Verification record with verification_id, delivery_id, and result."
            ),
            "now": _NOW,
        },
        ["delegation", "contract", "verification", "now"],
    ),
]

PROTOCOL_TOOL_NAMES = tuple(tool.name for tool in PROTOCOL_TOOLS)


# --- dispatch ---------------------------------------------------------------

_OPS = {
    "submit_bid": submit_bid,
    "counter_offer": counter_offer,
    "accept_terms": accept_terms,
    "submit_delivery": submit_delivery,
    "verify_delivery": verify_delivery,
}

# Argument name tuples are derived from the real ops signatures so the MCP
# surface cannot drift from the reviewed functions.
_ARGUMENTS = {
    name: tuple(inspect.signature(func).parameters) for name, func in _OPS.items()
}


def _normalise(result):
    """Guarantee the MCP response shape, including no ``data`` on denial."""
    if not isinstance(result, dict):
        return {
            "ok": False,
            "reason": "INVALID_DELEGATION",
            "error": "Protocol operation returned no result",
        }
    reason = result.get("reason")
    if reason not in REASON_CODES:
        reason = "INVALID_DELEGATION"
    if result.get("ok") is True:
        return {"ok": True, "reason": reason, "data": result.get("data")}
    return {
        "ok": False,
        "reason": reason,
        "error": result.get("error") or "Protocol operation denied",
    }


def call_protocol_tool(name, arguments):
    """Run one protocol tool and return a plain JSON-serialisable dict.

    Missing arguments are passed through as ``None`` so the operation fails
    closed with the gate's reason code instead of raising.
    """
    if name not in _OPS:
        raise ValueError(f"Unknown protocol tool: {name!r}")
    supplied = arguments if isinstance(arguments, dict) else {}
    kwargs = {argument: supplied.get(argument) for argument in _ARGUMENTS[name]}
    return _normalise(_OPS[name](**kwargs))


async def handle_protocol_tool(name, arguments):
    """MCP-facing async handler; returns a single JSON ``TextContent``."""
    try:
        result = call_protocol_tool(name, arguments)
    except ValueError as error:
        result = {"ok": False, "reason": "INVALID_DELEGATION", "error": str(error)}
    return [
        TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))
    ]
