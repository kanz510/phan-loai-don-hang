import assert from 'node:assert/strict';
import {queryOrders,trackQueryPages,incompleteReply} from '../supabase/functions/order-chat/core.mjs';
const base={from:null,to:null,customer:null,product:null,delivery:null,payment:null,group_by:'customer',include_details:false,include_notes:false};
const rows=Array.from({length:123},(_,i)=>({
 id:i,customer_name:'Khach '+i,item:'Test',amount_k:String(i+1),commission_amount:String(123-i),
 payment_method:'CK',delivery_status:'Đã giao',created_at:'2026-11-01T12:00:00Z',note:''
}));
const byValue=queryOrders(rows,{...base,group_top:5,group_sort:'active_value'});
assert.equal(byValue.total_groups,123);
assert.equal(byValue.groups.length,5);
assert.equal(byValue.groups[0].label,'Khach 122');
assert.equal(byValue.group_rank_complete,true);
assert.equal(byValue.groups_page,undefined);
const coverage=new Map();trackQueryPages(coverage,byValue);
assert.equal(incompleteReply(coverage),null);
const byCommission=queryOrders(rows,{...base,group_top:3,group_sort:'commission'});
assert.equal(byCommission.groups[0].label,'Khach 0');
assert.equal(byCommission.groups[0].received_commission_vnd,'123');
for(const group_top of [0,-1,51,1.5,'3'])assert.throws(()=>queryOrders(rows,{...base,group_top}));
assert.throws(()=>queryOrders(rows,{...base,group_by:'none',group_top:3}));
console.log('PASS Wave 1 ranked group checks');
