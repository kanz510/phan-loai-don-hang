-- Chạy file này trong Supabase SQL Editor (1 lần duy nhất)
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_name text not null,
  item text not null,
  payment_method text not null default 'Chưa rõ',
  amount_k numeric not null default 0,
  delivery_status text not null default 'Chưa rõ',
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cho phép app web đọc/ghi bằng anon key (phù hợp app nội bộ nhỏ, không đăng nhập).
-- Nếu sau này cần đăng nhập, hãy thay policy này bằng policy theo user.
alter table public.orders enable row level security;
drop policy if exists "orders_read" on public.orders;
drop policy if exists "orders_write" on public.orders;
create policy "orders_read" on public.orders for select using (true);
create policy "orders_write" on public.orders for all using (true) with check (true);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
