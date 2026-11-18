import {SYNTHETIC_CANDIDATES,BENCHMARK_QUERIES} from "./local-ai-fixtures.js";
const TX={
 "zh-TW":{
  back:"返回冒險者公會 Agent",
  heading:"完全在瀏覽器執行的繁中／英文語意媒合",
  intro:"在你的電腦或手機下載一次多語小模型；推論直接在本機執行，不需填入 API Key。這是可選的實驗功能，不會自動發文或傳訊。",
  privacy:"首次使用會向 Hugging Face 下載約 118 MB 的量化模型權重，另有執行程式。下載與推論會佔用記憶體及電力；需求文字不會傳給模型供應商。",
  sourceTitle:"1 · 選擇資料來源",sourceLabel:"搜尋資料",real:"公會已公開的真實服務／委託",fixtures:"合成基準案例（非真實會員）",queryLabel:"請輸入需求",
  placeholder:"我想請人整理公司的試算表並自動產生每週報告",start:"啟用本機 AI 並搜尋",reset:"停止／釋放模型",
  idle:"尚未下載模型",howTitle:"2 · 怎樣驗收？",howBody:"真實資料只讀取公會已發布的公開紀錄；如果是零筆，就明確顯示零筆。合成題用來檢查模型能否跨繁中與英文辨識相似意思，絕不冒充會員。",
  metricsTitle:"模型證據",noMetrics:"尚未執行。首次下載可能較久。",limit:"語意分數只是文字相似度，不是身份驗證、服務品質、成交率或工作完成證明。真正委託仍需本人核准。",
  unsupported:"這個瀏覽器不支援 Worker。本機模型無法啟動，請使用原本公會搜尋。",
  ready:"就緒：可點擊開始",loading:"正在下載模型並載入 WASM 執行器…",
  computing:"本機模型正在比對文本…",done:"本機語意搜尋完成",cancelled:"已釋放模型；再次使用會重新載入（瀏覽器快取可能保留）。",
  noReal:"目前匿名公開資料中沒有可搜尋的會員服務／委託（0 筆）。沒有虛構候選人。可切換『合成基準案例』測試模型，或返回公會發布需求。",
  noQuery:"請先輸入至少兩個字的需求。",fetchError:"公開公會資料查詢失敗，請稍後重試：",
  modelError:"模型載入或推論失敗，已保留原本規則搜尋功能。原因：",
  modelPrivacy:"模型在你的瀏覽器執行；沒有傳送文字到推論 API。",
  realFound:"真正的公會公開紀錄（非身份認證）",fixtureFound:"合成基準結果（全部是虛構測試條目，不是真人服務）",
  score:"語意相似度",firstLoad:"模型載入",compute:"本機比對",engine:"執行後端",
  model:"模型",memory:"裝置提示",seconds:"秒",
  browse:"回公會查看真正公開資料",benchmark:"八題繁中／英文合成評測",benchPass:"命中",
  noBench:"此畫面只是單題測試；完整基準題可用下方按鈕執行。",
  runBench:"跑 8 題基準（模型已載入後）",benchBusy:"正在測試 8 題…",unknown:"未知",
  backend:"CPU / WebAssembly（q8）",wasm:"CPU WASM 模式，不需 WebGPU",
 },
 en:{
  back:"Back to Guild Agent",heading:"Bilingual semantic matching, running entirely in your browser",
  intro:"Download a multilingual model once, then run inference locally on your computer or phone. No API key required. This optional experiment never posts or messages anybody.",
  privacy:"On first use, the browser downloads about 118 MB of quantized model weights from Hugging Face, plus WASM runtime assets. Downloads and inference use memory and power. Your task text is not sent to a model provider.",
  sourceTitle:"1 · Select data source",sourceLabel:"Search records",real:"Real published Guild services/requests",fixtures:"Synthetic benchmark records (not real members)",queryLabel:"Describe your task",placeholder:"I need my weekly spreadsheet reports automated",
  start:"Enable local AI and search",reset:"Stop / release model",idle:"Model not downloaded",
  howTitle:"2 · How is it verified?",howBody:"Only real published Guild records are used in live mode, with zero results shown honestly. Synthetic fixtures test cross-language similarity only, never pretending to be real members.",
  metricsTitle:"Model evidence",noMetrics:"Not run yet. First download may take some time.",
  limit:"Semantic similarity does not verify identities, service quality, commercial offers, or completion. A real commission still requires your consent.",
  unsupported:"Web Workers unavailable. Use the existing Guild search instead.",
  ready:"Ready: click to start",loading:"Downloading model and initializing WASM runtime…",computing:"Ranking text locally…",done:"Local semantic ranking completed",
  cancelled:"Model released. Browser cache may keep downloaded files.",
  noReal:"No publicly visible Guild services or requests yet (0 records). No fabricated candidates. Use the synthetic benchmark to test this model, or return to Guild to post a request.",
  noQuery:"Enter at least two characters.",
  fetchError:"Could not read real public Guild data: ",modelError:"Browser model failed. Existing rule-based search is still available. Reason: ",
  modelPrivacy:"Inference runs locally; no task text sent to a model API.",
  realFound:"Real Guild published records (identities not independently verified)",fixtureFound:"Synthetic benchmark records (all fictional, not actual service providers)",
  score:"Semantic similarity",firstLoad:"Model initialization",compute:"Local ranking",engine:"Runtime",model:"Model",memory:"Device hint",seconds:"seconds",
  browse:"Browse real Guild postings",benchmark:"Eight synthetic bilingual benchmark tasks",benchPass:"top-1 accuracy",noBench:"Single-task evaluation; use the button below to run all benchmark tasks.",
  runBench:"Run 8 synthetic test tasks (after loading)",benchBusy:"Testing 8 tasks…",unknown:"unknown",
  backend:"CPU / WebAssembly (q8)",wasm:"CPU WASM — WebGPU not required"
 }
};
const $=id=>document.getElementById(id);
let locale=new URLSearchParams(location.search).get("lang")==="en"?"en":"zh-TW";
let worker=null,seq=0,busy=false,lastCase=null,requests=new Map();
const t=(k)=>TX[locale][k]??k;
function applyLocale(l){
 locale=l==="en"?"en":"zh-TW";
 document.documentElement.lang=locale;
 document.title=locale==="en"?"Adventurers Guild — Local AI Semantic Search":"冒險者公會 — 本機 AI 語意媒合";
 for(const node of document.querySelectorAll("[data-i18n]"))node.textContent=t(node.dataset.i18n);
 for(const node of document.querySelectorAll("[data-lang]"))node.setAttribute("aria-pressed",String(node.dataset.lang===locale));
 if($("benchmark"))$("benchmark").textContent=t("runBench");
 $("query").placeholder=t("placeholder");
 const url=new URL(location.href);url.searchParams.set("lang",locale);history.replaceState(history.state,"",url.pathname+url.search);
 if(!busy){$("status").textContent=t("idle");$("metrics").textContent=t("noMetrics");}
}
for(const b of document.querySelectorAll("[data-lang]"))b.addEventListener("click",()=>applyLocale(b.dataset.lang));
applyLocale(locale);
const cap={webgpu:!!navigator.gpu,worker:!!window.Worker,memoryGiB:Number(navigator.deviceMemory)||null,cpuThreads:navigator.hardwareConcurrency||null};
$("capabilities").textContent=[t("wasm"),"WebGPU: "+(cap.webgpu?"yes":"no"),"RAM: "+(cap.memoryGiB?cap.memoryGiB+" GB":"?")].join(" · ");
if(!cap.worker){$("run").disabled=true;$("status").textContent=t("unsupported");}
$("query").value=locale==="en"?BENCHMARK_QUERIES[1].query:BENCHMARK_QUERIES[0].query;

function text(tag,value,parent,cls){
 const node=document.createElement(tag);node.textContent=value;if(cls)node.className=cls;parent.append(node);return node;
}
async function loadPublished(){
 const resp=await fetch("/api/agentic-directory?mode=all&limit=12",{credentials:"omit",headers:{Accept:"application/json"}});
 if(!resp.ok)throw Error("HTTP "+resp.status);
 const body=await resp.json();
 if(!body?.ok || !Array.isArray(body.services)||!Array.isArray(body.needs))throw Error("Invalid public response");
 return [
  ...body.services.map(x=>({id:"s:"+x.id,title:x.title,category:x.category||"",text:[x.title,x.businessName,x.category,x.city].filter(Boolean).join(". "),kind:"published_service"})),
  ...body.needs.map(x=>({id:"n:"+x.id,title:x.title,category:x.kind||"",text:[x.title,x.kind,x.city].filter(Boolean).join(". "),kind:"published_need"}))
 ].slice(0,24);
}
function disconnect(){
 for(const {reject} of requests.values())reject(Error("cancelled"));
 requests.clear();
 worker?.terminate();worker=null;busy=false;$("run").disabled=false;$("progress").textContent="";$("status").textContent=t("cancelled");
}
$("cancel").addEventListener("click",disconnect);
function initWorker(){
 if(worker)return worker;
 worker=new Worker(new URL("./browser-semantic-worker.js",import.meta.url),{type:"module"});
 worker.onmessage=({data:m})=>{
  if(m.type==="progress"){
    $("progress").textContent=m.status+": "+m.file+" "+(m.percent===null?"":m.percent+"%");
    return;
  }
  const q=requests.get(m.id);
  if(!q)return;
  if(m.type==="ranked"){requests.delete(m.id);q.resolve(m)}
  if(m.type==="error"){requests.delete(m.id);q.reject(Error(m.error))}
 };
 worker.onerror=({message})=>{
  const error=Error(message||"worker_failed");
  for(const {reject} of requests.values())reject(error);
  requests.clear();worker?.terminate();worker=null;
 };
 return worker;
}
function askModel(query,items){
 return new Promise((resolve,reject)=>{
  const w=initWorker(),id=++seq;
  requests.set(id,{resolve,reject});
  w.postMessage({type:"rank",id,query,candidates:items.map(x=>({id:x.id,text:x.text}))});
 });
}
function renderRanked(items,answer,synthetic){
 const parent=$("results");parent.replaceChildren();
 text("h2",t(synthetic?"fixtureFound":"realFound"),parent);
 const map=new Map(items.map(x=>[x.id,x]));
 for(const a of answer.ranking.slice(0,8)){
  const row=map.get(a.id);if(!row)continue;
  const article=document.createElement("article");
  text("strong",row.title,article);
  text("p",(row.category?row.category+" · ":"")+t("score")+": "+a.score.toFixed(3),article,"small");
  parent.append(article);
 }
 if(!synthetic){
  const link=document.createElement("a");link.href="/matching";link.textContent=t("browse");parent.append(link);
 }
}
async function run(query,items,synthetic){
 $("status").textContent=t("loading");$("progress").textContent="";
 const start=performance.now();const result=await askModel(query,items);
 $("status").textContent=t("done");
 renderRanked(items,result,synthetic);
 const details=[t("model")+": "+result.model,t("engine")+": "+t("backend"),
 t("firstLoad")+": "+(result.firstLoadMs/1000).toFixed(2)+" "+t("seconds"),
 t("compute")+": "+(result.computeMs/1000).toFixed(2)+" "+t("seconds"),
 "Total: "+((performance.now()-start)/1000).toFixed(2)+" s",
 "Records: "+items.length];
 $("metrics").textContent=details.join(" · ");
 return result;
}
$("run").addEventListener("click",async()=>{
 if(busy)return;
 const query=$("query").value.trim().slice(0,500),synthetic=$("source").value==="fixtures";
 if(query.length<2){$("status").textContent=t("noQuery");return;}
 busy=true;$("run").disabled=true;
 try{
  const items=synthetic?SYNTHETIC_CANDIDATES:await loadPublished();
  if(!items.length){
   $("results").replaceChildren();
   text("p",t("noReal"),$("results"));
   $("status").textContent=t("ready");return;
  }
  lastCase={query,synthetic,items};
  await run(query,items,synthetic);
 }catch(e){
  if(String(e.message)==="cancelled")return;
  $("status").textContent=t("modelError")+String(e.message||e).slice(0,160);
  // Never silently present a rule match as an ML match.
  // Offer the already-tested rule-based fallback, not an invented semantic result.
  $("results").replaceChildren();
  const fallback=document.createElement("a");
  fallback.href="/agentic.html?lang="+encodeURIComponent(locale);
  fallback.textContent=t("browse");
  $("results").append(fallback);
 }finally{busy=false;$("run").disabled=false;}
});
// Explicit test-only benchmark, never queried against production member data.
const benchmark=document.createElement("button");
benchmark.id="benchmark";
benchmark.type="button";benchmark.className="secondary";
benchmark.textContent=t("runBench");
$("metrics").after(benchmark);
benchmark.addEventListener("click",async()=>{
 if(busy)return;
 busy=true;benchmark.disabled=true;$("run").disabled=true;
 const summary=[];
 try{
  $("status").textContent=t("benchBusy");
  for(const item of BENCHMARK_QUERIES){
   const result=await askModel(item.query,SYNTHETIC_CANDIDATES);
   summary.push({locale:item.locale,expected:item.expected,actual:result.ranking[0]?.id||null,
     correct:result.ranking[0]?.id===item.expected,computeMs:result.computeMs});
  }
  const right=summary.filter(x=>x.correct).length;
  $("metrics").textContent=t("benchmark")+": "+right+"/"+summary.length+" "+t("benchPass")+
   " · "+JSON.stringify(summary);
  $("status").textContent=t("done");
 }catch(e){$("status").textContent=t("modelError")+String(e.message||e)}
 finally{busy=false;benchmark.disabled=false;$("run").disabled=false;}
});
