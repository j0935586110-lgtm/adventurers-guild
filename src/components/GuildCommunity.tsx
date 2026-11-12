import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, MessageCircle, MessageSquareText, RefreshCw, Search, UsersRound } from 'lucide-react';
import './guild-community.css';

type Category = {cid:number;name:string;description:string;totalTopicCount:number};
type Topic = {tid:number;cid:number;title:string;slug:string;postcount:number;timestamp:number;user:{username:string};category:string};
type Post = {pid:number;username:string;timestamp:number;content:string};
type Detail = {topic:{tid:number;cid:number;title:string;postcount:number;locked:boolean};posts:Post[]};

function visibleText(html:string) {
  // NodeBB renders Markdown to HTML. Read as text instead of inserting untrusted HTML.
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,svg,iframe,form,object,embed,noscript').forEach(el=>el.remove());
  doc.querySelectorAll('br,hr,p,div,li,h1,h2,h3,h4,pre,blockquote,tr').forEach(el=>el.appendChild(doc.createTextNode('\n')));
  return (doc.body?.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
}
async function api<T>(params:Record<string,string|number>,signal:AbortSignal):Promise<T> {
  const qs=new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
  const r=await fetch('/api/community?'+qs.toString(),{signal});
  if(!r.ok) throw new Error(r.status===404?'找不到這篇討論':'論壇暫時無法載入（HTTP '+r.status+'）');
  return r.json();
}
const date=(n:number)=>n ? new Date(n).toLocaleDateString('zh-TW') : '';
const external=(t:Topic|Detail['topic'])=>'https://forum.928174.xyz/topic/'+t.tid;

export default function GuildCommunity(){
  const [en,setEn]=useState(()=>new URLSearchParams(location.search).get('lang')==='en');
  const initial=location.pathname.match(/^\/community\/topic\/(\d{1,8})\/?$/);
  const [topicId,setTopicId]=useState<number|null>(initial?Number(initial[1]):null);
  const [cid,setCid]=useState(0);
  const [categories,setCategories]=useState<Category[]>([]);
  const [topics,setTopics]=useState<Topic[]>([]);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const tx=(zh:string,eng:string)=>en?eng:zh;
  useEffect(()=>{document.documentElement.lang=en?'en':'zh-TW';},[en]);
  const openTopic=useCallback((id:number|null)=>{
    setTopicId(id);setDetail(null);setError('');
    const path=id?'/community/topic/'+id:'/community';
    history.pushState(null,'',path+(en?'?lang=en':''));
    window.scrollTo({top:0,behavior:'smooth'});
  },[en]);
  useEffect(()=>{
    const change=()=>{const m=location.pathname.match(/^\/community\/topic\/(\d{1,8})\/?$/);setTopicId(m?Number(m[1]):null);};
    window.addEventListener('popstate',change);
    return ()=>window.removeEventListener('popstate',change);
  },[]);
  useEffect(()=>{
    const ctl=new AbortController();
    void api<{categories:Category[]}>({view:'categories'},ctl.signal).then(d=>setCategories(d.categories)).catch(()=>{});
    return ()=>ctl.abort();
  },[]);
  useEffect(()=>{
    const ctl=new AbortController();setLoading(true);setError('');
    if(topicId) {
      void api<Detail>({view:'topic',id:topicId},ctl.signal).then(setDetail).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>setLoading(false));
    } else {
      void api<{topics:Topic[]}>({view:cid?'category':'recent',...(cid?{id:cid}:{})},ctl.signal).then(d=>setTopics(d.topics)).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>setLoading(false));
    }
    return ()=>ctl.abort();
  },[topicId,cid]);
  return <main className="gc-root">
    <header className="gc-header"><div className="gc-shell gc-nav">
      <a href="/" className="gc-brand"><span>G</span> {tx('冒險者公會','Adventurers Guild')}</a>
      <nav><a href="/">{tx('找人與機會','Find opportunities')}</a><a href="/me">{tx('我的冒險者','My profile')}</a><a className="gc-active" href="/community">{tx('論壇','Community')}</a><button type="button" onClick={()=>setEn(!en)}>{en?'中文':'EN'}</button></nav>
    </div></header>
    <div className="gc-shell gc-body">
      <div className="gc-intro">
        <div className="gc-label"><MessageCircle size={16}/>{tx('公會論壇','GUILD COMMUNITY')}</div>
        <h1>{tx('分享經驗、討論問題，','Share ideas, ask questions,')}<br/><span>{tx('一起完成任務。','work together.')}</span></h1>
        <p>{tx('這裡就是台灣 AI 論壇。文章與討論直接在公會閱讀，沿用原本的 NodeBB 資料。','Read Taiwan AI Forum discussions right inside the guild, powered by the original NodeBB community.')}</p>
        <div className="gc-intro-actions">
          <a href="https://forum.928174.xyz/login" target="_blank" rel="noopener noreferrer" className="gc-primary"><MessageSquareText size={17}/>{tx('登入論壇發文','Sign in to post')} <ExternalLink size={14}/></a>
          <a href="/me" className="gc-outline"><UsersRound size={17}/>{tx('我的冒險者檔案','My adventurer profile')}</a>
        </div>
      </div>
      <div className="gc-layout">
        <aside className="gc-aside">
          <strong>{tx('討論看板','Categories')}</strong>
          <button type="button" className={!cid?'chosen':''} onClick={()=>{setCid(0);openTopic(null)}}>{tx('最新討論','Latest discussions')}</button>
          {categories.map(c=><button key={c.cid} type="button" className={cid===c.cid?'chosen':''} onClick={()=>{setCid(c.cid);openTopic(null)}}><span>{c.name}</span><small>{c.totalTopicCount||''}</small></button>)}
          <div className="gc-aside-note">{tx('沿用 NodeBB 正式文章與會員系統，不另外建造第二個論壇。','All content comes from the existing NodeBB community.')}</div>
        </aside>
        <section className="gc-main">
          {topicId && <button type="button" className="gc-back" onClick={()=>openTopic(null)}><ArrowLeft size={17}/>{tx('返回討論列表','Back to discussions')}</button>}
          <div className="gc-heading"><h2>{topicId ? tx('文章內容','Discussion') : cid ? categories.find(c=>c.cid===cid)?.name||tx('討論','Discussions') : tx('最新討論','Latest discussions')}</h2>
            {loading&&<span className="gc-tiny">{tx('正在更新…','Loading…')}</span>}
          </div>
          {error&&<div className="gc-error" role="alert">{error}</div>}
          {!topicId && <>
            <label className="gc-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tx('搜尋本頁標題…','Filter topics by title…')} aria-label={tx('篩選討論','Filter discussions')}/></label>
            <div className="gc-topic-list">
              {topics.filter(t=>t.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(t=><button type="button" className="gc-topic" key={t.tid} onClick={()=>openTopic(t.tid)}>
                <span className="gc-topic-title">{t.title}</span>
                <span className="gc-topic-meta"><span>{t.user?.username || tx('會員','Member')}</span><span>{categories.find(c=>c.cid===t.cid)?.name || t.category || ''}</span><span>{date(t.timestamp)}</span><span><MessageCircle size={14}/>{Math.max(0,t.postcount-1)}</span><ArrowRight size={16}/></span>
              </button>)}
              {!loading&&topics.length===0&&<p className="gc-empty">{tx('目前這個看板沒有公開文章。','No public discussions yet.')}</p>}
            </div>
          </>}
          {topicId && detail && <article className="gc-article">
            <h2>{detail.topic.title}</h2>
            {detail.posts.map(p=><div className="gc-post" key={p.pid}>
              <div className="gc-post-header"><strong>{p.username || tx('會員','Member')}</strong><small>{date(p.timestamp)}</small></div>
              <div className="gc-post-body">{visibleText(p.content)}</div>
            </div>)}
            <div className="gc-reply"><p>{tx('想回覆這篇討論？目前發文仍使用原論壇身分。閱讀與瀏覽已整合至公會。','To reply, use your existing forum login. Reading and browsing are integrated here.')}</p>
              <a href={external(detail.topic)} target="_blank" rel="noopener noreferrer" className="gc-primary">{tx('前往原討論回覆','Reply on original discussion')} <ExternalLink size={15}/></a></div>
          </article>}
        </section>
      </div>
      <footer className="gc-footer"><span>ADVENTURERS GUILD × TAIWAN AI FORUM</span><a href="/">{tx('回到公會','Back to guild')}</a></footer>
    </div>
  </main>;
}
