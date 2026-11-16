-- Disposable PostgreSQL simulation of Supabase Auth/RLS; never run on live DB.
create role authenticated noinherit;
create role anon noinherit;
grant usage on schema public to authenticated,anon;
create schema auth;
grant usage on schema auth to authenticated,anon;
create table auth.users (
 id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable
as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.system_config (key text primary key,value jsonb not null);
insert into public.system_config values ('new_user_bonus_g_coin','0'::jsonb);
create table public.users(
 id uuid primary key references auth.users(id),
 auth_provider_id text, display_name varchar(120) not null,
 email text, avatar_url text, bio text default '',
 balance_g_coin numeric not null default 0, frozen_g_coin numeric not null default 0,
 reputation_points int not null default 0, skill_tags text[] not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.users enable row level security;
create policy users_select_public on public.users for select to public using(true);
create policy users_update_self on public.users for update to public using((auth.uid())::text=auth_provider_id);
grant all on public.users to anon,authenticated;
create function public.handle_new_user() returns trigger language plpgsql security definer
as $$ begin insert into public.users(id,auth_provider_id,display_name,email) values (new.id,new.id::text,'legacy',new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
