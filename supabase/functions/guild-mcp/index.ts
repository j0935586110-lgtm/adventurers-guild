// Guild Remote MCP: authenticated as the human user; database RLS is authoritative.
// Supabase Edge Function: verify_jwt=false because the OAuth middleware validates tokens.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {McpServer,createMcpHandler} from 'npm:@modelcontextprotocol/server@^2.0.0';
import {pipeline} from 'npm:@supabase/middleware@1';
import {withSupabase,withOAuthProtectedResource} from 'npm:@supabase/server@1';
import {z} from 'npm:zod@^4.3.6';
const answer=(data:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(data)}]});
const fail=(message:string)=>({isError:true,content:[{type:'text' as const,text:message}]});
const svcCols='id,owner_id,business_name,title,description,category,city,price_from_twd,status,created_at';
const inquiryCols='id,service_id,requester_id,message,status,quote_twd,created_at';

Deno.serve(pipeline(
  [withOAuthProtectedResource(),withSupabase({auth:'user'})],
  async (req,{supabase}:{supabase:any})=>{
    const handler=createMcpHandler(()=>{
      const server=new McpServer({name:'adventurers-guild',version:'0.2.0'});
      async function uid() {
        const {data,error}=await supabase.auth.getUser();
        if(error||!data?.user?.id)throw new Error('請重新登入並授權公會');
        return String(data.user.id);
      }
      async function run(fn:()=>Promise<unknown>) {
        try{return answer(await fn());}
        catch(e){return fail(e instanceof Error?e.message:'操作失敗');}
      }
      async function checked(query:any) {
        const {data,error}=await query;
        if(error)throw new Error(error.message);
        return data;
      }
      server.registerTool('search_services',{
        description:'搜尋已公開的台灣個人技能服務。唯讀，不會替任何人詢價、付款。',
        annotations:{readOnlyHint:true},
        inputSchema:z.object({keyword:z.string().max(100).default(''),city:z.string().max(80).default('')})
      },({keyword,city})=>run(async()=>{
        let q=supabase.from('guild_services').select(svcCols).eq('status','published');
        if(city.trim())q=q.eq('city',city.trim());
        // Avoid PostgREST .or() syntax injection. Escape wildcard characters.
        const term=keyword.trim().replace(/[\\%_]/g,'');
        if(term)q=q.ilike('title',`%${term}%`);
        return {services:(await checked(q.order('created_at',{ascending:false}).limit(30)))??[]};
      }));
      server.registerTool('get_service',{
        description:'取得單一公開服務與交易後公開評價，不返回個人 Email。',
        annotations:{readOnlyHint:true},inputSchema:z.object({service_id:z.string().uuid()})
      },({service_id})=>run(async()=>{
        const [service,reviews]=await Promise.all([
          checked(supabase.from('guild_services').select(svcCols).eq('id',service_id).eq('status','published').maybeSingle()),
          checked(supabase.from('guild_reviews').select('id,service_id,rating,comment,created_at').eq('service_id',service_id).limit(20))
        ]);
        return {service,reviews:reviews??[]};
      }));
      server.registerTool('my_profile',{
        description:'取得目前已授權使用者的公會暱稱，不查詢其他使用者。',
        annotations:{readOnlyHint:true},inputSchema:z.object({})
      },()=>run(async()=>{
        const id=await uid();
        const profile=await checked(supabase.from('users').select('id,display_name').eq('id',id).maybeSingle());
        return {id,profile};
      }));
      server.registerTool('publish_service',{
        description:'刊登個人技能服務。須事先向使用者確認公開標題、內容和地區。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({
          title:z.string().trim().min(1).max(160),
          description:z.string().trim().min(1).max(4000),
          city:z.string().trim().min(1).max(80),
          category:z.string().trim().min(1).max(80).default('其他'),
          price_from_twd:z.number().int().nonnegative().nullable().default(null)
        })
      },args=>run(async()=>{
        const owner_id=await uid();
        const person=await checked(supabase.from('users').select('display_name').eq('id',owner_id).maybeSingle());
        if(!person)throw new Error('公會帳號尚未建立');
        return {service:await checked(supabase.from('guild_services').insert({
          owner_id,business_name:person.display_name,status:'published',...args
        }).select('id,title,city,status,created_at').single())};
      }));
      server.registerTool('my_services',{
        description:'僅列出登入會員自己的服務刊登。',
        annotations:{readOnlyHint:true},inputSchema:z.object({})
      },()=>run(async()=>{
        const owner_id=await uid();
        return {services:await checked(supabase.from('guild_services').select(svcCols).eq('owner_id',owner_id).limit(50))};
      }));
      server.registerTool('request_quote',{
        description:'向另一會員詢價，送出前必須徵得使用者確認。不是付款。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({service_id:z.string().uuid(),message:z.string().trim().min(1).max(2000)})
      },args=>run(async()=>{
        const requester_id=await uid();
        return {inquiry:await checked(supabase.from('guild_inquiries').insert({
          ...args,requester_id,status:'requested'
        }).select('id,service_id,status,created_at').single())};
      }));
      server.registerTool('my_inquiries',{
        description:'從目前會員可存取的詢價中讀取進度，RLS 限制買賣雙方。',
        annotations:{readOnlyHint:true},inputSchema:z.object({})
      },()=>run(async()=>({
        inquiries:await checked(supabase.from('guild_inquiries').select(inquiryCols).order('created_at',{ascending:false}).limit(50))
      })));
      server.registerTool('quote_inquiry',{
        description:'服務提供者對收到的詢價報價。需事先確認金額，不能代替付款。',
        annotations:{readOnlyHint:false},inputSchema:z.object({
          inquiry_id:z.string().uuid(),quote_twd:z.number().int().min(1).max(500000000)
        })
      },({inquiry_id,quote_twd})=>run(async()=>{
        const row=await checked(supabase.from('guild_inquiries').update({status:'quoted',quote_twd})
          .eq('id',inquiry_id).eq('status','requested').select('id,status,quote_twd').maybeSingle());
        if(!row)throw new Error('詢價無權限或狀態不符');
        return {inquiry:row};
      }));
      server.registerTool('confirm_completion',{
        description:'只有原買家可確認已報價詢價完成。操作前請向買家再次確認。',
        annotations:{readOnlyHint:false},inputSchema:z.object({inquiry_id:z.string().uuid()})
      },({inquiry_id})=>run(async()=>{
        const row=await checked(supabase.from('guild_inquiries').update({status:'completed'})
          .eq('id',inquiry_id).eq('status','quoted').select('id,status').maybeSingle());
        if(!row)throw new Error('詢價無權限或狀態不符');
        return {inquiry:row};
      }));
      server.registerTool('review_service',{
        description:'完成詢價後買家可留下唯一公開評價。請先確認評分及文字。',
        annotations:{readOnlyHint:false},inputSchema:z.object({
          inquiry_id:z.string().uuid(),rating:z.number().int().min(1).max(5),comment:z.string().max(2000).default('')
        })
      },args=>run(async()=>({
        review:await checked(supabase.from('guild_reviews').insert({
          ...args,reviewer_id:await uid(),service_id:null
        }).select('id,service_id,rating,comment').single())
      })));
      return server;
    });
    return handler.fetch(req);
  }
));