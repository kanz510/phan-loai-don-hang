-- Review and apply in Supabase SQL Editor after backing up orders.
-- Does not delete or replace existing order records.
create or replace function public.touch_order_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_order_updated_at();
