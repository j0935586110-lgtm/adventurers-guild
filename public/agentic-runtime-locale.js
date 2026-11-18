// Host-side Traditional Chinese labels for the upstream nsDeploy UI.
// Translates *only* known static UI labels. Never modifies model conversations,
// tool results, API key inputs, or upstream engine/authorization logic.
// Upstream runtime can replace nodes dynamically, so keep originals per Text node.

const ZH = new Map(Object.entries({
  "API key required":"需要設定模型金鑰",
  "⚙ Developer":"⚙ 開發工具",
  "LLM configured — awaiting verification":"模型已設定，等待驗證",
  "You confirm actions that cannot be undone before they run. Other actions run right away.":"無法復原的操作必須經你確認，其他操作會立即執行。",
  "Actions run after you review and confirm them. Server responses appear as receipts.":"你確認後才會執行操作，伺服器回應會作為執行收據。",
  "No website actions connected":"未連接網站操作",
  "⚙ AI model settings":"⚙ AI 模型設定",
  "In use: no key yet":"目前尚未設定金鑰",
  "Saved setup":"已儲存設定",
  "Custom / unsaved":"自訂／尚未儲存",
  "Don't have an API key?":"還沒有 API 金鑰？",
  "An API key is a private code from an AI provider. It lets this page use that provider for you; it is not your password.":"API 金鑰是模型供應商發給你的私密代碼，讓網頁替你呼叫模型；它不是登入密碼。",
  "What is an API key and how do I get one?":"什麼是 API 金鑰？如何取得？",
  "Choose a provider below and create a key. Its recommended settings will be filled in for you.":"選擇下方模型供應商並建立金鑰，系統會帶入建議設定。",
  "Billing may be required":"可能需要付費",
  "Free tier":"提供免費額度",
  "Free tiers have usage limits and may vary by region. Other providers may require billing.":"免費額度有限制，且可能因地區而異；其他供應商可能需要付款。",
  "API key":"API 金鑰",
  "Manage this key on OpenRouter":"在 OpenRouter 管理金鑰",
  "See what it spends, set a spending limit, or revoke it.":"查看用量、設定支出上限或撤銷金鑰。",
  "Save and start":"儲存並開始",
  "or":"或",
  "Connect with OpenRouter":"連接 OpenRouter",
  "Connect with OpenRouter: sign in and approve a key for this site, with nothing to copy. It uses a free model, which has a daily limit.":"連接 OpenRouter：登入並授權這個網站使用金鑰，無需複製貼上。使用免費模型時有每日限制。",
  "Advanced settings (optional)":"進階設定（選填）",
  "Setup name (optional)":"設定名稱（選填）",
  "Model (optional)":"模型（選填）",
  "Provider URL (optional)":"供應商網址（選填）",
  "Your browser sends your key directly to the Provider URL above.":"瀏覽器會將金鑰直接傳送給上方設定的模型供應商網址。",
  "Save setup":"儲存設定",
  "Delete setup":"刪除設定",
  "Send":"傳送",
  "New chat":"新對話",
  "Agents working for you":"正在協作的 Agent",
  "Ready when you are.":"準備就緒",
  "your concierge":"你的協作助理",
  "Agent graph & origins":"Agent 關係圖與來源",
  "Execution log":"執行紀錄",
  "0 events":"0 個事件",
  "Export JSON":"匯出 JSON",
  "Type a request…":"請輸入需求…",
  "Clear conversation history":"清除對話紀錄",
  "Show the technical execution trace":"顯示技術執行紀錄",
  "You are using a free model. There may be daily usage limits.":"目前使用免費模型，可能有每日用量限制。",
}));
const BOOT_EN = "To start, connect an AI provider. In ⚙ AI model settings, select Connect with OpenRouter. Or choose a provider, create a key on its site, paste it into the API key field and select Save and start. Your key is saved in this browser.";
const BOOT_ZH = "開始使用前請連接 AI 模型供應商。在「⚙ AI 模型設定」中選擇 OpenRouter 連接，或選擇供應商、建立金鑰後貼到金鑰欄位，再選擇「儲存並開始」。金鑰會儲存在你目前的瀏覽器。";
const originalTexts=new WeakMap();
const originalAttrs=new WeakMap();
const observers=new WeakMap();
let locale="en";
function translate(value){
  if(locale!=="zh-TW")return value;
  if(ZH.has(value))return ZH.get(value);
  if(/^\d+ website actions connected$/.test(value))return value.replace("website actions connected","項網站操作已連接");
  if(value.includes(BOOT_EN))return value.replace(BOOT_EN,BOOT_ZH);
  return value;
}
function skipped(node){
  const el=node.parentElement;
  if(!el)return true;
  // Never translate user, agent, or tool transcripts. Only the first
  // static setup bubble is allowed, when it contains the exact stock guidance.
  if(el.closest(".ns-msg")){
    const setup=el.closest(".ns-msg");
    return !setup.classList.contains("bot") || !setup.parentElement?.matches("#ns-msgs") || setup!==setup.parentElement.firstElementChild;
  }
  return Boolean(el.closest(".ns-dev,.ns-log,.ns-widget,.ns-turn"));
}
function renderText(node){
  if(skipped(node))return;
  let state=originalTexts.get(node);
  if(!state){state={original:node.nodeValue,applied:null};originalTexts.set(node,state);}
  // The official runtime may replace status text without replacing its DOM node.
  // Treat that as a fresh upstream original, not as our own localization.
  if(node.nodeValue!==state.applied && node.nodeValue!==state.original)
    state.original=node.nodeValue;
  const wanted=translate(state.original);
  if(node.nodeValue!==wanted)node.nodeValue=wanted;
  state.applied=wanted;
}
function renderAttributes(root){
  for(const el of root.querySelectorAll("[placeholder],[title]")){
    if(!originalAttrs.has(el)){
      originalAttrs.set(el,{placeholder:el.getAttribute("placeholder"),title:el.getAttribute("title")});
    }
    const o=originalAttrs.get(el);
    for(const attr of ["placeholder","title"]){
      if(o[attr]===null)continue;
      const before=el.getAttribute(attr);
      if(before!==o[attr] && before!==o[attr+"Last"])o[attr]=before;
      const wanted=translate(o[attr]);
      if(before!==wanted)el.setAttribute(attr,wanted);
      o[attr+"Last"]=wanted;
    }
  }
}
function paint(root){
  if(!root)return;
  // Avoid changing HTML controls, editable input values, and hidden credential fields.
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let current;
  while((current=walker.nextNode()))renderText(current);
  renderAttributes(root);
}
export function localizeAgentRuntime(root,nextLocale){
  if(!root)return;
  locale=nextLocale==="zh-TW"?"zh-TW":"en";
  paint(root);
  if(observers.has(root))return;
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;paint(root)});
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["title","placeholder"]});
  observers.set(root,observer);
}
