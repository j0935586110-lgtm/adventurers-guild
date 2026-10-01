# TASKS.md — Active Queue

## P0 — Protocol v0.1
Status: DONE (2026-10-01; local validation green)
Owner: Hermes → Codex

### T1 Task schema — DONE
Deliverable: `packages/protocol/task.schema.json`
Must model:
- task identity/type/goal;
- requirements and constraints;
- budget/deadline/location;
- required credentials;
- deliverables and acceptance criteria;
- execution mode: agent/human/hybrid/licensed_human;
- human approval policy;
- privacy level.
Acceptance: valid JSON Schema and positive/negative fixture validation.

### T2 Bid schema — DONE
Deliverable: `packages/protocol/bid.schema.json`
Must model:
- task reference + provider agent/principal;
- price/currency or non-cash consideration;
- estimated duration;
- assumptions, exclusions, evidence;
- validity/expiry;
- status and parent offer for counter-offer chain.
Acceptance: valid JSON Schema and counter-offer fixture.

### T3 Contract schema — DONE
Deliverable: `packages/protocol/contract.schema.json`
Must model immutable agreed terms derived from accepted bid/counter-offer.
Include parties, task snapshot/reference, price, milestones, acceptance, approval requirements, cancellation/dispute policy, timestamps, and audit references.
Acceptance: schema validates a Task → Bid → Contract fixture.

## P1 — Compatibility design
Status: IN PROGRESS
Owner: Hermes

### T4 Map Quest → Task/Bid/Contract — DONE (Codex, 2026-10-01)
Do not rewrite production paths yet.
Produce `docs/architecture/quest-protocol-mapping.md` describing:
- fields that can be reused;
- fields requiring migrations;
- backward-compatible API/MCP strategy;
- cutover risks.

### T5 Delegation model
Status: DONE (2026-10-01; local validation green)
Define Principal/Agent identities and permission envelope:
- max spend/value;
- allowed task categories;
- allowed tools/actions;
- approval thresholds;
- expiration and revocation.
No real signing/payment integration yet.
Round 1 (Codex, `39e1287`) then round 2 (DSH, `121538e`) after independent
review by agy. Three gaps the review surfaced were closed in round 2:
currency was declared in the schema but never validated by `authorize()`;
`REASON_CODES` was not exported so downstream could not enumerate reason
codes; `amount == 0` semantics were undefined. `_amount()` also now rejects
NaN and infinity — `nan > cap` is False, so an unguarded NaN would have been
a catastrophic fail-open. Verified independently: `validate.py` 11 PASS,
`pytest packages/protocol/` 32 passed, `REASON_CODES` == 12 exact set.

## P2 — Agent-to-Agent local loop
Status: QUEUED

### T6 Minimal API/MCP extension — DONE (67ba5e1 + 58fbc3e)
Status: pure write layer and MCP surface both landed.

Add proposal-oriented operations without removing existing 8 MCP tools.
Candidate tools: `submit_bid`, `counter_offer`, `accept_terms`, `submit_delivery`, `verify_delivery`.

**`67ba5e1`** — `packages/protocol/ops.py`: all five operations as pure
functions, each gated by `authorize()`. Denial returns the gate's exact reason
code, carries no data, and does not mutate inputs.

**`58fbc3e`** — the MCP surface. `mcp/protocol_tools.py` defines the five tools
and delegates to `ops.py`; `mcp/server.py` gains nineteen additive lines and
loses none. Verified independently: 8/8 existing tool definitions, 8/8 dispatch
branches and 8/8 handler implementations still present; `now` is a required
argument on every tool and the system clock is never read; expired, revoked,
not-yet-valid and unauthorised-action requests all deny with **no `data` key**.
`tests/test_protocol_tools.py` 17 passed; `packages/protocol/` 65 passed.

### T7 Two test agents
Requester Agent and Provider Agent must complete a fake digital task end-to-end with no manual data copying.

### T8 Append-only audit trail
Every state transition records actor, principal, action, payload reference, timestamp, and evidence reference.

## Deferred
- Real-money settlement
- Full insurance transactions
- Real-estate title/closing
- DAO/token design
- Production migration until protocol v0.1 is reviewed
