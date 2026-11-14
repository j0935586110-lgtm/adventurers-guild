import {useCallback, useEffect, useMemo, useState} from 'react';
import {ArrowRight, BriefcaseBusiness, CheckCircle2, ClipboardList, RefreshCw, Send, ShieldCheck} from 'lucide-react';
import {useGuild} from './GuildProvider';
import {listIncomingInquiries,listOutgoingInquiries,listMyServices,quoteInquiry,type GuildService,type InquiryWithService} from '../lib/marketplace';
import {decideReply,listMyReplies,type GuildNeedReply} from '../lib/needs';
import './guild-workdesk.css';

type QuestLite={id:string;title:string;status:string;client_id:string;adventurer_id:string|null;reward_g_coin:number;created_at:string};
type NeedLite={id:string;owner_id:string;title:string;kind:string;status:string;created_at:string};
type Group='waiting'|'active'|'done';
type Entry={id:string;title:string;meta:string;detail:string;group:Group;type:'need'|'quest'|'inquiry-in'|'inquiry-out'|'reply'|'service';record?:GuildNeedReply|InquiryWithService};
type Props={quests:QuestLite[];needs:NeedLite[]};
function cls(status:string):Group{
  if(['verified','completed','closed','declined','canceled','expired'].includes(status))return 'done';
  return 'active';
}
function stateLabel(s:string){return ({posted:'招募中',accepted:'進行中',submitted:'待驗收',verified:'已驗收',disputed:'爭議處理中',canceled:'已取消',expired:'已過期',draft:'私人草稿',published:'已發布',closed:'已關閉',requested:'等待服務者報價',quoted:'已報價',completed:'已標記完成',sent:'等待回覆',declined:'未接受'} as Record<string,string>)[s]||s;}
export default function GuildWorkDesk({quests,needs}:Props){
  const {user}=useGuild();
  const [group,setGroup]=useState<Group>('waiting');
  const [incoming,setIncoming]=useState<InquiryWithService[]>([]);
  const [outgoing,setOutgoing]=useState<InquiryWithService[]>([]);
  const [services,setServices]=useState<GuildService[]>([]);
  const [replies,setReplies]=useState<GuildNeedReply[]>([]);
  const [errors,setErrors]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [nonce,setNonce]=useState(0);
  const [quoteId,setQuoteId]=useState<string|null>(null);
  const [quoteValue,setQuoteValue]=useState('');
  const [actionBusy,setActionBusy]=useState(false);
  const [actionError,setActionError]=useState('');
  const refresh=useCallback(()=>setNonce(x=>x+1),[]);
  useEffect(()=>{
    if(!user){setLoading(false);setIncoming([]);setOutgoing([]);setReplies([]);setServices([]);return;}
    let active=true;setLoading(true);setErrors([]);
    void Promise.allSettled([listIncomingInquiries(user.id),listOutgoingInquiries(user.id),listMyReplies(),listMyServices(user.id)]).then(results=>{
      if(!active)return;
      const labels=['收到的服務詢價','送出的服務詢價','需求合作回覆','已刊登服務'];
      const failures:string[]=[];
      results.forEach((r,i)=>{if(r.status==='rejected')failures.push(labels[i]+'暫時無法讀取');});
      if(results[0].status==='fulfilled')setIncoming(results[0].value);else setIncoming([]);
      if(results[1].status==='fulfilled')setOutgoing(results[1].value);else setOutgoing([]);
      if(results[2].status==='fulfilled')setReplies(results[2].value.filter(r=>r.sender_id===user.id||needs.some(n=>n.id===r.need_id)));else setReplies([]);
      if(results[3].status==='fulfilled')setServices(results[3].value);else setServices([]);
      setErrors(failures);setLoading(false);
    });
    return ()=>{active=false;};
  },[user?.id,nonce,needs]);
  const items=useMemo(()=>{
    const out:Entry[]=[];
    for(const q of quests){
      if(q.client_id==='a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')continue;
      const g=q.status==='submitted'&&q.client_id===user?.id?'waiting':cls(q.status);
      out.push({id:q.id,title:q.title,meta:'任務 · '+stateLabel(q.status),detail:q.adventurer_id===user?.id?'我承接的任務':'我發布的任務',group:g,type:'quest'});
    }
    for(const n of needs)out.push({id:n.id,title:n.title,meta:'需求 · '+stateLabel(n.status),detail:n.status==='draft'?'只有自己看得到，尚未公開':'已建立的會員需求',group:n.status==='draft'?'waiting':cls(n.status),type:'need'});
    for(const i of incoming)out.push({id:i.id,title:i.service?.title||'服務詢價',meta:'收到詢價 · '+stateLabel(i.status),detail:i.message,group:i.status==='requested'?'waiting':cls(i.status),type:'inquiry-in',record:i});
    for(const i of outgoing)out.push({id:i.id,title:i.service?.title||'我的詢價',meta:'我送出的詢價 · '+stateLabel(i.status),detail:i.message,group:i.status==='quoted'?'waiting':cls(i.status),type:'inquiry-out',record:i});
    for(const r of replies){const ownNeed=needs.find(n=>n.id===r.need_id);const inbound=!!ownNeed;
      out.push({id:r.id,title:ownNeed?.title||(r.sender_id===user?.id?'我送出的合作意願':'需求合作回覆'),meta:(inbound?'收到的合作意願':'我的合作意願')+' · '+stateLabel(r.status),detail:r.message,group:r.status==='sent'&&inbound?'waiting':cls(r.status),type:'reply',record:r});
    }
    for(const s of services)out.push({id:s.id,title:s.title,meta:'我上架的服務 · '+stateLabel(s.status),detail:s.description,group:s.status==='draft'?'waiting':'active',type:'service'});
    return out;
  },[quests,needs,incoming,outgoing,replies,services,user?.id]);
  async function doQuote(id:string){
    const amount=Number(quoteValue);
    if(!Number.isSafeInteger(amount)||amount<=0){setActionError('報價金額必須是大於零的新台幣整數。');return;}
    if(!window.confirm('確認向這位詢價者提出 NT$ '+amount.toLocaleString()+' 報價？'))return;
    setActionBusy(true);setActionError('');
    try{await quoteInquiry(id,amount);setQuoteId(null);setQuoteValue('');refresh();}
    catch(e){setActionError(e instanceof Error?e.message:String(e));}
    finally{setActionBusy(false);}
  }
  async function doDecide(id:string,status:'accepted'|'declined'){
    if(!window.confirm(status==='accepted'?'確認接受這則合作意願？':'確認婉拒這則合作意願？'))return;
    setActionBusy(true);setActionError('');
    try{await decideReply(id,status);refresh();}
    catch(e){setActionError(e instanceof Error?e.message:String(e));}
    finally{setActionBusy(false);}
  }
  const shown=items.filter(x=>x.group===group);
  const groups:[Group,string][]=[['waiting','待我處理'],['active','進行中'],['done','已完成／關閉']];
  return <section className="gd-wrap" aria-label="我的任務工作台">
    <div className="gd-head"><div><h2><ClipboardList size={23}/> 我的工作台</h2><p>同一個帳號管理發布的需求、提供的服務、收到的詢價與自己的合作紀錄。只讀取本人有權查看的資料。</p></div><button type="button" className="gd-refresh" onClick={refresh} disabled={loading||actionBusy}><RefreshCw size={16}/>重新整理</button></div>
    <div className="gd-status" role="group" aria-label="任務處理狀態">{groups.map(([id,label])=><button key={id} type="button" className={group===id?'active':''} aria-pressed={group===id} onClick={()=>setGroup(id)}><span>{label}</span><strong>{items.filter(x=>x.group===id).length}</strong></button>)}</div>
    {errors.length>0&&<p role="alert" className="gd-error">{errors.join('、')}。以下資料可能不完整，請重試。</p>}
    {actionError&&<p role="alert" className="gd-error">{actionError}</p>}
    {loading?<p className="gd-empty" role="status">正在讀取你的真實任務、詢價與合作紀錄…</p>:shown.length===0?<div className="gd-empty"><ShieldCheck size={27}/><strong>{errors.length?'沒有足夠資料顯示這個狀態':'目前沒有這個狀態的紀錄'}</strong><p>沒有資料就保持空白，不顯示測試案件或虛構進度。</p><a href="/">前往公會探索或發布 <ArrowRight size={15}/></a></div>:<div className="gd-cards">{shown.map(x=><article className="gd-card" key={x.type+x.id}><span className="gd-meta">{x.meta}</span><h3>{x.title}</h3><p>{x.detail}</p>
      {x.type==='inquiry-in'&&x.record&&'status'in x.record&&x.record.status==='requested'&&<div className="gd-card-actions">{quoteId===x.id?<><label>報價（NT$）<input type="number" min="1" step="1" inputMode="numeric" value={quoteValue} onChange={e=>setQuoteValue(e.target.value)} placeholder="輸入新台幣整數"/></label><button disabled={actionBusy} type="button" onClick={()=>void doQuote(x.id)}>確認送出報價</button><button type="button" onClick={()=>setQuoteId(null)}>取消</button></>:<button type="button" onClick={()=>{setQuoteId(x.id);setQuoteValue('');setActionError('')}}>提出報價 <Send size={14}/></button>}</div>}
      {x.type==='reply'&&x.record&&'sender_id'in x.record&&x.record.status==='sent'&&x.record.sender_id!==user?.id&&<div className="gd-card-actions"><button disabled={actionBusy} type="button" onClick={()=>void doDecide(x.id,'accepted')}>接受合作</button><button disabled={actionBusy} type="button" onClick={()=>void doDecide(x.id,'declined')}>婉拒</button></div>}
      </article>)}</div>}
    <p className="gd-footnote"><CheckCircle2 size={15}/>這裡的「已完成」只代表既有資料狀態，不能當作已收款或實際交付驗收的保證。</p>
    <div className="gd-extra"><a href="/earn#publish-service"><BriefcaseBusiness size={17}/>上架我的服務</a><a href="/me?tab=explore">探索公開任務 <ArrowRight size={15}/></a></div>
  </section>;
}
