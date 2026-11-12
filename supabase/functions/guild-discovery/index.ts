// Public read-only MCP. Uses publishable/anon key; never any service role.
// All reads are restricted by explicit published status plus database RLS.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createMcpHandler,McpServer} from 'npm:@modelcontextprotocol/server@^2.0.0';
import {createClient} from 'npm:@supabase/supabase-js@^2.110.0';
import {z} from 'npm:zod@^4.3.6';

const url=Deno.env.get('SUPABASE_URL');
const key=Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||Deno.env.get('SUPABASE_ANON_KEY');
if(!url||!key||key.startsWith('sb_secret_'))throw new Error('A public Supabase key is required');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const svcCols='id,business_name,title,description,category,city,price_from_twd,created_at';
const reviewsCols='id,service_id,rating,comment,created_at';
const good=(value:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(value)}]});
const bad=(msg:string)=>({isError:true,content:[{type:'text' as const,text:msg}]});

Deno.serve(async request=>{
  const handler=createMcpHandler(()=>{
    const server=new McpServer({name:'adventurers-guild-public',version:'0.2.0'});
    server.registerTool('search_services',{
      description:'不需登入，搜尋冒險者公會的公開個人服務；不保證任何交易或評價。',
      annotations:{readOnlyHint:true},
      inputSchema:z.object({
        keyword:z.string().max(120).default(''),
        city:z.string().max(80).default(''),
        limit:z.number().int().min(1).max(30).default(15)
      })
    },async({keyword,city,limit})=>{
      let q=db.from('guild_services').select(svcCols).eq('status','published');
      if(city.trim())q=q.eq('city',city.trim());
      const term=keyword.trim().replace(/[\\%_]/g,'');
      if(term)q=q.ilike('title',`%${term}%`);
      const {data,error}=await q.order('created_at',{ascending:false}).limit(limit);
      return error?bad('公開搜尋暫時不可用'):good({services:data??[],returned:(data??[]).length});
    });
    server.registerTool('get_service',{
      description:'讀取一個已刊登的公開服務，不包含聯絡資訊或詢價私訊。',
      annotations:{readOnlyHint:true},
      inputSchema:z.object({service_id:z.string().uuid()})
    },async({service_id})=>{
      const {data,error}=await db.from('guild_services').select(svcCols).eq('id',service_id).eq('status','published').maybeSingle();
      return error?bad('無法取得服務'):good({service:data});
    });
    server.registerTool('get_service_reviews',{
      description:'讀取已完成詢價關聯的公開評價，不提供買家身份。',
      annotations:{readOnlyHint:true},
      inputSchema:z.object({service_id:z.string().uuid(),limit:z.number().int().min(1).max(30).default(15)})
    },async({service_id,limit})=>{
      const {data,error}=await db.from('guild_reviews').select(reviewsCols).eq('service_id',service_id)
        .order('created_at',{ascending:false}).limit(limit);
      return error?bad('無法取得評價'):good({reviews:data??[]});
    });
    const needKinds=['cooperation','support','resources','events','jobs','hiring','clubs','friends','sports','dating'] as const;
    const needCols='id,kind,title,description,city,status,created_at';
    function guessKind(message:string):typeof needKinds[number] {
      const raw=message.toLowerCase();
      if(/約會|交往|戀愛|男朋友|女朋友|date|dating|romance/.test(raw))return 'dating';
      if(/登山|爬山|健身|運動|跑步|單車|gym|hiking|fitness/.test(raw))return 'sports';
      if(/社團|俱樂部|興趣社群|club|community|group/.test(raw))return 'clubs';
      if(/玩伴|朋友|揪團|桌遊|一起玩|friend|playmate/.test(raw))return 'friends';
      if(/徵才|招募|找員工|找人才|雇用|招聘|hire|hiring|recruit/.test(raw))return 'hiring';
      if(/求職|找工作|應徵|兼職|接案|job|freelance/.test(raw))return 'jobs';
      if(/創業活動|聚會|活動|講座|交流會|event|meetup|conference/.test(raw))return 'events';
      if(/資源|工具|教材|資金|教學|resource|funding|guide/.test(raw))return 'resources';
      if(/協助|幫忙|支援|問題|help|support/.test(raw))return 'support';
      return 'cooperation';
    }
    server.registerTool('find_people_and_opportunities',{
      title:'在冒險者公會找人、工作、合作、活動與社群 / Find people and opportunities',
      description:'給我一句自然語言需求，例如「我想在台北找一起登山的伙伴」「想徵前端工程師」「找創業活動」。只搜尋公會真正已公開的會員需求及技能服務。可以回傳零筆，絕不捏造職缺、人物或活動。找不到時建議確認後自行刊登；約會配對尚未上線。',
      annotations:{readOnlyHint:true},
      inputSchema:z.object({
        request:z.string().trim().min(2).max(400),
        kind:z.enum(needKinds).optional(),
        city:z.string().trim().max(80).default(''),
        limit:z.number().int().min(1).max(20).default(12)
      })
    },async({request,kind,city,limit})=>{
      const intent=kind||guessKind(request);
      const info={
        intent,request,city,
        need_url:'https://adventurers-guild-v2.vercel.app/'+(intent)+'.html',
        website:'https://adventurers-guild-v2.vercel.app/',
        post_url:'https://adventurers-guild-v2.vercel.app/?post_need='+intent,
        requires_confirmation_to_publish:true
      };
      if(intent==='dating')return good({...info,status:'unavailable',available:false,public_needs:[],services:[],
        limitation:'Verified adults-only mutual-consent dating matching is not available. Never invent profiles or publish this request.'});
      const target=intent==='jobs'?'hiring':intent==='hiring'?'jobs':intent;
      let q=db.from('guild_needs').select(needCols).eq('status','published').eq('kind',target);
      if(city)q=q.eq('city',city);
      const needs=await q.order('created_at',{ascending:false}).limit(limit);
      if(needs.error)return bad('公開需求搜尋暫時不可用');
      let services:unknown[]=[];
      if(['cooperation','support','hiring','jobs'].includes(intent)){
        let sq=db.from('guild_services').select(svcCols).eq('status','published');
        if(city)sq=sq.eq('city',city);
        const got=await sq.order('created_at',{ascending:false}).limit(limit);
        if(!got.error)services=got.data??[];
      }
      const public_needs=needs.data??[];
      return good({...info,status:'ok',available:public_needs.length>0||services.length>0,
        public_needs,services,returned:public_needs.length+services.length,
        limitation:'Results are member-published requests/services, not independently verified jobs, event tickets, dating profiles or identity checks. AI cannot guarantee a match.'});
    });
    server.registerTool('list_public_needs',{
      title:'查看冒險者公會公開需求 / List public needs',
      description:'唯讀列出會員公開的找人、徵才、求職、活動、社團、玩伴、運動需求。約會配對未開放。',
      annotations:{readOnlyHint:true},
      inputSchema:z.object({
        kind:z.enum(needKinds).optional(),city:z.string().trim().max(80).default(''),
        limit:z.number().int().min(1).max(30).default(20)
      })
    },async({kind,city,limit})=>{
      if(kind==='dating')return good({public_needs:[],returned:0,limitation:'Dating matching not available'});
      let q=db.from('guild_needs').select(needCols).eq('status','published');
      if(kind)q=q.eq('kind',kind);
      if(city)q=q.eq('city',city);
      const {data,error}=await q.order('created_at',{ascending:false}).limit(limit);
      return error?bad('讀取公開需求失敗'):good({public_needs:data??[],returned:(data??[]).length});
    });
    return server;
  });
  return handler.fetch(request);
});
