/* Reuse the normal order form and save handler in a dashboard bottom sheet. */
(()=>{
 const sheet=$('orderSheet'),form=$('orderForm');
 if(!sheet||!form||typeof sheet.showModal!=='function')return;
 let opener=null;
 function closeSheet(){
  if(busy)return;
  if(editorDirty&&!confirm('Thông tin chưa được lưu. Bạn muốn đóng bảng thêm đơn?'))return;
  editorDirty=false;sheet.close();
 }
 for(const link of document.querySelectorAll('a[href="order.html"]')){
  link.addEventListener('click',event=>{
   if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
   if(!authorized||!dataLoaded)return;
   event.preventDefault();opener=link;
   form.reset();editId=null;editVersion=null;editorDirty=false;editorReady=true;
   $('dialogNotice').hidden=true;$('saveButton').disabled=false;
   sheet.showModal();document.body.classList.add('order-sheet-open');
  });
 }
 $('closeOrderSheet').addEventListener('click',closeSheet);
 $('cancelEdit').addEventListener('click',closeSheet);
 sheet.addEventListener('cancel',event=>{event.preventDefault();closeSheet();});
 sheet.addEventListener('click',event=>{
  if(event.target!==sheet)return;
  const rect=sheet.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeSheet();
 });
 sheet.addEventListener('close',()=>{document.body.classList.remove('order-sheet-open');opener?.focus();});
 window.orderSheetSaved=()=>{
  form.reset();sheet.close();notify('Đã thêm đơn hàng.');
  refreshOrders();
 };
})();
