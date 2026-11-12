import React, {useEffect, useRef, useState} from 'react';
import {ArrowRight, Bot, BriefcaseBusiness, CheckCircle2, ChevronDown, Compass, Github, LogIn, Menu, MessageCircle, Send, ShieldCheck, Sparkles, UserRound, X, Swords, ScrollText, ChevronRight} from 'lucide-react';
import {useGuild} from './GuildProvider';
import {AuthLanguageContext, GuildAuthDialog} from './GuildAuthDialog';
import {listPublishedNeeds, createNeedDraft, publishNeed, replyToNeed, type GuildNeed, type NeedKind} from '../lib/needs';
import {searchServices, type GuildService} from '../lib/marketplace';
import {supabase} from '../lib/supabase';
import './guild-chat-home.css';

type Lang='zh'|'en';
type Quest={id:string;title:string;reward_g_coin:number;status:string;created_at:string};
type Topic={tid:number;title:string;user?:{username?:string}};
type Result={kind:'need';item:GuildNeed}|{kind:'service';item:GuildService}|{kind:'quest';item:Quest}|{kind:'topic';item:Topic};
type Entry={id:string;role:'user'|'guild';text:string;results?:Result[];empty?:boolean;needKind?:NeedKind;showDraft?:boolean;type?:'note'|'error'};
const kinds:NeedKind[]=['cooperation','support','resources','events','jobs','hiring','clubs','friends','sports','dating'];
function classify(input:string):{type:'needs'|'quests'|'forum';kind:NeedKind} {
  const s=input.toLowerCase();
  if(/約會|交往|戀愛|男朋友|女朋友|dating|romance/.test(s))return {type:'needs',kind:'dating'};
  if(/論壇|討論區|文章|貼文|community|forum/.test(s))return {type:'forum',kind:'resources'};
  if(/任務|懸賞|報酬|賞金|quests?|bounty|reward/.test(s))return {type:'quests',kind:'cooperation'};
  if(/運動|健身|登山|爬山|跑步|單車|sports|gym|hiking/.test(s))return {type:'needs',kind:'sports'};
  if(/社團|俱樂部|club|group/.test(s))return {type:'needs',kind:'clubs'};
  if(/玩伴|朋友|揪團|friend|buddy/.test(s))return {type:'needs',kind:'friends'};
  if(/徵才|招募|找員工|雇用|找人才|招聘|hiring|hire|recruit/.test(s))return {type:'needs',kind:'hiring'};
  if(/求職|找工作|應徵|接案|兼職|找案子|job|freelance|work/.test(s))return {type:'needs',kind:'jobs'};
  if(/講座|活動|聚會|meetup|conference|event/.test(s))return {type:'needs',kind:'events'};
  if(/資源|工具|教材|教學|資金|resource|tool/.test(s))return {type:'needs',kind:'resources'};
  if(/幫忙|支援|修理|求助|support|help/.test(s))return {type:'needs',kind:'support'};
  return {type:'needs',kind:'cooperation'};
}
const key=()=>crypto.randomUUID();
function short(v:string,n=280){return v.length>n?v.slice(0,n)+'…':v;}
export default function GuildChatHome(){
  const {user,signOut}=useGuild();
  const [lang,setLang]=useState<Lang>(()=>new URLSearchParams(location.search).get('lang')==='en'?'en':'zh');
  const [auth,setAuth]=useState(()=>new URLSearchParams(location.search).get('auth')==='1');
  const [menu,setMenu]=useState(false);
  const [boardOpen,setBoardOpen]=useState(false);
  const [boardTasks,setBoardTasks]=useState<Quest[]>([]);
  const [boardCount,setBoardCount]=useState(0);
  const [boardBusy,setBoardBusy]=useState(true);
  const [boardError,setBoardError]=useState('');
  useEffect(()=>{
    let active=true;
    void supabase.from('quests').select('id,title,reward_g_coin,status,created_at',{count:'exact'})
      .eq('status','posted').order('created_at',{ascending:false}).limit(3)
      .then(({data,error,count})=>{
        if(!active)return;
        if(error){setBoardError(error.message);setBoardTasks([]);}
        else {setBoardError('');setBoardTasks((data||[]) as Quest[]);setBoardCount(count??(data||[]).length);}
        setBoardBusy(false);
      });
    return ()=>{active=false;};
  },[]);

  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [thread,setThread]=useState<Entry[]>([]);
  const [draftFrom,setDraftFrom]=useState<Entry|null>(null);
  const [draftTitle,setDraftTitle]=useState('');
  const [draftDescription,setDraftDescription]=useState('');
  const [draftCity,setDraftCity]=useState('線上服務');
  const [draftId,setDraftId]=useState<string|null>(null);
  const [draftConsent,setDraftConsent]=useState(false);
  const [draftBusy,setDraftBusy]=useState(false);
  const [draftError,setDraftError]=useState('');
  const [replyTo,setReplyTo]=useState<GuildNeed|null>(null);
  const [replyText,setReplyText]=useState('');
  const [replyBusy,setReplyBusy]=useState(false);
  const scrollEnd=useRef<HTMLDivElement>(null);
  const t=(zh:string,en:string)=>lang==='en'?en:zh;
  useEffect(()=>{document.documentElement.lang=lang==='en'?'en':'zh-TW';},[lang]);
  useEffect(()=>{if(user&&auth)setAuth(false);},[user?.id,auth]);
  useEffect(()=>{if(thread.length)scrollEnd.current?.scrollIntoView({behavior:'smooth',block:'end'});},[thread.length,busy]);

  async function search(request:string){
    const raw=request.trim().slice(0,300);if(!raw||busy)return;
    setInput('');setBusy(true);
    setThread(a=>[...a,{id:key(),role:'user',text:raw}]);
    const filter=classify(raw);const newEntry:Entry={id:key(),role:'guild',text:'',results:[],needKind:filter.kind};
    try{
      if(filter.kind==='dating'){
        newEntry.text=t('約會媒合尚未開放：目前缺乏成年驗證、雙方同意與安全機制，因此不搜尋或公開個人約會資料。','Dating matching is unavailable until adult verification, mutual consent and safety measures are ready.');
        newEntry.type='note';
      }else if(filter.type==='forum'){
        const r=await fetch('/api/community?view=recent');
        if(!r.ok)throw Error(t('論壇暫時無法讀取。','Forum is temporarily unavailable.'));
        const d=await r.json();const topics:(Topic[])=(d.topics||[]).slice(0,15);
        newEntry.results=topics.slice(0,6).map(item=>({kind:'topic',item}));
        newEntry.text=newEntry.results.length?t('以下是論壇目前真正公開的最新文章。','These are the latest public forum discussions.'):t('論壇目前沒有公開文章。','No public forum posts found.');
      }else if(filter.type==='quests'){
        const {data,error}=await supabase.from('quests')
          .select('id,title,reward_g_coin,status,created_at').eq('status','posted')
          .order('created_at',{ascending:false}).limit(8);
        if(error)throw error;
        newEntry.results=(data||[]).map(item=>({kind:'quest',item}));
        newEntry.text=newEntry.results.length?t('找到目前可公開瀏覽的公會任務。','These are currently available guild quests.'):t('目前公會內沒有公開招募中的任務。','No open quests are currently listed in the guild.');
      }else{
        const target:NeedKind=filter.kind==='jobs'?'hiring':filter.kind==='hiring'?'jobs':filter.kind;
        const needs=await listPublishedNeeds({kind:target});
        // Match a relevant category first; never present all providers as a precise match.
        let services:GuildService[]=[];
        if(['cooperation','support','jobs','hiring'].includes(filter.kind)){
          const hints=raw.match(/網站|設計|攝影|剪輯|維修|家教|翻譯|程式|App|AI|logo/i);
          if(hints) services=await searchServices({keyword:hints[0]});
        }
        newEntry.results=[
          ...needs.slice(0,7).map(item=>({kind:'need' as const,item})),
          ...services.slice(0,4).map(item=>({kind:'service' as const,item}))
        ];
        newEntry.text=newEntry.results.length
          ? t('找到以下公會會員已公開的資料。請自行核對條件，這不代表身分或合作已驗證。','These are real member-published listings. Verify details independently; these are not verified matches.')
          : t('目前公會內沒有找到這類公開需求。這不是全網搜尋結果。你可以整理私人草稿，確認後再決定是否刊登。','No matching public member requests were found inside the guild. This is not a web-wide search. You can prepare a private draft and decide whether to publish.');
        newEntry.showDraft=!newEntry.results.length;
      }
    }catch(e){newEntry.text=t('搜尋失敗，請稍後重試：','Search failed: ')+(e instanceof Error?e.message:String(e));newEntry.type='error';}
    finally{setThread(a=>[...a,newEntry]);setBusy(false);}
  }
  function startDraft(entry:Entry){
    if(!user){setAuth(true);}
    setDraftFrom(entry);setDraftTitle(thread.slice().reverse().find(x=>x.role==='user')?.text.slice(0,140)||'');
    const raw=thread.slice().reverse().find(x=>x.role==='user')?.text||'';
    setDraftDescription(raw.length>=6?raw:raw+'，希望找到可以合作的對象');
    setDraftCity('線上服務');setDraftId(null);setDraftConsent(false);setDraftError('');
  }
  async function saveDraft(){
    if(!user){setAuth(true);return;}
    if(!draftFrom||!draftTitle.trim()||draftDescription.trim().length<6)return;
    const kind=draftFrom.needKind||'cooperation';
    if(!kinds.includes(kind)||kind==='dating')return;
    setDraftBusy(true);setDraftError('');
    try{
      const d=await createNeedDraft(user.id,{kind,title:draftTitle.trim().slice(0,140),description:draftDescription.trim().slice(0,1500),city:draftCity.trim()||'線上服務'});
      setDraftId(d.id);setThread(a=>[...a,{id:key(),role:'guild',text:t('私人草稿已儲存，尚未對外公開。','Your private draft is saved and not published.'),type:'note'}]);
    }catch(e){setDraftError(e instanceof Error?e.message:String(e));}
    finally{setDraftBusy(false);}
  }
  async function doPublish(){
    if(!user){setAuth(true);return;}
    if(!draftId||!draftConsent)return;
    setDraftBusy(true);setDraftError('');
    try{
      await publishNeed(draftId);
      setThread(a=>[...a,{id:key(),role:'guild',text:t('這則需求已依你的確認公開刊登，可由其他公會會員搜尋。','Your approved request has been published and can be discovered by other guild members.'),type:'note'}]);
      setDraftFrom(null);setDraftId(null);setDraftConsent(false);
    }catch(e){setDraftError(e instanceof Error?e.message:String(e));}
    finally{setDraftBusy(false);}
  }
  async function sendReply(){
    if(!user){setAuth(true);return;}
    if(!replyTo||replyText.trim().length<6)return;
    setReplyBusy(true);
    try{
      await replyToNeed(user.id,replyTo.id,replyText.trim().slice(0,1200));
      setThread(a=>[...a,{id:key(),role:'guild',text:t('已送出你的合作意願給需求發布者。','Your message has been sent to the request owner.'),type:'note'}]);setReplyTo(null);setReplyText('');
    }catch(e){setThread(a=>[...a,{id:key(),role:'guild',text:e instanceof Error?e.message:String(e),type:'error'}]);}
    finally{setReplyBusy(false);}
  }
  const starter=['我想找一起創業的夥伴','我想找工作','我想看看有報酬的任務'];
  return <AuthLanguageContext.Provider value={lang}><div className="ch-site">
    <header className="ch-header">
      <a className="ch-brand" href="/" aria-label={t('冒險者公會首頁','Guild home')}><span className="ch-mark"><Swords size={22} strokeWidth={1.9}/></span><span>{t('冒險者公會','Adventurers Guild')}</span></a>
      <nav className={'ch-nav '+(menu?'ch-nav-open':'')} aria-label={t('網站選單','Site navigation')}>
        <button type="button" className="ch-nav-board" onClick={()=>{setBoardOpen(!boardOpen);setMenu(false)}}>{t('任務布告欄','Quest board')}</button>
        <a href="/community">{t('論壇','Forum')}</a><a href="/me">{t('我的任務','My quests')}</a><a href="/ai">AI / MCP</a>
      </nav>
      <div className="ch-actions">
        {!user?<button className="ch-login" type="button" onClick={()=>setAuth(true)}>{t('登入／註冊','Sign in')}</button>
          :<a className="ch-login" href="/me"><UserRound size={16}/>{t('我的會員','Account')}</a>}
        <button className="ch-language" type="button" onClick={()=>setLang(lang==='zh'?'en':'zh')}>{lang==='zh'?'EN':'中文'}</button>
        <button className="ch-menu" type="button" aria-expanded={menu} aria-label={t('開啟選單','Open menu')} onClick={()=>setMenu(!menu)}>{menu?<X size={22}/>:<Menu size={22}/>}</button>
      </div>
    </header>
    <section className="ch-guild-gate" aria-label={t('冒險者公會大廳','Adventurers Guild hall')}>
      <div className="ch-gate-medallion" aria-hidden="true"><Swords size={28} strokeWidth={1.7}/></div>
      <div className="ch-gate-text">
        <small>THE ADVENTURERS GUILD</small>
        <strong>{t('冒險者公會','Adventurers Guild')}</strong>
        <span>{t('帶著目標而來，找到並肩完成任務的夥伴。','Come with a quest. Find allies to complete it.')}</span>
      </div>
      <div className="ch-gate-actions">
        <button type="button" className="ch-board-button" onClick={()=>setBoardOpen(!boardOpen)} aria-expanded={boardOpen} aria-controls="guild-quest-board">
          <ScrollText size={18}/>
          <span>{t('任務布告欄','Quest board')}</span>
          <small>{boardBusy?t('載入中','Loading'):boardError?t('暫不可用','Unavailable'):t(boardCount+' 件招募中',boardCount+' open')}</small>
          <ChevronDown size={16}/>
        </button>
      </div>
    </section>
    {boardOpen && <section className="ch-board-panel" id="guild-quest-board" aria-label={t('公開任務布告','Open quest postings')}>
      <div className="ch-board-head"><strong>{t('公會任務布告','Guild quest postings')}</strong><a href="/me?tab=explore">{t('查看全部','See all')} <ArrowRight size={15}/></a></div>
      {boardBusy ? <p>{t('正在查詢真正公開的任務…','Loading published quests…')}</p>
        : boardError ? <p role="alert">{t('任務資料暫時無法讀取。','Quest data is temporarily unavailable.')}</p>
        : boardTasks.length ? <div className="ch-board-items">{boardTasks.map(q=><a key={q.id} href="/me?tab=explore" className="ch-board-item"><ScrollText size={17}/><span>{q.title}</span><small>{Number(q.reward_g_coin).toLocaleString()} G</small><ChevronRight size={16}/></a>)}</div>
        : <p>{t('目前尚無公開招募任務。布告欄會在新任務發布後更新。','No public quests are open yet. New postings will appear here.')}</p>}
    </section>}
    <main className={'ch-main '+(thread.length?'ch-in-conversation':'')}>
      <div className="ch-center">
        {!thread.length&&<section className="ch-greeting">
          <div className="ch-avatar"><Sparkles size={23}/></div>
          <h1>{t('你想找什麼？','What are you looking for?')}</h1>
          <p>{t('找人、找工作、找任務、找活動。一句話告訴公會。','Find people, work, quests and events. Start with one sentence.')}</p>
          <a className="ch-greeting-agent" href="/connect"><Bot size={15}/>{t('想用自己的 GPT、Gemini、Claude 或 OpenCode？','Using your own GPT, Gemini, Claude or OpenCode?')} <ArrowRight size={14}/></a>
        </section>}
        {!!thread.length&&<section className="ch-thread" role="log" aria-label={t('公會搜尋對話','Guild search conversation')}>
          {thread.map(entry=><article key={entry.id} className={'ch-message '+(entry.role==='user'?'ch-me':'ch-guild')}>
            {entry.role==='guild'&&<span className="ch-small-mark"><Sparkles size={16}/></span>}
            <div className="ch-bubble">
              <p>{entry.text}</p>
              {entry.results?.length? <div className="ch-results">
                {entry.results.map((result,index)=><div className="ch-result" key={result.kind+index}>
                  {result.kind==='need'&&<><strong>{result.item.title}</strong><small>{result.item.city} · {result.item.kind}</small><p>{short(result.item.description,180)}</p><button type="button" onClick={()=>{setReplyTo(result.item);setReplyText('');if(!user)setAuth(true);}}>{t('表達合作意願','Contact owner')} <ArrowRight size={14}/></button></>}
                  {result.kind==='service'&&<><strong>{result.item.title}</strong><small>{result.item.business_name} · {result.item.city}</small><p>{short(result.item.description,160)}</p><small>{t('此服務來自公會公開資料；聯絡功能尚未接上對話視窗。','This public service is real; in-chat inquiry is not yet available.')}</small></>}
                  {result.kind==='quest'&&<><strong>{result.item.title}</strong><small>{Number(result.item.reward_g_coin).toLocaleString()} G · {t('招募中','Open')}</small><a href="/me?tab=explore">{t('查看任務','View quest')} <ArrowRight size={14}/></a></>}
                  {result.kind==='topic'&&<><strong>{result.item.title}</strong><small>{result.item.user?.username||t('會員','Member')}</small><a href={'/community/topic/'+result.item.tid}>{t('在公會內閱讀','Read inside guild')} <ArrowRight size={14}/></a></>}
                </div>)}
              </div>:null}
              {entry.showDraft&&<button type="button" className="ch-text-action" onClick={()=>startDraft(entry)}>{t('整理一份私人需求草稿','Prepare private request draft')} <ArrowRight size={15}/></button>}
            </div>
          </article>)}
          {busy&&<div className="ch-thinking"><Sparkles size={17}/>{t('正在查詢公會公開資料…','Searching public guild records…')}</div>}
          <div ref={scrollEnd}/>
        </section>}
        {draftFrom&&<section className="ch-draft" aria-label={t('私人草稿','Private draft')}>
          <div className="ch-draft-heading"><h2>{t('需求草稿','Request draft')}</h2><button type="button" aria-label={t('關閉草稿','Close draft')} onClick={()=>{setDraftFrom(null);setDraftId(null)}}><X size={18}/></button></div>
          <p>{t('僅在你按下公開確認後，其他人才看得到。','Nobody else can see this until you explicitly publish it.')}</p>
          <label>{t('標題','Title')}<input maxLength={140} disabled={!!draftId} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)}/></label>
          <label>{t('說明','Description')}<textarea rows={3} maxLength={1500} disabled={!!draftId} value={draftDescription} onChange={e=>setDraftDescription(e.target.value)}/></label>
          <label>{t('地區','Location')}<input maxLength={80} disabled={!!draftId} value={draftCity} onChange={e=>setDraftCity(e.target.value)}/></label>
          {draftError&&<p className="ch-error" role="alert">{draftError}</p>}
          {!draftId?<button className="ch-submit-draft" type="button" disabled={draftBusy||!draftTitle.trim()||draftDescription.trim().length<6} onClick={()=>void saveDraft()}>{t('儲存私人草稿','Save private draft')}</button>
            :<><div className="ch-saved"><CheckCircle2 size={17}/>{t('已儲存，尚未公開','Saved privately — not published')}</div><label className="ch-consent"><input type="checkbox" checked={draftConsent} onChange={e=>setDraftConsent(e.target.checked)}/>{t('我確認上方文字可公開，且不包含私人聯絡資訊。','I approve this public text and confirm it contains no private contact details.')}</label><button className="ch-submit-draft" type="button" disabled={!draftConsent||draftBusy} onClick={()=>void doPublish()}>{t('確認公開刊登','Confirm publishing')}</button></>}
        </section>}
        {replyTo&&<section className="ch-draft">
          <div className="ch-draft-heading"><h2>{t('傳送合作意願','Contact request owner')}</h2><button type="button" onClick={()=>setReplyTo(null)}><X size={18}/></button></div>
          <p>{replyTo.title}</p><textarea rows={3} value={replyText} maxLength={1200} onChange={e=>setReplyText(e.target.value)} placeholder={t('簡單說明你的專長與合作意願','Describe your relevant experience')}/>
          <button className="ch-submit-draft" type="button" disabled={replyBusy||replyText.trim().length<6} onClick={()=>void sendReply()}>{t('確認送出','Confirm send')}</button>
        </section>}
        <div className="ch-compose-area">
          <form className="ch-composer" onSubmit={e=>{e.preventDefault();void search(input)}}>
            <textarea aria-label={t('輸入你想找的人、事或機會','Describe what you need')} value={input} onChange={e=>setInput(e.target.value.slice(0,300))} maxLength={300} rows={2} placeholder={t('我想找……','I’m looking for…')} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void search(input)}}}/>
            <button type="submit" aria-label={t('送出','Send')} disabled={busy||!input.trim()}><ArrowRight size={22}/></button>
          </form>
          {!thread.length&&<div className="ch-starters">{starter.map((s,i)=><button key={s} type="button" onClick={()=>void search(s)}>{lang==='en'?['Find a cofounder','Find a job','Browse rewarded quests'][i]:s}</button>)}</div>}
          <p className="ch-footnote">{t('目前查詢公會公開資料，不會自動公開你輸入的內容。','Searches public guild records; your message is never automatically published.')}</p>
        </div>
      </div>
    </main>
    <footer className="ch-footer"><a href="/community">{t('論壇','Community')}</a><a href="/me">{t('會員中心','My profile')}</a><a href="/ai">MCP</a><span>{t('沒有真實資料就不顯示結果','No fabricated listings')}</span></footer>
    {auth&&<GuildAuthDialog onClose={()=>setAuth(false)}/>}
  </div></AuthLanguageContext.Provider>;
}
