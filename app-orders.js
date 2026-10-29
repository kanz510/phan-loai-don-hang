function updateListUrl(){if(page!=='orders')return;const query=new URLSearchParams();if($('q').value)query.set('q',$('q').value);if($('fSort').value!=='newest')query.set('sort',$('fSort').value);if($('fDel').value!=='all')query.set('del',$('fDel').value);appendDateParams(query);if(currentPage>1)query.set('page',currentPage);history.replaceState(null,'','orders.html'+(query.size?'?'+query:''));if($('addOrder'))$('addOrder').href='order.html?returnTo='+encodeURIComponent(listRoute());}

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
function compareOrders(a,b,mode='newest'){
 const at=Date.parse(a.createdAt),bt=Date.parse(b.createdAt);
 const dateOrder=Number.isFinite(at)&&Number.isFinite(bt)?(mode==='oldest'?at-bt:bt-at):Number.isFinite(at)?-1:Number.isFinite(bt)?1:0;
 const tie=String(b.id).localeCompare(String(a.id),'en',{numeric:true});
 return (mode==='amount-asc'?a.price-b.price:mode==='amount-desc'?b.price-a.price:0)||dateOrder||tie;
}
function filteredOrders(){const q=normalize($('q')?.value||''),fd=$('fDel')?.value||'all';const f=dateFilter();return orders.filter(o=>matchesDate(o,f)&&(fd==='all'||o.del===fd)&&normalize(o.name+' '+o.item).includes(q)).sort((a,b)=>compareOrders(a,b,$('fSort')?.value||'newest'));}
function cell(row,label,text,className){const td=document.createElement('td');td.dataset.label=label;if(text!==undefined)td.textContent=text;if(className)td.className=className;row.append(td);return td;}
function renderPagination(totalPages){
 for(const id of ['pagerTop','pagerBottom']){const nav=$(id);nav.replaceChildren();for(const [text,delta,disabled] of [['← Trước',-1,currentPage===1],['Sau →',1,currentPage===totalPages]]){const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=text;button.disabled=disabled;button.addEventListener('click',()=>{currentPage+=delta;render();document.querySelector('.order-list').scrollIntoView({block:'start'});const buttons=$('pagerTop').querySelectorAll('button');const target=buttons[delta===1?1:0];(target.disabled?buttons[delta===1?0:1]:target).focus({preventScroll:true});});if(delta===1){const status=document.createElement('span');status.textContent=`Trang ${currentPage} / ${totalPages}`;status.setAttribute('aria-live','polite');nav.append(status);}nav.append(button);}}
}

function renderOrderList(list,total){
 if(!$('rows'))return;renderDateFilter();
 for(const chip of document.querySelectorAll('[data-delivery-filter]')){const value=chip.dataset.deliveryFilter;chip.setAttribute('aria-pressed',String(value===$('fDel').value));chip.querySelector('.filter-count').textContent=value==='all'?orders.length:orders.filter(o=>o.del===value).length;}

 const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));currentPage=Math.min(Math.max(1,currentPage),totalPages);const start=(currentPage-1)*PAGE_SIZE;const pageOrders=list.slice(start,start+PAGE_SIZE);renderPagination(totalPages);updateListUrl();
 $('resultCount').textContent=`${list.length} / ${orders.length} đơn`;
 $('listSummary').textContent=`${list.length?start+1:0}–${Math.min(start+PAGE_SIZE,list.length)} / ${list.length} đơn khớp lọc · ${fmt(total)} (không tính đơn hủy) · Hoa hồng đã nhận: ${fmtCommission(sumCommissions(list))}`;
 const fragment=document.createDocumentFragment();
 for(const o of pageOrders){const row=document.createElement('tr');row.dataset.date=orderDateKey(o);row.dataset.delivery=o.del==='Đã giao'?'delivered':o.del==='Chưa giao'?'pending':o.del==='Đã hủy'?'cancelled':'unknown';const customer=cell(row,'Khách hàng / Hàng mua');const name=document.createElement('span');name.className='customer';name.textContent=o.name;const item=document.createElement('span');item.className='item';item.textContent=o.item;customer.append(name,item);cell(row,'Ngày tạo',displayDate(orderDateKey(o)),'order-date');cell(row,'Thanh toán',o.pay);cell(row,'Số tiền',fmt(o.price),'money');cell(row,'Hoa hồng đã nhận',fmtCommission(o.commission),'money commission-money');const delivery=cell(row,'Trạng thái');const tag=document.createElement('span');tag.className='tag '+(o.del==='Đã giao'?'done':o.del==='Chưa giao'?'not':o.del==='Đã hủy'?'cancelled':'');tag.textContent=o.del;tag.prepend(createIcon(o.del==='Đã giao'?'check':o.del==='Chưa giao'?'clock':o.del==='Đã hủy'?'cancel':'help'));delivery.append(tag);cell(row,'Ghi chú',o.note||'—','note');const actions=cell(row,'Thao tác');const group=document.createElement('div');group.className='actions';const edit=document.createElement('a');edit.className='button secondary';edit.textContent='Sửa';edit.prepend(createIcon('edit'));edit.href='order.html?id='+encodeURIComponent(o.id)+'&returnTo='+encodeURIComponent(listRoute());edit.setAttribute('aria-label','Sửa đơn của '+o.name);group.append(edit);if(o.del==='Chưa giao'){const deliver=document.createElement('button');deliver.type='button';deliver.className='deliver-order';deliver.textContent='Đã giao';deliver.disabled=busy;deliver.prepend(createIcon('check'));deliver.setAttribute('aria-label','Đánh dấu đã giao đơn của '+o.name);deliver.addEventListener('click',()=>markDelivered(o.id));group.prepend(deliver);}if(o.del!=='Đã hủy'){const cancel=document.createElement('button');cancel.type='button';cancel.className='cancel-order';cancel.textContent='Hủy đơn';cancel.prepend(createIcon('cancel'));cancel.setAttribute('aria-label','Hủy đơn của '+o.name);cancel.addEventListener('click',()=>cancelOrder(o.id));group.append(cancel);}const button=document.createElement('button');button.type='button';button.className='danger';button.textContent='Xóa';button.prepend(createIcon('trash'));button.setAttribute('aria-label','Xóa đơn của '+o.name);button.addEventListener('click',()=>delOrder(o.id));group.append(button);actions.append(group);fragment.append(row);}
 if(!list.length){const row=document.createElement('tr'),td=cell(row,'');td.colSpan=8;td.className='empty';const title=document.createElement('strong');title.textContent=dateFilter().error?'Kiểm tra bộ lọc thời gian':orders.length?'Không tìm thấy đơn phù hợp':'Chưa có đơn hàng';const detail=document.createElement('p');detail.textContent=dateFilter().error|| (orders.length?'Thử đổi từ khóa hoặc xóa bộ lọc.':'Nhấn “+ Thêm đơn” để tạo đơn đầu tiên.');td.append(title,detail);row.append(td);fragment.append(row);}
 $('rows').replaceChildren(fragment);
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
function initOrderList(){
initDateFilters();
if(page==='orders'){$('q').value=params.get('q')||'';if(['newest','oldest','amount-asc','amount-desc'].includes(params.get('sort')))$('fSort').value=params.get('sort');if(DEL.includes(params.get('del')))$('fDel').value=params.get('del');const requestedPage=Number(params.get('page'));currentPage=Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1;}
for(const id of ['fDateMode','fMonth','fYear','fFrom','fTo'])bind(id,'change',filterChanged);
for(const chip of document.querySelectorAll('[data-delivery-filter]'))chip.addEventListener('click',()=>{$('fDel').value=chip.dataset.deliveryFilter;filterChanged();});
bind('q','input',filterChanged);for(const id of ['fSort','fDel'])bind(id,'change',filterChanged);
bind('clearFilters','click',()=>{$('q').value='';$('fSort').value='newest';$('fDel').value='all';$('fDateMode').value='all';$('fMonth').value='';$('fFrom').value='';$('fTo').value='';filterChanged();});


bind('exportButton','click',exportCSV);
}
