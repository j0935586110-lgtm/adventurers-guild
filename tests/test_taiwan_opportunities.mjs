import assert from 'node:assert/strict';
import handler,{parseTaiwanJobs} from '../api/taiwan-opportunities.js';
const row=(title, cutoff='20271231', url='https://job.taiwanjobs.gov.tw/Internet/jobwanted/JobDetail.aspx?HIRE_ID=1')=>'<Data>'+Object.entries({'OCCU_DESC（職務名稱）':title,'COMPNAME（公司名稱）':'測試公司','CITYNAME（工作地點）':'高雄市三民區','JOB_DETAIL（工作內容）':'資訊系統自動化','STOP_DATE（應徵截止日期）':cutoff,'URL_QUERY（職缺資料URL）':url,'NT_L（薪資範圍下限）':'40000','NT_U（薪資範圍上限）':'50000','TRANDATE（職缺更新日期）':'20261114'}).map(([k,v])=>`<${k}><![CDATA[${v}]]></${k}>`).join('')+'</Data>';
const xml='<DataList>'+row('資訊系統工程師')+row('餐廳服務生')+row('過期工程師','20240101')+row('惡意網址工程師','20271231','https://evil.example/job')+'</DataList>';
const items=parseTaiwanJobs(xml,{keyword:'tech',today:'20261114'});
assert.equal(items.length,1);assert.equal(items[0].minSalary,40000);assert.equal(items[0].city,'高雄市三民區');assert.equal(items[0].source,'台灣就業通');
function mockResponse(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(s){this.statusCode=s;return this;},json(body){this.body=body;return this;}};}
let r=mockResponse();await handler({method:'POST',query:{}},r);assert.equal(r.statusCode,405);
r=mockResponse();await handler({method:'GET',query:{zip:'1234',q:'tech'}},r);assert.equal(r.statusCode,400);
r=mockResponse();await handler({method:'GET',query:{zip:'807',q:'evil'}},r);assert.equal(r.statusCode,400);
const original=globalThis.fetch;
try{globalThis.fetch=async u=>{assert.equal(u.hostname,'free.taiwanjobs.gov.tw');assert.equal(u.searchParams.get('zipno'),'807');return {ok:true,text:async()=>xml}};
r=mockResponse();await handler({method:'GET',query:{zip:'807',q:'tech'}},r);assert.equal(r.statusCode,200);assert.equal(r.body.jobs.length,1);assert.equal(r.body.coverage,'postal_district_sample_only');
}finally{globalThis.fetch=original}
console.log('taiwan-jobs-contract: 12 assertions passed');
