-- Applied to main Supabase as guild_lock_legacy_privileged_rpc on 2026-10-28.
-- Only the existing privileged service_role may invoke older money/escrow RPCs.
-- The legacy public functions trust caller-provided IDs and must not be callable
-- directly by unauthenticated visitors or arbitrary authenticated members.
begin;
do $$
declare item record;
begin
  for item in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and p.proname in
       ('accept_barter_proposal', 'accept_quest', 'cancel_quest_escrow',
        'create_quest_escrow', 'propose_barter', 'purchase_bazaar_item',
        'release_quest_escrow', 'submit_quest_proof')
  loop
    execute format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', item.signature);
    execute format('GRANT EXECUTE ON FUNCTION %s TO service_role', item.signature);
  end loop;
end $$;
commit;
