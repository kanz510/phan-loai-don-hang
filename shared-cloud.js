/* Uses the vendored Supabase SDK. Never use a service_role/secret key here. */
window.createOrdersCloud = function (url, publicKey) {
  if (!window.supabase) throw new Error('Không tải được thư viện đăng nhập. Vui lòng tải lại trang.');
  const client = window.supabase.createClient(url, publicKey);
  const baseColumns = 'id,customer_name,item,amount_k,payment_method,delivery_status,note,version,created_at';
  let commissionAvailable = null;
  const schemaError = error => ['42703','PGRST204'].includes(error?.code) && /commission_amount/i.test(error?.message||'');
  const commissionError = () => new Error('Chưa lưu được hoa hồng: chủ cửa hàng cần chạy tệp supabase-commission.sql trong Supabase rồi tải lại danh sách. Nội dung nhập vẫn được giữ.');
  const columns = () => baseColumns + (commissionAvailable===false?'':',commission_amount');
  const toApp = r => ({id:r.id,name:r.customer_name,item:r.item,price:Number(r.amount_k),commission:Number(r.commission_amount??0),createdAt:r.created_at||null,pay:r.payment_method,del:r.delivery_status,note:r.note||'',version:r.version});
  const toRow = o => {
    const row={customer_name:o.name,item:o.item,amount_k:o.price,payment_method:o.pay,delivery_status:o.del,note:o.note||''};
    const commission=o.commission??0;
    if(commissionAvailable===false){if(commission!==0)throw commissionError();}
    else row.commission_amount=commission;
    return row;
  };
  function check(result) { if (result.error) {if(schemaError(result.error))throw commissionError();throw result.error;} return result.data; }
  return {
    client,
    async member() { const data=check(await client.from('order_members').select('user_id,role').maybeSingle()); if(!data)throw new Error('Tài khoản chưa được cấp quyền quản lý đơn. Vui lòng liên hệ chủ cửa hàng.'); return data; },
    async list() {
      // Probe each refresh so applying the migration activates the field without signing out.
      const rows=[];let useCommission=true;
      for(let start=0;;start+=500){
        let result=await client.from('orders').select(baseColumns+(useCommission?',commission_amount':'')).order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+499);
        if(start===0&&result.error&&schemaError(result.error)){useCommission=false;result=await client.from('orders').select(baseColumns).order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+499);}
        const batch=check(result);rows.push(...batch);if(batch.length<500)break;
      }
      commissionAvailable=useCommission;
      return rows.map(toApp);
    },
    async insert(order) { return toApp(check(await client.from('orders').insert(toRow(order)).select(columns()).single())); },
    async update(order, version) { const data=check(await client.from('orders').update(toRow(order)).eq('id',order.id).eq('version',version).select(columns())); if(data.length!==1)throw new Error('Đơn đã được người khác sửa hoặc xóa. Nội dung nhập vẫn được giữ; hãy tải lại danh sách và mở lại đơn để đối chiếu.'); return toApp(data[0]); },
    async remove(order) { const data=check(await client.from('orders').delete().eq('id',order.id).eq('version',order.version).select('id')); if(data.length!==1)throw new Error('Đơn đã thay đổi hoặc bị xóa. Hãy tải lại danh sách trước khi thử lại.'); },
  };
};
