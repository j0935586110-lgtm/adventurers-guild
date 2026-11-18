// In-browser, opt-in embeddings only. No user text goes to any inference API.
// Hugging Face is used only for downloading public model/ONNX files.
// Model: Xenova/multilingual-e5-small, MIT upstream, q8 ~118MB.
const MODEL="Xenova/multilingual-e5-small";
let extractorPromise=null;
let loadedAt=0;
let loading=false;
const clean=s=>String(s??"").trim().slice(0,500);
const basename=s=>String(s??"").split("/").pop().slice(0,70);
async function initialize(){
  if(extractorPromise)return extractorPromise;
  const started=performance.now();
  loading=true;
  extractorPromise=(async()=>{
    const {pipeline,env}=await import("@huggingface/transformers");
    env.allowRemoteModels=true;
    env.useBrowserCache=true;
    env.useWasmCache=true;
    const pipe=await pipeline("feature-extraction",MODEL,{
      device:"wasm",dtype:"q8",
      progress_callback: p=>{
        if(p?.status==="progress" || p?.status==="done"){
          const percent=Number.isFinite(p.progress)?Math.round(p.progress):null;
          self.postMessage({type:"progress",file:basename(p.file),status:p.status,percent});
        }
      }
    });
    loadedAt=Math.round(performance.now()-started);
    loading=false;
    return pipe;
  })().catch(e=>{extractorPromise=null;loading=false;throw e});
  return extractorPromise;
}
async function embeddings(pipe,values){
  const out=await pipe(values,{pooling:"mean",normalize:true});
  const data=out.data;
  const n=values.length;
  if(!data?.length || data.length%n!==0)throw new Error("invalid_embeddings");
  const size=data.length/n;
  if(size<32 || size>2048)throw new Error("invalid_embedding_dimension");
  return {data,size};
}
function dot(a,b,length,offset){
 let total=0;
 for(let i=0;i<length;i++) total+=a[i]*b[offset+i];
 return total;
}
self.addEventListener("message",async({data:request})=>{
 if(!request || !Number.isSafeInteger(request.id))return;
 const id=request.id;
 if(request.type==="capabilities"){
   self.postMessage({type:"capabilities",id,model:MODEL,wasm:true,modelDownloadApproxMb:118});return;
 }
 if(request.type!=="rank")return;
 const query=clean(request.query);
 const candidates=Array.isArray(request.candidates)?request.candidates.slice(0,25):[];
 if(query.length<2 || candidates.length===0){
   self.postMessage({type:"error",id,error:"missing_query_or_candidates"});return;
 }
 try{
   const pipe=await initialize();
   const texts=["query: "+query,...candidates.map(c=>"passage: "+clean(c.text))];
   const began=performance.now();
   const {data,size}=await embeddings(pipe,texts);
   const q=data.subarray(0,size);
   const scored=candidates.map((row,i)=>({
     id:String(row.id||"").slice(0,90),
     score:Math.round(dot(q,data,size,(i+1)*size)*10000)/10000
   })).sort((a,b)=>b.score-a.score);
   self.postMessage({type:"ranked",id,model:MODEL,backend:"wasm-q8",
     firstLoadMs:loadedAt,computeMs:Math.round(performance.now()-began),size,
     ranking:scored});
 }catch(error){
   self.postMessage({type:"error",id,error:String(error?.message||"model_failed").slice(0,250)});
 }
});
