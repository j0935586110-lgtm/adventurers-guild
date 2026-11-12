// Read-only gateway for public NodeBB discussions. Strict upstream allowlist; no auth headers forwarded.
// The public forum is a separate service and cannot be framed due to SAMEORIGIN / CSP.
function send(res, status, value) {
  res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=120');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(value);
}
const num = x => Number.isSafeInteger(Number(x)) && Number(x) > 0 && Number(x) <= 100000000 ? Number(x) : null;
const short = (s,n=300) => String(s || '').slice(0,n);
const member = u => ({ username:short(u?.username,80), userslug:short(u?.userslug,120) });
const topic = t => ({tid:Number(t.tid), cid:Number(t.cid), title:short(t.title,400), slug:short(t.slug,500), postcount:Number(t.postcount)||0, timestamp:Number(t.timestamp)||0, user:member(t.user), category:short(t.category?.name,90)});
const category = c => ({cid:Number(c.cid), name:short(c.name,100), description:short(c.description,380), totalTopicCount:Number(c.totalTopicCount)||Number(c.topic_count)||0});
export default async function handler(req,res) {
  if(req.method !== 'GET') return send(res,405,{error:'Method not allowed'});
  const view=typeof req.query?.view==='string'?req.query.view:'recent';
  const id=num(req.query?.id);
  const page=num(req.query?.page)||1;
  if(page>8 || !['recent','categories','category','topic'].includes(view) || (['topic','category'].includes(view) && !id))
    return send(res,400,{error:'Invalid forum query'});
  const path = view==='recent'?'/api/recent?page='+page
    : view==='categories'?'/api/categories'
    : view==='category'?'/api/category/'+id+'?page='+page
    : '/api/topic/'+id+'?page='+page;
  try {
    const response=await fetch('https://forum.928174.xyz'+path,{headers:{Accept:'application/json','User-Agent':'adventurers-guild-forum-view/1.0'},signal:AbortSignal.timeout(8500)});
    if(response.status===404) return send(res,404,{error:'Discussion not found'});
    if(!response.ok) return send(res,502,{error:'Forum is temporarily unavailable'});
    const data=await response.json();
    if(view==='categories') return send(res,200,{categories:(data.categories||[]).filter(x=>!x.disabled).slice(0,40).map(category)});
    if(view==='recent'||view==='category') return send(res,200,{topics:(data.topics||[]).filter(t=>t.tid&&!t.deleted).slice(0,50).map(topic),category: view==='category'?short(data.name,100):''});
    return send(res,200,{topic:{tid:Number(data.tid),title:short(data.title,400),cid:Number(data.cid),postcount:Number(data.postcount)||0,locked:!!data.locked},posts:(data.posts||[]).filter(p=>!p.deleted).slice(0,40).map(p=>({pid:Number(p.pid),username:short(p.user?.username,80),timestamp:Number(p.timestamp)||0,content:short(p.content,45000)}))});
  } catch { return send(res,502,{error:'Forum is temporarily unavailable'}); }
}
