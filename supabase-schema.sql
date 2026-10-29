-- Apply in Supabase SQL Editor as the project owner. Preserves existing orders.
-- Before applying: create your users in Authentication > Users, then add their
-- UUIDs to order_members at the bottom. There is no public sign-up in this app.
begin;
create table if not exists public.orders (
 id bigint generated always as identity primary key,
 customer_name text not null, item text not null,
 payment_method text not null default 'Chưa rõ',
 amount_k numeric not null default 0,
 delivery_status text not null default 'Chưa rõ', note text default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.orders add column if not exists version integer not null default 1;
alter table public.orders add column if not exists created_by uuid references auth.users(id) default auth.uid();
-- Whole VND actually received as commission; amount_k remains thousands of VND.
alter table public.orders add column if not exists commission_amount numeric not null default 0;

create table if not exists public.order_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'editor' check (role in ('admin','editor'))
);
alter table public.order_members add column if not exists role text not null default 'editor' check (role in ('admin','editor'));
alter table public.orders enable row level security;
alter table public.order_members enable row level security;
-- Remove the previous anonymous/public access policies, including renamed ones.
do $$ declare p record; begin
 for p in select policyname from pg_policies where schemaname='public' and tablename='orders'
 loop execute format('drop policy %I on public.orders',p.policyname); end loop;
end $$;
drop policy if exists member_read_self on public.order_members;
create policy member_read_self on public.order_members for select to authenticated using (user_id=(select auth.uid()));
create policy orders_read_members on public.orders for select to authenticated
 using (exists(select 1 from public.order_members where user_id=(select auth.uid())));
create policy orders_insert_members on public.orders for insert to authenticated
 with check (exists(select 1 from public.order_members where user_id=(select auth.uid())) and created_by=(select auth.uid()));
create policy orders_update_members on public.orders for update to authenticated
 using (exists(select 1 from public.order_members where user_id=(select auth.uid())))
 with check (exists(select 1 from public.order_members where user_id=(select auth.uid())));
create policy orders_delete_members on public.orders for delete to authenticated
 using (exists(select 1 from public.order_members where user_id=(select auth.uid())));

-- Prevent clients from granting themselves membership, resetting versions,
-- changing authorship, or truncating the shared table.
revoke all on public.orders from public,anon,authenticated;
revoke all on public.order_members from public,anon,authenticated;
grant select on public.order_members to authenticated;
grant select,delete on public.orders to authenticated;
grant insert(customer_name,item,payment_method,amount_k,delivery_status,note,commission_amount) on public.orders to authenticated;
grant update(customer_name,item,payment_method,amount_k,delivery_status,note,commission_amount) on public.orders to authenticated;
grant usage on sequence public.orders_id_seq to authenticated;

create or replace function public.touch_order_version() returns trigger
language plpgsql set search_path = '' as $$
begin
 new.version=old.version+1;
 new.updated_at=clock_timestamp();
 return new;
end $$;
revoke all on function public.touch_order_version() from public;
drop trigger if exists orders_touch_version on public.orders;
create trigger orders_touch_version before update on public.orders
 for each row execute function public.touch_order_version();

-- NOT VALID preserves old rows; constraints apply to all future inserts/updates.
alter table public.orders drop constraint if exists orders_input_valid;
alter table public.orders add constraint orders_input_valid check (
 length(btrim(customer_name)) between 1 and 200 and length(btrim(item)) between 1 and 1000
 and amount_k >= 0 and amount_k <= 9000000000 and amount_k <> 'NaN'::numeric
 and amount_k=round(amount_k,3)
 and payment_method in ('Chưa rõ','CK','COD','Tiền mặt','Chưa thanh toán')
 and delivery_status in ('Chưa rõ','Đã giao','Chưa giao','Đã hủy')
 and length(coalesce(note,'')) <= 2000
) not valid;
-- Separate from orders_input_valid so the cancellation migration cannot remove it.
alter table public.orders drop constraint if exists orders_commission_valid;
alter table public.orders add constraint orders_commission_valid check (
 commission_amount >= 0 and commission_amount <= 9000000000000
 and commission_amount <> 'NaN'::numeric
 and commission_amount = trunc(commission_amount)
);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders')
 then alter publication supabase_realtime add table public.orders; end if;
end $$;
commit;

-- Run separately after replacing UUID with each existing Auth user's UUID:
-- insert into public.order_members(user_id,role) values ('USER_UUID_HERE','admin')
-- on conflict(user_id) do update set role=excluded.role;
-- Both roles can manage orders. Membership can only be changed by the project
-- owner in SQL Editor, never through the browser (including an admin browser).
