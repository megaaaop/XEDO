import {runtimeConfig} from './runtime-config.mjs';
import {hostedGEEFetch} from '../api/gee.mjs';
import {geeImageryAPI} from '../src/gee-imagery-api.js';
import {createGEEBasemap,getGEEImageryTile} from '../src/gee-imagery.js';
import {createMapCache,cacheHash,validCachePNG} from '../src/gee-map-cache.js';
import {INSPECTOR_PUBLISHABLE_KEY} from '../src/inspector-project.js';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const mode=process.argv[2]||'miss',out=process.env.XEDO_CACHE_QA_OUTPUT;
if(!out||!['miss','hit','outage'].includes(mode))throw new Error('Use an explicit evidence directory and mode');
await mkdir(out,{recursive:true});
const env=await runtimeConfig({...process.env,GEE_CACHE_ENABLED:'1'});
if(!env.GEE_CACHE_SERVER_KEY)throw new Error('LOCAL_CACHE_KEY_REQUIRED');
const tasks=[],events=[],deadline=Date.now()+60000,context={defer:p=>tasks.push(p),deadline:()=>deadline,onEvent:name=>events.push(name)};
let pixelCalls=0,metadataCalls=0;
const observedFetch=(url,options)=>{if(url.endsWith('/image:computePixels'))pixelCalls++;if(url.endsWith('/value:compute'))metadataCalls++;return fetch(url,options);};
const services={createGEEBasemap:(e,i,o)=>createGEEBasemap(e,i,{...o,fetchImpl:observedFetch}),getGEEImageryTile:(e,i,o)=>getGEEImageryTile(e,i,{...o,fetchImpl:observedFetch})};
const outage=mode==='outage'?createMapCache(env,{...context,fetchImpl:async()=>{throw new Error('simulated cache outage');}}):null;
const handler=(request,e,options)=>geeImageryAPI(request,e,{...options,services,...(outage?{cache:outage}:{})});
const rows=[];
async function call(label,path,body){
  const start=performance.now(),request=new Request('https://xedo.local'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  const response=await hostedGEEFetch(request,{env,handler,cacheContext:context}),bytes=new Uint8Array(await response.arrayBuffer());
  rows.push({label,status:response.status,wallMs:+(performance.now()-start).toFixed(2),bytes:bytes.length,hash:await cacheHash(bytes),persistent:response.headers.get('x-xedo-persistent-cache'),timing:response.headers.get('server-timing')});
  assert.equal(response.status,200,label);
  return response.headers.get('content-type')?.includes('json')?JSON.parse(new TextDecoder().decode(bytes)):bytes;
}
const viewport={type:'Polygon',coordinates:[[[101.05,12.48],[101.42,12.48],[101.42,12.76],[101.05,12.76],[101.05,12.48]]]};
const manifest=await call('basemap','/api/v1/gee/imagery/basemap',{geometry:viewport});
const path=manifest.tileUrl.replace('{z}',11).replace('{x}',1599).replace('{y}',951);
const image=await call('tile',path);
assert.ok(await validCachePNG(image));await Promise.all(tasks);
const cache=createMapCache(env,context),status=await cache.rpc('status');
await writeFile(out+'/'+mode+'-observed.json',JSON.stringify({checkedAtUtc:new Date().toISOString(),mode,rows,events,pixelCalls,metadataCalls,status},null,2)+'\n');
assert.equal(status.cap,200000000);assert.ok(status.charged>=image.length&&status.charged<=status.cap);
if(mode==='miss'){assert.equal(rows[1].persistent,'miss');assert.equal(pixelCalls,1);assert.equal(status.states.ready,1);}
if(mode==='hit'){assert.equal(rows[1].persistent,'hit');assert.equal(pixelCalls,0);}
if(mode==='outage'){assert.equal(rows[1].persistent,'bypass');assert.equal(pixelCalls,1);}
const headers={apikey:INSPECTOR_PUBLISHABLE_KEY,...(INSPECTOR_PUBLISHABLE_KEY.startsWith('eyJ')?{Authorization:'Bearer '+INSPECTOR_PUBLISHABLE_KEY}:{})};
const denied=await fetch(env.GEE_CACHE_URL+'/rest/v1/rpc/xedo_cache_v1',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({op:'status',payload:{}})});
assert.ok([401,403].includes(denied.status));
const result={checkedAtUtc:new Date().toISOString(),mode,rows,pixelCalls,metadataCalls,status,anonymousRpcStatus:denied.status,pngValid:true,sourcePublished:false,note:'Local working-tree hosted adapter + real GEE and real Supabase; fresh Node process per mode; not a production deployment or P95 benchmark'};
await writeFile(out+'/'+mode+'-receipt.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
