-- End-to-end two-identity transaction and negative authorization tests.
\set ON_ERROR_STOP on
insert into auth.users(id,email,raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','merchant@example.test','{"guild_nickname":"賣家甲"}'),
 ('b0000000-0000-4000-8000-000000000002','buyer@example.test','{"guild_nickname":"買家乙"}');
do $$begin
 if (select display_name from public.users where id='a0000000-0000-4000-8000-000000000001') <> '賣家甲'
 then raise exception 'SIGNUP_TRIGGER_FAILED'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
insert into public.guild_services(id,owner_id,business_name,title,description,category,city,status)
 values('c0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','賣家甲','網站開發','個人接案','網站開發','台北市','published');
do $$ begin
 begin
 update public.users set balance_g_coin=9999 where id=auth.uid();
 raise exception 'BALANCE_HACK_ALLOWED';
 exception when insufficient_privilege then null; end;
 begin
 perform email from public.users limit 1;
 raise exception 'EMAIL_EXPOSED';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',false);
insert into public.guild_inquiries(id,service_id,requester_id,message)
values('d0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000003',
       'b0000000-0000-4000-8000-000000000002','想詢價一頁式網站');
do $$begin
 begin
 insert into public.guild_reviews(inquiry_id,service_id,reviewer_id,rating,comment)
 values('d0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000003',
        'b0000000-0000-4000-8000-000000000002',5,'');
 raise exception 'EARLY_REVIEW_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
update public.guild_inquiries set status='quoted',quote_twd=3200 where id='d0000000-0000-4000-8000-000000000004';
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000002',false);
do $$begin
 begin
 update public.guild_inquiries set quote_twd=1 where id='d0000000-0000-4000-8000-000000000004';
 raise exception 'QUOTE_TAMPER_ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
update public.guild_inquiries set status='completed' where id='d0000000-0000-4000-8000-000000000004';
insert into public.guild_reviews(inquiry_id,service_id,reviewer_id,rating,comment) values
('d0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000003',
'b0000000-0000-4000-8000-000000000002',5,'完成交易，服務良好');
do $$begin
 begin
 insert into public.guild_reviews(inquiry_id,service_id,reviewer_id,rating,comment) values
 ('d0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000003',
 'b0000000-0000-4000-8000-000000000002',1,'重複');
 raise exception 'DUPLICATE_REVIEW_ALLOWED';
 exception when unique_violation then null; end;
end $$;
reset role;
do $$begin
 if (select count(*) from public.guild_reviews)<>1 then raise exception 'REVIEW_NOT_SAVED';end if;
 if (select status from public.guild_inquiries where id='d0000000-0000-4000-8000-000000000004')<>'completed'
 then raise exception 'INQUIRY_NOT_COMPLETED';end if;
 raise notice 'M0_END_TO_END_PASS: signed-up buyer & provider, inquiry, quote, completion, review, privacy';
end $$;
