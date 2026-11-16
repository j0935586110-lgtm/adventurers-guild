import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { supabase, isGoogleSignInReady } from '../lib/supabase';
import { useGuild } from './GuildProvider';
import './guild-home.css';

type AuthorizationDetails = {
  authorization_id: string;
  client: { name?: string };
  scope?: string;
  redirect_uri?: string;
};

export default function OAuthConsent() {
  const { user, loading: sessionLoading, signIn, signUp, signInWithGoogle, sendEmailLoginLink } = useGuild();
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id') || '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  useEffect(() => { let active=true;void isGoogleSignInReady().then(ready=>{if(active)setGoogleReady(ready);});return ()=>{active=false;}; },[]);
  async function sendLink() {
    if(!email.trim()){setError('請先填寫 Email。');return;}
    setBusy(true);setError('');setEmailSent(false);
    try {
      const result=await sendEmailLoginLink(email.trim());
      if(result.error)setError(result.error);
      else setEmailSent(true);
    } finally {setBusy(false);}
  }

  const retrieve = useCallback(async () => {
    if (!authorizationId || !user) return;
    setError('');
    const { data, error: detailError } =
      await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (detailError || !data) {
      setError(detailError?.message ?? '授權請求不存在或已失效。');
      return;
    }
    // Previously approved: let Supabase determine the original redirect.
    if ('redirect_url' in data && !('authorization_id' in data)) {
      window.location.assign(data.redirect_url);
      return;
    }
    if ('authorization_id' in data) setDetails(data as AuthorizationDetails);
  }, [authorizationId, user?.id]);

  useEffect(() => { if (!sessionLoading) void retrieve(); }, [retrieve, sessionLoading]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
      } else {
        const alias = nickname.trim() || '冒險者-' + crypto.randomUUID().slice(0, 6);
        const result = await signUp(email, password, alias);
        if (result.error) setError(result.error);
        else if (result.confirmationRequired)
          setError('已寄出驗證信。請確認信箱後重新開啟授權連結。');
      }
    } finally {setBusy(false);}
  }

  async function decide(allow: boolean) {
    if (!authorizationId) return;
    setBusy(true); setError('');
    try {
      const result = allow
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      if (result.error) {
        setError(result.error.message);return;
      }
      if (!result.data?.redirect_url) throw new Error('未取得授權回傳網址');
      // URL comes from the authorization server, never an arbitrary query param.
      window.location.assign(result.data.redirect_url);
    } catch (err) {setError(err instanceof Error ? err.message : '授權失敗');}
    finally {setBusy(false);}
  }

  return <div className="gh-site" style={{minHeight:'100vh',background:'#F8F7F2',display:'grid',placeItems:'center',padding:'24px'}}>
    <div className="gh-dialog" style={{width:'min(100%,540px)',maxHeight:'none',boxShadow:'0 20px 60px #123e3420'}}>
      <div className="gh-dialog-eyebrow">ADVENTURERS GUILD · CONNECT</div>
      <h1 className="gh-dialog-title">連接你的冒險者公會</h1>
      <p className="gh-dialog-sub">每個 AI 都需要經過你同意才能代表你操作帳號。請先確認應用程式與權限。</p>
      {!authorizationId
        ? <div className="gh-notice gh-notice-error">缺少授權識別碼。請回 ChatGPT／Claude 重新開始連接。</div>
        : sessionLoading
        ? <p>正在確認登入狀態…</p>
        : !user
        ? <>
          {googleReady && <>
            <button type="button" className="gh-google" onClick={async()=>{
              const result=await signInWithGoogle();
              if(result.error)setError(result.error);
            }}>用 Google 登入／加入</button>
            <div className="gh-separator"><span>或用 Email</span></div>
          </>}
          {!googleReady && <p className="gh-oauth-pending">Google 登入目前尚未在公會啟用，可用 Email 登入連結或密碼繼續。</p>}
          <form className="gh-form" onSubmit={authenticate}>
            {mode === 'signup' && <label>個人暱稱（選填）<input maxLength={80} value={nickname} onChange={e=>setNickname(e.target.value)}/></label>}
            <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
            <button type="button" className="gh-email-link-btn" disabled={busy} onClick={()=>void sendLink()}>寄送 Email 一鍵登入連結 <ArrowRight size={16}/></button>
            {emailSent&&<p className="gh-notice gh-notice-success">登入連結已寄出。請在同一台裝置開啟信件，回到這個授權畫面繼續。</p>}
            <div className="gh-separator"><span>或使用密碼</span></div>
            <label>密碼<input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'}/></label>
            {error && <p className="gh-notice gh-notice-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="gh-primary gh-wide">{busy?'處理中…':mode==='login'?'登入後繼續':'免費加入後繼續'}<ArrowRight size={16}/></button>
          </form>
          <button type="button" className="gh-text-switch" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'沒有帳號？免費加入':'已有帳號？登入'}</button>
        </>
        : details
        ? <>
          <div style={{background:'#EFF5EF',padding:20,borderRadius:12,margin:'20px 0'}}>
            <p style={{fontSize:13,margin:'0 0 12px'}}>已登入冒險者公會</p>
            <p style={{fontWeight:800,marginBottom:16}}>外部應用程式：{details.client?.name || '未知客戶端'}</p>
            <p style={{fontSize:13,wordBreak:'break-all'}}>要求的授權範圍：{details.scope || '未提供'}</p>
            <p style={{fontSize:12,color:'#68857A',wordBreak:'break-all',marginTop:12}}>回傳網址：{details.redirect_uri || '未提供'}</p>
          </div>
          <p style={{fontSize:12,color:'#698378',lineHeight:1.8}}>
            你可以隨時撤銷授權。授權不代表允許付款、控制電腦或存取其他會員私密資料。
          </p>
          {error&&<div className="gh-notice gh-notice-error" role="alert">{error}</div>}
          <button type="button" disabled={busy} className="gh-primary gh-wide" onClick={()=>void decide(true)}><ShieldCheck size={18}/>{busy?'處理中…':'同意連接'}</button>
          <button type="button" disabled={busy} className="gh-google" style={{marginTop:12}} onClick={()=>void decide(false)}><X size={18}/>拒絕授權</button>
        </>
        : <div>{error ? <div role="alert" className="gh-notice gh-notice-error">{error}</div> : '正在讀取授權請求…'}</div>}
      <div style={{display:'flex',alignItems:'center',gap:7,color:'#78968A',fontSize:12,marginTop:24}}><LockKeyhole size={15}/> 由 Supabase Auth 2.1 驗證，不交出帳號密碼給 AI。</div>
    </div>
  </div>;
}
