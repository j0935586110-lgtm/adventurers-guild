import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe2, X } from 'lucide-react';
import { useGuild } from './GuildProvider';
import { isGoogleSignInReady } from '../lib/supabase';
import './guild-home.css';

export const AuthLanguageContext = React.createContext<'zh'|'en'>('zh');
function useTx(){const lang=React.useContext(AuthLanguageContext);return (zh:string,en:string)=>lang==='en'?en:zh;}

function Overlay({children, close, title}: {children:React.ReactNode; close:()=>void; title:string}) {
  const tx=useTx();
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    document.addEventListener('keydown',onKey);
    return ()=>document.removeEventListener('keydown',onKey);
  },[close]);
  return <div className="gh-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)close();}}>
    <div className="gh-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="gh-dialog-close" onClick={close} aria-label={tx("關閉","Close")}><X size={21}/></button>
      {children}
    </div>
  </div>;
}
function Notice({message, type='info'}: {message:string;type?:'info'|'error'|'success'}) {
  return <div role="status" className={'gh-notice gh-notice-'+type}>{message}</div>;
}
export function GuildAuthDialog({onClose}:{onClose:()=>void}) {
  const tx=useTx();
  const {signIn, signUp, signInWithGoogle, sendEmailLoginLink} = useGuild();
  const [mode,setMode] = useState<'signup'|'login'>('signup');
  const [alias,setAlias] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [confirmed,setConfirmed] = useState(false);
  const [googleReady,setGoogleReady] = useState(false);
  useEffect(()=>{ let live=true; void isGoogleSignInReady().then(ready=>{ if(live)setGoogleReady(ready); }); return ()=>{live=false;}; },[]);
  async function sendLoginLink() {
    if(!email.trim()){setMessage(tx('請先填寫電子信箱。','Enter your email address first.'));return;}
    setBusy(true);setMessage('');setConfirmed(false);
    try {
      const result=await sendEmailLoginLink(email.trim());
      if(result.error)setMessage(result.error);
      else {setConfirmed(true);setMessage(tx('已寄送登入連結。請在同一台裝置開啟信件完成登入。','Login link sent. Open the email on this device to sign in.'));}
    } catch(e) {setMessage(e instanceof Error?e.message:tx('寄送失敗','Unable to send link'));}
    finally {setBusy(false);}
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setBusy(true);setMessage('');setConfirmed(false);
    try {
      const res = mode==='signup'
        ? await signUp(email,password,alias.trim() || '冒險者-'+crypto.randomUUID().slice(0,6))
        : await signIn(email,password);
      if (res.error) setMessage(res.error);
      else if (res.confirmationRequired) {setConfirmed(true);setMessage('已寄出驗證信，請打開信箱確認後再登入。');}
      else onClose();
    } catch(err) {setMessage(err instanceof Error?err.message:'登入發生問題');}
    finally {setBusy(false);}
  }
  return <Overlay title={tx("加入冒險者公會","Join Adventurers Guild")} close={onClose}>
    <div className="gh-dialog-eyebrow">WELCOME TO GUILD</div>
    <h2 className="gh-dialog-title">{mode==='signup'?tx('免費加入，開始你的下一個機會。','Join for free and get started.'):tx('歡迎回來！','Welcome back!')}</h2>
    <p className="gh-dialog-sub">{tx("不需公司、不需統編。每個人都能分享自己的技能。","No company needed. Everyone can share their skills.")}</p>
    {googleReady ? <>
      <button className="gh-google" type="button" disabled={busy} onClick={async()=>{
        setMessage('');setBusy(true);
        try{const result=await signInWithGoogle();if(result.error)setMessage(result.error);}
        catch(err){setMessage(err instanceof Error?err.message:tx('Google 登入暫時無法使用','Google sign-in is temporarily unavailable'));}
        finally{setBusy(false);}
      }}><Globe2 size={18}/> {tx('Google 一鍵登入','Continue with Google')}</button>
      <div className="gh-separator"><span>{tx('或使用 Email','Or use email')}</span></div>
    </> : <p className="gh-oauth-pending">{tx('Google 登入尚待官方授權設定，現在可使用 Email 登入連結。','Google sign-in is not configured yet. Use an email login link for now.')}</p>}
    <form className="gh-form" onSubmit={submit}>
      {mode==='signup'&&<label>{tx("你的暱稱（選填）","Your name (optional)")}<input value={alias} maxLength={80} onChange={e=>setAlias(e.target.value)} placeholder={tx("例如：小安設計師","e.g. Alex the designer")}/></label>}
      <label>{tx("電子信箱","Email address")}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <button type="button" className="gh-email-link-btn" disabled={busy} onClick={()=>void sendLoginLink()}>{tx('寄送 Email 一鍵登入連結','Email me a sign-in link')} <ArrowRight size={16}/></button>
      <div className="gh-separator"><span>{tx('或使用密碼','Or sign in with password')}</span></div>
      <label>{tx("密碼","Password")}<input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={tx("至少 6 個字元","At least 6 characters")}/></label>
      {message&&<Notice type={confirmed?'success':'error'} message={message}/>}
      <button className="gh-primary gh-wide" disabled={busy} type="submit">{busy?tx('處理中…','Working…'):mode==='signup'?tx('建立免費帳號','Create a free account'):tx('登入公會','Sign in')}<ArrowRight size={17}/></button>
    </form>
    <button type="button" className="gh-text-switch" onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('');}}>
      {mode==='signup'?tx('已經是會員？登入帳號','Already have an account? Sign in'):tx('還沒有帳號？免費加入','New here? Join for free')}
    </button>
  </Overlay>;
}
