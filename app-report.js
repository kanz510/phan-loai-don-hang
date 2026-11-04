/* Wave 3 reports: calculations from authorized, fully synchronized orders only.
   Currency is whole VND via BigInt; calendar grouping uses created_at in Vietnam.
   "Received commission" means the amount RECORDED on the order, not its receipt date. */
function reportOrderValueVnd(order){
 const value=Number(order.price);
 if(!Number.isFinite(value)||value<0||value>9000000000)throw new Error('Invalid order amount for report');
 const whole=Math.round(value*1000);
 if(!Number.isSafeInteger(whole))throw new Error('Order amount exceeds safe range');
 return BigInt(whole);
}
function reportEmptyMonth(year,month){
 return {year,month,count:0,delivered:0,undelivered:0,cancelled:0,unknown:0,
  pendingCommission:0,activeValueVnd:0n,receivedCommissionVnd:0n};
}
function reportMonthly(orders,year){
 if(!Number.isInteger(year)||year<1970||year>9999)throw new Error('Invalid report year');
 const months=Array.from({length:12},(_,i)=>reportEmptyMonth(year,i+1));
 for(const order of orders){
  const day=orderDateKey(order);
  if(!validDateKey(day)||Number(day.slice(0,4))!==year)continue;
  const bucket=months[Number(day.slice(5,7))-1];
  bucket.count++;
  if(order.del==='Đã giao')bucket.delivered++;
  else if(order.del==='Chưa giao')bucket.undelivered++;
  else if(order.del==='Đã hủy')bucket.cancelled++;
  else bucket.unknown++;
  if(order.del!=='Đã hủy')bucket.activeValueVnd+=reportOrderValueVnd(order);
  bucket.receivedCommissionVnd+=BigInt(order.commission);
  if(awaitingCommission(order))bucket.pendingCommission++;
 }
 return months;
}
function reportAggregate(months){
 return months.reduce((a,m)=>{
  a.count+=m.count;a.delivered+=m.delivered;a.undelivered+=m.undelivered;
  a.cancelled+=m.cancelled;a.unknown+=m.unknown;a.pendingCommission+=m.pendingCommission;
  a.activeValueVnd+=m.activeValueVnd;a.receivedCommissionVnd+=m.receivedCommissionVnd;
  return a;
 },reportEmptyMonth(0,0));
}
function reportSelection(orders,year,month){
 const series=reportMonthly(orders,year);
 const current=reportAggregate(month?series.filter(item=>item.month===month):series);
 const previousYear=month===1?year-1:year;
 const previousMonth=month===1?12:month-1;
 const previous=year<=1970&&!month?null:year===1970&&month===1?null:
  reportAggregate(reportMonthly(orders,previousYear).filter(item=>!month||item.month===previousMonth));
 return {series,current,previous};
}
function reportComparison(current,previous){
 if(!previous)return 'Không có kỳ trước để đối chiếu.';
 const metrics=[['Số đơn',BigInt(current.count),BigInt(previous.count),''],['Giá trị chưa hủy',current.activeValueVnd,previous.activeValueVnd,'đ'],['Hoa hồng đã ghi nhận',current.receivedCommissionVnd,previous.receivedCommissionVnd,'đ']];
 return metrics.map(([label,now,old,unit])=>{
  const difference=now-old;
  const sign=difference>0n?'+':'';
  const value=new Intl.NumberFormat('vi-VN').format(difference)+unit;
  const percent=old===0n?'kỳ trước = 0, không tính %':
   (Math.round(Number(difference*10000n/old))/100).toLocaleString('vi-VN',{maximumFractionDigits:2})+'%';
  return label+': '+sign+value+' ('+percent+')';
 }).join(' · ');
}
const reportVnd=number=>new Intl.NumberFormat('vi-VN').format(number)+'đ';
let reportInitialized=false;
function renderReport(list){
 const panel=$('reportPanel');
 if(!panel)return;
 if(!authorized||!dataLoaded){
  panel.hidden=true;
  $('reportChart').replaceChildren();$('reportTableBody').replaceChildren();
  $('reportSummary').replaceChildren();$('reportComparison').textContent='';
  return;
 }
 panel.hidden=false;
 const years=new Set([Number(orderDateKey({createdAt:new Date().toISOString()}).slice(0,4))]);
 for(const record of list){const key=orderDateKey(record);if(validDateKey(key))years.add(Number(key.slice(0,4)));}
 const yearSelect=$('reportYear');
 const firstYear=String([...years][0]);
 const selectedYear=yearSelect.value||firstYear;
 const values=[...years].sort((a,b)=>b-a).map(String);
 if(!values.includes(selectedYear))values.push(selectedYear);
 values.sort((a,b)=>Number(b)-Number(a));
 if(Array.from(yearSelect.options).map(o=>o.value).join('|')!==values.join('|')){
  yearSelect.replaceChildren(...values.map(year=>{const option=document.createElement('option');option.value=year;option.textContent='Năm '+year;return option;}));
 }
 yearSelect.value=selectedYear;
 const year=Number(selectedYear),month=Number($('reportMonth').value||0);
 const {series,current,previous}=reportSelection(list,year,month);
 const label=month?'Tháng '+month+'/'+year:'Năm '+year;
 $('reportPeriodTitle').textContent=label;
 const fields=[
  ['Số đơn tạo',String(current.count)],
  ['Giá trị đơn chưa hủy',reportVnd(current.activeValueVnd)],
  ['Hoa hồng đã ghi nhận',reportVnd(current.receivedCommissionVnd)],
  ['Chưa nhận hoa hồng',String(current.pendingCommission)+' đơn']
 ];
 $('reportSummary').replaceChildren(...fields.map(([name,value])=>{
  const item=document.createElement('div');item.className='report-kpi';
  const labelNode=document.createElement('span');labelNode.textContent=name;
  const valueNode=document.createElement('strong');valueNode.textContent=value;
  item.append(labelNode,valueNode);return item;
 }));
 $('reportComparison').textContent='So với '+(month?'tháng trước':'năm trước')+': '+reportComparison(current,previous);
 $('reportOrdersLink').href='orders.html?time=month&year='+year+(month?'&month='+String(month).padStart(2,'0'):'');
 const metric=$('reportMetric').value;
 const metricValue=m=>metric==='count'?BigInt(m.count):metric==='commission'?m.receivedCommissionVnd:m.activeValueVnd;
 const maximum=series.reduce((largest,item)=>metricValue(item)>largest?metricValue(item):largest,0n);
 const bars=series.map(entry=>{
  const btn=document.createElement('button');btn.type='button';btn.className='report-bar';
  if(month===entry.month)btn.classList.add('is-selected');
  const value=metricValue(entry),ratio=maximum?Number(value*1000n/maximum)/10:0;
  const bar=document.createElement('span');bar.className='report-bar-track';
  const fill=document.createElement('span');fill.className='report-bar-fill';
  fill.style.height=(value===0n?0:Math.max(3,ratio))+'%';
  bar.append(fill);
  const text=document.createElement('span');text.className='report-bar-label';text.textContent=String(entry.month);
  btn.setAttribute('aria-label','Tháng '+entry.month+'/'+year+': '+(metric==='count'?value+' đơn':reportVnd(value))+'. Xem báo cáo tháng này.');
  btn.setAttribute('aria-pressed',String(month===entry.month));
  btn.title=btn.getAttribute('aria-label');
  btn.append(bar,text);
  btn.addEventListener('click',()=>{
   $('reportMonth').value=String(month===entry.month?'':entry.month);
   renderReport(orders);
  });
  return btn;
 });
 $('reportChart').replaceChildren(...bars);
 $('reportTableBody').replaceChildren(...series.map(entry=>{
  const row=document.createElement('tr');
  for(const field of [String(entry.month).padStart(2,'0')+'/'+year,entry.count,entry.delivered,entry.undelivered,entry.cancelled,
   entry.pendingCommission,entry.activeValueVnd.toString(),entry.receivedCommissionVnd.toString()]){
   const cell=document.createElement('td');cell.textContent=String(field);row.append(cell);
  }
  return row;
 }));
}
function downloadReportCSV(){
 if(!authorized||!dataLoaded)return;
 const year=Number($('reportYear')?.value);
 if(!Number.isInteger(year)||year<1970||year>9999)return;
 const rows=[['Tháng','Đơn tạo','Đã giao','Chưa giao','Đã hủy','Chưa rõ','Chưa hoa hồng',
   'Giá trị chưa hủy (đồng)','Hoa hồng ghi nhận (đồng)']];
 for(const month of reportMonthly(orders,year)){
  rows.push([String(month.month).padStart(2,'0')+'/'+year,month.count,month.delivered,month.undelivered,
   month.cancelled,month.unknown,month.pendingCommission,month.activeValueVnd.toString(),month.receivedCommissionVnd.toString()]);
 }
 downloadCSVRows(rows,'bao-cao-theo-thang-'+year+'.csv');
 notify('Đã xuất báo cáo 12 tháng của năm '+year+'.');
}
function initReport(){
 if(!$('reportPanel')||reportInitialized)return;
 reportInitialized=true;
 for(const id of ['reportYear','reportMonth','reportMetric'])bind(id,'change',()=>renderReport(orders));
 bind('reportExport','click',downloadReportCSV);
}