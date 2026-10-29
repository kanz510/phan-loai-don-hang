/* Local, read-only assistant. No chat history or order data leaves this page. */
(()=>{
 if(page==='account')return;
 const host=document.createElement('aside');host.className='may-chat';host.hidden=true;
 host.innerHTML=`<button type="button" class="may-chat-launch" id="chatLauncher" aria-expanded="false" aria-controls="chatPanel">✦ <span>Hỏi May</span></button><section id="chatPanel" class="may-chat-panel" aria-labelledby="chatTitle" hidden><header class="may-chat-head"><div><strong id="chatTitle">Trợ lý của May 🫶🏻</strong><small>Tra cứu nhanh · không dùng AI</small></div><button type="button" class="secondary" id="chatClose" aria-label="Đóng trò chuyện">✕</button></header><p class="may-chat-note">Xem tất cả đơn bạn có quyền truy cập, không phụ thuộc bộ lọc trang. Thời gian tính theo ngày tạo đơn tại Việt Nam.</p><div id="chatMessages" class="may-chat-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="Nội dung trò chuyện"></div><div class="may-chat-suggestions" aria-label="Câu hỏi gợi ý"><button type="button" class="secondary">Đơn chưa giao</button><button type="button" class="secondary">Hoa hồng tháng này</button><button type="button" class="secondary">Tổng quan hôm nay</button></div><form id="chatForm" class="may-chat-form"><label for="chatInput">Bạn muốn xem gì?</label><div><input id="chatInput" maxlength="240" autocomplete="off" placeholder="Ví dụ: Tìm đơn của Lan" required><button type="submit">Gửi</button></div></form></section>`;
 document.body.append(host);
 const launcher=$('chatLauncher'),panel=$('chatPanel'),input=$('chatInput'),messages=$('chatMessages');
 const help='Bạn có thể hỏi “Đơn chưa giao”, “Hoa hồng tháng này”, “Tổng quan hôm nay”, “Đơn đã hủy tháng 10/2026”, “Tổng quan năm 2026” hoặc “Tìm đơn của Lan”. Tôi chỉ tra cứu, không sửa hay hủy đơn.';
 let identity=null;
 function add(text,who='bot',href){const node=document.createElement('div');node.className='may-chat-message '+who;const body=document.createElement('p');body.textContent=text;node.append(body);if(href){const link=document.createElement('a');link.textContent='Xem danh sách đơn →';link.href=href;node.append(link);}messages.append(node);while(messages.children.length>40)messages.firstElementChild.remove();messages.scrollTop=messages.scrollHeight;}
 function open(value){panel.hidden=!value;launcher.setAttribute('aria-expanded',String(value));if(value)input.focus();else launcher.focus();}
 window.mayChatSync=()=>{const next=authorized?activeUser?.id:null;if(identity!==next){identity=next;messages.replaceChildren();input.value='';panel.hidden=true;launcher.setAttribute('aria-expanded','false');if(next)add('Chào May! 🫶🏻 '+help);}host.hidden=!authorized;};
 launcher.addEventListener('click',()=>open(panel.hidden));$('chatClose').addEventListener('click',()=>open(false));host.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();open(false);}});
 function period(q,now){const today=orderDateKey({createdAt:now.toISOString()}),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));const query=new URLSearchParams();let label='tất cả thời gian',test=()=>true;
  const exact=q.match(/\b(?:ngay\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  const dated=q.match(/\bthang\s+(\d{1,2})(?:\s*[\/\-]\s*(\d{4})|\s+nam\s+(\d{4}))?\b/);
  if(/\b(tu|den) ngay\b|\bquy\b|\btuan\b/.test(q)||(q.match(/\d{1,2}\/\d{1,2}\/\d{4}/g)||[]).length>1)return {error:'Tôi chưa hiểu khoảng thời gian này. Hãy dùng bộ lọc khoảng ngày ở trang Đơn hàng, hoặc hỏi một ngày như “Tổng quan ngày 29/10/2026”.'};
  if(exact||/\bhom (nay|qua)\b/.test(q)){let key=today;if(exact)key=`${exact[3]}-${exact[2].padStart(2,'0')}-${exact[1].padStart(2,'0')}`;else if(q.includes('hom qua')){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);key=d.toISOString().slice(0,10);}if(!validDateKey(key))return {error:'Ngày chưa hợp lệ. Hãy nhập theo dạng ngày 29/10/2026.'};query.set('time','range');query.set('from',key);query.set('to',key);label=displayDate(key);test=o=>orderDateKey(o)===key;
  }else if(dated||/\bthang (nay|truoc)\b/.test(q)){let y=year,m=month;if(dated){m=Number(dated[1]);y=Number(dated[2]||dated[3]||year);}else if(q.includes('thang truoc')){if(--m===0){m=12;y--;}}if(m<1||m>12||y<1970||y>9999)return {error:'Tháng hoặc năm chưa hợp lệ. Ví dụ: tháng 10/2026.'};const key=`${y}-${String(m).padStart(2,'0')}`;query.set('time','month');query.set('year',y);query.set('month',m);label=`tháng ${m}/${y}`;test=o=>orderDateKey(o).slice(0,7)===key;
  }else if(/\bnam (nay|truoc|\d{4})\b/.test(q)){const value=q.match(/\bnam (nay|truoc|\d{4})\b/)[1],y=value==='nay'?year:value==='truoc'?year-1:Number(value);if(y<1970||y>9999)return {error:'Hãy chọn năm từ 1970 đến 9999.'};query.set('time','month');query.set('year',y);label=`năm ${y}`;test=o=>orderDateKey(o).slice(0,4)===String(y);
  }else if(/\b(ngay|thang|nam|hom)\b|\d{1,2}\//.test(q))return {error:'Tôi chưa hiểu thời gian. Thử “hôm nay”, “tháng trước”, “tháng 10/2026”, “năm 2026” hoặc “ngày 29/10/2026”.'};
  return {query,label,test};
 }
 function answer(raw){if(!authorized||!dataLoaded)return {text:'Danh sách chưa tải xong. Hãy đợi đồng bộ rồi hỏi lại nhé.'};if($('storageWarning')?.textContent)return {text:'Dữ liệu chưa đồng bộ được. Hãy bấm “Cập nhật” và đợi kết nối lại trước khi tra cứu.'};const q=normalize(raw);
  if(/\b(xoa|huy don|sua don|them don|cap nhat|doi trang thai)\b/.test(q)&&!/(da huy|don huy)/.test(q))return {text:'Tôi chỉ hỗ trợ tra cứu. Bạn hãy dùng nút thao tác ở trang Đơn hàng để thay đổi đơn.'};
  const search=q.match(/^(?:tim|tra cuu)(?:\s+don)?(?:\s+(?:hang|cua|khach|san pham))?\s+(.+)$/);
  let scope;if(search){scope={query:new URLSearchParams({q:search[1]}),label:`từ khóa “${search[1]}”`,test:o=>normalize(o.name+' '+o.item).includes(search[1])};}
  else {scope=period(q,new Date());if(scope.error)return {text:scope.error};}
  const state=search?null:/\b(chua giao|cho giao)\b/.test(q)?'Chưa giao':/\b(da huy|don huy)\b/.test(q)?'Đã hủy':/\bda giao\b/.test(q)?'Đã giao':null;
  if(!search&&/\b(chua thanh toan|thanh toan|cod|tien mat|chuyen khoan)\b/.test(q))return {text:'Để lọc theo thanh toán, hãy dùng bộ lọc Thanh toán ở trang Đơn hàng. Tôi hỗ trợ hỏi nhanh theo trạng thái giao hàng và ngày tạo.'};
  const commission=!search&&q.includes('hoa hong'),summary=!search&&/\b(tong quan|thong ke|bao nhieu|tong don|so don|doanh thu|gia tri)\b/.test(q);
  if(!search&&!state&&!commission&&!summary)return {text:help};
  if(state)scope.query.set('del',state);const list=orders.filter(o=>scope.test(o)&&(!state||o.del===state));const href='orders.html'+(scope.query.size?'?'+scope.query:'');
  if(commission)return {text:`Hoa hồng đã nhận · ${scope.label}${state?' · '+state:''}: ${fmtCommission(sumCommissions(list))} (${list.length} đơn). Cộng số đã nhập, kể cả đơn hủy nếu không lọc trạng thái.`,href};
  if(summary&&!state&&!search){const count=s=>list.filter(o=>o.del===s).length;return {text:`Tổng quan · ${scope.label}\n${list.length} đơn: ${count('Chưa giao')} chưa giao · ${count('Đã giao')} đã giao · ${count('Đã hủy')} đã hủy · ${count('Chưa rõ')} chưa rõ.\nGiá trị đơn chưa hủy: ${fmt(list.filter(o=>o.del!=='Đã hủy').reduce((s,o)=>s+o.price,0))}.\nHoa hồng đã nhận: ${fmtCommission(sumCommissions(list))} (kể cả đơn hủy).`,href};}
  const lines=list.slice(0,5).map(o=>`• ${o.name} — ${o.item}\n  ${o.del} · ${fmt(o.price)} · ${displayDate(orderDateKey(o))}`);return {text:`${list.length} đơn${state?' '+state.toLowerCase():''} · ${scope.label}.${lines.length?'\n'+lines.join('\n'): '\nKhông tìm thấy đơn phù hợp.'}${list.length>5?'\nHiện 5 đơn đầu. Mở danh sách để xem tất cả.':''}`,href};
 }
 function submit(text){if(!text.trim())return;add(text,'user');const reply=answer(text);add(reply.text,'bot',reply.href);input.value='';}
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();submit(input.value);});for(const button of host.querySelectorAll('.may-chat-suggestions button'))button.addEventListener('click',()=>submit(button.textContent));
 window.mayChatSync();
})();
