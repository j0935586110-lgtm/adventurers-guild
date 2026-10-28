# PROJECT_STATE.md

Updated: 2026-10-01
Status: ACTIVE — evolving Adventurers Guild into Agent Work Network

## North Star
An open social + work network where Humans and Organizations are accountable principals, AI Agents and Robots participate through explicit ownership/delegation, and members can publish work, accept work, form long-lived communities or temporary Parties, and accumulate evidence-backed trust. Work is matched by capability, credential and responsibility rather than permanent buyer/seller roles or job titles.

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
1. Identity / Ownership / Responsibility: Human and Organization principals; owned/delegated AI Agents and Robots
2. Social layer: Guild / Chapter / Circle / Event / Referral
3. Need → Workflow / Task Graph
4. Capability + Credential requirements
5. Actor discovery, eligibility and Match
6. Party / Execution Unit composition: Human + AI Agent + Robot + Organization + Tools
7. Bid / Negotiation / Contract (existing foundation; not current priority)
8. Delivery / Evidence / Verification / bidirectional Review / Reputation
9. Audit and settlement adapters (deferred until value proof)

Canonical future architecture: `docs/architecture/guild-social-composable-work-network.md`.
Canonical matching architecture: `docs/architecture/task-matching-professional-decoupling.md`.
Canonical UX/discovery architecture: `docs/architecture/user-experience-agent-discovery.md`.

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
- AI Agents and Robots doing consequential work must have an inspectable owner/operator/principal/responsible-party chain.
- High-risk regulated verticals route to licensed/responsible humans or entities; reputation never substitutes for required credentials.

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

## Local build checkpoint — 2026-10-28 (not deployed)
- Taiwan merchant services, inquiries, buyer-confirmed transaction reviews implemented in isolated worktree guild-mvp-20261028 (no new Git branch).
- Existing Quest/G-Coin untouched; public read-only MCP separated from admin service-role server.
- Supabase wrwsjlydozfzejixofwm resumed to ACTIVE_HEALTHY; production schema unchanged (migration not applied).
- npm run build EXIT=0; 46 Python tests PASS in isolated venv; Hermes 28 Supabase client request-shape checks PASS.
- agy review found three blockers: optional comments, unpublish blocking review, truncated MCP scan; local fixes applied; re-audit pending at this checkpoint.
- DSH backend generation failed to land; its security review identified NULL-in-CHECK risk, now corrected. No real DB/RLS E2E yet.
- Release gate: staging SQL apply/negative RLS tests, two-account end-to-end, owner approval for push/deploy.

## Personal-first MVP adjustment — 2026-10-28
- First public users are individuals, not registered companies; anonymous browsing free and direct; optional nickname/email or Google sign-in; no mandatory real-name documents.
- Personal service listing simplified to title, description, city; display name derived from Guild/Auth profile; category/price optional.
- Hardened signup function and removed dangerous users-table privileges in a **local-only migration**. Not yet applied or tested in live Supabase.
- 51 local Python tests pass, build passes. Release gate: identity/public-profile privacy split; verified Supabase Auth with two users; provider/buyer transaction test; explicit approval before production deploy.
- J1 no free remote execution credits upon signup; only separate sandbox policy planned after marketplace proves demand.

## Visual redesign 2026-10-28
- Light jade/coral responsive design, new public marketplace landing and modals, mobile navigation. Legacy Quest board lazy preserved.
- Browser verified desktop/tablet/mobile, 51 Python tests and Vite build PASS. Real DB Auth transactions not run. Preview only; no production promotion.

## M0–M2 actual execution checkpoint — 2026-10-28 (source of truth: MCP_RELEASE_GATES.md)
- Main Supabase RLS and personal signup privacy migrations NOW APPLIED (previous 'not applied' statements above are superseded); 3 guild_* marketplace tables exist.
- Emergency lock-down: 8 old SECURITY DEFINER G-Coin/escrow RPCs revoked from anon/authenticated; service_role kept working, grants read back.
- Live anonymous /rest/v1 test: services HTTP 200 empty, users.email HTTP 401 denied, safe public user name HTTP 200.
- Disposable local PostgreSQL simulation passed 2-user inquiry/quote/confirm/review and unauthorized action negatives; no real Google/Email Auth users were created.
- Supabase Edge guild-discovery remote MCP ACTIVE; live initialize/tools/list/search_services 200, 3 read-only tools.
- Supabase Edge guild-mcp-beta remote MCP ACTIVE; OAuth-middleware-protected, unauthenticated initialize 401 with metadata.
- OAuth 2.1 server remains DISABLED (metadata GET 404 feature_disabled). Consent UI implemented but requires public website release and OAuth Server dashboard action. No public plugin submitted.
- Latest independent Vercel preview: https://adventurers-guild-7ntphz63e-johnfu.vercel.app/ READY but deployment protection applies; main production domain unchanged.

- 2026-10-28 final check: independent Vercel protected preview share works; root and /oauth/consent 200 via authenticated share cookie; Google/Email OAuth still not exercised; main production website unchanged.

## Current v2 OAuth public site 2026-10-28
- `https://adventurers-guild-v2.vercel.app` is deployed, public, with working `/oauth/consent` route.
- Supabase global Site URL set to v2; 3 redirect allowlist entries confirmed, old site preserved.
- Real OAuth manually registered client PKCE request returns 302 with authorization_id to correct v2 consent path.
- Google provider DISABLED, Email ENABLED; DCR OFF; actual logged-in consent/token exchange NOT TESTED (no Auth users).
- See MCP_RELEASE_GATES.md for detailed audit and rollback.
