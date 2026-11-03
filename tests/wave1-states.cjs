const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'shared-cloud.js'),'utf8');
const utils=fs.readFileSync(path.join(root,'app-utils.js'),'utf8');
const {validOrder,awaitingCommission}=vm.runInNewContext(utils+'\n;({validOrder,awaitingCommission})');

const row={id:1,customer_name:'Test',item:'Test product',amount_k:340,commission_amount:50000,
 payment_method:'CK',delivery_status:'Chưa giao',note:'',version:1,created_at:'2026-11-03T12:00:00Z'};
function mock(supportsStatus){
 let lastWrite,reads=0;
 const client={from(table){
  assert.equal(table,'orders');
  return {
   select(cols){return{order(){return this},async range(){
    reads++;
    if(!supportsStatus&&cols.includes('commission_state'))return {data:null,error:{code:'42703',message:'column orders.commission_state does not exist'}};
    return {data:[{...row,...(supportsStatus?{commission_state:'partial',commission_expected:90000,collection_status:'Đã thu'}:{})}],error:null};
   }};},
   insert(payload){lastWrite=payload;return {select(){return {async single(){return {data:{...row,...payload},error:null}};}}};}
  };
 }};
 const win={supabase:{createClient:()=>client}};
 vm.runInNewContext(src,{window:win});
 return {cloud:win.createOrdersCloud('https://example.test','public'),getWrite:()=>lastWrite,reads:()=>reads};
}
(async()=>{
 const legacy=mock(false),items=await legacy.cloud.list();
 assert.equal(legacy.cloud.statusEnabled(),false);
 assert.equal(legacy.reads(),2);
 assert.equal(items.length,1);
 assert.equal(items[0].comState,'received');
 await assert.rejects(()=>legacy.cloud.insert({name:'Test',item:'Test product',price:340,commission:50000,
  comState:'partial',comExpected:90000,collection:'Đã thu',pay:'CK',del:'Chưa giao',note:''}),/supabase-wave1-status/);

 const upgraded=mock(true),loaded=await upgraded.cloud.list();
 assert.equal(upgraded.cloud.statusEnabled(),true);
 assert.equal(loaded[0].comState,'partial');
 assert.equal(loaded[0].comExpected,90000);
 const input={name:'Test',item:'Test product',price:340,commission:50000,
  comState:'partial',comExpected:90000,collection:'Đã thu',pay:'CK',del:'Chưa giao',note:''};
 await upgraded.cloud.insert(input);
 assert.equal(upgraded.getWrite().commission_expected,90000);
 assert.equal(upgraded.getWrite().collection_status,'Đã thu');

 const valid={...input,id:1,version:1};
 assert.equal(validOrder(valid),true);
 assert.equal(validOrder({...valid,comExpected:20000}),false);
 assert.equal(validOrder({...valid,comState:'pending'}),false);
 assert.equal(validOrder({...valid,comState:'not_applicable'}),false);
 assert.equal(awaitingCommission(valid),true);
 assert.equal(awaitingCommission({...valid,del:'Đã hủy'}),false);
 assert.equal(awaitingCommission({...valid,comState:'not_applicable',commission:0,comExpected:null}),false);
 console.log('PASS Wave 1: old-schema fallback, new status writes, input checks and commission queue.');
})().catch(e=>{console.error(e);process.exitCode=1;});
