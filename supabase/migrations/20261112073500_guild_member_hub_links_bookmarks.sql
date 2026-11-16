-- Additive member hub integration: no G-coin minting or existing auth/quest changes.
create table if not exists public.guild_member_showcases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tagline text not null default '' check (char_length(tagline) <= 160),
  github_login text not null default '' check (
    github_login = '' or
    (github_login ~ '^[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]$' and char_length(github_login) <= 39) or
    (github_login ~ '^[A-Za-z0-9]$')
  ),
  forum_username text not null default '' check (
    char_length(forum_username) <= 60
    and forum_username !~ '[<>{}/\\]'
  ),
  featured_repositories text[] not null default '{}'::text[] check (cardinality(featured_repositories) <= 6),
  updated_at timestamptz not null default now()
);
alter table public.guild_member_showcases enable row level security;
drop policy if exists guild_member_showcases_public_read on public.guild_member_showcases;
create policy guild_member_showcases_public_read on public.guild_member_showcases
  for select to anon, authenticated using (true);
drop policy if exists guild_member_showcases_owner_insert on public.guild_member_showcases;
create policy guild_member_showcases_owner_insert on public.guild_member_showcases
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists guild_member_showcases_owner_update on public.guild_member_showcases;
create policy guild_member_showcases_owner_update on public.guild_member_showcases
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists guild_member_showcases_owner_delete on public.guild_member_showcases;
create policy guild_member_showcases_owner_delete on public.guild_member_showcases
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.guild_member_showcases from anon, authenticated;
grant select on public.guild_member_showcases to anon, authenticated;
grant insert, update, delete on public.guild_member_showcases to authenticated;

create table if not exists public.guild_quest_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);
alter table public.guild_quest_bookmarks enable row level security;
drop policy if exists guild_quest_bookmarks_owner on public.guild_quest_bookmarks;
create policy guild_quest_bookmarks_owner on public.guild_quest_bookmarks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.guild_quest_bookmarks from anon, authenticated;
grant select, insert, delete on public.guild_quest_bookmarks to authenticated;

create table if not exists public.guild_need_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid not null references public.guild_needs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, need_id)
);
alter table public.guild_need_bookmarks enable row level security;
drop policy if exists guild_need_bookmarks_owner on public.guild_need_bookmarks;
create policy guild_need_bookmarks_owner on public.guild_need_bookmarks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.guild_need_bookmarks from anon, authenticated;
grant select, insert, delete on public.guild_need_bookmarks to authenticated;

comment on table public.guild_member_showcases is 'User-controlled PUBLIC handles (unverified, never imply account ownership); private wallets never exposed.';
comment on table public.guild_quest_bookmarks is 'Private saved quest IDs. Does not award money or reputation.';
comment on table public.guild_need_bookmarks is 'Private saved matching posts. Does not award money or reputation.';
