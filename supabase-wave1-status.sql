-- Optional Wave 1 TEST migration. Run ONLY in an isolated Supabase test project.
-- Never run against production until the branch is reviewed and approved.
-- All new columns are nullable: existing values, order versions and audit history remain unchanged.
begin;
alter table public.orders add column if not exists commission_state text;
alter table public.orders add column if not exists commission_expected numeric;
alter table public.orders add column if not exists collection_status text;

alter table public.orders drop constraint if exists orders_wave1_status_valid;
alter table public.orders add constraint orders_wave1_status_valid check (
 (commission_state is null or commission_state in ('pending','not_applicable','partial','received'))
 and (collection_status is null or collection_status in ('Chưa rõ','Chưa thu','Thu một phần','Đã thu'))
 and (commission_expected is null or (
   commission_expected >= 0 and commission_expected <= 9000000000000
   and commission_expected <> 'NaN'::numeric
   and commission_expected = trunc(commission_expected)))
 and (commission_state is distinct from 'pending' or commission_amount = 0)
 and (commission_state is distinct from 'not_applicable' or (commission_amount = 0 and coalesce(commission_expected,0) = 0))
 and (commission_state is distinct from 'partial' or
   (commission_amount > 0 and commission_expected is not null and commission_expected > commission_amount))
 and (commission_state is distinct from 'received' or (commission_amount > 0 and (commission_expected is null or commission_amount >= commission_expected)))
 and (payment_method <> 'Chưa thanh toán' or collection_status is null or collection_status in ('Chưa rõ','Chưa thu'))
) not valid;

-- The existing member RLS policies still govern reads and writes.
grant insert(commission_state,commission_expected,collection_status) on public.orders to authenticated;
grant update(commission_state,commission_expected,collection_status) on public.orders to authenticated;
commit;
