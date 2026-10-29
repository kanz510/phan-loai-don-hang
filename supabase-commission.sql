-- Run in the existing Supabase project's SQL Editor as the project owner.
-- Commission is the money actually received, in VND (whole dong), not thousands.
-- Safe to repeat. Existing orders receive 0; stored commissions are never reset.
-- Other order fields, membership, RLS and version triggers remain unchanged.
begin;
alter table public.orders add column if not exists commission_amount numeric not null default 0;
alter table public.orders drop constraint if exists orders_commission_valid;
alter table public.orders add constraint orders_commission_valid check (
 commission_amount >= 0 and commission_amount <= 9000000000000
 and commission_amount <> 'NaN'::numeric
 and commission_amount = trunc(commission_amount)
);
-- Extend only these column privileges. All existing RLS policies still apply.
grant insert(commission_amount) on public.orders to authenticated;
grant update(commission_amount) on public.orders to authenticated;
commit;
