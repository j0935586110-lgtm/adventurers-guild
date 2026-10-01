# Quest → Task/Bid/Contract v0.1 compatibility mapping

Status: P1/T4 design only. This document does not change the existing Quest paths, protocol schemas, Supabase database, or MCP tool list.

## Scope and source of truth

The current product has a Supabase `quests`/`users` model, an escrow RPC path, a web API helper for verification, and an MCP server with eight existing tools. The observed Quest lifecycle is:

```text
posted → accepted → submitted → released
                    └──────────→ cancelled (cancellation is allowed from posted/accepted)
```

Protocol v0.1 introduces three distinct objects:

```text
Task (request) → Bid / counter-offer → Contract (immutable agreed terms)
                                      → delivery / verification / settlement
```

The protocol object should be a compatibility projection of existing data at first. It must not require the live Quest UI or the eight existing MCP tools to understand the new objects.

## Current concepts and reusable fields

| Current concept | Existing evidence | v0.1 mapping | Reuse decision |
|---|---|---|---|
| `quests.id` | UUID passed to all Quest MCP operations | `task.task_id`; retain as `legacy_quest_id` in an extension or mapping record | Reuse as stable task identity if it is immutable and globally unique |
| `quests.title` | `post_quest`, search, detail | `task.goal` (and optionally a display title extension) | Reuse; preserve the original title verbatim |
| `quests.description` | `post_quest`; search filters description | `task.requirements`, `constraints`, and/or goal text | Reuse as source text, but do not pretend one free-form string is a complete structured requirement set |
| `quests.category` | Existing enum: `combat`, `gathering`, `daily`, `magic_tech`, `other` | `task.task_type` | Reuse as a legacy task type; add a stable taxonomy later rather than changing the existing enum |
| `quests.reward_g_coin` / MCP `reward` | Existing escrow creation and profile balances | `task.budget.max_amount`; accepted `bid.offer.amount`; `contract.consideration.amount` | Reuse as G-Coin amount only; never infer fiat value or unrestricted convertibility |
| `quests.client_id` | Existing requester foreign key and escrow RPC parameter | Legacy requester principal; eventually `task.requester.principal_id` | Reuse as principal identifier only after identity semantics are documented |
| `quests.adventurer_id` | Existing provider foreign key and accept RPC parameter | Legacy provider; eventually `contract.provider.principal_id` | Reuse for the current single provider path; it is not sufficient to identify an agent separate from its principal |
| `quests.status` | `posted`, `accepted`, `submitted`, `released`, `cancelled` | A compatibility status derived from Task/Bid/Contract/delivery/settlement state | Keep as a read/write legacy projection during migration; do not use it as the only protocol state |
| `created_at` | Returned by search and profile queries | `task`/`bid`/`contract` creation timestamps as available | Reuse for the originating Quest; do not backfill unknown negotiation timestamps |
| `proof_note` / proof submission | `submit_quest_proof` input and RPC | Delivery evidence note; eventually evidence references and hashes | Reuse as legacy evidence text, but add structured evidence before treating delivery as verifiable |
| `users.display_name`, `reputation_points`, `skill_tags`, `bio` | `get_profile` projection | Provider profile/evidence inputs to bids | Reuse as descriptive metadata, not as proof of a credential or authority |
| Existing escrow RPCs | `create_quest_escrow`, `release_quest_escrow`, `cancel_quest_escrow` | Settlement adapter behind Contract lifecycle | Reuse only for the legacy one-shot G-Coin path; no new protocol state may claim settlement until the RPC result is authoritative |

The v0.1 schemas are intentionally stricter than the current model. For example, a protocol party requires both `principal_id` and `agent_id`, while the current Quest rows expose user IDs but no separate agent identity. A Quest can therefore be projected into a Task with an explicit legacy agent placeholder only in a compatibility envelope; it must not be presented as proof that a distinct autonomous agent was authorized.

## Required new fields and migrations

These are design requirements for a later implementation, not changes in this T4 batch.

### Identity and delegation

Add an identity/delegation model that can represent:

- principal identity;
- agent identity and its owner/principal;
- scoped permissions, including allowed actions/categories, maximum amount, approval threshold, expiry, and revocation;
- authenticated actor and the principal on whose behalf the action occurred.

The existing `client_id` and `adventurer_id` should remain as legacy foreign keys while new records carry explicit `principal_id` and `agent_id` pairs. Do not overload a user UUID to mean both.

### Task projection and task data

The Task projection needs at least:

- `task_id`, `task_type`, `goal`, `requester`;
- structured `requirements`, `constraints`, and `deliverables`;
- `budget` with consideration type, amount, and currency/unit;
- deadline and location where applicable;
- required credentials;
- acceptance criteria with verification method and required flag;
- execution mode, approval policy, privacy level;
- source Quest ID, schema version, and projection timestamps.

Existing descriptions can seed the fields, but missing values must be explicit defaults or an unready state. Do not silently invent deadlines, credentials, acceptance criteria, or approval policy.

### Bids and counter-offers

Introduce a bid record or append-only bid event stream containing `bid_id`, `task_id`, provider principal/agent, offer, estimated duration, assumptions, exclusions, evidence, validity, status, parent bid ID, and creation time. A counter-offer is a new bid whose `parent_bid_id` points to the prior bid; updating a bid in place would destroy the negotiation audit trail.

### Contracts

Introduce a contract record containing `contract_id`, task reference/snapshot hash, accepted bid ID, requester/provider parties, consideration, milestones, acceptance criteria, approval requirements, cancellation policy, dispute policy, creation time, and audit references. The accepted terms must be immutable. Any amendment must produce a new version/event with an explicit approval record; it must not mutate the accepted snapshot.

### Delivery, verification, and audit

Add structured delivery/evidence records, verification outcomes, verifier identity, verification timestamp, and dispute references. Add an append-only transition/audit record with actor, principal, action, payload reference or hash, timestamp, and evidence reference. The current proof note is a seed, not a substitute for these records.

### Storage/migration shape

Prefer additive tables or versioned JSON documents linked by legacy Quest ID over a destructive rewrite of `quests`. A later migration should be able to:

1. read every existing Quest without loss;
2. produce a deterministic Task projection;
3. leave legacy columns and RPCs operational;
4. backfill only facts present in the source data;
5. mark incomplete projections as requiring enrichment rather than fabricating protocol values;
6. add unique/idempotency constraints for bids, contracts, transitions, and settlement attempts.

The exact Supabase schema/RPC definitions are not fully version-controlled in this repository, so SQL names, foreign-key behavior, and rollback details require a separate database review before implementation.

## Backward-compatible API strategy

### Legacy surface

Keep existing Quest endpoints and semantics unchanged, including the current `src/lib/api.ts` `verifyQuest(questId, userId)` helper. Existing callers continue to send and receive Quest-shaped data. Existing status values remain valid for the legacy projection.

Add protocol endpoints under a separate versioned namespace, for example `/api/v1/tasks`, `/api/v1/bids`, `/api/v1/contracts`, `/api/v1/deliveries`, and `/api/v1/verifications`. Exact routes are implementation work, but the separation is important: a protocol client must not depend on legacy column names or Quest status strings.

The new API should expose:

- Task projection/read and explicit Task creation for protocol-native callers;
- bid submission and counter-offer creation;
- acceptance that creates one immutable Contract;
- delivery submission with structured evidence;
- verification and settlement status;
- an audit/transition view suitable for reconciliation.

Responses may include `legacy_quest_id`, `task_id`, `contract_id`, and a `compatibility` object so clients can correlate both representations. Use idempotency keys for all mutating protocol operations, and return a stable conflict result when a key is replayed with a different payload.

### MCP surface

Retain all eight existing tools with their current names, required arguments, Quest-shaped behavior, and legacy error compatibility:

`search_quests`, `get_quest_detail`, `accept_quest`, `submit_quest_proof`, `release_quest_escrow`, `cancel_quest`, `get_profile`, `post_quest`.

Do not reinterpret `accept_quest` as bid acceptance. It remains the direct legacy accept path. Add new proposal-oriented tools only as additive tools in a later batch (for example bid, counter-offer, terms acceptance, delivery, and verification operations). New tools should return protocol IDs plus legacy correlation IDs where a Quest exists.

The compatibility adapter should be one-way at first:

```text
legacy Quest → protocol read projection
legacy accept/submit/release → audited compatibility events
protocol-native Task/Bid/Contract → Quest only when the operation has an explicit legacy-compatible representation
```

Avoid dual writes until transaction boundaries and idempotency are proven. If a protocol-native contract cannot be represented safely by one Quest reward, one provider, and the existing escrow RPC, reject the legacy projection instead of truncating terms.

## State-transition mapping

| Current Quest event/status | Protocol interpretation | Compatibility rule |
|---|---|---|
| `post_quest` / `posted` | Task published; no Bid or Contract necessarily exists | Create/read a Task projection. A legacy reward becomes a budget ceiling or fixed legacy offer, not an accepted Contract |
| `accept_quest` / `accepted` | Legacy direct assignment; equivalent to a provider selection and a minimal accepted offer only if terms are explicitly captured | Emit a compatibility event. Do not claim a full v0.1 Contract unless required terms and parties are present |
| `submit_quest_proof` / `submitted` | Delivery submitted; awaiting verification | Store the note as legacy evidence. Structured deliverables/evidence and verifier identity remain pending |
| `verifyQuest` / verification request | Verification attempt/outcome | Preserve the existing API behavior while recording a protocol verification event in a later implementation |
| `release_quest_escrow` / `released` | Verified/accepted delivery followed by settlement | Settlement adapter confirms the authoritative result; contract status must not be inferred from a client-side response alone |
| `cancel_quest` / `cancelled` | Task/contract cancellation, subject to policy and current escrow rules | Record actor, reason, policy basis, and settlement result; do not erase prior bids or deliveries |
| Bid `proposed` → `countered` | Negotiation event chain | Each counter is a new bid linked by `parent_bid_id` |
| Bid `accepted` → Contract created | Agreed terms become immutable | Contract stores accepted bid ID and task snapshot/hash |

The mapping is intentionally lossy in the legacy-to-protocol direction. In particular, `accepted` does not prove negotiation, `submitted` does not prove acceptance, and `released` does not by itself prove that all v0.1 acceptance criteria were evaluated.

## Credential and security concerns

The current MCP process creates a Supabase client with `SUPABASE_SERVICE_KEY`. That credential is a server-side secret and must never be passed to or embedded in an external agent, tool response, prompt, log, or protocol evidence. The MCP boundary should authenticate the calling agent and enforce authorization before accepting caller-supplied IDs.

Specific risks to close before protocol write operations:

- Current tool arguments include raw `client_id`, `adventurer_id`, and `user_id`; treating them as trusted identity allows impersonation unless the server binds them to authenticated credentials and delegation.
- Service-role access bypasses ordinary row-level protections; use a narrow server-side adapter and explicit authorization checks for every mutation.
- Agent authority must be scoped, revocable, time-bounded, and auditable. A principal's approval policy must be checked for accepting terms and releasing value independently.
- Credentials listed in Task/Bid evidence should be references or attestations, not secret tokens. Redact secrets from proof notes, logs, snapshots, and hashes where the underlying content is sensitive.
- Private/unlisted tasks require access control on search, detail, evidence, and audit endpoints; do not treat an obscure ID as privacy.
- G-Coin fields must retain their unit and closed-loop meaning. Never convert G-Coin to fiat, promise withdrawal, or let an LLM invent an exchange rate.
- Replay protection is required for accept, bid, contract, verification, and settlement operations. Use idempotency keys and append-only audit records.
- High-risk categories or regulated work must fail closed when credentials, licensed-human requirements, approval, or dispute responsibility cannot be verified.

## Rollout phases

### Phase 0 — Read-only projection

Build a deterministic Quest-to-Task mapper and validation report. Project existing quests without changing rows, RPCs, MCP tools, or escrow. Classify each projection as complete, incomplete, or unsafe-to-project and expose the legacy Quest ID.

### Phase 1 — Audit compatibility events

Record legacy accept, submit, verify, release, and cancel events with actor/principal context and correlation IDs. Keep the current path authoritative for state and money. Reconcile event records against Quest status and escrow results.

### Phase 2 — Local protocol loop

Add protocol-native bid/counter-offer/contract/delivery/verification operations and run the fake digital-task loop locally. Use non-production/fake consideration first. Require immutable accepted terms and append-only transitions before connecting a legacy Quest projection.

### Phase 3 — Controlled compatibility write path

Allow only the narrow subset representable by the existing Quest model and escrow RPC to create a legacy Quest. Gate by feature flag, require idempotency, and support reconciliation plus rollback of the projection (not reversal of an already-authoritative settlement).

### Phase 4 — Migration and deprecation decision

Measure parity, failed projections, authorization failures, and reconciliation drift. Only after the protocol path is independently verified should the team decide whether any legacy tool behavior can be deprecated. No existing MCP tool is removed by this design.

## Exact acceptance checks for P1/T4

This document is accepted when all checks below pass:

1. `AGENTS.md`, `PROJECT_STATE.md`, `TASKS.md`, `PLAN.md`, `mcp/server.py`, `src/lib/api.ts`, and all three `packages/protocol/*.schema.json` files have been read for this mapping.
2. Every existing Quest field and each of the eight MCP tools has either a documented v0.1 mapping, an explicit legacy-only designation, or a documented missing-data limitation.
3. The document distinguishes reusable data from fields that require new identity, bid, contract, delivery, verification, audit, approval, and idempotency storage.
4. The document specifies that the existing eight MCP tools remain backward compatible and that direct `accept_quest` is not silently redefined as negotiated bid acceptance.
5. The document maps every current lifecycle state/event to a protocol interpretation and calls out lossy mappings.
6. The document addresses service-role secret handling, caller identity, delegation, privacy, evidence, G-Coin constraints, replay protection, and regulated/high-risk work.
7. The rollout has a read-only projection phase, an audit phase, a local protocol-loop phase, a controlled write phase, and a deprecation decision gate.
8. No source code, schema, package file, database, deployment configuration, or existing MCP tool is changed as part of P1/T4.
9. Verification confirms that the only changed path is `docs/architecture/quest-protocol-mapping.md`.

## Open risks and follow-up boundaries

- The actual Supabase DDL and RPC implementations are not present in the requested files; migration SQL and authorization behavior cannot be finalized from this repository snapshot.
- The existing MCP server requires a service-role key and does not show caller authentication, so production agent identity/delegation cannot be assumed safe yet.
- The web API helper shows verification initiation but not the route implementation or response contract; parity with the protocol verification model requires a later API review.
- T4 does not implement T5 delegation, T6 MCP/API extensions, T7 local agents, T8 audit storage, or any production migration.
