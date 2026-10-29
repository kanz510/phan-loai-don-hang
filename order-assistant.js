/* Read-only assistant: optional server-side AI, plus local quick lookup. */
(()=>{
 if(page==='account')return;
 const host=document.createElement('aside');host.className='may-chat';host.hidden=true;
 host.innerHTML=`<button type="button" class="may-chat-launch" id="chatLauncher" aria-expanded="false" aria-controls="chatPanel" aria-label="Mở trò chuyện với Em Kem"><span class="em-kem-bubble" aria-hidden="true">May cần giúp gì ?</span><img class="em-kem-poodle" src="assets/em-kem-poodle-animated.webp" width="96" height="100" alt="" decoding="async"></button><section id="chatPanel" class="may-chat-panel" aria-labelledby="chatTitle" hidden><header class="may-chat-head"><div><strong id="chatTitle">Em Kem</strong><small id="chatConnection">Đang kiểm tra kết nối AI…</small></div><button type="button" class="secondary" id="chatClose" aria-label="Đóng trò chuyện">✕</button></header><div class="may-chat-mode"><label for="chatMode">Chế độ</label><select id="chatMode"><option value="quick">Tra cứu nhanh</option><option value="ai">AI · hội thoại tự nhiên</option></select></div><p class="may-chat-note" id="chatPrivacy">Xem tất cả đơn bạn có quyền truy cập, không phụ thuộc bộ lọc trang. Thời gian tính theo ngày tạo đơn tại Việt Nam.</p><div id="chatMessages" class="may-chat-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="Nội dung trò chuyện"></div><div class="may-chat-suggestions" aria-label="Câu hỏi gợi ý"><button type="button" class="secondary">Đơn chưa giao</button><button type="button" class="secondary">Hoa hồng tháng này</button><button type="button" class="secondary">Tổng quan hôm nay</button></div><form id="chatForm" class="may-chat-form"><label for="chatInput">Bạn muốn xem gì?</label><div><input id="chatInput" maxlength="1000" autocomplete="off" placeholder="Ví dụ: Tìm đơn của Lan" required><button type="submit">Gửi</button></div></form></section>`;
 document.body.append(host);
 const launcher=$('chatLauncher'),panel=$('chatPanel'),input=$('chatInput'),messages=$('chatMessages');
 const help='Bạn có thể hỏi “Đơn chưa giao”, “Hoa hồng tháng này”, “Tổng quan hôm nay”, “Đơn đã hủy tháng 10/2026”, “Tổng quan năm 2026” hoặc “Tìm đơn của Lan”. Tôi chỉ tra cứu, không sửa hay hủy đơn.';
 let identity=null,epoch=0,pending=false,controller=null,history=[],modeTouched=false;
 const endpoint=SUPABASE_URL+'/functions/v1/order-chat';
 function lock(value){pending=value;$('chatForm').setAttribute('aria-busy',String(value));input.disabled=value;$('chatForm').querySelector('button').disabled=value;$('chatMode').disabled=value;for(const b of host.querySelectorAll('.may-chat-suggestions button'))b.disabled=value;}
 function modeInfo(){const ai=$('chatMode').value==='ai';$('chatPrivacy').hidden=ai;$('chatPrivacy').textContent=ai?'':'Tra cứu nhanh không gửi dữ liệu đến AI. Xem tất cả đơn được cấp quyền, không phụ thuộc bộ lọc trang. Thời gian theo ngày tạo đơn tại Việt Nam.';}
 async function api(method,body,signal){const {data,error}=await cloud.client.auth.getSession();if(error||!data.session)throw new Error('Vui lòng đăng nhập lại.');const response=await fetch(endpoint,{method,headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal});let payload;try{payload=await response.json();}catch{payload={};}if(!response.ok)throw new Error(response.status===404?'AI chưa được triển khai. Bạn có thể chọn Tra cứu nhanh để dùng tiếp.':payload.error||'Chưa kết nối được AI. Hãy thử lại hoặc chọn Tra cứu nhanh.');return payload;}
 async function checkAI(version){try{const status=await api('GET',null,AbortSignal.timeout(8000));if(version!==epoch)return;$('chatConnection').textContent=status.ready?'Em Kem đã sẵn sàng rùi nè <3':'AI chưa kích hoạt · tra cứu nhanh vẫn dùng được';if(status.ready&&!modeTouched&&!pending){$('chatMode').value='ai';modeInfo();if(!history.length&&messages.children.length<=1){messages.replaceChildren();add('Chào May! 🫶🏻 Bạn cứ hỏi tự nhiên, ví dụ “Đơn nào chưa giao mà chưa thanh toán?” hoặc “Hoa hồng tháng này so với tháng trước thế nào?”. Tôi nhớ ngữ cảnh trong cuộc chat này và chỉ tra cứu, không sửa đơn.');}}}catch{if(version===epoch)$('chatConnection').textContent='AI chưa kết nối · tra cứu nhanh vẫn dùng được';}}
 function sourceLink(source){if(!source||!Number.isSafeInteger(source.count)||source.count<0)return null;const query=new URLSearchParams();for(const [key,allowed] of [['delivery',DEL],['payment',PAY]]){const values=source[key];if(values!==null&&(!Array.isArray(values)||values.length!==1||!allowed.includes(values[0])))return null;if(values)query.set(key==='delivery'?'del':'pay',values[0]);}if(source.customer&&source.product)return null;const term=source.customer||source.product;if(typeof term==='string')query.set('q',term);if(source.from||source.to){if((source.from&&!validDateKey(source.from))||(source.to&&!validDateKey(source.to)))return null;query.set('time','range');if(source.from)query.set('from',source.from);if(source.to)query.set('to',source.to);}return 'orders.html'+(query.size?'?'+query:'');}
 function addSources(sources){if(!Array.isArray(sources))return;for(const source of sources.slice(0,4)){if(!Number.isSafeInteger(source.count)||source.count<0||![source.active_order_value_vnd,source.received_commission_vnd].every(v=>typeof v==='string'&&/^\d{1,30}$/.test(v)))continue;const period=source.from||source.to?`${source.from?displayDate(source.from):'Từ đầu'} – ${source.to?displayDate(source.to):'đến nay'}`:'Tất cả thời gian';add(`Đối chiếu từ hệ thống · ${period}${source.customer?' · Khách: '+source.customer:''}${source.product?' · Hàng: '+source.product:''}${source.delivery?' · '+source.delivery.join(', '):''}${source.payment?' · '+source.payment.join(', '):''}\n${source.count} đơn · Giá trị chưa hủy: ${fmtCommission(BigInt(source.active_order_value_vnd))} · Hoa hồng: ${fmtCommission(BigInt(source.received_commission_vnd))}.`,'bot source',sourceLink(source));}}
 modeInfo();$('chatMode').addEventListener('change',()=>{modeTouched=true;history=[];modeInfo();add($('chatMode').value==='ai'?'Đã chọn AI. Bắt đầu ngữ cảnh mới; bạn có thể hỏi tự nhiên.':'Đã chọn Tra cứu nhanh, không dùng AI. '+help);});
 function add(text,who='bot',href){const node=document.createElement('div');node.className='may-chat-message '+who;const body=document.createElement('p');body.textContent=text;node.append(body);if(href){const link=document.createElement('a');link.textContent='Xem danh sách đơn →';link.href=href;node.append(link);}messages.append(node);while(messages.children.length>40)messages.firstElementChild.remove();messages.scrollTop=messages.scrollHeight;}

 // Drag only the launcher: a short tap still opens the conversation.
 const positionKey='em-kem-position-v1';let mascotPosition=null,drag=null,suppressClickUntil=0;
 try{const saved=JSON.parse(localStorage.getItem(positionKey));if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))mascotPosition=saved;}catch{}
 const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
 function placePanel(){
  if(panel.hidden)return;
  const r=launcher.getBoundingClientRect(),gap=12,w=panel.getBoundingClientRect().width;
  panel.style.maxHeight=Math.max(80,innerHeight-gap*2)+'px';
  const h=panel.getBoundingClientRect().height;
  const top=r.top>=h+gap?r.top-h-gap:r.bottom+h+gap<=innerHeight?r.bottom+gap:clamp(r.top,gap,innerHeight-h-gap);
  panel.style.left=clamp(r.right-w,gap,innerWidth-w-gap)+'px';panel.style.top=top+'px';
 }
 function placeMascot(){
  if(host.hidden)return;
  const r=launcher.getBoundingClientRect(),gap=12;
  const p=mascotPosition||{x:innerWidth-r.width-20,y:innerHeight-r.height-20};
  mascotPosition={x:clamp(p.x,gap,innerWidth-r.width-gap),y:clamp(p.y,gap,innerHeight-r.height-gap)};
  host.style.left=mascotPosition.x+'px';host.style.top=mascotPosition.y+'px';host.style.right='auto';host.style.bottom='auto';
  host.classList.toggle('em-kem-near-left',mascotPosition.x<180);placePanel();
 }
 function saveMascot(){try{localStorage.setItem(positionKey,JSON.stringify(mascotPosition));}catch{}}
 launcher.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary)return;
  const r=launcher.getBoundingClientRect();drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x:r.left,y:r.top,moved:false};
  launcher.setPointerCapture(event.pointerId);
 });
 launcher.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.moved&&Math.hypot(dx,dy)<8)return;
  drag.moved=true;host.classList.add('em-kem-dragging');mascotPosition={x:drag.x+dx,y:drag.y+dy};placeMascot();
 });
 function endDrag(event){
  if(!drag||drag.id!==event.pointerId)return;
  if(drag.moved){suppressClickUntil=Date.now()+500;saveMascot();}
  drag=null;host.classList.remove('em-kem-dragging');
  if(launcher.hasPointerCapture(event.pointerId))launcher.releasePointerCapture(event.pointerId);
 }
 launcher.addEventListener('pointerup',endDrag);launcher.addEventListener('pointercancel',endDrag);launcher.addEventListener('lostpointercapture',endDrag);
 launcher.addEventListener('keydown',event=>{
  const moves={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
  if(!moves[event.key])return;event.preventDefault();placeMascot();const [dx,dy]=moves[event.key];mascotPosition={x:mascotPosition.x+dx,y:mascotPosition.y+dy};placeMascot();saveMascot();
 });
 window.addEventListener('resize',placeMascot);window.visualViewport?.addEventListener('resize',placeMascot);

 function open(value){panel.hidden=!value;launcher.setAttribute('aria-expanded',String(value));if(value){placePanel();input.focus();}else launcher.focus();}
 window.mayChatSync=()=>{const next=authorized?activeUser?.id:null;if(identity!==next){identity=next;epoch++;controller?.abort();controller=null;lock(false);history=[];modeTouched=false;$('chatMode').value='quick';modeInfo();$('chatConnection').textContent='Đang kiểm tra kết nối AI…';messages.replaceChildren();input.value='';panel.hidden=true;launcher.setAttribute('aria-expanded','false');if(next){add('Chào May! 🫶🏻 '+help);checkAI(epoch);}}host.hidden=!authorized;placeMascot();};

 // Keep the mascot still when the visitor requests reduced motion.
 const mascot=host.querySelector('.em-kem-poodle'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const syncMascot=()=>{mascot.src=motion.matches?'assets/em-kem-poodle.webp':'assets/em-kem-poodle-animated.webp';};
 syncMascot();motion.addEventListener?.('change',syncMascot);
 // A short synthesized woof, only after a deliberate click; never autoplay.
 let barkAudio=null,lastBark=0;
 async function bark(){
  if(Date.now()-lastBark<2500)return;lastBark=Date.now();
  try{
   const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
   barkAudio??=new AudioContext();await barkAudio.resume();
   if(barkAudio.state!=='running')return;
   const t=barkAudio.currentTime;
   for(const offset of [0,0.28]){
    const start=t+offset,voice=barkAudio.createOscillator(),noise=barkAudio.createBufferSource(),filter=barkAudio.createBiquadFilter(),gain=barkAudio.createGain();
    const buffer=barkAudio.createBuffer(1,Math.ceil(barkAudio.sampleRate*0.2),barkAudio.sampleRate),samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*0.35;
    noise.buffer=buffer;voice.type='sawtooth';voice.frequency.setValueAtTime(180,start);voice.frequency.exponentialRampToValueAtTime(75,start+0.17);
    filter.type='bandpass';filter.frequency.setValueAtTime(800,start);filter.frequency.exponentialRampToValueAtTime(350,start+0.18);filter.Q.value=0.8;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(0.12,start+0.018);gain.gain.exponentialRampToValueAtTime(0.001,start+0.19);
    voice.connect(filter);noise.connect(filter);filter.connect(gain);gain.connect(barkAudio.destination);
    voice.start(start);noise.start(start);voice.stop(start+0.2);noise.stop(start+0.2);
    voice.onended=()=>{voice.disconnect();noise.disconnect();filter.disconnect();gain.disconnect();};
   }
  }catch{/* Sound is optional; the chat remains usable when audio is blocked. */}
 }

 launcher.addEventListener('click',event=>{if(event.detail!==0&&Date.now()<suppressClickUntil){event.preventDefault();return;}if(panel.hidden)bark();open(panel.hidden);});$('chatClose').addEventListener('click',()=>open(false));host.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();open(false);}});
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
 async function submit(text){text=text.trim();if(!text||pending||!authorized)return;const version=epoch;add(text,'user');input.value='';if($('chatMode').value!=='ai'){const reply=answer(text);add(reply.text,'bot',reply.href);return;}
  lock(true);controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),50000);const waiting=document.createElement('p');waiting.className='may-chat-wait';waiting.setAttribute('role','status');waiting.textContent='May đang xem dữ liệu và trả lời…';messages.append(waiting);messages.scrollTop=messages.scrollHeight;
  try{const previous=history.slice(-8);while(previous.reduce((s,m)=>s+m.content.length,0)+text.length>9500)previous.shift();const payload=await api('POST',{messages:[...previous,{role:'user',content:text}]},controller.signal);if(version!==epoch||!authorized)return;if(typeof payload.reply!=='string'||!payload.reply.trim())throw new Error('AI chưa trả lời được. Hãy thử lại.');add(payload.reply);addSources(payload.sources);history=[...previous,{role:'user',content:text},{role:'assistant',content:payload.reply.slice(0,1500)}].slice(-8);$('chatConnection').textContent='Em Kem đã sẵn sàng rùi nè <3';}
  catch(error){if(version===epoch&&authorized)add(error.name==='AbortError'?'AI phản hồi chậm. Hãy thử lại hoặc chọn Tra cứu nhanh.':error.message||'Chưa kết nối được AI.');}
  finally{clearTimeout(timeout);waiting.remove();if(version===epoch){controller=null;lock(false);if(!panel.hidden)input.focus();}}
 }
 $('chatForm').addEventListener('submit',e=>{e.preventDefault();submit(input.value);});for(const button of host.querySelectorAll('.may-chat-suggestions button'))button.addEventListener('click',()=>submit(button.textContent));
 window.mayChatSync();
})();
