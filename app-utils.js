const $=id=>document.getElementById(id);
function createIcon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('icon');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','icons.svg#'+name);svg.append(use);return svg;}

const setText=(id,text)=>{if($(id)){$(id).textContent=text;if(id==='saveButton')$(id).prepend(createIcon('save'));}};
const bind=(id,event,handler)=>$(id)?.addEventListener(event,handler);
function safeRoute(candidate,allowed,fallback){try{const url=new URL(candidate,location.href);if(url.origin!==location.origin)return fallback;for(const filename of allowed){if(url.pathname===new URL(filename,location.href).pathname)return filename+url.search;}return fallback;}catch{return fallback;}}

const PAY=['Chưa rõ','CK','COD','Tiền mặt','Chưa thanh toán'], DEL=['Chưa rõ','Đã giao','Chưa giao','Đã hủy'];

const ORDER_TIME_ZONE='Asia/Ho_Chi_Minh';
const orderDateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:ORDER_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
function orderDateKey(order){if(!order.createdAt)return '';const date=new Date(order.createdAt);if(!Number.isFinite(date.getTime()))return '';const parts=Object.fromEntries(orderDateFormatter.formatToParts(date).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
function validDateKey(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);if(y<1970||y>9999)return false;const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;}
function displayDate(key){return validDateKey(key)?key.split('-').reverse().join('/'):'Chưa rõ';}

function validOrder(o){return o&&Number.isSafeInteger(o.version)&&o.version>0&&((typeof o.id==='number'&&Number.isSafeInteger(o.id))||(typeof o.id==='string'&&o.id.length>0))&&typeof o.name==='string'&&!!o.name.trim()&&typeof o.item==='string'&&!!o.item.trim()&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=0&&o.price<=9000000000&&Number.isSafeInteger(o.commission)&&o.commission>=0&&o.commission<=9000000000000&&PAY.includes(o.pay)&&DEL.includes(o.del)&&(o.note===undefined||typeof o.note==='string');}
function parseOrders(raw){const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(validOrder)||new Set(data.map(o=>o.id)).size!==data.length)throw new Error('Dữ liệu không hợp lệ');return data;}

const fmt=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Math.round(n*1000));
const fmtCommission=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
// The form uses thousands of dong; persistence, totals and CSV use whole VND.
function commissionInputToVnd(value){const text=String(value).trim();if(!text)return 0;if(!/^(?:\d+(?:\.\d{0,3})?|\.\d{1,3})$/.test(text))return NaN;const [whole,fraction='']=text.split('.');const amount=BigInt(whole||'0')*1000n+BigInt(fraction.padEnd(3,'0')||'0');return amount<=9000000000000n?Number(amount):NaN;}
function commissionVndToInput(amount){const value=BigInt(amount);const whole=value/1000n;const fraction=String(value%1000n).padStart(3,'0').replace(/0+$/,'');return String(whole)+(fraction?'.'+fraction:'');}
const sumCommissions=list=>list.reduce((sum,o)=>sum+BigInt(o.commission),0n);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
