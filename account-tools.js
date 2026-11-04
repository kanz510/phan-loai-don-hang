/* Account-only UI. Auth uses Supabase; audit records are written by a DB trigger. */
(()=>{
 const mount=$('accountToolsMount');if(!mount)return;
 mount.innerHTML=`<div class="account-tool-buttons"><button type="button" class="secondary" id="togglePassword" aria-expanded="false" aria-controls="passwordPanel">Đổi mật khẩu</button><button type="button" class="secondary" id="toggleHistory" aria-expanded="false" aria-controls="historyPanel">Lịch sử đơn hàng</button></div>
 <section class="account-tool-panel" id="passwordPanel" hidden aria-labelledby="passwordTitle"><h3 id="passwordTitle">Đổi mật khẩu</h3><form id="changePasswordForm"><div class="field"><label for="currentPassword">Mật khẩu hiện tại</label><input id="currentPassword" type="password" autocomplete="current-password" required maxlength="128"></div><div class="field"><label for="newPassword">Mật khẩu mới</label><input id="newPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128" aria-describedby="newPasswordHint"><small id="newPasswordHint">Ít nhất 8 ký tự.</small></div><div class="field"><label for="confirmPassword">Nhập lại mật khẩu mới</label><input id="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></div><p id="passwordStatus" role="status" aria-live="polite"></p><button type="submit" id="changePasswordButton">Lưu mật khẩu mới</button></form></section>
 <section class="account-tool-panel" id="historyPanel" hidden aria-labelledby="historyTitle"><h3 id="historyTitle">Lịch sử thêm / sửa / xóa đơn</h3><p class="account-tool-hint">Lịch sử được ghi từ khi tính năng được bật.</p><button type="button" class="secondary" id="reloadHistory">Tải lại lịch sử</button><p id="historyStatus" role="status" aria-live="polite"></p><ol class="order-history" id="historyList"></ol><div class="history-pagination"><button type="button" class="secondary" id="historyPrevious" disabled>← Trước</button><span id="historyPage">Trang 1</span><button type="button" class="secondary" id="historyNext" disabled>Sau →</button></div></section>`;
 const form=$('changePasswordForm'),passwordPanel=$('passwordPanel'),historyPanel=$('historyPanel');
 const passwordInputs=['currentPassword','newPassword','confirmPassword'];
 let generation=0,historyStart=0,historyLoading=false,passwordSaving=false;
 const size=20;
 function toggle(id,panel){
  const opening=panel.hidden;panel.hidden=!opening;$(id).setAttribute('aria-expanded',String(opening));return opening;
 }
 $('togglePassword').addEventListener('click',()=>{
  if(passwordSaving)return;
  if(toggle('togglePassword',passwordPanel))$('currentPassword').focus();else{form.reset();$('passwordStatus').textContent='';}
 });
 $('toggleHistory').addEventListener('click',()=>{if(toggle('toggleHistory',historyPanel))loadHistory(0);});
 window.accountToolsReset=()=>{
  generation++;historyLoading=false;historyStart=0;
  passwordPanel.hidden=true;historyPanel.hidden=true;form.reset();
  $('historyList').replaceChildren();$('historyStatus').textContent='';$('passwordStatus').textContent='';
  $('reloadHistory').disabled=false;$('historyPrevious').disabled=true;$('historyNext').disabled=true;$('historyPage').textContent='Trang 1';
  for(const id of ['togglePassword','toggleHistory'])$(id).setAttribute('aria-expanded','false');
 };
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!authorized||!activeUser||busy||passwordSaving)return;
  if($('newPassword').value.length<8){$('passwordStatus').textContent='Mật khẩu mới cần ít nhất 8 ký tự.';return;}
  if($('newPassword').value!==$('confirmPassword').value){$('passwordStatus').textContent='Hai lần nhập mật khẩu mới chưa khớp.';return;}
  if($('newPassword').value===$('currentPassword').value){$('passwordStatus').textContent='Hãy chọn mật khẩu mới khác mật khẩu hiện tại.';return;}
  const epoch=authEpoch,userId=activeUser.id,email=activeUser.email;
  passwordSaving=true;setBusy(true);$('changePasswordButton').disabled=true;
  passwordInputs.forEach(id=>$(id).disabled=true);$('passwordStatus').textContent='Đang xác minh và đổi mật khẩu…';
  try{
   // Re-authenticate the same account, so secure-password-change also has a fresh session.
   const verified=await cloud.client.auth.signInWithPassword({email,password:$('currentPassword').value});
   if(verified.error)throw new Error('Mật khẩu hiện tại không đúng hoặc chưa xác minh được. Hãy thử lại.');
   if(epoch!==authEpoch||!authorized||activeUser?.id!==userId||verified.data?.user?.id!==userId)return;
   // This vendored SDK forwards attributes unchanged to the Auth API.
   const result=await cloud.client.auth.updateUser({password:$('newPassword').value,current_password:$('currentPassword').value});
   if(result.error)throw result.error;
   if(epoch===authEpoch)$('passwordStatus').textContent='Đã đổi mật khẩu thành công.';
  }catch(error){if(epoch===authEpoch)$('passwordStatus').textContent='Chưa đổi được mật khẩu. '+errorText(error);}
  finally{form.reset();passwordSaving=false;setBusy(false);$('changePasswordButton').disabled=false;passwordInputs.forEach(id=>$(id).disabled=false);}
 });
 window.addEventListener('beforeunload',event=>{if(passwordSaving||passwordInputs.some(id=>$(id).value)){event.preventDefault();event.returnValue='';}});
 const fields={customer_name:'Tên khách',item:'Hàng mua',amount_k:'Số tiền',commission_amount:'Hoa hồng đã nhận',payment_method:'Thanh toán',delivery_status:'Trạng thái',note:'Ghi chú'};
 function valueText(key,value){
  if(value===undefined||value===null||value==='')return '—';
  if(key==='amount_k')return fmt(Number(value));
  if(key==='commission_amount')return fmtCommission(Number(value));
  return String(value);
 }
 function node(tag,text){const element=document.createElement(tag);element.textContent=text;return element;}
 function renderHistory(rows){
  $('historyList').replaceChildren(...rows.map(row=>{
   const entry=document.createElement('li'),after=row.after_data||{},before=row.before_data||{},deleted=row.action==='DELETE';
   entry.append(node('strong',(row.action==='INSERT'?'Thêm đơn':deleted?'Xóa đơn':'Sửa đơn')+' · '+(after.customer_name||before.customer_name||'Đơn #'+row.order_id)));
   const date=new Date(row.recorded_at);
   entry.append(node('small',(Number.isNaN(date.getTime())?'Chưa rõ thời gian':date.toLocaleString('vi-VN',{timeZone:ORDER_TIME_ZONE}))+' · '+(row.actor_email||'Hệ thống')));
   const details=document.createElement('details'),list=document.createElement('dl');details.append(node('summary','Xem nội dung '+(row.action==='INSERT'?'đã thêm':deleted?'đã xóa':'thay đổi')));
   for(const [key,label] of Object.entries(fields)){
    if(row.action==='UPDATE'&&JSON.stringify(before[key]??null)===JSON.stringify(after[key]??null))continue;
    const group=document.createElement('div');group.append(node('dt',label));
    group.append(node('dd',row.action==='INSERT'?valueText(key,after[key]):deleted?valueText(key,before[key]):valueText(key,before[key])+' → '+valueText(key,after[key])));list.append(group);
   }
   if(!list.children.length)list.append(node('dd','Đã lưu cập nhật đơn hàng.'));
   details.append(list);entry.append(details);return entry;
  }));
 }
 async function loadHistory(start){
  if(!authorized||historyLoading)return;
  const request=++generation,epoch=authEpoch;historyLoading=true;
  $('reloadHistory').disabled=true;$('historyPrevious').disabled=true;$('historyNext').disabled=true;$('historyStatus').textContent='Đang tải lịch sử…';
  try{
   const rows=await cloud.history(start,size);
   if(request!==generation||epoch!==authEpoch||!authorized)return;
   historyStart=start;renderHistory(rows);$('historyPage').textContent='Trang '+(start/size+1);
   $('historyStatus').textContent=rows.length?'':'Chưa có lịch sử được ghi nhận.';
   $('historyPrevious').disabled=start===0;$('historyNext').disabled=rows.length<size;
  }catch(error){
   if(request!==generation||epoch!==authEpoch)return;
   $('historyList').replaceChildren();
   $('historyStatus').textContent=['42P01','PGRST205'].includes(error?.code)?'Lịch sử chưa được bật trong Supabase. Chủ cửa hàng cần chạy tệp supabase-order-history.sql.':'Chưa tải được lịch sử. '+errorText(error);
  }finally{if(request===generation){historyLoading=false;$('reloadHistory').disabled=false;}}
 }
 $('reloadHistory').addEventListener('click',()=>loadHistory(historyStart));
 $('historyPrevious').addEventListener('click',()=>loadHistory(Math.max(0,historyStart-size)));
 $('historyNext').addEventListener('click',()=>loadHistory(historyStart+size));
})();
