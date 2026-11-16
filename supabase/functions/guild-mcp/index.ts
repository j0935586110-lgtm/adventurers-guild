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
      const kinds=['cooperation','support','resources','events','jobs','hiring','clubs','friends','sports','dating'] as const;
      const publicNeeds='id,owner_id,kind,title,description,city,status,created_at';
      const replyCols='id,need_id,sender_id,message,status,created_at';
      server.registerTool('search_public_needs',{
        title:'搜尋公會公開需求 / Search public requests',
        description:'搜尋會員真實公開的徵才、求職、合作、活動、社團、玩伴與運動需求。AI 不能捏造人選或職缺。',
        annotations:{readOnlyHint:true},
        inputSchema:z.object({kind:z.enum(kinds).optional(),city:z.string().trim().max(80).default(''),limit:z.number().int().min(1).max(30).default(15)})
      },({kind,city,limit})=>run(async()=>{
        if(kind==='dating')return {needs:[],limitation:'Dating matching not available'};
        let q=supabase.from('guild_needs').select(publicNeeds).eq('status','published');
        if(kind)q=q.eq('kind',kind);if(city)q=q.eq('city',city);
        return {needs:await checked(q.order('created_at',{ascending:false}).limit(limit))};
      }));
      server.registerTool('create_need_draft',{
        title:'草擬找人找機會需求 / Draft a request',
        description:'只幫使用者建立私人草稿，不會發布。必須告知會員草稿標題、內容、地區和類型；發布需另外確認呼叫 publish_need。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({
          kind:z.enum(kinds),title:z.string().trim().min(3).max(140),
          description:z.string().trim().min(6).max(1500),
          city:z.string().trim().min(1).max(80).default('線上服務')
        })
      },args=>run(async()=>{
        const owner_id=await uid();
        const need=await checked(supabase.from('guild_needs').insert({...args,owner_id,status:'draft'})
          .select(publicNeeds).single());
        return {need,public:false,next_action:'Obtain explicit user approval of all public fields before calling publish_need'};
      }));
      server.registerTool('publish_need',{
        title:'經會員確認後發布需求 / Publish approved request',
        description:'對外發布已存在的私人草稿。只有會員明確確認標題、內容、城市、需求類型及隱私警告後才能呼叫；禁止自動發布交友及約會私密資訊。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({need_id:z.string().uuid(),confirmed:z.literal(true)})
      },({need_id})=>run(async()=>{
        const owner=await uid();
        const row=await checked(supabase.from('guild_needs').update({status:'published'})
          .eq('id',need_id).eq('owner_id',owner).eq('status','draft')
          .select(publicNeeds).maybeSingle());
        if(!row)throw new Error('草稿不存在、已發布或權限不足');
        return {need:row,public:true};
      }));
      server.registerTool('my_needs',{
        title:'我的需求 / My requests',
        description:'只讀取自己建立的草稿和已公開的需求。',
        annotations:{readOnlyHint:true},inputSchema:z.object({})
      },()=>run(async()=>{
        const id=await uid();
        return {needs:await checked(supabase.from('guild_needs').select(publicNeeds)
          .eq('owner_id',id).order('created_at',{ascending:false}).limit(60))};
      }));
      server.registerTool('reply_to_need',{
        title:'向需求者表達意願 / Express interest',
        description:'向公開需求提出合作或交流意願。先向使用者確認傳送的文字，這是私人訊息且不可自動送出。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({need_id:z.string().uuid(),message:z.string().trim().min(6).max(1200)})
      },({need_id,message})=>run(async()=>{
        const sender_id=await uid();
        return {reply:await checked(supabase.from('guild_need_replies').insert({
          need_id,sender_id,message,status:'sent'
        }).select(replyCols).single())};
      }));
      server.registerTool('my_need_replies',{
        title:'我的需求互動 / My matching responses',
        description:'讀取會員自己發出的意願及收到的私人回覆，資料庫會限制只有當事人能看。',
        annotations:{readOnlyHint:true},inputSchema:z.object({})
      },()=>run(async()=>{
        await uid();
        return {replies:await checked(supabase.from('guild_need_replies').select(replyCols)
          .order('created_at',{ascending:false}).limit(80))};
      }));
      server.registerTool('decide_need_reply',{
        title:'決定是否願意交流 / Decide on interest',
        description:'需求發布者對收到的意願選擇接受或婉拒。需要使用者明確確認，接受僅代表有意願，並不公開聯絡資料。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({reply_id:z.string().uuid(),decision:z.enum(['accepted','declined'])})
      },({reply_id,decision})=>run(async()=>{
        await uid();
        const row=await checked(supabase.from('guild_need_replies').update({status:decision})
          .eq('id',reply_id).eq('status','sent').select(replyCols).maybeSingle());
        if(!row)throw new Error('未找到可處理的意願或沒有權限');
        return {reply:row};
      }));
      server.registerTool('close_need',{
        title:'結束我的公開需求 / Close request',
        description:'將自己的需求從公開搜尋中下架，需要當事人確認。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({need_id:z.string().uuid()})
      },({need_id})=>run(async()=>{
        const id=await uid();
        const row=await checked(supabase.from('guild_needs').update({status:'closed'})
          .eq('id',need_id).eq('owner_id',id).eq('status','published').select('id,status').maybeSingle());
        if(!row)throw new Error('需求不存在或狀態不符');
        return {need:row};
      }));
      server.registerTool('read_private_chat',{
        title:'讀取已雙方同意的私訊 / Read private chat',
        description:'只有需求發布者接受合作意願後的兩位當事人可以讀取。資料庫 RLS 防止其他會員讀到。',
        annotations:{readOnlyHint:true},
        inputSchema:z.object({reply_id:z.string().uuid()})
      },({reply_id})=>run(async()=>{
        await uid();
        const [messages,blocked]=await Promise.all([
          checked(supabase.from('guild_need_messages')
            .select('id,reply_id,sender_id,content,created_at').eq('reply_id',reply_id)
            .order('created_at',{ascending:true}).limit(100)),
          checked(supabase.from('guild_need_chat_blocks').select('reply_id')
            .eq('reply_id',reply_id).maybeSingle())
        ]);
        return {messages,blocked:!!blocked};
      }));
      server.registerTool('send_private_chat',{
        title:'發送已同意的私訊 / Send private message',
        description:'必須經會員確認文字後才能發送；僅限已互相同意且未被封鎖的當事人。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({reply_id:z.string().uuid(),
          content:z.string().trim().min(1).max(1500),confirmed:z.literal(true)})
      },({reply_id,content})=>run(async()=>{
        const sender_id=await uid();
        return {message:await checked(supabase.from('guild_need_messages')
          .insert({reply_id,sender_id,content})
          .select('id,reply_id,created_at').single())};
      }));
      server.registerTool('block_private_chat',{
        title:'封鎖對話 / Block private chat',
        description:'會員明確確認後封鎖對話，雙方都不能再發送新訊息；操作不可透過 AI 自動執行。',
        annotations:{readOnlyHint:false,destructiveHint:false},
        inputSchema:z.object({reply_id:z.string().uuid(),confirmed:z.literal(true)})
      },({reply_id})=>run(async()=>{
        const blocker_id=await uid();
        return {blocked:await checked(supabase.from('guild_need_chat_blocks')
          .insert({reply_id,blocker_id}).select('reply_id,created_at').single())};
      }));
      return server;
    });
    return handler.fetch(req);
  }
));