/* Uses the vendored Supabase SDK. Never use a service_role/secret key here. */
window.createOrdersCloud = function (url, publicKey) {
  if (!window.supabase) throw new Error('Không tải được thư viện đăng nhập. Vui lòng tải lại trang.');
  const client = window.supabase.createClient(url, publicKey);
  const columns = 'id,customer_name,item,amount_k,payment_method,delivery_status,note,version,created_at';
  const toApp = r => ({id:r.id,name:r.customer_name,item:r.item,price:Number(r.amount_k),pay:r.payment_method,del:r.delivery_status,note:r.note||'',version:r.version});
  const toRow = o => ({customer_name:o.name,item:o.item,amount_k:o.price,payment_method:o.pay,delivery_status:o.del,note:o.note||''});
  function check(result) { if (result.error) throw result.error; return result.data; }
  return {
    client,
    async member() { const data=check(await client.from('order_members').select('user_id,role').maybeSingle()); if(!data)throw new Error('Tài khoản chưa được cấp quyền quản lý đơn. Vui lòng liên hệ chủ cửa hàng.'); return data; },
    async list() {
      // PostgREST defaults to 1,000 rows. Fetch all pages before replacing the list.
      const rows=[];
      for(let start=0;;start+=500){const batch=check(await client.from('orders').select(columns).order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,start+499));rows.push(...batch);if(batch.length<500)break;}
      return rows.map(toApp);
    },
    async insert(order) { return toApp(check(await client.from('orders').insert(toRow(order)).select(columns).single())); },
    async update(order, version) { const data=check(await client.from('orders').update(toRow(order)).eq('id',order.id).eq('version',version).select(columns)); if(data.length!==1)throw new Error('Đơn đã được người khác sửa hoặc xóa. Nội dung nhập vẫn được giữ; hãy tải lại danh sách và mở lại đơn để đối chiếu.'); return toApp(data[0]); },
    async remove(order) { const data=check(await client.from('orders').delete().eq('id',order.id).eq('version',order.version).select('id')); if(data.length!==1)throw new Error('Đơn đã thay đổi hoặc bị xóa. Hãy tải lại danh sách trước khi thử lại.'); },
  };
};
