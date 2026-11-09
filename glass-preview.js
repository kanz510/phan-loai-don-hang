/* Kem & May main-layout Liquid Glass skin | local demo data only.
 * Intentionally NO Supabase, auth, API, fetch or external data access.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const page=document.body.dataset.page;
const storageKey='kem-may-glass-skin-demo-20261109';
const fmtVnd=n=>new Intl.NumberFormat('vi-VN').format(Math.round(n))+' đ';
const fmtAmount=k=>fmtVnd(k*1000);
const names=['Lan Anh','Thu Hà','Ngọc Quỳnh','Phương Thảo','Khánh Linh','Hồng Nhung','Minh Anh','Thu Trang','Ngọc Trâm','Hương Giang','Bảo Anh','Hà My'];
const items=['Áo len cổ tròn','Set đồ nữ','Váy xếp ly','Áo sơ mi','Túi xách','Giày búp bê','Áo khoác','Son dưỡng','Cardigan','Quần jeans'];
function sample(){
 const sizes=Array.from({length:83},(_,i)=>220+(i*97%460));
 const scale=37595/sizes.reduce((a,b)=>a+b,0);
 const prices=sizes.map(x=>Math.round(x*scale));
 prices[82]+=37595-prices.reduce((a,b)=>a+b,0);
 return prices.map((price,i)=>({
   id:i+1,name:names[i%names.length],item:items[(i*3)%items.length],
   price,commission:i<70?(i===0?120000:70000):0,
   pay:['CK','COD','Tiền mặt'][i%3],del:i<71?'Đã giao':'Chưa giao',
   note:i%9===0?'Khách quen':'',
   createdAt:new Date(Date.UTC(2026,10,9-(i%23),9+(i%9),15)).toISOString()
 }));
}
function load(){
 try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.length<2000)return saved;}catch{}
 return sample();
}
let orders=load();
const save=()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(orders))}catch{}};
const sum=(list,key)=>list.reduce((s,o)=>s+(Number(o[key])||0),0);
const totalVnd=()=>sum(orders.filter(o=>o.del!=='Đã hủy'),'price')*1000;
const expected=()=>sum(orders,'commission')+Math.round(sum(orders.filter(o=>o.commission===0),'price')*150);
const icon=name=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('icon');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','icons.svg#'+name);svg.append(use);return svg};
const add=(parent,tag,content,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;parent.append(el);return el};
function toast(message){const area=$('notification');if(area){area.textContent=message;setTimeout(()=>{if(area.textContent===message)area.textContent=''},3800)}}
function demoBadge(){const el=add(document.body,'div','XEM THỬ · KHÔNG DỮ LIỆU THẬT','demo-ribbon');el.setAttribute('aria-label','Đây là bản thiết kế demo, không kết nối dữ liệu thật');}
function initHeader(){
 document.querySelectorAll('a[href]').forEach(a=>{
   const raw=a.getAttribute('href')||'';
   const path=raw.split('?')[0];
   const names=['index','orders','order','account'];
   if(names.some(x=>path===x+'.html')){
     const next='glass-'+path+(raw.includes('?')?'?'+raw.split('?').slice(1).join('?'):'');
     a.setAttribute('href',next);
   }
 });
}
function setVisible(){
 if($('accessPanel'))$('accessPanel').hidden=true;
 if($('sharedApp'))$('sharedApp').hidden=false;
 if($('authPanel'))$('authPanel').hidden=true;
 if($('accountDetails'))$('accountDetails').hidden=false;
 if($('syncStatus'))$('syncStatus').textContent='Bản xem thử · dữ liệu minh họa';
 if($('refreshButton'))$('refreshButton').addEventListener('click',()=>toast('Đây là dữ liệu mẫu, không có đồng bộ thật.'));
}
function card(title,value,detail,mark,stat){
 const node=add($('stats'),'div',undefined,'card');if(stat)node.dataset.stat=stat;
 const logo=add(node,'span',undefined,'stat-icon');logo.append(icon(mark));
 add(node,'span',title);add(node,'b',value);add(node,'small',detail);return node;
}
function home(){
 const dt=new Date();const day=new Intl.DateTimeFormat('vi-VN',{weekday:'long',timeZone:'Asia/Ho_Chi_Minh'}).format(dt);
 if($('mayWeekday'))$('mayWeekday').textContent=day.charAt(0).toUpperCase()+day.slice(1);
 if($('mayCalendar'))$('mayCalendar').textContent='Ngày '+dt.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).replace(/^(\d{2})\/(\d{2})\/(\d{4})$/,'$1 tháng $2 năm $3');
 const counts={done:orders.filter(o=>o.del==='Đã giao').length,pending:orders.filter(o=>o.del==='Chưa giao').length,cancel:orders.filter(o=>o.del==='Đã hủy').length,unknown:orders.filter(o=>o.del==='Chưa rõ').length};
 $('stats').replaceChildren();
 card('Tổng đơn hàng',String(orders.length),'Tất cả đơn đã lưu','bag');
 card('Tổng giá trị đơn',fmtVnd(totalVnd()),'Không tính các đơn đã hủy','wallet');
 card('Đã giao',String(counts.done),'Đơn hoàn thành giao hàng','check');
 card('Chưa giao',String(counts.pending),counts.unknown+' đơn chưa rõ trạng thái','clock');
 card('Đã hủy',String(counts.cancel),'Đơn được giữ lại để đối chiếu','cancel','cancelled');
 card('Hoa hồng đã nhận',fmtVnd(sum(orders,'commission')),'Tổng hoa hồng dự kiến: '+fmtVnd(expected()),'wallet','commission');
 const rem=$('commissionReminder');if(rem){const n=orders.filter(o=>o.commission===0).length;rem.hidden=false;$('commissionReminderCount').textContent=n+' đơn';rem.setAttribute('href','glass-orders.html?commission=unreceived')}
}
function td(tr,label,text,cls){const e=add(tr,'td',text,cls);e.dataset.label=label;return e}
let currentPage=1,unreceived=false;
function dateFilter(o){
 const mode=$('fDateMode')?.value||'all', date=String(o.createdAt||'').slice(0,10);
 if(mode==='month'){const y=$('fYear')?.value||'2026',m=$('fMonth')?.value||'';return date.startsWith(y+(m?'-'+m:''))}
 if(mode==='range'){const from=$('fFrom')?.value||'',to=$('fTo')?.value||'';return (!from||date>=from)&&(!to||date<=to)}
 return true;
}
function matched(){
 const q=($('q')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const del=$('fDel')?.value||'all';
 const sort=$('fSort')?.value||'newest';
 const list=orders.filter(o=>(!unreceived||o.commission===0)&&(del==='all'||del===o.del)&&dateFilter(o)&&(o.name+' '+o.item).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
 list.sort((a,b)=>sort==='oldest'?Date.parse(a.createdAt)-Date.parse(b.createdAt):sort==='amount-asc'?a.price-b.price:sort==='amount-desc'?b.price-a.price:Date.parse(b.createdAt)-Date.parse(a.createdAt));
 return list;
}
function pager(id,max){const area=$(id);if(!area)return;area.replaceChildren();const prev=add(area,'button','← Trước','secondary');prev.type='button';prev.disabled=currentPage<=1;prev.addEventListener('click',()=>{currentPage--;renderOrders()});add(area,'span','Trang '+currentPage+' / '+max);const next=add(area,'button','Sau →','secondary');next.type='button';next.disabled=currentPage>=max;next.addEventListener('click',()=>{currentPage++;renderOrders()});}
function renderOrders(){
 const list=matched(),max=Math.max(1,Math.ceil(list.length/10));currentPage=Math.min(max,Math.max(1,currentPage));
 const cut=list.slice((currentPage-1)*10,currentPage*10);
 if($('resultCount'))$('resultCount').textContent=list.length+' / '+orders.length+' đơn';
 if($('statsSummary'))$('statsSummary').textContent=orders.length+' đơn · Giá trị chưa hủy: '+fmtVnd(totalVnd())+' · '+orders.filter(o=>o.del==='Chưa giao').length+' chưa giao · '+orders.filter(o=>o.del==='Đã hủy').length+' đã hủy';
 if($('listSummary'))$('listSummary').textContent=list.length+' đơn khớp lọc · '+fmtAmount(sum(list.filter(o=>o.del!=='Đã hủy'),'price'))+' (không tính đơn hủy) · Hoa hồng đã nhận: '+fmtVnd(sum(list,'commission'));
 if($('dateFilterSummary'))$('dateFilterSummary').textContent=$('fDateMode')?.value==='all'?'Tất cả thời gian':$('fDateMode')?.value==='month'?'Theo tháng / năm':'Theo khoảng ngày';
 if($('monthFields'))$('monthFields').hidden=$('fDateMode')?.value!=='month';
 if($('rangeFields'))$('rangeFields').hidden=$('fDateMode')?.value!=='range';
 document.querySelectorAll('[data-delivery-filter]').forEach(el=>{
   const value=el.dataset.deliveryFilter;el.setAttribute('aria-pressed',String(value===($('fDel')?.value||'all')&&!unreceived));
   const num=el.querySelector('.filter-count');if(num)num.textContent=value==='all'?orders.length:orders.filter(o=>o.del===value).length;
 });
 if($('unreceivedCommissionFilter')){$('unreceivedCommissionFilter').setAttribute('aria-pressed',String(unreceived));$('unreceivedCommissionFilter').querySelector('.filter-count').textContent=orders.filter(o=>o.commission===0).length}
 const body=$('rows');if(!body)return;body.replaceChildren();
 for(const o of cut){
   const tr=add(body,'tr');tr.dataset.delivery=o.del==='Đã giao'?'delivered':o.del==='Chưa giao'?'pending':o.del==='Đã hủy'?'cancelled':'unknown';
   const cell=td(tr,'Khách hàng / Hàng mua');add(cell,'span',o.name,'customer');add(cell,'span',o.item,'item');
   td(tr,'Ngày tạo',new Date(o.createdAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),'order-date');
   td(tr,'Thanh toán',o.pay);td(tr,'Số tiền',fmtAmount(o.price),'money');td(tr,'Hoa hồng đã nhận',fmtVnd(o.commission),'money commission-money');
   const d=td(tr,'Trạng thái');const tag=add(d,'span',o.del,'tag '+(o.del==='Đã giao'?'done':o.del==='Chưa giao'?'not':o.del==='Đã hủy'?'cancelled':''));tag.prepend(icon(o.del==='Đã giao'?'check':o.del==='Chưa giao'?'clock':'cancel'));
   td(tr,'Ghi chú',o.note||'—','note');
   const acts=td(tr,'Thao tác');const group=add(acts,'div',undefined,'actions');
   const edit=add(group,'a','Sửa','button secondary');edit.setAttribute('href','glass-order.html?id='+encodeURIComponent(o.id));edit.prepend(icon('edit'));
   if(o.del==='Chưa giao'){const deliver=add(group,'button','Đã giao','deliver-order');deliver.type='button';deliver.prepend(icon('check'));deliver.addEventListener('click',()=>{o.del='Đã giao';save();renderOrders();toast('Đã cập nhật đơn mẫu.')})}
   const cancel=add(group,'button',o.del==='Đã hủy'?'Khôi phục':'Hủy đơn','cancel-order');cancel.type='button';cancel.addEventListener('click',()=>{o.del=o.del==='Đã hủy'?'Chưa giao':'Đã hủy';save();renderOrders();toast('Đã đổi trạng thái đơn mẫu.')});
   const remove=add(group,'button','Xóa','danger');remove.type='button';remove.addEventListener('click',()=>{if(!confirm('Xóa đơn MẪU này?'))return;orders=orders.filter(a=>a.id!==o.id);save();renderOrders()});
 }
 if(!cut.length){const r=add(body,'tr');const c=td(r,'','Không có đơn phù hợp.');c.colSpan=8;c.className='empty'}
 pager('pagerTop',max);pager('pagerBottom',max);
}
function initList(){
 const url=new URLSearchParams(location.search);
 if(url.get('commission')==='unreceived')unreceived=true;
 if(url.has('q'))$('q').value=url.get('q');
 if(url.has('del'))$('fDel').value=url.get('del');
 if(url.has('sort'))$('fSort').value=url.get('sort');
 $('fYear').value='2026';
 $('fMonth').value='11';
 document.querySelectorAll('[data-delivery-filter]').forEach(button=>button.addEventListener('click',()=>{
   $('fDel').value=button.dataset.deliveryFilter;if(button.dataset.deliveryFilter==='all')unreceived=false;currentPage=1;renderOrders();
 }));
 $('unreceivedCommissionFilter')?.addEventListener('click',()=>{unreceived=!unreceived;currentPage=1;renderOrders()});
 for(const id of ['q','fSort','fDel','fDateMode','fMonth','fYear','fFrom','fTo'])$(id)?.addEventListener(id==='q'?'input':'change',()=>{currentPage=1;renderOrders()});
 $('clearFilters')?.addEventListener('click',()=>{unreceived=false;$('q').value='';$('fSort').value='newest';$('fDel').value='all';$('fDateMode').value='all';$('fFrom').value='';$('fTo').value='';currentPage=1;renderOrders()});
 $('exportButton')?.addEventListener('click',()=>{
   const data=[['Khách','Mặt hàng','Số tiền (nghìn đồng)','Hoa hồng (đồng)','Trạng thái'],...orders.map(o=>[o.name,o.item,o.price,o.commission,o.del])];
   const csv='\ufeff'+data.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
   const link=document.createElement('a'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'});link.href=URL.createObjectURL(blob);link.download='don-hang-demo.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);
 });
 renderOrders();
}
function initForm(){
 const id=new URLSearchParams(location.search).get('id');const old=orders.find(o=>String(o.id)===id);
 if(old){
   $('pageTitle').textContent='Chỉnh sửa đơn hàng';$('formTitle').textContent='Đơn của '+old.name;$('formMode').textContent='Đang sửa';$('saveButton').lastChild.textContent='Lưu thay đổi';
   for(const [key,id] of [['name','fName'],['item','fItem'],['price','fPrice'],['pay','fPayIn'],['del','fDelIn'],['note','fNote']])$(id).value=old[key]??'';
   $('fCommission').value=old.commission/1000;
 }
 $('saveButton').disabled=false;
 $('orderForm')?.addEventListener('submit',e=>{
   e.preventDefault();
   const entry={id:old?.id||Math.max(0,...orders.map(o=>Number(o.id)||0))+1,name:$('fName').value.trim(),item:$('fItem').value.trim(),price:Number($('fPrice').value),commission:Math.round(Number($('fCommission').value||0)*1000),pay:$('fPayIn').value,del:$('fDelIn').value,note:$('fNote').value.trim(),createdAt:old?.createdAt||new Date().toISOString()};
   if(!entry.name||!entry.item||!Number.isFinite(entry.price)||entry.price<0||!Number.isFinite(entry.commission)||entry.commission<0){toast('Vui lòng kiểm tra thông tin đơn.');return;}
   if(old)Object.assign(old,entry);else orders.unshift(entry);
   save();location.assign('glass-orders.html');
 });
}
function initAccount(){
 $('memberEmail').textContent='Tài khoản demo · Không kết nối dữ liệu thật';
 $('accountGreeting').textContent='Chào Admin';
 $('accountToolsMount').innerHTML='<div class="account-tool-buttons"><button type="button" class="secondary" id="demoPassword">Đổi mật khẩu</button><button type="button" class="secondary" id="demoHistory">Lịch sử chỉnh sửa</button></div><p class="hint" id="demoAccountHint">Các chức năng tài khoản thật đã được vô hiệu hóa trong bản xem thử.</p>';
 $('demoPassword').addEventListener('click',()=>toast('Bản preview không đổi mật khẩu thật.'));
 $('demoHistory').addEventListener('click',()=>toast('Bản preview không truy cập lịch sử thật.'));
 $('accountContinue').setAttribute('href','glass-index.html');
 $('emKemToggle')?.addEventListener('click',()=>{const el=$('emKemToggle');const on=el.getAttribute('aria-pressed')!=='true';el.setAttribute('aria-pressed',String(on));el.textContent=on?'Ẩn Em Kem':'Hiện Em Kem';$('emKemVisibilityStatus').textContent=on?'Em Kem đang hiển thị.':'Em Kem đã được ẩn trong màn xem thử.'});
}
function initChat(){
 if(page==='account')return;
 const host=document.createElement('aside');host.className='may-chat';host.innerHTML='<button type="button" class="may-chat-launch" aria-expanded="false" aria-label="Mở Em Kem"><span class="em-kem-bubble">May cần giúp gì ?</span><img class="em-kem-poodle" src="assets/em-kem-poodle-animated.webp" alt="Em Kem" width="96" height="100"></button><section class="may-chat-panel" hidden><header class="may-chat-head"><div><strong>Em Kem · Demo</strong><small>Tra cứu dữ liệu mẫu, không gọi AI</small></div><button type="button" class="secondary" id="demoChatClose">−</button></header><div class="may-chat-messages" id="demoChatMessages"><div class="may-chat-message bot"><p>Chào May! Đây là bản demo Liquid Glass. Hãy hỏi “đơn chưa giao” hoặc “hoa hồng”.</p></div></div><form class="may-chat-form" id="demoChatForm"><label for="demoChatInput">Bạn muốn xem gì?</label><div><input id="demoChatInput" placeholder="Ví dụ: Đơn chưa giao" required><button type="submit">Gửi</button></div></form></section>';
 document.body.append(host);
 const open=host.querySelector('.may-chat-launch'),panel=host.querySelector('.may-chat-panel');
 const toggle=value=>{panel.hidden=!value;open.setAttribute('aria-expanded',String(value))};
 open.addEventListener('click',()=>toggle(panel.hidden));$('demoChatClose').addEventListener('click',()=>toggle(false));
 $('demoChatForm').addEventListener('submit',e=>{
   e.preventDefault();const input=$('demoChatInput'),q=input.value.trim();if(!q)return;
   const box=$('demoChatMessages');const user=add(box,'div',undefined,'may-chat-message user');add(user,'p',q);
   const clean=q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   let reply='Bản demo chỉ tra cứu tổng quan mẫu. Có '+orders.length+' đơn, trong đó '+orders.filter(o=>o.del==='Chưa giao').length+' đơn chưa giao.';
   if(clean.includes('hoa hong'))reply='Hoa hồng đã nhận: '+fmtVnd(sum(orders,'commission'))+'. Tổng dự kiến: '+fmtVnd(expected())+' (giả định 15% giá trị đơn chưa nhận hoa hồng).';
   else if(clean.includes('chua giao'))reply='Có '+orders.filter(o=>o.del==='Chưa giao').length+' đơn chưa giao trong dữ liệu minh họa.';
   else if(clean.includes('tong'))reply='Tổng '+orders.length+' đơn. Giá trị chưa hủy: '+fmtVnd(totalVnd())+'.';
   const bot=add(box,'div',undefined,'may-chat-message bot');add(bot,'p',reply,'demo-message');input.value='';box.scrollTop=box.scrollHeight;
 });
}
document.addEventListener('DOMContentLoaded',()=>{
 initHeader();setVisible();demoBadge();
 if(page==='index')home();
 if(page==='orders')initList();
 if(page==='order')initForm();
 if(page==='account')initAccount();
 initChat();
});
})();
