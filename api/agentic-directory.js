// Public read-only discovery, reusing the Guild's existing Supabase tables and RLS.
// No service key, private profile data, writes, artificial matches, or external referrals.
import {PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY} from "../src/lib/public-supabase-config.js";

export const NEED_KINDS = Object.freeze(["cooperation","support","resources","events","jobs","hiring","clubs","friends","sports"]);
const MODE = new Set(["all","services","needs"]);
const TABLES = Object.freeze({
  services: {table: "guild_services", fields: "id,business_name,title,category,city,price_from_twd,created_at"},
  needs: {table: "guild_needs", fields: "id,title,kind,city,created_at"},
});

export function cleanSearchTerm(value, max=80) {
  return String(value ?? "").normalize("NFKC").replace(/[^\p{L}\p{N}\s-]/gu," ").trim().replace(/\s+/g," ").slice(0,max);
}
export function buildPublicQuery(mode, {keyword="",city="",kind="",limit=10}={}) {
  const config=TABLES[mode];
  if(!config) throw new Error("unsupported_mode");
  const url=new URL(PUBLIC_SUPABASE_URL+"/rest/v1/"+config.table);
  url.searchParams.set("select",config.fields);
  url.searchParams.set("status","eq.published");
  url.searchParams.set("order","created_at.desc");
  url.searchParams.set("limit",String(Math.max(1,Math.min(12,Math.floor(Number(limit)||10)))));
  const term=cleanSearchTerm(keyword);
  if(term) url.searchParams.set("title","ilike.*"+term+"*");
  const selectedCity=cleanSearchTerm(city,40);
  if(selectedCity) url.searchParams.set("city","eq."+selectedCity);
  if(mode==="needs" && NEED_KINDS.includes(kind)) url.searchParams.set("kind","eq."+kind);
  return url;
}
export function projectPublicRecords(mode, records) {
  if(!Array.isArray(records)) throw new Error("invalid_public_response");
  return records.slice(0,12).map(row => mode==="services" ? ({
    id:String(row.id||""),type:"published_service",
    title:String(row.title||"").slice(0,140),
    businessName:String(row.business_name||"").slice(0,100),
    category:String(row.category||"").slice(0,80),
    city:String(row.city||"").slice(0,40),
    priceFromTwd:Number.isFinite(row.price_from_twd)?row.price_from_twd:null,
    createdAt:String(row.created_at||""),
    profileVerified:false, agentVerified:false,
  }) : ({
    id:String(row.id||""),type:"published_need",
    title:String(row.title||"").slice(0,140),
    kind:String(row.kind||"").slice(0,40),
    city:String(row.city||"").slice(0,40),
    createdAt:String(row.created_at||""),
    profileVerified:false, agentVerified:false,
  }));
}
export async function fetchPublicRecords(mode, query, fetcher=fetch) {
  const response=await fetcher(buildPublicQuery(mode,query),{
    headers:{apikey:PUBLIC_SUPABASE_PUBLISHABLE_KEY,Accept:"application/json"},
    signal:AbortSignal.timeout(7000),
  });
  if(!response.ok) throw new Error("upstream_"+response.status);
  return projectPublicRecords(mode,await response.json());
}
export default async function handler(req,res) {
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","public, s-maxage=30, stale-while-revalidate=60");
  if(req.method!=="GET") {
    res.setHeader("Allow","GET");
    return res.status(405).json({ok:false,error:"method_not_allowed"});
  }
  const mode=String(req.query?.mode||"all");
  if(!MODE.has(mode)) return res.status(400).json({ok:false,error:"unsupported_mode"});
  const kind=String(req.query?.kind||"");
  if(kind && !NEED_KINDS.includes(kind)) return res.status(400).json({ok:false,error:"unsupported_kind"});
  const keyword=cleanSearchTerm(req.query?.keyword||"");
  const city=cleanSearchTerm(req.query?.city||"",40);
  const limit=Math.min(12,Math.max(1,Number.parseInt(String(req.query?.limit||"10"),10)||10));
  const query={keyword,city,kind,limit};
  try {
    const [services,needs]=await Promise.all([
      mode==="needs"?Promise.resolve([]):fetchPublicRecords("services",query),
      mode==="services"?Promise.resolve([]):fetchPublicRecords("needs",query),
    ]);
    return res.status(200).json({
      ok:true,source:"guild_existing_public_tables",visibility:"published_only_RLS",
      keyword,city,kind,services,needs,agents:[],
      count:services.length+needs.length,
      limitation:"Listings are user-published, not independently identity-verified. No verified AI agents are registered. No private contacts or permission to transact.",
      nextAction:{type:"member_confirmed_post",url:"/matching?intent=post",requiresLogin:true,requiresExplicitUserConfirmation:true},
    });
  } catch {
    return res.status(502).json({ok:false,error:"public_directory_unavailable",services:[],needs:[],agents:[]});
  }
}
