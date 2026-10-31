-- Run once in the project's Supabase SQL Editor as owner.
-- Adds an audit log only. Does not rewrite existing orders or membership.
begin;
create table if not exists public.order_history (
 id bigint generated always as identity primary key,
 order_id text not null,
 action text not null check (action in ('INSERT','UPDATE')),
 actor_id uuid references auth.users(id) on delete set null,
 actor_email text,
 recorded_at timestamptz not null default clock_timestamp(),
 before_data jsonb,
 after_data jsonb not null
);
alter table public.order_history enable row level security;
revoke all on public.order_history from public, anon, authenticated;
grant select on public.order_history to authenticated;
revoke all on sequence public.order_history_id_seq from public, anon, authenticated;
drop policy if exists order_history_read_members on public.order_history;
create policy order_history_read_members on public.order_history for select to authenticated
 using (exists(select 1 from public.order_members where user_id=(select auth.uid())));

create or replace function public.record_order_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.order_history(order_id,action,actor_id,actor_email,before_data,after_data)
 values(new.id::text,TG_OP,auth.uid(),auth.jwt()->>'email',
  case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end;
$$;
revoke all on function public.record_order_history() from public, anon, authenticated;
drop trigger if exists orders_record_history on public.orders;
create trigger orders_record_history after insert or update on public.orders
 for each row execute function public.record_order_history();
create index if not exists order_history_order_id_idx on public.order_history(order_id);
commit;
