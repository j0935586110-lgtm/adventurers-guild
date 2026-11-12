-- Private chat after both sides express interest and the request owner accepts.
create table if not exists public.guild_need_chat_blocks (
 reply_id uuid primary key references public.guild_need_replies(id) on delete cascade,
 blocker_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.guild_need_chat_blocks enable row level security;
create policy guild_need_chat_blocks_participants_read on public.guild_need_chat_blocks
for select to authenticated using(exists (
 select 1 from public.guild_need_replies r join public.guild_needs n on n.id=r.need_id
 where r.id=reply_id and (r.sender_id=(select auth.uid()) or n.owner_id=(select auth.uid()))
));
create policy guild_need_chat_blocks_participant_insert on public.guild_need_chat_blocks
for insert to authenticated with check (
 blocker_id=(select auth.uid()) and exists(
  select 1 from public.guild_need_replies r join public.guild_needs n on n.id=r.need_id
  where r.id=reply_id and r.status='accepted'
  and (r.sender_id=(select auth.uid()) or n.owner_id=(select auth.uid()))
 )
);
grant select,insert on public.guild_need_chat_blocks to authenticated;

create table if not exists public.guild_need_messages (
 id uuid primary key default gen_random_uuid(),
 reply_id uuid not null references public.guild_need_replies(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(length(btrim(content)) between 1 and 1500),
 created_at timestamptz not null default now()
);
create index if not exists guild_need_messages_reply_idx on public.guild_need_messages(reply_id,created_at);
alter table public.guild_need_messages enable row level security;
create policy guild_need_messages_participants_read on public.guild_need_messages
for select to authenticated using(exists(
 select 1 from public.guild_need_replies r join public.guild_needs n on n.id=r.need_id
 where r.id=reply_id and r.status='accepted'
 and (r.sender_id=(select auth.uid()) or n.owner_id=(select auth.uid()))
));
create policy guild_need_messages_participants_create on public.guild_need_messages
for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists(
  select 1 from public.guild_need_replies r join public.guild_needs n on n.id=r.need_id
  where r.id=reply_id and r.status='accepted'
  and (r.sender_id=(select auth.uid()) or n.owner_id=(select auth.uid()))
 )
 and not exists(select 1 from public.guild_need_chat_blocks b where b.reply_id=reply_id)
);
grant select,insert on public.guild_need_messages to authenticated;
