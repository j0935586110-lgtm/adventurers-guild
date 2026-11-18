// Public, first-party, read-only actions. Never send account credentials or mutate Guild data.
export const KEYWORDS = Object.freeze(["ai agent","automation","excel","remote it","mcp","software engineer","customer support"]);
export const NEED_KINDS = Object.freeze(["","cooperation","support","resources","events","jobs","hiring","clubs","friends","sports"]);
export async function searchPublicJobs(keyword="ai agent",request=fetch) {
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
  } catch {return {ok:false,error:"upstream_unavailable"};}
}
export async function searchPublicGuild({keyword="",city="",kind=""}={}, request=fetch) {
  if(typeof keyword!=="string" || typeof city!=="string" || !NEED_KINDS.includes(kind)) {
    return {ok:false,error:"invalid_search"};
  }
  const url=new URL("/api/agentic-directory","https://guild.invalid");
  url.searchParams.set("mode","all");
  if(keyword.trim()) url.searchParams.set("keyword",keyword.trim().slice(0,80));
  if(city.trim()) url.searchParams.set("city",city.trim().slice(0,40));
  if(kind) url.searchParams.set("kind",kind);
  try {
    const response=await request(url.pathname+url.search,{credentials:"omit",headers:{"Accept":"application/json"}});
    if(!response.ok) return {ok:false,error:"public_directory_unavailable",status:response.status};
    const data=await response.json();
    if(!data?.ok || !Array.isArray(data.services) || !Array.isArray(data.needs) || !Array.isArray(data.agents)) {
      return {ok:false,error:"invalid_directory_response"};
    }
    return data;
  } catch {return {ok:false,error:"public_directory_unavailable"};}
}
export function registerActions(registry) {
  registry.register({
    name:"search_public_jobs",effect:"read",
    description:"Search live third-party employment opportunities using Guild's existing public website API. Do not claim they are Guild members.",
    inputSchema:{type:"object",additionalProperties:false,required:["keyword"],properties:{keyword:{type:"string",enum:[...KEYWORDS]}}},
    execute:({keyword})=>searchPublicJobs(keyword),
  });
  registry.register({
    name:"search_guild_public_matches",effect:"read",
    description:"Search only Guild members' currently published public service and task records via the website. Shows NO verified AI agents until a real registry exists. Reports empty results honestly. Does not post, send messages or reveal private contacts.",
    inputSchema:{type:"object",additionalProperties:false,
      properties:{
        keyword:{type:"string",maxLength:80,description:"A short keyword from the requested task, e.g. Excel (not a full sentence)."},
        city:{type:"string",maxLength:40,description:"Optional city."},
        kind:{type:"string",enum:[...NEED_KINDS],description:"Optional Guild need kind."}
      }},
    execute:({keyword="",city="",kind=""})=>searchPublicGuild({keyword,city,kind}),
  });
  registry.register({
    name:"get_guild_capabilities",effect:"read",
    description:"Read supported public Guild services and browser-agent limitations.",
    inputSchema:{type:"object",additionalProperties:false,properties:{}},
    execute:()=>({
      ok:true,site:"Adventurers Guild",
      publicMcp:"/mcp",publicPages:["/matching","/community","/ai","/agentic.html"],
      browserTools:["search_public_jobs","search_guild_public_matches","get_guild_capabilities"],
      limitations:"All browser tools are read-only; no private members, matching guarantee, applications, publication, private chats, LINE exchange or payments.",
      nextAction:{url:"/matching?intent=post",requiresLogin:true,requiresExplicitUserConfirmation:true},
    }),
  });
}
