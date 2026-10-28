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
    return server;
  });
  return handler.fetch(request);
});
