-- Guild MVP: separate service catalog/inquiries/verified-by-buyer reviews.
-- Prepared locally only; legacy Quest/Escrow/G-Coin never modified.
begin;
create table if not exists public.guild_services (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 business_name text not null check(length(btrim(business_name)) between 1 and 140),
 title text not null check(length(btrim(title)) between 1 and 160),
 description text not null check(length(btrim(description)) between 1 and 4000),
 category text not null check(length(btrim(category)) between 1 and 80),
 city text not null check(length(btrim(city)) between 1 and 80),
 price_from_twd int check(price_from_twd is null or price_from_twd >= 0),
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now()
);
create table if not exists public.guild_inquiries (
 id uuid primary key default gen_random_uuid(),
 service_id uuid not null references public.guild_services(id),
 requester_id uuid not null references auth.users(id),
 provider_id uuid not null references auth.users(id),
 message text not null check(length(btrim(message)) between 1 and 2000),
 status text not null default 'requested' check(status in ('requested','quoted','completed')),
 quote_twd int,
 created_at timestamptz not null default now(),
 constraint valid_quote_status check(
   (status='requested' and quote_twd is null) or
   (status in ('quoted','completed') and quote_twd is not null and quote_twd > 0))
);
create table if not exists public.guild_reviews (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null unique references public.guild_inquiries(id),
 service_id uuid not null references public.guild_services(id),
 reviewer_id uuid not null references auth.users(id),
 rating smallint not null check(rating between 1 and 5),
 comment text not null default '' check(length(comment) <= 2000),
 created_at timestamptz not null default now()
);
create index if not exists guild_services_search_idx on public.guild_services(city,category,created_at desc) where status='published';
create index if not exists guild_services_owner_idx on public.guild_services(owner_id);
create index if not exists guild_inquiries_buyer_idx on public.guild_inquiries(requester_id,created_at desc);
create index if not exists guild_inquiries_service_idx on public.guild_inquiries(service_id,created_at desc);
create index if not exists guild_reviews_service_idx on public.guild_reviews(service_id,created_at desc);

create or replace function public.guild_service_guard()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if old.id is distinct from new.id or old.owner_id is distinct from new.owner_id or old.created_at is distinct from new.created_at then
  raise exception 'immutable service identity' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger if exists guild_service_guard_trigger on public.guild_services;
create trigger guild_service_guard_trigger before update on public.guild_services
for each row execute function public.guild_service_guard();

create or replace function public.guild_inquiry_prepare()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 select s.owner_id into new.provider_id from public.guild_services s
 where s.id = new.service_id and s.status = 'published';
 if new.provider_id is null or new.provider_id = (select auth.uid()) then
   raise exception 'service not published or self inquiry' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger if exists guild_inquiry_prepare_trigger on public.guild_inquiries;
create trigger guild_inquiry_prepare_trigger before insert on public.guild_inquiries
for each row execute function public.guild_inquiry_prepare();

create or replace function public.guild_inquiry_guard()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if old.id is distinct from new.id or old.service_id is distinct from new.service_id
 or old.requester_id is distinct from new.requester_id or old.provider_id is distinct from new.provider_id
 or old.message is distinct from new.message
 or old.created_at is distinct from new.created_at then
  raise exception 'immutable inquiry data' using errcode='42501';
 end if;
 if old.status='requested' and new.status='quoted' and old.provider_id=(select auth.uid()) and new.quote_twd > 0 then
   return new;
 end if;
 if old.status='quoted' and new.status='completed' and old.requester_id=(select auth.uid())
 and new.quote_twd is not distinct from old.quote_twd then
   return new;
 end if;
 raise exception 'unauthorized inquiry transition' using errcode='42501';
end $$;
drop trigger if exists guild_inquiry_guard_trigger on public.guild_inquiries;
create trigger guild_inquiry_guard_trigger before update on public.guild_inquiries
for each row execute function public.guild_inquiry_guard();

create or replace function public.guild_review_guard()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare sid uuid; declare provider uuid;
begin
 select i.service_id,i.provider_id into sid,provider from public.guild_inquiries i
 where i.id=new.inquiry_id and i.status='completed' and i.requester_id=(select auth.uid());
 if sid is null or provider=(select auth.uid()) or new.reviewer_id is distinct from (select auth.uid()) then
  raise exception 'review requires confirmed independent buyer' using errcode='42501';
 end if;
 new.service_id := sid;
 return new;
end $$;
drop trigger if exists guild_review_guard_trigger on public.guild_reviews;
create trigger guild_review_guard_trigger before insert on public.guild_reviews
for each row execute function public.guild_review_guard();

alter table public.guild_services enable row level security;
alter table public.guild_inquiries enable row level security;
alter table public.guild_reviews enable row level security;
revoke all on public.guild_services,public.guild_inquiries,public.guild_reviews from public,anon,authenticated;
grant select on public.guild_services to anon,authenticated;
grant insert,update on public.guild_services to authenticated;
grant select,insert,update on public.guild_inquiries to authenticated;
grant select(id,service_id,rating,comment,created_at) on public.guild_reviews to anon;
-- Do not reveal buyer Auth UUIDs to other authenticated users.
grant select(id,inquiry_id,service_id,rating,comment,created_at),insert on public.guild_reviews to authenticated;

drop policy if exists guild_services_read on public.guild_services;
create policy guild_services_read on public.guild_services for select to anon,authenticated
using(status='published' or owner_id=(select auth.uid()));
drop policy if exists guild_services_insert on public.guild_services;
create policy guild_services_insert on public.guild_services for insert to authenticated
with check(owner_id=(select auth.uid()));
drop policy if exists guild_services_update on public.guild_services;
create policy guild_services_update on public.guild_services for update to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

drop policy if exists guild_inquiries_read on public.guild_inquiries;
create policy guild_inquiries_read on public.guild_inquiries for select to authenticated
using(requester_id=(select auth.uid()) or provider_id=(select auth.uid()));
drop policy if exists guild_inquiries_insert on public.guild_inquiries;
create policy guild_inquiries_insert on public.guild_inquiries for insert to authenticated
with check(requester_id=(select auth.uid()) and status='requested' and quote_twd is null
 and provider_id<>(select auth.uid()) and exists(select 1 from public.guild_services s
 where s.id=service_id and s.status='published' and s.owner_id=provider_id));
drop policy if exists guild_inquiries_update on public.guild_inquiries;
create policy guild_inquiries_update on public.guild_inquiries for update to authenticated
using((requester_id=(select auth.uid()) and status='quoted') or
 (provider_id=(select auth.uid()) and status='requested'))
with check((requester_id=(select auth.uid()) and status='completed' and quote_twd is not null and quote_twd>0) or
 (provider_id=(select auth.uid()) and status='quoted' and quote_twd is not null and quote_twd>0));

drop policy if exists guild_reviews_read on public.guild_reviews;
create policy guild_reviews_read on public.guild_reviews for select to anon,authenticated using(true);
drop policy if exists guild_reviews_insert on public.guild_reviews;
create policy guild_reviews_insert on public.guild_reviews for insert to authenticated
with check(reviewer_id=(select auth.uid()) and exists(
 select 1 from public.guild_inquiries i
 where i.id=inquiry_id and i.status='completed' and i.requester_id=(select auth.uid())
 and i.service_id=service_id and i.provider_id<>(select auth.uid())));
commit;
