/* Local login guide. Never reads credentials or sends requests. */
(()=>{
 const authPanel=document.getElementById('authPanel'),form=document.getElementById('loginForm');
 if(!authPanel||!form)return;
 const host=document.createElement('aside');host.className='may-chat';
 host.innerHTML='<button type="button" class="may-chat-launch" aria-label="Em Kem hướng dẫn đăng nhập" aria-expanded="false" aria-controls="loginKemPanel"><span class="em-kem-bubble">Nhập tên ngắn thôi, Kem chỉ nè!</span><img class="em-kem-poodle" src="assets/em-kem-sit.webp" width="96" height="100" alt="" draggable="false"></button><section id="loginKemPanel" class="may-chat-panel" aria-labelledby="loginKemTitle" hidden><header class="may-chat-head"><div><strong id="loginKemTitle">Em Kem</strong><small>Kem giúp May đăng nhập nha &lt;3</small></div><button type="button" class="secondary" aria-label="Đóng hướng dẫn">✕</button></header><div class="may-chat-messages"><div class="may-chat-message"><p>1. Nhập tên đăng nhập được chủ cửa hàng cấp, ví dụ: admin. Không cần thêm @admin.com.\n\n2. Nhập mật khẩu của tài khoản.\n\n3. Nhấn “Đăng nhập” để vào cửa hàng.</p></div><div class="may-chat-message"><p>Email đầy đủ vẫn dùng được nha. Nếu quên tài khoản hoặc mật khẩu, hãy liên hệ chủ cửa hàng.</p></div><div class="may-chat-message"><p>Đừng gửi mật khẩu trong chat nhé. Kem không cần xem mật khẩu của May.</p></div><button type="button" class="secondary" data-login-start>Bắt đầu nhập tên đăng nhập</button></div></section>';
 document.body.append(host);
 const launcher=host.querySelector('.may-chat-launch'),panel=host.querySelector('.may-chat-panel'),bubble=host.querySelector('.em-kem-bubble'),image=host.querySelector('img'),close=host.querySelector('[aria-label="Đóng hướng dẫn"]');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 function syncImage(){image.src=motion.matches?'assets/em-kem-poodle.webp':'assets/em-kem-sit.webp';}
 syncImage();motion.addEventListener?.('change',syncImage);
 let position=null,drag=null,suppressUntil=0;
 try{const saved=JSON.parse(localStorage.getItem('em-kem-position-v1'));if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))position=saved;}catch{}
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 function place(){
  if(host.hidden)return;
  const r=launcher.getBoundingClientRect();
  position=position||{x:innerWidth-r.width-20,y:innerHeight-r.height-20};
  position={x:clamp(position.x,12,innerWidth-r.width-12),y:clamp(position.y,12,innerHeight-r.height-12)};
  Object.assign(host.style,{left:position.x+'px',top:position.y+'px',right:'auto',bottom:'auto'});
  const left=position.x-12,right=innerWidth-position.x-r.width-12;
  host.classList.toggle('em-kem-near-left',right>left);bubble.style.maxWidth=Math.max(72,Math.max(left,right)-10)+'px';
  if(!panel.hidden){
   panel.style.height='auto';panel.style.maxHeight=Math.max(80,innerHeight-24)+'px';
   const p=panel.getBoundingClientRect();
   panel.style.left=clamp(position.x+r.width-p.width,12,innerWidth-p.width-12)+'px';
   panel.style.top=clamp(position.y-p.height-12,12,innerHeight-p.height-12)+'px';
  }
 }
 function open(show){panel.hidden=!show;launcher.setAttribute('aria-expanded',String(show));place();if(show)close.focus();else launcher.focus();}
 launcher.addEventListener('click',e=>{if(e.detail&&Date.now()<suppressUntil)return;open(panel.hidden);});
 close.addEventListener('click',()=>open(false));
 host.querySelector('[data-login-start]').addEventListener('click',()=>{open(false);document.getElementById('email').focus();});
 host.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();open(false);}});
 launcher.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;const r=launcher.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};launcher.setPointerCapture(e.pointerId);});
 launcher.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<8)return;drag.moved=true;host.classList.add('em-kem-dragging');position={x:drag.left+dx,y:drag.top+dy};place();});
 function end(e){if(!drag||drag.id!==e.pointerId)return;if(drag.moved){suppressUntil=Date.now()+500;try{localStorage.setItem('em-kem-position-v1',JSON.stringify(position));}catch{}}drag=null;host.classList.remove('em-kem-dragging');if(launcher.hasPointerCapture(e.pointerId))launcher.releasePointerCapture(e.pointerId);}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])launcher.addEventListener(event,end);
 form.addEventListener('focusin',event=>{
  if(event.target.id==='email')bubble.textContent='Ví dụ: admin — không cần @admin.com nha!';
  if(event.target.id==='password')bubble.textContent='Nhập mật khẩu rồi nhấn Đăng nhập nha!';
  place();
 });
 function syncVisibility(){host.hidden=authPanel.hidden;if(host.hidden){panel.hidden=true;launcher.setAttribute('aria-expanded','false');}else place();}
 new MutationObserver(syncVisibility).observe(authPanel,{attributes:true,attributeFilter:['hidden']});
 window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);
 syncVisibility();
})();
