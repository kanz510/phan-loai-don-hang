/* Wave 3: deterministic reports and CSV tests; no live Supabase access. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const code=['app-utils.js','app-orders.js','app-report.js'].map(name=>fs.readFileSync(path.join(root,name),'utf8')).join('\n');
const context=vm.createContext({});
vm.runInContext(code,context);
const {reportMonthly,reportSelection,reportAggregate,reportComparison,reportOrderValueVnd,orderCSVRows,csvCell}=
 vm.runInContext('({reportMonthly,reportSelection,reportAggregate,reportComparison,reportOrderValueVnd,orderCSVRows,csvCell})',context);
const row=(id,createdAt,del,price,commission,extra={})=>({
 id,createdAt,del,price,commission,name:'Khách '+id,item:'Sản phẩm '+id,pay:'CK',note:'',version:1,...extra
});
const entries=[
 row(1,'2026-10-31T16:59:59Z','Chưa giao',125.501,50000,{comState:'partial',comExpected:90000}),
 row(2,'2026-10-31T16:59:59Z','Đã hủy',20,1000,{comState:'received'}),
 row(3,'2026-10-31T17:00:00Z','Đã giao',200,0,{comState:'pending'}),
 row(4,'2025-11-01T12:00:00Z','Đã giao',100,120000,{comState:'received'}),
 row(5,'2026-02-29T00:00:00Z','Chưa giao',5,0) // valid UTC timestamp rolls to March 1
];
const months=reportMonthly(entries,2026);
assert.equal(months.length,12);
assert.equal(months[9].count,2);assert.equal(months[9].cancelled,1);
assert.equal(months[9].activeValueVnd,125501n);
assert.equal(months[9].receivedCommissionVnd,51000n);
assert.equal(months[9].pendingCommission,1);
assert.equal(months[10].count,1);
assert.equal(months[10].activeValueVnd,200000n);
assert.equal(months[10].pendingCommission,1);
assert.equal(months[2].count,1);
const annual=reportSelection(entries,2026,0);
assert.equal(annual.current.count,4);
assert.equal(annual.previous.count,1); // Must compare with 2025, not with itself.
assert.equal(annual.current.activeValueVnd,330501n);
assert.equal(annual.current.receivedCommissionVnd,51000n);
const nov=reportSelection(entries,2026,11);
assert.equal(nov.current.count,1);assert.equal(nov.previous.count,2);
const jan=reportSelection(entries,2026,1);
assert.equal(jan.previous.count,0);
assert.equal(reportSelection([],1970,0).previous,null);
assert.match(reportComparison(nov.current,reportAggregate([])),/không tính %/);
assert.doesNotMatch(reportComparison(nov.current,reportAggregate([])),/Infinity|NaN/);
assert.throws(()=>reportMonthly([],1969));
assert.equal(reportOrderValueVnd({price:12.345}),12345n);
const large=Array.from({length:1001},(_,i)=>row(i,'2026-04-04T00:00:00Z','Đã giao',9000000000,9000000000000));
const largeMonth=reportMonthly(large,2026)[3];
assert.equal(largeMonth.activeValueVnd,9009000000000000n);
assert.equal(largeMonth.receivedCommissionVnd,9009000000000000n);
const filtered=entries.filter(o=>o.del==='Chưa giao');
const csv=orderCSVRows(filtered);
assert.equal(csv.length,3);assert.equal(csv[0].length,11);
assert.equal(csv[1][0],'Khách 1');
assert.equal(csv[2][0],'Khách 5');
assert.match(csvCell('=1+1'),/^"'=/); // Guard spreadsheet formula injection.
assert.match(csvCell('+CMD'),/^"'\+/);
assert.equal(csvCell('two,fields'),'"two,fields"');
console.log('PASS wave3: Vietnam date edges, annual/month comparison, cancelled value policy, precise BigInt totals, CSV subset/formula guard.');
