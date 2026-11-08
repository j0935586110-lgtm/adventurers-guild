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
const AVATARS = ['#E2F0DC','#FAE6DF','#E5E9FB','#F6E6BB','#DAF0F0'];
function displayName(user: ReturnType<typeof useGuild>['user'], profile: ReturnType<typeof useGuild>['profile']) {
  return profile?.display_name || user?.user_metadata?.guild_nickname || '冒險者';
}
function Overlay({children, close, title}: {children:React.ReactNode; close:()=>void; title:string}) {
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[close]);
  return <div className="gh-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)close();}}>
    <div className="gh-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="gh-dialog-close" onClick={close} aria-label="關閉"><X size={21}/></button>
      {children}
    </div>
  </div>;
}
function Notice({message, type='info'}: {message:string;type?:'info'|'error'|'success'}) {
  return <div role="status" className={'gh-notice gh-notice-'+type}>{message}</div>;
}
function AuthDialog({onClose}:{onClose:()=>void}) {
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
  return <Overlay title="加入冒險者公會" close={onClose}>
    <div className="gh-dialog-eyebrow">WELCOME TO GUILD</div>
    <h2 className="gh-dialog-title">{mode==='signup'?'免費加入，開始你的下一個機會。':'歡迎回來！'}</h2>
    <p className="gh-dialog-sub">不需公司、不需統編。每個人都能分享自己的技能。</p>
    {GOOGLE_OAUTH_ENABLED && <>
      <button className="gh-google" type="button" onClick={async()=>{
        setMessage('');try{const result=await signInWithGoogle();if(result.error)setMessage(result.error);}
        catch(err){setMessage(err instanceof Error?err.message:'Google 登入暫時無法使用');}
      }}><Globe2 size={18}/> 使用 Google 繼續</button>
      <div className="gh-separator"><span>或使用 Email</span></div>
    </>}
    <form className="gh-form" onSubmit={submit}>
      {mode==='signup'&&<label>你的暱稱（選填）<input value={alias} maxLength={80} onChange={e=>setAlias(e.target.value)} placeholder="例如：小安設計師"/></label>}
      <label>電子信箱<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>密碼<input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="至少 6 個字元"/></label>
      {message&&<Notice type={confirmed?'success':'error'} message={message}/>}
      <button className="gh-primary gh-wide" disabled={busy} type="submit">{busy?'處理中…':mode==='signup'?'建立免費帳號':'登入公會'}<ArrowRight size={17}/></button>
    </form>
    <button type="button" className="gh-text-switch" onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('');}}>
      {mode==='signup'?'已經是會員？登入帳號':'還沒有帳號？免費加入'}
    </button>
  </Overlay>;
}
function PostDialog({onClose,onPosted}:{onClose:()=>void;onPosted:()=>void}) {
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
  return <Overlay title="免費刊登服務" close={onClose}>
    <div className="gh-dialog-eyebrow">SHARE YOUR SKILLS</div>
    <h2 className="gh-dialog-title">你的專長，值得被看見。</h2>
    <p className="gh-dialog-sub">只要 3 個欄位，就能免費刊登服務。</p>
    <form className="gh-form" onSubmit={submit}>
      <label>你能提供什麼？<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：幫小品牌做一頁式網站"/></label>
      <label>簡單介紹你的服務<textarea required rows={4} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="提供哪些內容？適合誰？有什麼特色？"/></label>
      <label>服務地區<select required value={city} onChange={e=>setCity(e.target.value)}>
        <option value="">選擇地區</option>{TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
      </select></label>
      <details className="gh-advanced"><summary>更多設定（選填）<ChevronDown size={16}/></summary>
        <div className="gh-form gh-advanced-fields">
          <label>分類<select value={category} onChange={e=>setCategory(e.target.value)}>{SERVICE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
          <label>參考起始價（NT$）<input type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} placeholder="留空＝價格另議"/></label>
        </div>
      </details>
      {error&&<Notice type="error" message={error}/>}
      <button type="submit" disabled={busy} className="gh-primary gh-wide">{busy?'刊登中…':'免費刊登我的服務'}<ArrowRight size={17}/></button>
    </form>
  </Overlay>;
}
function InquiryDialog({service,close,onSent}:{service:GuildService;close:()=>void;onSent:()=>void}){
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
  return <Overlay title="送出詢價" close={close}>
    <div className="gh-dialog-eyebrow">LET'S CONNECT</div>
    <h2 className="gh-dialog-title">和 {service.business_name} 聊聊。</h2>
    <p className="gh-dialog-sub">{service.title} · {formatTwd(service.price_from_twd)}</p>
    <form onSubmit={submit} className="gh-form">
      <label>告訴對方你的需求<textarea required rows={5} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="想做什麼、希望完成的時間、其他細節…"/></label>
      {error&&<Notice type="error" message={error}/>}
      <button className="gh-primary gh-wide" type="submit" disabled={busy}>{busy?'送出中…':'送出詢價'}<ArrowRight size={17}/></button>
    </form>
  </Overlay>;
}
function SkillCard({service,stats,onInquire,isOwn}:{service:GuildService;stats?:PublicReviewStats;onInquire:()=>void;isOwn:boolean}) {
  const index=Math.max(0,SERVICE_CATEGORIES.indexOf(service.category));
  const cat=CATEGORIES.find(c=>c.name===service.category);
  const Icon=cat?.icon||BriefcaseBusiness;
  return <article className="gh-skill-card">
    <div className="gh-skill-top"><span className="gh-skill-icon" style={{background:AVATARS[index%AVATARS.length]}}><Icon size={22} strokeWidth={1.75}/></span><span className="gh-skill-category">{service.category}</span></div>
    <h3>{service.title}</h3>
    <p className="gh-skill-desc">{service.description}</p>
    <div className="gh-skill-by"><span className="gh-person-avatar">{service.business_name.trim()[0]||'人'}</span><span>{service.business_name}</span>
      <span className="gh-skill-city"><MapPin size={13}/>{service.city}</span>
    </div>
    <div className="gh-skill-bottom"><div><strong>{formatTwd(service.price_from_twd)}</strong><span>{stats?.count? <><Star size={12} fill="currentColor"/>{stats.average.toFixed(1)} · {stats.count} 筆交易評價</>: '尚無交易評價'}</span></div>
      <button type="button" onClick={onInquire} className="gh-card-action">{isOwn?'你的服務':'詢問服務'}<ArrowUpRight size={17}/></button>
    </div>
  </article>;
}
function TaskCard({item,received,refresh}:{item:InquiryWithService;received:boolean;refresh:()=>void}){
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
  const [pane,setPane]=useState<Pane>('discover');
  const [menu,setMenu]=useState(false);
  const [auth,setAuth]=useState(false);
  const [post,setPost]=useState(false);
  const [inquiry,setInquiry]=useState<GuildService|null>(null);
  const [keyword,setKeyword]=useState('');
  const [city,setCity]=useState('');
  const [filters,setFilters]=useState({keyword:'',city:''});
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
  useEffect(()=>{void load({keyword:'',city:''});},[load]);
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
  const activeCount=services.length;
  return <div className="gh-site">
    <header className="gh-header"><div className="gh-container gh-nav">
      <button type="button" className="gh-brand" onClick={()=>toPane('discover')} aria-label="冒險者公會首頁"><span className="gh-brand-symbol"><span>G</span><i/></span><span className="gh-brand-name">冒險者公會<small>ADVENTURERS GUILD</small></span></button>
      <nav className={'gh-nav-links '+(menu?'gh-nav-links-open':'')} aria-label="主要導覽">
        <button type="button" className={pane==='discover'?'active':''} onClick={()=>toPane('discover')}>探索服務</button>
        <a href="/works.html">作品與技能</a>
        <button type="button" className={pane==='mine'?'active':''} onClick={()=>toPane('mine')}>我的刊登</button>
        <button type="button" className={pane==='inbox'?'active':''} onClick={()=>toPane('inbox')}>我的訊息</button>
        <button type="button" className={pane==='guild'?'active':''} onClick={()=>toPane('guild')}>任務看板</button>
      </nav>
      <div className="gh-nav-actions">
        {user?<><span className="gh-user-chip"><span>{name.slice(0,1)}</span>{name}</span><button type="button" className="gh-login-link" onClick={()=>void signOut()}>登出</button></>
          :<button type="button" className="gh-login-link" onClick={()=>setAuth(true)}>登入 / 註冊</button>}
        <button type="button" className="gh-primary gh-nav-post" onClick={startPost}>免費刊登 <ArrowUpRight size={15}/></button>
      </div>
      <button type="button" className="gh-menu-toggle" onClick={()=>setMenu(!menu)} aria-label={menu?'關閉選單':'開啟選單'} aria-expanded={menu}>{menu?<X size={23}/>:<Menu size={23}/>}</button>
    </div></header>

    {pane==='discover'?<>
      <section className="gh-hero">
        <div className="gh-container gh-hero-grid">
          <div className="gh-hero-content">
            <div className="gh-eyebrow"><span className="gh-eyebrow-dot"/> 為每一種才能，找到對的人</div>
            <h1>你的專長，<br/>值得<span className="gh-highlight">被看見<span className="gh-highlight-star">✳</span></span></h1>
            <p className="gh-hero-description">找設計、找工程師、找生活幫手，或把自己的技能分享出去。<br className="gh-break"/>在這裡，每個人都能遇見下一個合作機會。</p>
            <form className="gh-hero-search" onSubmit={e=>doSearch(e)}>
              <Search size={23} color="#43756D"/><input aria-label="搜尋技能或服務" value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="你正在尋找什麼服務？"/>
              <button type="submit">開始探索 <ArrowRight size={19}/></button>
            </form>
            <div className="gh-popular"><span>熱門探索</span>{['網站開發','設計美編','攝影錄影','清潔打掃'].map(t=><button type="button" key={t} onClick={()=>doSearch(undefined,{keyword:t})}>{t}<ArrowUpRight size={12}/></button>)}</div>
          </div>
          <div className="gh-hero-visual" aria-hidden="true">
            <div className="gh-hero-sun"/>
            <div className="gh-art-grid"/>
            <div className="gh-orbit gh-orbit-one"/><div className="gh-orbit gh-orbit-two"/>
            <div className="gh-art-center"><div className="gh-art-inner"><span>一起</span><strong>把好點子<br/>變成現實。</strong><i>✳</i></div></div>
            <div className="gh-float gh-float-a"><span><Palette size={19}/></span> 品牌設計</div>
            <div className="gh-float gh-float-b"><span><Code2 size={19}/></span> 網站開發</div>
            <div className="gh-float gh-float-c"><span><Camera size={19}/></span> 攝影製作</div>
            <div className="gh-float gh-float-d"><span><WandSparkles size={18}/></span> 更多可能</div>
            <div className="gh-art-asterisk">✻</div>
          </div>
        </div>
        <div className="gh-container gh-hero-bottom"><span><ShieldCheck size={16}/> 真實服務・透明詢價</span><span>MADE FOR PEOPLE, READY FOR AGENTS <ArrowUpRight size={14}/></span></div>
      </section>

      <section className="gh-categories gh-container">
        <div className="gh-section-heading"><div><span className="gh-kicker">FIND YOUR PEOPLE · 01</span><h2>從你需要的，開始探索。</h2><p>每一項技能，都可能是另一個人的答案。</p></div><button type="button" className="gh-secondary-link" onClick={()=>doSearch(undefined,{keyword:'',city:''})}>查看所有服務 <ArrowUpRight size={17}/></button></div>
        <div className="gh-category-grid">{CATEGORIES.map(cat=>{const Icon=cat.icon;return <button type="button" key={cat.name} className={'gh-category gh-cat-'+cat.shade} onClick={()=>doSearch(undefined,{keyword:cat.name,city:''})}><span className="gh-category-icon"><Icon size={27} strokeWidth={1.7}/></span><span className="gh-category-name">{cat.name}</span><span className="gh-category-desc">{cat.description}</span><ArrowUpRight className="gh-category-arrow" size={18}/></button>;})}</div>
      </section>

      <section className="gh-openworks gh-container" aria-labelledby="gh-openworks-title">
        <div className="gh-section-heading">
          <div>
            <span className="gh-kicker">OPEN WORKS · 02</span>
            <h2 id="gh-openworks-title">先看真實作品，再動手試試。</h2>
            <p>每個案例列出用途、原始碼與練習步驟，不需要先登入。</p>
          </div>
          <a className="gh-secondary-link" href="/works.html">全部實戰技能書 <ArrowUpRight size={17}/></a>
        </div>
        <div className="gh-openworks-grid">
          <article className="gh-openwork-card">
            <span className="gh-openwork-label">開源作品 · PR 驗證</span>
            <h3>PR Evidence Gate</h3>
            <p>檢查 AI 協作時的 GitHub PR、工作樹與驗收證據，避免把「自稱通過」誤當正式核准。</p>
            <a href="/works.html#pr-evidence-gate">查看工具與練習步驟 <ArrowUpRight size={16}/></a>
          </article>
          <article className="gh-openwork-card">
            <span className="gh-openwork-label">開源作品 · 網站檢查</span>
            <h3>Page Parity</h3>
            <p>比對靜態網站多個頁面的標題、導覽與版面，協助找出不一致及溢出問題。</p>
            <a href="/works.html#page-parity">查看工具與練習步驟 <ArrowUpRight size={16}/></a>
          </article>
          <article className="gh-openwork-card gh-openwork-community">
            <span className="gh-openwork-label">社群入口 · 經驗交流</span>
            <h3>台灣 AI 實戰論壇</h3>
            <p>看 Agent、MCP 與開源協作的真實紀錄，也能提出問題、分享自己的作品。</p>
            <a href="https://forum.928174.xyz/" rel="noopener noreferrer">閱讀討論與交流 <ArrowUpRight size={16}/></a>
          </article>
        </div>
        <p className="gh-openworks-note">上方是可公開核對的開源作品與討論入口，不是付費服務、會員評價或平台履約保證。</p>
      </section>

      <section className="gh-listings-section" ref={resultsRef}>
        <div className="gh-container"><div className="gh-section-heading gh-listings-heading"><div><span className="gh-kicker">DISCOVER SERVICES · 03</span><h2>探索服務與合作機會<span className="gh-title-dot">.</span></h2><p>這裡展示會員真實刊登的服務，沒有假店家或虛構評價。</p></div><div className="gh-listing-meta">{!loading&&!error?('目前 '+activeCount+' 筆公開服務'):'持續開放刊登中'}</div></div>
          <div className="gh-filters"><label className="gh-filter-search"><Search size={19}/><input aria-label="篩選服務關鍵字" value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')doSearch(e);}} placeholder="搜尋技能、服務或提供者…"/></label><label className="gh-filter-city"><MapPin size={17}/><select aria-label="選擇地區" value={city} onChange={e=>doSearch(undefined,{keyword,city:e.target.value})}><option value="">全部地區</option>{TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select><ChevronDown size={15}/></label><button type="button" className="gh-filter-go" onClick={()=>doSearch(undefined,{keyword,city})}>搜尋 <ArrowRight size={16}/></button>{(filters.keyword||filters.city)&&<button type="button" className="gh-reset" onClick={()=>doSearch(undefined,{keyword:'',city:''})}>清除篩選</button>}</div>
          {loading?<div className="gh-card-grid" aria-label="讀取中">{[1,2,3].map(n=><div key={n} className="gh-skeleton gh-skill-card"><div/><div/><div/></div>)}</div>
          :error?<div className="gh-empty"><span className="gh-empty-mark"><CircleHelp size={32}/></span><h3>服務目錄暫時無法載入</h3><p>{error}</p><button type="button" className="gh-outline" onClick={()=>void load(filters)}>重新整理 <ArrowRight size={16}/></button></div>
          :services.length===0?<div className="gh-empty gh-empty-beautiful"><div className="gh-empty-illustration"><span>✳</span><span>✦</span><span>✳</span></div><h3>{setupPending?'服務市場正在準備中':filters.keyword||filters.city?'還沒有符合的服務':'第一個機會，等你來創造。'}</h3><p>{setupPending?'新版目前提供介面預覽，服務資料庫尚待啟用；刊登與詢價功能尚不能正式使用。':filters.keyword||filters.city?'試試其他關鍵字，或成為第一個提供者。':'現在還沒有公開服務。把你的專長放上來，讓需要的人找得到你。'}</p><button type="button" className="gh-primary" onClick={startPost}>{setupPending?'預覽免費刊登流程':'搶先免費刊登'} <ArrowRight size={17}/></button><a href="/works.html" className="gh-empty-works">先看看開源實戰案例 →</a></div>
          :<div className="gh-card-grid">{services.map(s=><SkillCard key={s.id} service={s} stats={stats[s.id]} isOwn={s.owner_id===user?.id} onInquire={()=>{if(s.owner_id===user?.id){setNotice('這是你刊登的服務。');return;}if(!user){setAuth(true);return;}setInquiry(s);}}/>)}</div>}
        </div>
      </section>

      <section className="gh-cta gh-container"><div className="gh-cta-left"><span className="gh-cta-icon"><HeartHandshake size={31}/></span><span>YOU HAVE SOMETHING TO OFFER</span><h2>下一個合作，<br/>從你的專長開始。</h2><p>無論是專業技能、生活服務或一個好點子，<br/>都值得讓更多人知道。</p><button type="button" className="gh-cta-button" onClick={startPost}>免費刊登我的服務 <ArrowUpRight size={20}/></button></div><div className="gh-cta-art" aria-hidden="true"><div className="gh-cta-disc"/><span>GOOD<br/>THINGS<br/>START<br/>HERE.</span><span className="gh-cta-hand">✳</span></div></section>
      <section className="gh-how gh-container"><div className="gh-section-heading"><div><span className="gh-kicker">HOW IT WORKS · 04</span><h2>簡單三步，讓合作發生。</h2></div></div><div className="gh-how-grid">{[['01','加入公會',GOOGLE_OAUTH_ENABLED?'用 Google 或 Email 免費加入，不需要公司資格。':'用 Email 免費加入，不需要公司資格。'],['02','分享或探索','刊登你的能力，或搜尋別人的專業服務。'],['03','開始合作','提出詢價、討論內容，完成後留下交易評價。']].map(([num,title,desc])=><div key={num} className="gh-how-card"><span>{num}</span><h3>{title}</h3><p>{desc}</p></div>)}</div></section>
    </>:pane==='guild'?<div className="gh-legacy"><div className="gh-container gh-backline"><button className="gh-outline" onClick={()=>toPane('discover')}>← 回到新版首頁</button><p>舊版任務看板暫時保留，避免影響原有委託流程。</p></div><Suspense fallback={<div className="gh-container gh-loading">載入任務看板中…</div>}><LegacyGuildMain/></Suspense></div>
    :<main className="gh-container gh-dashboard"><button type="button" className="gh-back" onClick={()=>toPane('discover')}>← 回探索服務</button><div className="gh-dashboard-head"><span className="gh-kicker">MY SPACE</span><h1>{pane==='mine'?'我的服務刊登':'我的詢價與合作'}</h1><p>{pane==='mine'?'管理你公開的專長與服務。':'所有詢價進度，都在這裡。'}</p></div>
      {dashboardError&&<Notice type="error" message={dashboardError}/>}
      {dashboardLoading?<div className="gh-loading">載入中…</div>:pane==='mine'?<><div className="gh-dashboard-toolbar"><span>已刊登 {mine.length} 項服務</span><button className="gh-primary" onClick={startPost}><Plus size={18}/> 再刊登一項</button></div>{mine.length?<div className="gh-card-grid">{mine.map(s=><SkillCard key={s.id} service={s} isOwn onInquire={()=>setNotice('這是你的服務')}/>)}</div>:<div className="gh-empty"><h3>還沒有刊登過服務</h3><p>從分享一個你擅長的技能開始。</p><button className="gh-primary" onClick={startPost}>免費刊登 <ArrowRight size={16}/></button></div>}</>
        :<div className="gh-inbox-grid"><section><h2>收到的詢價 <small>{incoming.length}</small></h2>{incoming.length?incoming.map(i=><TaskCard key={i.id} item={i} received refresh={reloadDashboard}/>):<div className="gh-inbox-empty">目前還沒有收到詢價。</div>}</section><section><h2>我送出的詢價 <small>{outgoing.length}</small></h2>{outgoing.length?outgoing.map(i=><TaskCard key={i.id} item={i} received={false} refresh={reloadDashboard}/>):<div className="gh-inbox-empty">還沒有送出過詢價，去探索看看吧。</div>}</section></div>}
    </main>}
    <footer className="gh-footer"><div className="gh-container gh-footer-grid"><div><span className="gh-footer-brand"><span>G</span> 冒險者公會</span><p>讓人與人的專長相遇。<br/>讓 AI 成為合作的橋樑。</p></div><div className="gh-footer-links"><button onClick={()=>toPane('discover')}>探索服務</button><button onClick={startPost}>免費刊登</button><button onClick={()=>toPane('guild')}>任務看板</button><a href="/works.html">作品與技能</a><a href="/discover.html" style={{color:"inherit",textDecoration:"underline"}}>關於公會</a><a href="https://forum.928174.xyz/" style={{color:"inherit",textDecoration:"underline"}}>台灣 AI 論壇</a></div><div className="gh-footer-end"><span>ADVENTURERS GUILD</span><small>每個人都值得一個機會。</small></div></div><div className="gh-container gh-footer-note">© 2026 冒險者公會 · 神瑋科技 <span>資料依會員刊登提供，交易前請自行確認內容與資格。</span></div></footer>
    {auth&&<AuthDialog onClose={()=>setAuth(false)}/>}
    {post&&<PostDialog onClose={()=>setPost(false)} onPosted={()=>{setNotice('刊登成功！你的服務已提交。');setPane('mine');void reloadDashboard();void load({keyword:'',city:''});}}/>}
    {inquiry&&<InquiryDialog service={inquiry} close={()=>setInquiry(null)} onSent={()=>{setNotice('詢價已送出，請到「我的訊息」追蹤進度。');void reloadDashboard();}}/>}
    {notice&&<div role="status" className="gh-toast"><Check size={18}/>{notice}<button onClick={()=>setNotice('')} aria-label="關閉訊息"><X size={16}/></button></div>}
    {authLoading&&<div className="gh-session-loading">載入會員資料中…</div>}
  </div>;
}
