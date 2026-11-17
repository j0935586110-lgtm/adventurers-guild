import { supabase } from './supabase';

export interface LineContact {
  line_id: string;
  share_after_match: boolean;
}
const LINE_PATTERN = /^@?[A-Za-z0-9._-]{3,39}$/;

export async function getMyLineContact(userId: string): Promise<LineContact | null> {
  const {data,error} = await supabase.from('guild_line_contacts')
    .select('line_id,share_after_match').eq('owner_id',userId).maybeSingle();
  if(error) throw error;
  return data as LineContact | null;
}
export async function saveMyLineContact(userId: string, contact: LineContact): Promise<LineContact | null> {
  const line_id = contact.line_id.trim();
  if(!line_id) {
    const {error} = await supabase.from('guild_line_contacts').delete().eq('owner_id',userId);
    if(error) throw error;
    return null;
  }
  if(!LINE_PATTERN.test(line_id)) throw new Error('LINE ID 格式不正確（使用英數字、點、底線或連字號）。');
  const {data,error} = await supabase.from('guild_line_contacts').upsert({
    owner_id:userId,line_id,share_after_match:contact.share_after_match,updated_at:new Date().toISOString()
  },{onConflict:'owner_id'}).select('line_id,share_after_match').single();
  if(error) throw error;
  return data as LineContact;
}
/** Returns the partner's LINE ID only after a confirmed match and their opt-in. */
export async function getMatchedLine(replyId: string): Promise<string | null> {
  const {data,error} = await supabase.rpc('guild_match_line',{p_reply_id:replyId});
  if(error) throw error;
  return typeof data === 'string' && data.length>0 ? data : null;
}
