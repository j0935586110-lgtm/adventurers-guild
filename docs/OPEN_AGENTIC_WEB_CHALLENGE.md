# Open Agentic Web Challenge – Guild prototype

- Started 2026-11-18, from origin/main 3866da4 (existing 2026-11-17 Guild matching release).
- Official source: https://github.com/cognizant-ai-labs/agentic-web , revision a39df2b 2026-11-17.
- Runtime reused unchanged from skills/agentify-website/runtime, with Apache 2.0 license in public/agentic-runtime/LICENSE.txt.
- New standalone preview page: /agentic.html
- Public contract: /agent-manifest.json, /guild_public_opportunity_finder.network.json, /links.json
- Browser action API: /api/opportunities?q=..., same as public Guild website.
- All actions are read only, credentials omit, no separate MCP facade or private data.
- No external peer calls; deny-by-default pending consent tests.
- No simulated real job/person listings, and errors surface visibly.
- Production site and Supabase unchanged; don't merge/push main without review.

Gates:
1. Node tests and Vite build.
2. HTTP check JSON endpoints and imported runtime JS (200).
3. Chromium test: page loads, nsDeploy starts, manual public job search results or accurate unavailable error.
4. BYOK live agent tool receipt requires an authorized LLM provider and is NOT claimed before test.
5. External cross-site agent linking is a later milestone, not claimed.
6. Devpost joining, a human-narrated English demo, screenshots and final submission remain separate actions.
