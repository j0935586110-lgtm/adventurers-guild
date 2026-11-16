import {useCallback, useEffect, useState} from 'react';
import {ArrowRight, BriefcaseBusiness, Handshake, RefreshCw, ScrollText, Store} from 'lucide-react';
import {listPublishedNeeds, NEED_CATEGORIES, type GuildNeed} from '../lib/needs';
import {searchServices, type GuildService} from '../lib/marketplace';
import './guild-bulletin.css';

type Section = 'needs' | 'services' | 'jobs';
type Props = { onReply: (need: GuildNeed)=>void; onInquiry: (service:GuildService)=>void; onPublish:()=>void; isSignedIn:boolean };
const labelKind = (kind:string)=>NEED_CATEGORIES.find(x=>x.value===kind)?.zh || '公開需求';
export default function GuildBulletin({onReply,onInquiry,onPublish,isSignedIn}:Props){
  const [section,setSection] = useState<Section>('needs');
  const [needs,setNeeds] = useState<GuildNeed[]>([]);
  const [services,setServices] = useState<GuildService[]>([]);
  const [loading,setLoading] = useState(true);
  const [issues,setIssues] = useState<string[]>([]);
  const [reloadKey,setReloadKey]=useState(0);
  const reload=useCallback(()=>setReloadKey(v=>v+1),[]);
  useEffect(()=>{
    let active=true;setLoading(true);setIssues([]);
    void Promise.allSettled([listPublishedNeeds(),searchServices({})]).then(([n,s])=>{
      if(!active)return;
      const errors:string[]=[];
      if(n.status==='fulfilled')setNeeds(n.value.filter(x=>x.kind!=='dating')); else {setNeeds([]);errors.push('需求資料暫時無法讀取');}
      if(s.status==='fulfilled')setServices(s.value); else {setServices([]);errors.push('服務資料暫時無法讀取');}
      setIssues(errors);setLoading(false);
    });
    return ()=>{active=false;};
  },[reloadKey]);
  const shown=section==='needs'?needs.length:section==='services'?services.length:null;
  return <section className="gb-board" id="guild-discovery" aria-labelledby="gb-title">
    <div className="gb-heading"><div><span className="gb-kicker">REAL OPPORTUNITIES</span><h2 id="gb-title"><ScrollText size={22}/> 公會布告欄</h2><p>只顯示真實公開資料，不建立假會員、假需求或假成交。</p></div><button className="gb-refresh" type="button" onClick={reload} disabled={loading}><RefreshCw size={15}/>重新整理</button></div>
    <div className="gb-tabs" role="group" aria-label="探索類型">
      <button type="button" aria-pressed={section==='needs'} className={section==='needs'?'active':''} onClick={()=>setSection('needs')}><Handshake size={16}/>需求{!loading&&!issues.some(x=>x.includes('需求'))?` ${needs.length}`:''}</button>
      <button type="button" aria-pressed={section==='services'} className={section==='services'?'active':''} onClick={()=>setSection('services')}><Store size={16}/>服務{!loading&&!issues.some(x=>x.includes('服務'))?` ${services.length}`:''}</button>
      <button type="button" aria-pressed={section==='jobs'} className={section==='jobs'?'active':''} onClick={()=>setSection('jobs')}><BriefcaseBusiness size={16}/>工作機會</button>
    </div>
    {section==='jobs' ? <div className="gb-empty"><BriefcaseBusiness size={28}/><strong>台灣與遠端工作機會</strong><p>查看政府公開職缺及可前往原站的求職、接案平台。外部來源與公會會員需求分開標示。</p><a href="/earn">查看真實工作來源 <ArrowRight size={16}/></a></div>
    : loading ? <div role="status" className="gb-empty"><span>正在讀取公會公開資料…</span></div>
    : issues.some(x=>section==='needs'?x.includes('需求'):x.includes('服務')) ? <div role="alert" className="gb-empty"><strong>這類資料目前無法讀取</strong><p>請稍後重試，不能以零筆或示範內容取代失敗結果。</p><button type="button" onClick={reload}>重新讀取</button></div>
    : shown===0 ? <div className="gb-empty"><ScrollText size={31}/><strong>{section==='needs'?'目前沒有公會會員公開需求':'目前沒有公開上架的服務'}</strong><p>{section==='needs'?'可以成為第一位發布真實需求的會員。':'你可以上架自己真實能提供的服務。'}</p><button type="button" onClick={onPublish}>{section==='needs'?'發布我的需求':'發布需求或服務'} <ArrowRight size={15}/></button></div>
    : <div className="gb-cards">{section==='needs' ? needs.slice(0,8).map(n=><article className="gb-card" key={n.id}><span className="gb-meta">{labelKind(n.kind)} · {n.city||'地點未提供'}</span><h3>{n.title}</h3><p>{n.description}</p><small>發布日期：{new Date(n.created_at).toLocaleDateString('zh-TW')}</small><button type="button" onClick={()=>onReply(n)}>表達合作意願 <ArrowRight size={16}/></button></article>) : services.slice(0,8).map(s=><article className="gb-card" key={s.id}><span className="gb-meta">公開服務 · {s.city||'地點未提供'}</span><h3>{s.title}</h3><p>{s.description}</p><small>提供者：{s.business_name} · {s.price_from_twd==null?'依需求報價':'NT$ '+s.price_from_twd.toLocaleString()+' 起'}</small><button type="button" onClick={()=>onInquiry(s)}>詢問服務 <ArrowRight size={16}/></button></article>)}</div>}
    {!isSignedIn&&section!=='jobs'&&<p className="gb-footnote">瀏覽公開資料不必登入；聯絡或發布時需先登入會員。</p>}
  </section>;
}
