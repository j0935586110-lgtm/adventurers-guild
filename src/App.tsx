import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sword, Coins, Award, Plus, Map as MapIcon, User as UserIcon, CheckCircle2, Clock, AlertCircle, FileText, LogOut, ChevronRight, ShieldCheck, Star, Globe } from 'lucide-react';
import { supabase } from './lib/supabase';
import { GuildProvider, useGuild } from './components/GuildProvider';

// --- Types ---
interface Quest {
  id: string;
  title: string;
  description: string;
  reward_g_coin: number;
  client_id: string;
  adventurer_id: string | null;
  status: string;
  created_at: string;
  category: string;
  client?: { display_name: string; reputation_points: number };
  adventurer?: { display_name: string; reputation_points: number };
}

// --- Navbar ---
function Navbar() {
  const { profile, signOut, signInWithGoogle } = useGuild();
  const { t, i18n } = useTranslation();
  if (!profile) return null;
  return (
    <nav className="border-b border-[#3d3428] bg-[#1a1612]/80 backdrop-blur-md sticky top-0 z-50 px-8 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#d4af37] bg-[#2a241d] flex items-center justify-center font-serif text-xl text-[#d4af37] glow-gold">G</div>
          <h1 className="font-serif text-2xl font-bold tracking-[0.2em] text-[#d4af37] glow-gold">{t('app_title')}</h1>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6 text-sm font-mono">
            <div className="flex flex-col items-center">
              <span className="text-[10px] opacity-40 uppercase tracking-tighter">{t('gold_balance')}</span>
              <span className="text-lg font-bold g-coin glow-gold">{profile.balance_g_coin} G</span>
            </div>
            <div className="h-8 w-px bg-[#3d3428]"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] opacity-40 uppercase tracking-tighter">{t('reputation')}</span>
              <span className="text-lg font-bold">{profile.reputation_points}</span>
            </div>
            <div className="h-8 w-px bg-[#3d3428]"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] opacity-40 uppercase tracking-tighter">{t('guild_rank')}</span>
              <span className="text-lg font-serif italic text-[#d4af37] glow-gold">{profile.rank}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center justify-center w-10 h-10 bg-[#3d3428] rounded cursor-pointer hover:bg-[#4d4438] transition-colors">
                <Globe size={18} className="text-[#e0d5c1]" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 bg-[#1a1612] border border-[#3d3428] rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col">
                <button onClick={() => i18n.changeLanguage('zh-TW')} className="px-4 py-2 text-left text-sm hover:bg-[#3d3428] transition-colors">{t('zh-TW')}</button>
                <button onClick={() => i18n.changeLanguage('zh-CN')} className="px-4 py-2 text-left text-sm hover:bg-[#3d3428] transition-colors">{t('zh-CN')}</button>
                <button onClick={() => i18n.changeLanguage('en')} className="px-4 py-2 text-left text-sm hover:bg-[#3d3428] transition-colors">{t('en')}</button>
              </div>
            </div>
            <button onClick={signOut} className="w-10 h-10 bg-[#3d3428] rounded flex items-center justify-center cursor-pointer hover:bg-[#4d4438] transition-colors">
              <LogOut size={18} className="text-[#e0d5c1]" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// --- QuestCard ---
function QuestCard({ quest, onSelect }: { quest: Quest; onSelect: (q: Quest) => void }) {
  const { profile } = useGuild();
  const { t } = useTranslation();
  const isPoster = profile?.id === quest.client_id;
  const isTaker = profile?.id === quest.adventurer_id;

  const statusColors: Record<string, string> = {
    posted: 'border-[#d4af37]/40 text-[#d4af37] bg-[#d4af37]/5',
    accepted: 'border-blue-500/40 text-blue-400 bg-blue-500/5',
    submitted: 'border-purple-500/40 text-purple-400 bg-purple-500/5',
    verified: 'border-neutral-500/40 text-neutral-400 bg-neutral-500/5',
    canceled: 'border-red-500/40 text-red-400 bg-red-500/5',
    disputed: 'border-orange-500/40 text-orange-400 bg-orange-500/5',
    expired: 'border-stone-500/40 text-stone-400 bg-stone-500/5',
  };

  return (
    <motion.div layout whileHover={{ scale: 1.02 }} onClick={() => onSelect(quest)}
      className="fantasy-card p-5 cursor-pointer group hover:border-[#d4af37] transition-colors">
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border ${statusColors[quest.status] || statusColors.posted}`}>
          {t(quest.status)}
        </span>
        <div className="text-sm g-coin font-bold font-mono glow-gold">{quest.reward_g_coin} G</div>
      </div>
      <h3 className="font-bold text-lg mb-2 group-hover:text-[#d4af37] transition-colors">{quest.title}</h3>
      <p className="text-[#e0d5c1]/60 text-xs line-clamp-1 mb-4">{quest.description}</p>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#3d3428]">
        <div className="text-[9px] opacity-40 font-mono uppercase tracking-widest leading-none">
          {!profile ? 'LOGIN TO ACCEPT' : isPoster ? t('commissioned_by_you') : isTaker ? t('your_current_job') : t('open_contract')}
        </div>
        <ChevronRight size={14} className="text-[#3d3428] group-hover:text-[#d4af37] transition-colors" />
      </div>
    </motion.div>
  );
}

// --- PostQuestModal ---
function PostQuestModal({ isOpen, onClose, onPosted }: { isOpen: boolean; onClose: () => void; onPosted: () => void }) {
  const { profile } = useGuild();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ title: '', description: '', reward: 10, category: 'daily' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_quest_escrow', {
        p_client_id: profile.id,
        p_idempotency_key: crypto.randomUUID(),
        p_reward: formData.reward,
        p_title: formData.title,
        p_description: formData.description,
        p_category: formData.category,
      });
      if (error) { alert(error.message); return; }
      (window as any).__guildRefreshProfile?.();
      onClose();
      onPosted();
      setFormData({ title: '', description: '', reward: 10, category: 'daily' });
    } catch (err: any) { alert(err.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1612] max-w-lg w-full p-8 border border-[#d4af37]/40 immersive-shadow parchment-bg">
        <h2 className="font-serif text-2xl font-bold mb-8 text-[#d4af37] glow-gold flex items-center gap-3">
          <FileText size={24} />{t('post_commission')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('quest_title')}</label>
            <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm"
              placeholder={t('placeholder_title')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('description')}</label>
            <textarea required rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm leading-relaxed"
              placeholder={t('placeholder_desc')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('reward')}</label>
              <input type="number" min="1" required value={formData.reward} onChange={e => setFormData({ ...formData, reward: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('category')}</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm appearance-none">
                <option value="daily">{t('daily')}</option>
                <option value="gathering">{t('gathering')}</option>
                <option value="combat">{t('combat')}</option>
                <option value="magic_tech">{t('magic_tech')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
          </div>
          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-[#3d3428] text-neutral-500 font-serif hover:bg-[#2a241d] transition-colors">{t('cancel')}</button>
            <button type="submit" disabled={submitting} className="flex-1 fantasy-button">{submitting ? t('posting') : t('dispatch_quest')}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- QuestDetails ---
function QuestDetails({ quest, onClose, onUpdated }: { quest: Quest; onClose: () => void; onUpdated: () => void }) {
  const { profile } = useGuild();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const isPoster = profile?.id === quest.client_id;
  const isTaker = profile?.id === quest.adventurer_id;

  const handleAccept = async () => {
    if (!profile) return; setProcessing(true);
    const { error } = await supabase.rpc('accept_quest', { p_adventurer_id: profile.id, p_quest_id: quest.id });
    if (error) alert(error.message); else { onUpdated(); onClose(); }
    setProcessing(false);
  };
  const handleSubmit = async () => {
    if (!profile) return; setProcessing(true);
    const { error } = await supabase.rpc('submit_quest_proof', { p_adventurer_id: profile.id, p_quest_id: quest.id });
    if (error) alert(error.message); else { onUpdated(); onClose(); }
    setProcessing(false);
  };
  const handleRelease = async () => {
    if (!profile) return; setProcessing(true);
    const { error } = await supabase.rpc('release_quest_escrow', { p_client_id: profile.id, p_quest_id: quest.id });
    if (error) alert(error.message); else { (window as any).__guildRefreshProfile?.(); onUpdated(); onClose(); }
    setProcessing(false);
  };
  const handleCancel = async () => {
    if (!profile) return; setProcessing(true);
    const { error } = await supabase.rpc('cancel_quest_escrow', { p_client_id: profile.id, p_quest_id: quest.id });
    if (error) alert(error.message); else { (window as any).__guildRefreshProfile?.(); onUpdated(); onClose(); }
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div layoutId={quest.id} className="bg-[#1a1612] max-w-2xl w-full p-10 border-4 border-[#3d3428] parchment-bg immersive-shadow">
        <div className="flex justify-between items-end mb-8 border-b border-[#3d3428] pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[#d4af37] font-mono text-xs opacity-60">#QUEST-{quest.id.slice(-6).toUpperCase()}</span>
            </div>
            <h2 className="text-3xl font-bold leading-tight">{quest.title}</h2>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-40 uppercase tracking-widest mb-1">{t('contractor')}</div>
            <div className="font-bold text-[#e0d5c1]">{quest.client?.display_name || '...'}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="p-4 bg-[#2a241d] border border-[#3d3428]">
            <span className="text-[10px] opacity-40 block mb-1 uppercase tracking-widest">{t('reward')}</span>
            <span className="text-2xl g-coin glow-gold font-mono">{quest.reward_g_coin} G</span>
          </div>
          <div className="p-4 bg-[#2a241d] border border-[#3d3428]">
            <span className="text-[10px] opacity-40 block mb-1 uppercase tracking-widest">{t('category')}</span>
            <span className="text-xl text-[#e0d5c1] font-serif uppercase tracking-widest">{t(quest.category)}</span>
          </div>
          <div className="p-4 bg-[#2a241d] border border-[#3d3428]">
            <span className="text-[10px] opacity-40 block mb-1 uppercase tracking-widest">{t('status')}</span>
            <span className="text-xl text-[#d4af37] uppercase font-serif tracking-widest">{t(quest.status)}</span>
          </div>
        </div>
        <div className="bg-[#000000]/40 p-6 border-l-4 border-[#d4af37] mb-8">
          <h4 className="text-white font-bold mb-3 uppercase text-xs tracking-widest">{t('quest_desc')}</h4>
          <p className="text-[#e0d5c1]/80 leading-relaxed text-sm italic">{quest.description}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} className="px-8 py-4 border border-[#3d3428] text-white font-serif tracking-widest hover:bg-[#2a241d] transition-all">{t('dismiss')}</button>
          {quest.status === 'posted' && !isPoster && (
            <button disabled={processing} onClick={handleAccept} className="flex-1 fantasy-button">{processing ? '...' : t('accept_quest')}</button>
          )}
          {quest.status === 'accepted' && isTaker && (
            <button disabled={processing} onClick={handleSubmit} className="flex-1 fantasy-button">{t('report_completion')}</button>
          )}
          {quest.status === 'submitted' && isPoster && (
            <button disabled={processing} onClick={handleRelease} className="flex-1 fantasy-button">{t('confirm_pay')}</button>
          )}
          {(quest.status === 'posted' || quest.status === 'accepted') && isPoster && (
            <button disabled={processing} onClick={handleCancel} className="flex-1 py-3 border border-red-500/40 text-red-400 font-serif hover:bg-red-500/10 transition-colors">{t('cancel')}</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- AuthForm ---
function AuthForm({ onGuest }: { onGuest: () => void }) {
  const { signIn, signUp, signInWithGoogle } = useGuild();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg('');
    let result;
    if (mode === 'login') result = await signIn(email, password);
    else result = await signUp(email, password, name || email.split('@')[0]);
    if (result?.error) setMsg(result.error);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0f0d0b] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[120px]" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-[#1a1612] border-4 border-[#d4af37] rounded-full shadow-[0_0_50px_rgba(212,175,55,0.2)]">
            <Sword size={48} className="text-[#d4af37] glow-gold" />
          </div>
          <h1 className="font-serif text-4xl font-bold tracking-[0.2em] text-[#d4af37] glow-gold">{t('app_title')}</h1>
        </div>
        {/* Google Sign In */}
        <button onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-4 border-2 border-[#3d3428] bg-[#1a1612] text-[#e0d5c1] font-serif tracking-widest hover:border-[#d4af37] hover:text-[#d4af37] transition-all text-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {t('google_sign_in')}
        </button>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[#3d3428]"></div>
          <span className="text-[10px] text-[#e0d5c1]/30 font-mono uppercase tracking-widest">OR</span>
          <div className="flex-1 h-px bg-[#3d3428]"></div>
        </div>
        <form onSubmit={submit} className="bg-[#1a1612] border border-[#3d3428] p-8 space-y-5">
          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('display_name')}</label>
              <input required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm"
                placeholder="Guild Name" />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('email')}</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{t('password')}</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm" />
          </div>
          {msg && <div className="text-red-400 text-xs font-mono text-center">{msg}</div>}
          <button type="submit" className="w-full fantasy-button py-4 text-lg">{mode === 'login' ? t('sign_in') : t('sign_up')}</button>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="w-full text-xs text-[#e0d5c1]/40 font-mono uppercase tracking-widest hover:text-[#d4af37] transition-colors">
            {mode === 'login' ? t('no_account') : t('have_account')}
          </button>
        </form>
        {/* Guest mode */}
        <button onClick={onGuest}
          className="w-full text-center text-xs text-[#e0d5c1]/25 font-mono uppercase tracking-[0.3em] hover:text-[#d4af37]/50 transition-colors py-2">
          {t('guest_browse')}
        </button>
      </motion.div>
    </div>
  );
}

// --- MainApp ---
function MainApp() {
  const { profile, loading } = useGuild();
  const { t } = useTranslation();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'my-quests' | 'my-jobs'>('board');
  const [isGuest, setIsGuest] = useState(false);

  const loadQuests = useCallback(async () => {
    const { data } = await supabase.from('quests').select(`
      *,
      client:users!quests_client_id_fkey(display_name, reputation_points),
      adventurer:users!quests_adventurer_id_fkey(display_name, reputation_points)
    `).order('created_at', { ascending: false });
    if (data) setQuests(data as Quest[]);
  }, []);

  useEffect(() => { if (profile || isGuest) loadQuests(); }, [profile, isGuest, loadQuests]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0d0b]">
      <div className="font-serif text-2xl text-[#d4af37] glow-gold animate-pulse tracking-widest">{t('summoning')}</div>
    </div>
  );
  if (!profile && !isGuest) return <AuthForm onGuest={() => setIsGuest(true)} />;

  const filtered = quests.filter(q => {
    if (!profile && activeTab !== 'board') return false; // guest can only see board
    if (activeTab === 'board') return q.status === 'posted';
    if (activeTab === 'my-quests') return q.client_id === profile?.id;
    if (activeTab === 'my-jobs') return q.adventurer_id === profile?.id;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#0f0d0b]">
      {profile ? <Navbar /> : (
        <nav className="border-b border-[#3d3428] bg-[#1a1612]/80 backdrop-blur-md sticky top-0 z-50 px-8 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#d4af37] bg-[#2a241d] flex items-center justify-center font-serif text-xl text-[#d4af37] glow-gold">G</div>
              <h1 className="font-serif text-2xl font-bold tracking-[0.2em] text-[#d4af37] glow-gold">{t('app_title')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]/50 border border-[#d4af37]/30 px-3 py-1">{t('guest_badge')}</span>
              <button onClick={() => window.location.reload()} className="fantasy-button text-xs px-4 py-2">{t('sign_in')}</button>
            </div>
          </div>
        </nav>
      )}
      <main className="flex-1 max-w-7xl w-full mx-auto flex gap-12 p-12">
        <aside className="w-80 space-y-8 shrink-0">
          <div className="p-6 border border-[#3d3428] bg-[#1a1612]/40 rounded-sm">
            <h2 className="font-serif text-[#d4af37] text-sm tracking-[0.3em] mb-6 glow-gold">{t('guild_board')}</h2>
            <nav className="space-y-2">
              {[
                { id: 'board', label: t('the_market'), icon: <MapIcon size={16} />, show: true },
                { id: 'my-quests', label: t('commissions'), icon: <FileText size={16} />, show: !!profile },
                { id: 'my-jobs', label: t('current_jobs'), icon: <Sword size={16} />, show: !!profile },
              ].filter(tab => tab.show).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-4 px-4 py-3 font-serif text-sm tracking-widest transition-all border ${activeTab === tab.id ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'text-[#e0d5c1]/40 border-transparent hover:border-[#3d3428] hover:text-[#e0d5c1]'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </nav>
          </div>
          {profile ? (
          <button onClick={() => setIsPosting(true)}
            className="w-full fantasy-button flex items-center justify-center gap-3 py-4 text-lg">
            <Plus size={20} />{t('post_commission')}
          </button>
          ) : (
          <div className="text-center text-[10px] text-[#e0d5c1]/20 font-mono uppercase tracking-widest py-4 border border-[#3d3428]/30">
            {t('login_required')}
          </div>
          )}
        </aside>
        <section className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {filtered.map(q => <QuestCard key={q.id} quest={q} onSelect={setSelectedQuest} />)}
            </AnimatePresence>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-[#e0d5c1]/30 font-serif text-lg tracking-widest">{t('no_quests')}</div>
          )}
        </section>
      </main>
      <AnimatePresence>
        {isPosting && <PostQuestModal isOpen={isPosting} onClose={() => setIsPosting(false)} onPosted={loadQuests} />}
        {selectedQuest && <QuestDetails quest={selectedQuest} onClose={() => setSelectedQuest(null)} onUpdated={loadQuests} />}
      </AnimatePresence>
    </div>
  );
}

// --- Root ---
export default function App() {
  return (
    <GuildProvider>
      <MainApp />
    </GuildProvider>
  );
}
