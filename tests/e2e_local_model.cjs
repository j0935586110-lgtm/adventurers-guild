#!/usr/bin/env node
const fs=require("fs"),os=require("os"),path=require("path"),{spawn}=require("child_process");
const {WebSocket}=require("undici");
const ROOT=process.env.URL||"http://127.0.0.1:19865";
const OUT=process.env.EVIDENCE_DIR||"/var/tmp/guild-browser-local-model-e2e";
fs.mkdirSync(OUT,{recursive:true});
const port=19927,profile=fs.mkdtempSync(path.join(os.tmpdir(),"guild-model-e2e-"));
const chrome=spawn("/snap/bin/chromium",[
 "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
 "--no-first-run","--no-default-browser-check",
 "--remote-debugging-port="+port,"--user-data-dir="+profile,ROOT+"/local-ai-lab.html?lang=zh-TW"
],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),pending=new Map(),events={jsExceptions:[],httpErrors:[],consoleErrors:[],downloads:[]};
let sock,seq=0;
async function connect(){
 for(let n=0;n<110;n++){
  try{
    const resp=await fetch("http://127.0.0.1:"+port+"/json");
    const page=(await resp.json()).find(x=>x.type==="page"&&x.url.startsWith(ROOT));
    if(page?.webSocketDebuggerUrl){
      sock=new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((resolve,reject)=>{sock.addEventListener("open",resolve,{once:true});sock.addEventListener("error",reject,{once:true})});
      sock.addEventListener("message",evt=>{
        const msg=JSON.parse(evt.data);
        if(msg.id&&pending.has(msg.id)){
          const p=pending.get(msg.id);pending.delete(msg.id);
          msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result);
        }else if(msg.method==="Runtime.exceptionThrown"){events.jsExceptions.push(msg.params?.exceptionDetails?.text)}
        else if(msg.method==="Runtime.consoleAPICalled"&&msg.params?.type==="error"){
          events.consoleErrors.push(msg.params.args.map(x=>x.value||x.description||"").join(" ").slice(0,240));
        }else if(msg.method==="Network.responseReceived"){
          const res=msg.params.response;
          if(res.status>=400)events.httpErrors.push({status:res.status,url:res.url.slice(0,180)});
          if(/huggingface.co.*(model|onnx|config|tokenizer)|\\.wasm/.test(res.url))
            events.downloads.push({status:res.status,url:res.url.slice(0,145),encodedDataLength:res.encodedDataLength});
        }
      });return;
    }
  }catch{}
  await sleep(200);
 }
 throw Error("could not attach CDP");
}
function cmd(method,params={}){
 const id=++seq;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout "+method))},20000);
  pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}});
  sock.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expr){
 const x=await cmd("Runtime.evaluate",{expression:expr,awaitPromise:true,returnByValue:true});
 if(x.exceptionDetails)throw Error("page exception "+JSON.stringify(x.exceptionDetails).slice(0,400));
 return x.result?.value;
}
async function wait(expr,fn,timeout=200000){
 const start=Date.now();
 while(Date.now()-start<timeout){
  const val=await evaluate(expr);
  if(fn(val))return val;
  await sleep(1000);
 }
 throw Error("timeout waiting "+expr.slice(0,95));
}
const result={url:ROOT,attempted:true,start:new Date().toISOString()};
(async()=>{
 await connect();await cmd("Runtime.enable");await cmd("Network.enable");await cmd("Page.enable");
 result.initial=await wait("({heading:document.querySelector('h1')?.textContent,button:document.querySelector('#run')?.textContent})",x=>x.heading);
 result.browser=await evaluate("({webgpu:!!navigator.gpu,threads:navigator.hardwareConcurrency,memoryGiB:navigator.deviceMemory??null})");
 result.input=await evaluate("(()=>{document.querySelector('#source').value='fixtures';document.querySelector('#query').value='我想請人把每週 Excel 報表流程自動化';document.querySelector('#run').click();return document.querySelector('#query').value})()");
 let last="";
 const started=Date.now();
 const completion=await wait("({status:document.querySelector('#status').textContent,metrics:document.querySelector('#metrics').textContent,resultText:document.querySelector('#results').innerText,progress:document.querySelector('#progress').textContent})",x=>{
  if(x.status!==last){last=x.status;console.log("MODEL_STATUS "+x.status+" "+x.progress.slice(0,100))}
  return /本機語意搜尋完成|模型載入或推論失敗/.test(x.status);
 },210000);
 result.complete=completion;result.elapsedMs=Date.now()-started;
 if(/本機語意搜尋完成/.test(completion.status)){
  const screen=await cmd("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
  const file=path.join(OUT,"local-model-result.png");fs.writeFileSync(file,Buffer.from(screen.data,"base64"));result.screenshot=file;
  result.modelExecuted=true;
  result.benchmarkClick=await evaluate("(()=>{document.querySelector('#benchmark').click();return true})()");
  result.benchmark=await wait("({status:document.querySelector('#status').textContent,metrics:document.querySelector('#metrics').textContent})",x=>(/top-1|八題繁中/.test(x.metrics))||/失敗/.test(x.status),190000);
 }else{result.modelExecuted=false}
 result.events=events;result.end=new Date().toISOString();
 fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify(result,null,2));
 console.log("EVIDENCE "+path.join(OUT,"report.json"));
 console.log(JSON.stringify({modelExecuted:result.modelExecuted,elapsedMs:result.elapsedMs,complete:result.complete,benchmark:result.benchmark,events:{httpErrors:events.httpErrors.slice(0,6),jsExceptions:events.jsExceptions.slice(0,5),consoleErrors:events.consoleErrors.slice(0,5),downloads:events.downloads.length}},null,2).slice(0,12000));
 if(!result.modelExecuted)process.exitCode=2;
})().catch(e=>{
 console.log("E2E_FAILED",e.stack);result.error=e.stack;result.events=events;
 fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify(result,null,2));process.exitCode=1;
}).finally(()=>{try{sock?.close()}catch{}try{chrome.kill("SIGTERM")}catch{}setTimeout(()=>{try{chrome.kill("SIGKILL")}catch{}},1400).unref()});
