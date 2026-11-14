// TaiwanJobs Open Data (Labor Ministry), dataset 44062.
// The official Webservice emits CDATA under field tags containing full-width
// parentheses (not valid XML element names), so extract only a fixed set of
// documented CDATA fields instead of parsing arbitrary markup or HTML.
const UPSTREAM = 'https://free.taiwanjobs.gov.tw/webservice_taipei/Webservice.ashx';
const SOURCE = 'https://data.gov.tw/dataset/44062';
const KEYWORDS = new Set(['tech', 'ai', 'automation', 'excel', 'all']);
const TAGS = Object.freeze({
  title:'OCCU_DESC（職務名稱）', company:'COMPNAME（公司名稱）', detail:'JOB_DETAIL（工作內容）',
  city:'CITYNAME（工作地點）', type:'WK_TYPE（職務性質）', cutoff:'STOP_DATE（應徵截止日期）',
  salaryType:'SALARYCD（核薪方式）', low:'NT_L（薪資範圍下限）', high:'NT_U（薪資範圍上限）',
  updated:'TRANDATE（職缺更新日期）', url:'URL_QUERY（職缺資料URL）',
});
function cdata(block, tag) {
  const start = '<'+tag+'><![CDATA[';
  const i=block.indexOf(start);
  if(i<0)return '';
  const from=i+start.length;
  const end=block.indexOf(']]>',from);
  return end<0?'':block.slice(from,end).trim().slice(0,2500);
}
const todayTaiwan = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/\D/g,'');
const positiveNumber = v => /^\d{1,9}$/.test(v) ? Number(v) : null;
function relevant(title,detail,keyword){
  const text = keyword==='tech'?title:(title+' '+detail);
  if(keyword==='all')return true;
  const rules={
    tech:/資訊|系統|軟體|程式|網路|維運|資安|電腦|工程師|developer|engineer|software|devops|mcp|\bai\b/i,
    ai:/人工智慧|機器學習|智慧代理|智能代理|\bAI\b|\bAgent\b|\bLLM\b/i,
    automation:/自動化|流程改善|程式設計|系統整合|automation|workflow|rpa/i,
    excel:/excel|試算表|報表|資料分析|文書處理|spreadsheet/i,
  };
  return rules[keyword].test(text);
}
export function parseTaiwanJobs(xml,{keyword='tech',today=todayTaiwan()}={}){
  if(typeof xml!=='string'||xml.length>2000000)throw Error('invalid_upstream_response');
  const records=xml.match(/<Data>[\s\S]*?<\/Data>/g)||[];
  return records.map(block=>{
    const row=Object.fromEntries(Object.entries(TAGS).map(([key,tag])=>[key,cdata(block,tag)]));
    if(!row.title||!row.url||!relevant(row.title,row.detail,keyword))return null;
    if(/^\d{8}$/.test(row.cutoff)&&row.cutoff<today)return null;
    let u;try{u=new URL(row.url)}catch{return null}
    if(u.protocol!=='https:'||u.hostname!=='job.taiwanjobs.gov.tw')return null;
    return {title:row.title.slice(0,200),company:row.company.slice(0,160),city:row.city.slice(0,70),employmentType:row.type.slice(0,30),description:row.detail.slice(0,300),salaryType:row.salaryType.slice(0,60),minSalary:positiveNumber(row.low),maxSalary:positiveNumber(row.high),updatedAt:row.updated,deadline:row.cutoff,source:'台灣就業通',sourceUrl:SOURCE,applicationLink:u.href};
  }).filter(Boolean).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0,16);
}
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const zip=String(req.query?.zip??'104');
  const keyword=String(req.query?.q??'tech');
  if(!/^\d{3}$/.test(zip)||!KEYWORDS.has(keyword))return res.status(400).json({error:'invalid_filter'});
  const url=new URL(UPSTREAM);url.searchParams.set('zipno',zip);url.searchParams.set('count','200');
  try{
    const upstream=await fetch(url,{headers:{'Accept':'text/xml, */*'},signal:AbortSignal.timeout(12000)});
    if(!upstream.ok)return res.status(502).json({error:'upstream_unavailable'});
    const body=await upstream.text();
    if(!body.includes('<DataList>')||body.length>2000000)throw Error('unexpected_upstream_response');
    const jobs=parseTaiwanJobs(body,{keyword});
    res.setHeader('Cache-Control','public, s-maxage=1200, stale-while-revalidate=3600');
    return res.status(200).json({source:'台灣就業通（勞動部勞動力發展署）',sourceUrl:SOURCE,license:'政府資料開放授權條款-第1版',coverage:'postal_district_sample_only',zip,keyword,queryLimit:200,jobs});
  }catch{return res.status(502).json({error:'upstream_unavailable'});}
}
