# AGENTS.md — Adventurers Guild / Agent Work Network

## Mission
Build an open Agent-to-Agent work and transaction network where requester agents and provider agents can discover, negotiate, execute, verify, and settle tasks under explicit human authority.

Human = Principal. Agent = Representative. Platform = Market Infrastructure.

## Canonical sources
1. Product/architecture master plan (Google Doc):
   https://docs.google.com/document/d/10Fq0RAus7bjhDGAt4vrL3kRNegofkcBC0ENJJgEGYNw/edit
2. Current machine-readable project state: `PROJECT_STATE.md`
3. Active engineering queue: `TASKS.md`
4. Long-term historical plan: `PLAN.md`

When sources disagree, use the Google Doc for product direction and `PROJECT_STATE.md` for current engineering state.

## Roles
### Hermes — coordinator
- Own durable goal and project state.
- Choose the smallest verifiable next batch.
- Delegate implementation to Codex when useful.
- Re-run tests independently before marking work done.
- Update `PROJECT_STATE.md` and `TASKS.md` after every accepted batch.

### Codex — implementation agent
- Read `AGENTS.md`, `PROJECT_STATE.md`, and the assigned task before editing.
- Prefer minimal, testable changes.
- Produce tests, actual command output, and a concise diff summary.
- Stop at the requested boundary; do not broaden scope silently.

### Independent reviewer (agy or another agent)
- Review spec before risky work and diff after implementation.
- Do not act as implementer and final approver for the same high-risk batch.

## Human-action gate
Without explicit human approval, agents MUST NOT:
- push or force-push Git commits;
- open/edit/comment on public PRs or issues;
- publish to MCP Registry or other public registries;
- deploy production changes;
- spend real money, release real escrow, or sign irreversible agreements.

Local edits, local tests, local commits, and drafts are allowed unless a task says otherwise. Default is no public side effect.

## Engineering principles
- Protocol first; UI second.
- Agent-native APIs; do not force agents through human UI flows.
- Evidence over claims.
- High-risk decisions fail closed.
- Deterministic services own money, rules, permissions, and state transitions.
- LLMs may interpret language and negotiate, but may not invent authoritative values.
- Every irreversible action needs scoped delegation and an audit trail.

## Batch completion contract
A batch is complete only when it includes:
- exact task/scope;
- changed-file list;
- tests or verification commands with real output;
- unresolved risks/TODOs;
- updated project state;
- no unapproved public action.
