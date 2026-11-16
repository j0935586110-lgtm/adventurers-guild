import {useState} from 'react';
import {ArrowLeft, ArrowRight, Bot, Check, Copy, ExternalLink, LockKeyhole, ScrollText, ShieldCheck, Swords, UserRound} from 'lucide-react';
import {useGuild} from './GuildProvider';
import './guild-agent-connect.css';

type Platform='chatgpt'|'claude'|'gemini'|'opencode';
const memberUrl='https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-mcp-friend-beta';
const himalayasUrl='https://mcp.himalayas.app/mcp';
const info:Record<Platform,{title:string,zh:string,en:string,doc:string}>={
  chatgpt:{title:'ChatGPT',zh:'支援 MCP App 的工作空間：到 Apps 建立／連接自訂 MCP App，填入公會 MCP 網址並確認權限。一般 ChatGPT 對話貼網站連結不會自動安裝工具。',en:'In supported workspaces, create or connect a custom MCP App under Apps and review permissions. A plain website link cannot install tools in a standard conversation.',doc:'https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt'},
  claude:{title:'Claude',zh:'到「Customize／自訂 → Connectors／連接器 → Add custom connector」，輸入公會 MCP 網址；如有需要再登入授權。',en:'Customize → Connectors → Add custom connector. Paste the Guild MCP URL. Grant access when requested.',doc:'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp'},
  gemini:{title:'Gemini CLI',zh:'將下方設定合併到 ~/.gemini/settings.json 的 mcpServers。雲端 Gemini 網頁聊天不一定支援直接加入自訂 MCP。',en:'Merge the snippet below into ~/.gemini/settings.json under mcpServers. Gemini web chat may not support custom MCP.',doc:'https://geminicli.com/docs/tools/mcp-server/'},
  opencode:{title:'OpenCode',zh:'將下方設定合併到 opencode.json；啟用後就能讓模型使用公會工具。會員寫入操作需另外 OAuth。',en:'Merge the snippet into opencode.json and enable MCP. Authenticated actions require a separate OAuth connection.',doc:'https://opencode.ai/docs/mcp-servers'}
};
export default function GuildAgentConnect(){
 const {user}=useGuild();
 const [en,setEn]=useState(()=>new URLSearchParams(location.search).get('lang')==='en');
 const [platform,setPlatform]=useState<Platform>('claude');
 const [scope,setScope]=useState<'public'|'member'>('public');
 const [copied,setCopied]=useState('');
 const tx=(zh:string,english:string)=>en?english:zh;
 const home=location.origin+'/';
 const mcp=scope==='public'?location.origin+'/mcp':memberUrl;
 const config=platform==='gemini'?JSON.stringify({mcpServers:{'adventurers-guild':{httpUrl:mcp},'himalayas-remote-jobs':{httpUrl:himalayasUrl}}},null,2)
 :platform==='opencode'?JSON.stringify({$schema:'https://opencode.ai/config.json',mcp:{'adventurers-guild':{type:'remote',url:mcp,enabled:true},'himalayas-remote-jobs':{type:'remote',url:himalayasUrl,enabled:true}}},null,2)
 :mcp;
 const invitation=tx('請先閱讀 '+home+'llms.txt，了解冒險者公會可以提供的公開 MCP 工具。如果你支援遠端 MCP，請幫我設定 '+home+'mcp 並告訴我如何授權；如不支援，不要假裝已經連接。請搜尋公會公開任務，並使用 Himalayas 官方 MCP '+himalayasUrl+' 搜尋可以在台灣應徵的遠端工作。刊登我的技能服務前必須先向我確認。','Read '+home+'llms.txt for Adventurers Guild MCP tools. If you support remote MCP, help me connect '+home+'mcp and explain approval. If you do not, do not claim connected access. Search real Guild quests, then use official Himalayas MCP '+himalayasUrl+' to find remote jobs eligible in Taiwan. Confirm with me before publicly publishing my services.');
 async function copy(text:string,label:string){try{await navigator.clipboard.writeText(text);setCopied(label);}catch{setCopied('');}}
 return <main className="ca-site">
  <header className="ca-header"><a href="/" className="ca-brand"><span><Swords size={22}/></span>{tx('冒險者公會','Adventurers Guild')}</a><nav><a href="/">{tx('首頁','Home')}</a><a href="/earn">{tx('我要賺錢','Earn')}</a><a href="/community">{tx('論壇','Forum')}</a><a href="/me">{tx('我的任務','My quests')}</a><button type="button" onClick={()=>setEn(!en)}>{en?'中文':'EN'}</button></nav></header>
  <section className="ca-intro">
   <div className="ca-overline"><Bot size={18}/> BRING YOUR OWN AI</div>
   <h1>{tx('帶你的 AI，加入冒險者公會。','Bring your AI to the Guild.')}</h1>
   <p>{tx('你的 GPT、Gemini、Claude、OpenCode 都能使用公會的公開資料與任務工具。第一次依平台連接 MCP，之後直接在自己的 AI 對話中找人、看任務、查論壇。','Use Guild tools with your existing GPT, Gemini, Claude or OpenCode. Connect MCP once in a supported client, then search public quests and forum discussions from your own assistant.')}</p>
  </section>
  <div className="ca-content">
   <section className="ca-connect-box">
    <div className="ca-label">{tx('把這個網站網址貼給 AI','Share this website with your AI')}</div>
    <div className="ca-copyline"><code>{home}</code><button type="button" onClick={()=>void copy(home,'home')}><Copy size={16}/>{copied==='home'?tx('已複製','Copied'):tx('複製','Copy')}</button></div>
    <p>{tx('直接貼網址能讓 AI 找到公會介紹，但不代表已取得工具權限。需要操作能力時，請完成下方 MCP 連線。','Pasting a URL helps an assistant discover the Guild, but does not grant tool access. Connect MCP below to use actions.')}</p>
    <button className="ca-prompt-copy" type="button" onClick={()=>void copy(invitation,'prompt')}><Bot size={18}/>{copied==='prompt'?tx('已複製 AI 指令','AI prompt copied'):tx('複製給 AI 的連線指令','Copy a ready-to-paste AI prompt')} <ArrowRight size={16}/></button>
   </section>
   <section className="ca-setup">
    <div className="ca-section-title"><ScrollText size={20}/><h2>{tx('選擇你使用的 AI','Choose your AI')}</h2></div>
    <div className="ca-platforms">{(['chatgpt','gemini','claude','opencode'] as const).map(a=><button key={a} type="button" className={platform===a?'selected':''} onClick={()=>setPlatform(a)}>{info[a].title}</button>)}</div>
    <div className="ca-scope">
     <button type="button" className={scope==='public'?'selected':''} onClick={()=>setScope('public')}><ShieldCheck size={17}/>{tx('公開搜尋（免登入）','Public search')}</button>
     <button type="button" className={scope==='member'?'selected':''} onClick={()=>setScope('member')}><LockKeyhole size={17}/>{tx('會員操作（需授權）','Member OAuth')}</button>
    </div>
    <div className="ca-platform-detail">
     <h3>{info[platform].title}</h3>
     <p>{en?info[platform].en:info[platform].zh}</p>
     <div className="ca-connection-status">{scope==='public'?tx('已實測：公開 MCP 可搜尋公會需求、服務與論壇內容。','Verified: public MCP can read services, needs, and forum discussions.')
      :tx('會員動作須使用公會 OAuth。論壇發文另需論壇會員專屬授權，目前尚未完成公會與論壇單一登入。','Member actions require Guild OAuth. Forum posting needs separate forum authorization; unified SSO is not complete.')}</div>
     <label>{platform==='gemini'?'~/.gemini/settings.json':platform==='opencode'?'opencode.json':tx('遠端 MCP 服務網址','Remote MCP endpoint')}</label>
     <pre><code>{config}</code></pre>
     <div className="ca-setup-actions"><button type="button" onClick={()=>void copy(config,'config')}><Copy size={16}/>{copied==='config'?tx('已複製','Copied'):tx('複製連線設定','Copy connection settings')}</button><a href={info[platform].doc} target="_blank" rel="noopener noreferrer">{tx('官方教學','Official guide')} <ExternalLink size={14}/></a></div>
    </div>
   </section>
   <section className="ca-connect-box" aria-label="外部職缺 MCP">
    <div className="ca-label">{tx('真正的遠端工作機會｜官方 MCP','Remote jobs | official MCP')}</div>
    <p>{tx('公會 MCP 目前只搜尋公會會員資料。要讓你的 GPT、Claude 或 Gemini 查詢真實外部職缺，另外接入 Himalayas 官方 MCP；上述 Gemini／OpenCode 設定已同時包含兩個。','Guild MCP reads Guild listings only. For external remote jobs, connect the official Himalayas MCP too. Gemini/OpenCode configuration above includes both servers.')}</p>
    <div className="ca-copyline"><code>{himalayasUrl}</code><button type="button" onClick={()=>void copy(himalayasUrl,'jobs')}><Copy size={16}/>{copied==='jobs'?tx('已複製','Copied'):tx('複製','Copy')}</button></div>
    <p><a href="/earn">{tx('先在公會網站找工作與上架技能','Find jobs and publish skills inside the Guild')}</a> · <a href="https://himalayas.app/mcp" target="_blank" rel="noopener noreferrer">{tx('職缺來源與官方文件','Official job provider and docs')}</a></p>
   </section>
   <section className="ca-bottom-note"><ShieldCheck size={20}/><div><strong>{tx('只讓 AI 做會員同意的事情','Only authorized actions')}</strong><p>{tx('公開查詢可以直接做；刊登、回覆、付款與論壇發文必須具備相應的會員授權和使用者確認。不會提供共用管理員權杖。','Public reads are available immediately; posting, replying, payments and forum writing require appropriate user-scoped permissions and confirmation. Admin credentials are never shared.')}</p><small>{user?tx('你已登入公會，但仍需在 AI 客戶端授權。','You are signed in; your AI still requires separate authorization.'):tx('你尚未登入；可以先試公開搜尋。','You can try public MCP without signing in.')}</small></div></section>
  </div>
 </main>;
}
