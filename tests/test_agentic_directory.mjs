import assert from "node:assert/strict";
import {test} from "node:test";
import handler,{buildPublicQuery,projectPublicRecords,cleanSearchTerm} from "../api/agentic-directory.js";

function mockRes(){
 return {
  code:0,headers:{},body:null,
  setHeader(k,v){this.headers[k]=v;return this},
  status(code){this.code=code;return this},
  json(data){this.body=data;return this},
 };
}

test("only explicit published records are queried, with bounded safe fields",()=>{
 const u=buildPublicQuery("needs",{keyword:"Excel%.*);or=owner_id",city:"Taipei",kind:"hiring",limit:99});
 assert.equal(u.searchParams.get("status"),"eq.published");
 assert.equal(u.searchParams.get("kind"),"eq.hiring");
 assert.equal(u.searchParams.get("limit"),"12");
 const f=u.searchParams.get("select");
 assert.equal(f.includes("owner_id"),false);
 assert.equal(f.includes("message"),false);
 assert.equal(f.includes("email"),false);
 assert.equal(u.searchParams.get("title").includes(")"),false);
});
test("public records projection never includes database contact or private fields",()=>{
 const obj={id:"x",title:"Excel helper",city:"Taipei",kind:"support",owner_id:"secret",email:"secret@example",contact:"private"};
 const records=projectPublicRecords("needs",[obj]);
 assert.equal(records.length,1);
 assert.equal(records[0].title,"Excel helper");
 assert.equal("owner_id" in records[0],false);
 assert.equal("email" in records[0],false);
 assert.equal("contact" in records[0],false);
 assert.equal(records[0].agentVerified,false);
});
test("request input filter prevents SQL/PostgREST operator text and wildcard injection",()=>{
 assert.equal(cleanSearchTerm("Excel*%().,;"),"Excel");
 assert.equal(cleanSearchTerm("繁體中文 Excel"),"繁體中文 Excel");
});
test("only GET is allowed",async()=>{
 const res=mockRes();
 await handler({method:"POST",query:{}},res);
 assert.equal(res.code,405);assert.equal(res.body.ok,false);
});
test("the directory never claims a verified AI agent",async()=>{
 const prev=globalThis.fetch;
 try{
  globalThis.fetch=async(url,params)=>{
   assert.equal(url.searchParams.get("status"),"eq.published");
   assert.match(params.headers.apikey,/^sb_publishable_/);
   return {ok:true,json:async()=>[]};
  };
  const res=mockRes();
  await handler({method:"GET",query:{keyword:"Excel",city:"Taipei",kind:"cooperation"}},res);
  assert.equal(res.code,200);
  assert.equal(res.body.ok,true);
  assert.deepEqual(res.body.agents,[]);
  assert.equal(res.body.count,0);
  assert.equal(res.body.nextAction.requiresExplicitUserConfirmation,true);
 }finally{globalThis.fetch=prev;}
});
test("upstream outage cannot be returned as zero verified matches",async()=>{
 const prev=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{throw new Error("test outage")};
  const res=mockRes();
  await handler({method:"GET",query:{}},res);
  assert.equal(res.code,502);
  assert.equal(res.body.ok,false);
  assert.equal(res.body.error,"public_directory_unavailable");
 }finally{globalThis.fetch=prev;}
});
