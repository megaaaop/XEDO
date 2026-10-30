import {runtimeConfig} from './runtime-config.mjs';
import {createMapCache,cacheHash} from '../src/gee-map-cache.js';
import {INSPECTOR_PUBLISHABLE_KEY} from '../src/inspector-project.js';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const existing=process.argv[2],out=process.env.XEDO_CACHE_QA_OUTPUT;
if(!/^[a-f0-9]{64}$/.test(existing||'')||!out)throw new Error('Explicit QA cache key and evidence directory required');
const env=await runtimeConfig({...process.env,GEE_CACHE_ENABLED:'1'}),cache=createMapCache(env);
if(!cache)throw new Error('LOCAL_CACHE_KEY_REQUIRED');
const initial=await cache.rpc('status'),entry=await cache.rpc('claim',{key:existing,generation:crypto.randomUUID(),recipe:{}});
assert.equal(entry.state,'hit');
const auth={apikey:INSPECTOR_PUBLISHABLE_KEY,...(INSPECTOR_PUBLISHABLE_KEY.startsWith('eyJ')?{Authorization:'Bearer '+INSPECTOR_PUBLISHABLE_KEY}:{})};
const denials=[];
for(const kind of ['public','authenticated']){
  const response=await fetch(env.GEE_CACHE_URL+'/storage/v1/object/'+kind+'/xedo-gee-map-cache-v1/'+entry.path,{headers:auth});
  assert.ok([400,401,403,404].includes(response.status));denials.push({kind,status:response.status});
}
const run=crypto.randomUUID(),tokens=await Promise.all(Array.from({length:192},async(_,i)=>({key:await cacheHash(new TextEncoder().encode('xedo-cache-qa/'+run+'/'+i)),generation:crypto.randomUUID(),recipe:{qa:run}})));
async function pool(items,fn){let cursor=0;await Promise.all(Array.from({length:8},async()=>{while(cursor<items.length){const i=cursor++;await fn(items[i],i);}}));}
const results=[];let peak;
try{
  await pool(tokens,async token=>results.push(await cache.rpc('claim',token)));
  peak=await cache.rpc('status');
  const leaders=results.filter(r=>r.state==='leader').length;
  assert.equal(leaders,Math.floor((initial.cap-initial.charged)/1048576));
  assert.equal(peak.charged,initial.charged+leaders*1048576);assert.ok(peak.charged<=200000000);
}finally{await pool(tokens,token=>cache.rpc('release_build',token));}
const afterReservations=await cache.rpc('status');assert.equal(afterReservations.charged,initial.charged);
await cache.rpc('discard',{key:existing,generation:entry.generation});
await cache.cleanup();const cleaned=await cache.rpc('status');assert.equal(cleaned.charged,0);assert.equal(cleaned.entries,0);
const result={checkedAtUtc:new Date().toISOString(),method:'Real Supabase RPC across eight concurrent HTTP clients, 192 disjoint QA building claims; no raster uploads for capacity test; every QA token released by its own generation',initial,denials,claims:results.length,leaders:results.filter(r=>r.state==='leader').length,bypasses:results.filter(r=>r.state==='bypass').length,peak,afterReservations,cleaned,physicalCleanupOfQaTile:true,sourcePublished:false};
await writeFile(out+'/control-receipt.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
