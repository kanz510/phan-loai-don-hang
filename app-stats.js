function renderWelcomeDate(){
 if(!$('mayWeekday')||!$('mayCalendar'))return;
 const now=new Date();
 const weekday=new Intl.DateTimeFormat('vi-VN',{timeZone:ORDER_TIME_ZONE,weekday:'long'}).format(now);
 const parts=Object.fromEntries(new Intl.DateTimeFormat('vi-VN',{timeZone:ORDER_TIME_ZONE,day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(now).map(part=>[part.type,part.value]));
 $('mayWeekday').textContent=weekday.charAt(0).toUpperCase()+weekday.slice(1);
 $('mayCalendar').textContent=`Ngày ${parts.day} tháng ${parts.month} năm ${parts.year}`;
}
function renderStats(list,total){
 renderWelcomeDate();
 const delivered=orders.filter(o=>o.del==='Đã giao').length,undelivered=orders.filter(o=>o.del==='Chưa giao').length,cancelled=orders.filter(o=>o.del==='Đã hủy').length,unknown=orders.length-delivered-undelivered-cancelled;
 const stats=[['Tổng đơn hàng',orders.length,'Tất cả đơn đã lưu'],['Tổng giá trị đơn',fmt(total),'Không tính các đơn đã hủy'],['Đã giao',delivered,'Đơn hoàn thành giao hàng'],['Chưa giao',undelivered,`${unknown} đơn chưa rõ trạng thái`],['Đã hủy',cancelled,'Đơn được giữ lại để đối chiếu'],['Hoa hồng đã nhận',fmtCommission(sumCommissions(orders)),'Cộng số đã nhận, kể cả đơn hủy']];
 if($('stats'))$('stats').replaceChildren(...stats.map(([title,value,detail],index)=>{const card=document.createElement('div');card.className='card';if(index===4)card.dataset.stat='cancelled';if(index===5)card.dataset.stat='commission';const marker=document.createElement('span');marker.className='stat-icon';marker.append(createIcon(['bag','wallet','check','clock','cancel','wallet'][index]));card.append(marker);for(const [tag,text] of [['span',title],['b',value],['small',detail]]){const node=document.createElement(tag);node.textContent=text;card.append(node);}return card;}));
 if($('statsSummary'))$('statsSummary').textContent=`${orders.length} đơn · Giá trị chưa hủy: ${fmt(orders.filter(o=>o.del!=='Đã hủy').reduce((sum,o)=>sum+o.price,0))} · ${undelivered} chưa giao · ${cancelled} đã hủy`;
}

