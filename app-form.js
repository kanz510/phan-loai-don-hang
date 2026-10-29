function initEditor(){
 if(!authorized||!dataLoaded||editorReady)return;editorReady=true;
 const requested=params.get('id');
 if(requested!==null){const order=orders.find(o=>String(o.id)===requested);if(!order){setText('pageTitle','Không tìm thấy đơn');setText('dialogNotice','Đơn không tồn tại hoặc đã bị xóa. Hãy quay lại danh sách.');$('dialogNotice').hidden=false;return;}
 editId=order.id;editVersion=order.version;
 for(const [field,key] of [['fName','name'],['fItem','item'],['fPrice','price'],['fCommission','commission'],['fPayIn','pay'],['fDelIn','del'],['fNote','note']])$(field).value=field==='fCommission'?commissionVndToInput(order.commission):order[key]??'';
 setText('createdDateHint','Ngày tạo đơn: '+displayDate(orderDateKey(order))+' · Giờ Việt Nam');setText('pageTitle','Chỉnh sửa đơn hàng');setText('formTitle','Đơn của '+order.name);setText('formMode','Đang sửa');setText('saveButton','Lưu thay đổi');setText('editNote','Lưu thay đổi để cập nhật đơn hàng dùng chung.');
 }
 $('saveButton').disabled=false;
}
async function saveOrder(e){e.preventDefault();if(busy||!authorized||!editorReady||!dataLoaded||$('saveButton').disabled)return;const o={name:$('fName').value.trim(),item:$('fItem').value.trim(),price:Number($('fPrice').value),commission:commissionInputToVnd($('fCommission').value),pay:$('fPayIn').value,del:$('fDelIn').value,note:$('fNote').value.trim()};
 for(const id of ['fName','fItem']){const input=$(id);input.setCustomValidity(input.value.trim()?'':'Vui lòng nhập nội dung, không chỉ khoảng trắng.');if(!input.reportValidity())return;}
 const id=editId??crypto.randomUUID();if(!validOrder({id,version:editVersion??1,...o})||$('fPrice').value.trim()===''){notify('Vui lòng kiểm tra thông tin và số tiền hợp lệ.');return;}
 const isEditing=editId!==null;if(isEditing&&!orders.some(x=>x.id===editId)){notify('Đơn này không còn tồn tại. Vui lòng quay lại danh sách.');return;}
 const epoch=authEpoch;const version=editVersion;setBusy(true);let saved;
 try{saved=isEditing?await cloud.update({id,...o},version):await cloud.insert(o);if(epoch!==authEpoch)return;
 refreshSeq++;editorDirty=false;location.assign(listReturn);

 }catch(error){if(epoch===authEpoch)notify('Chưa lưu được. '+(o.del==='Đã hủy'?cancelError(error):errorText(error)));}
 finally{setBusy(false);}
}


function initFormBindings(){
if(page==='order'){$('cancelEdit').href=listReturn;$('backToOrders').href=listReturn;}
bind('orderForm','submit',saveOrder);for(const id of ['fName','fItem'])bind(id,'input',()=>$(id).setCustomValidity(''));
bind('orderForm','input',()=>editorDirty=true);bind('orderForm','change',()=>editorDirty=true);
window.addEventListener('beforeunload',event=>{if(page==='order'&&(busy||editorDirty)){event.preventDefault();event.returnValue='';}});
}
