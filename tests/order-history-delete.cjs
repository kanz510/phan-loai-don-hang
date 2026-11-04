/* Verify DELETE audit migration in an isolated PGlite database. No Supabase traffic. */
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase-order-history.sql'),'utf8');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec([
   "create role anon; create role authenticated;",
   "create schema auth;",
   "create table auth.users(id uuid primary key);",
   "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
   "create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email',nullif(current_setting('request.jwt.claim.email',true),'')) $$;",
   "create table public.order_members(user_id uuid primary key);",
   "create table public.orders(id bigint generated always as identity primary key,customer_name text not null,item text not null,amount_k numeric not null default 0);",
   "grant usage on schema public to authenticated;"
  ].join('\n'));
  // Simulate the already-deployed audit table with INSERT/UPDATE only.
  await db.exec([
   "create table public.order_history(id bigint generated always as identity primary key,order_id text not null,action text not null check (action in ('INSERT','UPDATE')),actor_id uuid references auth.users(id) on delete set null,actor_email text,recorded_at timestamptz not null default clock_timestamp(),before_data jsonb,after_data jsonb not null);",
   "insert into public.order_history(order_id,action,after_data) values('old-42','INSERT',jsonb_build_object('customer_name','Đơn cũ'));"
  ].join('\n'));
  const user='00000000-0000-0000-0000-000000000001';
  await db.exec("insert into auth.users(id) values('"+user+"');insert into public.order_members values('"+user+"');set request.jwt.claim.sub='"+user+"';set request.jwt.claim.email='may@example.test';");
  // Idempotent installation: reruns must retain old history.
  await db.exec(sql);await db.exec(sql);
  await db.exec("insert into public.orders(customer_name,item,amount_k) values('Đơn bị xóa','Son',123.5);update public.orders set amount_k=220 where customer_name='Đơn bị xóa';delete from public.orders where customer_name='Đơn bị xóa';");
  let records=(await db.query('select order_id,action,actor_id,actor_email,before_data,after_data from public.order_history order by id')).rows;
  assert.equal(records.length,4);
  const legacy=records.shift();
  assert.equal(legacy.order_id,'old-42');
  assert.equal(legacy.action,'INSERT');
  assert.equal(legacy.after_data.customer_name,'Đơn cũ');
  assert.deepEqual(records.map(r=>r.action),['INSERT','UPDATE','DELETE']);
  assert.equal(records[0].before_data,null);
  assert.equal(records[0].after_data.customer_name,'Đơn bị xóa');
  assert.equal(Number(records[1].before_data.amount_k),123.5);
  assert.equal(Number(records[1].after_data.amount_k),220);
  assert.equal(records[2].before_data.customer_name,'Đơn bị xóa');
  assert.equal(Number(records[2].before_data.amount_k),220);
  assert.equal(records[2].after_data,null);
  assert.equal(records[2].order_id,records[0].order_id);
  assert.equal(records[2].actor_id,user);
  assert.equal(records[2].actor_email,'may@example.test');
  assert.equal((await db.query('select count(*)::int as n from public.orders')).rows[0].n,0);
  await db.exec(sql);
  records=(await db.query('select action from public.order_history order by id')).rows;
  assert.deepEqual(records.map(r=>r.action),['INSERT','INSERT','UPDATE','DELETE']);
  console.log('PASS audit history: INSERT/UPDATE/DELETE snapshots, actor, repeatable migration, no lost history.');
 }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
