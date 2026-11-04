
// Demo branch is fully disconnected from production. Real Supabase is NEVER used here.
const SUPABASE_URL='https://preview.invalid';
const SUPABASE_ANON_KEY='DEMO-ONLY-NO-KEY';
let cloud=null;
try{if(!window.MAY_DEMO)throw new Error('Không tải được chế độ dữ liệu giả, đã chặn kết nối thật.');cloud=window.createOrdersCloud();}catch(error){window.cloudStartupError=error.message;}
const page=document.body.dataset.page;
const params=new URLSearchParams(location.search);
const listReturn=safeRoute(params.get('returnTo')||'orders.html',['orders.html'],'orders.html');
function listRoute(){return 'orders.html'+(page==='orders'?location.search:'');}
function loginRoute(){return 'account.html?next='+encodeURIComponent((location.pathname.split('/').pop()||'index.html')+location.search);}
let orders=[],editId=null,editVersion=null,toastTimer,currentPage=1,activeUser=null,authorized=false,busy=false,authEpoch=0,refreshSeq=0,channel=null,pollTimer=null;
const PAGE_SIZE=10;
let dataLoaded=false,editorReady=false,unreceivedCommissionOnly=false;

let editorDirty=false;
function render(){
 window.mayChatSync?.();
 if($('moreFilterSummary')){const active=[$('fDel')?.value].filter(value=>value&&value!=='all').length+Number(unreceivedCommissionOnly);$('moreFilterSummary').textContent=active?'· '+active+' đang lọc':'';}
 if(page==='order'){initEditor();return;}if(page==='account'||(page==='orders'&&!dataLoaded))return;
 const list=filteredOrders(),total=list.filter(o=>o.del!=='Đã hủy').reduce((s,o)=>s+o.price,0);
 renderStats(list,total);
 renderOrderList(list,total);
 if(page==='index')renderReport(orders);
}
// Always mark this branch as a synthetic-data preview.
const banner=document.createElement('div');banner.className='demo-preview-banner';banner.setAttribute('role','status');
const badge=document.createElement('strong');badge.textContent='BẢN DEMO · DỮ LIỆU GIẢ · KHÔNG KẾT NỐI SUPABASE';
const reset=document.createElement('button');reset.type='button';reset.textContent='Đặt lại dữ liệu mẫu';reset.className='secondary';
reset.addEventListener('click',()=>{if(!confirm('Đặt lại toàn bộ đơn giả và lịch sử demo?'))return;cloud.reset();void refreshOrders();});
banner.append(badge,reset);document.querySelector('main')?.prepend(banner);
initOrderList();
if(page==='index')initReport();
initFormBindings();
initAuthBindings();
render();startCloud();

