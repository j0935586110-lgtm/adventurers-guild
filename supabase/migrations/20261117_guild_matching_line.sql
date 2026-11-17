-- Adventurers Guild: optional LINE exchange after mutual need match.
-- Owners can store their own LINE ID; nobody can SELECT another member's contact directly.
create table if not exists public.guild_line_contacts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  line_id text not null check (line_id ~ '^@?[A-Za-z0-9._-]{3,39}$'),
  share_after_match boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.guild_line_contacts enable row level security;
revoke all on public.guild_line_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.guild_line_contacts to authenticated;
create policy guild_line_contacts_owner_select on public.guild_line_contacts
  for select to authenticated using (owner_id = (select auth.uid()));
create policy guild_line_contacts_owner_insert on public.guild_line_contacts
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy guild_line_contacts_owner_update on public.guild_line_contacts
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy guild_line_contacts_owner_delete on public.guild_line_contacts
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Accepted participants may only retrieve the OTHER member's voluntary LINE.
-- No LINE data is published through the public profile or search APIs.
create or replace function public.guild_match_line(p_reply_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select c.line_id
  from public.guild_need_replies r
  join public.guild_needs n on n.id = r.need_id
  join public.guild_line_contacts c
    on c.owner_id = case when r.sender_id = (select auth.uid()) then n.owner_id else r.sender_id end
  where r.id = p_reply_id
    and r.status = 'accepted'
    and (select auth.uid()) is not null
    and (r.sender_id = (select auth.uid()) or n.owner_id = (select auth.uid()))
    and c.share_after_match = true
    and not exists(select 1 from public.guild_need_chat_blocks b where b.reply_id = r.id)
  limit 1
$$;
revoke all on function public.guild_match_line(uuid) from public, anon;
grant execute on function public.guild_match_line(uuid) to authenticated;

-- Repair a known bug: b.reply_id=b.reply_id matched ANY blocked conversation.
-- Verify the block belongs to THIS conversation, not an unrelated reply.
alter policy guild_need_messages_participants_create on public.guild_need_messages
with check (
  sender_id = (select auth.uid())
  and exists(
    select 1 from public.guild_need_replies r
    join public.guild_needs n on n.id = r.need_id
    where r.id = guild_need_messages.reply_id
      and r.status = 'accepted'
      and (r.sender_id = (select auth.uid()) or n.owner_id = (select auth.uid()))
  )
  and not exists(
    select 1 from public.guild_need_chat_blocks b
    where b.reply_id = guild_need_messages.reply_id
  )
);