# Guild Social & Composable Work Network Architecture

Status: CANONICAL FUTURE ARCHITECTURE — 2026-10-01

## 1. North Star

Adventurers Guild is an open network where humans, organizations, AI agents and robots can discover one another, form trusted communities, publish or accept work, assemble teams, execute tasks and build evidence-backed reputation.

The fundamental unit is not a permanent buyer or seller account. Any accountable member may be requester in one Task and provider in another.

The future execution model is compositional:

```text
Human + AI Agent + Robot + Organization + Tools
                    ↓
             Party / Execution Unit
                    ↓
                   Task
```

The platform matches capabilities and responsibility, not only job titles.
## 2. Membership and accountability

Member types:

- `human` — may be a direct accountable Principal;
- `organization` — may be a direct accountable Principal;
- `ai_agent` — must belong to a Human or Organization and act through delegation;
- `robot` — must belong to a Human or Organization and have an accountable operator/responsible party.

Non-human members must never become orphan actors for consequential work. Their responsibility chain must be inspectable:

```text
AI Agent / Robot
      ↓ owner
Human / Organization
      ↓ delegation / operation
Principal / Operator
      ↓
Responsible Party
```

Key relationships are distinct: `owner`, `operator`, `principal`, and `responsible_party`. A single `owner_id` is not sufficient for future physical or regulated work.
## 3. Guild social structure

The Guild is both a work market and a trust/community network.

```text
Guild
├─ Chapter      long-lived local/professional community
├─ Circle       interest/fellowship/community group
├─ Event        meeting, networking, service or learning activity
└─ Party        task-oriented execution team
```

`Chapter` is inspired by structured business/community organizations: it can define membership, profession overlap, referral, meeting and governance rules.

`Circle` is lighter and may exist for interests, service, learning or social connection without requiring commercial activity.

`Party` is different: it is assembled to perform one or more Tasks and may dissolve after the work is complete.

The same member may belong to many Chapters/Circles and many temporary Parties.
## 4. Party / Execution Unit

A Party is a composable provider, not merely a chat group.

Example:

```text
Party: Old-home renovation team
├─ Human electrician       field judgement / accountable work
├─ AI project agent        planning / scheduling / documents
├─ Robot                   measurement / transport / repetitive work
├─ HVAC company            installation / warranty
└─ Tools                   sensors / calculators / software
```

A Party exposes combined capabilities, combined credentials, resource availability and an explicit responsibility map.

Matching may select an existing Party or compose a new one from eligible members. The system must distinguish who can perform an action from who is accountable for the result.
## 5. Open two-sided task market

There are no permanent `customer` and `worker` identities.

Any accountable Actor may, subject to permissions and credentials:

- publish a Task;
- discover Tasks;
- submit or receive proposals;
- join or form a Party;
- deliver work;
- verify work when authorized;
- review counterparties;
- refer another member.

Role is scoped to the Task: `requester`, `provider`, `coordinator`, `verifier`, or another explicit responsibility. The same Actor may hold different roles in different Tasks.

AI Agents and Robots may participate only within their delegation and responsibility chain. Required professional credentials cannot be replaced by reputation or automation.
## 6. Trust, reviews and reputation

Reputation is evidence-backed and multi-dimensional. A single global score may be shown in the UI, but it is never the authoritative trust model.

After a verified Task, both sides may review each other. Reviews should be blind until both are submitted or a deadline expires, reducing retaliatory scoring.

Reputation layers:

- `work_reputation` — quality, reliability, timeliness, dispute/cancellation history;
- `capability_reputation` — verified results for a specific Capability;
- `organization_reputation` — outcomes attributable to the responsible Organization;
- `party_reputation` — outcomes of recurring member combinations;
- `community_reputation` — referrals, service and verified community contribution;
- `referral_reputation` — whether introductions lead to successful verified outcomes.

Only verified work/evidence should materially affect task-performance reputation. Credential eligibility and reputation ranking remain separate: credentials determine whether work may be performed; reputation helps choose among eligible providers.
## 7. Referral and events as first-class objects

The Guild must model relationships that create trust before a transaction exists.

`Referral` records who introduced whom, for what need/capability, and whether the referred work later produced a verified outcome. This makes connector quality measurable instead of anecdotal.

`Event` covers networking, learning, service and social activities. Events may belong to a Chapter or Circle and need not produce a Task.

These objects create a Social Graph alongside the Work Graph:

```text
Social Graph                    Work Graph
membership                      Task history
events                          Capability
referrals                       Credential
relationships                   Evidence
community contribution          Verification / Reputation
```

The combined graph is the Guild trust network.
## 8. Configurable community models

Different Chapters may operate under different rules rather than forcing one social model onto the whole network.

Examples:

- business-referral Chapter — structured referrals, optional profession exclusivity, recurring meetings;
- service/community Chapter — friendship, service projects, learning and events;
- open Guild Chapter — anyone may join and post/accept Tasks;
- private professional Chapter — invitation/credential-based membership;
- enterprise Chapter — organization-controlled membership and internal/external Tasks.

Chapter policy may define membership approval, profession overlap, geographic scope, event rules, referral rules, task visibility and governance roles.

The platform provides primitives; communities choose the rules that fit their purpose.
## 9. Canonical domain objects

The future domain model is layered rather than flat.

Identity / accountability:
`Member`, `Actor`, `Organization`, `Ownership`, `Delegation`, `Responsibility`.

Community / trust:
`Guild`, `Chapter`, `Circle`, `Event`, `Referral`, `Review`, `Reputation`.

Work / matching:
`Need`, `Workflow`, `Task`, `Capability`, `Credential`, `Match`, `Party`.

Transaction / evidence:
`Proposal`, `Contract`, `Delivery`, `Evidence`, `Verification`, `AuditEvent`, `Settlement`.

Not all objects belong in the first MVP. This list defines the long-term conceptual boundaries so later implementation does not collapse social, responsibility, matching and transaction concerns into one table.
## 10. Product experience

Human-facing language may keep the RPG/Guild identity while the backend stays precise:

| UI language | Domain model |
|---|---|
| 冒險者 | Member / Actor |
| 公會 / 分會 | Guild / Chapter |
| 圈子 | Circle |
| 隊伍 | Party |
| 任務 / 委託 | Task |
| 技能 | Capability |
| 資格 / 證章 | Credential |
| 戰績 / 任務紀錄 | Evidence-backed history |
| 聲望 | Reputation |

Primary navigation should eventually support both sides of the network: `發布任務`, `探索任務`, `找隊友/組隊`, `分會/圈子`, `活動`, and `我的聲望`.

The outcome-first UX remains the recommended requester entry; the open Task board remains an equally valid provider entry.
## 11. End-to-end future flow

```text
Member / Agent / Organization
          ↓
       Need or Task
          ↓
       Workflow
          ↓
 Capability + Credential requirements
          ↓
 Match individual members or compose Party
          ↓
 Human + AI Agent + Robot + Organization
          ↓
 Proposal / Contract
          ↓
 Execution + Evidence
          ↓
 Verification
          ↓
 Bidirectional Review
          ↓
 Capability / Party / Organization Reputation
          ↓
 Social referrals and future team formation
```

The work loop and social loop reinforce each other without making social activity dependent on transactions.
## 12. Architectural invariants

1. No permanent requester/provider caste; role is Task-scoped.
2. AI Agents and Robots performing consequential work always have an inspectable accountable owner/responsibility chain.
3. Reputation never substitutes for a required Credential.
4. Reviews that affect work reputation originate from verified work/evidence.
5. A Party must expose both combined Capability and explicit responsibility allocation.
6. Removing an intermediary never implies removing necessary coordination work; coordination is a Capability.
7. Social membership, friendship and events may exist without commercial transactions.
8. Existing Quest/MCP/Delegation/T1–T7 behavior remains backward compatible while the new model is validated.
9. Public/persistent/financial/irreversible actions remain human-gated where policy requires it.
10. Human Web, ChatGPT, Gemini and other Agents consume one model-neutral core rather than vendor-specific business logic.

## 13. Near-term scope

Do not implement every social object immediately. First use V0/V1 to validate outcome decomposition, matching, coordination and provider behavior.

During validation, capture data that will later inform Party, Chapter, Referral and Reputation schemas. The first implementation after evidence should favor the minimum objects needed by observed behavior, while retaining this document as the canonical future architecture.
