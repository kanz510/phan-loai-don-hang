
const SUPABASE_URL='https://jsdpdfdyxfxvlxdovnkt.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZHBkZmR5eGZ4dmx4ZG92bmt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTkwODksImV4cCI6MjEwODc3NTA4OX0.fhZsGKrJUCVR5Je8tFmO3X7jJa75xi3TIzRWBupnXG8';
let cloud=null;
try{cloud=window.createOrdersCloud(SUPABASE_URL,SUPABASE_ANON_KEY);}catch(error){window.cloudStartupError=error.message;}
const page=document.body.dataset.page;
const params=new URLSearchParams(location.search);
const listReturn=safeRoute(params.get('returnTo')||'orders.html',['orders.html'],'orders.html');
function listRoute(){return 'orders.html'+(page==='orders'?location.search:'');}
function loginRoute(){return 'account.html?next='+encodeURIComponent((location.pathname.split('/').pop()||'index.html')+location.search);}
let orders=[],editId=null,editVersion=null,toastTimer,currentPage=1,activeUser=null,authorized=false,busy=false,authEpoch=0,refreshSeq=0,channel=null,pollTimer=null;
const PAGE_SIZE=10;
let dataLoaded=false,editorReady=false;

let editorDirty=false;
function render(){
 window.mayChatSync?.();
 if($('moreFilterSummary')){const active=[$('fDel')?.value].filter(value=>value&&value!=='all').length;$('moreFilterSummary').textContent=active?'· '+active+' đang lọc':'';}
 if(page==='order'){initEditor();return;}if(page==='account'||(page==='orders'&&!dataLoaded))return;
 const list=filteredOrders(),total=list.filter(o=>o.del!=='Đã hủy').reduce((s,o)=>s+o.price,0);
 renderStats(list,total);
 renderOrderList(list,total);
}
initOrderList();
initFormBindings();
initAuthBindings();
render();startCloud();
