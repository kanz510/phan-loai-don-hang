const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const sqlFile=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
 // Upgrade the former live schema, including permissive policies and an old row.
 const old=`create table public.orders(id bigint generated always as identity primary key,customer_name text not null,item text not null,payment_method text not null default 'Chưa rõ',amount_k numeric not null default 0,delivery_status text not null default 'Chưa rõ',note text default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now());alter table orders enable row level security;create policy orders_read on orders for select using(true);create policy orders_write on orders for all using(true) with check(true);insert into orders(customer_name,item) values('Đơn hiện có','Son');`;
 await db.exec(old);
 await db.exec('create table public.order_members(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now())');
 const sql=sqlFile('supabase-schema.sql');assert.equal(sqlFile('supabase-security-migration.sql'),sql);
 await db.exec(sql);await db.exec(sql);
 assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,1);
 assert.equal(Number((await db.query('select commission_amount from orders')).rows[0].commission_amount),0);
 // Emulate the currently deployed schema without commission, then run only the
 // narrow migration. It preserves every pre-existing value, timestamp and ID.
 await db.exec('alter table orders drop column commission_amount');
 await assert.rejects(()=>db.query('select commission_amount from orders'),/does not exist/);
 const oldRow=(await db.query('select to_jsonb(orders) as value from orders')).rows;
 const commissionSql=sqlFile('supabase-commission.sql');await db.exec(commissionSql);await db.exec(commissionSql);
 assert.deepEqual((await db.query("select to_jsonb(orders)-'commission_amount' as value from orders")).rows,oldRow);
 assert.equal(Number((await db.query('select commission_amount from orders')).rows[0].commission_amount),0);
 // The independent cancellation migration must retain the commission check.
 await db.exec("alter table orders drop constraint orders_input_valid;alter table orders add constraint orders_input_valid check(delivery_status in ('Chưa rõ','Đã giao','Chưa giao')) not valid");
 await assert.rejects(()=>db.exec("update orders set delivery_status='Đã hủy'"),/check constraint/);
 const before=(await db.query('select to_jsonb(orders) as value from orders')).rows;
 const cancelSql=sqlFile('supabase-cancel-orders.sql');await db.exec(cancelSql);await db.exec(cancelSql);
 assert.deepEqual((await db.query('select to_jsonb(orders) as value from orders')).rows,before);
 assert.equal((await db.query("select count(*)::int as n from pg_constraint where conrelid='public.orders'::regclass and conname='orders_commission_valid'")).rows[0].n,1);
 const member='00000000-0000-0000-0000-000000000001',stranger='00000000-0000-0000-0000-000000000002';
 await db.exec(`insert into auth.users values ('${member}'),('${stranger}');insert into order_members(user_id,role) values('${member}','admin');`);
 await db.exec('set role anon');
 await assert.rejects(()=>db.query('select * from orders'),/permission denied/);
 await assert.rejects(()=>db.exec('update orders set commission_amount=1'),/permission denied/);
 await db.exec('reset role');
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${stranger}'`);
 assert.equal((await db.query('select * from orders')).rows.length,0);
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item,commission_amount) values('Lạ','Son',50000)"),/row-level security/);
 await db.exec('reset role');
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`);
 assert.equal((await db.query('select * from orders')).rows.length,1);
 // Members may omit commission for its zero default, or enter the inclusive max.
 for(const [name,suffix] of [['Mặc định',''],['Tối đa',',commission_amount']]){
  await db.exec(`insert into orders(customer_name,item${suffix}) values('${name}','Son'${suffix?',9000000000000':''})`);
  const temp=(await db.query(`select * from orders where customer_name='${name}'`)).rows[0];
  assert.equal(Number(temp.commission_amount),suffix?9000000000000:0);
  await db.exec(`delete from orders where id=${temp.id}`);
 }
 for(const value of ['-1','0.5','9000000000001',"'NaN'::numeric","'Infinity'::numeric","'-Infinity'::numeric"]){
  await assert.rejects(()=>db.exec(`insert into orders(customer_name,item,commission_amount) values('Sai hoa hồng','Son',${value})`),/check constraint/);
 }
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item,commission_amount) values('Thiếu','Son',null)"),/not-null constraint/);
 await db.exec("insert into orders(customer_name,item,amount_k,commission_amount) values('Thử','Son',125.5,12500)");
 const created=(await db.query("select * from orders where customer_name='Thử'")).rows[0];
 assert.equal(created.created_by,member);assert.equal(Number(created.commission_amount),12500);
 // Re-running the migration after real commission entries must not reset them.
 await db.exec('reset role');await db.exec(commissionSql);
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`);
 assert.equal(Number((await db.query(`select commission_amount from orders where id=${created.id}`)).rows[0].commission_amount),12500);
 await db.exec(`update orders set amount_k=340,commission_amount=25000 where id=${created.id} and version=1`);
 const changed=(await db.query(`select * from orders where id=${created.id}`)).rows[0];
 assert.equal(changed.version,2);assert.equal(Number(changed.commission_amount),25000);
 assert.equal((await db.query(`update orders set commission_amount=999 where id=${created.id} and version=1 returning id`)).rows.length,0);
 await assert.rejects(()=>db.exec('update orders set version=999'),/permission denied/);
 await assert.rejects(()=>db.exec('update orders set created_at=now()'),/permission denied/);
 await assert.rejects(()=>db.exec(`insert into orders(customer_name,item,created_by) values('Tự đặt người tạo','Son','${member}')`),/permission denied/);
 await assert.rejects(()=>db.exec(`insert into order_members(user_id,role) values('${stranger}','admin')`),/permission denied/);
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item,amount_k) values('Thử','Son',-1)"),/check constraint/);
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item) values('   ','Son')"),/check constraint/);
 await db.exec(`update orders set delivery_status='Đã hủy' where id=${created.id} and version=2`);
 const cancelled=(await db.query(`select * from orders where id=${created.id}`)).rows[0];
 assert.equal(cancelled.delivery_status,'Đã hủy');assert.equal(cancelled.version,3);assert.equal(Number(cancelled.amount_k),340);assert.equal(cancelled.payment_method,created.payment_method);assert.equal(Number(cancelled.commission_amount),25000);
 assert.equal((await db.query(`update orders set delivery_status='Chưa giao' where id=${created.id} and version=2 returning id`)).rows.length,0);
 // Commission is actual money received and may be corrected independently after cancellation.
 await db.exec(`update orders set commission_amount=0 where id=${created.id} and version=3`);
 const corrected=(await db.query(`select * from orders where id=${created.id}`)).rows[0];
 assert.equal(corrected.version,4);assert.equal(corrected.delivery_status,'Đã hủy');assert.equal(Number(corrected.commission_amount),0);
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item,delivery_status) values('Sai','Son','Không tồn tại')"),/check constraint/);
 await db.exec(`delete from orders where id=${created.id} and version=4`);
 assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,1);
 console.log('PASS SQL: old rows preserved, full/narrow migrations repeatable, commission default/max/integer/finite validation, column-only write grants, anonymous/non-member denied, members CRUD, version conflicts, protected columns/membership denied, cancellation independent and commission preserved/correctable.');
 }finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
