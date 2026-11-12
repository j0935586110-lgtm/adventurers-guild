import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Bookmark, Coins, ExternalLink, Github, HeartHandshake, LoaderCircle, MessageSquareText, RefreshCw, Save, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { useGuild } from './GuildProvider';
import { supabase } from '../lib/supabase';
import './guild-home.css';
import './guild-member-hub.css';

type Showcase = { user_id: string; tagline: string; github_login: string; forum_username: string; featured_repositories: string[] };
type Quest = { id: string; title: string; status: string; client_id: string; adventurer_id: string | null; reward_g_coin: number; created_at: string };
type Need = { id: string; owner_id: string; title: string; kind: string; status: string; created_at: string };
type PublicProfile = { id: string; display_name: string; avatar_url: string | null; bio: string | null; skill_tags: string[] | null; reputation_points: number };
type Repo = { id: number; name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number; fork: boolean; archived: boolean };
type ForumStats = { username: string; url: string; topiccount: number; postcount: number; reputation: number };
type Tab = 'quests' | 'saved' | 'works' | 'forum' | 'explore';
type BookmarkTarget = { type: 'quest' | 'need'; id: string };
const emptyShowcase = (uid: string): Showcase => ({ user_id: uid, tagline: '', github_login: '', forum_username: '', featured_repositories: [] });
const validGithub = (s: string) => s === '' || /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(s);
const validForum = (s: string) => s.length <= 60 && !/[<>{}/\\]/.test(s);
const validId = (s: string) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s);
function shortDate(s: string) { return new Date(s).toLocaleDateString('zh-TW'); }
function statusLabel(s: string, en: boolean) {
  const v: Record<string, [string, string]> = { posted: ['招募中','Open'], accepted: ['執行中','In progress'], submitted: ['待驗收','Submitted'], verified: ['已驗收','Verified'], disputed: ['爭議處理','Disputed'], canceled: ['已取消','Canceled'], expired: ['已過期','Expired'], published: ['已發布','Published'], draft: ['草稿','Draft'], closed: ['已關閉','Closed'] };
  return v[s] ? v[s][en ? 1 : 0] : s;
}
function getLang(): boolean {
  const query = new URLSearchParams(window.location.search).get('lang');
  if (query === 'en') return true;
  if (query === 'zh') return false;
  try { return localStorage.getItem('guild-language') === 'en'; } catch { return false; }
}

export default function GuildMemberHub() {
  const { user, profile, loading: authLoading, signOut } = useGuild();
  const [en, setEn] = useState(getLang);
  const publicId = window.location.pathname.startsWith('/adventurers/') ? window.location.pathname.split('/')[2] : '';
  const viewingSelf = !publicId || (!!user && publicId === user.id);
  const target = publicId || user?.id || '';
  const [tab, setTab] = useState<Tab>('quests');
  const [identity, setIdentity] = useState<PublicProfile | null>(null);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Showcase | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [savedQuests, setSavedQuests] = useState<string[]>([]);
  const [savedNeeds, setSavedNeeds] = useState<string[]>([]);
  const [savedQuestDetails, setSavedQuestDetails] = useState<Quest[]>([]);
  const [savedNeedDetails, setSavedNeedDetails] = useState<Need[]>([]);
  const [openQuests, setOpenQuests] = useState<Quest[]>([]);
  const [openNeeds, setOpenNeeds] = useState<Need[]>([]);
  const [repositories, setRepositories] = useState<Repo[]>([]);
  const [forum, setForum] = useState<ForumStats | null>(null);
  const [forumError, setForumError] = useState('');
  const [githubError, setGithubError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const text = (zh: string, english: string) => en ? english : zh;

  useEffect(() => {
    document.documentElement.lang = en ? 'en' : 'zh-TW';
    try { localStorage.setItem('guild-language', en ? 'en' : 'zh'); } catch {}
  }, [en]);

  const reload = useCallback(async () => {
    if (!target || !validId(target)) return;
    setFetching(true); setError('');
    try {
      const member = await supabase.from('users').select('id,display_name,avatar_url,bio,skill_tags,reputation_points').eq('id', target).maybeSingle();
      if (member.error) throw member.error;
      setIdentity(member.data);
      const [show, taskResult, needResult] = await Promise.all([
        supabase.from('guild_member_showcases').select('user_id,tagline,github_login,forum_username,featured_repositories').eq('user_id', target).maybeSingle(),
        viewingSelf ? supabase.from('quests').select('id,title,status,client_id,adventurer_id,reward_g_coin,created_at').or('client_id.eq.' + target + ',adventurer_id.eq.' + target).order('created_at', { ascending: false }).limit(60)
          : supabase.from('quests').select('id,title,status,client_id,adventurer_id,reward_g_coin,created_at').eq('adventurer_id', target).eq('status', 'verified').order('created_at', { ascending: false }).limit(30),
        supabase.from('guild_needs').select('id,owner_id,title,kind,status,created_at').eq('owner_id', target).order('created_at', { ascending: false }).limit(60),
      ]);
      if (show.error) throw show.error;
      setShowcase(show.data || emptyShowcase(target));
      setDraft(show.data || emptyShowcase(target));
      if (taskResult.error) throw taskResult.error;
      if (needResult.error) throw needResult.error;
      setQuests(taskResult.data || []);
      setNeeds(needResult.data || []);
      if (viewingSelf && user) {
        const [q, n] = await Promise.all([
          supabase.from('guild_quest_bookmarks').select('quest_id').eq('user_id', user.id),
          supabase.from('guild_need_bookmarks').select('need_id').eq('user_id', user.id),
        ]);
        if (q.error || n.error) throw q.error || n.error;
        setSavedQuests((q.data || []).map(item => item.quest_id));
        setSavedNeeds((n.data || []).map(item => item.need_id));
      }
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setFetching(false); }
  }, [target, viewingSelf, user?.id]);

  useEffect(() => { void reload(); }, [reload]);

  const loadExplore = useCallback(async () => {
    const [q, n] = await Promise.all([
      supabase.from('quests').select('id,title,status,client_id,adventurer_id,reward_g_coin,created_at').eq('status','posted').order('created_at',{ascending:false}).limit(30),
      supabase.from('guild_needs').select('id,owner_id,title,kind,status,created_at').eq('status','published').order('created_at',{ascending:false}).limit(30),
    ]);
    if(q.error || n.error) setError((q.error || n.error)?.message || 'Unable to load open tasks');
    else { setOpenQuests(q.data || []); setOpenNeeds(n.data || []); }
  }, []);
  useEffect(() => { if (tab === 'saved' || tab === 'explore') void loadExplore(); }, [tab, loadExplore]);
  useEffect(() => {
    if (!user || !viewingSelf) { setSavedQuestDetails([]); setSavedNeedDetails([]); return; }
    let cancelled = false;
    async function loadSaved() {
      const q = savedQuests.length
        ? await supabase.from('quests').select('id,title,status,client_id,adventurer_id,reward_g_coin,created_at').in('id', savedQuests.slice(0,100)).limit(100)
        : { data: [] as Quest[], error: null };
      const n = savedNeeds.length
        ? await supabase.from('guild_needs').select('id,owner_id,title,kind,status,created_at').in('id', savedNeeds.slice(0,100)).limit(100)
        : { data: [] as Need[], error: null };
      if (!cancelled) {
        if (!q.error) setSavedQuestDetails(q.data || []);
        if (!n.error) setSavedNeedDetails(n.data || []);
      }
    }
    void loadSaved();
    return () => { cancelled = true; };
  }, [user?.id, viewingSelf, savedQuests.join(','), savedNeeds.join(',')]);


  useEffect(() => {
    const login = showcase?.github_login || '';
    if (!login || !validGithub(login)) { setRepositories([]); setGithubError(''); return; }
    const controller = new AbortController();
    setGithubError('');
    fetch('https://api.github.com/users/' + encodeURIComponent(login) + '/repos?per_page=60&sort=updated&type=owner', { headers: { Accept:'application/vnd.github+json' }, signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(r.status === 404 ? '找不到 GitHub 帳號' : 'GitHub API 暫時無法使用（' + r.status + '）'); return r.json(); })
      .then(data => { if (Array.isArray(data)) setRepositories(data.filter((r: Repo) => !r.fork && !r.archived).slice(0, 60)); })
      .catch(err => { if (err?.name !== 'AbortError') { setGithubError(err.message || String(err)); setRepositories([]); } });
    return () => controller.abort();
  }, [showcase?.github_login]);

  useEffect(() => {
    const username = showcase?.forum_username || '';
    if (!username || !validForum(username)) { setForum(null); setForumError(''); return; }
    const controller = new AbortController();
    setForum(null); setForumError('');
    fetch('/api/forum-profile?username=' + encodeURIComponent(username), { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(r.status === 404 ? '論壇找不到這個公開帳號' : '暫時無法讀取論壇（' + r.status + '）'); return r.json(); })
      .then(data => setForum(data))
      .catch(err => { if (err?.name !== 'AbortError') setForumError(err.message || String(err)); });
    return () => controller.abort();
  }, [showcase?.forum_username]);

  const verifiedCount = useMemo(() => quests.filter(q => q.status === 'verified' && q.adventurer_id === target).length, [quests, target]);
  const pinned = useMemo(() => showcase?.featured_repositories?.length ? repositories.filter(r => showcase.featured_repositories.includes(r.name)) : repositories.slice(0, 6), [repositories, showcase]);
  const displayedRepos = useMemo(() => viewingSelf
    ? [...pinned, ...repositories.filter(r => !pinned.some(pin => pin.name === r.name)).slice(0,12)]
    : pinned, [viewingSelf, pinned, repositories]);

  async function saveProfile() {
    if (!user || !viewingSelf || !draft) return;
    const candidate = { ...draft, tagline: draft.tagline.trim().slice(0,160), github_login: draft.github_login.trim(), forum_username: draft.forum_username.trim(), featured_repositories: draft.github_login.trim() === showcase?.github_login ? draft.featured_repositories.slice(0,6) : [] };
    if (!validGithub(candidate.github_login)) { setError(text('GitHub 使用者名稱格式不正確。','Invalid GitHub username.')); return; }
    if (!validForum(candidate.forum_username)) { setError(text('論壇名稱包含不支援的字元。','Invalid forum username.')); return; }
    setBusy(true); setError('');
    try {
      const { error: saveError } = await supabase.from('guild_member_showcases').upsert({ ...candidate, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict:'user_id' });
      if (saveError) throw saveError;
      setEditing(false); await reload();
    } catch(err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  async function toggleBookmark(item: BookmarkTarget) {
    if (!user || !viewingSelf) { setError(text('請先登入會員。','Please sign in first.')); return; }
    const quest = item.type === 'quest';
    const saved = quest ? savedQuests : savedNeeds;
    const table = quest ? 'guild_quest_bookmarks' : 'guild_need_bookmarks';
    const field = quest ? 'quest_id' : 'need_id';
    setBusy(true); setError('');
    try {
      const removing = saved.includes(item.id);
      const result = removing ? await supabase.from(table).delete().eq('user_id',user.id).eq(field,item.id)
        : await supabase.from(table).insert({ user_id:user.id, [field]:item.id });
      if (result.error) throw result.error;
      const next = removing ? saved.filter(s => s !== item.id) : [...saved,item.id];
      if (quest) setSavedQuests(next); else setSavedNeeds(next);
    } catch(err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  async function togglePin(name: string) {
    if (!user || !viewingSelf || !showcase || !showcase.github_login) return;
    const selected = showcase.featured_repositories;
    const next = selected.includes(name) ? selected.filter(x => x !== name) : [...selected,name].slice(0,6);
    setBusy(true); setError('');
    const result = await supabase.from('guild_member_showcases').update({ featured_repositories:next, updated_at:new Date().toISOString() }).eq('user_id',user.id);
    if (result.error) setError(result.error.message); else setShowcase({...showcase,featured_repositories:next});
    setBusy(false);
  }

  const renderQuest = (q: Quest, showSave=false) => (
    <div className="gm-card" key={q.id}>
      <div className="gm-card-head"><strong>{q.title}</strong><span className={'gm-pill gm-'+q.status}>{statusLabel(q.status,en)}</span></div>
      <p>{text('任務報酬','Reward')}：{Number(q.reward_g_coin).toLocaleString()} G · {shortDate(q.created_at)}</p>
      {viewingSelf && <p>{q.adventurer_id===user?.id?text('我認領的任務','Assigned to me'):text('我發布的任務','Posted by me')}</p>}
      {showSave && viewingSelf && <button className="gm-mini-btn" disabled={busy} onClick={() => void toggleBookmark({type:'quest',id:q.id})}>
        <Bookmark size={15} fill={savedQuests.includes(q.id)?'currentColor':'none'} /> {savedQuests.includes(q.id)?text('取消收藏','Remove saved'):text('收藏任務','Save quest')}</button>}
    </div>
  );
  const renderNeed = (n: Need, showSave=false) => (
    <div className="gm-card" key={n.id}>
      <div className="gm-card-head"><strong>{n.title}</strong><span className={'gm-pill gm-'+n.status}>{statusLabel(n.status,en)}</span></div>
      <p>{n.kind} · {shortDate(n.created_at)}</p>
      {showSave && viewingSelf && <button className="gm-mini-btn" disabled={busy} onClick={() => void toggleBookmark({type:'need',id:n.id})}>
        <Bookmark size={15} fill={savedNeeds.includes(n.id)?'currentColor':'none'}/> {savedNeeds.includes(n.id)?text('取消收藏','Remove saved'):text('收藏需求','Save request')}</button>}
    </div>
  );

  if (authLoading && !publicId) return <main className="gm-root"><div className="gm-shell"><p>{text('正在讀取會員…','Loading member…')}</p></div></main>;
  if (!target || !validId(target)) return <main className="gm-root"><div className="gm-shell gm-empty">
    <UserRound size={42}/><h1>{text('加入公會，建立冒險者檔案','Join to create your adventurer profile')}</h1>
    <p>{text('使用首頁的登入／註冊功能即可開始。','Use the sign-in or sign-up option on the home page.')}</p><a className="gm-btn" href="/">{text('回到冒險者公會','Go to the guild')}</a></div></main>;

  return <main className="gm-root">
    <header className="gm-topbar"><div className="gm-shell gm-header">
      <a className="gm-mark" href="/"><span>G</span> {text('冒險者公會','Adventurers Guild')}</a>
      <div className="gm-toplinks"><a href="/">{text('首頁','Home')}</a><a href="https://forum.928174.xyz/" target="_blank" rel="noopener noreferrer">{text('論壇','Forum')}</a><button type="button" onClick={() => setEn(!en)}>{en?'中文':'EN'}</button>{user && <button type="button" onClick={() => void signOut()}>{text('登出','Sign out')}</button>}</div>
    </div></header>
    <div className="gm-shell gm-main">
      <div className="gm-profile">
        <div className="gm-avatar">{identity?.avatar_url?<img src={identity.avatar_url} alt="" referrerPolicy="no-referrer" />:<UserRound size={36}/>}</div>
        <div className="gm-profile-title">
          <span className="gm-overline">ADVENTURER PROFILE</span><h1>{identity?.display_name || text('冒險者','Adventurer')}</h1>
          <p>{showcase?.tagline || identity?.bio || text('讓能力被看見，讓合作發生。','Make skills visible. Make collaborations happen.')}</p>
          <div className="gm-tags">{(identity?.skill_tags||[]).slice(0,8).map(tag=><span key={tag}>{tag}</span>)}</div>
          <div className="gm-links">
            {showcase?.github_login && <a target="_blank" rel="noopener noreferrer" href={'https://github.com/'+encodeURIComponent(showcase.github_login)}><Github size={16}/> {showcase.github_login} <ExternalLink size={12}/></a>}
            {showcase?.forum_username && <a target="_blank" rel="noopener noreferrer" href={'https://forum.928174.xyz/user/'+encodeURIComponent(showcase.forum_username)}><MessageSquareText size={16}/> {showcase.forum_username} <ExternalLink size={12}/></a>}
          </div>
        </div>
        {viewingSelf && user && <div className="gm-profile-actions"><button type="button" className="gm-btn" onClick={() => {setDraft(showcase||emptyShowcase(user.id));setEditing(!editing);}}><Wrench size={17}/>{text('編輯展示資料','Edit profile')}</button><a href={'/adventurers/'+user.id} className="gm-link">{text('查看公開頁','View public page')} ↗</a></div>}
      </div>
      <section className="gm-stats">
        <div><Award size={21}/><small>{text('現有信譽值','Reputation')}</small><strong>{identity?.reputation_points ?? '—'}</strong><span>{text('沿用既有資料，不灌水','Existing verified source only')}</span></div>
        <div><ShieldCheck size={21}/><small>{text('已驗收任務','Verified quests')}</small><strong>{verifiedCount}</strong><span>{text('不含待驗收案件','Accepted deliveries only')}</span></div>
        <div><Coins size={21}/><small>{text('我的 G 幣','My G-Coins')}</small><strong>{viewingSelf && profile ? Number(profile.balance_g_coin).toLocaleString() : '—'}</strong><span>{text('僅本人可見，未啟用每日發幣','Private; no daily minting')}</span></div>
      </section>
      {error && <div className="gm-error" role="alert">{error}<button type="button" onClick={()=>setError('')}>×</button></div>}
      {editing && viewingSelf && draft && <section className="gm-edit">
        <h2>{text('編輯個人展示','Edit public showcase')}</h2><p>{text('GitHub 與論壇名稱為自填公開連結，尚未進行帳號所有權驗證。請勿冒用他人。','GitHub and forum handles are public, self-declared and not ownership-verified.')}</p>
        <label>{text('個人介紹','Short tagline')}<input maxLength={160} value={draft.tagline} onChange={e=>setDraft({...draft,tagline:e.target.value})} placeholder={text('你擅長什麼？想找什麼合作？','Skills and collaboration interests')}/></label>
        <div className="gm-edit-grid"><label>{text('GitHub 使用者名稱','GitHub username')}<input value={draft.github_login} onChange={e=>setDraft({...draft,github_login:e.target.value})} maxLength={39} placeholder="octocat"/></label>
          <label>{text('NodeBB 論壇名稱','Forum username')}<input value={draft.forum_username} onChange={e=>setDraft({...draft,forum_username:e.target.value})} maxLength={60} placeholder={text('論壇暱稱','Forum handle')}/></label></div>
        <button className="gm-btn" type="button" disabled={busy} onClick={()=>void saveProfile()}><Save size={17}/>{busy?text('儲存中…','Saving…'):text('儲存公開展示','Save profile')}</button>
      </section>}
      <nav className="gm-tabs" aria-label={text('會員功能','Member navigation')}>
        {([{id:'quests',zh:'我的任務',en:'My quests'},{id:'saved',zh:'感興趣',en:'Saved'},{id:'explore',zh:'探索任務',en:'Explore'},{id:'works',zh:'作品集',en:'Projects'},{id:'forum',zh:'論壇',en:'Forum'}] as {id:Tab;zh:string;en:string}[])
          .filter(x => viewingSelf || x.id==='quests' || x.id==='works' || x.id==='forum')
          .map(x=><button key={x.id} type="button" className={tab===x.id?'gm-active':''} onClick={()=>setTab(x.id)}>{en?x.en:x.zh}</button>)}
      </nav>
      {fetching && <p className="gm-loading"><LoaderCircle size={17}/> {text('更新會員資料中…','Loading account data…')}</p>}
      {tab==='quests' && <section className="gm-content"><div className="gm-section-head"><h2>{text('我的任務與合作','Quests and collaborations')}</h2><button type="button" className="gm-mini-btn" onClick={()=>void reload()}><RefreshCw size={15}/>{text('重新整理','Refresh')}</button></div>
        {quests.length ? <div className="gm-grid">{quests.map(q=>renderQuest(q))}</div> : <p className="gm-note">{text('目前沒有可展示的任務。公開頁只顯示已驗收的任務。','No quests to show. Public profiles display verified quests only.')}</p>}
        {needs.length>0 && <><h3>{text('我發布的需求','My published requests')}</h3><div className="gm-grid">{needs.map(n=>renderNeed(n))}</div></>}
        {viewingSelf && <p className="gm-note"><a href="/">{text('前往公會刊登需求或查看原有任務看板','Post a request or open the original quest board')}</a></p>}
      </section>}
      {tab==='explore' && viewingSelf && <section className="gm-content">
        <h2>{text('探索真實任務','Explore available quests')}</h2><p className="gm-note">{text('只顯示已發布的任務與需求；收藏並不代表已認領。','Only published quests and requests. Saving does not accept a task.')}</p>
        <h3>{text('有 G 幣報酬的任務','Paid quests')}</h3>{openQuests.length ? <div className="gm-grid">{openQuests.map(q=>renderQuest(q,true))}</div> : <p className="gm-note">{text('目前沒有開放任務','No available quests')}</p>}
        <h3>{text('公開需求','Public requests')}</h3>{openNeeds.length ? <div className="gm-grid">{openNeeds.map(n=>renderNeed(n,true))}</div> : <p className="gm-note">{text('目前沒有公開需求','No public requests')}</p>}
      </section>}
      {tab==='saved' && viewingSelf && <section className="gm-content">
        <h2>{text('我感興趣的任務','Saved quests')}</h2>
        {(() => { const q=savedQuestDetails;const n=savedNeedDetails;return q.length||n.length?
          <div className="gm-grid">{q.map(x=>renderQuest(x,true))}{n.map(x=>renderNeed(x,true))}</div>
          :<p className="gm-note">{text('尚無有效收藏，或原任務已不再公開。可以到「探索任務」加入收藏。','Nothing public is saved yet, or the saved task is no longer public.')}</p>; })()}
      </section>}
      {tab==='works' && <section className="gm-content">
        <div className="gm-section-head"><h2>{text('GitHub 開源作品','GitHub projects')}</h2>{showcase?.github_login && <a className="gm-link" target="_blank" rel="noopener noreferrer" href={'https://github.com/'+encodeURIComponent(showcase.github_login)+'?tab=repositories'}>{text('全部作品','All repositories')} ↗</a>}</div>
        <p className="gm-note">{text('只讀取 GitHub 已公開的儲存庫；連結為自填，尚未驗證本人身分。','Only public GitHub repositories. This user-provided handle is not ownership-verified.')}</p>
        {githubError && <p className="gm-error">{githubError}</p>}
        {displayedRepos.length ? <div className="gm-grid">{displayedRepos.map(repo=><div className="gm-card" key={repo.id}>
          <div className="gm-card-head"><strong><Github size={16}/> <a href={repo.html_url} target="_blank" rel="noopener noreferrer">{repo.name} ↗</a></strong></div>
          <p>{repo.description || text('沒有公開說明','No public description')}</p><div className="gm-repo-info">{repo.language || '—'} · ★ {repo.stargazers_count}
          {viewingSelf && <button className="gm-mini-btn" type="button" disabled={busy} onClick={()=>void togglePin(repo.name)}><Bookmark size={14} fill={showcase?.featured_repositories.includes(repo.name)?'currentColor':'none'}/>{showcase?.featured_repositories.includes(repo.name)?text('取消置頂','Unpin'):text('置頂','Pin')}</button>}</div>
        </div>)}</div>:<p className="gm-note">{showcase?.github_login?text('目前無公開作品，或已選擇的置頂作品不在最新 60 筆中。','No public repositories or selected projects are not among the latest 60.') :text('先編輯會員資料，填寫 GitHub 公開使用者名稱。','Add your public GitHub username in Edit profile.')}</p>}
      </section>}
      {tab==='forum' && <section className="gm-content">
        <h2>{text('台灣 AI 論壇貢獻','Taiwan AI Forum activity')}</h2>
        <p className="gm-note">{text('論壇由既有 NodeBB 運作。帳號名稱為會員自行填寫，尚未完成統一登入或所有權驗證。','The community runs on NodeBB. Account association is self-declared, not single sign-on or verified ownership.')}</p>
        {forum ? <div className="gm-grid"><div className="gm-card"><MessageSquareText size={22}/><strong>{forum.username}</strong><p>{text('公開文章','Public posts')}：{forum.postcount} · {text('主題','Topics')}：{forum.topiccount}</p><p>{text('論壇既有聲望（尚未計入公會信譽）','Existing forum reputation (not yet part of guild reputation)')}：{forum.reputation}</p><a href={forum.url} target="_blank" rel="noopener noreferrer">{text('前往論壇檔案','View forum profile')} ↗</a></div></div>
          :<p className="gm-note">{forumError || text('請先在編輯頁輸入論壇暱稱，或前往論壇加入討論。','Add a forum username or join the community.')}</p>}
        <a className="gm-btn" href="https://forum.928174.xyz/" target="_blank" rel="noopener noreferrer"><MessageSquareText size={17}/>{text('進入台灣 AI 論壇','Open Taiwan AI Forum')} <ExternalLink size={14}/></a>
      </section>}
      <footer className="gm-footer"><HeartHandshake size={16}/>{text('真實任務與作品才會建立信譽；不提供每日登入 G 幣。','Only real, verified contributions build reputation; no daily G-Coin reward.')}</footer>
    </div>
  </main>;
}
