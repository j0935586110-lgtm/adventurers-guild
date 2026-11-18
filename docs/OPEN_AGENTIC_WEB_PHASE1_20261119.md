# Open Agentic Web Challenge — Guild task collaboration, Phase 1

Date: 2026-11-19 (Asia/Taipei). Source branch: feat/guild-agentic-web-challenge-20261118.
Status: independent preview prototype; production remains unchanged.

## Official sources verified
- Challenge rules: https://cognizant-agenticweb.devpost.com/rules
- MVP profile 0.2: https://github.com/cognizant-ai-labs/agentic-web/blob/main/docs/worldwide_agentic_web_mvp_spec.md
- Official nsDeploy browser-runtime source: https://github.com/cognizant-ai-labs/agentic-web
- Comparable competitor example: https://github.com/toskaman/continuity-agentic-web
- Supabase Data API RLS & grants: https://supabase.com/docs/guides/api/securing-your-api
- Supabase publishable keys: https://supabase.com/docs/guides/getting-started/api-keys

## Goal and decision
Build a bilingual human + AI task collaboration Guild, not another generic agent marketplace.
Use existing Guild public service/need tables, member-approved posting and NodeBB/MCP.
Do not add a new database, credentials workflow, custom LLM runtime or simulated applicants.

## Phase 1 scope
1. /agentic.html — bilingual traditional Chinese/English UI, local task draft review.
2. Public (anonymous) discovery: /api/agentic-directory, direct published-only Supabase
   REST calls using the shared **publishable** key, ordinary RLS, explicit whitelist fields
   (no owner_id, private contact, raw messages, or service_role).
3. Browser-native nsDeploy tools:
   - search_guild_public_matches: read existing published services and needs
   - search_public_jobs: existing third-party employment search
   - get_guild_capabilities: explicit limitations and links
4. Human handoff: on user-initiated link click, copy task into existing
   sessionStorage key 'guild-need-draft' consumed by GuildNeeds. GuildNeeds still
   requires login, agreement, and a separate Publish action.
5. AI agent registry intentionally empty: do not claim an AI agent is available,
   verified, able to accept a contract, or can complete work unless proven.
6. External peer calls and any account-affecting browser actions stay disabled.

## Independent observations
- GET published guild_needs using public key returned HTTP 200, 0 entries.
- GET published guild_services using public key returned HTTP 200, 0 entries.
- These observations do not distinguish "no public data" from restrictive RLS;
  never assert the whole database is empty.
- Live third-party /api/opportunities earlier returned HTTP 200 with 12 results.
- No real human matches, certified AI providers, completed transactions or
  actual LLM tool invocation have been demonstrated yet.

## Tests & gates
- node --test tests/test_open_agentic_web.mjs tests/test_agentic_directory.mjs
- node ./node_modules/vite/bin/vite.js build
- node ./node_modules/typescript/bin/tsc --noEmit (must compare preexisting baseline)
- BASE_URL=https://EXPLICIT-PREVIEW.vercel.app node tests/e2e_agentic_browser.cjs
- Explicit access checks for manifest, network JSON, JS runtime, public directory API
- Assert production custom domain remains unchanged; no merge/promotion to production
- Live LLM BYOK action receipt and cross-website peer calls remain separate unpassed gates

## Next gates for a credible award submission
- Ask real consenting people to post a service/task and verify results are visible under
  RLS; not seed production with fake actors.
- Verify one real model tool-call/receipt (read-only), and failure/empty responses.
- Add a verified real AI Agent listing only after opt-in identity, scope, consent, and
  reproducible execution are proven.
- Demonstrate: need -> published discovery -> user-controlled posting -> actual candidate
  response -> mutual approval -> evidence-backed work completion.
- Human-narrated under-2-minute English demo, authentic screenshots, Devpost join/submit.

## Commercial guardrails
- Published self-descriptions are not validated professional credentials.
- Do not imply employer affiliation for third-party public job data.
- No escrow/payment or claims of successful task completion until audited.
- Keep browser agent functions read-only until per-user OAuth and RLS checks pass.
