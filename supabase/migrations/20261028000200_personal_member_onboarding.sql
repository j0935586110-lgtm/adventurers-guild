-- Personal-first signup hardening for existing guild users table.
-- Applied to the main Supabase project on 2026-10-28 after isolated PostgreSQL tests.
-- The current function uses search_path='' but referenced system_config without schema.
-- Prior grants let authenticated users UPDATE balances and reputation; now restricted.
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
-- Public directory and original Quest roster need display names and
-- reputation; they must never read email or financial balances.
grant select (id, display_name, avatar_url, bio, skill_tags,
  reputation_points, created_at) on public.users to anon, authenticated;

-- Existing users_update_self policy had no explicit WITH CHECK.
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Member changes are restricted to non-authoritative profile columns.
grant update (display_name, avatar_url, bio, skill_tags)
    on public.users to authenticated;

-- Narrow and read-only: the caller can fetch ONLY their own wallet.
create or replace function public.guild_my_wallet()
returns table(balance_g_coin numeric, frozen_g_coin numeric)
language sql stable security definer set search_path = ''
as $$
  select u.balance_g_coin, u.frozen_g_coin
    from public.users u where u.id = (select auth.uid());
$$;
revoke all on function public.guild_my_wallet() from public, anon, authenticated;
grant execute on function public.guild_my_wallet() to authenticated;

commit;
