/* Real browser + vendored SDK, mocked Auth/PostgREST. Never touches live orders. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.join(__dirname,'..');
const fixture=()=>Array.from({length:31},(_,i)=>({id:i+1,customer_name:i===15||i===29?'Ngọc Quỳnh':`Khách ${i+1}`,item:'Son Dior',amount_k:340,payment_method:'Chưa rõ',delivery_status:'Chưa rõ',note:'',version:1,created_at:new Date(1700000000000+i*1000).toISOString()}));
let db=fixture(),nextId=32,writeFail=false,readFail=false,readCalls=0,writeCalls=0,member=true,delayWrite=0;
const user={id:'00000000-0000-0000-0000-000000000001',email:'shop@example.test',aud:'authenticated',role:'authenticated'};
const accessToken=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
(async()=>{const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const errors=[];
async function context(){const ctx=await browser.newContext({viewport:{width:1440,height:1000}});await ctx.routeWebSocket('**',ws=>ws.close());
 await ctx.route('https://*.supabase.co/**',async route=>{const req=route.request(),url=new URL(req.url()),method=req.method();const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(url.pathname==='/auth/v1/token'){const body=req.postDataJSON();if(body.password!=='test-password')return send({msg:'Invalid login credentials'},400);return send({access_token:accessToken,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user});}
 if(url.pathname==='/auth/v1/user')return send(user);if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204});
 if(url.pathname==='/rest/v1/order_members')return send(member?[{user_id:user.id,role:'admin'}]:[]);
 if(url.pathname==='/rest/v1/orders'){
 if(method==='GET'){readCalls++;if(readFail)return send({message:'Network unavailable'},503);const rows=[...db].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id-a.id);const start=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||500);return send(rows.slice(start,start+limit));}
 writeCalls++;if(delayWrite)await new Promise(r=>setTimeout(r,delayWrite));if(writeFail)return send({message:'Cannot save now'},503);
 if(method==='POST'){const body=req.postDataJSON(),row={...body,id:nextId++,version:1,created_at:new Date().toISOString()};db.unshift(row);return send(row,201);}
 const id=Number(url.searchParams.get('id').replace('eq.','')),version=Number(url.searchParams.get('version').replace('eq.',''));const index=db.findIndex(o=>o.id===id&&o.version===version);if(index<0)return send([]);
 if(method==='PATCH'){db[index]={...db[index],...req.postDataJSON(),version:db[index].version+1};return send([db[index]]);}
 if(method==='DELETE'){const [row]=db.splice(index,1);return send([{id:row.id}]);}
 }
 return send({message:'Unexpected test request: '+url.pathname},400);
 });return ctx;}
const ctx=await context(),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());const url=`http://127.0.0.1:${server.address().port}`;
const login=async p=>{await p.locator('#email').fill(user.email);await p.locator('#password').fill('test-password');await p.locator('#loginButton').click();await p.locator('#sharedApp').waitFor({state:'visible'});await p.waitForFunction(()=>document.getElementById('syncStatus').textContent.startsWith('Đã đồng bộ'));};
const fill=async(name)=>{if(!await page.locator('#editor').evaluate(el=>el.open))await page.locator('#addOrder').click();await page.locator('#fName').fill(name);await page.locator('#fItem').fill('Son thử');await page.locator('#fPrice').fill('125.5');};
const save=async()=>{await page.locator('#saveButton').click();await page.locator('#editor').waitFor({state:'hidden'});};
try{
await page.goto(url);await page.waitForFunction(()=>document.getElementById('authStatus').textContent.includes('Nhập tài khoản'));
assert.equal(readCalls,0);assert.equal(await page.locator('#sharedApp').isVisible(),false);
// Preserve legacy local orders, never upload them implicitly.
await page.evaluate(()=>localStorage.setItem('phan-loai-don-hang-v2','[{"legacy":true}]'));
await login(page);assert.equal(db.length,31);assert.equal(await page.locator('#rows tr').count(),10);
await page.locator('#pagerTop').getByRole('button',{name:'Sau →',exact:true}).click();assert.equal(await page.locator('#pagerBottom span').innerText(),'Trang 2 / 4');
await page.locator('#q').fill('ngoc quynh');assert.equal(await page.locator('#rows tr').count(),2);assert.equal(await page.locator('#pagerTop span').innerText(),'Trang 1 / 1');await page.locator('#clearFilters').click();
await fill('<img src=x onerror="window.xss=true">');await save();assert.equal(db.length,32);assert.equal(await page.locator('#rows img').count(),0);assert.equal(await page.evaluate(()=>window.xss),undefined);
await page.locator('#rows tr').first().getByRole('button',{name:'Sửa',exact:false}).click();await page.locator('#fPrice').fill('200');await save();assert.equal(db[0].amount_k,200);assert.equal(db[0].version,2);
// Editing snapshot survives background refresh; conflicting update cannot overwrite.
await page.locator('#rows tr').first().getByRole('button',{name:'Sửa',exact:false}).click();db[0].version++;db[0].amount_k=999;await page.evaluate(()=>refreshOrders({silent:true}));await page.locator('#fPrice').fill('1');await page.locator('#saveButton').click();await page.waitForFunction(()=>document.getElementById('dialogNotice').textContent.includes('người khác'));assert.equal(db[0].amount_k,999);assert.equal(await page.locator('#editor').isVisible(),true);await page.keyboard.press('Escape');
writeFail=true;await fill('Không lưu được');await page.locator('#saveButton').click();await page.waitForFunction(()=>document.getElementById('dialogNotice').textContent.includes('Cannot save'));assert.equal(await page.locator('#fName').inputValue(),'Không lưu được');assert.equal(db.length,32);writeFail=false;await page.locator('#cancelEdit').click();
// Slow requests cannot be submitted twice or lose their form while pending.
delayWrite=200;await fill('Chỉ một đơn');const before=writeCalls;await page.locator('#saveButton').click();await page.waitForFunction(()=>document.getElementById('saveButton').disabled);await page.keyboard.press('Escape');assert.equal(await page.locator('#editor').isVisible(),true);await page.locator('#editor').waitFor({state:'hidden'});assert.equal(writeCalls,before+1);delayWrite=0;
await fill('  ');const count=db.length;await page.locator('#saveButton').click();assert.equal(db.length,count);await page.locator('#fName').fill('=1+1');await save();
const downloaded=page.waitForEvent('download');await page.locator('#exportButton').click();const csv=fs.readFileSync(await (await downloaded).path(),'utf8');assert.ok(csv.includes('"\'=1+1"'));assert.equal(csv.split('\r\n').length,db.length+1);
// A distinct browser account/session reads the same central list.
const ctx2=await context(),other=await ctx2.newPage();await other.goto(url);await login(other);assert.ok((await other.locator('#rows').innerText()).includes('=1+1'));await ctx2.close();
await page.reload();await page.locator('#sharedApp').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('syncStatus').textContent.startsWith('Đã đồng bộ'));assert.ok((await page.locator('#rows').innerText()).includes('=1+1'));
readFail=true;await page.locator('#refreshButton').click();await page.locator('#storageWarning').waitFor({state:'visible'});assert.equal(await page.locator('#rows tr').count(),10);readFail=false;
// Empty shared table stays empty, including refresh; no auto seed or local fallback.
db=[];const priorWrites=writeCalls;await page.locator('#refreshButton').click();await page.waitForFunction(()=>document.getElementById('rows').textContent.includes('Chưa có đơn hàng'));await page.reload();await page.locator('#sharedApp').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('rows').textContent.includes('Chưa có đơn hàng'));assert.equal(writeCalls,priorWrites);assert.equal(await page.evaluate(()=>localStorage.getItem('phan-loai-don-hang-v2')),'[{"legacy":true}]');
// Fetch beyond PostgREST's default row limit so totals/CSV aren't truncated.
db=Array.from({length:1001},(_,i)=>({...fixture()[0],id:i+1}));await page.locator('#refreshButton').click();await page.waitForFunction(()=>document.getElementById('statsSummary').textContent.startsWith('1001 đơn'));
db=fixture();await page.locator('#refreshButton').click();await page.waitForFunction(()=>document.getElementById('statsSummary').textContent.startsWith('31 đơn'));
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/shared-desktop.png'),fullPage:true});
for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);}
await page.setViewportSize({width:375,height:900});await page.locator('#addOrder').click();assert.equal(await page.locator('#editor').evaluate(el=>Math.round(el.getBoundingClientRect().width)),375);await page.keyboard.press('Escape');await page.evaluate(()=>scrollTo(0,600));assert.equal(await page.locator('.list-tools').evaluate(el=>Math.round(el.getBoundingClientRect().top)),0);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,'test-results/shared-mobile.png'),fullPage:true});
await page.locator('#logoutButton').click();await page.locator('#authPanel').waitFor({state:'visible'});assert.equal(await page.locator('#sharedApp').isVisible(),false);assert.equal(await page.evaluate(()=>orders.length),0);
member=false;await page.locator('#email').fill(user.email);await page.locator('#password').fill('test-password');await page.locator('#loginButton').click();await page.waitForFunction(()=>document.getElementById('authStatus').textContent.includes('chưa được cấp quyền'));assert.equal(await page.locator('#sharedApp').isVisible(),false);
assert.deepEqual(errors,[]);console.log('PASS browser: auth gate, membership, two browser contexts sharing orders, refresh/session restore, CRUD, snapshot conflict, XSS, validation, failed/duplicate saves, CSV, empty reload, preserved legacy data, 1001 rows, pagination, responsive dialog and sticky filters.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
