import assert from "node:assert/strict";
import {test} from "node:test";
import {SYNTHETIC_CANDIDATES,BENCHMARK_QUERIES} from "../src/local-ai-fixtures.js";

test("fixture IDs are unique and cannot be mistaken for real Guild members",()=>{
 const ids=SYNTHETIC_CANDIDATES.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.every(x=>x.startsWith("fixture-")));
});
test("the bilingual benchmark evaluates real Chinese and English queries",()=>{
 assert.equal(BENCHMARK_QUERIES.length,8);
 assert.ok(BENCHMARK_QUERIES.some(q=>q.locale==="zh-TW"&&/[一-龥]/.test(q.query)));
 assert.ok(BENCHMARK_QUERIES.some(q=>q.locale==="en"));
 const ids=new Set(SYNTHETIC_CANDIDATES.map(x=>x.id));
 assert.ok(BENCHMARK_QUERIES.every(q=>ids.has(q.expected)));
});
test("fixture text is not supplied as public candidates by the database API",async()=>{
 const {default:handler}=await import("../api/agentic-directory.js");
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>[]});
  let output;let http;
  const res={setHeader(){return this},status(x){http=x;return this},json(x){output=x;return this}};
  await handler({method:"GET",query:{limit:"12"}},res);
  assert.equal(http,200);
  assert.deepEqual(output.services,[]);
  assert.deepEqual(output.needs,[]);
  assert.deepEqual(output.agents,[]);
  assert.equal(JSON.stringify(output).includes("fixture-"),false);
 }finally{globalThis.fetch=previous}
});
