import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {test} from "node:test";
import {registerActions,searchPublicJobs,KEYWORDS} from "../public/agentic-actions.js";
const get=f=>JSON.parse(readFileSync(new URL("../public/"+f,import.meta.url),"utf8"));
test("public manifest resolves real browser runtime",()=>{
 const m=get("agent-manifest.json"),n=get("guild_public_opportunity_finder.network.json");
 assert.equal(m.networks[0].front_man,"guild_matchmaker");
 assert.equal(m.networks[0].hocon,"./guild_public_opportunity_finder.network.json");
 assert.equal(n.tools[0].name,"guild_matchmaker");
 assert.equal(m.peer_policy.mode,"closed");
 assert.equal(existsSync(new URL("../public/agentic-runtime/index.js",import.meta.url)),true);
 assert.equal(existsSync(new URL("../public/agentic-runtime/LICENSE.txt",import.meta.url)),true);
});
test("agent actions are only public reads",()=>{
 const regs=[];registerActions({register:a=>regs.push(a)});
 assert.deepEqual(regs.map(x=>x.name),["search_public_jobs","get_guild_capabilities"]);
 assert.ok(regs.every(x=>x.effect==="read"));
 assert.deepEqual(regs[0].inputSchema.properties.keyword.enum,[...KEYWORDS]);
});
test("returns source data without inventing results",async()=>{
 let path,options;
 const r=await searchPublicJobs("ai agent",async(u,o)=>{
  path=u;options=o;
  return {ok:true,json:async()=>({source:"Himalayas",jobs:[{title:"Actual listing",company:"Company",applicationLink:"https://himalayas.app/jobs/1",regions:["Taiwan"]}]})};
 });
 assert.equal(path,"/api/opportunities?q=ai%20agent");
 assert.equal(options.credentials,"omit");assert.equal(r.ok,true);
 assert.equal(r.jobs[0].title,"Actual listing");
});
test("invalid keyword never calls remote endpoint",async()=>{
 const r=await searchPublicJobs("malicious",()=>{throw Error("should not call");});
 assert.equal(r.error,"unsupported_keyword");
});
test("upstream error does not produce fake success",async()=>{
 const r=await searchPublicJobs("excel",async()=>({ok:false,status:502}));
 assert.equal(r.ok,false);assert.equal(r.error,"upstream_unavailable");
});
