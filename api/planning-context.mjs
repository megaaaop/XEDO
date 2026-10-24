import {fetchGEEMissionContext} from '../src/gee-mission-context.js';
const PATHS=new Set(['/api/v1/gee/planning-context','/api/planning-context']);
const baseHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{...baseHeaders,...headers}});
let active=0;
export async function hostedPlanningContextFetch(request,{env=process.env,fetchContext=fetchGEEMissionContext}={}){
 const url=new URL(request.url);
 if(!PATHS.has(url.pathname)||url.search)return json({code:'NOT_FOUND',message:'Planning context endpoint not found.'},404);
 if(request.method!=='POST')return json({code:'METHOD_NOT_ALLOWED',message:'Use POST.'},405,{Allow:'POST'});
 const site=request.headers.get('sec-fetch-site');
 if(site&&!['same-origin','none'].includes(site))return json({code:'GEE_CONTEXT_ORIGIN_DENIED',message:'Use planning data from the XEDO website.'},403);
 for(const name of ['origin','referer']){const value=request.headers.get(name);if(value)try{if(new URL(value).origin!==url.origin)return json({code:'GEE_CONTEXT_ORIGIN_DENIED',message:'Use planning data from the XEDO website.'},403);}catch{return json({code:'GEE_CONTEXT_REQUEST_INVALID',message:'Invalid request origin.'},400);}}
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({code:'GEE_CONTEXT_JSON_REQUIRED',message:'Send the mission area as JSON.'},415);
 const size=request.headers.get('content-length');if(size&&(!/^\d+$/.test(size)||Number(size)>8192))return json({code:'GEE_CONTEXT_BODY_TOO_LARGE',message:'Planning context input exceeds 8 KiB.'},413);
 let input;
 try{
  if(!request.body)throw Error();const reader=request.body.getReader(),chunks=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();return json({code:'GEE_CONTEXT_BODY_TOO_LARGE',message:'Planning context input exceeds 8 KiB.'},413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }catch{return json({code:'GEE_CONTEXT_JSON_INVALID',message:'Send valid JSON for the mission area.'},400);}
 if(active>=2)return json({code:'GEE_CONTEXT_BUSY',message:'Planning data is busy. Retry shortly.'},429,{'Retry-After':'5'});
 active++;
 try{
  const scoped={GEE_PROJECT_ID:env.GEE_PROJECT_ID,GEE_SERVICE_ACCOUNT_JSON:env.GEE_SERVICE_ACCOUNT_JSON};
  return json(await fetchContext(scoped,input,{signal:request.signal}));
 }catch(error){const invalid=error.code==='GEE_CONTEXT_INPUT_INVALID'&&Number.isInteger(error.status)&&error.status>=400&&error.status<500;return json({code:invalid?'GEE_CONTEXT_INPUT_INVALID':'GEE_CONTEXT_UNAVAILABLE',message:invalid?error.message:'GEE planning data is unavailable. Retry shortly.',retryable:!invalid},invalid?error.status:503);}
 finally{active--;}
}
export async function handleHostedPlanningContext(req,res,options){
 const controller=new AbortController(),abort=()=>controller.abort(),closed=()=>{if(!res.writableEnded)abort();};
 req.once?.('aborted',abort);res.once?.('close',closed);if(req.aborted)abort();
 try{
  let reply;
  try{
   const host=req.headers.host,protocol=req.headers['x-forwarded-proto']||(req.socket?.encrypted?'https':'http');
   if(typeof host!=='string'||/[\s/@\\?#]/.test(host)||!['http','https'].includes(protocol))throw Error();
   const url=new URL(req.url,protocol+'://'+host);if(url.host.toLowerCase()!==host.toLowerCase())throw Error();
   const headers=new Headers();for(const name of ['content-type','content-length','origin','referer','sec-fetch-site']){const value=req.headers[name];if(typeof value==='string')headers.set(name,value);else if(value!==undefined)throw Error();}
   const method=req.method||'GET',init={method,headers,signal:controller.signal};
   if(!['GET','HEAD'].includes(method)){if(req.body!==undefined)init.body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);else{init.body=req;init.duplex='half';}}
   reply=await hostedPlanningContextFetch(new Request(url,init),options);
  }catch{reply=json({code:'GEE_CONTEXT_REQUEST_INVALID',message:'Invalid planning context request.'},400);}
  if(res.destroyed)return;res.statusCode=reply.status;for(const [name,value]of reply.headers)res.setHeader(name,value);res.end(Buffer.from(await reply.arrayBuffer()));
 }finally{req.removeListener?.('aborted',abort);res.removeListener?.('close',closed);}
}
export default {fetch:hostedPlanningContextFetch};