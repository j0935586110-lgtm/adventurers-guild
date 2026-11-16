# Adventurers Guild — Taiwan service marketplace MVP (local checkpoint)

Date: 2026-10-28. Worktree: /home/j/projects/guild-mvp-20261028 (detached, from cc9b8d5).
Status: LOCAL MVP IMPLEMENTED, PRODUCTION NOT DEPLOYED. No public listing or money actions.

## Vertical MVP
- Buyers/guests search Taiwan service offerings (city, keyword).
- Authenticated providers publish services, view inbound requests, issue one quote.
- Authenticated buyers send requests, confirm quoted work, leave a single rating/comment (comment optional).
- Database guards bind inquiry requester/provider to auth identities, maintain immutable evidence, and prevent self reviews.
- Public service cards show buyer-confirmed ratings only when real review rows exist; no fake reviews.
- Existing Quest/G-Coin tables and 8 Quest MCP tools remain untouched.

## Implementation
- src/App.tsx and src/components/MarketplaceMVP.tsx, src/lib/marketplace.ts
- supabase/migrations/20261028000100_marketplace_mvp.sql (three RLS-protected tables)
- mcp/marketplace_core.py + marketplace_public.py: three read-only MCP discovery tools, no privileged key
- mcp/README.md: public vs legacy admin MCP separation
- tests/test_marketplace_public.py: deterministic pure discovery tests

## Verified in isolated working copy
- npm run build => exit 0 (pre-existing CSS and bundle-size warnings)
- venv with mcp / supabase / pytest installed in /tmp/guild-mcp-test-venv
- python -m pytest -q tests/test_marketplace_public.py tests/test_protocol_tools.py tests/test_end_to_end.py => 46 passed
- importing marketplace_public via SDK => 3 MCP tools present
- Hermes: 28 Supabase JS request-shape assertions passed using local fake endpoint
- DSH read-only schema assessment surfaced nullable-CHECK caveat; SQL now explicitly tests quote_twd IS NOT NULL
- agy found optional-comment mismatch, provider unpublish→review denial and MCP scan-truncation bug; fixes included in current files
- No real signed-in DB E2E, no executed SQL migration, no deployed preview.
- Existing full npx tsc --noEmit baseline fails on obsolete Firebase files and missing @types/react. Hermes targeted probe passes.

## Next release gate (requires explicit approval)
1. Apply migration to controlled staging DB, not live production by default.
2. In staging, create provider and buyer auth accounts; verify 5 transitions and negative paths: cross-owner mutations denied, self-inquiry/review rejected, vendor unpublish does not prevent buyer review.
3. Confirm responsive UI on real browser and live Supabase RLS; test new public MCP SDK against staging.
4. Obtain explicit approval for Git push / Vercel deployment / public Plugin or MCP registry publication.
5. No real payment or open escrow in this MVP.

## Safety
Merchant profiles are self-declared, not company-verified. A review is only marked as buyer-confirmed after a quoted inquiry is marked complete by its requester, not as independent proof of paid delivery. Do not claim broad external AI discovery until the MCP server is hosted and connected/listed.

## Personal-first simplification checkpoint (2026-10-28)
- Public service market is the first page; visitors browse without authentication.
- Register as an individual with Google OAuth (provider configuration still unverified) or email/password. Nickname optional on email registration (blank generates a neutral alias rather than exposing email); explicit email-confirmation feedback when signup creates no session.
- Listings automatically use the signed-in member's display name; mandatory fields: title, description, service area. Optional category and TWD price moved to collapsed advanced settings. No corporate ID or identity document required.
- New local SQL migration 20261028000200_personal_member_onboarding.sql fixes unqualified system_config in the SECURITY DEFINER signup trigger (search_path='') and removes dangerous default table privileges; authenticated member profile updates limited to harmless fields.
- This migration has NOT been applied to live Supabase. Existing public.users SELECT permissions still expose email/wallet columns under current open read policy: **privacy blocker before opening signup to strangers**. Existing Quest joins and private wallet reads need a safe separation.
- Current local test run: 51 Python tests passed; SQL migration parsed successfully with pglast; npm run build exits 0; full npx tsc --noEmit still fails on pre-existing Firebase and React typings.
- Not implemented: real user/Agent registration, sign-in incentive credits, J1 paid/free quota, corporate verification, public MCP OAuth, production deployment. None should be claimed live.

### This checkpoint verification note
- 2026-10-28 personal onboarding changes: npm run build PASS; 51 existing and new Python tests PASS; PostgreSQL DDL parses with pglast.
- An agy read-only security audit was attempted but its headless CLI refused a required command permission; **no independent final security pass is claimed** for this new signup migration. Dangerous permission bypass was not enabled.
- Live Supabase project stays unchanged; project has no Auth users yet. No real registration, Google OAuth, J1 quota, or two-account end-to-end test has run.
- Public users table currently grants broad SELECT on email/balances due legacy Quest compatibility. Privacy-safe public profile and private account balances must be separated before open signup.

## UI visual redesign checkpoint — 2026-10-28
- Replaced dark fantasy home with light jade-and-coral editorial personal skills marketplace. Purpose: search, free listing, simple inquiry. CSS-only original graphics, no invented merchants/reviews.
- New src/components/GuildHome.tsx and guild-home.css; App.tsx now uses GuildHome; prior Quest/G-Coin UI preserved in lazy-loaded src/LegacyGuild.tsx.
- Updated index.css and index.html favicon/SEO, new public/guild-mark.svg and DESIGN.md. No data layer, RLS, money or J1 permissions changed.
- Build PASS, 51 Python tests PASS (updated contract to match new UI), browser PASS at 1440/390/320 (no overflow, no page exceptions); category filtering, guest login gate, auth switch/close, mobile menu PASS.
- Current Supabase tables guild_services/guild_inquiries/guild_reviews are absent; UI correctly shows friendly '服務市場正在準備中', not fake service cards or successful real transactions. Google Auth and merchant/buyer E2E not verified. This is VISUAL PREVIEW ONLY.
- Full npx tsc --noEmit remains blocked by baseline missing React JSX types and old Firebase references; no unique new semantic errors found. Deployment preview only; production and GitHub main unchanged.

### 2026-10-28 executed backend and MCP checkpoint
Old 'not applied' release-gate lines above are now superseded: Supabase guild_services/guild_inquiries/guild_reviews and secure signup/column permissions have been applied and inspected on the main project. Legacy RPCs revoked from anonymous/member and retained for service_role. Two remote MCP Edge functions deployed: guild-discovery (public, 3 read-only tools, verified 200) and guild-mcp-beta (authenticated, verified 401 without user token). OAuth Server dashboard currently returns 404 feature_disabled and needs activation; therefore private ChatGPT login/publish end-to-end **NOT COMPLETE**. New consent UI exists only in a protected Vercel preview, not production. 0 actual Auth users at last check.
