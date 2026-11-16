# DSH: Adventurers Guild Taiwan Service Marketplace MVP - SQL SECURITY
Scope ONLY /home/j/projects/guild-mvp-20261028. Read AGENTS.md PROJECT_STATE.md first.
Do NOT push/deploy/apply live DB, use secrets, modify other projects, create branches.
Only create supabase/migrations/20261028000100_marketplace_mvp.sql and tests/test_marketplace_security.py and DSH-MVP-RESULT.md. Do not modify src or MCP.
Tables: guild_services(id uuid PK default gen_random_uuid, owner_id uuid references auth.users, business_name/title/description/category/city bounded required text, price_from_twd nonnegative int optional, status draft|published, created_at).
guild_inquiries(id PK uuid, service_id references guild_services, requester_id auth.users, message text bounded, status requested|quoted|completed, quote_twd positive int nullable, created_at).
guild_reviews(id PK uuid, inquiry_id unique references guild_inquiries, reviewer_id references auth.users, rating 1..5, comment bounded, created_at).
All tables ENABLE ROW LEVEL SECURITY. Only published services readable by anon, owner can read drafts. Service owner alone inserts/updates own services. Only requester/provider can read inquiries; requester can create on published service not owned by requester; provider can quote requested inquiry; requester can confirm quoted inquiry to completed; completed buyer alone reviews once. Public can read confirmed reviews without exposing inquiries private content.
Use auth.uid() and RLS; verify immutable fields of inquiry on update and valid transition via trigger security invoker; stop impersonation, self-review, quote tampering. Explicit GRANT minimum, indexes. Do not put security definer in exposed public.
Tests assert constraints/policies and forbidden updates; try actual local postgres if available without applying to production. State truthful test results in DSH-MVP-RESULT.md.
No real payments, existing Quest tables untouched.