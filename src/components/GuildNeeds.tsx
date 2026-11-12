import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,Check,MessageCircle,Plus,Send,ShieldAlert,X} from 'lucide-react';
import {useGuild} from './GuildProvider';
import {TAIWAN_CITIES} from '../lib/marketplace';
import {NEED_CATEGORIES,listPublishedNeeds,createNeedDraft,publishNeed,closeNeed,
 replyToNeed,listMyReplies,decideReply,reportNeed,listNeedMessages,sendNeedMessage,blockNeedChat,isNeedChatBlocked,type NeedChatMessage,type GuildNeed,type GuildNeedReply,type NeedKind} from '../lib/needs';
import './guild-needs.css';

type Language='zh'|'en';
const catName=(k:NeedKind,l:Language)=>{const c=NEED_CATEGORIES.find(c=>c.value===k);return l==='en'?(c?.en||k):(c?.zh||k);};
export default function GuildNeeds({lang,onLogin}:{lang:Language;onLogin:()=>void}){
 const t=(zh:string,en:string)=>lang==='en'?en:zh;
 const {user}=useGuild();
 const [items,setItems]=useState<GuildNeed[]>([]);
 const [replies,setReplies]=useState<GuildNeedReply[]>([]);
 const [kind,setKind]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [posting,setPosting]=useState(false);
 const [responding,setResponding]=useState<GuildNeed|null>(null);
 const [reporting,setReporting]=useState<GuildNeed|null>(null);
 const [pendingAction,setPendingAction]=useState<'post'|'reply'|null>(null);
 const [pendingReplyNeed,setPendingReplyNeed]=useState<GuildNeed|null>(null);
 const [startingKind]=useState<NeedKind>(()=>{
  const selected=new URLSearchParams(location.search).get('post_need');
  return NEED_CATEGORIES.find(c=>c.value===selected)?.value||'cooperation';
 });
 const [draftTitle,setDraftTitle]=useState(()=>{
  try{return (sessionStorage.getItem('guild-need-draft')||'').slice(0,140);}catch{return '';}
 });
 const [draftDesc,setDraftDesc]=useState(()=>{
  try{return (sessionStorage.getItem('guild-need-draft')||'').slice(0,1500);}catch{return '';}
 });
 const [formKind,setFormKind]=useState<NeedKind>(startingKind);
 const [city,setCity]=useState('線上服務');
 const [agreed,setAgreed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [replyMessage,setReplyMessage]=useState('');
 const [chatReply,setChatReply]=useState<GuildNeedReply|null>(null);
 const [chatMessages,setChatMessages]=useState<NeedChatMessage[]>([]);
 const [chatText,setChatText]=useState('');
 const [chatBlocked,setChatBlocked]=useState(false);

 const [reportReason,setReportReason]=useState('');
 const [myOpen,setMyOpen]=useState(false);
 const selected=useMemo(()=>items.filter(i=>!kind||i.kind===kind),[items,kind]);
 async function refresh(){
  setLoading(true);setError('');
  try{setItems(await listPublishedNeeds());}
  catch(e){setError(e instanceof Error?e.message:'Could not load');}
  finally{setLoading(false);}
 }
 async function refreshReplies(){if(!user){setReplies([]);return;}
  try{setReplies(await listMyReplies());}catch{/* read may be unavailable until migration is ready */}
 }
 useEffect(()=>{void refresh();},[]);
 useEffect(()=>{void refreshReplies();},[user?.id]);
 useEffect(()=>{
  if(user&&pendingAction==='post'){setPosting(true);setPendingAction(null);}
  if(user&&pendingAction==='reply'&&pendingReplyNeed){setResponding(pendingReplyNeed);setPendingAction(null);}
 },[user?.id,pendingAction,pendingReplyNeed]);
 function startPost(){if(!user){setPendingAction('post');onLogin();return;}setPosting(true);}
 function startReply(need:GuildNeed){
  if(!user){setPendingReplyNeed(need);setPendingAction('reply');onLogin();return;}
  setResponding(need);
 }
 async function submitPost(e:React.FormEvent){
  e.preventDefault();if(!user||!agreed||formKind==='dating')return;
  setBusy(true);setError('');
  try{
   const draft=await createNeedDraft(user.id,{kind:formKind,title:draftTitle.trim(),
     description:draftDesc.trim(),city});
   await publishNeed(draft.id);
   try{sessionStorage.removeItem('guild-need-draft');}catch{}
   setNotice(t('需求已公開刊登。','Your request is now public.'));
   setPosting(false);setAgreed(false);setDraftTitle('');setDraftDesc('');
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Publish failed');}
  finally{setBusy(false);}
 }
 async function submitReply(e:React.FormEvent){
  e.preventDefault();if(!user||!responding)return;setBusy(true);setError('');
  try{await replyToNeed(user.id,responding.id,replyMessage.trim());
   setResponding(null);setReplyMessage('');
   setNotice(t('已送出合作意願，只有你和需求本人能看見。','Interest sent. Only you and the requester can read it.'));
   await refreshReplies();
  }catch(e){setError(e instanceof Error?e.message:'Could not send');}
  finally{setBusy(false);}
 }
 async function resolve(reply:GuildNeedReply,choice:'accepted'|'declined'){
  setBusy(true);setError('');
  try{await decideReply(reply.id,choice);await refreshReplies();
   setNotice(t('已更新意願狀態。','Interest status updated.'));
  }catch(e){setError(e instanceof Error?e.message:'Could not update');}
  finally{setBusy(false);}
 }
 async function refreshChat(replyId:string){
  try{
   const [messages,blocked]=await Promise.all([listNeedMessages(replyId),isNeedChatBlocked(replyId)]);
   setChatMessages(messages);setChatBlocked(blocked);
  }catch(e){setError(e instanceof Error?e.message:'Could not load messages');}
 }
 function openChat(reply:GuildNeedReply){
  if(reply.status!=='accepted')return;
  setChatReply(reply);setChatText('');setChatMessages([]);setChatBlocked(false);
  void refreshChat(reply.id);
 }
 async function submitChat(e:React.FormEvent){
  e.preventDefault();if(!user||!chatReply||chatBlocked)return;setBusy(true);setError('');
  try{await sendNeedMessage(chatReply.id,user.id,chatText.trim());setChatText('');
   await refreshChat(chatReply.id);
  }catch(e){setError(e instanceof Error?e.message:'Could not send message');}
  finally{setBusy(false);}
 }
 async function stopChat(){
  if(!user||!chatReply)return;
  if(!window.confirm(t('封鎖後雙方都不能再傳新訊息，確定嗎？','Blocking prevents either side from sending more messages. Continue?')))return;
  setBusy(true);setError('');
  try{await blockNeedChat(chatReply.id,user.id);await refreshChat(chatReply.id);}
  catch(e){setError(e instanceof Error?e.message:'Could not block');}
  finally{setBusy(false);}
 }
 async function submitReport(e:React.FormEvent){
  e.preventDefault();if(!reporting||!user)return;setBusy(true);setError('');
  try{await reportNeed(reporting.id,user.id,reportReason.trim());
   setReporting(null);setReportReason('');
   setNotice(t('已收到檢舉，將待人工確認。','Report received for review.'));
  }catch(e){setError(e instanceof Error?e.message:'Could not report');}
  finally{setBusy(false);}
 }
 const matchesFor=(id:string)=>replies.filter(r=>r.need_id===id);
 return <section className="gn-section gh-container" aria-labelledby="gn-title">
  <div className="gn-top">
   <div><span className="gh-kicker">{t('公開需求 · 找到人與機會','COMMUNITY REQUESTS')}</span>
    <h2 id="gn-title">{t('大家正在尋找什麼？','What are people looking for?')}</h2>
    <p>{t('真實會員發布的需求。沒有虛構的工作、活動或人物。','Requests published by real members. No invented jobs, events or profiles.')}</p>
   </div>
   <div className="gn-top-actions"><button className="gn-post" type="button" onClick={startPost}><Plus size={18}/>{t('發布我的需求','Post my request')}</button>
    {user&&<button type="button" className="gn-inbox-toggle" onClick={()=>{setMyOpen(!myOpen);void refreshReplies();}}>{t('我的回覆','My responses')} ({replies.length})</button>}
   </div>
  </div>
  {notice&&<p className="gn-success" role="status"><Check size={16}/>{notice}<button onClick={()=>setNotice('')} aria-label="Close"><X size={14}/></button></p>}
  {error&&<p className="gn-error" role="alert">{error}</p>}
  {myOpen&&user&&<div className="gn-inbox"><h3>{t('需求與回覆進度','Requests and reply status')}</h3>
   {replies.length===0?<p>{t('目前沒有任何回覆。','No responses yet.')}</p>:replies.map(r=>{
    const need=items.find(n=>n.id===r.need_id);
    const own=need?.owner_id===user.id;
    return <div key={r.id} className="gn-reply-item">
     <strong>{need?.title||t('需求紀錄','Request')}</strong>
     <span>{t('狀態：','Status: ')}{r.status==='sent'?t('等待確認','Pending'):r.status==='accepted'?t('雙方已同意交流','Mutual interest'):t('已婉拒','Declined')}</span>
     <p>{r.message}</p>
     {r.status==='accepted'&&<button type="button" className="gn-outline" onClick={()=>openChat(r)}>{t('開啟雙方私訊','Open private chat')}</button>}
     {own&&r.status==='sent'&&<div className="gn-inline-actions">
      <button type="button" disabled={busy} onClick={()=>void resolve(r,'accepted')}>{t('願意交流','Interested')}</button>
      <button type="button" disabled={busy} onClick={()=>void resolve(r,'declined')}>{t('婉拒','Decline')}</button>
     </div>}
    </div>;
   })}
   <small>{t('目前先記錄雙方意願，私訊聊天室尚未開放。請勿公開個人電話或住址。','This currently records mutual interest. Private chat is not available yet.')}</small>
  </div>}
  <div className="gn-filters">
   <button type="button" className={!kind?'active':''} onClick={()=>setKind('')}>{t('全部需求','All')}</button>
   {NEED_CATEGORIES.map(c=><button key={c.value} type="button" className={kind===c.value?'active':''} onClick={()=>setKind(c.value)}>{t(c.zh,c.en)}</button>)}
  </div>
  {loading?<p className="gn-empty">{t('正在讀取需求…','Loading requests…')}</p>:
   selected.length===0?<div className="gn-empty"><MessageCircle size={31}/><h3>{t('目前還沒有公開需求','No public requests yet')}</h3>
    <p>{t('朋友測試版剛開始，歡迎成為第一個發布需求的人。','This beta is just getting started. Be the first to post a real request.')}</p>
    <button type="button" onClick={startPost}>{t('我要提出需求','Post a request')} <ArrowRight size={16}/></button>
   </div>:<div className="gn-grid">{selected.map(n=><article className="gn-card" key={n.id}>
    <span className="gn-type">{catName(n.kind,lang)}</span>
    <h3>{n.title}</h3><p className="gn-description">{n.description}</p>
    <div className="gn-meta">{n.city} · {new Date(n.created_at).toLocaleDateString(lang==='en'?'en-US':'zh-TW')}</div>
    <div className="gn-card-actions">{n.owner_id===user?.id?
     <button type="button" className="gn-outline" onClick={async()=>{if(!confirm(t('確定結束刊登？','Close this listing?')))return;try{await closeNeed(n.id);await refresh();}catch(e){setError(String(e));}}}>{t('結束刊登','Close listing')}</button>:
     <button type="button" className="gn-outline" onClick={()=>startReply(n)}>{t('我有興趣','I’m interested')} <ArrowRight size={15}/></button>}
     {user&&n.owner_id!==user.id&&<button className="gn-report" title={t('檢舉這項需求','Report request')} type="button" onClick={()=>setReporting(n)}><ShieldAlert size={17}/></button>}
    </div>
   </article>)}</div>}
  {posting&&<div className="gn-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPosting(false);}}>
   <div className="gn-modal" role="dialog" aria-modal="true" aria-label={t('公開發布需求','Post a request')}>
    <button className="gn-close" type="button" onClick={()=>setPosting(false)} aria-label="Close"><X size={21}/></button>
    <h2>{t('告訴大家你正在找什麼','What are you looking for?')}</h2>
    <p>{t('先寫清楚，再確認公開。任何文字都不會自行被 AI 發布。','Describe your need, then confirm. AI never publishes it without your approval.')}</p>
    <form className="gn-form" onSubmit={submitPost}>
     <label>{t('需求類型','Category')}<select value={formKind} onChange={e=>setFormKind(e.target.value as NeedKind)}>
      {NEED_CATEGORIES.map(c=><option key={c.value} value={c.value}>{t(c.zh,c.en)}</option>)}
     </select></label>
     <label>{t('一句話標題','One-line title')}<input required minLength={3} maxLength={140} value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder={t('例如：想找台北一起做網站的伙伴','e.g. Looking for a website project partner')}/></label>
     <label>{t('詳細說明','Details')}<textarea required minLength={6} maxLength={1500} rows={4} value={draftDesc} onChange={e=>setDraftDesc(e.target.value)} placeholder={t('描述需求、時間與你能提供的合作方式。','Describe the project, timing and what you can offer.')}/></label>
     <label>{t('地區','Location')}<select value={city} onChange={e=>setCity(e.target.value)}>{TAIWAN_CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
     <label className="gn-consent"><input type="checkbox" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>
      {t('我確認內容可以公開，不含電話、私人住址、Email 或私人照片。','I approve publishing this text and confirm it contains no personal contact details or private addresses.')}</label>
     <button className="gn-post" type="submit" disabled={busy||!agreed}>{busy?t('刊登中…','Publishing…'):t('確認公開刊登','Confirm and publish')}</button>
    </form>
   </div></div>}
  {responding&&<div className="gn-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setResponding(null);}}>
   <div className="gn-modal" role="dialog" aria-modal="true" aria-label={t('表達合作意願','Express interest')}>
    <button className="gn-close" type="button" onClick={()=>setResponding(null)} aria-label="Close"><X size={21}/></button>
    <h2>{t('我對這件事有興趣','I’m interested')}</h2><p>{responding.title}</p>
    <form className="gn-form" onSubmit={submitReply}>
     <label>{t('告訴對方為什麼想參與','Tell them why you would like to join')}
      <textarea required minLength={6} maxLength={1200} rows={4} value={replyMessage} onChange={e=>setReplyMessage(e.target.value)} placeholder={t('簡單介紹自己與想一起做的事（不需填電話）','Introduce yourself and what you hope to do (no phone number needed)')}/></label>
     <button type="submit" className="gn-post" disabled={busy}>{t('送出意願','Send interest')} <Send size={16}/></button>
    </form>
   </div></div>}
  {chatReply&&<div className="gn-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setChatReply(null);}}>
   <div className="gn-modal" role="dialog" aria-modal="true" aria-label={t('雙方私訊','Private chat')}>
    <button className="gn-close" type="button" aria-label="Close" onClick={()=>setChatReply(null)}><X size={21}/></button>
    <h2>{t('雙方私訊','Private chat')}</h2>
    <p>{t('只有已互相同意的兩位會員能看見。','Only the two members who agreed can view this conversation.')}</p>
    <div className="gn-chat-messages" aria-live="polite">
     {chatMessages.length===0?<p>{t('目前還沒有訊息。','No messages yet.')}</p>:
      chatMessages.map(m=><div key={m.id} className={'gn-chat-line '+(m.sender_id===user?.id?'gn-chat-mine':'')}>
       <small>{m.sender_id===user?.id?t('我','Me'):t('對方','Other member')}</small>
       <p>{m.content}</p>
      </div>)}
    </div>
    {chatBlocked?<p className="gn-error">{t('這個對話已封鎖，無法再傳訊息。','This conversation is blocked. New messages are disabled.')}</p>:
    <form className="gn-form" onSubmit={submitChat}>
     <label>{t('輸入私人訊息','Private message')}
      <textarea required minLength={1} maxLength={1500} rows={3} value={chatText} onChange={e=>setChatText(e.target.value)} placeholder={t('請尊重對方意願，不要分享不必要的個資','Be respectful. Avoid unnecessary personal information.')}/></label>
     <button type="submit" className="gn-post" disabled={busy}>{t('傳送訊息','Send message')} <Send size={16}/></button>
    </form>}
    <div className="gn-chat-actions">
     <button type="button" className="gn-outline" onClick={()=>void refreshChat(chatReply.id)}>{t('重新整理訊息','Refresh messages')}</button>
     {!chatBlocked&&<button type="button" className="gn-chat-block" disabled={busy} onClick={()=>void stopChat()}>{t('封鎖對話','Block conversation')}</button>}
    </div>
   </div></div>}
  {reporting&&<div className="gn-overlay"><div className="gn-modal" role="dialog" aria-modal="true" aria-label="Report">
   <button className="gn-close" type="button" onClick={()=>setReporting(null)} aria-label="Close"><X size={21}/></button>
   <h2>{t('檢舉不適當內容','Report inappropriate content')}</h2>
   <form className="gn-form" onSubmit={submitReport}><label>{t('原因','Reason')}
    <textarea required minLength={5} maxLength={300} rows={3} value={reportReason} onChange={e=>setReportReason(e.target.value)}/></label>
    <button type="submit" className="gn-post" disabled={busy}>{t('送出檢舉','Send report')}</button>
   </form>
  </div></div>}
 </section>;
}
