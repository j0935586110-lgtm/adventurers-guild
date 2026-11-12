import { useState } from 'react';
import { ArrowRight, Bot, Check, ClipboardCopy, ExternalLink, Github, LockKeyhole, MessageSquareText, ShieldCheck, UsersRound } from 'lucide-react';
import { useGuild } from './GuildProvider';
import './guild-ai-hub.css';

const memberMcp = 'https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-mcp-friend-beta';
const forumMcp = 'https://forum-mcp.928174.xyz/mcp';
type Ability = { key:string;name:string;status:string;desc:string;url:string;examples:string[];protected?:boolean };
export default function GuildAiHub() {
  const { user } = useGuild();
  const [copied,setCopied] = useState('');
  const [en,setEn] = useState(() => new URLSearchParams(location.search).get('lang')==='en');
  const tx=(zh:string,english:string)=>en?english:zh;
  const publicMcp = location.origin + '/mcp';
  const abilities:Ability[]=[
    {key:'public',name:tx('公會公開搜尋 MCP','Public Guild MCP'),status:tx('公開唯讀','Public / read-only'),desc:tx('讓 AI 搜尋真實公開的工作、合作需求、活動、個人服務及論壇文章。不捏造結果。','Agents search real public opportunities, services and community posts without creating fictitious entries.'),url:publicMcp,examples:[tx('找台北創業夥伴','Find a founder in Taipei'),tx('查找論壇文章','Read forum discussions')]},
    {key:'member',name:tx('會員授權 MCP','Member OAuth MCP'),status:tx('需會員 OAuth 授權','Per-member OAuth'),desc:tx('會員授權 AI 建立需求草稿、確認後刊登、回覆及管理自己的合作內容。操作會受資料庫權限限制。','With your OAuth permission, agents can draft requests, publish after confirmation and manage your interactions under database permissions.'),url:memberMcp,examples:[tx('幫我建立一則找人的草稿','Create a private collaboration draft'),tx('確認後公開我的需求','Publish my approved request')],protected:true},
    {key:'forum',name:tx('論壇發文 MCP','Forum Writing MCP'),status:tx('目前僅持有論壇授權碼的代理','Forum token required'),desc:tx('沿用已運行的 NodeBB MCP：可讀文章、搜尋、建立主題及回覆。寫入使用論壇持有人專屬權杖，不會把管理員憑證發給一般會員。','Use the existing NodeBB MCP to read, create topics and reply. Posting requires a separately issued forum credential; admin tokens are never shared with ordinary members.'),url:forumMcp,examples:[tx('幫我整理論壇貼文草稿','Prepare a forum post'),tx('我確認後發文','Publish after my approval')],protected:true}
  ];
  async function copy(value:string,key:string) {
    try {await navigator.clipboard.writeText(value);setCopied(key);} catch {setCopied('');}
  }
  return <main className="ga-root">
    <header className="ga-header"><div className="ga-shell ga-bar">
      <a href="/" className="ga-brand"><span>G</span>{tx('冒險者公會','Adventurers Guild')}</a>
      <nav><a href="/">{tx('首頁','Home')}</a><a href="/community">{tx('論壇','Community')}</a><a href="/me">{tx('會員','Account')}</a><button type="button" onClick={()=>setEn(!en)}>{en?'中文':'EN'}</button></nav>
    </div></header>
    <div className="ga-shell ga-body">
      <div className="ga-eyebrow"><Bot size={18}/> AI CONNECTOR / MCP</div>
      <h1>{tx('讓你的 AI 直接使用冒險者公會。','Let your AI work with the guild.')}</h1>
      <p className="ga-lead">{tx('不用讓 AI 一步一步點網頁。透過 MCP，AI 能讀取任務、搜尋真實需求，經過會員授權後執行刊登與回覆。論壇發文沿用獨立的 NodeBB MCP。','No need for an agent to click through every page. Connect via MCP for search, requests, and explicitly authorized actions; forum posting uses the separate NodeBB MCP.')}</p>
      <div className="ga-note"><ShieldCheck size={19}/><p>{tx('公開搜尋不需要登入；刊登、回覆和論壇發文需要相應的授權及事前確認。MCP 提供工具，不會自動把 AI 連到你的帳號。','Public reads require no login. Mutations require appropriate credentials and user approval. Connecting an agent is a separate, explicit action.')}</p></div>
      <div className="ga-grid">
        {abilities.map(a=><section key={a.key} className="ga-card">
          <div className="ga-card-head"><span className="ga-card-icon">{a.key==='forum'?<MessageSquareText size={24}/>:a.key==='member'?<LockKeyhole size={24}/>:<UsersRound size={24}/>}</span><span className="ga-state">{a.status}</span></div>
          <h2>{a.name}</h2><p>{a.desc}</p>
          <label>{tx('MCP 服務網址','MCP endpoint')}<code>{a.url}</code></label>
          <div className="ga-card-actions"><button type="button" onClick={()=>void copy(a.url,a.key)}><ClipboardCopy size={16}/>{copied===a.key?tx('已複製','Copied'):tx('複製 MCP 網址','Copy MCP URL')}</button><a href={a.url} target="_blank" rel="noopener noreferrer">{tx('端點','Endpoint')} <ExternalLink size={14}/></a></div>
          <div className="ga-examples">{a.examples.map((example,i)=><span key={i}>{example}</span>)}</div>
        </section>)}
      </div>
      <section className="ga-info">
        <h2>{tx('在 ChatGPT、Claude、Gemini 或 Hermes 如何使用？','Connect with AI tools')}</h2>
        <p>{tx('在支援遠端 MCP 的 AI 工具新增 MCP 連線，貼上所需服務網址。公開資料可以直接搜尋；會員操作應完成 OAuth 授權。論壇發文仍使用獨立 NodeBB 授權碼（僅限擁有權限的管理者或代理）。','Add the relevant remote MCP URL in an AI client that supports it. Public data is readable without a login; member mutations require OAuth, while forum writing requires the author’s separate NodeBB credential.')}</p>
        <p>{tx('論壇的一般會員發文尚未完成與公會的單一登入綁定，不能用管理員金鑰假裝是其他使用者。','Cross-site SSO for ordinary forum users is not yet complete. An administrator token must never be used to impersonate a member.')}</p>
        <a className="ga-back" href="/community">{tx('回到站內論壇','Go to community')} <ArrowRight size={16}/></a>
      </section>
      <footer className="ga-footer">{user?tx('會員登入中；連接 MCP 仍需在 AI 客戶端授權。','Signed in; the AI client needs its own authorization.'):tx('尚未登入也可以使用公開搜尋 MCP。','Public search works without sign-in.')} · <a href="https://github.com/j0935586110-lgtm/adventurers-guild" target="_blank" rel="noopener noreferrer"><Github size={15}/> GitHub</a></footer>
    </div>
  </main>;
}
