/* Local display preference only; conversation history is kept intact. */
(()=>{
 const key='em-kem-visible-v1';
 const root=document.documentElement;
 const button=document.getElementById('emKemToggle');
 const status=document.getElementById('emKemVisibilityStatus');
 let visible=true;
 function render(){
  root.dataset.emKemHidden=String(!visible);
  if(button){button.textContent=visible?'Ẩn Em Kem':'Hiện Em Kem';button.setAttribute('aria-pressed',String(visible));}
  if(status)status.textContent=visible?'Em Kem đang hiển thị.':'Em Kem đang ẩn.';
 }
 function restore(){try{visible=localStorage.getItem(key)!=='false';}catch{}render();}
 button?.addEventListener('click',()=>{
  visible=!visible;
  try{localStorage.setItem(key,String(visible));}catch{}
  render();
 });
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)restore();});
 window.addEventListener('pageshow',restore);
 restore();
})();
