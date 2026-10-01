# PROJECT_STATE.md

Updated: 2026-10-01
Status: ACTIVE — evolving Adventurers Guild into Agent Work Network

## North Star
A two-sided market where both requester and provider can use their own AI agents. Agents discover tasks, bid, negotiate, deliver, verify, and transact inside explicit human delegation boundaries.

## Existing assets (preserve)
- React/Vite web application.
- Supabase backend and existing quest/user model.
- MCP server with 8 tools.
- Existing quest lifecycle: posted → accepted → submitted → released/cancelled.
- Existing escrow RPC path.
- Public site/deployment already exists.

## Direction change — 2026-10-01
The Guild is no longer framed mainly as a human freelance marketplace. It becomes open market infrastructure for:
- Requester Agent ↔ Provider Agent
- Requester Agent ↔ Human
- Human ↔ Provider Agent
- Human ↔ Human

Insurance and real estate are future pressure-test verticals. MVP remains digital work first.

## Current architecture target
1. Identity & Delegation
2. Task Protocol
3. Bid & Negotiation Protocol
4. Contract / agreed_terms
5. Delivery & Evidence
6. Verification
7. Reputation
8. Escrow / settlement adapters

## Immediate engineering objective
Prove a local Agent-to-Agent closed loop without requiring manual data copy:
Task → Bid → Counter-offer → Accepted Terms → Delivery → Verification → Audit Trail.

## First protocol artifacts
Create and validate:
- `packages/protocol/task.schema.json`
- `packages/protocol/bid.schema.json`
- `packages/protocol/contract.schema.json`

Then adapt the existing MCP server rather than replacing it.

## Known risks
- Existing Supabase schema/RPCs are not fully version-controlled in this repo.
- Historical incident: free Supabase backend was paused after inactivity.
- Current MCP models quests as direct accept/release; it does not yet model bidding or negotiated terms.
- Existing service-role credential handling must not be exposed to external agents.
- G-Coin must not be treated as unrestricted fiat-convertible money.

## Safety / governance
- Human approval required for public GitHub actions, production deploys, registry publication, real-money actions, or irreversible contracts.
- Agent permissions must be scoped, revocable, and auditable.
- High-risk regulated verticals route to licensed/responsible humans or entities.

## Collaboration
Hermes = coordinator / durable-goal owner.
Codex = implementation agent on Ubuntu server.
ChatGPT = product architecture, research, remote supervision, Google Drive master-plan maintenance.
Independent reviewer = agy or separate agent for important protocol/security changes.

## Completed checkpoint — 2026-10-01
- Protocol v0.1 Task/Bid/Contract schemas created and machine-validated.
- Positive fixtures pass; invalid Task fixture is rejected.
- Existing frontend production build passes after `npm ci`.
- Codex completed `docs/architecture/quest-protocol-mapping.md` without modifying existing production paths.
- Backward compatibility rule: keep the 8 existing MCP tools; add protocol-native tools separately.

## Next checkpoint
T5 complete and independently reviewed. Principal/Agent delegation schema,
fixtures, and a pure fail-closed `authorize()` are present: every malformed,
incomplete, expired, revoked, over-budget, wrong-currency, or unapproved input
denies, reason codes form a closed enumerable set of twelve, and NaN/infinity
are rejected before any numeric comparison. Commits `39e1287` (Codex round 1)
and `121538e` (DSH round 2).

Next is T6 — minimal API/MCP extension: add `submit_bid`, `counter_offer`,
`accept_terms`, `submit_delivery`, `verify_delivery` **alongside** the 8
existing MCP tools, never replacing them. Every write path must call
`authorize()` first and must surface its reason code. Do not add a write tool
whose authorization can be bypassed.
