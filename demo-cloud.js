/* TEST-ONLY cloud implementation. No network calls, credentials or Supabase usage. */
window.MAY_DEMO=true;
window.createOrdersCloud=function createDemoOrdersCloud(){
 const STORE='may-wave3-demo-orders-v1';
 const HISTORY='may-wave3-demo-history-v1';
 const DEMO_USER={id:'may-local-demo',email:'demo@local.invalid'};
 const baseDate=Date.UTC(2026,10,4,3,0,0);
 let signedIn=true,listener=null;
 const stateChoices=['Chưa giao','Đã giao','Chưa rõ','Đã hủy'];
 const commissionChoices=['pending','received','partial','not_applicable'];
 const names=['Ngọc Quỳnh','Hồng Mai','Bích Ngọc','Thu Hà','Minh Thư','Gia Hân','Ngọc Anh','Trúc Linh','Thanh Huyền','Mai Lan','Thảo Vy','Phương Anh','Hà My','Hồng Nhung','Kim Chi','Ngân Hà'];
 const products=['Son dưỡng','Kem chống nắng','Túi xách','Váy hoa','Áo sơ mi','Dầu gội','Sữa rửa mặt','Nước hoa','Giày thể thao','Đồng hồ','Serum','Túi tote'];
 function sampleOrders(){
  return Array.from({length:115},(_,i)=>{
   const month=i%12,year=i%17===0?2025:2026;
   const date=new Date(Date.UTC(year,month,3+((i*7)%25),8+(i%10),i%60,0));
   if(year===2026&&date.getTime()>baseDate)date.setUTCMonth(9); // no dates beyond Nov 4
   const price=Math.round((95+(i*137)%1800)*1000)/1000;
   const del=stateChoices[(i*7)%stateChoices.length];
   const state=commissionChoices[(i*3)%commissionChoices.length];
   const commission=state==='pending'||state==='not_applicable'?0:state==='partial'?15000+((i*17)%90)*1000:25000+((i*37)%120)*1000;
   const expected=state==='partial'?commission+50000:state==='received'?commission:null;
   const pay=['CK','COD','Tiền mặt','Chưa rõ'][(i*5)%4];
   return {id:i+1,name:names[i%names.length],item:products[(i*5)%products.length],price,
    commission,comState:state,comExpected:expected,collection:['Chưa rõ','Chưa thu','Đã thu'][i%3],
    pay,del,note:i%6===0?'Đơn mẫu kiểm thử, không phải đơn thật':'',version:1,createdAt:date.toISOString()};
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id-a.id);
 }
 function load(key,fallback){
  try{const raw=sessionStorage.getItem(key);return raw?JSON.parse(raw):fallback();}
  catch{return fallback();}
 }
 let rows=load(STORE,sampleOrders),events=load(HISTORY,()=>[]);
 let nextId=Math.max(0,...rows.map(o=>Number(o.id)||0))+1;
 let nextEventId=Math.max(0,...events.map(e=>Number(e.id)||0))+1;
 const clone=o=>JSON.parse(JSON.stringify(o));
 const persist=()=>{try{sessionStorage.setItem(STORE,JSON.stringify(rows));sessionStorage.setItem(HISTORY,JSON.stringify(events));}catch{}};
 const snapshot=order=>({id:order.id,customer_name:order.name,item:order.item,
  amount_k:order.price,commission_amount:order.commission,commission_state:order.comState,
  commission_expected:order.comExpected,collection_status:order.collection,
  payment_method:order.pay,delivery_status:order.del,note:order.note,version:order.version,created_at:order.createdAt});
 function log(action,before,after){
  events.unshift({id:nextEventId++,order_id:String((after||before).id),action,actor_email:DEMO_USER.email,
   recorded_at:new Date().toISOString(),before_data:before?snapshot(before):null,after_data:after?snapshot(after):null});
  events=events.slice(0,300);
 }
 function validMutation(order){
  const allowed=['pending','received','partial','not_applicable'];
  if(!order||!allowed.includes(order.comState))throw Error('Trạng thái hoa hồng demo không hợp lệ.');
  if(order.comState==='pending'||order.comState==='not_applicable'){
   if(order.commission!==0)throw Error('Đơn chưa nhận hoa hồng phải có số đã nhận bằng 0.');
  }
  if(order.comState==='partial'&&!(order.commission>0&&order.comExpected>order.commission))throw Error('Nhập hoa hồng dự kiến lớn hơn số đã nhận.');
  if(order.comState==='received'&&!(order.commission>0&&(order.comExpected==null||order.comExpected<=order.commission)))throw Error('Hoa hồng đã nhận đủ không hợp lệ.');
 }
 const client={
  auth:{
   onAuthStateChange(callback){listener=callback;return {data:{subscription:{unsubscribe(){listener=null;}}}};},
   async getSession(){return{data:{session:signedIn?{user:DEMO_USER,access_token:'demo-session-only'}:null},error:null};},
   async signOut(){signedIn=false;if(listener)queueMicrotask(()=>listener('SIGNED_OUT',null));return{error:null};},
   async signInWithPassword({email}){signedIn=true;const session={user:DEMO_USER,access_token:'demo-session-only'};if(listener)queueMicrotask(()=>listener('SIGNED_IN',session));return{data:{user:DEMO_USER,session},error:null};},
   async updateUser(){return {error:new Error('Demo không hỗ trợ đổi mật khẩu.')}} 
  },
  channel(){return{on(){return this;},subscribe(){return this;}};},
  removeChannel(){return Promise.resolve();},
  from(){throw Error('Demo không kết nối PostgREST hoặc Supabase thật.');}
 };
 return {
  client,statusEnabled:()=>true,
  async member(){return{user_id:DEMO_USER.id,role:'admin'};},
  async list(){return clone(rows);},
  async history(start=0,limit=20){return clone(events.slice(start,start+limit));},
  async insert(order){validMutation(order);const createdAt=new Date().toISOString();const result={...clone(order),id:nextId++,version:1,createdAt};rows.unshift(result);log('INSERT',null,result);persist();return clone(result);},
  async update(order,version){
   validMutation(order);
   const index=rows.findIndex(item=>String(item.id)===String(order.id));
   if(index<0||rows[index].version!==version)throw Error('Đơn mẫu đã thay đổi. Vui lòng tải lại.');
   const before=clone(rows[index]),after={...before,...clone(order),version:before.version+1};
   rows[index]=after;log('UPDATE',before,after);persist();return clone(after);
  },
  async remove(order){
   const index=rows.findIndex(item=>String(item.id)===String(order.id));
   if(index<0||rows[index].version!==order.version)throw Error('Đơn mẫu đã thay đổi.');
   const before=rows.splice(index,1)[0];log('DELETE',before,null);persist();
  },
  reset(){rows=sampleOrders();events=[];nextId=116;nextEventId=1;persist();}
 };
};
