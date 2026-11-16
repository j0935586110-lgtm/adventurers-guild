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

## CURRENT PRIORITY — Demand Validation + Matching Core
Status: ACTIVE (2026-10-01)
Architecture: `docs/architecture/task-matching-professional-decoupling.md`
Research/validation plan: `PLAN.md` §7.

T5–T7 are preserved as completed transaction infrastructure. Do not expand negotiation, contract, settlement, execution, or audit infrastructure until the matching value proposition is validated.

### V0 Concierge demand validation — ACTIVE
Run 10–20 real complex-needs interviews/tests before treating the architecture as product validation. Start with the outcome hypothesis `中古屋買到能入住`. Return a Workflow/Task Graph, required capabilities/credentials, Actor choices, and an optional coordinator. Measure task edits, willingness to use multiple Actors, demand for a single responsible coordinator, time-to-qualified-provider, actual contact/quote actions, and repeat-task continuation.

Kill/pivot criteria are defined in `PLAN.md` §7.8. Praise or stated interest does not count as validation; observable action does.

### V1 Minimal human UX prototype — TODO alongside V0
Build only the five validation screens defined in `docs/architecture/user-experience-agent-discovery.md`: Outcome Input, Workflow Review, Match Comparison, Actor Profile, Project Status. The UX must be outcome-first, not profession-directory-first. Instrument the V0 funnel rather than building a full marketplace dashboard.

### D0 Agent discovery surface — TODO alongside V0
Prepare a stable read/discovery-oriented Streamable HTTP `/mcp`, a public `/for-agents` page, and packaging plans for the OpenAI universal Plugin Directory and Gemini CLI Extension distribution. Do not depend on custom embedded UI or consumer Gemini Connected App availability for the MVP.

### M0 Workflow / orchestration model — DESIGN ONLY until V0 signal
Define the minimum representation of Task dependencies, hand-offs, checkpoints, fallback paths, and coordination responsibility. `project_coordination` must be a capability, not an assumed free system function.

### M1 Capability model — TODO after/alongside V0 evidence
Create `packages/protocol/capability.schema.json` and fixtures. Capabilities describe what can be done independent of profession title.

### M2 Credential model — TODO
Create `packages/protocol/credential.schema.json` and fixtures. Credentials represent required authority/qualification separately from capabilities.

### M3 Actor model — TODO
Create `packages/protocol/actor.schema.json` for `human`, `agent`, `hybrid`, and `organization` Actors with capabilities, credentials, availability, constraints, and supported execution modes.

### M4 Task matching semantics — TODO
Extend Task with `required_capabilities`. Implement deterministic hard eligibility checks for capabilities, required credentials, execution mode, jurisdiction/location/deadline constraints. Fail closed on missing mandatory requirements.

### M5 Match engine + MCP discovery — TODO
Produce inspectable Match results and expose model-neutral discovery operations: `publish_task`, `search_tasks`, `get_task`, `find_matches`, `get_actor`, `get_capabilities`, `get_credentials` (exact names may be normalized during implementation).

Acceptance: demonstrate one need decomposed into Tasks where different steps can match Human, AI Agent, Robot, Organization or a composed Party while preserving credential and responsibility requirements. T1–T7 tests must remain green.

## FUTURE ARCHITECTURE — DESIGN / VALIDATION ONLY
Canonical: `docs/architecture/guild-social-composable-work-network.md`
Do not implement these as a broad platform before V0/V1 evidence. Capture observed needs first.

### F0 Identity / accountability model — DESIGN
Separate `owner`, `operator`, `principal`, and `responsible_party`. Human and Organization may be accountable principals; AI Agent and Robot members must belong to an accountable Human/Organization for consequential work.

### F1 Party / Execution Unit — DESIGN
Model a task team as a composition of Human + AI Agent + Robot + Organization + Tools with combined capabilities/credentials and explicit responsibility allocation. Support both existing teams and dynamically composed Parties.

### F2 Trust / bidirectional reputation — DESIGN
Preserve two-way requester/provider reviews. Bind work reputation to verified Tasks/Evidence; keep capability reputation, party reputation, organization reputation and referral reputation separable. Credentials gate eligibility before reputation ranking.

### F3 Guild community layer — DESIGN
Model `Guild`, `Chapter`, `Circle`, `Event`, and `Referral`. Chapters may define configurable membership/referral/profession/governance rules; Circles support non-commercial fellowship; Parties remain task-oriented and temporary.


## P2 — Agent-to-Agent local loop
Status: T6–T7 DONE; T8 PAUSED behind Matching Core

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

### T7 Two test agents — DONE (4f3eaba)
Requester Agent and Provider Agent must complete a fake digital task end-to-end with no manual data copying.

**`4f3eaba`** — `packages/protocol/agents.py` adds `RequesterAgent`,
`ProviderAgent` and a shared `Market` that carries both the published
artifacts and the ordered transition record. Each role holds a T5
delegation permitting exactly its own actions and reaches the five
operations only through `attempt()`, so the frozen gate decides every
write rather than the role code.

The no-manual-copying property is structural: `counter_offer`,
`accept_terms` and `submit_delivery` read their parent from the Market
instead of accepting it as an argument, so an agent cannot name a parent
that did not come from a previous authorized step.

Verified independently — a distinctive amount and note absent from every
fixture propagate through to the recorded transitions; cross-role
attempts, mid-flow expiry, over-budget and wrong-currency requests are
all denied, carry no `data` key, and leave the Market unpoluted
(`bids=0 contracts=0`). `tests/test_end_to_end.py` 23 passed; whole suite
105 passed.

Audit coverage is enough to assert ordering only; T8 remains the formal
audit-trail deliverable.

### T8 Append-only audit trail — PAUSED
Every state transition records actor, principal, action, payload reference, timestamp, and evidence reference.

## Deferred
- Real-money settlement
- Full insurance transactions
- Real-estate title/closing
- DAO/token design
- Production migration until protocol v0.1 is reviewed

## LOCAL MVP — Taiwan services market (2026-10-28)
Status: LOCAL IMPLEMENTED / NOT RELEASED. See MVP_HANDOFF.md.
- [x] Service catalog UI with guest search, merchant publish and TWD prices.
- [x] Inquiry → quote → buyer confirm → one review after completed.
- [x] RLS migration source with immutable provider ID, identity checks and public read-only MCP.
- [x] Build, SDK import and local protocol/unit tests.
- [ ] Execute migration in authorized staging DB and test allow/deny policies using distinct users.
- [ ] Verify UI on phone and complete live two-account business flow.
- [ ] Public ChatGPT/Gemini discoverability: hosting/auth/Registry only after local business transaction proven.
- [ ] Production Git push / deployment / payments require explicit approval.

## Personal-first onboarding gates (2026-10-28)
- [x] Make public service search the first screen; no login required to browse.
- [x] Remove corporate business-name requirement; individual nickname for listing; three core fields.
- [x] Handle email confirmation feedback instead of assumed instant registration.
- [x] Prepare secure signup trigger repair + restricted member UPDATE privilege SQL migration, locally only.
- [ ] Privacy: redact public users email, balances and authentication IDs; preserve legacy Quest display names and owner wallet via separated public/private reads.
- [ ] Apply migrations to staging and test real signup + business flow with two non-production Auth accounts, including denied money edits.
- [ ] Check Google provider is enabled and redirect URLs are correct.
- [ ] Do not grant J1 execution credits or allow live device access as part of low-friction registration.

## UI makeover milestone (2026-10-28)
- [x] New mobile-first light UI, user-centered copy, search, categories and empty state.
- [x] Preserve original quest workflows behind separate lazy navigation.
- [x] Browser smoke test desktop 1440 and mobile 390/320 incl categories and auth gate; build and Python tests.
- [ ] Invite one user to evaluate new independent preview and collect actionable visual feedback.
- [ ] Do not production deploy until privacy/RLS/registration business E2E gates pass.

## MCP launch next gated steps (2026-10-28)
- [x] Apply RLS marketplace & secure signup/privacy to main Supabase.
- [x] Block legacy anonymous/member direct money/escrow RPCs; verify service_role access persists.
- [x] Deploy read-only public guild-discovery MCP and verify JSON-RPC over HTTPS.
- [x] Deploy OAuth-protected guild-mcp-beta and verify 401 challenge/metadata.
- [x] Build SPA /oauth/consent page and protected preview.
- [ ] User-side OAuth Server setting: enable OAuth 2.1, DCR, Authorization Path /oauth/consent.
- [ ] Authorize Vercel team preview/production release and make consent path publicly reachable.
- [ ] Verify live Auth Google/Email, two-account complete trade with real JWTs and MCP client.
- [ ] Apply Plugin creation + private ChatGPT connection; submit public plugin only after reviewer cases.
- [ ] J1 quotas remain out of scope.
