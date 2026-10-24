import {fetchPlanningEnvironment} from '../src/planning-environment.js';

const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{...headers,...extra}});
let active=0;
export async function hostedEnvironmentFetch(request,{fetchEnvironment=fetchPlanningEnvironment}={}){
  const url=new URL(request.url);
  if(!['/api/environment','/api/v1/environment'].includes(url.pathname)||url.search) return json({code:'NOT_FOUND',message:'Environment endpoint not found.'},404);
  if(request.method!=='POST')return json({code:'METHOD_NOT_ALLOWED',message:'Use POST.'},405,{Allow:'POST'});
  if(![null,'same-origin','none'].includes(request.headers.get('sec-fetch-site')))return json({code:'ENV_ORIGIN_DENIED',message:'Use mission conditions from the XEDO website.'},403);
  for(const name of ['origin','referer']){const value=request.headers.get(name);if(value){try{if(new URL(value).origin!==url.origin)return json({code:'ENV_ORIGIN_DENIED',message:'Use mission conditions from the XEDO website.'},403);}catch{return json({code:'ENV_REQUEST_INVALID',message:'Invalid request origin.'},400);}}}
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({code:'ENV_JSON_REQUIRED',message:'Send mission conditions as JSON.'},415);
  const size=request.headers.get('content-length');
  if(size&&(!/^\d+$/.test(size)||Number(size)>8192))return json({code:'ENV_BODY_TOO_LARGE',message:'Environment request exceeds 8 KiB.'},413);
  let input;
  try{
    if(!request.body)throw Error();const reader=request.body.getReader(),chunks=[];let length=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();return json({code:'ENV_BODY_TOO_LARGE',message:'Environment request exceeds 8 KiB.'},413);}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}input=JSON.parse(new TextDecoder().decode(bytes));
  }catch{return json({code:'ENV_JSON_INVALID',message:'Send a valid JSON mission area and time window.'},400);}
  if(active>=2)return json({code:'ENV_BUSY',message:'Mission conditions are busy. Retry shortly.'},429,{'Retry-After':'5'});
  active++;
  try{return json(await fetchEnvironment(input,{signal:request.signal}));}
  catch(error){const validation=error.code==='ENV_INPUT_INVALID'&&Number.isInteger(error.status)&&error.status>=400&&error.status<500;return json({code:validation?'ENV_INPUT_INVALID':'ENV_UNAVAILABLE',message:validation?error.message:'Weather and current data are unavailable. Retry the request.',retryable:!validation},validation?error.status:503);}
  finally{active--;}
}
export async function handleHostedEnvironment(req,res,options){
  const controller=new AbortController(),abort=()=>controller.abort(),closed=()=>{if(!res.writableEnded)abort();};
  req.once?.('aborted',abort);res.once?.('close',closed);if(req.aborted)abort();
  try{
    let response;
    try{
      const host=req.headers.host,protocol=req.headers['x-forwarded-proto']||(req.socket?.encrypted?'https':'http');
      if(typeof host!=='string'||/[\s/@\\?#]/.test(host)||!['http','https'].includes(protocol))throw Error();
      const url=new URL(req.url,protocol+'://'+host);if(url.host.toLowerCase()!==host.toLowerCase())throw Error();
      const copied=new Headers();for(const name of ['content-type','content-length','origin','referer','sec-fetch-site']){const value=req.headers[name];if(typeof value==='string')copied.set(name,value);else if(value!==undefined)throw Error();}
      const method=req.method||'GET',init={method,headers:copied,signal:controller.signal};
      if(!['GET','HEAD'].includes(method)){if(req.body!==undefined)init.body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);else{init.body=req;init.duplex='half';}}
      response=await hostedEnvironmentFetch(new Request(url,init),options);
    }catch{response=json({code:'ENV_REQUEST_INVALID',message:'Invalid environment request.'},400);}
    res.statusCode=response.status;for(const [name,value] of response.headers)res.setHeader(name,value);res.end(Buffer.from(await response.arrayBuffer()));
  }finally{req.removeListener?.('aborted',abort);res.removeListener?.('close',closed);}
}
export default {fetch:hostedEnvironmentFetch};
