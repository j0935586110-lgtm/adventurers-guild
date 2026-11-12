import {supabase} from './supabase';

export type NeedKind = 'cooperation'|'support'|'resources'|'events'|'jobs'|'hiring'|'clubs'|'friends'|'sports'|'dating';
export interface GuildNeed {
  id:string; owner_id:string; kind:NeedKind; title:string; description:string;
  city:string; status:'draft'|'published'|'closed'; created_at:string;
}
export interface GuildNeedReply {
  id:string; need_id:string; sender_id:string; message:string;
  status:'sent'|'accepted'|'declined'; created_at:string;
}
export const NEED_CATEGORIES: {value:NeedKind, zh:string,en:string}[]=[
 {value:'cooperation',zh:'找合作伙伴',en:'Find partners'},
 {value:'hiring',zh:'找員工／人才',en:'Hire people'},
 {value:'jobs',zh:'找工作／接案',en:'Find work'},
 {value:'support',zh:'找支援',en:'Find help'},
 {value:'resources',zh:'找資源',en:'Find resources'},
 {value:'events',zh:'找活動',en:'Find events'},
 {value:'clubs',zh:'找社團',en:'Find groups'},
 {value:'friends',zh:'找玩伴／朋友',en:'Find friends'},
 {value:'sports',zh:'找登山／健身伙伴',en:'Find sports buddies'},
];
const cols='id,owner_id,kind,title,description,city,status,created_at';
function err(e:any):Error {
 const code=String(e?.code||'');
 if(code==='23514')return new Error('公開內容不能包含私人聯絡資訊、外部網址或不支援的類型。');
 if(code==='42501')return new Error('權限不足或未開放此類需求。');
 if(code==='23505')return new Error('你已經回覆過這項需求。');
 return new Error(e?.message||'操作失敗，請稍後重試');
}
function safeTerm(s:string) {return s.trim().replace(/[\\%_]/g,'').slice(0,100);}
export async function listPublishedNeeds(opts:{kind?:string;keyword?:string;city?:string}={}):Promise<GuildNeed[]> {
 let q=supabase.from('guild_needs').select(cols).eq('status','published');
 if(opts.kind)q=q.eq('kind',opts.kind);
 if(opts.city)q=q.eq('city',opts.city);
 const word=safeTerm(opts.keyword||'');
 if(word)q=q.ilike('title','%'+word+'%');
 const {data,error}=await q.order('created_at',{ascending:false}).limit(40);
 if(error)throw err(error);return(data||[]) as GuildNeed[];
}
export async function createNeedDraft(owner_id:string,params:{kind:NeedKind;title:string;description:string;city:string}):Promise<GuildNeed>{
 const {data,error}=await supabase.from('guild_needs').insert({...params,owner_id,status:'draft'}).select(cols).single();
 if(error||!data)throw err(error);return data as GuildNeed;
}
export async function publishNeed(id:string):Promise<GuildNeed>{
 const {data,error}=await supabase.from('guild_needs').update({status:'published'}).eq('id',id).eq('status','draft').select(cols).single();
 if(error||!data)throw err(error);return data as GuildNeed;
}
export async function closeNeed(id:string):Promise<void>{
 const {error}=await supabase.from('guild_needs').update({status:'closed'}).eq('id',id);
 if(error)throw err(error);
}
export async function replyToNeed(userId:string,needId:string,message:string):Promise<void>{
 const {error}=await supabase.from('guild_need_replies').insert({sender_id:userId,need_id:needId,message,status:'sent'});
 if(error)throw err(error);
}
export async function listMyReplies():Promise<GuildNeedReply[]>{
 const {data,error}=await supabase.from('guild_need_replies').select('id,need_id,sender_id,message,status,created_at')
  .order('created_at',{ascending:false}).limit(100);
 if(error)throw err(error);return(data||[]) as GuildNeedReply[];
}
export async function decideReply(id:string,status:'accepted'|'declined'):Promise<void>{
 const {error}=await supabase.from('guild_need_replies').update({status}).eq('id',id).eq('status','sent');
 if(error)throw err(error);
}
export async function reportNeed(needId:string,reporterId:string,reason:string):Promise<void>{
 const {error}=await supabase.from('guild_need_reports').insert({need_id:needId,reporter_id:reporterId,reason});
 if(error)throw err(error);
}

export interface NeedChatMessage {
 id:string; reply_id:string; sender_id:string; content:string; created_at:string;
}
export async function listNeedMessages(replyId:string):Promise<NeedChatMessage[]>{
 const {data,error}=await supabase.from('guild_need_messages')
  .select('id,reply_id,sender_id,content,created_at').eq('reply_id',replyId)
  .order('created_at',{ascending:true}).limit(100);
 if(error)throw err(error);return(data||[]) as NeedChatMessage[];
}
export async function sendNeedMessage(replyId:string,senderId:string,content:string):Promise<void>{
 const {error}=await supabase.from('guild_need_messages').insert({
  reply_id:replyId,sender_id:senderId,content
 });
 if(error)throw err(error);
}
export async function blockNeedChat(replyId:string,userId:string):Promise<void>{
 const {error}=await supabase.from('guild_need_chat_blocks').insert({
  reply_id:replyId,blocker_id:userId
 });
 if(error)throw err(error);
}
export async function isNeedChatBlocked(replyId:string):Promise<boolean>{
 const {data,error}=await supabase.from('guild_need_chat_blocks').select('reply_id')
  .eq('reply_id',replyId).maybeSingle();
 if(error)throw err(error);return !!data;
}
