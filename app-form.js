function advancedOrderFields(){const enabled=!!cloud?.statusEnabled?.();if($('wave1Fields'))$('wave1Fields').hidden=!enabled;return enabled;}
function initEditor(){
 if(!authorized||!dataLoaded||editorReady)return;editorReady=true;advancedOrderFields();
 const requested=params.get('id');
 if(requested!==null){const order=orders.find(o=>String(o.id)===requested);if(!order){setText('pageTitle','Không tìm thấy đơn');setText('dialogNotice','Đơn không tồn tại hoặc đã bị xóa. Hãy quay lại danh sách.');$('dialogNotice').hidden=false;return;}
 editId=order.id;editVersion=order.version;
 for(const [field,key] of [['fName','name'],['fItem','item'],['fPrice','price'],['fCommission','commission'],['fPayIn','pay'],['fDelIn','del'],['fNote','note']])$(field).value=field==='fCommission'?commissionVndToInput(order.commission):order[key]??'';
 if(advancedOrderFields()){$('fCommissionState').value=order.comState;$('fCommissionExpected').value=order.comExpected==null?'':commissionVndToInput(order.comExpected);$('fCollectionStatus').value=order.collection;}
 setText('createdDateHint','Ngày tạo đơn: '+displayDate(orderDateKey(order))+' · Giờ Việt Nam');setText('pageTitle','Chỉnh sửa đơn hàng');setText('formTitle','Đơn của '+order.name);setText('formMode','Đang sửa');setText('saveButton','Lưu thay đổi');setText('editNote','Lưu thay đổi để cập nhật đơn hàng dùng chung.');
 }
 $('saveButton').disabled=false;
}
async function saveOrder(e){e.preventDefault();if(busy||!authorized||!editorReady||!dataLoaded||$('saveButton').disabled)return;const commission=commissionInputToVnd($('fCommission').value),advanced=advancedOrderFields(),pay=$('fPayIn').value;
 const o={name:$('fName').value.trim(),item:$('fItem').value.trim(),price:Number($('fPrice').value),commission,
  comState:advanced?$('fCommissionState').value:commission>0?'received':'pending',
  comExpected:advanced&&$('fCommissionExpected').value.trim()?commissionInputToVnd($('fCommissionExpected').value):null,
  collection:advanced?$('fCollectionStatus').value:pay==='Chưa thanh toán'?'Chưa thu':'Chưa rõ',
  pay,del:$('fDelIn').value,note:$('fNote').value.trim()};
 for(const id of ['fName','fItem']){const input=$(id);input.setCustomValidity(input.value.trim()?'':'Vui lòng nhập nội dung, không chỉ khoảng trắng.');if(!input.reportValidity())return;}
 const id=editId??crypto.randomUUID();if(!validOrder({id,version:editVersion??1,...o})||$('fPrice').value.trim()===''){notify('Kiểm tra số tiền và trạng thái hoa hồng: chưa nhận/không áp dụng cần số đã nhận bằng 0; nhận một phần cần nhập số dự kiến lớn hơn số đã nhận; đã nhận đủ cần số lớn hơn 0.');return;}
 if(advanced&&pay==='Chưa thanh toán'&&o.collection==='Đã thu'){notify('Hình thức “Chưa thanh toán” (cũ) không thể đi cùng trạng thái “Đã thu”. Hãy chọn hình thức phù hợp.');return;}
 const isEditing=editId!==null;if(isEditing&&!orders.some(x=>x.id===editId)){notify('Đơn này không còn tồn tại. Vui lòng quay lại danh sách.');return;}
 const epoch=authEpoch;const version=editVersion;setBusy(true);let saved;
 try{saved=isEditing?await cloud.update({id,...o},version):await cloud.insert(o);if(epoch!==authEpoch)return;
 refreshSeq++;editorDirty=false;if(page==='index'&&window.orderSheetSaved){window.orderSheetSaved();}else{location.assign(listReturn);}

 }catch(error){if(epoch===authEpoch)notify('Chưa lưu được. '+(o.del==='Đã hủy'?cancelError(error):errorText(error)));}
 finally{setBusy(false);}
}


function initFormBindings(){
if(page==='order'){$('cancelEdit').href=listReturn;$('backToOrders').href=listReturn;}
bind('orderForm','submit',saveOrder);for(const id of ['fName','fItem'])bind(id,'input',()=>$(id).setCustomValidity(''));
bind('orderForm','input',()=>editorDirty=true);bind('orderForm','change',()=>editorDirty=true);
 bind('fCommission','input',()=>{if(!cloud?.statusEnabled?.())return;const state=$('fCommissionState'),sum=commissionInputToVnd($('fCommission').value);if(!state||!Number.isSafeInteger(sum))return;if(sum>0&&state.value==='pending')state.value='received';else if(sum===0&&state.value==='received')state.value='pending';});
 bind('fPayIn','change',()=>{if(cloud?.statusEnabled?.()&&$('fPayIn').value==='Chưa thanh toán'&&$('fCollectionStatus').value==='Chưa rõ')$('fCollectionStatus').value='Chưa thu';});
window.addEventListener('beforeunload',event=>{if((page==='order'||$('orderSheet')?.open)&&(busy||editorDirty)){event.preventDefault();event.returnValue='';}});
}

