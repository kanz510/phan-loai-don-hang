-- SECURITY MIGRATION: review and run manually in Supabase SQL Editor.
-- Back up public.orders before applying. Does not delete or rewrite existing orders.
-- IMPORTANT: Create Supabase Auth users and add their UUIDs to public.order_members
-- BEFORE running the final policy statements, otherwise all clients lose access.
create table if not exists public.order_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.order_members enable row level security;
revoke all on public.order_members from anon, authenticated;
-- Membership is provisioned by a database administrator in SQL Editor only.
-- Example: insert into public.order_members(user_id) values ('AUTH-USER-UUID');
grant select on public.order_members to authenticated;
drop policy if exists order_members_self_read on public.order_members;
create policy order_members_self_read on public.order_members
for select to authenticated using (user_id = (select auth.uid()));

-- Existing orders remain untouched. Restrict data access to signed-in members.
alter table public.orders enable row level security;
drop policy if exists "orders_read" on public.orders;
drop policy if exists "orders_write" on public.orders;
drop policy if exists orders_member_select on public.orders;
drop policy if exists orders_member_insert on public.orders;
drop policy if exists orders_member_update on public.orders;
drop policy if exists orders_member_delete on public.orders;
revoke all on public.orders from anon;
grant select, insert, update, delete on public.orders to authenticated;
grant usage, select on sequence public.orders_id_seq to authenticated;
create policy orders_member_select on public.orders for select to authenticated
using (exists (select 1 from public.order_members m where m.user_id = (select auth.uid())));
create policy orders_member_insert on public.orders for insert to authenticated
with check (exists (select 1 from public.order_members m where m.user_id = (select auth.uid())));
create policy orders_member_update on public.orders for update to authenticated
using (exists (select 1 from public.order_members m where m.user_id = (select auth.uid())))
with check (exists (select 1 from public.order_members m where m.user_id = (select auth.uid())));
create policy orders_member_delete on public.orders for delete to authenticated
using (exists (select 1 from public.order_members m where m.user_id = (select auth.uid())));
