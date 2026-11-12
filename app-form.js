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
 refreshSeq++;editorDirty=false;if(page==='index'&&window.orderSheetSaved){window.orderSheetSaved();}else{location.assign(listReturn);}

 }catch(error){if(epoch===authEpoch)notify('Chưa lưu được. '+(o.del==='Đã hủy'?cancelError(error):errorText(error)));}
 finally{setBusy(false);}
}



// Go y ten hang da nhap trong cac don cu, su dung du lieu da duoc cap quyen va nap san.
function findItemSuggestions(query, sourceOrders, maxResults = 5) {
 const term = normalize(String(query || '')).replace(/\s+/g, ' ');
 if (term.length < 2) return [];
 const unique = new Map();
 for (const order of sourceOrders) {
  if (!order || typeof order.item !== 'string') continue;
  const value = order.item.trim().replace(/\s+/g, ' ');
  if (!value) continue;
  const key = normalize(value).replace(/\s+/g, ' ');
  if (!key.includes(term) || key === term) continue;
  const parsed = Date.parse(order.createdAt || '');
  const last = Number.isFinite(parsed) ? parsed : 0;
  const existing = unique.get(key);
  if (existing) {
   existing.count++;
   if (last > existing.last) {
    existing.value = value;
    existing.last = last;
   }
  } else {
   const rank = key.startsWith(term) ? 0 :
    key.split(' ').some(word => word.startsWith(term)) ? 1 : 2;
   unique.set(key, { value, key, count: 1, last, rank });
  }
 }
 return Array.from(unique.values())
  .sort((a, b) => a.rank - b.rank || b.count - a.count ||
   b.last - a.last || a.value.localeCompare(b.value, 'vi'))
  .slice(0, maxResults);
}

function initItemAutocomplete() {
 const input = $('fItem');
 if (!input || input.dataset.itemSuggestReady === 'true') return;
 const field = input.closest('.field');
 if (!field) return;
 input.dataset.itemSuggestReady = 'true';
 input.autocomplete = 'off';
 field.classList.add('item-suggest-field');

 const list = document.createElement('div');
 list.id = 'itemSuggestions';
 list.className = 'item-suggestions';
 list.setAttribute('role', 'listbox');
 list.setAttribute('aria-label', 'Tên hàng đã có trong đơn cũ');
 list.hidden = true;
 field.append(list);

 input.setAttribute('role', 'combobox');
 input.setAttribute('aria-autocomplete', 'list');
 input.setAttribute('aria-haspopup', 'listbox');
 input.setAttribute('aria-controls', list.id);
 input.setAttribute('aria-expanded', 'false');

 let candidates = [];
 let activeIndex = -1;
 function close() {
  list.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  activeIndex = -1;
 }
 function setActive(index) {
  activeIndex = index;
  for (const option of list.children) {
   const selected = Number(option.dataset.itemOption) === index;
   option.setAttribute('aria-selected', String(selected));
  }
  if (index >= 0) input.setAttribute('aria-activedescendant', 'itemSuggestion' + index);
  else input.removeAttribute('aria-activedescendant');
 }
 function selectItem(index) {
  const match = candidates[index];
  if (!match) return;
  input.value = match.value;
  // Bao dam co che bao chua luu va kiem tra input hien tai van hoat dong.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  close();
 }
 function update() {
  if (!authorized || !dataLoaded) { close(); return; }
  candidates = findItemSuggestions(input.value, orders);
  list.replaceChildren();
  if (!candidates.length) { close(); return; }

  candidates.forEach((item, index) => {
   const option = document.createElement('div');
   option.id = 'itemSuggestion' + index;
   option.className = 'item-suggestion';
   option.dataset.itemOption = String(index);
   option.setAttribute('role', 'option');
   option.setAttribute('aria-selected', 'false');
   const name = document.createElement('span');
   name.className = 'item-suggestion-name';
   name.textContent = item.value;
   const count = document.createElement('small');
   count.className = 'item-suggestion-count';
   count.textContent = item.count + ' đơn';
   option.append(name, count);
   list.append(option);
  });
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  setActive(0);
 }
 input.addEventListener('input', update);
 input.addEventListener('focus', update);
 input.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !list.hidden) {
   event.preventDefault();
   close();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
   if (list.hidden) update();
   if (list.hidden) return;
   event.preventDefault();
   setActive((activeIndex + (event.key === 'ArrowDown' ? 1 : -1) +
    candidates.length) % candidates.length);
  } else if (event.key === 'Enter' && !list.hidden && activeIndex >= 0) {
   event.preventDefault();
   selectItem(activeIndex);
  }
 });
 // iOS Safari: de su kien cham chon xu ly truoc khi mat focus dong dropdown.
 input.addEventListener('blur', () => window.setTimeout(close, 220));
 list.addEventListener('click', event => {
  const option = event.target.closest('[data-item-option]');
  if (!option) return;
  selectItem(Number(option.dataset.itemOption));
 });
}

function initFormBindings(){
initItemAutocomplete();
if(page==='order'){$('cancelEdit').href=listReturn;$('backToOrders').href=listReturn;}
bind('orderForm','submit',saveOrder);for(const id of ['fName','fItem'])bind(id,'input',()=>$(id).setCustomValidity(''));
bind('orderForm','input',()=>editorDirty=true);bind('orderForm','change',()=>editorDirty=true);
window.addEventListener('beforeunload',event=>{if((page==='order'||$('orderSheet')?.open)&&(busy||editorDirty)){event.preventDefault();event.returnValue='';}});
}

