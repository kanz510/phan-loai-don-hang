const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
 // Apply over the previous live schema, with public policies and existing data.
 const old=`create table public.orders(id bigint generated always as identity primary key,customer_name text not null,item text not null,payment_method text not null default 'Chưa rõ',amount_k numeric not null default 0,delivery_status text not null default 'Chưa rõ',note text default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now());alter table orders enable row level security;create policy orders_read on orders for select using(true);create policy orders_write on orders for all using(true) with check(true);insert into orders(customer_name,item) values('Đơn hiện có','Son');`;
 await db.exec(old);await db.exec('create table public.order_members(user_id uuid primary key references auth.users(id),created_at timestamptz not null default now())');const sql=fs.readFileSync(require('node:path').join(__dirname,'../supabase-schema.sql'),'utf8');await db.exec(sql);await db.exec(sql);
 assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,1);
 const member='00000000-0000-0000-0000-000000000001',stranger='00000000-0000-0000-0000-000000000002';
 await db.exec(`insert into auth.users values ('${member}'),('${stranger}');insert into order_members(user_id,role) values('${member}','admin');`);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from orders'),/permission denied/);await db.exec('reset role');
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${stranger}'`);assert.equal((await db.query('select * from orders')).rows.length,0);await assert.rejects(()=>db.exec("insert into orders(customer_name,item) values('Lạ','Son')"),/row-level security/);await db.exec('reset role');
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${member}'`);assert.equal((await db.query('select * from orders')).rows.length,1);
 await db.exec("insert into orders(customer_name,item,amount_k) values('Thử','Son',125.5)");
 const created=(await db.query("select * from orders where customer_name='Thử'")).rows[0];assert.equal(created.created_by,member);
 await db.exec(`update orders set amount_k=340 where id=${created.id} and version=1`);assert.equal((await db.query(`select version from orders where id=${created.id}`)).rows[0].version,2);
 assert.equal((await db.query(`update orders set amount_k=1 where id=${created.id} and version=1 returning id`)).rows.length,0);
 await assert.rejects(()=>db.exec('update orders set version=999'),/permission denied/);
 await assert.rejects(()=>db.exec(`insert into order_members(user_id,role) values('${stranger}','admin')`),/permission denied/);
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item,amount_k) values('Thử','Son',-1)"),/check constraint/);
 await assert.rejects(()=>db.exec("insert into orders(customer_name,item) values('   ','Son')"),/check constraint/);
 await db.exec(`delete from orders where id=${created.id} and version=2`);assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,1);
 console.log('PASS SQL: existing rows preserved, repeatable migration, anonymous denied, non-member denied, members CRUD, authorship, version conflict, protected columns, self-promotion denied, validation.');
 }finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
