#!/usr/bin/env node
// Live browser smoke and interaction test of a public preview, with no private credentials.
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {WebSocket}=require("undici");
const base=process.env.BASE_URL;
if(!base || !/^https:\/\/[-a-z0-9.]+\.vercel\.app$/.test(base))
 throw Error("BASE_URL must be an explicitly selected HTTPS Vercel preview origin");
const pageUrl=base+"/agentic.html?lang=zh-TW";
const port=19898;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),"guild-cdp-"));
const chrome=spawn("/snap/bin/chromium",[
 "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
 "--no-first-run","--no-default-browser-check",
 "--remote-debugging-port="+port,"--user-data-dir="+profile,pageUrl
],{stdio:"ignore"});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket,seq=0;
const pending=new Map();
async function connect(){
 for(let i=0;i<80;i++){
  try{
   const r=await fetch("http://127.0.0.1:"+port+"/json");
   const list=await r.json();
   const page=list.find(x=>x.type==="page" && x.url.startsWith(base));
   if(page?.webSocketDebuggerUrl){
    socket=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
     socket.addEventListener("open",resolve,{once:true});
     socket.addEventListener("error",reject,{once:true});
    });
    socket.addEventListener("message",evt=>{
     const msg=JSON.parse(evt.data);
     if(msg.id && pending.has(msg.id)){
      const entry=pending.get(msg.id);pending.delete(msg.id);
      if(msg.error)entry.reject(Error(msg.error.message));
      else entry.resolve(msg.result);
     }
    });
    return;
   }
  }catch{}
  await sleep(250);
 }
 throw Error("Chromium CDP did not open page");
}
async function send(method,params={}){
 const id=++seq;
 return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout "+method))},14000);
  pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
  socket.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){
 const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
 if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,400));
 return r.result?.value;
}
async function waitEval(expression,predicate,timeout=13000){
 const start=Date.now();
 while(Date.now()-start<timeout){
  const val=await evaluate(expression);
  if(predicate(val))return val;
  await sleep(250);
 }
 throw Error("Timed out waiting for "+expression);
}
(async()=>{
 await connect();
 await waitEval("document.querySelector('#assistant-status')?.textContent",x=>x?.includes("已啟動"),22000);
 const chinese=await evaluate("document.querySelector('h1').textContent");
 assert.match(chinese,/找到真正/);
 const caps=await evaluate("fetch('/api/agentic-directory?keyword=Excel').then(r=>r.json()).then(x=>({ok:x.ok,count:x.count,agents:x.agents?.length}))");
 assert.equal(caps.ok,true);assert.equal(caps.agents,0);
 const english=await evaluate('(()=>{document.querySelector("[data-language=en]").click();return document.querySelector("h1").textContent})()');
 assert.match(english,/Find real collaborators/);
 const submitted=await evaluate('(()=>{document.querySelector("#task-text").value="Automate our Excel reports, budget NT$3,000";document.querySelector("#match-keyword").value="Excel";document.querySelector("#match-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));return !document.querySelector("#draft-panel").hidden})()');
 assert.equal(submitted,true);
 const match=await waitEval("document.querySelector('#match-results').textContent",x=>x && !x.includes("Looking up"),15000);
 assert.ok(/No matching|Published results|Public Guild search/.test(match));
 const draft=await evaluate('(()=>{const a=document.querySelector("#draft-panel a");a.addEventListener("click",e=>e.preventDefault(),{once:true,capture:true});a.click();return sessionStorage.getItem("guild-need-draft")})()');
 assert.equal(draft,"Automate our Excel reports, budget NT$3,000");
 console.log(JSON.stringify({pass:true,bilingual:true,runtime:"ready",directory:caps,form:"submitted",draft:"handed_off",result:match.slice(0,160)},null,2));
})().catch(e=>{console.error("E2E_FAILED",e.stack);process.exitCode=1;}).finally(()=>{
 try{socket?.close()}catch{}
 chrome.kill("SIGTERM");
 setTimeout(()=>{try{chrome.kill("SIGKILL")}catch{}},2000).unref();
 try{fs.rmSync(profile,{force:true,recursive:true})}catch{}
});
