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
