import {searchGEEImagery,createGEEImageryMap,getGEEImageryTile} from './gee-imagery.js';

const prefix='/api/v1/gee/imagery/';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const problem=(message,status=422,code='GEE_IMAGERY_REQUEST_INVALID')=>{throw Object.assign(new Error(message),{status,code});};

async function inputs(req,allowed){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))problem('Use an application/json request body.',415);
  if(Number(req.headers.get('content-length'))>65536)problem('Satellite request exceeds 64 KiB.',413);
  const raw=await req.text();
  if(new TextEncoder().encode(raw).byteLength>65536)problem('Satellite request exceeds 64 KiB.',413);
  let value;try{value=JSON.parse(raw);}catch{problem('Satellite request must be valid JSON.',400);}
  if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(key=>!allowed.includes(key)))problem('Invalid satellite request fields.');
  return value;
}

/** Fixed public-imagery operations. No database, device or arbitrary EE execution. */
export async function geeImageryAPI(req,env,{persistScene,services={searchGEEImagery,createGEEImageryMap,getGEEImageryTile}}={}){
  const url=new URL(req.url);
  if(!url.pathname.startsWith(prefix))return null;
  const route=url.pathname.slice(prefix.length);
  const origin=req.headers.get('origin');
  if((origin&&origin!==url.origin)||req.headers.get('sec-fetch-site')==='cross-site')return json({code:'GEE_IMAGERY_ORIGIN_DENIED',message:'Requests from other websites are not permitted.'},403);
  const tile=/^tiles\/([A-Za-z0-9_-]{16,4096})\/(\d{1,2})\/(\d{1,8})\/(\d{1,8})$/.exec(route);
  if(!['search','map'].includes(route)&&!tile)return json({code:'NOT_FOUND',message:'Satellite imagery route not found.'},404);
  const method=tile?'GET':'POST';
  if(req.method!==method)return new Response(null,{status:405,headers:{Allow:method,'Cache-Control':'no-store'}});
  try{
    if(tile)return await services.getGEEImageryTile(env,{sessionId:tile[1],z:Number(tile[2]),x:Number(tile[3]),y:Number(tile[4])});
    if(route==='search'){
      const result=await services.searchGEEImagery(env,await inputs(req,['geometry','start','end','maxCloud']));
      return json(result);
    }
    const value=await inputs(req,['sceneId','geometry']);
    const result=await services.createGEEImageryMap(env,value);
    if(persistScene)await persistScene(result.scene);
    return json({...result,geometry:structuredClone(value.geometry),tileUrl:prefix+'tiles/'+result.sessionId+'/{z}/{x}/{y}'});
  }catch(error){
    // Service modules expose only fixed safe errors. Do not reflect network/DB errors.
    const safe=typeof error.code==='string'&&/^(?:GEE_[A-Z_]+|VALIDATION_ERROR)$/.test(error.code);
    const status=Number.isInteger(error.status)&&error.status>=400&&error.status<=599?error.status:502;
    return json({code:safe?error.code:'GEE_IMAGERY_UNAVAILABLE',message:safe?error.message:'Satellite imagery is temporarily unavailable. Retry shortly.'},safe?status:502);
  }
}
