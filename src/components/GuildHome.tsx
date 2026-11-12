import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BriefcaseBusiness, Camera, Check, ChevronDown,
  CircleHelp, Code2, Compass, Globe2, GraduationCap, HeartHandshake,
  MapPin, Menu, MessageCircle, Palette, Plus, Search, ShieldCheck,
  Sparkles, Star, WandSparkles, Wrench, X
} from 'lucide-react';
import { useGuild } from './GuildProvider';
const LegacyGuildMain = lazy(() => import('../LegacyGuild').then(m => ({default: m.LegacyGuildMain})));
import {
  SERVICE_CATEGORIES, TAIWAN_CITIES, searchServices, listMyServices,
  listIncomingInquiries, listOutgoingInquiries, publishService, sendInquiry,
  quoteInquiry, confirmInquiryCompleted, createReview, fetchPublicReviewStats,
  formatTwd, type GuildService, type InquiryWithService, type PublicReviewStats
} from '../lib/marketplace';
import GuildNeeds from './GuildNeeds';
import './guild-home.css';

const GOOGLE_OAUTH_ENABLED = import.meta.env.VITE_GUILD_GOOGLE_OAUTH === 'true';

type Pane = 'discover' | 'mine' | 'inbox' | 'guild';
type IconComp = React.ComponentType<{size?: number; strokeWidth?: number; className?: string}>;
const CATEGORIES: {name: string; description: string; icon: IconComp; shade: string}[] = [
  { name:'網站開發', description:'網站、App 與數位工具', icon: Code2, shade:'mint'},
  { name:'設計美編', description:'品牌、視覺與平面設計', icon: Palette, shade:'peach'},
  { name:'攝影錄影', description:'拍攝、剪輯與影像製作', icon: Camera, shade:'lavender'},
  { name:'教學家教', description:'技能教學與知識分享', icon: GraduationCap, shade:'sky'},
  { name:'居家修繕', description:'生活修繕與到府服務', icon: Wrench, shade:'yellow'},
  { name:'其他', description:'各種專長與合作提案', icon: Sparkles, shade:'rose'},
];

const CATEGORY_EN:Record<string,string> = {
 '網站開發':'Websites & apps','設計美編':'Design','攝影錄影':'Photo & video',
 '教學家教':'Tutoring','居家修繕':'Home repairs','其他':'Other help'
};
const CATEGORY_DESC_EN:Record<string,string> = {
 '網站開發':'Websites, apps and digital tools','設計美編':'Branding and graphics',
 '攝影錄影':'Filming and editing','教學家教':'Learn from others',
 '居家修繕':'Everyday home help','其他':'All skills and ideas'
};

const AVATARS = ['#E2F0DC','#FAE6DF','#E5E9FB','#F6E6BB','#DAF0F0'];
function displayName(user: ReturnType<typeof useGuild>['user'], profile: ReturnType<typeof useGuild>['profile']) {
  return profile?.display_name || user?.user_metadata?.guild_nickname || '冒險者';
}
const LanguageContext=React.createContext<'zh'|'en'>('zh');
function useTx(){const language=React.useContext(LanguageContext);return (zh:string,en:string)=>language==='en'?en:zh;}
function Overlay({children, close, title}: {children:React.ReactNode; close:()=>void; title:string}) {
  const tx=useTx();
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[close]);
  return <div className="gh-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)close();}}>
    <div className="gh-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="gh-dialog-close" onClick={close} aria-label={tx("關閉","Close")}><X size={21}/></button>
      {children}
    </div>
  </div>;
}
function Notice({message, type='info'}: {message:string;type?:'info'|'error'|'success'}) {
  return <div role="status" className={'gh-notice gh-notice-'+type}>{message}</div>;
}
function AuthDialog({onClose}:{onClose:()=>void}) {
  const tx=useTx();
  const {signIn, signUp, signInWithGoogle} = useGuild();
  const [mode,setMode] = useState<'signup'|'login'>('signup');
  const [alias,setAlias] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [confirmed,setConfirmed] = useState(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setBusy(true);setMessage('');setConfirmed(false);
    try {
      const res = mode==='signup'
        ? await signUp(email,password,alias.trim() || '冒險者-'+crypto.randomUUID().slice(0,6))
        : await signIn(email,password);
      if (res.error) setMessage(res.error);
      else if (res.confirmationRequired) {setConfirmed(true);setMessage('已寄出驗證信，請打開信箱確認後再登入。');}
      else onClose();
    } catch(err) {setMessage(err instanceof Error?err.message:'登入發生問題');}
    finally {setBusy(false);}
  }
  return <Overlay title={tx("加入冒險者公會","Join Adventurers Guild")} close={onClose}>
    <div className="gh-dialog-eyebrow">WELCOME TO GUILD</div>
    <h2 className="gh-dialog-title">{mode==='signup'?tx('免費加入，開始你的下一個機會。','Join for free and get started.'):tx('歡迎回來！','Welcome back!')}</h2>
    <p className="gh-dialog-sub">{tx("不需公司、不需統編。每個人都能分享自己的技能。","No company needed. Everyone can share their skills.")}</p>
    {GOOGLE_OAUTH_ENABLED && <>
      <button className="gh-google" type="button" onClick={async()=>{
        setMessage('');try{const result=await signInWithGoogle();if(result.error)setMessage(result.error);}
        catch(err){setMessage(err instanceof Error?err.message:'Google 登入暫時無法使用');}
      }}><Globe2 size={18}/> {tx("使用 Google 繼續","Continue with Google")}</button>
      <div className="gh-separator"><span>{tx("或使用 Email","Or use email")}</span></div>
    </>}
    <form className="gh-form" onSubmit={submit}>
      {mode==='signup'&&<label>{tx("你的暱稱（選填）","Your name (optional)")}<input value={alias} maxLength={80} onChange={e=>setAlias(e.target.value)} placeholder={tx("例如：小安設計師","e.g. Alex the designer")}/></label>}
      <label>{tx("電子信箱","Email address")}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>{tx("密碼","Password")}<input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={tx("至少 6 個字元","At least 6 characters")}/></label>
      {message&&<Notice type={confirmed?'success':'error'} message={message}/>}
      <button className="gh-primary gh-wide" disabled={busy} type="submit">{busy?tx('處理中…','Working…'):mode==='signup'?tx('建立免費帳號','Create a free account'):tx('登入公會','Sign in')}<ArrowRight size={17}/></button>
    </form>
    <button type="button" className="gh-text-switch" onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('');}}>
      {mode==='signup'?tx('已經是會員？登入帳號','Already have an account? Sign in'):tx('還沒有帳號？免費加入','New here? Join for free')}
    </button>
  </Overlay>;
}
function PostDialog({onClose,onPosted}:{onClose:()=>void;onPosted:()=>void}) {
  const tx=useTx();
  const {user,profile}=useGuild();
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [city,setCity]=useState('');
  const [category,setCategory]=useState('其他');
  const [price,setPrice]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:React.FormEvent){
    e.preventDefault();if(!user)return;
    setBusy(true);setError('');
    try{
      const value=price.trim()===''?null:Number(price);
      if(value!==null&&(!Number.isInteger(value)||value<0))throw new Error('請輸入有效的非負整數價格。');
      await publishService(user.id,{
        businessName:displayName(user,profile),title,description,city,category,priceFromTwd:value
      });
      onPosted();onClose();
    }catch(err){setError(err instanceof Error?err.message:'刊登失敗');}
    finally{setBusy(false);}
  }
  return <Overlay title={tx("免費刊登服務","Post a service")} close={onClose}>
    <div className="gh-dialog-eyebrow">SHARE YOUR SKILLS</div>
    <h2 className="gh-dialog-title">{tx("你的專長，值得被看見。","Let people discover your skills.")}</h2>
    <p className="gh-dialog-sub">{tx("填寫簡單資料即可免費刊登服務。","Share a few details to post for free.")}</p>
    <form className="gh-form" onSubmit={submit}>
      <label>{tx("你能提供什麼？","What can you help with?")}<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder={tx("例如：幫小品牌做一頁式網站","e.g. Create a website for a small business")}/></label>
      <label>{tx("簡單介紹你的服務","Describe what you can offer")}<textarea required rows={4} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder={tx("提供哪些內容？適合誰？有什麼特色？","What will you deliver? Who is it for?")}/></label>
      <label>{tx("服務地區","Service location")}<select required value={city} onChange={e=>setCity(e.target.value)}>
        <option value="">{tx("選擇地區","Choose a location")}</option>{TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
      </select></label>
      <details className="gh-advanced"><summary>{tx("更多設定（選填）","More options (optional)")}<ChevronDown size={16}/></summary>
        <div className="gh-form gh-advanced-fields">
          <label>{tx("分類","Category")}<select value={category} onChange={e=>setCategory(e.target.value)}>{SERVICE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
          <label>{tx("參考起始價（NT$）","Starting price (NT$)")}<input type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} placeholder={tx("留空＝價格另議","Leave blank to discuss price")}/></label>
        </div>
      </details>
      {error&&<Notice type="error" message={error}/>}
      <button type="submit" disabled={busy} className="gh-primary gh-wide">{busy?tx('刊登中…','Posting…'):tx('免費刊登我的服務','Post for free')}<ArrowRight size={17}/></button>
    </form>
  </Overlay>;
}
function InquiryDialog({service,close,onSent}:{service:GuildService;close:()=>void;onSent:()=>void}){
  const tx=useTx();
  const {user}=useGuild();
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:React.FormEvent){
    e.preventDefault();if(!user)return;
    setBusy(true);setError('');
    try{await sendInquiry({serviceId:service.id,requesterId:user.id,message});onSent();close();}
    catch(err){setError(err instanceof Error?err.message:'送出失敗');}
    finally{setBusy(false);}
  }
  return <Overlay title={tx("送出詢價","Contact provider")} close={close}>
    <div className="gh-dialog-eyebrow">LET'S CONNECT</div>
    <h2 className="gh-dialog-title">{tx("和","Talk to")} {service.business_name} {tx("聊聊。","")}</h2>
    <p className="gh-dialog-sub">{service.title} · {formatTwd(service.price_from_twd)}</p>
    <form onSubmit={submit} className="gh-form">
      <label>{tx("告訴對方你的需求","Tell them what you need")}<textarea required rows={5} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder={tx("想做什麼、希望完成的時間、其他細節…","What would you like done? By when?")}/></label>
      {error&&<Notice type="error" message={error}/>}
      <button className="gh-primary gh-wide" type="submit" disabled={busy}>{busy?tx('送出中…','Sending…'):tx('送出詢價','Send message')}<ArrowRight size={17}/></button>
    </form>
  </Overlay>;
}
function SkillCard({service,stats,onInquire,isOwn}:{service:GuildService;stats?:PublicReviewStats;onInquire:()=>void;isOwn:boolean}) {
  const tx=useTx();
  const index=Math.max(0,SERVICE_CATEGORIES.indexOf(service.category));
  const cat=CATEGORIES.find(c=>c.name===service.category);
  const Icon=cat?.icon||BriefcaseBusiness;
  return <article className="gh-skill-card">
    <div className="gh-skill-top"><span className="gh-skill-icon" style={{background:AVATARS[index%AVATARS.length]}}><Icon size={22} strokeWidth={1.75}/></span><span className="gh-skill-category">{tx(service.category,CATEGORY_EN[service.category]||service.category)}</span></div>
    <h3>{service.title}</h3>
    <p className="gh-skill-desc">{service.description}</p>
    <div className="gh-skill-by"><span className="gh-person-avatar">{service.business_name.trim()[0]||'人'}</span><span>{service.business_name}</span>
      <span className="gh-skill-city"><MapPin size={13}/>{service.city}</span>
    </div>
    <div className="gh-skill-bottom"><div><strong>{formatTwd(service.price_from_twd)}</strong><span>{stats?.count? <><Star size={12} fill="currentColor"/>{stats.average.toFixed(1)} · {stats.count} {tx("筆交易評價","reviews")}</>: tx("尚無交易評價","No reviews yet")}</span></div>
      <button type="button" onClick={onInquire} className="gh-card-action">{isOwn?tx('你的服務','Your listing'):tx('詢問服務','Ask about this')}<ArrowUpRight size={17}/></button>
    </div>
  </article>;
}
function TaskCard({item,received,refresh}:{item:InquiryWithService;received:boolean;refresh:()=>void}){
  const tx=useTx();
  const [quote,setQuote]=useState('');
  const [rating,setRating]=useState(5);
  const [comment,setComment]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  async function act(job:()=>Promise<unknown>,msg:string){
    setBusy(true);setError('');setSuccess('');
    try{await job();setSuccess(msg);refresh();}
    catch(err){setError(err instanceof Error?err.message:'操作失敗');}
    finally{setBusy(false);}
  }
  return <article className="gh-task-card">
    <div className="gh-task-top"><span className="gh-task-type">{received?'收到的詢價':'我送出的詢價'}</span><span className={'gh-status gh-status-'+item.status}>{item.status==='requested'?'等待報價':item.status==='quoted'?'已報價':'已完成'}</span></div>
    <h3>{item.service?.title||'服務已下架'}</h3>
    <p className="gh-task-meta">{item.service?.business_name||'服務提供者'} · {new Date(item.created_at).toLocaleDateString('zh-TW')}</p>
    <p className="gh-task-message">{item.message}</p>
    {item.quote_twd!=null&&<p className="gh-quote">報價 <strong>{formatTwd(item.quote_twd)}</strong></p>}
    {received&&item.status==='requested'&&<form className="gh-task-inline" onSubmit={e=>{e.preventDefault();act(()=>quoteInquiry(item.id,Number(quote)),'報價已送出');}}>
      <input type="number" min="1" required value={quote} onChange={e=>setQuote(e.target.value)} placeholder="報價 NT$"/>
      <button className="gh-small-primary" disabled={busy} type="submit">送出報價</button></form>}
    {!received&&item.status==='quoted'&&<button type="button" className="gh-small-primary" disabled={busy} onClick={()=>act(()=>confirmInquiryCompleted(item.id),'已確認完成')}>確認服務已完成</button>}
    {!received&&item.status==='completed'&&!item.review&&<form className="gh-review" onSubmit={e=>{e.preventDefault();act(()=>createReview({inquiryId:item.id,reviewerId:item.requester_id,rating,comment}),'評價已送出');}}>
      <label>留下交易後評價</label><div className="gh-rating" role="group" aria-label="交易星等">{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} aria-label={n+'顆星'} aria-pressed={rating===n}><Star size={19} fill={n<=rating?'#F2A543':'transparent'} color="#E99A2E"/></button>)}</div>
      <textarea rows={2} maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="心得（選填）"/><button className="gh-small-primary" type="submit" disabled={busy}>送出評價</button>
    </form>}
    {item.review&&<p className="gh-review-done"><Check size={14}/> 已完成交易後評價</p>}
    {error&&<Notice type="error" message={error}/>}
    {success&&<Notice type="success" message={success}/>}
  </article>;
}
export default function GuildHome() {
  const {user,profile,signOut,loading:authLoading}=useGuild();
  const [lang,setLang]=useState<'zh'|'en'>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested==='en' || requested==='zh') return requested;
    try { return localStorage.getItem('guild-language')==='en' ? 'en' : 'zh'; } catch { return 'zh'; }
  });
  const tx=(zh:string,en:string)=>lang==='en'?en:zh;
  useEffect(()=>{ document.documentElement.lang=lang==='en'?'en':'zh-TW'; try{localStorage.setItem('guild-language',lang);}catch{} },[lang]);
  const [pane,setPane]=useState<Pane>('discover');
  const [menu,setMenu]=useState(false);
  const [auth,setAuth]=useState(false);
  const [post,setPost]=useState(false);
  const [inquiry,setInquiry]=useState<GuildService|null>(null);
  const [oneLine,setOneLine]=useState('');
  const [keyword,setKeyword]=useState(()=>new URLSearchParams(window.location.search).get('q')||'');
  const [city,setCity]=useState('');
  const [filters,setFilters]=useState({keyword:new URLSearchParams(window.location.search).get('q')||'',city:''});
  const [services,setServices]=useState<GuildService[]>([]);
  const [stats,setStats]=useState<Record<string,PublicReviewStats>>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [setupPending,setSetupPending]=useState(false);
  const [notice,setNotice]=useState('');
  const [mine,setMine]=useState<GuildService[]>([]);
  const [incoming,setIncoming]=useState<InquiryWithService[]>([]);
  const [outgoing,setOutgoing]=useState<InquiryWithService[]>([]);
  const [dashboardLoading,setDashboardLoading]=useState(false);
  const [dashboardError,setDashboardError]=useState('');
  const resultsRef=useRef<HTMLElement>(null);
  const name=displayName(user,profile);
  const load = useCallback(async (next:{keyword:string;city:string})=>{
    setLoading(true);setError('');setSetupPending(false);
    try{
      const data=await searchServices(next);
      setServices(data);
      try{setStats(await fetchPublicReviewStats(data.map(s=>s.id)));}
      catch{setStats({});}
    }catch(err){
      const message=err instanceof Error?err.message:'搜尋暫時無法使用';
      if(/資料表尚未建立|guild_services|PGRST205|42P01/i.test(message))setSetupPending(true);
      else setError(message);
      setServices([]);
    }
    finally{setLoading(false);}
  },[]);
  const reloadDashboard=useCallback(async()=>{
    if(!user)return;
    setDashboardLoading(true);setDashboardError('');
    const [a,b,c]=await Promise.allSettled([listMyServices(user.id),listIncomingInquiries(user.id),listOutgoingInquiries(user.id)]);
    if(a.status==='fulfilled')setMine(a.value); else setDashboardError(a.reason?.message||'讀取我的服務失敗');
    if(b.status==='fulfilled')setIncoming(b.value); else setDashboardError(b.reason?.message||'讀取收到的詢價失敗');
    if(c.status==='fulfilled')setOutgoing(c.value); else setDashboardError(c.reason?.message||'讀取送出的詢價失敗');
    setDashboardLoading(false);
  },[user?.id]);
  useEffect(()=>{void load({keyword:new URLSearchParams(window.location.search).get('q')||'',city:''});},[load]);
  useEffect(()=>{if(user&&(pane==='mine'||pane==='inbox'))void reloadDashboard();},[pane,user?.id,reloadDashboard]);
  function startPost(){if(!user){setAuth(true);return;}setPost(true);}
  function toPane(next:Pane){
    setMenu(false);
    if((next==='mine'||next==='inbox')&&!user){setAuth(true);return;}
    setPane(next);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function doSearch(e?:React.FormEvent,overrides?:{keyword?:string;city?:string}){
    e?.preventDefault();
    const next={keyword:overrides?.keyword??keyword,city:overrides?.city??city};
    setKeyword(next.keyword);setCity(next.city);setFilters(next);
    setPane('discover');void load(next);
    setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),40);
  }
  function runOneLine(e:React.FormEvent){
    e.preventDefault();
    const raw=oneLine.trim().slice(0,300);
    if(!raw)return;
    const phrase=raw.toLowerCase();
    const match=
      /約會|戀愛|交往|男朋友|女朋友|date|dating|romance/.test(phrase)?'dating':
      /健身|運動|登山|爬山|跑步|單車|hiking|gym|fitness|workout/.test(phrase)?'sports':
      /社團|俱樂部|社群|club|community|group/.test(phrase)?'clubs':
      /玩伴|朋友|揪團|桌遊|遊戲|playmate|friend/.test(phrase)?'friends':
      /徵才|招募|找員工|找人才|找工程師加入|hiring|hire|recruit/.test(phrase)?'hiring':
      /求職|找工作|應徵|接案|兼職|work|job|freelance/.test(phrase)?'jobs':
      /講座|活動|聚會|創業活動|meetup|event|conference/.test(phrase)?'events':
      /資源|教材|工具|教學|資金|fund|resource|course/.test(phrase)?'resources':
      /協助|幫忙|支援|困難|help|support/.test(phrase)?'support':'cooperation';
    // Never put a raw personal request in a URL, browser history or referrer.
    try{if(match!=='dating')sessionStorage.setItem('guild-need-draft',raw);else sessionStorage.removeItem('guild-need-draft');}catch{}
    window.location.assign('/'+match+'.html?lang='+lang);
  }
  const activeCount=services.length;
  return <LanguageContext.Provider value={lang}><div className="gh-site">
    <header className="gh-header"><div className="gh-container gh-nav">
      <button type="button" className="gh-brand" onClick={()=>toPane('discover')} aria-label="冒險者公會首頁"><span className="gh-brand-symbol"><span>G</span><i/></span><span className="gh-brand-name">冒險者公會<small>ADVENTURERS GUILD</small></span></button>
      <nav className={'gh-nav-links '+(menu?'gh-nav-links-open':'')} aria-label={tx('主要導覽','Main navigation')}>
        <button type="button" className={pane==='discover'?'active':''} onClick={()=>toPane('discover')}>{tx("探索服務","Find services")}</button>
        <a href="/works.html">{tx("作品與技能","Work & skills")}</a>
        <a href="/me">{tx("個人面板","My profile")}</a>
        <a href="/community">{tx("社群論壇","Community forum")}</a>
        <button type="button" className={pane==='mine'?'active':''} onClick={()=>toPane('mine')}>{tx("我的刊登","My listings")}</button>
        <button type="button" className={pane==='inbox'?'active':''} onClick={()=>toPane('inbox')}>{tx("我的訊息","Messages")}</button>
        <button type="button" className={pane==='guild'?'active':''} onClick={()=>toPane('guild')}>{tx("任務看板","Tasks")}</button>
      </nav>
      <div className="gh-nav-actions">
        {user?<><span className="gh-user-chip"><span>{name.slice(0,1)}</span>{name}</span><button type="button" className="gh-login-link" onClick={()=>void signOut()}>{tx("登出","Sign out")}</button></>
          :<button type="button" className="gh-login-link" onClick={()=>setAuth(true)}>{tx("登入 / 註冊","Sign in / Join")}</button>}
        <button type="button" className="gh-primary gh-nav-post" onClick={startPost}>{tx("免費刊登","Post for free")} <ArrowUpRight size={15}/></button>
      </div>
      <button type="button" className="gh-lang-toggle" onClick={()=>setLang(lang==='zh'?'en':'zh')} aria-label={tx('切換英文','Switch to Chinese')}>{lang==='zh'?'EN':'中文'}</button>
      <button type="button" className="gh-menu-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'關閉選單':'開啟選單'} aria-expanded={menu}>{menu?<X size={23}/>:<Menu size={23}/>}</button>
    </div></header>

    {pane==='discover'?<>
      <section className="gh-hero gh-hero-first">
        <div className="gh-container gh-hero-grid">
          <div className="gh-hero-content">
            <div className="gh-eyebrow"><span className="gh-eyebrow-dot"/> {tx("一句話找人、找事、找機會","Find people, projects, and opportunities")}</div>
            <h1>{tx("想找人？找工作？","Find people. Find work.")}<br/><span className="gh-highlight">{tx("找機會？","Find opportunities.")}<span className="gh-highlight-star">✳</span></span></h1>
            <p className="gh-hero-description">{tx("把你想找的事情說給公會聽：合作夥伴、員工、工作、活動、社團、登山或健身朋友。先看公會內的公開資訊，找不到就幫你整理需求。","Tell the guild what you need: partners, teammates, work, events, clubs or activity buddies. Browse public guild posts, then create a request if needed.")}</p>
            <form className="gh-hero-search gh-hero-unified" onSubmit={runOneLine}>
              <MessageCircle size={22} color="#43756D"/>
              <input aria-label={tx("一句話告訴公會你想找什麼","Tell the guild what you need")} value={oneLine} required maxLength={300} onChange={e=>setOneLine(e.target.value)} placeholder={tx("例如：我想找台北一起創業的夥伴","Example: Find a startup partner in Taipei")}/>
              <button type="submit">{tx("幫我找","Find it")} <ArrowRight size={19}/></button>
            </form>
            <div className="gh-popular gh-home-examples"><span>{tx("試試看","Try")}</span>
              {([[ "找一起創業的夥伴","Find a startup partner","我想找一起創業的夥伴"],["找工作","Find a job","我想找工作"],["找創業活動","Find events","我想找台北的創業活動"],["找登山朋友","Find hiking buddies","我想找一起登山的朋友"]] as const).map(([zh,enText,sample])=><button key={zh} type="button" onClick={()=>setOneLine(sample)}>{tx(zh,enText)} <ArrowUpRight size={12}/></button>)}
            </div>
            <div className="gh-first-links">
              <a href="/community"><MessageCircle size={17}/>{tx("逛社群論壇","Explore community")} <ArrowUpRight size={14}/></a>
              <button type="button" onClick={()=>toPane('guild')}><BriefcaseBusiness size={17}/>{tx("看任務與報酬","Browse quests")} <ArrowUpRight size={14}/></button>
              <a href="/me"><Compass size={17}/>{tx("我的冒險者","My profile")} <ArrowUpRight size={14}/></a>
            </div>
            <small className="gh-first-privacy">{tx("你的話不會自動公開。刊登、接案和獎勵需要登入並經過確認。","Requests are private until you explicitly publish them. Joining tasks and earning rewards require consent.")}</small>
          </div>
          <div className="gh-hero-visual" aria-hidden="true">
            <div className="gh-hero-sun"/>
            <div className="gh-art-grid"/>
            <div className="gh-orbit gh-orbit-one"/><div className="gh-orbit gh-orbit-two"/>
            <div className="gh-art-center"><div className="gh-art-inner"><span>{tx("一句話","JUST ASK")}</span><strong>{tx("找到人， 一起完成事。","FIND YOUR NEXT TEAM.")}</strong><i>✳</i></div></div>
            <div className="gh-float gh-float-a"><span><Palette size={19}/></span> {tx("找合作","Collaborate")}</div>
            <div className="gh-float gh-float-b"><span><Code2 size={19}/></span> {tx("找任務","Find tasks")}</div>
            <div className="gh-float gh-float-c"><span><MessageCircle size={19}/></span> {tx("論壇交流","Community")}</div>
            <div className="gh-float gh-float-d"><span><WandSparkles size={18}/></span> {tx("找資源","Resources")}</div>
          </div>
        </div>
        <div className="gh-container gh-hero-bottom"><span><ShieldCheck size={16}/>{tx("真實資源・明確同意後才公開","Real information, publish by consent")}</span><span>FIND · CONNECT · CREATE</span></div>
      </section>

      <section className="gh-needs gh-container" aria-labelledby="gh-needs-title">
        <div className="gh-section-heading">
          <div><span className="gh-kicker">{tx('你想找什麼？','WHAT DO YOU NEED?')}</span>
            <h2 id="gh-needs-title">{tx('選一件你現在需要的事。','Choose what you need today.')}</h2>
            <p>{tx('不用懂技術、也不用先註冊。先看看，再決定下一步。','No technical knowledge or account needed to explore.')}</p>
          </div>
        </div>
        <div className="gh-needs-grid">
          {([
            ['cooperation',HeartHandshake,'找合作','Find partners','一起把想法做出來','Build something together'],
            ['support',MessageCircle,'找支援','Get help','遇到問題，找人幫忙','Ask for a helping hand'],
            ['resources',Compass,'找資源','Find resources','工具、教學與人脈','Tools, guides and connections'],
            ['events',Star,'找活動','Find events','認識同好、分享機會','Meet people and explore events'],
            ['hiring',BriefcaseBusiness,'找員工','Hire people','找團隊伙伴或徵才','Find team members and talent'],
            ['jobs',BriefcaseBusiness,'找工作','Find work','看看有哪些合作機會','Look for work and projects'],
            ['friends',MessageCircle,'找玩伴與朋友','Find friends','玩遊戲、出遊、找同好','Games, travel and shared hobbies'],
            ['sports',HeartHandshake,'找運動伙伴','Sports buddies','登山、健身、跑步','Hiking, gym and running'],
            ['clubs',GraduationCap,'找社團','Join a group','找興趣社團與交流圈','Meet hobby groups and communities'],
            ['dating',HeartHandshake,'找約會對象','Find a date','成人自願的認識與交往','Adults-only, mutual-consent connections'],
          ] as const).map(([slug,Icon,zh,en,subZh,subEn])=>
            <a key={slug} className={'gh-need-card gh-need-'+slug} href={'/'+slug+'.html?lang='+lang}>
              <span className="gh-need-icon"><Icon size={24} strokeWidth={1.8}/></span>
              <strong>{tx(zh,en)}</strong><span>{tx(subZh,subEn)}</span>
              <ArrowUpRight className="gh-need-arrow" size={17}/>
            </a>
          )}
        </div>
      </section>

      <GuildNeeds lang={lang} onLogin={()=>setAuth(true)}/>
      <section className="gh-categories gh-container">
        <div className="gh-section-heading"><div><span className="gh-kicker">FIND YOUR PEOPLE · 01</span><h2>{tx("從你需要的，開始探索。","Explore what you need.")}</h2><p>{tx("找到有專長的人，或把自己的能力分享出去。","Find skilled people or share what you can do.")}</p></div><button type="button" className="gh-secondary-link" onClick={()=>doSearch(undefined,{keyword:'',city:''})}>{tx("查看所有服務","View all services")} <ArrowUpRight size={17}/></button></div>
        <div className="gh-category-grid">{CATEGORIES.map(cat=>{const Icon=cat.icon;return <button type="button" key={cat.name} className={'gh-category gh-cat-'+cat.shade} onClick={()=>doSearch(undefined,{keyword:cat.name,city:''})}><span className="gh-category-icon"><Icon size={27} strokeWidth={1.7}/></span><span className="gh-category-name">{tx(cat.name,CATEGORY_EN[cat.name]||cat.name)}</span><span className="gh-category-desc">{tx(cat.description,CATEGORY_DESC_EN[cat.name]||cat.description)}</span><ArrowUpRight className="gh-category-arrow" size={18}/></button>;})}</div>
      </section>

      <section className="gh-openworks gh-container" aria-labelledby="gh-openworks-title">
        <div className="gh-section-heading">
          <div>
            <span className="gh-kicker">{tx("公開作品與教學 · 02","PROJECTS & GUIDES · 02")}</span>
            <h2 id="gh-openworks-title">{tx("先看真實作品，再動手試試。","Explore real projects and learn by doing.")}</h2>
            <p>{tx("公開作品附有說明與練習方式，不必登入。","Browse open projects and practical examples without signing in.")}</p>
          </div>
          <a className="gh-secondary-link" href="/works.html">{tx("全部實戰技能書","Explore all projects")} <ArrowUpRight size={17}/></a>
        </div>
        <div className="gh-openworks-grid">
          <article className="gh-openwork-card">
            <span className="gh-openwork-label">{tx("免費工具 · 合作成果","Free tool · Teamwork")}</span>
            <h3>{tx("合作成果檢查工具","Teamwork result checker")}</h3>
            <p>{tx("幫你確認合作任務是否真的完成，而不是只看口頭回報。","Check that a shared task really got done instead of trusting a status message.")}</p>
            <a href="/works.html#pr-evidence-gate">{tx("查看工具和使用方法","See how it works")} <ArrowUpRight size={16}/></a>
          </article>
          <article className="gh-openwork-card">
            <span className="gh-openwork-label">{tx("免費工具 · 網站檢查","Free tool · Website check")}</span>
            <h3>{tx("網站畫面檢查工具","Website consistency checker")}</h3>
            <p>{tx("自動檢查網站不同頁面的文字與排版有沒有錯誤。","Check whether pages look consistent and catch layout problems.")}</p>
            <a href="/works.html#page-parity">查看工具與練習步驟 <ArrowUpRight size={16}/></a>
          </article>
          <article className="gh-openwork-card gh-openwork-community">
            <span className="gh-openwork-label">{tx("社群交流 · 一起學習","Community · Learn together")}</span>
            <h3>{tx("交流與求助社群","Community discussions")}</h3>
            <p>{tx("可以提問、分享作品、認識有相同興趣的人。","Ask questions, share projects and meet others who share your interests.")}</p>
            <a href="/community">{tx("前往社群交流","Visit community")} <ArrowUpRight size={16}/></a>
          </article>
        </div>
        <p className="gh-openworks-note">{tx("這些是公開學習資源，與會員刊登的工作、評價或服務保證不同。","These are public learning resources, not verified jobs, member reviews or service guarantees.")}</p>
      </section>

      <section className="gh-listings-section" ref={resultsRef}>
        <div className="gh-container"><div className="gh-section-heading gh-listings-heading"><div><span className="gh-kicker">DISCOVER SERVICES · 03</span><h2>{tx("探索服務與合作機會","Explore services and partners")}<span className="gh-title-dot">.</span></h2><p>{tx("只顯示會員刊登的內容，不放虛構店家或評價。","Member-posted services only. No invented listings or reviews.")}</p></div><div className="gh-listing-meta">{!loading&&!error?(tx('目前 ','Currently ')+activeCount+tx(' 筆公開服務',' public listings')):tx('持續開放刊登中','Open for new listings')}</div></div>
          <div className="gh-filters"><label className="gh-filter-search"><Search size={19}/><input aria-label={tx("篩選服務關鍵字","Filter services")} value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doSearch(e);}} placeholder={tx("搜尋技能、服務或提供者…","Search skills, services or people…")}/></label><label className="gh-filter-city"><MapPin size={17}/><select aria-label={tx("選擇地區","Choose a city")} value={city} onChange={e=>doSearch(undefined,{keyword,city:e.target.value})}><option value="">{tx("全部地區","All locations")}</option>{TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select><ChevronDown size={15}/></label><button type="button" className="gh-filter-go" onClick={()=>doSearch(undefined,{keyword,city})}>{tx("搜尋","Search")} <ArrowRight size={16}/></button>{(filters.keyword||filters.city)&&<button type="button" className="gh-reset" onClick={()=>doSearch(undefined,{keyword:'',city:''})}>{tx("清除篩選","Clear filters")}</button>}</div>
          {loading?<div className="gh-card-grid" aria-label="讀取中">{[1,2,3].map(n=><div key={n} className="gh-skeleton gh-skill-card"><div/><div/><div/></div>)}</div>
          :error?<div className="gh-empty"><span className="gh-empty-mark"><CircleHelp size={32}/></span><h3>服務目錄暫時無法載入</h3><p>{error}</p><button type="button" className="gh-outline" onClick={()=>void load(filters)}>重新整理 <ArrowRight size={16}/></button></div>
          :services.length===0?<div className="gh-empty gh-empty-beautiful"><div className="gh-empty-illustration"><span>✳</span><span>✦</span><span>✳</span></div><h3>{setupPending?'服務市場正在準備中':filters.keyword||filters.city?'還沒有符合的服務':'第一個機會，等你來創造。'}</h3><p>{setupPending?'新版目前提供介面預覽，服務資料庫尚待啟用；刊登與詢價功能尚不能正式使用。':filters.keyword||filters.city?'試試其他關鍵字，或成為第一個提供者。':'現在還沒有公開服務。把你的專長放上來，讓需要的人找得到你。'}</p><button type="button" className="gh-primary" onClick={startPost}>{setupPending?'預覽免費刊登流程':'搶先免費刊登'} <ArrowRight size={17}/></button><a href="/works.html" className="gh-empty-works">先看看開源實戰案例 →</a></div>
          :<div className="gh-card-grid">{services.map(s=><SkillCard key={s.id} service={s} stats={stats[s.id]} isOwn={s.owner_id===user?.id} onInquire={()=>{if(s.owner_id===user?.id){setNotice('這是你刊登的服務。');return;}if(!user){setAuth(true);return;}setInquiry(s);}}/>)}</div>}
        </div>
      </section>

      <section className="gh-cta gh-container"><div className="gh-cta-left"><span className="gh-cta-icon"><HeartHandshake size={31}/></span><span>YOU HAVE SOMETHING TO OFFER</span><h2>下一個合作，<br/>從你的專長開始。</h2><p>無論是專業技能、生活服務或一個好點子，<br/>都值得讓更多人知道。</p><button type="button" className="gh-cta-button" onClick={startPost}>免費刊登我的服務 <ArrowUpRight size={20}/></button></div><div className="gh-cta-art" aria-hidden="true"><div className="gh-cta-disc"/><span>GOOD<br/>THINGS<br/>START<br/>HERE.</span><span className="gh-cta-hand">✳</span></div></section>
      <section className="gh-how gh-container"><div className="gh-section-heading"><div><span className="gh-kicker">HOW IT WORKS · 04</span><h2>{tx("簡單三步，讓合作發生。","Three simple steps.")}</h2></div></div><div className="gh-how-grid">{[['01','加入公會',GOOGLE_OAUTH_ENABLED?'用 Google 或 Email 免費加入，不需要公司資格。':'用 Email 免費加入，不需要公司資格。'],['02','分享或探索','刊登你的能力，或搜尋別人的專業服務。'],['03','開始合作','提出詢價、討論內容，完成後留下交易評價。']].map(([num,title,desc])=><div key={num} className="gh-how-card"><span>{num}</span><h3>{title}</h3><p>{desc}</p></div>)}</div></section>
    </>:pane==='guild'?<div className="gh-legacy"><div className="gh-container gh-backline"><button className="gh-outline" onClick={()=>toPane('discover')}>← 回到新版首頁</button><p>舊版任務看板暫時保留，避免影響原有委託流程。</p></div><Suspense fallback={<div className="gh-container gh-loading">載入任務看板中…</div>}><LegacyGuildMain/></Suspense></div>
    :<main className="gh-container gh-dashboard"><button type="button" className="gh-back" onClick={()=>toPane('discover')}>← 回探索服務</button><div className="gh-dashboard-head"><span className="gh-kicker">MY SPACE</span><h1>{pane==='mine'?'我的服務刊登':'我的詢價與合作'}</h1><p>{pane==='mine'?'管理你公開的專長與服務。':'所有詢價進度，都在這裡。'}</p></div>
      {dashboardError&&<Notice type="error" message={dashboardError}/>}
      {dashboardLoading?<div className="gh-loading">載入中…</div>:pane==='mine'?<><div className="gh-dashboard-toolbar"><span>已刊登 {mine.length} 項服務</span><button className="gh-primary" onClick={startPost}><Plus size={18}/> 再刊登一項</button></div>{mine.length?<div className="gh-card-grid">{mine.map(s=><SkillCard key={s.id} service={s} isOwn onInquire={()=>setNotice('這是你的服務')}/>)}</div>:<div className="gh-empty"><h3>還沒有刊登過服務</h3><p>從分享一個你擅長的技能開始。</p><button className="gh-primary" onClick={startPost}>免費刊登 <ArrowRight size={16}/></button></div>}</>
        :<div className="gh-inbox-grid"><section><h2>收到的詢價 <small>{incoming.length}</small></h2>{incoming.length?incoming.map(i=><TaskCard key={i.id} item={i} received refresh={reloadDashboard}/>):<div className="gh-inbox-empty">目前還沒有收到詢價。</div>}</section><section><h2>我送出的詢價 <small>{outgoing.length}</small></h2>{outgoing.length?outgoing.map(i=><TaskCard key={i.id} item={i} received={false} refresh={reloadDashboard}/>):<div className="gh-inbox-empty">還沒有送出過詢價，去探索看看吧。</div>}</section></div>}
    </main>}
    <footer className="gh-footer"><div className="gh-container gh-footer-grid"><div><span className="gh-footer-brand"><span>G</span> 冒險者公會</span><p>{tx('讓人與人的專長相遇。','Connect people and skills.')}<br/>{tx('讓 AI 成為合作的橋樑。','Let AI help people work together.')}</p></div><div className="gh-footer-links"><button onClick={()=>toPane('discover')}>探索服務</button><button onClick={startPost}>免費刊登</button><button onClick={()=>toPane('guild')}>任務看板</button><a href="/works.html">作品與技能</a><a href="/discover.html" style={{color:"inherit",textDecoration:"underline"}}>{tx("關於公會","About us")}</a><a href="https://forum.928174.xyz/" style={{color:"inherit",textDecoration:"underline"}}>{tx("台灣 AI 論壇","Community forum")}</a></div><div className="gh-footer-end"><span>ADVENTURERS GUILD</span><small>每個人都值得一個機會。</small></div></div><div className="gh-container gh-footer-note">© 2026 冒險者公會 · 神瑋科技 <span>資料依會員刊登提供，交易前請自行確認內容與資格。</span></div></footer>
    {auth&&<AuthDialog onClose={()=>setAuth(false)}/>}
    {post&&<PostDialog onClose={()=>setPost(false)} onPosted={()=>{setNotice('刊登成功！你的服務已提交。');setPane('mine');void reloadDashboard();void load({keyword:'',city:''});}}/>}
    {inquiry&&<InquiryDialog service={inquiry} close={()=>setInquiry(null)} onSent={()=>{setNotice('詢價已送出，請到「我的訊息」追蹤進度。');void reloadDashboard();}}/>}
    {notice&&<div role="status" className="gh-toast"><Check size={18}/>{notice}<button onClick={()=>setNotice('')} aria-label="關閉訊息"><X size={16}/></button></div>}
    {authLoading&&<div className="gh-session-loading">載入會員資料中…</div>}
  </div></LanguageContext.Provider>;
}
