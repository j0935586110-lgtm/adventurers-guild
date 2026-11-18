import {boot} from "./agentic-runtime/index.js";
import {searchPublicJobs,searchPublicGuild} from "./agentic-actions.js";

const TEXT={
 "zh-TW":{
  brand:"冒險者公會 · Adventurers Guild",
  heroTitle:"找到真正能協助你完成任務的真人或 AI",
  heroDesc:"說明需求、查閱公會真實公開資料，由你決定是否發布委託。未經授權不會自動刊登或聯絡任何人。",
  privacyNote:"僅限公開資料搜尋。沒有私人聯絡資訊、自動接單或虛構 AI 會員。",
  matchingTitle:"1 · 描述需求並搜尋",matchingDesc:"搜尋現有公開服務與委託。沒有結果就如實告知。",
  requestLabel:"你希望完成什麼事？",requestPlaceholder:"我需要人幫公司 Excel 報表自動化，預算 NT$3,000。",
  keywordLabel:"搜尋關鍵字",keywordPlaceholder:"Excel",cityLabel:"城市（可不填）",cityPlaceholder:"台北",
  kindLabel:"任務類型",anyKind:"所有公開類型",cooperation:"合作",support:"支援",hiring:"徵才",jobs:"找工作",resources:"找資源",
  findMatches:"搜尋真實公開媒合資料",reviewTitle:"2 · 檢查委託草稿",
  reviewNote:"這只是一份儲存在目前頁面的草稿。必須由你登入公會，並另外確認後才能發布。",
  copyDraft:"複製草稿",continuePost:"前往公會自行確認發布",agentTitle:"3 · 使用瀏覽器內的 AI Agent",
  agentDesc:"使用官方 Agentic Web Runtime 搜尋相同的真實公開資料。模型需在 Agent 設定中自行選擇，提交對話內容可能傳送至模型供應商。",
  starting:"正在啟動瀏覽器 Agent…",ready:"瀏覽器 Agent 已啟動。請在模型設定中選擇供應商，勿把金鑰貼在對話中。",
  agentUnavailable:"瀏覽器 Agent 無法啟動：",agentManual:"。仍可手動搜尋。",
  jobsTitle:"補充：查找真實公開職缺",jobsDesc:"這些是第三方徵才，不等於公會會員服務，也不是已確認的接案委託。",
  jobsKeyword:"職缺類別",findJobs:"搜尋即時職缺",
  techTitle:"公開 Agent 技術檔與安全限制",techLimits:"外部跨網站呼叫尚未授權開放；無法操作會員帳號、付款或自主控制 J1。",
  matchingLink:"真人媒合",communityLink:"社群",
  matchingLoading:"正在查詢公會公開資料…",matchingEmpty:"目前沒有符合條件的公開會員服務或委託。不會虛構媒合結果。你可以登入後發布自己的需求。",
  matchingFound:"實際公開資料：{s} 項會員服務、{n} 項委託；已驗證的 AI Agent：0。",
  matchingError:"公會公開搜尋暫時無法使用：",service:"公開服務",need:"公開委託",profileUnverified:"會員／服務身份尚未獨立驗證",
  explore:"前往公會查看",jobsLoading:"正在搜尋公開職缺…",jobsError:"無法取得已驗證結果：",jobsEmpty:"目前沒有符合的公開職缺。",
  jobsFound:"來源：{source}，回傳 {count} 筆第三方職缺（不是公會接案）。",jobLink:"查看原始徵才資訊",
  noLink:"無有效原始連結",copyDone:"已複製草稿",copyFailed:"複製失敗，請手動選取文字",
 },
 en:{
  brand:"Adventurers Guild · 冒險者公會",
  heroTitle:"Find real collaborators, human or AI, to accomplish a task.",
  heroDesc:"Describe your request, inspect actual public results, and decide what to publish. Nothing is posted without your authorization.",
  privacyNote:"Public discovery only. No private contacts, automatic contracting, or invented AI profiles.",
  matchingTitle:"1 · Describe a task and discover",matchingDesc:"Search existing public Guild services and requests. Empty results are shown honestly.",
  requestLabel:"What needs doing?",requestPlaceholder:"I need someone to automate my Excel reports. Budget NT$3,000.",
  keywordLabel:"Search keyword",keywordPlaceholder:"Excel",cityLabel:"City (optional)",cityPlaceholder:"Taipei",
  kindLabel:"Task category",anyKind:"All public categories",cooperation:"Collaboration",support:"Help",hiring:"Hiring",jobs:"Find work",resources:"Resources",
  findMatches:"Find real public matches",reviewTitle:"2 · Review your request",
  reviewNote:"This is only a local draft; publishing requires your own login and a separate confirmation in the Guild.",
  copyDraft:"Copy draft",continuePost:"Continue to Guild publishing",agentTitle:"3 · Ask the browser-native Agent",
  agentDesc:"The official Agentic Web runtime uses the same real public search. Choose a model in settings; the provider may receive the text you submit.",
  starting:"Starting browser Agent…",ready:"Browser Agent ready. Choose a provider in AI model settings; do not paste keys into chat.",
  agentUnavailable:"Browser Agent unavailable: ",agentManual:". Manual search still works.",
  jobsTitle:"Alternative: browse real public job listings",jobsDesc:"These are third-party employment posts, not confirmed Guild service members or freelance contracts.",
  jobsKeyword:"Job category",findJobs:"Find live listings",
  techTitle:"Open Agentic Web technical files and limits",techLimits:"External peers disabled pending consent tests; no member writes, payments, or autonomous J1 control.",
  matchingLink:"Member matching",communityLink:"Community",
  matchingLoading:"Looking up published Guild records…",matchingEmpty:"No matching public member services or tasks are currently available. Nothing is invented. You can log in and publish a request.",
  matchingFound:"Published results: {s} member services, {n} task requests; verified AI agents: 0.",
  matchingError:"Public Guild search is unavailable: ",service:"Published service",need:"Published request",profileUnverified:"Identity and service not independently verified",
  explore:"Review on Guild",jobsLoading:"Searching public jobs…",jobsError:"No verified results: ",jobsEmpty:"No public listings found for this term.",
  jobsFound:"Source: {source}; {count} third-party job listings (not Guild freelance tasks).",jobLink:"Original job listing",
  noLink:"No valid original link",copyDone:"Draft copied",copyFailed:"Copy failed; please select text manually.",
 }
};

const el=id=>document.getElementById(id);
const ui={match:el("match-results"),jobs:el("search-results"),status:el("assistant-status")};
const params=new URLSearchParams(location.search);
const initial=params.get("lang");
let stored;
try{stored=localStorage.getItem("guild.agentic.language")}catch{}
let lang=initial==="zh-TW"||initial==="en" ? initial : stored==="zh-TW"||stored==="en" ? stored : (navigator.language.toLowerCase().startsWith("zh")?"zh-TW":"en");
let agentState="starting",agentError="",lastGuild=null,lastJobs=null;
const t=(key,values={})=>(TEXT[lang][key]??TEXT.en[key]??key).replace(/\{(\w+)\}/g,(_,k)=>String(values[k]??""));
function localizedStatus(){
 ui.status.textContent=agentState==="ready" ? t("ready") : agentState==="error" ? t("agentUnavailable")+agentError+t("agentManual") : t("starting");
}
function addText(tag,text,parent,cls){
 const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;parent.append(node);return node;
}
function renderGuild(result){
 ui.match.replaceChildren();
 if(!result)return;
 if(!result.ok){ui.match.textContent=t("matchingError")+result.error;return;}
 if(!result.count){ui.match.textContent=t("matchingEmpty");return;}
 addText("p",t("matchingFound",{s:result.services.length,n:result.needs.length}),ui.match,"small");
 for(const [kind,entries] of [["service",result.services],["need",result.needs]]){
  for(const record of entries.slice(0,10)){
   const card=document.createElement("article");
   addText("strong",t(kind)+" · "+record.title,card);
   addText("p",[record.city,record.category??record.kind,record.businessName].filter(Boolean).join(" · "),card);
   addText("p",t("profileUnverified"),card,"small");
   const link=document.createElement("a");link.href="/matching";link.textContent=t("explore");card.append(link);ui.match.append(card);
  }
 }
}
function renderJobs(result){
 ui.jobs.replaceChildren();
 if(!result)return;
 if(!result.ok){ui.jobs.textContent=t("jobsError")+result.error;return;}
 if(!result.jobs.length){ui.jobs.textContent=t("jobsEmpty");return;}
 addText("p",t("jobsFound",{source:result.source,count:result.jobs.length}),ui.jobs,"small");
 for(const job of result.jobs.slice(0,8)){
  const card=document.createElement("article");addText("strong",job.title,card);
  addText("p",job.company+" · "+job.regions.join(", "),card);
  const a=document.createElement("a");
  if(/^https:\/\/himalayas\.app\//.test(job.applicationLink)){
   a.href=job.applicationLink;a.target="_blank";a.rel="noopener noreferrer";a.textContent=t("jobLink");
  }else a.textContent=t("noLink");
  card.append(a);ui.jobs.append(card);
 }
}
function applyLanguage(next){
 lang=next;document.documentElement.lang=lang;document.title=lang==="zh-TW"?"冒險者公會 — 真人 × AI 任務協作":"Adventurers Guild — Human × AI Task Collaboration";
 for(const e of document.querySelectorAll("[data-i18n]")) e.textContent=t(e.dataset.i18n);
 for(const e of document.querySelectorAll("[data-i18n-placeholder]")) e.placeholder=t(e.dataset.i18nPlaceholder);
 for(const b of document.querySelectorAll("[data-language]")) b.setAttribute("aria-pressed",String(b.dataset.language===lang));
 try{localStorage.setItem("guild.agentic.language",lang)}catch{}
 localizedStatus();renderGuild(lastGuild);renderJobs(lastJobs);
}
for(const b of document.querySelectorAll("[data-language]")) b.addEventListener("click",()=>applyLanguage(b.dataset.language));
applyLanguage(lang);

el("match-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const brief=el("task-text").value.trim();
 const keyword=el("match-keyword").value.trim();
 const city=el("match-city").value.trim();
 const kind=el("match-kind").value;
 el("draft-panel").hidden=!brief;
 if(brief) el("draft-text").textContent=brief;
 ui.match.textContent=t("matchingLoading");
 lastGuild=await searchPublicGuild({keyword,city,kind});
 renderGuild(lastGuild);
});
// Reuse the Guild's existing prefill/consent path; a real user click is required.
document.querySelector("#draft-panel a").addEventListener("click",()=>{
  const draft=el("draft-text").textContent?.trim().slice(0,1500);
  if(draft){try{sessionStorage.setItem("guild-need-draft",draft)}catch{}}
});
el("copy-draft").addEventListener("click",async()=>{
 try{
  await navigator.clipboard.writeText(el("draft-text").textContent);
  el("copy-draft").textContent=t("copyDone");
 }catch{el("copy-draft").textContent=t("copyFailed");}
});
el("search-form").addEventListener("submit",async e=>{
 e.preventDefault();ui.jobs.textContent=t("jobsLoading");
 lastJobs=await searchPublicJobs(el("keyword").value);
 renderJobs(lastJobs);
});

try{
 await boot("#agent-app",{originUrl:new URL("./",import.meta.url).href,
   sandboxWorkerUrl:new URL("agentic-runtime/sandbox-worker.js",import.meta.url).href});
 agentState="ready";localizedStatus();
}catch(error){
 agentState="error";agentError=String(error?.message||"unknown");localizedStatus();
 console.error("Guild browser Agent boot failed",error);
}
