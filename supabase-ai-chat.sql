-- Run once in Supabase SQL Editor; safe to rerun. Does not alter orders.
begin;
create table if not exists public.order_chat_usage (
 usage_day date not null,
 subject text not null,
 requests integer not null default 0 check(requests>=0),
 last_request timestamptz not null default now(),
 primary key(usage_day,subject)
);
alter table public.order_chat_usage enable row level security;
revoke all on public.order_chat_usage from public,anon,authenticated;
create or replace function public.consume_order_chat_quota() returns boolean
language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
 personal public.order_chat_usage%rowtype;
 total_requests integer;
begin
 if actor is null or not exists(select 1 from public.order_members where user_id=actor)
 then raise exception 'Membership required' using errcode='42501'; end if;
 -- A common transaction lock makes user + shop limits atomic across instances.
 perform pg_advisory_xact_lock(719510,202610);
 select * into personal from public.order_chat_usage where usage_day=today and subject=actor::text;
 select requests into total_requests from public.order_chat_usage where usage_day=today and subject='shop';
 if coalesce(personal.requests,0)>=300 or coalesce(total_requests,0)>=3000
 or (personal.last_request is not null and personal.last_request>clock_timestamp()-interval '3 seconds') then return false; end if;
 insert into public.order_chat_usage(usage_day,subject,requests,last_request)
 values(today,actor::text,1,clock_timestamp())
 on conflict(usage_day,subject) do update set requests=public.order_chat_usage.requests+1,last_request=excluded.last_request;
 insert into public.order_chat_usage(usage_day,subject,requests,last_request)
 values(today,'shop',1,clock_timestamp())
 on conflict(usage_day,subject) do update set requests=public.order_chat_usage.requests+1,last_request=excluded.last_request;
 delete from public.order_chat_usage where usage_day<today-7;
 return true;
end $$;
revoke all on function public.consume_order_chat_quota() from public,anon;
grant execute on function public.consume_order_chat_quota() to authenticated;
commit;
