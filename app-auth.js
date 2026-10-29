function warning(message){if($('storageWarning')){$('storageWarning').textContent=message;$('storageWarning').hidden=!message;}}
function notify(message){clearTimeout(toastTimer);$('notification').textContent=message;if($('editor')){$('dialogNotice').textContent=message;$('dialogNotice').hidden=false;}toastTimer=setTimeout(()=>{$('notification').textContent='';},4500);}
function errorText(error){if(error?.status===401||error?.code==='PGRST301')return 'Phiên đăng nhập hết hạn. Vui lòng đăng xuất rồi đăng nhập lại.';return error?.message||'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';}
function setBusy(value){busy=value;document.body.dataset.busy=String(value);for(const id of ['saveButton','logoutButton'])if($(id))$(id).disabled=value;for(const button of document.querySelectorAll('.deliver-order'))button.disabled=value;for(const field of $('orderForm')?.querySelectorAll('input,select')||[])field.disabled=value;}
async function refreshOrders({silent=false}={}){
 if(!authorized)return;const epoch=authEpoch,seq=++refreshSeq;
 try{const list=await cloud.list();if(epoch!==authEpoch||seq!==refreshSeq||!authorized)return;orders=parseOrders(JSON.stringify(list));dataLoaded=true;render();warning('');if($('syncStatus'))$('syncStatus').textContent='Đã đồng bộ · '+new Date().toLocaleTimeString('vi-VN');}
 catch(error){if(epoch!==authEpoch||seq!==refreshSeq)return;warning('Chưa tải được danh sách mới. '+errorText(error));if($('syncStatus'))$('syncStatus').textContent='Kết nối gián đoạn · danh sách có thể chưa cập nhật';if(!silent)notify(errorText(error));}
}
function stopSync(){clearInterval(pollTimer);pollTimer=null;if(channel){cloud.client.removeChannel(channel);channel=null;}}
async function applySession(session){
 const user=session?.user||null;if(!user&&!activeUser&&authEpoch>0)return;if(user&&authorized&&activeUser?.id===user.id)return;
 const epoch=++authEpoch;stopSync();authorized=false;activeUser=user;orders=[];dataLoaded=false;editorReady=false;editId=null;editVersion=null;if($('rows'))$('rows').replaceChildren();render();
 if($('sharedApp'))$('sharedApp').hidden=true;if($('accessPanel'))$('accessPanel').hidden=false;
 $('logoutButton').hidden=!user;setText('accountEmail',user?.email||'');
 if(!user){if(page!=='account'){location.replace(loginRoute());return;}setText('authStatus',window.cloudStartupError||'Nhập tài khoản do chủ cửa hàng cấp.');$('authPanel').hidden=false;$('accountDetails').hidden=true;return;}
 setText('authStatus','Đang kiểm tra quyền truy cập…');
 try{const member=await cloud.member();if(epoch!==authEpoch)return;authorized=true;
 if(page==='account'){$('authPanel').hidden=true;$('accountDetails').hidden=false;setText('memberEmail',user.email);setText('memberRole',member.role==='admin'?'Vai trò: Chủ cửa hàng':'Vai trò: Nhân viên');const next=safeRoute(params.get('next')||'index.html',['index.html','orders.html','order.html'],'index.html');$('accountContinue').href=next;if(params.has('next'))location.replace(next);return;}
 $('accessPanel').hidden=true;$('sharedApp').hidden=false;await refreshOrders();if(epoch!==authEpoch)return;
 channel=cloud.client.channel('shared-orders').on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>{if(!busy)refreshOrders({silent:true});}).subscribe();
 pollTimer=setInterval(()=>{if(!document.hidden&&!busy)refreshOrders({silent:true});},15000);
 }catch(error){if(epoch!==authEpoch)return;setText('authStatus',errorText(error));setText('accessTitle','Chưa thể truy cập');setText('accessStatus',errorText(error));if($('accessAccount'))$('accessAccount').href=loginRoute();}
}
async function startCloud(){
 if(!cloud){setText('authStatus',window.cloudStartupError);setText('accessStatus',window.cloudStartupError);if($('loginButton'))$('loginButton').disabled=true;return;}
 // Supabase auth callbacks must finish before starting further auth/API work.
 cloud.client.auth.onAuthStateChange((_event,session)=>setTimeout(()=>applySession(session),0));
 try{const {data,error}=await cloud.client.auth.getSession();if(error)throw error;await applySession(data.session);}catch(error){setText('authStatus',errorText(error));setText('accessStatus',errorText(error));}
}

function initAuthBindings(){
bind('loginForm','submit',async event=>{event.preventDefault();if(!cloud)return;$('loginButton').disabled=true;setText('authStatus','Đang đăng nhập…');try{const login=$('email').value.trim();if(!login)throw new Error('Vui lòng nhập tên đăng nhập.');const email=login.includes('@')?login:login+'@admin.com';const {error}=await cloud.client.auth.signInWithPassword({email,password:$('password').value});if(error)throw error;$('password').value='';}catch(error){setText('authStatus','Đăng nhập không thành công. '+errorText(error));}finally{$('loginButton').disabled=false;}});
bind('logoutButton','click',async()=>{if(busy)return;const {error}=await cloud.client.auth.signOut({scope:'local'});if(error){notify(errorText(error));return;}editorDirty=false;applySession(null);});
bind('refreshButton','click',()=>refreshOrders());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&page!=='account')refreshOrders({silent:true});});

}
