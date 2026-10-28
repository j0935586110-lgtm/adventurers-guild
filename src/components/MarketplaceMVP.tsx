import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store,
  Search,
  Plus,
  MapPin,
  Send,
  Inbox,
  Star,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Tag,
  FileText,
  RefreshCw,
  X,
} from 'lucide-react';
import { useGuild } from './GuildProvider';
import {
  SERVICE_CATEGORIES,
  TAIWAN_CITIES,
  searchServices,
  fetchPublicReviewStats,
  type PublicReviewStats,
  listMyServices,
  listIncomingInquiries,
  listOutgoingInquiries,
  publishService,
  sendInquiry,
  quoteInquiry,
  confirmInquiryCompleted,
  createReview,
  formatTwd,
  type GuildService,
  type InquiryStatus,
  type InquiryWithService,
} from '../lib/marketplace';

// The marketplace MVP is Traditional Chinese only (the SQL/RLS worker owns the
// schema; UI copy is not part of the i18n resource file yet).
type MarketTab = 'search' | 'mine' | 'incoming' | 'outgoing';

const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  requested: '已送出詢價',
  quoted: '服務方已報價',
  completed: '已完成',
};

const INQUIRY_STATUS_STYLE: Record<InquiryStatus, string> = {
  requested: 'border-[#d4af37]/40 text-[#d4af37] bg-[#d4af37]/5',
  quoted: 'border-blue-500/40 text-blue-300 bg-blue-500/5',
  completed: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5',
};

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '發生未知錯誤，請稍後再試。';
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">{children}</label>;
}

const inputClass =
  'w-full bg-[#0f0d0b] border border-[#3d3428] p-3 text-[#e0d5c1] focus:border-[#d4af37] outline-none text-sm';

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-[#e0d5c1]/50 text-sm font-mono">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-500/40 bg-red-500/5 p-4 text-xs text-red-300 flex items-start gap-3">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 text-red-200/70 hover:text-red-200 underline">
          重試
        </button>
      )}
    </div>
  );
}

function EmptyBox({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-14 border border-dashed border-[#3d3428]">
      <p className="font-serif text-lg tracking-widest text-[#e0d5c1]/40">{title}</p>
      {hint && <p className="mt-2 text-xs text-[#e0d5c1]/30">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inquiry composer modal
// ---------------------------------------------------------------------------

function InquiryModal({
  service,
  onClose,
  onSent,
}: {
  service: GuildService;
  onClose: () => void;
  onSent: () => void;
}) {
  const { user } = useGuild();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('請先登入才能送出詢價。');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendInquiry({ serviceId: service.id, requesterId: user.id, message });
      onSent();
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1612] max-w-lg w-full p-6 sm:p-8 border border-[#d4af37]/40 immersive-shadow"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">送出詢價</p>
            <h3 className="font-serif text-xl text-[#d4af37] glow-gold leading-snug">{service.title}</h3>
            <p className="text-xs text-[#e0d5c1]/50 mt-2">
              {service.business_name} · {service.city} · {formatTwd(service.price_from_twd)}
            </p>
          </div>
          <button onClick={onClose} className="text-[#e0d5c1]/40 hover:text-[#e0d5c1]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <FieldLabel>詢價內容（需求、時間、地點）</FieldLabel>
            <textarea
              required
              rows={5}
              maxLength={1000}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className={inputClass + ' leading-relaxed'}
              placeholder="例如：想詢問 3 月初整理兩房約 20 坪，請問可否到府估價？"
            />
            <p className="text-[10px] text-[#e0d5c1]/30 mt-2">最多 1000 字。送出後由服務方報價。</p>
          </div>
          {error && <ErrorBox message={error} />}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-[#3d3428] text-neutral-500 font-serif hover:bg-[#2a241d] transition-colors"
            >
              取消
            </button>
            <button type="submit" disabled={sending} className="flex-1 fantasy-button">
              {sending ? '送出中…' : '送出詢價'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Publish service form
// ---------------------------------------------------------------------------

function PublishServiceForm({ onPublished }: { onPublished: () => void }) {
  const { user, profile } = useGuild();
  const displayName = (profile?.display_name || user?.user_metadata?.guild_nickname || `冒險者-${user?.id.slice(0, 6) ?? '個人'}`).toString().trim();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '其他',
    city: '',
    price: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('請先登入才能發布服務。');
      return;
    }
    setSubmitting(true);
    setError('');
    setDone(false);
    try {
      const parsed = form.price.trim() === '' ? null : Number(form.price);
      if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
        throw new Error('起始價必須是 0 或正整數（TWD）。');
      }
      await publishService(user.id, {
        businessName: displayName,
        title: form.title,
        description: form.description,
        category: form.category,
        city: form.city,
        priceFromTwd: parsed === null ? null : Math.round(parsed),
      });
      setForm({
        title: '',
        description: '',
        category: '其他',
        city: '',
        price: '',
      });
      setDone(true);
      onPublished();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-[#3d3428] bg-[#1a1612]/60 p-5 sm:p-6 space-y-5">
      <h3 className="font-serif text-[#d4af37] tracking-widest text-sm glow-gold flex items-center gap-2">
        <Plus size={16} /> 刊登我的能力／服務
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>我的顯示名稱</FieldLabel>
          <p className="p-3 text-sm text-[#d4af37] border border-[#3d3428]">{displayName}</p>
        </div>
        <div>
          <FieldLabel>我能提供什麼服務？</FieldLabel>
          <input
            required
            maxLength={120}
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            placeholder="例如：雙北兩房深層清潔"
          />
        </div>
         <div>
          <FieldLabel>服務地區</FieldLabel>
          <select required
            value={form.city}
            onChange={e => setForm({ ...form, city: e.target.value })}
            className={inputClass + ' appearance-none'}
          >
            <option value="" disabled>請選擇地區</option>
            {TAIWAN_CITIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>簡單說明（服務內容與限制）</FieldLabel>
        <textarea
          required
          rows={4}
          maxLength={2000}
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className={inputClass + ' leading-relaxed'}
          placeholder="服務內容、作業時間、含哪些項目、不含哪些項目…"
        />
      </div>
      <details className="border border-[#3d3428] p-3 text-sm text-[#e0d5c1]/80">
        <summary className="cursor-pointer">更多設定（選填：分類、價格）</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div>
            <FieldLabel>服務分類</FieldLabel>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>參考起始價（新台幣）</FieldLabel>
            <input type="number" min="0" step="1" value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className={inputClass} placeholder="留空表示另議" />
          </div>
        </div>
      </details>
      <button type="submit" disabled={submitting} className="w-full fantasy-button py-3">
        {submitting ? '發布中…' : '免費刊登'}
      </button>
      {error && <ErrorBox message={error} />}
      {done && (
        <div className="flex items-center gap-2 text-xs text-emerald-300 border border-emerald-500/40 bg-emerald-500/5 p-3">
          <CheckCircle2 size={14} /> 服務已發布，已公開在服務市場。
        </div>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function ServiceCard({
  service,
  isOwn,
  onInquire,
  signedIn,
  reviewStats,
}: {
  service: GuildService;
  isOwn: boolean;
  onInquire: (service: GuildService) => void;
  signedIn: boolean;
  reviewStats?: PublicReviewStats;
}) {
  return (
    <motion.div layout className="fantasy-card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border border-[#d4af37]/40 text-[#d4af37] bg-[#d4af37]/5">
          {service.category}
        </span>
        <span className="text-sm font-mono text-[#ffd700]">{formatTwd(service.price_from_twd)}</span>
      </div>
      <h3 className="font-bold text-lg leading-snug mb-2">{service.title}</h3>
      <p className="text-xs text-[#e0d5c1]/60 line-clamp-2 mb-3">{service.description}</p>
      <div className="mt-auto space-y-3 pt-3 border-t border-[#3d3428]">
        <div className="flex items-center justify-between text-[11px] text-[#e0d5c1]/60">
          <span className="flex items-center gap-1.5 min-w-0">
            <Store size={12} className="shrink-0" />
            <span className="truncate">{service.business_name}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <MapPin size={12} />
            {service.city}
          </span>
        </div>
        <div className="text-[11px] text-[#e0d5c1]/55 flex gap-1.5 items-center">
          <Star size={12} />
          {reviewStats?.count
            ? `${reviewStats.average.toFixed(1)} / 5（${reviewStats.count} 筆買家確認評價）`
            : '尚無交易後評價'}
        </div>
        {isOwn ? (
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]/60 text-center py-2 border border-[#d4af37]/20">
            你的服務
          </div>
        ) : signedIn ? (
          <button onClick={() => onInquire(service)} className="w-full fantasy-button py-2 text-xs flex items-center justify-center gap-2">
            <Send size={13} /> 送出詢價
          </button>
        ) : (
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#e0d5c1]/25 text-center py-2 border border-[#3d3428]/50">
            登入後才能詢價
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InquiryCard({
  inquiry,
  mode,
  quoteDraft,
  onQuoteDraft,
  onQuote,
  reviewing,
  onConfirm,
  ratingDraft,
  onRatingDraft,
  commentDraft,
  onCommentDraft,
  onReview,
}: {
  inquiry: InquiryWithService;
  mode: 'incoming' | 'outgoing';
  quoteDraft: string;
  onQuoteDraft: (value: string) => void;
  onQuote: () => void;
  reviewing: boolean;
  onConfirm: () => void;
  ratingDraft: number;
  onRatingDraft: (value: number) => void;
  commentDraft: string;
  onCommentDraft: (value: string) => void;
  onReview: () => void;
}) {
  const serviceTitle = inquiry.service?.title ?? '服務已下架或不可讀取';
  const businessName = inquiry.service?.business_name ?? '—';

  return (
    <div className="fantasy-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-1">
            {mode === 'incoming' ? '收到的詢價' : '我送出的詢價'}
          </p>
          <h3 className="font-bold text-base leading-snug">{serviceTitle}</h3>
          <p className="text-[11px] text-[#e0d5c1]/50 mt-1">
            {businessName} · {new Date(inquiry.created_at).toLocaleString('zh-TW')}
          </p>
        </div>
        <span
          className={`text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border shrink-0 ${INQUIRY_STATUS_STYLE[inquiry.status]}`}
        >
          {INQUIRY_STATUS_LABEL[inquiry.status]}
        </span>
      </div>

      <div className="bg-black/30 border-l-2 border-[#3d3428] p-3">
        <p className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-1">詢價內容</p>
        <p className="text-xs text-[#e0d5c1]/80 leading-relaxed whitespace-pre-wrap break-words">{inquiry.message}</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-[#e0d5c1]/50">報價</span>
        <span className="font-mono text-[#ffd700]">
          {inquiry.status === 'requested' ? '尚未報價' : formatTwd(inquiry.quote_twd)}
        </span>
      </div>

      {mode === 'incoming' && inquiry.status === 'requested' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quoteDraft}
            onChange={e => onQuoteDraft(e.target.value)}
            className={inputClass + ' font-mono sm:w-40'}
            placeholder="報價 (TWD)"
          />
          <button onClick={onQuote} disabled={reviewing} className="fantasy-button text-xs py-2 flex-1 disabled:opacity-50">
            {reviewing ? '處理中…' : '送出報價'}
          </button>
        </div>
      )}

      {mode === 'incoming' && inquiry.status !== 'requested' && (
        <p className="text-[11px] text-[#e0d5c1]/35">
          報價已送出，等待買家確認完成後才能評價。
        </p>
      )}

      {mode === 'outgoing' && inquiry.status === 'quoted' && (
        <button
          onClick={onConfirm}
          disabled={reviewing}
          className="w-full fantasy-button text-xs py-2 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 size={13} /> {reviewing ? '處理中…' : '確認服務已完成'}
        </button>
      )}

      {mode === 'outgoing' && inquiry.status === 'completed' && (
        inquiry.review ? (
          <div className="border border-[#d4af37]/30 bg-[#d4af37]/5 p-3 space-y-1">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  size={12}
                  className={n <= inquiry.review!.rating ? 'text-[#d4af37]' : 'text-[#3d3428]'}
                  fill={n <= inquiry.review!.rating ? '#d4af37' : 'none'}
                />
              ))}
              <span className="text-[10px] text-[#e0d5c1]/40 ml-2">已評價</span>
            </div>
            {inquiry.review.comment && (
              <p className="text-xs text-[#e0d5c1]/70 leading-relaxed whitespace-pre-wrap break-words">
                {inquiry.review.comment}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 border-t border-[#3d3428] pt-3">
            <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">評價此服務（每筆詢價限一次）</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => onRatingDraft(n)} aria-label={`${n} 星`}>
                  <Star
                    size={20}
                    className={n <= ratingDraft ? 'text-[#d4af37]' : 'text-[#3d3428]'}
                    fill={n <= ratingDraft ? '#d4af37' : 'none'}
                  />
                </button>
              ))}
              <span className="text-xs text-[#e0d5c1]/40 ml-2">{ratingDraft} 星</span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={commentDraft}
              onChange={e => onCommentDraft(e.target.value)}
              className={inputClass + ' leading-relaxed'}
              placeholder="服務體驗如何？（選填）"
            />
            <button
              onClick={onReview}
              disabled={reviewing}
              className="w-full fantasy-button text-xs py-2 disabled:opacity-50"
            >
              {reviewing ? '送出中…' : '送出評價'}
            </button>
          </div>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main marketplace component
// ---------------------------------------------------------------------------

export default function MarketplaceMVP() {
  const { profile, user } = useGuild();
  const signedIn = !!user;
  const userId = user?.id ?? '';

  const [tab, setTab] = useState<MarketTab>('search');

  // Search
  const [keywordInput, setKeywordInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{ keyword: string; city: string }>({ keyword: '', city: '' });
  const [services, setServices] = useState<GuildService[]>([]);
  const [publicReviewStats, setPublicReviewStats] = useState<Record<string, PublicReviewStats>>({});
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchError, setSearchError] = useState('');

  // My services
  const [myServices, setMyServices] = useState<GuildService[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState('');
  const [showPublish, setShowPublish] = useState(false);

  // Inquiries
  const [incoming, setIncoming] = useState<InquiryWithService[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [incomingError, setIncomingError] = useState('');
  const [outgoing, setOutgoing] = useState<InquiryWithService[]>([]);
  const [outgoingLoading, setOutgoingLoading] = useState(false);
  const [outgoingError, setOutgoingError] = useState('');

  // Action state
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [inquiryTarget, setInquiryTarget] = useState<GuildService | null>(null);
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, string>>({});
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, number>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');

  const loadSearch = useCallback(async (filters: { keyword: string; city: string }) => {
    setSearchLoading(true);
    setSearchError('');
    try {
      const rows = await searchServices(filters);
      setServices(rows);
      // Reviews are auxiliary: search results still work if the ratings query fails.
      try {
        setPublicReviewStats(await fetchPublicReviewStats(rows.map(row => row.id)));
      } catch {
        setPublicReviewStats({});
      }
    } catch (err) {
      setServices([]);
      setSearchError(errorText(err));
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    if (!userId) return;
    setMineLoading(true);
    setMineError('');
    try {
      setMyServices(await listMyServices(userId));
    } catch (err) {
      setMyServices([]);
      setMineError(errorText(err));
    } finally {
      setMineLoading(false);
    }
  }, [userId]);

  const loadIncoming = useCallback(async () => {
    if (!userId) return;
    setIncomingLoading(true);
    setIncomingError('');
    try {
      setIncoming(await listIncomingInquiries(userId));
    } catch (err) {
      setIncoming([]);
      setIncomingError(errorText(err));
    } finally {
      setIncomingLoading(false);
    }
  }, [userId]);

  const loadOutgoing = useCallback(async () => {
    if (!userId) return;
    setOutgoingLoading(true);
    setOutgoingError('');
    try {
      setOutgoing(await listOutgoingInquiries(userId));
    } catch (err) {
      setOutgoing([]);
      setOutgoingError(errorText(err));
    } finally {
      setOutgoingLoading(false);
    }
  }, [userId]);

  // Everyone (including guests) sees the published service list on arrival.
  useEffect(() => {
    loadSearch({ keyword: '', city: '' });
  }, [loadSearch]);

  useEffect(() => {
    if (!signedIn) return;
    if (tab === 'mine') loadMine();
    if (tab === 'incoming') loadIncoming();
    if (tab === 'outgoing') loadOutgoing();
  }, [tab, signedIn, loadMine, loadIncoming, loadOutgoing]);

  useEffect(() => {
    if (!signedIn && tab !== 'search') setTab('search');
  }, [signedIn, tab]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filters = { keyword: keywordInput, city: cityInput };
    setAppliedFilters(filters);
    loadSearch(filters);
  };

  const resetSearch = () => {
    setKeywordInput('');
    setCityInput('');
    setAppliedFilters({ keyword: '', city: '' });
    loadSearch({ keyword: '', city: '' });
  };

  const runAction = async (id: string, action: () => Promise<void>, successMessage: string) => {
    setBusyId(id);
    setActionError('');
    setActionNotice('');
    try {
      await action();
      setActionNotice(successMessage);
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusyId('');
    }
  };

  const tabs: { id: MarketTab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'search', label: '搜尋服務', icon: <Search size={14} />, show: true },
    { id: 'mine', label: '我的服務', icon: <Store size={14} />, show: signedIn },
    { id: 'incoming', label: '收到的詢價', icon: <Inbox size={14} />, show: signedIn },
    { id: 'outgoing', label: '我送出的詢價', icon: <FileText size={14} />, show: signedIn },
  ];

  const searchResults = services;

  return (
    <div className="space-y-6">
      <header className="border-b border-[#3d3428] pb-5">
        <h2 className="font-serif text-2xl sm:text-3xl text-[#d4af37] glow-gold tracking-widest flex items-center gap-3">
          <Tag size={22} /> 服務市場
        </h2>
        <p className="text-xs text-[#e0d5c1]/50 mt-2">
          不需要公司或統編 · 每個人都能刊登自己的技能與服務 · 訪客可直接搜尋
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs
          .filter(t => t.show)
          .map(t => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setActionError('');
                setActionNotice('');
              }}
              className={`flex items-center gap-2 px-3 py-2 font-serif text-xs sm:text-sm tracking-widest border transition-all ${
                tab === t.id
                  ? 'bg-[#d4af37] text-black border-[#d4af37]'
                  : 'text-[#e0d5c1]/50 border-[#3d3428] hover:text-[#e0d5c1] hover:border-[#d4af37]/40'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
      </nav>

      {(actionError || actionNotice) && (
        <div className="space-y-2">
          {actionError && <ErrorBox message={actionError} />}
          {actionNotice && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 border border-emerald-500/40 bg-emerald-500/5 p-3">
              <CheckCircle2 size={14} /> {actionNotice}
            </div>
          )}
        </div>
      )}

      {tab === 'search' && (
        <section className="space-y-5">
          <form onSubmit={onSearchSubmit} className="border border-[#3d3428] bg-[#1a1612]/40 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
              <div>
                <FieldLabel>關鍵字</FieldLabel>
                <input
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  className={inputClass}
                  placeholder="服務、商家或分類，例如：清潔"
                />
              </div>
              <div>
                <FieldLabel>地區</FieldLabel>
                <select
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  className={inputClass + ' appearance-none'}
                >
                  <option value="">全部地區</option>
                  {TAIWAN_CITIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="fantasy-button flex-1 sm:flex-none px-5 py-3 flex items-center justify-center gap-2">
                  <Search size={14} /> 搜尋
                </button>
                <button
                  type="button"
                  onClick={resetSearch}
                  className="px-4 py-3 border border-[#3d3428] text-[#e0d5c1]/50 hover:text-[#e0d5c1] text-xs"
                >
                  清除
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#e0d5c1]/35">
              <span>
                {appliedFilters.keyword || appliedFilters.city
                  ? `條件：${appliedFilters.keyword || '不限'} / ${appliedFilters.city || '全部地區'}`
                  : '目前顯示全部已發布服務'}
              </span>
              <button
                type="button"
                onClick={() => loadSearch(appliedFilters)}
                className="flex items-center gap-1 hover:text-[#d4af37] transition-colors"
              >
                <RefreshCw size={10} /> 重新整理
              </button>
            </div>
          </form>

          {searchLoading && <Loading label="載入服務中…" />}
          {!searchLoading && searchError && <ErrorBox message={searchError} onRetry={() => loadSearch(appliedFilters)} />}
          {!searchLoading && !searchError && searchResults.length === 0 && (
            <EmptyBox title="目前沒有符合條件的服務" hint="換個關鍵字或地區試試，或登入後成為第一個發布者。" />
          )}
          {!searchLoading && !searchError && searchResults.length > 0 && (
            <>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#e0d5c1]/35">
                共 {searchResults.length} 筆服務
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {searchResults.map(service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    reviewStats={publicReviewStats[service.id]}
                    isOwn={service.owner_id === userId}
                    signedIn={signedIn}
                    onInquire={setInquiryTarget}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'mine' && signedIn && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#e0d5c1]/50">
              以個人暱稱「{profile?.display_name ?? user?.user_metadata?.guild_nickname ?? `冒險者-${user?.id.slice(0, 6) ?? '個人'}`}」刊登，免費公開可搜尋。
            </p>
            <button
              onClick={() => setShowPublish(v => !v)}
              className="fantasy-button text-xs px-4 py-2 flex items-center gap-2"
            >
              <Plus size={13} /> {showPublish ? '收起表單' : '發布新服務'}
            </button>
          </div>

          <AnimatePresence>
            {showPublish && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <PublishServiceForm
                  onPublished={() => {
                    loadMine();
                    loadSearch(appliedFilters);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {mineLoading && <Loading label="載入我的服務…" />}
          {!mineLoading && mineError && <ErrorBox message={mineError} onRetry={loadMine} />}
          {!mineLoading && !mineError && myServices.length === 0 && (
            <EmptyBox title="你還沒有發布任何服務" hint="按下「發布新服務」開始接案。" />
          )}
          {!mineLoading && !mineError && myServices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myServices.map(service => (
                <div key={service.id} className="fantasy-card p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 border border-[#d4af37]/40 text-[#d4af37] bg-[#d4af37]/5">
                      {service.category}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#e0d5c1]/40">
                      {service.status === 'published' ? '已發布' : '草稿'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base leading-snug">{service.title}</h3>
                  <p className="text-[11px] text-[#e0d5c1]/50">
                    {service.business_name} · {service.city} · {formatTwd(service.price_from_twd)}
                  </p>
                  <p className="text-xs text-[#e0d5c1]/60 line-clamp-2">{service.description}</p>
                  <p className="text-[10px] text-[#e0d5c1]/30 font-mono">
                    {new Date(service.created_at).toLocaleString('zh-TW')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'incoming' && signedIn && (
        <section className="space-y-5">
          <p className="text-xs text-[#e0d5c1]/50">你的服務收到的詢價。對 requested 的詢價填寫金額即完成報價。</p>
          {incomingLoading && <Loading label="載入收到的詢價…" />}
          {!incomingLoading && incomingError && <ErrorBox message={incomingError} onRetry={loadIncoming} />}
          {!incomingLoading && !incomingError && incoming.length === 0 && (
            <EmptyBox title="目前沒有收到詢價" hint="服務被搜尋到、有人送出詢價時會出現在這裡。" />
          )}
          {!incomingLoading && !incomingError && incoming.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {incoming.map(inquiry => (
                <InquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  mode="incoming"
                  quoteDraft={quoteDrafts[inquiry.id] ?? ''}
                  onQuoteDraft={v => setQuoteDrafts(prev => ({ ...prev, [inquiry.id]: v }))}
                  onQuote={() =>
                    runAction(
                      inquiry.id,
                      async () => {
                        const raw = quoteDrafts[inquiry.id] ?? '';
                        const amount = Number(raw);
                        if (raw.trim() === '' || !Number.isFinite(amount)) throw new Error('請填寫報價金額（TWD）。');
                        await quoteInquiry(inquiry.id, amount);
                        setQuoteDrafts(prev => ({ ...prev, [inquiry.id]: '' }));
                        await loadIncoming();
                      },
                      '報價已送出，等待買家確認完成。',
                    )
                  }
                  reviewing={busyId === inquiry.id}
                  onConfirm={() => {}}
                  ratingDraft={0}
                  onRatingDraft={() => {}}
                  commentDraft=""
                  onCommentDraft={() => {}}
                  onReview={() => {}}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'outgoing' && signedIn && (
        <section className="space-y-5">
          <p className="text-xs text-[#e0d5c1]/50">
            你送出的詢價。服務方報價後可確認完成，完成後可留下一次評價。
          </p>
          {outgoingLoading && <Loading label="載入送出的詢價…" />}
          {!outgoingLoading && outgoingError && <ErrorBox message={outgoingError} onRetry={loadOutgoing} />}
          {!outgoingLoading && !outgoingError && outgoing.length === 0 && (
            <EmptyBox title="你還沒有送出任何詢價" hint="到「搜尋服務」找到喜歡的服務後送出詢價。" />
          )}
          {!outgoingLoading && !outgoingError && outgoing.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {outgoing.map(inquiry => (
                <InquiryCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  mode="outgoing"
                  quoteDraft=""
                  onQuoteDraft={() => {}}
                  onQuote={() => {}}
                  reviewing={busyId === inquiry.id}
                  onConfirm={() =>
                    runAction(
                      inquiry.id,
                      async () => {
                        await confirmInquiryCompleted(inquiry.id);
                        await loadOutgoing();
                      },
                      '已確認完成，現在可以評價此服務。',
                    )
                  }
                  ratingDraft={ratingDrafts[inquiry.id] ?? 5}
                  onRatingDraft={v => setRatingDrafts(prev => ({ ...prev, [inquiry.id]: v }))}
                  commentDraft={commentDrafts[inquiry.id] ?? ''}
                  onCommentDraft={v => setCommentDrafts(prev => ({ ...prev, [inquiry.id]: v }))}
                  onReview={() =>
                    runAction(
                      inquiry.id,
                      async () => {
                        await createReview({
                          inquiryId: inquiry.id,
                          reviewerId: userId,
                          rating: ratingDrafts[inquiry.id] ?? 5,
                          comment: commentDrafts[inquiry.id] ?? '',
                        });
                        setCommentDrafts(prev => ({ ...prev, [inquiry.id]: '' }));
                        await loadOutgoing();
                      },
                      '評價已送出。',
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {inquiryTarget && (
          <InquiryModal
            service={inquiryTarget}
            onClose={() => setInquiryTarget(null)}
            onSent={() => {
              setActionNotice('詢價已送出，請到「我送出的詢價」查看服務方報價。');
              setActionError('');
              if (tab === 'outgoing') loadOutgoing();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
