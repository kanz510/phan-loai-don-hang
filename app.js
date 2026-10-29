
const SUPABASE_URL='https://jsdpdfdyxfxvlxdovnkt.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZHBkZmR5eGZ4dmx4ZG92bmt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTkwODksImV4cCI6MjEwODc3NTA4OX0.fhZsGKrJUCVR5Je8tFmO3X7jJa75xi3TIzRWBupnXG8';
let cloud=null;
try{cloud=window.createOrdersCloud(SUPABASE_URL,SUPABASE_ANON_KEY);}catch(error){window.cloudStartupError=error.message;}
const $=id=>document.getElementById(id);
function createIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('icon');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','icons.svg#'+name);svg.append(use);return svg;}
const page=document.body.dataset.page;
const params=new URLSearchParams(location.search);
const setText=(id,text)=>{if($(id)){$(id).textContent=text;if(id==='saveButton')$(id).prepend(createIcon('save'));}};
const bind=(id,event,handler)=>$(id)?.addEventListener(event,handler);
function safeRoute(candidate,allowed,fallback){try{const url=new URL(candidate,location.href);if(url.origin!==location.origin)return fallback;for(const filename of allowed){if(url.pathname===new URL(filename,location.href).pathname)return filename+url.search;}return fallback;}catch{return fallback;}}
const listReturn=safeRoute(params.get('returnTo')||'orders.html',['orders.html'],'orders.html');
function listRoute(){return 'orders.html'+(page==='orders'?location.search:'');}
function loginRoute(){return 'account.html?next='+encodeURIComponent((location.pathname.split('/').pop()||'index.html')+location.search);}
function updateListUrl(){if(page!=='orders')return;const query=new URLSearchParams();if($('q').value)query.set('q',$('q').value);if($('fSort').value!=='newest')query.set('sort',$('fSort').value);if($('fDel').value!=='all')query.set('del',$('fDel').value);appendDateParams(query);if(currentPage>1)query.set('page',currentPage);history.replaceState(null,'','orders.html'+(query.size?'?'+query:''));if($('addOrder'))$('addOrder').href='order.html?returnTo='+encodeURIComponent(listRoute());}

const PAY=['Chưa rõ','CK','COD','Tiền mặt','Chưa thanh toán'], DEL=['Chưa rõ','Đã giao','Chưa giao','Đã hủy'];
let orders=[],editId=null,editVersion=null,toastTimer,currentPage=1,activeUser=null,authorized=false,busy=false,authEpoch=0,refreshSeq=0,channel=null,pollTimer=null;
const PAGE_SIZE=10;
let dataLoaded=false,editorReady=false;
const ORDER_TIME_ZONE='Asia/Ho_Chi_Minh';
const orderDateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:ORDER_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
function orderDateKey(order){if(!order.createdAt)return '';const date=new Date(order.createdAt);if(!Number.isFinite(date.getTime()))return '';const parts=Object.fromEntries(orderDateFormatter.formatToParts(date).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
function validDateKey(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);if(y<1970||y>9999)return false;const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;}
function displayDate(key){return validDateKey(key)?key.split('-').reverse().join('/'):'Chưa rõ';}
function dateFilter(){
 if(page!=='orders')return {mode:'all',error:''};
 const mode=$('fDateMode').value,year=$('fYear').value,month=$('fMonth').value,from=$('fFrom').value,to=$('fTo').value;let error='';
 if(mode==='month'&&(!/^\d{4}$/.test(year)||Number(year)<1970||Number(year)>9999))error='Vui lòng nhập năm từ 1970 đến 9999.';
 if(mode==='range'&&((from&&!validDateKey(from))||(to&&!validDateKey(to))))error='Vui lòng chọn ngày hợp lệ.';
 if(mode==='range'&&from&&to&&from>to)error='Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.';
 return {mode,year,month,from,to,error};
}
function appendDateParams(query){const f=dateFilter();if(f.mode==='month'){query.set('time','month');query.set('year',f.year);if(f.month)query.set('month',Number(f.month));}if(f.mode==='range'){query.set('time','range');if(f.from)query.set('from',f.from);if(f.to)query.set('to',f.to);}}
function matchesDate(order,f){if(f.error)return false;if(f.mode==='all'||(f.mode==='range'&&!f.from&&!f.to))return true;const key=orderDateKey(order);if(!validDateKey(key))return false;if(f.mode==='month')return key.slice(0,4)===f.year&&(!f.month||key.slice(5,7)===f.month);return (!f.from||key>=f.from)&&(!f.to||key<=f.to);}
function renderDateFilter(){if(page!=='orders')return;const f=dateFilter();$('monthFields').hidden=f.mode!=='month';$('rangeFields').hidden=f.mode!=='range';$('dateFilterError').textContent=f.error;$('dateFilterError').hidden=!f.error;let text='Tất cả thời gian';if(f.mode==='month')text=f.month?`Tháng ${Number(f.month)}/${f.year}`:`Năm ${f.year}`;if(f.mode==='range')text=f.from&&f.to?`${displayDate(f.from)} – ${displayDate(f.to)}`:f.from?`Từ ${displayDate(f.from)}`:f.to?`Đến ${displayDate(f.to)}`:'Chọn khoảng ngày';$('dateFilterSummary').textContent=f.error?'Kiểm tra ngày đã chọn':text;}
function initDateFilters(){if(page!=='orders')return;const currentYear=orderDateKey({createdAt:new Date().toISOString()}).slice(0,4);$('fYear').value=params.get('year')||currentYear;const month=Number(params.get('month'));$('fMonth').value=Number.isInteger(month)&&month>=1&&month<=12?String(month).padStart(2,'0'):'';for(const [id,key] of [['fFrom','from'],['fTo','to']])if(validDateKey(params.get(key)||''))$(id).value=params.get(key);if(['month','range'].includes(params.get('time'))){$('fDateMode').value=params.get('time');$('timeFilters').open=true;}renderDateFilter();}
initDateFilters();
if(page==='orders'){$('q').value=params.get('q')||'';if(['newest','oldest','amount-asc'].includes(params.get('sort')))$('fSort').value=params.get('sort');if(DEL.includes(params.get('del')))$('fDel').value=params.get('del');const requestedPage=Number(params.get('page'));currentPage=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;}
if(page==='order'){$('cancelEdit').href=listReturn;$('backToOrders').href=listReturn;}

function validOrder(o){return o&&Number.isSafeInteger(o.version)&&o.version>0&&((typeof o.id==='number'&&Number.isSafeInteger(o.id))||(typeof o.id==='string'&&o.id.length>0))&&typeof o.name==='string'&&!!o.name.trim()&&typeof o.item==='string'&&!!o.item.trim()&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=0&&o.price<=9000000000&&Number.isSafeInteger(o.commission)&&o.commission>=0&&o.commission<=9000000000000&&PAY.includes(o.pay)&&DEL.includes(o.del)&&(o.note===undefined||typeof o.note==='string');}
function parseOrders(raw){const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(validOrder)||new Set(data.map(o=>o.id)).size!==data.length)throw new Error('Dữ liệu không hợp lệ');return data;}
function warning(message){if($('storageWarning')){$('storageWarning').textContent=message;$('storageWarning').hidden=!message;}}
function notify(message){clearTimeout(toastTimer);$('notification').textContent=message;if($('editor')){$('dialogNotice').textContent=message;$('dialogNotice').hidden=false;}toastTimer=setTimeout(()=>{$('notification').textContent='';},4500);}
function errorText(error){if(error?.status===401||error?.code==='PGRST301')return 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất rồi đăng nhập lại.';return error?.message||'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';}
function setBusy(value){busy=value;document.body.dataset.busy=String(value);for(const id of ['saveButton','logoutButton'])if($(id))$(id).disabled=value;for(const button of document.querySelectorAll('.deliver-order'))button.disabled=value;for(const field of $('orderForm')?.querySelectorAll('input,select')||[])field.disabled=value;}
async function refreshOrders({silent=false}={}){
 if(!authorized)return;const epoch=authEpoch,seq=++refreshSeq;
 try{const list=await cloud.list();if(epoch!==authEpoch||seq!==refreshSeq||!authorized)return;orders=parseOrders(JSON.stringify(list));dataLoaded=true;render();warning('');if($('syncStatus'))$('syncStatus').textContent='Đã đồng bộ · '+new Date().toLocaleTimeString('vi-VN');}
 catch(error){if(epoch!==authEpoch||seq!==refreshSeq)return;warning('Chưa tải được danh sách mới. '+errorText(error));if($('syncStatus'))$('syncStatus').textContent='Kết nối gián đoạn · danh sách có thể chưa cập nhật';if(!silent)notify(errorText(error));}
}
function stopSync(){clearInterval(pollTimer);pollTimer=null;if(channel){cloud.client.removeChannel(channel);channel=null;}}
async function applySession(session){
 const user=session?.user||null;if(!user&&!activeUser&&authEpoch>0)return;if(user&&authorized&&activeUser?.id===user.id)return;
 const epoch=++authEpoch;stopSync();authorized=false;activeUser=user;orders=[];dataLoaded=false;editorReady=false;editId=null;editVersion=null;if($('rows'))$('rows').replaceChildren();render();
 if($('sharedApp'))$('sharedApp').hidden=true;if($('accessPanel'))$('accessPanel').hidden=false;
 $('logoutButton').hidden=!user;setText('accountEmail',user?.email||'');
 if(!user){if(page!=='account'){location.replace(loginRoute());return;}setText('authStatus',window.cloudStartupError||'Nhập tài khoản do chủ cửa hàng cấp.');$('authPanel').hidden=false;$('accountDetails').hidden=true;return;}
 setText('authStatus','Đang kiểm tra quyền truy cập…');
 try{const member=await cloud.member();if(epoch!==authEpoch)return;authorized=true;
 if(page==='account'){$('authPanel').hidden=true;$('accountDetails').hidden=false;setText('memberEmail',user.email);setText('memberRole',member.role==='admin'?'Vai trò: Chủ cửa hàng':'Vai trò: Nhân viên');const next=safeRoute(params.get('next')||'index.html',['index.html','orders.html','order.html'],'index.html');$('accountContinue').href=next;if(params.has('next'))location.replace(next);return;}
 $('accessPanel').hidden=true;$('sharedApp').hidden=false;await refreshOrders();if(epoch!==authEpoch)return;
 channel=cloud.client.channel('shared-orders').on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>{if(!busy)refreshOrders({silent:true});}).subscribe();
 pollTimer=setInterval(()=>{if(!document.hidden&&!busy)refreshOrders({silent:true});},15000);
 }catch(error){if(epoch!==authEpoch)return;setText('authStatus',errorText(error));setText('accessTitle','Chưa thể truy cập');setText('accessStatus',errorText(error));if($('accessAccount'))$('accessAccount').href=loginRoute();}
}
async function startCloud(){
 if(!cloud){setText('authStatus',window.cloudStartupError);setText('accessStatus',window.cloudStartupError);if($('loginButton'))$('loginButton').disabled=true;return;}
 // Supabase auth callbacks must finish before starting further auth/API work.
 cloud.client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>applySession(session),0));
 try{const {data,error}=await cloud.client.auth.getSession();if(error)throw error;await applySession(data.session);}catch(error){setText('authStatus',errorText(error));setText('accessStatus',errorText(error));}
}
const fmt=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Math.round(n*1000));
const fmtCommission=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
// The form uses thousands of dong; persistence, totals and CSV use whole VND.
function commissionInputToVnd(value){const text=String(value).trim();if(!text)return 0;if(!/^(?:\d+(?:\.\d{0,3})?|\.\d{1,3})$/.test(text))return NaN;const [whole,fraction='']=text.split('.');const amount=BigInt(whole||'0')*1000n+BigInt(fraction.padEnd(3,'0')||'0');return amount<=9000000000000n?Number(amount):NaN;}
function commissionVndToInput(amount){const value=BigInt(amount);const whole=value/1000n;const fraction=String(value%1000n).padStart(3,'0').replace(/0+$/,'');return String(whole)+(fraction?'.'+fraction:'');}
const sumCommissions=list=>list.reduce((sum,o)=>sum+BigInt(o.commission),0n);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
function compareOrders(a,b,mode='newest'){
 const at=Date.parse(a.createdAt),bt=Date.parse(b.createdAt);
 const dateOrder=Number.isFinite(at)&&Number.isFinite(bt)?(mode==='oldest'?at-bt:bt-at):Number.isFinite(at)?-1:Number.isFinite(bt)?1:0;
 const tie=String(b.id).localeCompare(String(a.id),'en',{numeric:true});
 return (mode==='amount-asc'?a.price-b.price:0)||dateOrder||tie;
}
function filteredOrders(){const q=normalize($('q')?.value||''),fd=$('fDel')?.value||'all';const f=dateFilter();return orders.filter(o=>matchesDate(o,f)&&(fd==='all'||o.del===fd)&&normalize(o.name+' '+o.item).includes(q)).sort((a,b)=>compareOrders(a,b,$('fSort')?.value||'newest'));}
function cell(row,label,text,className){const td=document.createElement('td');td.dataset.label=label;if(text!==undefined)td.textContent=text;if(className)td.className=className;row.append(td);return td;}
function renderPagination(totalPages){
 for(const id of ['pagerTop','pagerBottom']){const nav=$(id);nav.replaceChildren();for(const [text,delta,disabled] of [['← Trước',-1,currentPage===1],['Sau →',1,currentPage===totalPages]]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=text;button.disabled=disabled;button.addEventListener('click',()=>{currentPage+=delta;render();document.querySelector('.order-list').scrollIntoView({block:'start'});const buttons=$('pagerTop').querySelectorAll('button');const target=buttons[delta===1?1:0];(target.disabled?buttons[delta===1?0:1]:target).focus({preventScroll:true});});if(delta===1){const status=document.createElement('span');status.textContent=`Trang ${currentPage} / ${totalPages}`;status.setAttribute('aria-live','polite');nav.append(status);}nav.append(button);}}
}
function render(){
 window.mayChatSync?.();
 if($('moreFilterSummary')){const active=[$('fDel')?.value].filter(value=>value&&value!=='all').length;$('moreFilterSummary').textContent=active?'· '+active+' đang lọc':'';}
 if(page==='order'){initEditor();return;}if(page==='account'||(page==='orders'&&!dataLoaded))return;
 const list=filteredOrders(),total=list.filter(o=>o.del!=='Đã hủy').reduce((s,o)=>s+o.price,0),delivered=orders.filter(o=>o.del==='Đã giao').length,undelivered=orders.filter(o=>o.del==='Chưa giao').length,cancelled=orders.filter(o=>o.del==='Đã hủy').length,unknown=orders.length-delivered-undelivered-cancelled;
 const stats=[['Tổng đơn hàng',orders.length,'Tất cả đơn đã lưu'],['Giá trị đơn chưa hủy',fmt(total),'Không tính các đơn đã hủy'],['Đã giao',delivered,'Đơn hoàn thành giao hàng'],['Chưa giao',undelivered,`${unknown} đơn chưa rõ trạng thái`],['Đã hủy',cancelled,'Đơn được giữ lại để đối chiếu'],['Hoa hồng đã nhận',fmtCommission(sumCommissions(orders)),'Cộng số đã nhận, kể cả đơn hủy']];
 if($('stats'))$('stats').replaceChildren(...stats.map(([title,value,detail],index)=>{const card=document.createElement('div');card.className='card';if(index===4)card.dataset.stat='cancelled';if(index===5)card.dataset.stat='commission';const marker=document.createElement('span');marker.className='stat-icon';marker.append(createIcon(['bag','wallet','check','clock','cancel','wallet'][index]));card.append(marker);for(const [tag,text] of [['span',title],['b',value],['small',detail]]){const node=document.createElement(tag);node.textContent=text;card.append(node);}return card;}));
 if($('statsSummary'))$('statsSummary').textContent=`${orders.length} đơn · Giá trị chưa hủy: ${fmt(orders.filter(o=>o.del!=='Đã hủy').reduce((sum,o)=>sum+o.price,0))} · ${undelivered} chưa giao · ${cancelled} đã hủy`;
 if(!$('rows'))return;renderDateFilter();
 for(const chip of document.querySelectorAll('[data-delivery-filter]')){const value=chip.dataset.deliveryFilter;chip.setAttribute('aria-pressed',String(value===$('fDel').value));chip.querySelector('.filter-count').textContent=value==='all'?orders.length:orders.filter(o=>o.del===value).length;}

 const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));currentPage=Math.min(Math.max(1,currentPage),totalPages);const start=(currentPage-1)*PAGE_SIZE;const pageOrders=list.slice(start,start+PAGE_SIZE);renderPagination(totalPages);updateListUrl();
 $('resultCount').textContent=`${list.length} / ${orders.length} đơn`;
 $('listSummary').textContent=`${list.length?start+1:0}–${Math.min(start+PAGE_SIZE,list.length)} / ${list.length} đơn khớp lọc · ${fmt(total)} (không tính đơn hủy) · Hoa hồng đã nhận: ${fmtCommission(sumCommissions(list))}`;
 const fragment=document.createDocumentFragment();
 for(const o of pageOrders){const row=document.createElement('tr');row.dataset.date=orderDateKey(o);row.dataset.delivery=o.del==='Đã giao'?'delivered':o.del==='Chưa giao'?'pending':o.del==='Đã hủy'?'cancelled':'unknown';const customer=cell(row,'Khách hàng / Hàng mua');const name=document.createElement('span');name.className='customer';name.textContent=o.name;const item=document.createElement('span');item.className='item';item.textContent=o.item;customer.append(name,item);cell(row,'Ngày tạo',displayDate(orderDateKey(o)),'order-date');cell(row,'Thanh toán',o.pay);cell(row,'Số tiền',fmt(o.price),'money');cell(row,'Hoa hồng đã nhận',fmtCommission(o.commission),'money commission-money');const delivery=cell(row,'Giao hàng');const tag=document.createElement('span');tag.className='tag '+(o.del==='Đã giao'?'done':o.del==='Chưa giao'?'not':o.del==='Đã hủy'?'cancelled':'');tag.textContent=o.del;tag.prepend(createIcon(o.del==='Đã giao'?'check':o.del==='Chưa giao'?'clock':o.del==='Đã hủy'?'cancel':'help'));delivery.append(tag);cell(row,'Ghi chú',o.note||'—','note');const actions=cell(row,'Thao tác');const group=document.createElement('div');group.className='actions';const edit=document.createElement('a');edit.className='button secondary';edit.textContent='Sửa';edit.prepend(createIcon('edit'));edit.href='order.html?id='+encodeURIComponent(o.id)+'&returnTo='+encodeURIComponent(listRoute());edit.setAttribute('aria-label','Sửa đơn của '+o.name);group.append(edit);if(o.del==='Chưa giao'){const deliver=document.createElement('button');deliver.type='button';deliver.className='deliver-order';deliver.textContent='Đã giao';deliver.disabled=busy;deliver.prepend(createIcon('check'));deliver.setAttribute('aria-label','Đánh dấu đã giao đơn của '+o.name);deliver.addEventListener('click',()=>markDelivered(o.id));group.prepend(deliver);}if(o.del!=='Đã hủy'){const cancel=document.createElement('button');cancel.type='button';cancel.className='cancel-order';cancel.textContent='Hủy đơn';cancel.prepend(createIcon('cancel'));cancel.setAttribute('aria-label','Hủy đơn của '+o.name);cancel.addEventListener('click',()=>cancelOrder(o.id));group.append(cancel);}const button=document.createElement('button');button.type='button';button.className='danger';button.textContent='Xóa';button.prepend(createIcon('trash'));button.setAttribute('aria-label','Xóa đơn của '+o.name);button.addEventListener('click',()=>delOrder(o.id));group.append(button);actions.append(group);fragment.append(row);}
 if(!list.length){const row=document.createElement('tr'),td=cell(row,'');td.colSpan=8;td.className='empty';const title=document.createElement('strong');title.textContent=dateFilter().error?'Kiểm tra bộ lọc thời gian':orders.length?'Không tìm thấy đơn phù hợp':'Chưa có đơn hàng';const detail=document.createElement('p');detail.textContent=dateFilter().error|| (orders.length?'Thử đổi từ khóa hoặc xóa bộ lọc.':'Nhấn “+ Thêm đơn” để tạo đơn đầu tiên.');td.append(title,detail);row.append(td);fragment.append(row);}
 $('rows').replaceChildren(fragment);
}
function initEditor(){
 if(!authorized||!dataLoaded||editorReady)return;editorReady=true;
 const requested=params.get('id');
 if(requested!==null){const order=orders.find(o=>String(o.id)===requested);if(!order){setText('pageTitle','Không tìm thấy đơn');setText('dialogNotice','Đơn không tồn tại hoặc đã bị xóa. Hãy quay lại danh sách.');$('dialogNotice').hidden=false;return;}
 editId=order.id;editVersion=order.version;
 for(const [field,key] of [['fName','name'],['fItem','item'],['fPrice','price'],['fCommission','commission'],['fPayIn','pay'],['fDelIn','del'],['fNote','note']])$(field).value=field==='fCommission'?commissionVndToInput(order.commission):order[key]??'';
 setText('createdDateHint','Ngày tạo đơn: '+displayDate(orderDateKey(order))+' · Giờ Việt Nam');setText('pageTitle','Chỉnh sửa đơn hàng');setText('formTitle','Đơn của '+order.name);setText('formMode','Đang sửa');setText('saveButton','Lưu thay đổi');setText('editNote','Lưu thay đổi để cập nhật đơn hàng dùng chung.');
 }
 $('saveButton').disabled=false;
}
async function saveOrder(e){e.preventDefault();if(busy||!authorized||!editorReady||!dataLoaded||$('saveButton').disabled)return;const o={name:$('fName').value.trim(),item:$('fItem').value.trim(),price:Number($('fPrice').value),commission:commissionInputToVnd($('fCommission').value),pay:$('fPayIn').value,del:$('fDelIn').value,note:$('fNote').value.trim()};
 for(const id of ['fName','fItem']){const input=$(id);input.setCustomValidity(input.value.trim()?'':'Vui lòng nhập nội dung, không chỉ khoảng trắng.');if(!input.reportValidity())return;}
 const id=editId??crypto.randomUUID();if(!validOrder({id,version:editVersion??1,...o})||$('fPrice').value.trim()===''){notify('Vui lòng kiểm tra thông tin và số tiền hợp lệ.');return;}
 const isEditing=editId!==null;if(isEditing&&!orders.some(x=>x.id===editId)){notify('Đơn này không còn tồn tại. Vui lòng quay lại danh sách.');return;}
 const epoch=authEpoch;const version=editVersion;setBusy(true);let saved;
 try{saved=isEditing?await cloud.update({id,...o},version):await cloud.insert(o);if(epoch!==authEpoch)return;
 refreshSeq++;editorDirty=false;location.assign(listReturn);

 }catch(error){if(epoch===authEpoch)notify('Chưa lưu được. '+(o.del==='Đã hủy'?cancelError(error):errorText(error)));}
 finally{setBusy(false);}
}

async function markDelivered(id){
 if(!authorized||busy)return;const order=orders.find(o=>o.id===id);if(!order||order.del!=='Chưa giao')return;
 const epoch=authEpoch;setBusy(true);
 try{const saved=await cloud.update({...order,del:'Đã giao'},order.version);if(epoch!==authEpoch)return;refreshSeq++;orders=orders.map(o=>o.id===id?saved:o);render();notify('Đã đánh dấu giao hàng thành công.');}
 catch(error){if(epoch===authEpoch)notify('Chưa cập nhật được trạng thái giao hàng. '+errorText(error));}
 finally{setBusy(false);}
}

function cancelError(error){if(error?.code==='23514')return 'Cơ sở dữ liệu chưa hỗ trợ trạng thái Đã hủy. Chủ cửa hàng cần chạy tệp supabase-cancel-orders.sql trong Supabase trước khi sử dụng.';return errorText(error);}
async function cancelOrder(id){
 if(!authorized||busy)return;const order=orders.find(o=>o.id===id);if(!order||order.del==='Đã hủy')return;
 if(!confirm(`Hủy đơn của ${order.name}? Đơn vẫn được giữ lại để đối chiếu và không tính vào giá trị đơn còn hiệu lực. Thao tác này không tự hoàn tiền.`))return;
 const epoch=authEpoch;setBusy(true);
 try{const saved=await cloud.update({...order,del:'Đã hủy'},order.version);if(epoch!==authEpoch)return;refreshSeq++;orders=orders.map(o=>o.id===id?saved:o);render();notify('Đã hủy đơn. Thông tin đơn được giữ lại, chưa thực hiện hoàn tiền.');}
 catch(error){if(epoch===authEpoch)notify('Chưa hủy được. '+cancelError(error));}
 finally{setBusy(false);}
}
async function delOrder(id){if(!authorized||busy)return;const order=orders.find(o=>o.id===id);if(!order||!confirm(`Xóa đơn của ${order.name}? Thao tác này không thể hoàn tác.`))return;const epoch=authEpoch;setBusy(true);try{await cloud.remove(order);if(epoch!==authEpoch)return;refreshSeq++;orders=orders.filter(o=>o.id!==id);render();notify('Đã xóa đơn hàng.');}catch(error){if(epoch===authEpoch)notify(errorText(error));}finally{setBusy(false);}}
function csvCell(value){let text=String(value??'');if(typeof value==='string'&&/^(?:[\t\r\n]|[\s\uFEFF]*[=+\-@])/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
function exportCSV(){const rows=[['Tên khách','Hàng mua','Phương thức thanh toán','Số tiền (nghìn đồng)','Giao hàng','Ghi chú','Hoa hồng đã nhận (đồng)','Ngày tạo (giờ Việt Nam)'],...orders.map(o=>[o.name,o.item,o.pay,o.price,o.del,o.note||'',o.commission,displayDate(orderDateKey(o))])];const csv=rows.map(r=>r.map(csvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='don-hang-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`Đã xuất ${orders.length} đơn hàng.`);}
function filterChanged(){currentPage=1;render();}
for(const id of ['fDateMode','fMonth','fYear','fFrom','fTo'])bind(id,'change',filterChanged);
for(const chip of document.querySelectorAll('[data-delivery-filter]'))chip.addEventListener('click',()=>{$('fDel').value=chip.dataset.deliveryFilter;filterChanged();});
bind('q','input',filterChanged);for(const id of ['fSort','fDel'])bind(id,'change',filterChanged);
bind('clearFilters','click',()=>{$('q').value='';$('fSort').value='newest';$('fDel').value='all';$('fDateMode').value='all';$('fMonth').value='';$('fFrom').value='';$('fTo').value='';filterChanged();});
bind('orderForm','submit',saveOrder);bind('exportButton','click',exportCSV);for(const id of ['fName','fItem'])bind(id,'input',()=>$(id).setCustomValidity(''));
bind('loginForm','submit',async event=>{event.preventDefault();if(!cloud)return;$('loginButton').disabled=true;setText('authStatus','Đang đăng nhập…');try{const login=$('email').value.trim();if(!login)throw new Error('Vui lòng nhập tên đăng nhập.');const email=login.includes('@')?login:login+'@admin.com';const {error}=await cloud.client.auth.signInWithPassword({email,password:$('password').value});if(error)throw error;$('password').value='';}catch(error){setText('authStatus','Đăng nhập không thành công. '+errorText(error));}finally{$('loginButton').disabled=false;}});
bind('logoutButton','click',async()=>{if(busy)return;const {error}=await cloud.client.auth.signOut({scope:'local'});if(error){notify(errorText(error));return;}editorDirty=false;applySession(null);});
bind('refreshButton','click',()=>refreshOrders());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&page!=='account')refreshOrders({silent:true});});
let editorDirty=false;bind('orderForm','input',()=>editorDirty=true);bind('orderForm','change',()=>editorDirty=true);
window.addEventListener('beforeunload',event=>{if(page==='order'&&(busy||editorDirty)){event.preventDefault();event.returnValue='';}});
render();startCloud();
