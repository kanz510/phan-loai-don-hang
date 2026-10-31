import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
class Node{
 constructor(){this.listeners={};this.value='';this.disabled=false;this.hidden=false;this.open=false;}
 addEventListener(type,fn){this.listeners[type]=fn;}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.listeners.close?.();}
 reset(){this.resetCount=(this.resetCount||0)+1;}
 setCustomValidity(){}
 reportValidity(){return true;}
}
const nodes=Object.fromEntries(['orderSheet','orderForm','dialogNotice','saveButton','closeOrderSheet','cancelEdit','fName','fItem','fPrice','fCommission','fPayIn','fDelIn','fNote'].map(id=>[id,new Node()]));
const link=new Node(),classes=new Set();let confirmation=false,inserts=0,refreshes=0,redirects=0,rejectSave=false,releaseSave;
const context={
 $:id=>nodes[id],page:'index',authorized:true,dataLoaded:true,busy:false,editorReady:false,editorDirty:false,editId:null,editVersion:null,authEpoch:1,refreshSeq:0,orders:[],listReturn:'orders.html',
 document:{querySelectorAll:()=>[link],body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}},window:{},confirm:()=>confirmation,
 cloud:{insert:async()=>{inserts++;if(rejectSave)throw Error('offline');if(releaseSave)await new Promise(resolve=>releaseSave(resolve));return{id:'new'};}},
 setBusy:value=>{context.busy=value;nodes.saveButton.disabled=value;},notify:message=>{context.message=message;},refreshOrders:()=>refreshes++,
 commissionInputToVnd:value=>Number(value)*1000,validOrder:()=>true,crypto:{randomUUID:()=> 'new'},location:{assign:()=>redirects++},errorText:error=>error.message,
};
vm.createContext(context);vm.runInContext(read('app-form.js'),context);vm.runInContext(read('app-order-sheet.js'),context);
function click(){let prevented=false;link.listeners.click({button:0,preventDefault(){prevented=true;}});return prevented;}
assert(click());assert(nodes.orderSheet.open);assert(classes.has('order-sheet-open'));assert(context.editorReady);
context.editorDirty=true;nodes.closeOrderSheet.listeners.click();assert(nodes.orderSheet.open);
confirmation=true;nodes.cancelEdit.listeners.click();assert(!nodes.orderSheet.open);assert(!classes.has('order-sheet-open'));assert(link.focused);
click();context.busy=true;nodes.closeOrderSheet.listeners.click();assert(nodes.orderSheet.open);context.busy=false;
nodes.fName.value='Khách thử';nodes.fItem.value='Sản phẩm';nodes.fPrice.value='340';nodes.fCommission.value='0';nodes.fPayIn.value='Chưa rõ';nodes.fDelIn.value='Chưa giao';
let complete;releaseSave=resolve=>{complete=resolve;};
const first=vm.runInContext('saveOrder({preventDefault(){}})',context);
await vm.runInContext('saveOrder({preventDefault(){}})',context);assert.equal(inserts,1);complete();await first;
assert(!nodes.orderSheet.open);assert.equal(refreshes,1);assert.equal(redirects,0);assert.equal(context.message,'Đã thêm đơn hàng.');assert(!context.busy);
click();rejectSave=true;releaseSave=null;context.editorDirty=true;
await vm.runInContext('saveOrder({preventDefault(){}})',context);assert(nodes.orderSheet.open);assert(context.editorDirty);assert(context.message.includes('offline'));assert(!context.busy);
console.log('PASS: sheet opens, dirty cancel confirmation, focus return, busy close guard, single insert, dashboard refresh without redirect, failed save keeps form.');
