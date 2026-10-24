import test from 'node:test';
import assert from 'node:assert/strict';
import {hostedPlanningContextFetch,handleHostedPlanningContext} from '../api/planning-context.mjs';
import {EventEmitter} from 'node:events';
const payload={geometry:{type:'Polygon',coordinates:[[[101.22,12.62],[101.222,12.62],[101.222,12.621],[101.22,12.621],[101.22,12.62]]]},home:[101.22,12.62],sceneId:null,startAt:null,endAt:null};
const request=(path='/api/v1/gee/planning-context',options={})=>new Request('https://xedo.example'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://xedo.example'},body:JSON.stringify(payload),...options});
test('Planning gateway exposes only a bounded same-origin POST and scopes private configuration',async()=>{
 let calls=0;const options={env:{GEE_PROJECT_ID:'xedo-project',GEE_SERVICE_ACCOUNT_JSON:'private-test-placeholder',DATABASE_URL:'do-not-forward',XEDO_PI_TOKEN:'do-not-forward'},fetchContext:async(env,input,{signal})=>{calls++;assert.deepEqual(Object.keys(env).sort(),['GEE_PROJECT_ID','GEE_SERVICE_ACCOUNT_JSON']);assert.deepEqual(input,payload);assert.ok(signal instanceof AbortSignal);return {state:'not_configured',request:input};}};
 const reply=await hostedPlanningContextFetch(request(),options);assert.equal(reply.status,200);assert.equal(reply.headers.get('cache-control'),'no-store');assert.doesNotMatch(await reply.text(),/private-test|do-not-forward/);
 for(const [req,status]of [[request('/api/other'),404],[request('/api/v1/gee/planning-context?url=https://example.invalid'),404],[new Request('https://xedo.example/api/v1/gee/planning-context'),405],[request(undefined,{headers:{'Content-Type':'application/json',Origin:'https://attacker.example'}}),403],[request(undefined,{headers:{'Content-Type':'text/plain'}}),415],[request(undefined,{body:'{'}),400],[request(undefined,{body:JSON.stringify({extra:'x'.repeat(8200)})}),413]])assert.equal((await hostedPlanningContextFetch(req,options)).status,status);
 assert.equal(calls,1);
});
test('Only validated user input errors are exposed; upstream errors never leak private text',async()=>{
 for(const [error,status,visible]of [[Object.assign(Error('Choose a smaller mission area.'),{code:'GEE_CONTEXT_INPUT_INVALID',status:422}),422,true],[Object.assign(Error('private upstream stack'),{code:'GEE_CONTEXT_INPUT_INVALID',status:502}),503,false],[Error('private upstream stack'),503,false]]){
  const reply=await hostedPlanningContextFetch(request(),{fetchContext:async()=>{throw error;}});assert.equal(reply.status,status);const body=await reply.text();assert.doesNotMatch(body,/private upstream/);if(visible)assert.match(body,/Choose a smaller/);
 }
});
test('Node bridge cancels an aborted client and removes listeners without transmitting credentials',async()=>{
 const req=Object.assign(new EventEmitter(),{headers:{host:'127.0.0.1:5182','content-type':'application/json'},url:'/api/v1/gee/planning-context',method:'POST',body:payload,socket:{encrypted:false}});
 const res=Object.assign(new EventEmitter(),{headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;this.writableEnded=true;}});let upstreamSignal;
 const task=handleHostedPlanningContext(req,res,{env:{},fetchContext:(_env,_input,{signal})=>{upstreamSignal=signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('private cancellation')),{once:true}));}});
 while(!upstreamSignal)await new Promise(setImmediate);req.emit('aborted');await task;assert.equal(upstreamSignal.aborted,true);assert.equal(req.listenerCount('aborted'),0);assert.equal(res.listenerCount('close'),0);assert.doesNotMatch(String(res.body),/private cancellation/);
});
test('Planning gateway releases its concurrent-work budget after failure',async()=>{
 let release;const held=new Promise(resolve=>{release=resolve;}),options={fetchContext:async()=>{await held;throw Error('private failure');}};
 const first=hostedPlanningContextFetch(request(),options),second=hostedPlanningContextFetch(request(),options);await new Promise(setImmediate);assert.equal((await hostedPlanningContextFetch(request(),options)).status,429);release();await Promise.all([first,second]);assert.equal((await hostedPlanningContextFetch(request(),{fetchContext:async()=>({state:'unavailable'})})).status,200);
});