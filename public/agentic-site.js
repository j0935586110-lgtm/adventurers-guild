import {boot} from "./agentic-runtime/index.js";
import {searchPublicJobs} from "./agentic-actions.js";
const form=document.getElementById("search-form");
const output=document.getElementById("search-results");
const status=document.getElementById("assistant-status");
form.addEventListener("submit",async e=>{
 e.preventDefault();output.textContent="Searching current public listings…";
 const result=await searchPublicJobs(document.getElementById("keyword").value);
 output.replaceChildren();
 if(!result.ok){output.textContent="No verified results: "+result.error;return;}
 const note=document.createElement("p");
 note.textContent=result.count+" published employment listings from "+result.source+" (not member freelance tasks).";
 output.append(note);
 if(result.jobs.length===0){output.append("No matches returned.");return;}
 for(const job of result.jobs.slice(0,8)){
  const article=document.createElement("article");
  const name=document.createElement("strong");name.textContent=job.title;
  const company=document.createElement("p");company.textContent=job.company+" · "+job.regions.join(", ");
  const link=document.createElement("a");link.textContent="Open original listing";
  if(/^https:\/\/himalayas\.app\//.test(job.applicationLink)){
   link.href=job.applicationLink;link.rel="noopener noreferrer";link.target="_blank";
  } else link.textContent="No valid source link";
  article.append(name,company,link);output.append(article);
 }
});
try{
 await boot("#agent-app",{originUrl:new URL("./",import.meta.url).href,
  sandboxWorkerUrl:new URL("agentic-runtime/sandbox-worker.js",import.meta.url).href});
 status.textContent="Browser agent ready. Choose a provider in AI model settings; do not paste keys into chat.";
}catch(error){
 status.textContent="Browser agent unavailable: "+error.message+". Manual search still works.";
 console.error("Guild browser agent boot failed",error);
}
