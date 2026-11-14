import React, {useEffect, useState} from 'react';
import {ArrowLeft, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Search, ShieldCheck, Store, Bot} from 'lucide-react';
import {useGuild} from './GuildProvider';
import {AuthLanguageContext, GuildAuthDialog} from './GuildAuthDialog';
import {publishService, listMyServices, type GuildService} from '../lib/marketplace';
import './guild-earn.css';

type TaiwanJob = {title:string;company:string;city:string;employmentType:string;description:string;salaryType:string;minSalary:number|null;maxSalary:number|null;updatedAt:string;deadline:string;source:string;applicationLink:string};
const districts=[['104','台北中山'],['220','新北板橋'],['407','台中西屯'],['807','高雄三民']] as const;
const taiwanKeywords=[['資訊／技術','tech'],['AI／Agent','ai'],['自動化','automation'],['Excel／報表','excel'],['全部職缺','all']] as const;
const taiwanPlatforms=[
 {name:'小雞上工',focus:'兼職／短期打工',url:'https://www.chickpt.com.tw/'},
 {name:'小雞上工任務',focus:'一次性有酬任務',url:'https://www.chickpt.com.tw/cases'},
 {name:'出任務 Tasker',focus:'軟體、MCP、企業外包接案',url:'https://www.tasker.com.tw/cases'},
 {name:'PRO360 達人網',focus:'提供專長、向客戶報價',url:'https://www.pro360.com.tw/pro/learn-more/'},
 {name:'104 人力銀行',focus:'台灣正職與專業工作',url:'https://www.104.com.tw/jobs/search/'},
 {name:'1111 人力銀行',focus:'台灣各類正式職缺',url:'https://www.1111.com.tw/search/job'},
 {name:'518 熊班',focus:'求職、打工及技能交換',url:'https://www.518.com.tw/'},
] as const;
type Job = {title:string;company:string;source:string;sourceUrl:string;applicationLink:string;regions:string[];employmentType:string;publishedAt:number|null;expiresAt:number|null;minSalary:number|null;maxSalary:number|null;salaryCurrency:string;salaryPeriod:string};
const searches=[['AI Agent','ai agent'],['自動化','automation'],['Excel','excel'],['遠端 IT','remote it'],['MCP','mcp']] as const;
const initialTerm=(text:string)=>{
  const lower=text.toLowerCase();
  if(/excel|試算|報價|試算表/.test(lower))return 'excel';
  if(/mcp/.test(lower))return 'mcp';
  if(/維運|遠端|電腦|設備|it support/.test(lower))return 'remote it';
  if(/自動化|automation/.test(lower))return 'automation';
  return 'ai agent';
};
export default function GuildEarn(){
  const {user, profile}=useGuild();
  const [term,setTerm]=useState(()=>initialTerm(new URLSearchParams(location.search).get('q')||''));
  const [jobs,setJobs]=useState<Job[]>([]);
  const [postalCode,setPostalCode]=useState(()=>new URLSearchParams(location.search).get('zip')||'104');
  const [taiwanTerm,setTaiwanTerm]=useState<'tech'|'ai'|'automation'|'excel'|'all'>('tech');
  const [taiwanJobs,setTaiwanJobs]=useState<TaiwanJob[]>([]);
  const [taiwanBusy,setTaiwanBusy]=useState(true);
  const [taiwanError,setTaiwanError]=useState('');
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [showAuth,setShowAuth]=useState(false);
  const [businessName,setBusinessName]=useState('');
  const [title,setTitle]=useState('AI Agent、MCP 與電腦維運自動化整合');
  const [description,setDescription]=useState('協助企業評估與導入 AI Agent、MCP 工具整合、遠端電腦維運及 Excel 報價自動化。實際範圍、交付與費用須逐案確認。');
  const [city,setCity]=useState('線上服務');
  const [price,setPrice]=useState('');
  const [consent,setConsent]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [publishError,setPublishError]=useState('');
  const [published,setPublished]=useState<GuildService|null>(null);
  const [mine,setMine]=useState<GuildService[]>([]);
  useEffect(()=>{if(profile?.display_name&&!businessName)setBusinessName(profile.display_name);},[profile?.display_name]);
  useEffect(()=>{
    let active=true;setBusy(true);setError('');
    fetch('/api/opportunities?q='+encodeURIComponent(term)).then(async r=>{
      const d=await r.json();if(!r.ok)throw Error(d.error||'搜尋暫時無法使用');return d;
    }).then(d=>{if(active)setJobs(d.jobs||[]);}).catch(e=>{if(active){setJobs([]);setError(e instanceof Error?e.message:String(e));}}).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[term]);
  useEffect(()=>{
    if(!/^\d{3}$/.test(postalCode)){setTaiwanJobs([]);setTaiwanBusy(false);return;}
    let active=true;setTaiwanBusy(true);setTaiwanError('');
    fetch('/api/taiwan-opportunities?zip='+encodeURIComponent(postalCode)+'&q='+encodeURIComponent(taiwanTerm))
      .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'台灣職缺暫時無法使用');return d;})
      .then(d=>{if(active)setTaiwanJobs(d.jobs||[]);})
      .catch(e=>{if(active){setTaiwanJobs([]);setTaiwanError(e instanceof Error?e.message:String(e));}})
      .finally(()=>{if(active)setTaiwanBusy(false);});
    return ()=>{active=false;};
  },[postalCode,taiwanTerm]);
  useEffect(()=>{
    if(!user){setMine([]);return;}
    let active=true;
    listMyServices(user.id).then(items=>{if(active)setMine(items);}).catch(e=>{if(active)setPublishError(e.message||'無法讀取我的服務');});
    return ()=>{active=false;};
  },[user?.id]);
  const doPublish=async(e:React.FormEvent)=>{
    e.preventDefault();setPublishError('');
    if(!user){setShowAuth(true);return;}
    if(!consent){setPublishError('請先確認公開刊登內容。');return;}
    if(!businessName.trim()||!title.trim()||description.trim().length<20){setPublishError('請完整填寫名稱、標題和至少 20 字服務說明。');return;}
    if(price && (!Number.isSafeInteger(Number(price))||Number(price)<0)){setPublishError('價格必須為非負整數，或留空表示依需求報價。');return;}
    setPublishing(true);
    try{
      const item=await publishService(user.id,{businessName:businessName.trim(),title:title.trim(),description:description.trim(),category:'其他',city:city.trim()||'線上服務',priceFromTwd:price?Number(price):null});
      setPublished(item);setMine(old=>[item,...old]);setConsent(false);
    }catch(e){setPublishError(e instanceof Error?e.message:String(e));}
    finally{setPublishing(false);}
  };
  return <AuthLanguageContext.Provider value="zh"><div className="earn-page">
    <header className="earn-header"><a href="/" className="earn-back"><ArrowLeft size={17}/> 冒險者公會</a><span>真實工作機會與服務上架</span><a href="/connect"><Bot size={16}/> AI 接入</a></header>
    <main className="earn-shell">
      <section className="earn-hero"><span className="earn-kicker">YOUR FIRST REAL QUEST</span><h1>我想賺錢，從哪裡開始？</h1><p>先找可申請的真實遠端職缺，再把自己的能力上架，讓其他人有機會找到你。所有申請及公開發布都由你決定。</p></section>
      <section className="earn-section" aria-label="台灣工作與接案平台">
        <div className="earn-section-head"><h2><BriefcaseBusiness size={20}/> 台灣接案與找工作</h2><p>先從真正有案主的平台尋找商機。下列平台各自處理身分、聯絡與交易；尚未取得職缺資料介接授權，不會把它們的工作複製進公會。</p></div>
        <div className="earn-platforms">{taiwanPlatforms.map(p=><a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="earn-platform"><strong>{p.name} <ArrowUpRight size={15}/></strong><small>{p.focus}</small><span>前往原平台</span></a>)}</div>
        <p className="earn-credits">特別說明：小雞上工網站條款限制未授權的自動化大量擷取，因此目前只有原站入口，沒有聲稱完成 API 串接或跨站自動投遞。</p>
      </section>
      <section className="earn-section" aria-label="台灣就業通官方開放職缺">
        <div className="earn-section-head"><h2><Search size={20}/> 台灣就業通官方職缺</h2><p>勞動部勞動力發展署開放資料，包含薪資、公司、地區與原始應徵連結。可指定台灣任一個三碼郵遞區號，但每次只查該郵區最多 200 筆，不代表整個城市或全台職缺。</p></div>
        <div className="earn-zip-presets" role="group" aria-label="常用郵遞區號">{districts.map(([zip,name])=><button type="button" key={zip} className={postalCode===zip?'earn-chip active':'earn-chip'} aria-pressed={postalCode===zip} onClick={()=>setPostalCode(zip)}>{name}</button>)}</div>
        <label className="earn-zip-label">或輸入其他地區三碼郵遞區號 <input inputMode="numeric" type="text" pattern="[0-9]{3}" maxLength={3} value={postalCode} onChange={e=>setPostalCode(e.target.value.replace(/\D/g,'').slice(0,3))} placeholder="例如 807"/></label>
        <div className="earn-searches" role="group" aria-label="台灣職缺類別">{taiwanKeywords.map(([label,value])=><button key={value} type="button" className={taiwanTerm===value?'earn-chip active':'earn-chip'} aria-pressed={taiwanTerm===value} onClick={()=>setTaiwanTerm(value)}>{label}</button>)}</div>
        {!/^\d{3}$/.test(postalCode)?<p className="earn-notice">請輸入三位數郵遞區號。</p>:taiwanBusy?<p className="earn-notice" role="status">正在讀取政府公開職缺…</p>:taiwanError?<p className="earn-error" role="alert">台灣就業通暫時無法連線。{taiwanError}</p>:!taiwanJobs.length?<p className="earn-notice">此郵區目前沒有符合條件的資料，可切換「全部職缺」或換郵遞區號。沒有資料不代表該地沒有工作。</p>:<div className="earn-jobs">{taiwanJobs.map((job,i)=><article key={job.applicationLink+i} className="earn-job"><div><small className="earn-source">來源：勞動部台灣就業通 · {job.employmentType||'工作類型未標示'}</small><h3>{job.title}</h3><p>{job.company} · {job.city}</p><small>{job.salaryType}{job.minSalary!=null?` NT$${job.minSalary.toLocaleString()}${job.maxSalary!=null?'～'+job.maxSalary.toLocaleString():''}`:''}{job.updatedAt?' · 更新 '+job.updatedAt:''}</small></div><a href={job.applicationLink} target="_blank" rel="noopener noreferrer">到台灣就業通查看 <ArrowUpRight size={16}/></a></article>)}</div>}
        <p className="earn-credits">資料來源：<a href="https://data.gov.tw/dataset/44062" target="_blank" rel="noopener noreferrer">台灣就業通網站職缺清單（政府資料開放授權條款第 1 版）</a>。實際職缺可能已關閉，應以原站為準。</p>
      </section>
      <section className="earn-section" aria-label="外部遠端工作機會">
        <div className="earn-section-head"><div><h2><Search size={20}/> 找工作</h2><p>以台灣條件搜尋 Himalayas 遠端職缺。請再確認各職缺資格與地區限制；這些不是外包接案，也不保證錄取。</p></div></div>
        <div className="earn-searches" role="group" aria-label="技能關鍵字">{searches.map(([label,value])=><button type="button" key={value} className={term===value?'earn-chip active':'earn-chip'} aria-pressed={term===value} onClick={()=>setTerm(value)}>{label}</button>)}</div>
        {busy?<p role="status" className="earn-notice">正在查詢可由台灣申請的工作…</p>:error?<p role="alert" className="earn-error">案源暫時無法查詢（{error}），請稍後重試；不會虛構職缺。</p>:!jobs.length?<p className="earn-notice">目前這組條件沒有可顯示的工作。可以換關鍵字，或先上架自己的服務。</p>:<div className="earn-jobs">{jobs.map((job,i)=><article key={job.sourceUrl+i} className="earn-job"><div><small className="earn-source">來源：Himalayas · {job.employmentType||'類型未標明'}</small><h3>{job.title}</h3><p>{job.company}</p><small>可應徵地區：{job.regions.join('、')||'以原始職缺說明為準'}{job.minSalary!=null&&job.salaryCurrency?` · ${job.salaryCurrency} ${job.minSalary.toLocaleString()}${job.maxSalary!=null?'–'+job.maxSalary.toLocaleString():''} / ${job.salaryPeriod}`:''}</small></div><a href={job.applicationLink} target="_blank" rel="noopener noreferrer" aria-label={'到 Himalayas 查看並申請 '+job.title}>查看並申請 <ArrowUpRight size={16}/></a></article>)}</div>}
        <p className="earn-credits">職缺由 <a href="https://himalayas.app/" target="_blank" rel="noopener noreferrer">Himalayas</a> 提供（每日更新），申請按鈕保留原始連結。請自行查核工作地點、資格、費用與真實性；我們不代表雇主或招募方。</p>
      </section>
      <section className="earn-section" aria-label="上架我的技能服務">
        <div className="earn-section-head"><div><h2><Store size={20}/> 上架我的能力</h2><p>下方是根據目前提供的技術方向整理的<b>可修改草稿</b>，未經你確認不會公開。請刪除尚未具備或無法交付的能力。</p></div></div>
        {!user&&<p className="earn-notice">你還沒登入。可以先修改內容，發布前必須登入自己的會員帳號。</p>}
        {published&&<div role="status" className="earn-success"><CheckCircle2 size={20}/> 服務已由你的會員帳號公開發布：{published.title}（{published.id}）。可以在下方「我的服務」確認。</div>}
        <form className="earn-form" onSubmit={e=>void doPublish(e)}>
          <label>服務提供者顯示名稱<input maxLength={100} value={businessName} onChange={e=>setBusinessName(e.target.value)} required placeholder="請填真實對外顯示名稱" /></label>
          <label>服務標題<input maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} required /></label>
          <label>可以交付什麼？<textarea rows={5} maxLength={1500} value={description} onChange={e=>setDescription(e.target.value)} required /></label>
          <div className="earn-form-grid"><label>服務區域<input maxLength={80} value={city} onChange={e=>setCity(e.target.value)} required /></label><label>起始報價（NT$，選填）<input type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} placeholder="不填＝依需求報價"/></label></div>
          <label className="earn-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} /> 我確認內容真實可交付，同意將這份服務公開給其他會員瀏覽；不包含私人聯絡資訊。</label>
          {publishError&&<p role="alert" className="earn-error">{publishError}</p>}
          <button className="earn-submit" type="submit" disabled={publishing||(!consent&&!!user)}>{publishing?'正在刊登…':user?'確認公開上架我的服務':'登入後確認上架'} <ArrowUpRight size={17}/></button>
        </form>
        {!!mine.length&&<div className="earn-mine"><h3>我的服務（{mine.length}）</h3>{mine.slice(0,8).map(m=><p key={m.id}><ShieldCheck size={15}/>{m.title} · {m.status==='published'?'已公開':'草稿'}</p>)}</div>}
      </section>
      <section className="earn-next"><BriefcaseBusiness size={21}/><div><strong>接到任務之後</strong><p>可使用既有的 GPT、Gemini、Claude、Hermes 和 J1 協助分析、實作及保留成果證據；本頁尚未提供自動投遞、代接案、代收款或 J1 自動執行。</p></div><a href="/connect">連接我的 AI <ArrowUpRight size={15}/></a></section>
    </main>{showAuth&&<GuildAuthDialog onClose={()=>setShowAuth(false)}/>}
  </div></AuthLanguageContext.Provider>;
}
