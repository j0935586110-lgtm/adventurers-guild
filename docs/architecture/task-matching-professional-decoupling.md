# Task Matching & Professional Decoupling Architecture

Status: ACTIVE PRODUCT DIRECTION — 2026-10-01

## 1. Product focus

Adventurers Guild is currently focused on three things:

1. task matching;
2. removing unnecessary intermediaries;
3. professional decoupling.

The system should not begin from a profession label such as "realtor", "insurance salesperson", or "lawyer". It begins from a user need, decomposes that need into executable tasks, then matches each task to the human, AI agent, hybrid team, or licensed professional that actually has the required capability and authority.

Core statement:

> Break professions into capabilities, break needs into tasks, then match people and agents directly.

Transaction automation remains useful infrastructure, but it is not the current product priority.
## 2. Core primitives

The matching core has five primary objects:

### Task
A concrete unit of work derived from a need. It describes goal, requirements, constraints, deliverables, location/deadline, execution mode, required capabilities, and required credentials.

### Capability
A normalized statement of what an Actor can do, independent of job title. Examples: `contract_review`, `price_analysis`, `property_search`, `excel_automation`, `document_translation`.

### Credential
Evidence that an Actor is permitted or qualified to perform work where authority matters. Examples: professional licence, organization certification, verified tool access, jurisdiction-specific authorization.

### Actor
A provider that can perform work. Actor types are `human`, `agent`, `hybrid`, or `organization`. Actors expose capabilities, credentials, availability, constraints, and supported execution modes.

### Match
A computed relationship between Task and Actor. A Match is not a contract. It records why the Actor is eligible, which requirements were satisfied, which were not, and the score/rank used for discovery.
## 3. Matching flow

```text
Need
  ↓
Task decomposition
  ↓
required_capabilities
+ required_credentials
+ hard constraints
  ↓
Actor discovery
  ↓
Eligibility filter
  ↓
Match scoring
  ↓
Ranked matches
```

Hard constraints are fail-closed. Missing a required credential, required execution mode, jurisdiction rule, deadline, location, or other mandatory condition makes an Actor ineligible rather than merely lowering its score.

Soft factors may affect ranking: evidence quality, prior verified completions, availability, price range, response time, and requester preferences.

Matching logic must keep eligibility separate from ranking. An ineligible Actor must never become eligible because of a high relevance score.
## 4. Professional decoupling

A profession is treated as a bundle of capabilities, credentials, responsibilities, and regulated actions rather than as the atomic unit of supply.

Example — property purchase:

```text
property_search        → Agent / Human
price_analysis         → Agent / deterministic tool
viewing_coordination   → Agent / Human
property_inspection    → qualified inspector
contract_review        → legal capability
legal_advice           → licensed lawyer where required
title_registration     → authorized professional where required
```

Example — insurance:

```text
needs_analysis         → Agent / Human
product_search         → Agent
terms_comparison       → Agent + authoritative data
premium_calculation    → deterministic calculation tool
eligibility_check      → rules engine
regulated solicitation → licensed/responsible human where required
```

The platform therefore routes responsibility to the smallest necessary professional node instead of forcing the entire workflow through one occupational intermediary.
## 5. Architecture priority

Current product path:

```text
Need
→ Task
→ Capability / Credential requirements
→ Actor discovery
→ Match
──────── matching boundary ────────
→ Bid / Negotiation
→ Contract
→ Delivery / Verification
→ Settlement
```

T5 Delegation, T6 proposal MCP tools, and T7 two-agent E2E remain valid infrastructure and must be preserved. They prove that matched parties can later negotiate and execute safely.

However, new engineering effort should stop expanding the transaction layer until the matching core is proven.

T8 append-only audit remains required infrastructure, but is paused behind the matching-core milestone unless an audit requirement blocks matching work.
## 6. Target MCP/API surface for matching

Current priority tools are discovery-oriented rather than transaction-oriented:

```text
publish_task
search_tasks
get_task
find_matches
get_actor
get_capabilities
get_credentials
```

Existing Quest tools and T6 proposal tools remain backward compatible. They are not removed or silently redefined.

A future adapter may expose the same matching semantics to ChatGPT, Gemini, Hermes, Codex, OpenClaw, or other MCP/A2A-capable agents. The platform must remain model-neutral.

## 7. Next implementation artifacts

1. `capability.schema.json`
2. `credential.schema.json`
3. `actor.schema.json`
4. Task schema extension for `required_capabilities`
5. deterministic eligibility filter
6. deterministic/inspectable matching score
7. fixtures covering human, agent, hybrid, licensed-only, and ineligible matches

No real-money integration, j1 worker execution, new escrow design, or automatic contract acceptance is part of this milestone.
## 8. Acceptance criteria for the matching milestone

The milestone is complete when:

- a need can be represented as one or more Tasks;
- each Task can declare required capabilities and credentials separately;
- Actors can advertise capabilities and credentials without relying on a profession label;
- hard credential/constraint failures are rejected deterministically;
- eligible Actors receive an inspectable Match result explaining why they matched;
- the same Task can match a human, an Agent, or a hybrid provider when requirements allow it;
- regulated actions can require a credential without forcing unrelated steps through that professional;
- at least one end-to-end example demonstrates professional decoupling;
- matching is exposed through a model-neutral MCP/API surface;
- T1–T7 compatibility remains green.

## 9. Deferred after matching proof

- further Bid/Negotiation sophistication;
- production Contract persistence;
- settlement/payment expansion;
- j1 Worker integration into Guild jobs;
- reputation economics;
- DAO/token design;
- regulated production transactions.

The next product proof is not "two Agents can transact". T7 already demonstrated that infrastructure. The next proof is: **a real need can be decomposed and directly matched to the smallest set of capable and properly credentialed Actors.**