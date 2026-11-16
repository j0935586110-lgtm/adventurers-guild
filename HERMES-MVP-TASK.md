# Hermes: Adventurers Guild Taiwan Service Marketplace MVP - FRONTEND
Scope ONLY /home/j/projects/guild-mvp-20261028. Read AGENTS.md PROJECT_STATE.md TASKS.md first.
Do NOT push, deploy, access live DB, change other repos or agents, commit money transactions, or create branches.
Only modify src/App.tsx and add src/components/MarketplaceMVP.tsx, optionally add src/lib/marketplace.ts; do not modify SQL or MCP or project plan.
Keep existing Quest and G-Coin flows functional. Add service marketplace tab in existing sidebar.
Guest and signed-in users can search public services by keyword/city; signed-in user can publish service, send inquiry to other merchant, see incoming/outgoing inquiries, quote received inquiries, buyer confirm completed after quote, buyer create one review after completed.
Use Supabase JS with real data, clear loading/error/empty states, responsive mobile, Traditional Chinese, TWD, no mock data or misleading verified badges.
Schema: guild_services(id,owner_id,business_name,title,description,category,city,price_from_twd,status,created_at). guild_inquiries(id,service_id,requester_id,message,status,quote_twd,created_at). guild_reviews(id,inquiry_id,reviewer_id,rating,comment,created_at).
Posting service: owner_id=auth user id, status=published. Inquiry requester_id=auth user id and status=requested. Quoting: status=quoted quote_twd >0. Confirm: status=completed. Reviews only after completed.
Supabase RLS enforced on SQL migration by separate worker; no service_role credentials in UI.
Do not change unrelated files. Run npm run build and npx tsc --noEmit, record actual command results and changed files in HERMES-MVP-RESULT.md; then stop.