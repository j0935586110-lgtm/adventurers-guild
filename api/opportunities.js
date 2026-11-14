// Himalayas public API: commercial display is allowed with visible attribution.
// Every application uses the unmodified applicationLink returned by Himalayas.
const SOURCE = 'https://himalayas.app/jobs/api/search';
const ALLOWED = /^(ai agent|automation|excel|remote it|mcp|software engineer|customer support)$/i;
function clean(v, max = 160) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
export function mapJob(job, now = Date.now()) {
  const applicationLink = clean(job?.applicationLink, 600);
  const sourceUrl = clean(job?.guid, 600);
  if (!applicationLink.startsWith('https://himalayas.app/') || !sourceUrl.startsWith('https://himalayas.app/')) return null;
  const expiration = Number(job?.expiryDate || 0) * 1000;
  if (expiration && expiration <= now) return null;
  const regions = Array.isArray(job?.locationRestrictions) ? job.locationRestrictions : [];
  if (regions.length && !regions.includes('Taiwan') && !regions.includes('Worldwide')) return null;
  return {
    title: clean(job?.title), company: clean(job?.companyName), source: 'Himalayas', sourceUrl, applicationLink,
    regions: regions.includes('Taiwan') ? ['Taiwan'] : (regions.includes('Worldwide') ? ['Worldwide'] : []),
    employmentType: clean(job?.employmentType, 50),
    publishedAt: Number(job?.pubDate) || null,
    expiresAt: Number(job?.expiryDate) || null,
    minSalary: Number.isFinite(job?.minSalary) ? job.minSalary : null,
    maxSalary: Number.isFinite(job?.maxSalary) ? job.maxSalary : null,
    salaryCurrency: clean(job?.salaryCurrency, 6),
    salaryPeriod: clean(job?.salaryPeriod, 20),
  };
}
function relevance(job, keyword) {
  const title = (job.title || '').toLowerCase();
  const patterns = {
    'ai agent': /\b(ai|agent|machine learning|llm|automation)\b/,
    'automation': /automat|workflow|integration|agent/i,
    'excel': /excel|spreadsheet|data analyst|financial analyst/i,
    'remote it': /desktop|helpdesk|support|endpoint|system|it engineer|infrastructure/i,
    'mcp': /\bmcp\b|agent|integration|ai/i,
    'software engineer': /engineer|developer|software/i,
    'customer support': /customer|support|success/i,
  };
  return (patterns[keyword]?.test(title) ? 1 : 0);
}
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({error:'method_not_allowed'}); }
  const q = clean(req.query?.q ?? 'ai agent', 50).toLowerCase();
  if (!ALLOWED.test(q)) return res.status(400).json({error:'unsupported_keyword'});
  const url = new URL(SOURCE);
  url.searchParams.set('q', q);
  url.searchParams.set('country', 'TW');
  url.searchParams.set('sort', 'recent');
  try {
    const response = await fetch(url, {headers:{'Accept':'application/json'}, signal:AbortSignal.timeout(9000)});
    if (!response.ok) return res.status(502).json({error:'upstream_unavailable',upstreamStatus:response.status});
    const data = await response.json();
    const jobs = (Array.isArray(data.jobs) ? data.jobs : []).map(x=>mapJob(x)).filter(Boolean).sort((a,b)=>relevance(b,q)-relevance(a,q)).slice(0,12);
    res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({source:'Himalayas',sourceUrl:'https://himalayas.app/',keyword:q,country:'TW',type:'employment_not_freelance',sortNote:'job-title-keyword-first-not-qualification',updatedAt:data.updatedAt||null,jobs});
  } catch {
    return res.status(502).json({error:'upstream_unavailable'});
  }
}
