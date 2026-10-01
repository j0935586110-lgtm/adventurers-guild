# PROJECT_STATE.md

Updated: 2026-10-01
Status: ACTIVE — evolving Adventurers Guild into Agent Work Network

## North Star
An open task-matching network that decomposes needs into executable work, expresses that work as capabilities and credentials, and directly matches it to the smallest suitable set of human, Agent, hybrid, or organization Actors. Transaction automation exists underneath matching; it is not the current product focus.

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
1. Need → Task decomposition
2. Capability model
3. Credential model
4. Actor model: human / agent / hybrid / organization
5. Eligibility filter and Match engine
6. Identity & Delegation (existing foundation)
7. Bid / Negotiation / Contract (existing foundation; not current priority)
8. Delivery / Verification / Audit (preserve; expand after matching proof)
9. Escrow / settlement adapters (deferred)

Canonical matching architecture: `docs/architecture/task-matching-professional-decoupling.md`.

## Immediate product objective
Validate that professional decoupling and orchestration solve a real user problem before expanding code:
Need → Workflow / Task Graph → required capabilities/credentials → eligible Actors → explainable Match → explicit coordination responsibility.

Run 10–20 concierge tests on a concrete outcome, starting with the hypothesis `中古屋買到能入住`. The product is not validated by positive feedback; it is validated by real demand submission, provider contact/quote actions, lower coordination effort, and continued use.

T5–T7 already prove that matched Agents can later negotiate and execute. Do not expand that transaction layer until the matching value proposition is proven.

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

## Completed foundation — 2026-10-01
- T1–T3 Task/Bid/Contract protocol schemas complete.
- T4 legacy Quest compatibility mapping complete.
- T5 Principal/Agent delegation and fail-closed authorization complete and independently reviewed.
- T6 five protocol-native MCP proposal tools complete without replacing the original 8 Quest tools.
- T7 Requester/Provider Agent E2E complete: Task → Bid → Counter → Terms → Delivery → Verification with no manual data copying; whole suite 105 passed at checkpoint.

## Next checkpoint — Validation before automation
1. Run V0 concierge demand validation on 10–20 real complex needs.
2. Capture accepted/rejected Workflow nodes and whether users prefer multi-Actor orchestration or a single coordinator.
3. Define the minimal Workflow/Orchestration representation from observed cases.
4. Only then implement/lock Capability, Credential, Actor, eligibility and Match schemas/logic.
5. Keep model-neutral MCP/API discovery as the interface target after the user value is demonstrated.

T8 append-only audit remains required but is paused behind this matching milestone unless it blocks matching correctness or traceability.

Product proof: a real need can be decomposed and directly matched to capable and properly credentialed Actors without requiring a profession-labelled intermediary.
