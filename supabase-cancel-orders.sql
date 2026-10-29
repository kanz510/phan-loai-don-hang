-- Run once in the existing Supabase project's SQL Editor as the project owner.
-- Safe to repeat. Changes one validation constraint only; preserves every order,
-- membership, permission and version trigger. No data is inserted or deleted.
begin;
alter table public.orders drop constraint if exists orders_input_valid;
alter table public.orders add constraint orders_input_valid check (
 length(btrim(customer_name)) between 1 and 200 and length(btrim(item)) between 1 and 1000
 and amount_k >= 0 and amount_k <= 9000000000 and amount_k <> 'NaN'::numeric
 and amount_k=round(amount_k,3)
 and payment_method in ('Chưa rõ','CK','COD','Tiền mặt','Chưa thanh toán')
 and delivery_status in ('Chưa rõ','Đã giao','Chưa giao','Đã hủy')
 and length(coalesce(note,'')) <= 2000
) not valid;
commit;
