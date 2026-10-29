/* Check the deployed HTML on launch/resume; never touch auth or chat storage. */
(()=>{
 const current=document.querySelector('meta[name="app-version"]')?.content;
 if(!current)return;
 let checking=false,lastCheck=0,pending='',formChanged=false;
 const banner=document.createElement('div');
 banner.setAttribute('role','status');
 banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:100;background:#eaf5ef;color:#245c41;padding:12px 16px;display:none;align-items:center;justify-content:center;gap:12px;box-shadow:0 3px 12px #315f4d25;font:14px system-ui';
 const message=document.createElement('span');message.textContent='Có phiên bản mới của Kem & May.';
 const button=document.createElement('button');button.type='button';button.textContent='Cập nhật ngay';
 button.style.cssText='background:#d5edda;color:#245c41;border:1px solid #add4b7;min-height:40px;padding:8px 12px';
 banner.append(message,button);document.body.append(banner);
 const blocked=()=>formChanged||document.body.dataset.busy==='true'||!!document.querySelector('.may-chat-wait')||Array.from(document.querySelectorAll('.may-chat-form input')).some(input=>input.value.trim());
 function applyUpdate(manual=false){
  if(!pending||document.body.dataset.busy==='true'||document.querySelector('.may-chat-wait'))return;
  if(formChanged&&!confirm('Bạn đang nhập thông tin. Tải bản mới sẽ bỏ phần chưa lưu. Cập nhật ngay?'))return;
  const target=new URL(location.href);target.searchParams.set('_app',pending);
  // A failed/stale CDN response must not cause a reload loop.
  try{const key='kem-may-update-attempt:'+location.pathname;const pair=current+'>'+pending;if(!manual&&sessionStorage.getItem(key)===pair)return;sessionStorage.setItem(key,pair);}catch{}
  location.replace(target.href);
 }
 button.addEventListener('click',()=>applyUpdate(true));
 document.addEventListener('input',event=>{if(event.target.closest('#orderForm,#loginForm'))formChanged=true;});
 document.addEventListener('change',event=>{if(event.target.closest('#orderForm,#loginForm'))formChanged=true;});
 async function check(){
  if(document.hidden||checking||Date.now()-lastCheck<15000)return;
  checking=true;lastCheck=Date.now();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('_update_check',String(Date.now()));
   const response=await fetch(url.href,{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(!response.ok)return;
   const html=new DOMParser().parseFromString(await response.text(),'text/html');
   const next=html.querySelector('meta[name="app-version"]')?.content;
   if(!next||!/^[a-zA-Z0-9._-]{1,80}$/.test(next)||next===current)return;
   pending=next;banner.style.display='flex';
   if(!document.hidden&&!blocked())applyUpdate();
  }catch{/* Offline/timeout: keep the current screen usable. */}
  finally{clearTimeout(timer);checking=false;}
 }
 window.addEventListener('pageshow',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
 window.addEventListener('online',check);
 check();
})();
