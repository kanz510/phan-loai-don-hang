/* Deterministic Wave 2 sync smoke test: no network, database writes or browser needed. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app-auth.js'),'utf8');
const item=version=>({id:1,version,name:'Test',item:'Product',price:120,commission:0,
 pay:'CK',del:'Chưa giao',note:'',createdAt:'2026-11-01T08:00:00Z'});
let reads=0,renders=0,timerId=0,slow=false,resolvePending,db=[item(1)];
const timers=new Map();
const ctx=vm.createContext({
 authorized:true,busy:false,authEpoch:1,refreshSeq:0,orders:[],dataLoaded:false,
 channel:null,pollTimer:null,toastTimer:null,activeUser:null,page:'orders',
 cloud:{list:async()=>{
  reads++;
  if(slow)return await new Promise(resolve=>{resolvePending=resolve;});
  return db;
 }},
 document:{hidden:false,body:{dataset:{}},querySelectorAll:()=>[]},
 window:{},$:()=>null,render:()=>{renders++;},parseOrders:raw=>JSON.parse(raw),bind:()=>{},
 clearTimeout:id=>timers.delete(id),setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},
 setInterval:()=>1,clearInterval:()=>{},location:{}
});
vm.runInContext(source,ctx);
const refresh=vm.runInContext('refreshOrders',ctx);
const queue=vm.runInContext('scheduleOrderRefresh',ctx);
const busy=vm.runInContext('setBusy',ctx);
const pending=()=>vm.runInContext('refreshQueued',ctx);
const flush=()=>{const calls=[...timers.values()];timers.clear();calls.forEach(x=>x.fn());};
const idle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
(async()=>{
 await refresh();assert.equal(reads,1);assert.equal(renders,1);
 queue(40);queue(40);queue(40);
 assert.equal(timers.size,1);flush();await idle();
 assert.equal(reads,2);assert.equal(renders,1); // identical data does not rebuild rows
 busy(true);queue(40);assert.equal(pending(),true);assert.equal(timers.size,0);
 busy(false);assert.equal(timers.size,1);flush();await idle();assert.equal(reads,3);
 slow=true;const ongoing=refresh();queue(40);assert.equal(pending(),true);
 db=[item(2)];slow=false;resolvePending(db);await ongoing;await idle();
 assert.equal(timers.size,1);flush();await idle();
 assert.equal(reads,5);assert.equal(renders,2);
 console.log('PASS wave2 sync: one initial, one batched burst, no stale rerender, busy queue, and in-flight follow-up.');
})().catch(err=>{console.error(err);process.exitCode=1;});
