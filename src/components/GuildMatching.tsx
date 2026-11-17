import {useState} from 'react';
import GuildNeeds from './GuildNeeds';
import {GuildAuthDialog} from './GuildAuthDialog';
import GuildBottomNav from './GuildBottomNav';
import './guild-matching.css';

export default function GuildMatching() {
  const [authOpen,setAuthOpen]=useState(false);
  return <div className="gmatch-root">
    <header className="gmatch-header">
      <a href="/" className="gmatch-brand">冒險者公會</a>
      <nav aria-label="主要選單">
        <a href="/matching">探索委託</a>
        <a href="/matching?intent=post">發布委託</a>
        <a href="/me?tab=desk">我的合作</a>
      </nav>
    </header>
    <div className="gmatch-shell">
      <div className="gmatch-intro">
        <span>THE ADVENTURERS GUILD · MATCHING</span>
        <h1>一個會員，既能委託，也能接任務</h1>
        <p>公開說明你要完成的事，或向其他人的需求提出合作意願。只有雙方同意後，才可以進入私人對話與自願交換 LINE。</p>
        <div className="gmatch-actions">
          <a href="/matching?intent=post">我要委託</a>
          <a href="/matching#gn-title">我要接任務</a>
          <a href="/me?tab=desk">我的媒合紀錄</a>
        </div>
      </div>
      <GuildNeeds lang="zh" onLogin={()=>setAuthOpen(true)}/>
    </div>
    <GuildBottomNav active="explore"/>
    {authOpen&&<GuildAuthDialog onClose={()=>setAuthOpen(false)}/>}
  </div>;
}
