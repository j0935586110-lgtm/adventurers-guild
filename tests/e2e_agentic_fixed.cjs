#!/usr/bin/env node
const fs=require("fs"),os=require("os"),path=require("path"),{spawn}=require("child_process");
const assert=require("node:assert/strict");
const {WebSocket}=require("undici");
const BASE=process.env.BASE_URL;
if(!BASE || !/^https:\/\/[-a-z0-9.]+\.vercel\.app$/.test(BASE)) throw Error("Set BASE_URL to an explicitly selected HTTPS preview URL");
const OUT=process.env.E2E_OUTPUT_DIR||"/var/tmp/guild-agentic-fix-verification-20261119";
fs.mkdirSync(OUT,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),"guild-audit-"));
const chrome=spawn("/snap/bin/chromium",["--headless","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--remote-debugging-port=19921","--user-data-dir="+profile,BASE+"/agentic.html?lang=zh-TW"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let sock,seq=0;const pending=new Map(),events={exceptions:[],console:[],httpErrors:[]},results={};
async function connect(){
 for(let n=0;n<80;n++){
  try{const rsp=await fetch("http://127.0.0.1:19921/json");const list=await rsp.json();const page=list.find(x=>x.type==="page"&&x.url.startsWith(BASE));
   if(page){sock=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{sock.addEventListener("open",resolve,{once:true});sock.addEventListener("error",reject,{once:true})});
    sock.addEventListener("message",e=>{const r=JSON.parse(e.data);
      if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(r.error.message)):p.resolve(r.result)}
      else if(r.method==="Runtime.exceptionThrown")events.exceptions.push(r.params.exceptionDetails.text);
      else if(r.method==="Runtime.consoleAPICalled")events.console.push({level:r.params.type,text:r.params.args.map(x=>x.value||x.description||"").join(" ").slice(0,150)});
      else if(r.method==="Network.responseReceived"&&r.params.response.status>=400)events.httpErrors.push({status:r.params.response.status,url:r.params.response.url});
    });return;}
  }catch{} await sleep(200);
 }throw Error("CDP not available");
}
async function send(method,params={}){return await new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error("timeout "+method))},15000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});sock.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,500));return r.result?.value;}
async function waitFor(expr,check,ms=20000){const start=Date.now();while(Date.now()-start<ms){const x=await evaluate(expr);if(check(x))return x;await sleep(260)}throw Error("timeout "+expr.slice(0,90));}
async function snapshot(name){const r=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});const f=path.join(OUT,name);fs.writeFileSync(f,Buffer.from(r.data,"base64"));return {file:f,bytes:fs.statSync(f).size};}
const layout="(()=>({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth,lang:document.documentElement.lang,h1:document.querySelector('h1')?.textContent,agent:document.querySelector('#assistant-status')?.textContent,overflowButtons:[...document.querySelectorAll('button')].filter(x=>x.offsetWidth>0).filter(x=>x.getBoundingClientRect().left<0||x.getBoundingClientRect().right>innerWidth).map(x=>x.textContent.trim()).slice(0,10)}))()";
(async()=>{
 await connect();await send("Runtime.enable");await send("Page.enable");await send("Network.enable");
 await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false,screenWidth:1440,screenHeight:900});await send("Page.reload",{ignoreCache:true});await waitFor("document.querySelector('#assistant-status')?.textContent",x=>(x?.includes("已啟動")||x?.includes("ready")));
 results.desktop=await evaluate(layout);results.desktop.image=await snapshot("desktop-zh.png");
 results.directory=await evaluate("(async()=>{const r=await fetch('/api/agentic-directory?keyword=Excel');const x=await r.json();return {http:r.status,ok:x.ok,count:x.count,needs:x.needs?.length,services:x.services?.length,agents:x.agents?.length,fields:Object.keys(x)}})()");
 results.manifest=await evaluate("(async()=>{const r=await fetch('/agent-manifest.json');const x=await r.json();return {http:r.status,name:x.networks?.[0]?.name,actions:x.actions?.agentTools}})()");
 await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844});
 await send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});await send("Page.reload",{ignoreCache:true});
 await waitFor("document.querySelector('#assistant-status')?.textContent",x=>(x?.includes("已啟動")||x?.includes("ready")));
 results.mobile=await evaluate(layout);results.mobile.image=await snapshot("mobile-zh.png");
 results.mobile.runtimeChinese=await evaluate("({dev:document.querySelector('#ns-devtoggle')?.textContent,settings:document.querySelector('.ns-settings>summary')?.textContent,badge:document.querySelector('.ns-llmbadge')?.textContent,help:document.querySelector('.ns-key-help')?.textContent?.slice(0,250)})");
results.mobile.debugControl=await evaluate("(()=>{const x=document.querySelector('#ns-devtoggle');if(!x)return null;const b=x.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,screen:innerWidth,hiddenByParent:x.parentElement?.getBoundingClientRect().right}})()");
await send("Emulation.setDeviceMetricsOverride",{width:320,height:720,deviceScaleFactor:2,mobile:true,screenWidth:320,screenHeight:720});await send("Page.reload",{ignoreCache:true});await waitFor("document.querySelector('#assistant-status')?.textContent",x=>(x?.includes("已啟動")||x?.includes("ready")));results.mobile320=await evaluate(layout);results.mobile320.image=await snapshot("mobile320-zh.png");
await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:3,mobile:true,screenWidth:390,screenHeight:844});await send("Page.reload",{ignoreCache:true});await waitFor("document.querySelector('#assistant-status')?.textContent",x=>(x?.includes("已啟動")||x?.includes("ready")));
 results.languageSwitch=await evaluate("(()=>{document.querySelector('[data-language=en]').click();return {lang:document.documentElement.lang,h1:document.querySelector('h1').textContent,stored:localStorage.getItem('guild.agentic.language')}})()");
 results.languageRoundTrip=await evaluate("(()=>{document.querySelector('[data-language=zh-TW]').click();const zh=document.querySelector('.ns-settings>summary')?.textContent;document.querySelector('[data-language=en]').click();const en=document.querySelector('.ns-settings>summary')?.textContent;return {zh,en,lang:document.documentElement.lang}})()");

 await send("Page.reload",{ignoreCache:true});
 await waitFor("document.querySelector('#assistant-status')?.textContent",x=>(x?.includes("已啟動")||x?.includes("ready")));
 results.languageAfterReload=await evaluate("({lang:document.documentElement.lang,h1:document.querySelector('h1').textContent,stored:localStorage.getItem('guild.agentic.language'),url:location.href})");
 await evaluate("document.querySelector('[data-language=en]').click()");
 results.match=await evaluate("(()=>{document.querySelector('#task-text').value='Automate Excel reports for my company. Budget NT$3,000';document.querySelector('#match-keyword').value='Excel';document.querySelector('#match-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return {draftVisible:!document.querySelector('#draft-panel').hidden,draft:document.querySelector('#draft-text').textContent}})()");
 results.match.response=await waitFor("document.querySelector('#match-results').textContent",x=>x&&!x.includes("Looking up published"));
 results.match.image=await snapshot("mobile-match-en.png");results.briefOnly=await evaluate("(()=>{const f=window.fetch.bind(window);window.fetch=(u,...a)=>{if(typeof u==='string'&&u.includes('/api/agentic-directory'))window.__lastGuildDirectoryUrl=u;return f(u,...a)};document.querySelector('#match-keyword').value='';document.querySelector('#match-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return {brief:document.querySelector('#task-text').value,keyword:document.querySelector('#match-keyword').value}})()");
await waitFor("document.querySelector('#match-results').textContent",x=>x&&!x.includes("Looking up published"));
results.briefOnly.requestUrl=await evaluate("window.__lastGuildDirectoryUrl");

 await evaluate("document.querySelector('#draft-panel a').click()");
 results.handoff=await waitFor("location.pathname==='/matching'?({path:location.pathname,stored:sessionStorage.getItem('guild-need-draft'),body:document.body.innerText.slice(0,500)}):null",x=>x&&x.body?.includes("冒險者"),20000);
 await sleep(1900);
 results.handoff.after=await evaluate("({path:location.pathname,stored:sessionStorage.getItem('guild-need-draft'),hasDialog:!!document.querySelector('[role=dialog]'),draftInputs:[...document.querySelectorAll('textarea,input')].filter(x=>x.value?.includes('Excel')).map(x=>({tag:x.tagName,value:x.value.slice(0,140)})),body:document.body.innerText.slice(0,220)})");
 results.handoff.image=await snapshot("mobile-handoff.png");
 assert.equal(results.directory.http,200);
 assert.equal(results.manifest.http,200);
 assert.equal(results.desktop.overflowButtons.length,0);
 assert.equal(results.mobile.overflowButtons.length,0);
 assert.equal(results.mobile320.overflowButtons.length,0);
 assert.ok(results.mobile.debugControl.right<=390);
 assert.match(results.languageRoundTrip.zh,/模型設定/);
 assert.match(results.languageRoundTrip.en,/AI model settings/);
 assert.equal(results.languageRoundTrip.lang,"en");
 assert.equal(results.languageSwitch.lang,"en");
 assert.equal(results.languageAfterReload.lang,"en");
 assert.ok(results.languageAfterReload.url.includes("lang=en"));
 assert.ok(results.briefOnly.requestUrl.includes("keyword=Excel"));
 assert.equal(results.briefOnly.keyword,"Excel");
 assert.equal(results.handoff.stored,"Automate Excel reports for my company. Budget NT$3,000");
 assert.match(results.mobile.runtimeChinese.dev,/開發工具/);
 assert.match(results.mobile.runtimeChinese.settings,/模型設定/);
 assert.match(results.mobile.runtimeChinese.badge,/金鑰/);
 assert.equal(events.exceptions.length,0);
 assert.equal(events.httpErrors.filter(x=>x.url.endsWith("/favicon.ico")).length,0);
 results.pass=true;
 results.events=events;
 fs.writeFileSync(path.join(OUT,"browser-e2e.json"),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2).slice(0,16000));
})().catch(e=>{console.log("E2E_ERROR",e.stack);process.exitCode=1;fs.writeFileSync(path.join(OUT,"error.txt"),e.stack);}).finally(()=>{try{sock?.close()}catch{}try{chrome.kill("SIGTERM")}catch{}setTimeout(()=>{try{chrome.kill("SIGKILL")}catch{}},1000).unref()});
