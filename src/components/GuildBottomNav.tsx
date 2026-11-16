import {Compass, MessageCircle, PlusCircle, UserRound} from 'lucide-react';
import './guild-bottom-nav.css';
export default function GuildBottomNav({onPost,active}:{onPost?:()=>void;active?:'explore'|'messages'|'account'}){
  return <nav className="guild-mobile-bottom" aria-label="公會手機導覽">
    <a className={active==='explore'?'active':''} href="/#guild-discovery"><Compass size={21}/><span>探索</span></a>
    {onPost?<button type="button" onClick={onPost}><PlusCircle size={21}/><span>發布</span></button>:<a href="/?post=1"><PlusCircle size={21}/><span>發布</span></a>}
    <a className={active==='messages'?'active':''} href="/me?tab=desk"><MessageCircle size={21}/><span>訊息</span></a>
    <a className={active==='account'?'active':''} href="/me"><UserRound size={21}/><span>我的</span></a>
  </nav>;
}
