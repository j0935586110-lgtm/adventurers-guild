\set ON_ERROR_STOP on
-- Run after guild_local_e2e.sql on isolated disposable PG.
set role authenticated;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',false);
do $$begin
 begin
   update public.guild_services set title='亂改' where id='c0000000-0000-4000-8000-000000000003';
   if found then raise exception 'WRONG_OWNER_UPDATE_SUCCEEDED';end if;
 exception when insufficient_privilege then null;end;
end $$;
-- A provider cannot buy their own service.
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
do $$ begin
 begin
  insert into public.guild_inquiries(service_id,requester_id,message) values
  ('c0000000-0000-4000-8000-000000000003',auth.uid(),'self');
  raise exception 'SELF_INQUIRY_ALLOWED';
 exception when insufficient_privilege then null;end;
end $$;
-- Buyer creates a second inquiry while service is public.
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',false);
insert into public.guild_inquiries(id,service_id,requester_id,message)
values('e0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000003',auth.uid(),'第二次需求');
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
update public.guild_inquiries set status='quoted',quote_twd=1500 where id='e0000000-0000-4000-8000-000000000005';
-- Merchant unpublishes during existing deal.
update public.guild_services set status='draft' where id='c0000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',false);
update public.guild_inquiries set status='completed' where id='e0000000-0000-4000-8000-000000000005';
-- The trigger derives service_id from the completed inquiry even if null was sent.
insert into public.guild_reviews(inquiry_id,service_id,reviewer_id,rating,comment)
values('e0000000-0000-4000-8000-000000000005',null,auth.uid(),4,'');
reset role;
do $$begin
 if (select count(*) from public.guild_reviews) <> 2 then raise exception 'REVIEW_COUNT_MISMATCH';end if;
 if (select service_id from public.guild_reviews where inquiry_id='e0000000-0000-4000-8000-000000000005')
 <> 'c0000000-0000-4000-8000-000000000003' then raise exception 'DERIVED_SERVICE_ID_MISMATCH';end if;
 raise notice 'M0_NEGATIVE_PASS: immutable ownership, no self inquiry, historical unpublish, null-derived review';
end $$;
