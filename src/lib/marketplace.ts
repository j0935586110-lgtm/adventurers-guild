import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types — mirror the marketplace MVP schema owned by the SQL migration worker.
// guild_services(id, owner_id, business_name, title, description, category,
//                city, price_from_twd, status, created_at)
// guild_inquiries(id, service_id, requester_id, message, status, quote_twd,
//                 created_at)
// guild_reviews(id, inquiry_id, reviewer_id, rating, comment, created_at)
// ---------------------------------------------------------------------------

export type ServiceStatus = 'draft' | 'published';
export type InquiryStatus = 'requested' | 'quoted' | 'completed';

export interface GuildService {
  id: string;
  owner_id: string;
  business_name: string;
  title: string;
  description: string;
  category: string;
  city: string;
  price_from_twd: number | null;
  status: ServiceStatus;
  created_at: string;
}

export interface GuildInquiry {
  id: string;
  service_id: string;
  requester_id: string;
  message: string;
  status: InquiryStatus;
  quote_twd: number | null;
  created_at: string;
}

export interface GuildReview {
  id: string;
  inquiry_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface InquiryWithService extends GuildInquiry {
  service: GuildService | null;
  review: GuildReview | null;
}

const SERVICE_COLUMNS =
  'id,owner_id,business_name,title,description,category,city,price_from_twd,status,created_at';
const INQUIRY_COLUMNS = 'id,service_id,requester_id,message,status,quote_twd,created_at';
const REVIEW_COLUMNS = 'id,inquiry_id,rating,comment,created_at';

// UI option lists only (no data is invented from them).
export const SERVICE_CATEGORIES = [
  '居家修繕',
  '清潔打掃',
  '攝影錄影',
  '設計美編',
  '網站開發',
  '行銷顧問',
  '翻譯寫作',
  '教學家教',
  '餐飲外燴',
  '其他',
];

export const TAIWAN_CITIES = [
  '台北市',
  '新北市',
  '桃園市',
  '台中市',
  '台南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '嘉義市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
  '線上服務',
];

// ---------------------------------------------------------------------------
// Errors — surface real Supabase/PostgREST failures as readable zh-TW text.
// Never swallow an error and never show fake success.
// ---------------------------------------------------------------------------

function toError(error: { message?: string; code?: string } | null): Error {
  const message = error?.message ?? '未知的資料庫錯誤';
  const code = error?.code ?? '';
  if (code === '23505') {
    return new Error('此詢價已經評價過，每筆詢價只能評價一次。');
  }
  if (code === '23514') {
    return new Error('資料格式不符：請檢查金額、評分或必填欄位是否在允許範圍內。');
  }
  if (code === '23503') {
    return new Error('找不到對應的服務或詢價，資料可能已被刪除。');
  }
  if (code === '42501' || /row-level security/i.test(message)) {
    return new Error('權限不足：此操作未通過資料庫安全規則（RLS），請確認資料是否屬於本人。');
  }
  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  ) {
    return new Error('服務市場資料表尚未建立（guild_services / guild_inquiries / guild_reviews），請先套用資料庫遷移。');
  }
  return new Error(message);
}

function assertRows(updated: unknown, action: string) {
  if (!updated) {
    throw new Error(`${action}失敗：找不到資料，或該筆資料不在你的權限範圍內。`);
  }
}

// PostgREST filter strings use "," and "()" as syntax; strip them from user input.
function sanitizeTerm(raw: string): string {
  return raw.replace(/[,()"\\*%]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function formatTwd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '價格另議';
  return `NT$ ${amount.toLocaleString('zh-TW')}`;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface ServiceSearchParams {
  keyword?: string;
  city?: string;
}

/** Public search: only published services are visible (RLS also enforces this). */
export async function searchServices({ keyword = '', city = '' }: ServiceSearchParams): Promise<GuildService[]> {
  let query = supabase
    .from('guild_services')
    .select(SERVICE_COLUMNS)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60);

  const kw = sanitizeTerm(keyword);
  if (kw) {
    query = query.or(
      `title.ilike.%${kw}%,description.ilike.%${kw}%,business_name.ilike.%${kw}%,category.ilike.%${kw}%`,
    );
  }
  const cityTerm = sanitizeTerm(city);
  if (cityTerm) {
    query = query.ilike('city', `%${cityTerm}%`);
  }

  const { data, error } = await query;
  if (error) throw toError(error);
  return (data ?? []) as GuildService[];
}

export async function fetchServicesByIds(ids: string[]): Promise<Map<string, GuildService>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, GuildService>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from('guild_services').select(SERVICE_COLUMNS).in('id', unique);
  if (error) throw toError(error);
  for (const row of (data ?? []) as GuildService[]) map.set(row.id, row);
  return map;
}

export async function fetchReviewsForInquiries(inquiryIds: string[]): Promise<Map<string, GuildReview>> {
  const unique = Array.from(new Set(inquiryIds.filter(Boolean)));
  const map = new Map<string, GuildReview>();
  if (unique.length === 0) return map;
  const { data, error } = await supabase.from('guild_reviews').select(REVIEW_COLUMNS).in('inquiry_id', unique);
  if (error) throw toError(error);
  for (const row of (data ?? []) as GuildReview[]) map.set(row.inquiry_id, row);
  return map;
}

export async function listMyServices(ownerId: string): Promise<GuildService[]> {
  const { data, error } = await supabase
    .from('guild_services')
    .select(SERVICE_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw toError(error);
  return (data ?? []) as GuildService[];
}

export async function listOutgoingInquiries(requesterId: string): Promise<InquiryWithService[]> {
  const { data, error } = await supabase
    .from('guild_inquiries')
    .select(INQUIRY_COLUMNS)
    .eq('requester_id', requesterId)
    .order('created_at', { ascending: false });
  if (error) throw toError(error);
  const inquiries = (data ?? []) as GuildInquiry[];
  if (inquiries.length === 0) return [];
  const [services, reviews] = await Promise.all([
    fetchServicesByIds(inquiries.map(i => i.service_id)),
    fetchReviewsForInquiries(inquiries.map(i => i.id)),
  ]);
  return inquiries.map(i => ({
    ...i,
    service: services.get(i.service_id) ?? null,
    review: reviews.get(i.id) ?? null,
  }));
}

/** Incoming inquiries = inquiries on services owned by the signed-in user. */
export async function listIncomingInquiries(ownerId: string): Promise<InquiryWithService[]> {
  const services = await listMyServices(ownerId);
  if (services.length === 0) return [];
  const byId = new Map(services.map(s => [s.id, s]));
  const { data, error } = await supabase
    .from('guild_inquiries')
    .select(INQUIRY_COLUMNS)
    .in('service_id', services.map(s => s.id))
    .order('created_at', { ascending: false });
  if (error) throw toError(error);
  const inquiries = (data ?? []) as GuildInquiry[];
  if (inquiries.length === 0) return [];
  const reviews = await fetchReviewsForInquiries(inquiries.map(i => i.id));
  return inquiries.map(i => ({
    ...i,
    service: byId.get(i.service_id) ?? null,
    review: reviews.get(i.id) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Mutations — explicit state transitions only.
// ---------------------------------------------------------------------------

export interface NewServiceInput {
  businessName: string;
  title: string;
  description: string;
  category: string;
  city: string;
  priceFromTwd: number | null;
}

export async function publishService(ownerId: string, input: NewServiceInput): Promise<GuildService> {
  if (!ownerId) throw new Error('請先登入才能發布服務。');
  if (!input.businessName.trim() || !input.title.trim() || !input.description.trim()) {
    throw new Error('商家名稱、服務標題與服務說明皆為必填。');
  }
  if (!input.city.trim()) throw new Error('請選擇服務地區。');

  const { data, error } = await supabase
    .from('guild_services')
    .insert({
      owner_id: ownerId,
      business_name: input.businessName.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      city: input.city.trim(),
      price_from_twd: input.priceFromTwd,
      status: 'published',
    })
    .select(SERVICE_COLUMNS)
    .single();
  if (error) throw toError(error);
  assertRows(data, '發布服務');
  return data as GuildService;
}

export async function sendInquiry(params: {
  serviceId: string;
  requesterId: string;
  message: string;
}): Promise<GuildInquiry> {
  if (!params.requesterId) throw new Error('請先登入才能送出詢價。');
  if (!params.message.trim()) throw new Error('請填寫詢價內容。');

  const { data, error } = await supabase
    .from('guild_inquiries')
    .insert({
      service_id: params.serviceId,
      requester_id: params.requesterId,
      message: params.message.trim(),
      status: 'requested',
      quote_twd: null,
    })
    .select(INQUIRY_COLUMNS)
    .single();
  if (error) throw toError(error);
  assertRows(data, '送出詢價');
  return data as GuildInquiry;
}

/** Provider quotes an inquiry that is still in "requested". */
export async function quoteInquiry(inquiryId: string, quoteTwd: number): Promise<GuildInquiry> {
  const amount = Math.round(quoteTwd);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('報價金額必須大於 0。');

  const { data, error } = await supabase
    .from('guild_inquiries')
    .update({ status: 'quoted', quote_twd: amount })
    .eq('id', inquiryId)
    .eq('status', 'requested')
    .select(INQUIRY_COLUMNS)
    .maybeSingle();
  if (error) throw toError(error);
  assertRows(data, '報價');
  return data as GuildInquiry;
}

/** Buyer confirms a quoted inquiry as completed. */
export async function confirmInquiryCompleted(inquiryId: string): Promise<GuildInquiry> {
  const { data, error } = await supabase
    .from('guild_inquiries')
    .update({ status: 'completed' })
    .eq('id', inquiryId)
    .eq('status', 'quoted')
    .select(INQUIRY_COLUMNS)
    .maybeSingle();
  if (error) throw toError(error);
  assertRows(data, '確認完成');
  return data as GuildInquiry;
}

/** Buyer leaves exactly one review, only after the inquiry is completed. */
export async function createReview(params: {
  inquiryId: string;
  reviewerId: string;
  rating: number;
  comment: string;
}): Promise<GuildReview> {
  const rating = Math.round(params.rating);
  if (!(rating >= 1 && rating <= 5)) throw new Error('評分必須是 1 到 5 星。');
  if (!params.reviewerId) throw new Error('請先登入才能評價。');

  const { data, error } = await supabase
    .from('guild_reviews')
    .insert({
      inquiry_id: params.inquiryId,
      reviewer_id: params.reviewerId,
      rating,
      comment: params.comment.trim(),
    })
    .select(REVIEW_COLUMNS)
    .single();
  if (error) throw toError(error);
  assertRows(data, '建立評價');
  return data as GuildReview;
}

/** Public summary of buyer-confirmed reviews, not a business verification badge. */
export interface PublicReviewStats { count: number; average: number }

export async function fetchPublicReviewStats(serviceIds: string[]): Promise<Record<string, PublicReviewStats>> {
  const unique = [...new Set(serviceIds.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.from('guild_reviews')
    .select('service_id,rating')
    .in('service_id', unique)
    .limit(1000);
  if (error) throw toError(error);
  const totals: Record<string, { count: number; sum: number }> = {};
  for (const row of data ?? []) {
    const id = String(row.service_id);
    if (!totals[id]) totals[id] = { count: 0, sum: 0 };
    totals[id].count += 1;
    totals[id].sum += Number(row.rating);
  }
  const stats: Record<string, PublicReviewStats> = {};
  for (const [id, item] of Object.entries(totals))
    stats[id] = { count: item.count, average: item.sum / item.count };
  return stats;
}
