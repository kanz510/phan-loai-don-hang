import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const scripts=['app-utils.js','app-auth.js','app-stats.js','app-orders.js','app-form.js','app.js'];
for(const p of scripts)new vm.Script(read(p),{filename:p});
const token='{{ site.github.build_revision | slice: 0, 8 }}';
for(const p of ['index.html','orders.html','order.html','account.html']){
 const html=read(p);
 assert(html.startsWith('---\nlayout: null\n---\n'));
 assert(html.includes('name="app-version" content="'+token+'"'));
 const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)\?[^"]+)"/g)];
 assert(assets.length>=9);
 for(const [,url] of assets)assert(url.endsWith('?v='+token),p+': '+url);
 assert(html.indexOf('app-utils.js')<html.indexOf('app.js?'));
}
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.value='';this.hidden=false;this.disabled=false;this.listeners={};this.classList={add(){}};}
 setAttribute(k,v){this[k]=v;} append(...nodes){this.children.push(...nodes);} prepend(...nodes){this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=nodes;} addEventListener(k,f){this.listeners[k]=f;}
 querySelectorAll(){return [];} querySelector(){return new Element();}
 scrollIntoView(){} focus(){} click(){this.clicked=true;} remove(){} setCustomValidity(){} reportValidity(){return true;}
}
const fixture=Array.from({length:39},(_,i)=>({id:String(i+1),version:1,name:i===0?'Ngọc Quỳnh':'Khách '+i,item:'Son Dior',price:i===0?590:340,commission:i,del:i<6?'Chưa giao':'Đã giao',pay:'Chưa rõ',note:'',createdAt:'2026-10-'+String(i%2+29)+'T08:00:00Z'}));
async function boot(page){
 const html=read(page+'.html'),nodes={};for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes[id]=new Element();
 for(const [id,value] of Object.entries({fDateMode:'all',fDel:'all',fSort:'newest',fPayIn:'Chưa rõ',fDelIn:'Chưa rõ',fCommission:'0'}))if(nodes[id])nodes[id].value=value;
 const body=new Element();body.dataset.page=page;let exported;
 const cloud={client:{auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'u',email:'test@example.test'}}}})},channel(){return{on(){return this},subscribe(){return this}}}},member:async()=>({role:'admin'}),list:async()=>fixture};
 const document={body,getElementById:id=>nodes[id]||null,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),createDocumentFragment:()=>new Element(),querySelectorAll:()=>[],querySelector:()=>new Element(),addEventListener(){}};
 const NativeURL=URL;class TestURL extends NativeURL{static createObjectURL(b){exported=b;return 'blob:test';}static revokeObjectURL(){}}
 const ctx={window:{createOrdersCloud:()=>cloud,addEventListener(){}},document,location:{href:'https://example.test/shop/'+page+'.html',search:'',pathname:'/shop/'+page+'.html',assign(){},replace(){}},history:{replaceState(){}},URL:TestURL,URLSearchParams,Intl,Date,Blob,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console,crypto:{randomUUID:()=> 'test'},confirm:()=>false};
 vm.createContext(ctx);for(const p of scripts)vm.runInContext(read(p),ctx,{filename:p});
 for(let i=0;i<12;i++)await Promise.resolve();
 return{ctx,nodes,getExport:()=>exported};
}
for(const page of ['index','orders','order','account']){
 const {ctx,nodes,getExport}=await boot(page);
 assert.equal(vm.runInContext('orders.length',ctx),page==='account'?0:39);
 if(page==='index'){assert.equal(nodes.stats.children.length,6);assert.equal(nodes.stats.children[0].children[2].textContent,39);}
 if(page==='orders'){
 assert.equal(nodes.resultCount.textContent,'39 / 39 đơn');assert.equal(nodes.rows.children[0].children.length,10);
 nodes.q.value='ngoc quynh';vm.runInContext('filterChanged()',ctx);assert.equal(nodes.resultCount.textContent,'1 / 39 đơn');
 nodes.q.value='';nodes.fDel.value='Chưa giao';vm.runInContext('filterChanged()',ctx);assert.equal(nodes.resultCount.textContent,'6 / 39 đơn');
 nodes.fDel.value='all';nodes.fSort.value='amount-desc';vm.runInContext('filterChanged()',ctx);assert.equal(vm.runInContext('filteredOrders()[0].price',ctx),590);
 vm.runInContext('currentPage=4;render()',ctx);assert.equal(nodes.rows.children[0].children.length,9);
 vm.runInContext('exportCSV()',ctx);assert.equal((await getExport().text()).split('\r\n').length,40);
 assert.equal(vm.runInContext('orders.length',ctx),39);
 }
 if(page==='order'){assert.equal(nodes.saveButton.disabled,false);assert.equal(vm.runInContext('editorReady',ctx),true);}
 if(page==='account')assert.equal(nodes.accountDetails.hidden,false);
}
console.log('PASS: syntax, unified build version, four-page auth/render, 39 fixture orders, search, filter, sorting, pagination, 39-row CSV, add form.');
