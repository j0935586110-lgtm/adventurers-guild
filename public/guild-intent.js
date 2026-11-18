// Deterministic, auditable query suggestion. Not an LLM or semantic matching engine.
// Never silently search all when a task was supplied but no suitable keyword was found.
const DOMAIN_TERMS=[
  {canonical:"Excel",terms:[/\bexcel\b/i,/試算表|電子表格|報表自動化|樞紐分析|spreadsheet|pivot table/i]},
  {canonical:"AI",terms:[/\b(ai|llm|agent|mcp)\b/i,/人工智慧|智慧體|智能體|代理人|自動代理/i]},
  {canonical:"網站",terms:[/網站|網頁|前端|架站|網路商店|website|web site|webpage|frontend|front.end|wordpress/i]},
  {canonical:"設計",terms:[/設計|美工|繪圖|平面設計|ui.?ux|graphic design|design|logo/i]},
  {canonical:"程式",terms:[/程式|軟體|系統開發|後端|開發者|coding|software|developer|programming/i]},
  {canonical:"行銷",terms:[/行銷|廣告|社群經營|marketing|advertising|seo|social media/i]},
  {canonical:"會計",terms:[/會計|記帳|稅務|accounting|bookkeep|tax filing/i]},
  {canonical:"翻譯",terms:[/翻譯|口譯|translation|translate|interpreter/i]},
  {canonical:"影片",terms:[/影片|剪輯|影像製作|video editing|film editing|subtitle/i]},
  {canonical:"維修",terms:[/維修|修理|設備故障|電腦故障|repair|maintenance|helpdesk/i]},
  {canonical:"活動",terms:[/活動企劃|聚會|線下活動|event plan|meetup/i]},
];
function normalize(str){return typeof str==="string"?str.normalize("NFKC").trim().slice(0,600):"";}
export function suggestGuildKeyword(brief){
 const s=normalize(brief);
 if(!s) return {keyword:"",reason:"empty_task"};
 for(const d of DOMAIN_TERMS){
   if(d.terms.some(re=>re.test(s)))return {keyword:d.canonical,reason:"recognized_domain"};
 }
 return {keyword:"",reason:"unrecognized_task"};
}
export function resolveGuildKeyword(brief,explicitKeyword){
 const typed=normalize(explicitKeyword).slice(0,80);
 if(typed)return {keyword:typed,reason:"user_supplied"};
 return suggestGuildKeyword(brief);
}
