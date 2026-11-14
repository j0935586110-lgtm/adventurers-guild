import assert from 'node:assert/strict';
import handler, {mapJob} from '../api/opportunities.js';
const job={title:'AI Agent Engineer',companyName:'Example',guid:'https://himalayas.app/companies/example/jobs/ai',applicationLink:'https://himalayas.app/companies/example/jobs/ai?utm_source=api',locationRestrictions:['Taiwan'],expiryDate:Math.floor(Date.now()/1000)+86400};
assert.equal(mapJob(job).applicationLink,job.applicationLink);
assert.equal(mapJob({...job,locationRestrictions:['United States']}),null);
assert.equal(mapJob({...job,expiryDate:1}),null);
assert.equal(mapJob({...job,applicationLink:'https://evil.example/'}),null);
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(body){this.body=body;return this;}};}
let r=response(); await handler({method:'POST',query:{q:'ai agent'}},r);assert.equal(r.statusCode,405);
r=response();await handler({method:'GET',query:{q:'https://evil.example'}},r);assert.equal(r.statusCode,400);
const original=globalThis.fetch;
try {globalThis.fetch=async (url)=>{assert.equal(url.hostname,'himalayas.app');assert.equal(url.searchParams.get('country'),'TW');return {ok:true,json:async()=>({jobs:[job,{...job,locationRestrictions:['US']}],updatedAt:'today'})};};
 r=response();await handler({method:'GET',query:{q:'ai agent'}},r);assert.equal(r.statusCode,200);assert.equal(r.body.jobs.length,1);assert.equal(r.body.jobs[0].applicationLink,job.applicationLink);assert.equal(r.body.type,'employment_not_freelance');
} finally {globalThis.fetch=original;}
console.log('opportunities-contract: 7 assertions passed');
