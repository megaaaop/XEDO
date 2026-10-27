import test from 'node:test';
import assert from 'node:assert/strict';
import {requestPlanningContext,planningContextError,classifyPlanningContextError} from '../src/planning-context-request.js';

const payload={geometry:{type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.61],[101.2,12.6]]]},home:[101.2,12.6],sceneId:null,startAt:null,endAt:null};
const immediate={setTimeout(fn){queueMicrotask(fn);return 1;},clearTimeout(){}};

test('Progress changes only after an actual response and validation, with no guessed server percent',async()=>{
 let resolve;const steps=[],held=new Promise(yes=>{resolve=yes;});
 const request=requestPlanningContext(payload,{fetchImpl:()=>held,validate:value=>({...value,checked:true}),onProgress:value=>steps.push(value)});
 assert.equal(steps.length,1);assert.equal(steps[0].percent,33);assert.equal(steps[0].stage,'waiting');
 await Promise.resolve();assert.equal(steps.length,1);
 resolve(Response.json({state:'partial'}));assert.deepEqual(await request,{state:'partial',checked:true});
 assert.deepEqual(steps.map(value=>[value.stage,value.completed,value.percent]),[['waiting',1,33],['reading',2,67],['complete',3,100]]);
});

test('An HTTP failure exposes allowlisted category, status and request ID, never the raw error body',async()=>{
 let calls=0;const steps=[];
 await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>{calls++;return Response.json({code:'GEE_CONTEXT_INPUT_INVALID',message:'PRIVATE_TOKEN <script>secret</script>'},{status:422,headers:{'x-request-id':'iad1:example-123'}});},onProgress:value=>steps.push(value)}),error=>error.code==='INPUT'&&error.httpStatus===422&&error.requestId==='iad1:example-123'&&!/PRIVATE|script|secret/.test(error.message));
 assert.equal(calls,1);assert.equal(steps.at(-1).completed,2);assert.equal(steps.some(value=>value.percent===100),false);
});

test('Access and endpoint failures do not retry and do not blame an internet outage',async()=>{
 for(const [status,expected]of [[403,'ACCESS'],[404,'ENDPOINT']]){
  let calls=0;await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>{calls++;return new Response('Private proxy error',{status});}}),error=>error.code===expected&&!/Private/.test(error.message));assert.equal(calls,1);
 }
});

test('Transient busy and network failures get one bounded retry before completion',async()=>{
 for(const first of [()=>Response.json({message:'hidden'},{status:429,headers:{'Retry-After':'60'}}),()=>{throw new TypeError('private network exception');}]){
  let calls=0;const steps=[];
  const result=await requestPlanningContext(payload,{timers:immediate,fetchImpl:async()=>++calls===1?first():Response.json({ok:true}),onProgress:value=>steps.push(value)});
  assert.deepEqual(result,{ok:true});assert.equal(calls,2);assert.equal(steps.filter(value=>value.stage==='retrying').length,1);assert.ok(steps.find(value=>value.stage==='retrying').retryAfterMs<=5000);assert.equal(steps.at(-1).attempt,2);
 }
});

test('Repeated upstream failure stops after two attempts and never advances to completion',async()=>{
 let calls=0;const steps=[];
 await assert.rejects(requestPlanningContext(payload,{timers:immediate,fetchImpl:async()=>{calls++;return Response.json({message:'PRIVATE'},{status:503});},onProgress:value=>steps.push(value)}),error=>error.code==='UPSTREAM'&&error.httpStatus===503);
 assert.equal(calls,2);assert.equal(steps.some(value=>value.percent===100),false);
});

test('Invalid JSON, wrong content type and oversized response headers remain distinct',async()=>{
 for(const [response,expected]of [[()=>new Response('not-json',{headers:{'Content-Type':'application/json'}}),'RESPONSE_JSON'],[()=>new Response('<html>private</html>',{headers:{'Content-Type':'text/html'}}),'RESPONSE_TYPE'],[()=>Response.json({},{headers:{'Content-Length':'524289'}}),'RESPONSE_SIZE']]){
  let calls=0;await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>{calls++;return response();}}),error=>error.code===expected&&!/private|<html>/.test(error.message));assert.equal(calls,1);
 }
});

test('Mission mismatch and expired data are validation failures rather than network failures',async()=>{
 for(const code of ['RESPONSE_MISMATCH','RESPONSE_EXPIRED'])await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>Response.json({}),validate(){throw planningContextError(code);}}),error=>error.code===code&&error.retryable===false);
 await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>Response.json({}),validate(){throw new TypeError('private malformed structure');}}),error=>error.code==='RESPONSE_INVALID');
});

test('Cancelling while waiting to retry clears the delay and never starts another request',async()=>{
 const controller=new AbortController();let calls=0,queued=null,cleared=false;
 const request=requestPlanningContext(payload,{signal:controller.signal,timers:{setTimeout(fn){queued=fn;return 19;},clearTimeout(id){assert.equal(id,19);cleared=true;}},fetchImpl:async()=>{calls++;throw new TypeError('transport');}});
 for(let i=0;i<10&&!queued;i++)await Promise.resolve();assert.ok(queued);controller.abort();
 await assert.rejects(request,error=>error.code==='CANCELLED');assert.equal(cleared,true);assert.equal(calls,1);
});

test('Offline and deadline diagnostics are explicit and never expose arbitrary exceptions',()=>{
 assert.equal(classifyPlanningContextError(new Error('private'),{offline:true}).code,'OFFLINE');
 assert.equal(classifyPlanningContextError(new DOMException('private','AbortError'),{timedOut:true}).code,'TIMEOUT');
 assert.equal(classifyPlanningContextError(new TypeError('private')).code,'NETWORK');
 assert.doesNotMatch(classifyPlanningContextError(new Error('PRIVATE_TOKEN')).message,/PRIVATE_TOKEN/);
});

test('Known validated input errors explain the specific field while arbitrary server messages stay hidden',async()=>{
 const variants=[
  ['GEE context supports at most 120 vertices and 100 km².','AREA_LIMIT',/100 km²/],
  ['GEE context is limited to the Thailand region (97–106° E, 5–21° N).','REGION',/Thailand/],
  ['Home must be a valid coordinate within 100 km of the inspection area.','HOME',/Home position/],
  ['Select a canonical Sentinel-2 scene returned by XEDO.','SCENE',/Select a Sentinel-2 image/],
  ['Supply both mission start and end, or leave both unknown.','TIME_PAIR',/start and end/],
  ['Use an ordered mission window of at most 24 hours, within five days back and seven days ahead.','TIME_WINDOW',/end after the start/]
 ];
 for(const [message,reason,pattern]of variants)await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>Response.json({code:'GEE_CONTEXT_INPUT_INVALID',message},{status:422})}),error=>error.code==='INPUT'&&error.inputReason===reason&&pattern.test(error.message));
 await assert.rejects(requestPlanningContext(payload,{fetchImpl:async()=>Response.json({code:'GEE_CONTEXT_INPUT_INVALID',message:'PRIVATE arbitrary exception'},{status:422})}),error=>error.code==='INPUT'&&!/PRIVATE/.test(error.message)&&error.inputReason===undefined);
});

test('A body that finishes after cancellation cannot validate data or advance progress to completion',async()=>{
 const controller=new AbortController();let finishBody,validated=false;const steps=[];
 const body=new Promise(resolve=>{finishBody=resolve;});
 const request=requestPlanningContext(payload,{signal:controller.signal,fetchImpl:async()=>({ok:true,headers:new Headers({'Content-Type':'application/json'}),json:()=>body}),validate(){validated=true;return {};},onProgress:value=>steps.push(value)});
 for(let i=0;i<5;i++)await Promise.resolve();assert.equal(steps.at(-1).completed,2);
 controller.abort();finishBody({});await assert.rejects(request,error=>error.code==='CANCELLED');
 assert.equal(validated,false);assert.equal(steps.at(-1).completed,2);assert.equal(steps.some(value=>value.percent===100),false);
});
