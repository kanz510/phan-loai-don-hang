import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const nodes={};
class Element{
 constructor(){this.value='';this.textContent='';this.children=[];this.listeners={};this.hidden=false;this.disabled=false;}
 set innerHTML(text){for(const [tag,id] of text.matchAll(/<[^>]*id="([^"]+)"[^>]*>/g)){nodes[id]=new Element();nodes[id].hidden=/\bhidden\b/.test(tag);}}
 setAttribute(key,value){this[key]=value;}
 addEventListener(type,fn){this.listeners[type]=fn;}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 focus(){}
 reset(){for(const id of ['currentPassword','newPassword','confirmPassword'])nodes[id].value='';}
}
nodes.accountToolsMount=new Element();const events={};let verified=0,updated=0,historyCalls=[],historyError=null,verifyError=null;
const ctx={
 $:id=>nodes[id],document:{createElement:()=>new Element()},window:{addEventListener:(type,fn)=>events[type]=fn},
 authorized:true,activeUser:{id:'member',email:'member@example.test'},busy:false,authEpoch:1,
 setBusy(value){ctx.busy=value;},errorText:error=>error.message,ORDER_TIME_ZONE:'Asia/Ho_Chi_Minh',
 fmt:value=>String(value*1000)+' đ',fmtCommission:value=>String(value)+' đ',
 cloud:{client:{auth:{
  signInWithPassword:async()=>{verified++;return {data:{user:{id:'member'}},error:verifyError};},
  updateUser:async attrs=>{updated++;assert.equal(attrs.password,'example-new-password');assert.equal(attrs.current_password,'example-current-password');return {error:null};}
 }},history:async(start,size)=>{historyCalls.push([start,size]);if(historyError)throw historyError;return start===0?Array.from({length:20},(_,i)=>({id:i,action:'UPDATE',order_id:'1',actor_email:'member@example.test',recorded_at:'2026-10-31T12:00:00Z',before_data:{customer_name:'Lan',commission_amount:0},after_data:{customer_name:'Lan',commission_amount:50000}})):[];}}
};
vm.createContext(ctx);vm.runInContext(read('account-tools.js'),ctx);
async function submit(){await nodes.changePasswordForm.listeners.submit({preventDefault(){}});}
nodes.currentPassword.value='example-current-password';nodes.newPassword.value='example-new-password';nodes.confirmPassword.value='mismatch';
await submit();assert.equal(verified,0);assert.equal(updated,0);
nodes.confirmPassword.value='example-new-password';verifyError={message:'invalid'};await submit();assert.equal(updated,0);assert(nodes.passwordStatus.textContent.includes('không đúng'));assert.equal(nodes.currentPassword.value,'');
verifyError=null;nodes.currentPassword.value='example-current-password';nodes.newPassword.value='example-new-password';nodes.confirmPassword.value='example-new-password';await submit();
assert.equal(updated,1);assert.equal(ctx.busy,false);assert.equal(nodes.newPassword.value,'');assert(nodes.passwordStatus.textContent.includes('thành công'));
nodes.toggleHistory.listeners.click();for(let i=0;i<5;i++)await Promise.resolve();
assert.deepEqual(historyCalls[0],[0,20]);assert.equal(nodes.historyList.children.length,20);assert.equal(nodes.historyNext.disabled,false);
nodes.historyNext.listeners.click();for(let i=0;i<5;i++)await Promise.resolve();assert.deepEqual(historyCalls[1],[20,20]);assert.equal(nodes.historyNext.disabled,true);
historyError={code:'PGRST205'};nodes.reloadHistory.listeners.click();for(let i=0;i<5;i++)await Promise.resolve();assert(nodes.historyStatus.textContent.includes('chưa được bật'));assert.equal(nodes.historyList.children.length,0);
ctx.window.accountToolsReset();assert.equal(nodes.historyPanel.hidden,true);assert.equal(nodes.reloadHistory.disabled,false);
ctx.authorized=false;const count=verified;await submit();assert.equal(verified,count);
console.log('PASS: password confirmation, current-password verification, successful Auth update, credential clearing, unauthorized guard; paginated audit history, missing-migration message and session reset.');
