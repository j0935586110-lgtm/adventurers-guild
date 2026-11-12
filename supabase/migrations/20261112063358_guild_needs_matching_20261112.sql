-- Guild one-sentence needs: additive tables; never touch legacy quests, wallets or escrow.
create table if not exists public.guild_needs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('cooperation','support','resources','events','jobs','hiring','clubs','friends','sports','dating')),
 title text not null check(length(btrim(title)) between 3 and 140),
 description text not null check(length(btrim(description)) between 6 and 1500),
 city text not null default '線上' check(length(btrim(city)) between 1 and 80),
 status text not null default 'draft' check(status in ('draft','published','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists guild_needs_public_idx on public.guild_needs (kind,city,created_at desc) where status='published';
create index if not exists guild_needs_owner_idx on public.guild_needs (owner_id,created_at desc);

create or replace function public.guild_need_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (
  new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
  or new.created_at is distinct from old.created_at
 ) then raise exception 'immutable need identity' using errcode='42501'; end if;
 if new.status='published' then
  if new.kind='dating' then raise exception 'dating matching requires verified adult identity and consent' using errcode='42501'; end if;
  if (new.title || ' ' || new.description) ~* '([[:alnum:]_.+%-]+@[[:alnum:].-]+\.[[:alpha:]]{2,})|(https?://)|(\+?886[- ]?9[0-9]{8})|([^0-9]09[0-9]{8}[^0-9])' then
   raise exception 'remove personal contact details and external links before publishing' using errcode='23514';
  end if;
 end if;
 if tg_op='UPDATE' then new.updated_at=now(); end if;
 return new;
end $$;
drop trigger if exists guild_need_guard_trigger on public.guild_needs;
create trigger guild_need_guard_trigger before insert or update on public.guild_needs
for each row execute function public.guild_need_guard();

alter table public.guild_needs enable row level security;
create policy guild_need_public_list on public.guild_needs
for select to anon,authenticated using(status='published');
create policy guild_need_owner_read on public.guild_needs
for select to authenticated using(owner_id=(select auth.uid()));
create policy guild_need_owner_create on public.guild_needs
for insert to authenticated with check(owner_id=(select auth.uid()) and status='draft');
create policy guild_need_owner_update on public.guild_needs
for update to authenticated using(owner_id=(select auth.uid()))
with check(owner_id=(select auth.uid()));
create policy guild_need_owner_delete on public.guild_needs
for delete to authenticated using(owner_id=(select auth.uid()));
grant select on public.guild_needs to anon, authenticated;
grant insert,update,delete on public.guild_needs to authenticated;

create table if not exists public.guild_need_replies (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.guild_needs(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(length(btrim(message)) between 6 and 1200),
 status text not null default 'sent' check(status in ('sent','accepted','declined')),
 created_at timestamptz not null default now(),
 unique(need_id,sender_id)
);
create index if not exists guild_need_replies_need_idx on public.guild_need_replies(need_id,created_at desc);
create index if not exists guild_need_replies_sender_idx on public.guild_need_replies(sender_id,created_at desc);
alter table public.guild_need_replies enable row level security;
create policy guild_need_replies_participants_read on public.guild_need_replies
for select to authenticated using(
 sender_id=(select auth.uid()) or exists(
   select 1 from public.guild_needs n where n.id=need_id and n.owner_id=(select auth.uid())
 ));
create policy guild_need_replies_sender_create on public.guild_need_replies
for insert to authenticated with check(
 sender_id=(select auth.uid()) and status='sent' and exists(
   select 1 from public.guild_needs n
   where n.id=need_id and n.status='published' and n.owner_id<>(select auth.uid())
 ));
create policy guild_need_replies_owner_update on public.guild_need_replies
for update to authenticated using(exists(
 select 1 from public.guild_needs n where n.id=need_id and n.owner_id=(select auth.uid())
)) with check(exists(
 select 1 from public.guild_needs n where n.id=need_id and n.owner_id=(select auth.uid())
));
create or replace function public.guild_need_reply_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (
 new.id is distinct from old.id or new.need_id is distinct from old.need_id
 or new.sender_id is distinct from old.sender_id or new.message is distinct from old.message
 or new.created_at is distinct from old.created_at
 or old.status <> 'sent' or new.status not in ('accepted','declined')
 ) then raise exception 'invalid reply transition' using errcode='42501'; end if;
 return new;
end $$;
create trigger guild_need_reply_guard_trigger before update on public.guild_need_replies
for each row execute function public.guild_need_reply_guard();
grant select,insert,update on public.guild_need_replies to authenticated;

create table if not exists public.guild_need_reports (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.guild_needs(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(length(btrim(reason)) between 5 and 300),
 created_at timestamptz not null default now(),
 unique(need_id,reporter_id)
);
alter table public.guild_need_reports enable row level security;
create policy guild_need_report_create on public.guild_need_reports
for insert to authenticated with check(reporter_id=(select auth.uid()));
grant insert on public.guild_need_reports to authenticated;
