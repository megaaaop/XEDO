import test from 'node:test';
import assert from 'node:assert/strict';
import {requestGEEBasemap} from '../src/planning-basemap.js';
import {basemapViewport} from '../src/planning-basemap-view.js';

const clock=Date.parse('2026-10-26T00:00:00Z');
const geometry=basemapViewport([11200000,1400000,11240000,1430000]).geometry;
const manifest=()=>({kind:'gee_basemap',provider:'gee',collection:'COPERNICUS/S2_SR_HARMONIZED',renderMode:'pixels',geometry:structuredClone(geometry),sessionId:'server_issued_session_123456',tileUrl:'/api/v1/gee/imagery/tiles/server_issued_session_123456/{z}/{x}/{y}',expiresAt:'2026-10-26T00:30:00Z',start:'2026-09-27',end:'2026-10-26',imageCount:12,acquiredFrom:'2026-09-28T03:00:00Z',acquiredTo:'2026-10-25T03:00:00Z'});
const options={now:()=>clock,retryDelayMs:0,timeoutMs:100};
const pendingUntilAbort=signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}));

test('A cold-start timeout recovers once with a fresh deadline and the same bounded area',async()=>{
  const before=structuredClone(geometry),signals=[];let calls=0,retries=0;
  const result=await requestGEEBasemap(geometry,{...options,timeoutMs:10,onRetry:()=>retries++,fetchImpl:async(url,init)=>{
    calls++;signals.push(init.signal);
    assert.equal(url,'/api/v1/gee/imagery/basemap');assert.equal(init.method,'POST');assert.equal(init.credentials,'same-origin');
    assert.equal(init.redirect,'error');assert.deepEqual(JSON.parse(init.body),{geometry:before});
    if(calls===1)return pendingUntilAbort(init.signal);
    assert.equal(init.signal.aborted,false);return Response.json(manifest());
  }});
  assert.equal(calls,2);assert.equal(retries,1);assert.equal(signals[0].aborted,true);assert.notEqual(signals[0],signals[1]);
  assert.deepEqual(result,manifest());assert.deepEqual(geometry,before);
});

test('The timeout also bounds an HTTP response whose JSON body never finishes',async()=>{
  let calls=0;
  const result=await requestGEEBasemap(geometry,{...options,timeoutMs:10,fetchImpl:async(_url,{signal})=>{
    calls++;
    if(calls===1)return {ok:true,headers:new Headers({'content-type':'application/json'}),json:()=>pendingUntilAbort(signal)};
    return Response.json(manifest());
  }});
  assert.equal(calls,2);assert.equal(result.sessionId,manifest().sessionId);
});

test('Transient HTTP and network failures recover once without substituting demo imagery',async()=>{
  for(const first of [()=>new Response('Gateway unavailable',{status:502}),()=>Response.json({code:'GEE_UNAVAILABLE',message:'Temporarily unavailable'},{status:503}),()=>{throw new TypeError('Failed to fetch');}]){
    let calls=0;
    const result=await requestGEEBasemap(geometry,{...options,fetchImpl:async()=>{calls++;return calls===1?first():Response.json(manifest());}});
    assert.equal(calls,2);assert.equal(result.kind,'gee_basemap');assert.equal(result.sessionId,manifest().sessionId);
  }
});

test('Missing configuration, denied access, empty data and invalid manifests remain explicit errors',async()=>{
  const cases=[
    {reply:()=>Response.json({code:'GEE_NOT_CONFIGURED',message:'Satellite imagery is not configured on this server.'},{status:503}),match:/not configured/},
    {reply:()=>Response.json({code:'GEE_ACCESS_DENIED',message:'GEE permissions are not ready.'},{status:403}),match:/permissions/},
    {reply:()=>Response.json({code:'GEE_NO_IMAGES',message:'No images cover this area.'},{status:422}),match:/No images/},
    {reply:()=>Response.json({...manifest(),imageCount:0}),match:/response is invalid/},
    {reply:()=>Response.json({...manifest(),tileUrl:'https://other.example/tiles'}),match:/response is invalid/},
    {reply:()=>new Response('not JSON',{headers:{'content-type':'application/json'}}),match:/Unexpected|JSON/},
    {reply:()=>new Response('not JSON'),match:/invalid response/},
  ];
  for(const {reply,match}of cases){
    let calls=0;
    await assert.rejects(requestGEEBasemap(geometry,{...options,fetchImpl:async()=>{calls++;return reply();}}),match);
    assert.equal(calls,1);
  }
});

test('Persistent transient failures stop after two attempts and surface the final problem',async()=>{
  let calls=0,retries=0;
  await assert.rejects(requestGEEBasemap(geometry,{...options,onRetry:()=>retries++,fetchImpl:async()=>{
    calls++;return Response.json({code:'GEE_UNAVAILABLE',message:'Still unavailable.'},{status:503});
  }}),/Still unavailable/);
  assert.equal(calls,2);assert.equal(retries,1);
});

test('Changing or disposing a view cancels the active request and never retries it',async()=>{
  const controller=new AbortController();let calls=0,signal,started;
  const began=new Promise(resolve=>started=resolve);
  const request=requestGEEBasemap(geometry,{...options,signal:controller.signal,fetchImpl:async(_url,init)=>{
    calls++;signal=init.signal;started();return pendingUntilAbort(signal);
  }});
  await began;controller.abort();
  await assert.rejects(request,{name:'AbortError'});assert.equal(calls,1);assert.equal(signal.aborted,true);
});

test('Cancelling during retry backoff prevents a stale viewport from starting another request',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(requestGEEBasemap(geometry,{...options,signal:controller.signal,retryDelayMs:500,onRetry:()=>controller.abort(),fetchImpl:async()=>{
    calls++;return new Response(null,{status:503});
  }}),{name:'AbortError'});
  assert.equal(calls,1);
});

test('A late response from an aborted view cannot become a successful manifest',async()=>{
  const controller=new AbortController();let finish,started;
  const began=new Promise(resolve=>started=resolve);
  const request=requestGEEBasemap(geometry,{...options,signal:controller.signal,fetchImpl:()=>new Promise(resolve=>{
    finish=resolve;started();
  })});
  await began;controller.abort();finish(Response.json(manifest()));
  await assert.rejects(request,{name:'AbortError'});
});
