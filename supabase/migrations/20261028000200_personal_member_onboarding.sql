-- Personal-first signup hardening for existing guild users table.
-- REVIEWED SOURCE ONLY: apply in an authorized staging environment first.
-- The current function uses search_path='' but referenced system_config without schema.
-- Existing grants let authenticated users UPDATE their own balances/reputation.
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_name text;
    v_signup_bonus numeric;
begin
    -- OAuth providers may supply a legal name/email; do not publish either.
    -- Only a separately chosen guild_nickname becomes a public display name.
    v_name := left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data->>'guild_nickname'), ''),
        '冒險者-' || left(new.id::text, 6)
      ),
      80
    );
    select coalesce((value #>> '{}')::numeric, 0)
      into v_signup_bonus
      from public.system_config
     where key = 'new_user_bonus_g_coin';

    insert into public.users
        (id, auth_provider_id, display_name, email, balance_g_coin)
    values
        (new.id, new.id::text, v_name, new.email, coalesce(v_signup_bonus, 0));
    return new;
end;
$$;

-- A trigger function is not a public API; do not grant direct execute.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Supabase's legacy default grants gave anon/authenticated INSERT, DELETE,
-- TRUNCATE, TRIGGER and unrestricted UPDATE. Revoke these at table level.
revoke all on public.users from public, anon, authenticated;
-- Preserve legacy Quest/profile reads for compatibility; privacy column
-- separation is still a release gate (email and wallet remain readable).
grant select on public.users to anon, authenticated;

-- Members can only edit non-authoritative personal profile fields. Existing
-- owner-only RLS (users_update_self) additionally checks auth_provider_id.
grant update (display_name, avatar_url, bio, skill_tags)
    on public.users to authenticated;

commit;
