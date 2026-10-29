
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
function updateListUrl(){if(page!=='orders')return;const query=new URLSearchParams();if($('q').value)query.set('q',$('q').value);if($('fPay').value!=='all')query.set('pay',$('fPay').value);if($('fDel').value!=='all')query.set('del',$('fDel').value);if(currentPage>1)query.set('page',currentPage);history.replaceState(null,'','orders.html'+(query.size?'?'+query:''));if($('addOrder'))$('addOrder').href='order.html?returnTo='+encodeURIComponent(listRoute());}

const PAY=['Chưa rõ','CK','COD','Tiền mặt','Chưa thanh toán'], DEL=['Chưa rõ','Đã giao','Chưa giao'];
let orders=[],editId=null,editVersion=null,toastTimer,currentPage=1,activeUser=null,authorized=false,busy=false,authEpoch=0,refreshSeq=0,channel=null,pollTimer=null;
const PAGE_SIZE=10;
let dataLoaded=false,editorReady=false;
if(page==='orders'){$('q').value=params.get('q')||'';if(PAY.includes(params.get('pay')))$('fPay').value=params.get('pay');if(DEL.includes(params.get('del')))$('fDel').value=params.get('del');const requestedPage=Number(params.get('page'));currentPage=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;}
if(page==='order'){$('cancelEdit').href=listReturn;$('backToOrders').href=listReturn;}

function validOrder(o){return o&&Number.isSafeInteger(o.version)&&o.version>0&&((typeof o.id==='number'&&Number.isSafeInteger(o.id))||(typeof o.id==='string'&&o.id.length>0))&&typeof o.name==='string'&&!!o.name.trim()&&typeof o.item==='string'&&!!o.item.trim()&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=0&&o.price<=9000000000&&PAY.includes(o.pay)&&DEL.includes(o.del)&&(o.note===undefined||typeof o.note==='string');}
function parseOrders(raw){const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(validOrder)||new Set(data.map(o=>o.id)).size!==data.length)throw new Error('Dữ liệu không hợp lệ');return data;}
function warning(message){if($('storageWarning')){$('storageWarning').textContent=message;$('storageWarning').hidden=!message;}}
function notify(message){clearTimeout(toastTimer);$('notification').textContent=message;if($('editor')){$('dialogNotice').textContent=message;$('dialogNotice').hidden=false;}toastTimer=setTimeout(()=>{$('notification').textContent='';},4500);}
function errorText(error){if(error?.status===401||error?.code==='PGRST301')return 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất rồi đăng nhập lại.';return error?.message||'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';}
function setBusy(value){busy=value;document.body.dataset.busy=String(value);for(const id of ['saveButton','logoutButton'])if($(id))$(id).disabled=value;for(const field of $('orderForm')?.querySelectorAll('input,select')||[])field.disabled=value;}
async function refreshOrders({silent=false}={}){
 if(!authorized)return;const epoch=authEpoch,seq=++refreshSeq;
 try{const list=await cloud.list();if(epoch!==authEpoch||seq!==refreshSeq||!authorized)return;orders=parseOrders(JSON.stringify(list));dataLoaded=true;render();warning('');if($('syncStatus'))$('syncStatus').textContent='Đã đồng bộ · '+new Date().toLocaleTimeString('vi-VN');}
 catch(error){if(epoch!==authEpoch||seq!==refreshSeq)return;warning('Chưa tải được danh sách mới. '+errorText(error));if($('syncStatus'))$('syncStatus').textContent='Kết nối gián đoạn · danh sách có thể chưa cập nhật';if(!silent)notify(errorText(error));}
}
function stopSync(){clearInterval(pollTimer);pollTimer=null;if(channel){cloud.client.removeChannel(channel);channel=null;}}
async function applySession(session){
 const user=session?.user||null;if(user&&authorized&&activeUser?.id===user.id)return;
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
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
function filteredOrders(){const q=normalize($('q')?.value||''),fp=$('fPay')?.value||'all',fd=$('fDel')?.value||'all';return orders.filter(o=>(fp==='all'||o.pay===fp)&&(fd==='all'||o.del===fd)&&normalize(o.name+' '+o.item).includes(q));}
function cell(row,label,text,className){const td=document.createElement('td');td.dataset.label=label;if(text!==undefined)td.textContent=text;if(className)td.className=className;row.append(td);return td;}
function renderPagination(totalPages){
 for(const id of ['pagerTop','pagerBottom']){const nav=$(id);nav.replaceChildren();for(const [text,delta,disabled] of [['← Trước',-1,currentPage===1],['Sau →',1,currentPage===totalPages]]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=text;button.disabled=disabled;button.addEventListener('click',()=>{currentPage+=delta;render();document.querySelector('.order-list').scrollIntoView({block:'start'});const buttons=$('pagerTop').querySelectorAll('button');const target=buttons[delta===1?1:0];(target.disabled?buttons[delta===1?0:1]:target).focus({preventScroll:true});});if(delta===1){const status=document.createElement('span');status.textContent=`Trang ${currentPage} / ${totalPages}`;status.setAttribute('aria-live','polite');nav.append(status);}nav.append(button);}}
}
function render(){
 if(page==='order'){initEditor();return;}if(page==='account'||(page==='orders'&&!dataLoaded))return;
 const list=filteredOrders(),total=list.reduce((s,o)=>s+o.price,0),delivered=orders.filter(o=>o.del==='Đã giao').length,undelivered=orders.filter(o=>o.del==='Chưa giao').length,unknown=orders.length-delivered-undelivered;
 const stats=[['Tổng đơn hàng',orders.length,'Tất cả đơn đã lưu'],['Tổng giá trị đơn hàng',fmt(total),'Giá trị tất cả đơn đã lưu'],['Đã giao',delivered,'Đơn hoàn thành giao hàng'],['Chưa giao',undelivered,`${unknown} đơn chưa rõ trạng thái`]];
 if($('stats'))$('stats').replaceChildren(...stats.map(([title,value,detail],index)=>{const card=document.createElement('div');card.className='card';const marker=document.createElement('span');marker.className='stat-icon';marker.append(createIcon(['bag','wallet','check','clock'][index]));card.append(marker);for(const [tag,text] of [['span',title],['b',value],['small',detail]]){const node=document.createElement(tag);node.textContent=text;card.append(node);}return card;}));
 if($('statsSummary'))$('statsSummary').textContent=`${orders.length} đơn · ${fmt(orders.reduce((sum,o)=>sum+o.price,0))} · ${undelivered} chưa giao`;
 if(!$('rows'))return;
 for(const chip of document.querySelectorAll('[data-delivery-filter]')){const value=chip.dataset.deliveryFilter;chip.setAttribute('aria-pressed',String(value===$('fDel').value));chip.querySelector('.filter-count').textContent=value==='all'?orders.length:orders.filter(o=>o.del===value).length;}

 const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));currentPage=Math.min(Math.max(1,currentPage),totalPages);const start=(currentPage-1)*PAGE_SIZE;const pageOrders=list.slice(start,start+PAGE_SIZE);renderPagination(totalPages);updateListUrl();
 $('resultCount').textContent=`${list.length} / ${orders.length} đơn`;
 $('listSummary').textContent=`${list.length?start+1:0}–${Math.min(start+PAGE_SIZE,list.length)} / ${list.length} đơn khớp lọc · ${fmt(total)}`;
 const fragment=document.createDocumentFragment();
 for(const o of pageOrders){const row=document.createElement('tr');row.dataset.delivery=o.del==='Đã giao'?'delivered':o.del==='Chưa giao'?'pending':'unknown';const customer=cell(row,'Khách hàng / Hàng mua');const name=document.createElement('span');name.className='customer';name.textContent=o.name;const item=document.createElement('span');item.className='item';item.textContent=o.item;customer.append(name,item);cell(row,'Thanh toán',o.pay);cell(row,'Số tiền',fmt(o.price),'money');const delivery=cell(row,'Giao hàng');const tag=document.createElement('span');tag.className='tag '+(o.del==='Đã giao'?'done':o.del==='Chưa giao'?'not':'');tag.textContent=o.del;tag.prepend(createIcon(o.del==='Đã giao'?'check':o.del==='Chưa giao'?'clock':'help'));delivery.append(tag);cell(row,'Ghi chú',o.note||'—','note');const actions=cell(row,'Thao tác');const group=document.createElement('div');group.className='actions';const edit=document.createElement('a');edit.className='button secondary';edit.textContent='Sửa';edit.prepend(createIcon('edit'));edit.href='order.html?id='+encodeURIComponent(o.id)+'&returnTo='+encodeURIComponent(listRoute());edit.setAttribute('aria-label','Sửa đơn của '+o.name);group.append(edit);const button=document.createElement('button');button.type='button';button.className='danger';button.textContent='Xóa';button.prepend(createIcon('trash'));button.setAttribute('aria-label','Xóa đơn của '+o.name);button.addEventListener('click',()=>delOrder(o.id));group.append(button);actions.append(group);fragment.append(row);}
 if(!list.length){const row=document.createElement('tr'),td=cell(row,'');td.colSpan=6;td.className='empty';const title=document.createElement('strong');title.textContent=orders.length?'Không tìm thấy đơn phù hợp':'Chưa có đơn hàng';const detail=document.createElement('p');detail.textContent=orders.length?'Thử đổi từ khóa hoặc xóa bộ lọc.':'Nhấn “+ Thêm đơn” để tạo đơn đầu tiên.';td.append(title,detail);row.append(td);fragment.append(row);}
 $('rows').replaceChildren(fragment);
}
function initEditor(){
 if(!authorized||!dataLoaded||editorReady)return;editorReady=true;
 const requested=params.get('id');
 if(requested!==null){const order=orders.find(o=>String(o.id)===requested);if(!order){setText('pageTitle','Không tìm thấy đơn');setText('dialogNotice','Đơn không tồn tại hoặc đã bị xóa. Hãy quay lại danh sách.');$('dialogNotice').hidden=false;return;}
 editId=order.id;editVersion=order.version;
 for(const [field,key] of [['fName','name'],['fItem','item'],['fPrice','price'],['fPayIn','pay'],['fDelIn','del'],['fNote','note']])$(field).value=order[key]??'';
 setText('pageTitle','Chỉnh sửa đơn hàng');setText('formTitle','Đơn của '+order.name);setText('formMode','Đang sửa');setText('saveButton','Lưu thay đổi');setText('editNote','Lưu thay đổi để cập nhật đơn hàng dùng chung.');
 }
 $('saveButton').disabled=false;
}
async function saveOrder(e){e.preventDefault();if(busy||!authorized||!editorReady||!dataLoaded||$('saveButton').disabled)return;const o={name:$('fName').value.trim(),item:$('fItem').value.trim(),price:Number($('fPrice').value),pay:$('fPayIn').value,del:$('fDelIn').value,note:$('fNote').value.trim()};
 for(const id of ['fName','fItem']){const input=$(id);input.setCustomValidity(input.value.trim()?'':'Vui lòng nhập nội dung, không chỉ khoảng trắng.');if(!input.reportValidity())return;}
 const id=editId??crypto.randomUUID();if(!validOrder({id,version:editVersion??1,...o})||$('fPrice').value.trim()===''){notify('Vui lòng kiểm tra thông tin và số tiền hợp lệ.');return;}
 const isEditing=editId!==null;if(isEditing&&!orders.some(x=>x.id===editId)){notify('Đơn này không còn tồn tại. Vui lòng quay lại danh sách.');return;}
 const epoch=authEpoch;const version=editVersion;setBusy(true);let saved;
 try{saved=isEditing?await cloud.update({id,...o},version):await cloud.insert(o);if(epoch!==authEpoch)return;
 refreshSeq++;editorDirty=false;location.assign(listReturn);

 }catch(error){if(epoch===authEpoch)notify('Chưa lưu được. '+errorText(error));}
 finally{setBusy(false);}
}

async function delOrder(id){if(!authorized||busy)return;const order=orders.find(o=>o.id===id);if(!order||!confirm(`Xóa đơn của ${order.name}? Thao tác này không thể hoàn tác.`))return;const epoch=authEpoch;setBusy(true);try{await cloud.remove(order);if(epoch!==authEpoch)return;refreshSeq++;orders=orders.filter(o=>o.id!==id);render();notify('Đã xóa đơn hàng.');}catch(error){if(epoch===authEpoch)notify(errorText(error));}finally{setBusy(false);}}
function csvCell(value){let text=String(value??'');if(typeof value==='string'&&/^(?:[\t\r\n]|[\s\uFEFF]*[=+\-@])/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
function exportCSV(){const rows=[['Tên khách','Hàng mua','Phương thức thanh toán','Số tiền (nghìn đồng)','Giao hàng','Ghi chú'],...orders.map(o=>[o.name,o.item,o.pay,o.price,o.del,o.note||''])];const csv=rows.map(r=>r.map(csvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='don-hang-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`Đã xuất ${orders.length} đơn hàng.`);}
function filterChanged(){currentPage=1;render();}
for(const chip of document.querySelectorAll('[data-delivery-filter]'))chip.addEventListener('click',()=>{$('fDel').value=chip.dataset.deliveryFilter;filterChanged();});
bind('q','input',filterChanged);for(const id of ['fPay','fDel'])bind(id,'change',filterChanged);
bind('clearFilters','click',()=>{$('q').value='';$('fPay').value='all';$('fDel').value='all';filterChanged();});
bind('orderForm','submit',saveOrder);bind('exportButton','click',exportCSV);for(const id of ['fName','fItem'])bind(id,'input',()=>$(id).setCustomValidity(''));
bind('loginForm','submit',async event=>{event.preventDefault();if(!cloud)return;$('loginButton').disabled=true;setText('authStatus','Đang đăng nhập…');try{const {error}=await cloud.client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';}catch(error){setText('authStatus','Đăng nhập không thành công. '+errorText(error));}finally{$('loginButton').disabled=false;}});
bind('logoutButton','click',async()=>{if(busy)return;const {error}=await cloud.client.auth.signOut({scope:'local'});if(error){notify(errorText(error));return;}editorDirty=false;applySession(null);});
bind('refreshButton','click',()=>refreshOrders());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&page!=='account')refreshOrders({silent:true});});
let editorDirty=false;bind('orderForm','input',()=>editorDirty=true);bind('orderForm','change',()=>editorDirty=true);
window.addEventListener('beforeunload',event=>{if(page==='order'&&(busy||editorDirty)){event.preventDefault();event.returnValue='';}});
render();startCloud();
