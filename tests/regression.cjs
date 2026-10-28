const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const html=fs.readFileSync(path.join(__dirname,'../index.html'));
const KEY='phan-loai-don-hang-v2';
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.accept());
 const url=`http://127.0.0.1:${server.address().port}`;
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 const fill=async(name,item='Sản phẩm thử',price='340')=>{if(!await page.locator('#editor').evaluate(el=>el.open))await page.locator('#addOrder').click();await page.locator('#fName').fill(name);await page.locator('#fItem').fill(item);await page.locator('#fPrice').fill(price);};
 try {
 await page.goto(url);assert.equal((await saved()).length,31);
 assert.equal(await page.locator('#editor').isVisible(),false);assert.equal(await page.locator('#rows tr').count(),10);
 assert.equal(await page.locator('.compact-stats').getAttribute('open'),null);
 const firstCustomer=await page.locator('#rows .customer').first().innerText();
 await page.locator('#pagerTop').getByRole('button',{name:'Sau →',exact:true}).click();assert.equal(await page.locator('#pagerBottom span').innerText(),'Trang 2 / 4');assert.notEqual(await page.locator('#rows .customer').first().innerText(),firstCustomer);
 await page.locator('#pagerBottom').getByRole('button',{name:'Sau →',exact:true}).click();await page.locator('#pagerBottom').getByRole('button',{name:'Sau →',exact:true}).click();assert.equal(await page.locator('#rows tr').count(),1);assert.equal(await page.locator('#pagerTop').getByRole('button',{name:'Sau →',exact:true}).isDisabled(),true);
 // Deleting the sole row on the last page clamps the page instead of leaving it empty.
 await page.locator('#rows').getByRole('button',{name:'Xóa',exact:false}).click();assert.equal(await page.locator('#pagerTop span').innerText(),'Trang 3 / 3');assert.equal(await page.locator('#rows tr').count(),10);
 await page.locator('#resetButton').click();
 await page.locator('#addOrder').click();assert.equal(await page.locator('#editor').isVisible(),true);assert.equal(await page.locator('#fName').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#editor').isVisible(),false);assert.equal(await page.locator('#addOrder').evaluate(el=>el===document.activeElement),true);
 await page.locator('#pagerTop').getByRole('button',{name:'Sau →',exact:true}).click();
 await page.locator('#q').fill('ngoc quynh');assert.equal(await page.locator('#rows tr').count(),2);assert.equal(await page.locator('#pagerTop span').innerText(),'Trang 1 / 1');await page.locator('#clearFilters').click();
 const attack='<img src=x onerror="window.xss=true">';await fill(attack);await page.locator('#saveButton').click();assert.equal((await saved()).length,32);assert.equal(await page.locator('#rows img').count(),0);assert.equal(await page.evaluate(()=>window.xss),undefined);
 await page.locator('#rows tr').first().getByRole('button',{name:'Sửa',exact:false}).click();await page.locator('#fPrice').fill('125.5');await page.locator('#saveButton').click();assert.equal((await saved())[0].price,125.5);
 await page.locator('#rows tr').first().getByRole('button',{name:'Sửa',exact:false}).click();await page.locator('#cancelEdit').click();assert.equal(await page.locator('#fName').inputValue(),'');
 await page.locator('#rows tr').first().getByRole('button',{name:'Sửa',exact:false}).click();await page.evaluate(()=>delOrder(orders[0].id));await fill('Đơn sau khi xóa');await page.locator('#saveButton').click();assert.equal((await saved())[0].name,'Đơn sau khi xóa');
 await fill('  ');await page.locator('#saveButton').click();assert.equal((await saved()).length,32);await page.locator('#fName').fill('=1+1');await page.locator('#saveButton').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportButton').click();const download=await downloadPromise;const csv=fs.readFileSync(await download.path(),'utf8');assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('Tên khách'));assert.equal(await page.locator('#rows tr').count(),10);assert.equal(csv.split('\r\n').length,34);
 // Failed writes preserve both stored data and form input.
 await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};});await fill('Không được lưu');await page.locator('#saveButton').click();assert.equal((await saved()).length,33);assert.equal(await page.locator('#fName').inputValue(),'Không được lưu');assert.equal(await page.locator('#storageWarning').isVisible(),true);await page.evaluate(()=>{Storage.prototype.setItem=window.originalSet;});
 // Preserve an intentional empty list, including after deleting the final order.
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify([{id:1,name:'Cuối cùng',item:'Son',price:340,pay:'Chưa rõ',del:'Chưa rõ',note:''}])),KEY);await page.reload();await page.getByRole('button',{name:'Xóa đơn của Cuối cùng',exact:true}).click();await page.reload();assert.deepEqual(await saved(),[]);assert.ok((await page.locator('#rows').innerText()).includes('Chưa có đơn hàng'));
 // Bad stored data must not be overwritten automatically.
 for(const raw of ['broken','{}','[{"id":1}]']){await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw});await page.reload();assert.equal(await page.locator('#storageWarning').isVisible(),true);assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),raw);}
 await page.locator('#resetButton').click();assert.equal((await saved()).length,31);
 // Cross-tab writes refresh data and exit stale edit mode.
 await page.locator('#rows tr').first().getByRole('button',{name:'Sửa',exact:false}).click();const tab=await page.context().newPage();await tab.goto(url);await tab.evaluate(key=>localStorage.setItem(key,'[]'),KEY);await page.waitForFunction(()=>document.getElementById('formTitle').textContent==='Thêm đơn mới');assert.ok((await page.locator('#rows').innerText()).includes('Chưa có đơn hàng'));await tab.close();await page.locator('#resetButton').click();
 fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
 await page.screenshot({path:path.join(__dirname,'../test-results/desktop.png'),fullPage:true});
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No page overflow at ${width}px`);}
 await page.setViewportSize({width:375,height:900});
 await page.locator('#addOrder').click();assert.equal(await page.locator('#editor').evaluate(el=>Math.round(el.getBoundingClientRect().width)),375);assert.equal(await page.locator('#saveButton').isVisible(),true);await page.locator('#closeDialog').click();
 await page.evaluate(()=>scrollTo(0,600));assert.equal(await page.locator('.list-tools').evaluate(el=>Math.round(el.getBoundingClientRect().top)),0);await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(__dirname,'../test-results/mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: seed, accent search, XSS, CRUD, cancel, edit-delete, validation, CSV, storage failure, empty reload, corrupt data, cross-tab, pagination, filter reset, page clamp, modal focus/Escape, mobile fullscreen, sticky filters and responsive widths.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
