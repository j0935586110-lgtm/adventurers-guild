// Public, first-party, read-only tools. No Supabase tokens and no member mutations.
export const KEYWORDS = Object.freeze(["ai agent","automation","excel","remote it","mcp","software engineer","customer support"]);
export async function searchPublicJobs(keyword="ai agent",request=fetch){
  if(typeof keyword!=="string" || !KEYWORDS.includes(keyword)) return {ok:false,error:"unsupported_keyword"};
  try {
    const response=await request("/api/opportunities?q="+encodeURIComponent(keyword),{credentials:"omit",headers:{"Accept":"application/json"}});
    if(!response.ok) return {ok:false,error:"upstream_unavailable",status:response.status};
    const data=await response.json();
    if(!Array.isArray(data.jobs)) return {ok:false,error:"invalid_response"};
    return {ok:true,keyword,source:data.source,sourceUrl:data.sourceUrl,count:data.jobs.length,
      type:data.type,updatedAt:data.updatedAt||null,
      jobs:data.jobs.slice(0,12).map(x=>({
        title:String(x.title||"").slice(0,160),company:String(x.company||"").slice(0,160),
        applicationLink:String(x.applicationLink||""),sourceUrl:String(x.sourceUrl||""),
        regions:Array.isArray(x.regions)?x.regions:[],employmentType:String(x.employmentType||"")
      })),
      note:"Third-party employment listings, not Guild member freelance requests or confirmed job offers."};
  } catch { return {ok:false,error:"upstream_unavailable"}; }
}
export function registerActions(registry){
  registry.register({
    name:"search_public_jobs",effect:"read",
    description:"Search the real Guild public listing API for current Taiwan or worldwide employment jobs. Never invent listings.",
    inputSchema:{type:"object",additionalProperties:false,required:["keyword"],properties:{keyword:{type:"string",enum:[...KEYWORDS]}}},
    execute:({keyword})=>searchPublicJobs(keyword)
  });
  registry.register({
    name:"get_guild_capabilities",effect:"read",
    description:"Read a description of supported public Guild services and browser-agent limitations.",
    inputSchema:{type:"object",additionalProperties:false,properties:{}},
    execute:()=>({ok:true,site:"Adventurers Guild",publicMcp:"/mcp",publicPages:["/matching","/community","/ai"],
      browserTools:["search_public_jobs","get_guild_capabilities"],
      limitations:"Browser agent is read-only and cannot access private members, submit applications, create tasks, send messages or transact."})
  });
}
