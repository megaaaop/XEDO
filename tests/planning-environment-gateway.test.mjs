import {EventEmitter} from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import {hostedEnvironmentFetch,handleHostedEnvironment} from '../api/environment.mjs';
const request=(body='{}',headers={},url='https://xedo.test/api/v1/environment',method='POST')=>new Request(url,{method,headers:{'Content-Type':'application/json',...headers},...(!['GET','HEAD'].includes(method)?{body}:{})});
test('Environment gateway exposes only a bounded same-origin JSON POST and passes no browser credentials',async()=>{
 let calls=0;const fetchEnvironment=async(input,options)=>{calls++;assert.deepEqual(input,{geometry:null});assert.deepEqual(Object.keys(options),['signal']);return {state:'unavailable'};};
 const response=await hostedEnvironmentFetch(request('{"geometry":null}',{cookie:'private','authorization':'secret',origin:'https://xedo.test'}),{fetchEnvironment});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('set-cookie'),null);assert.deepEqual(await response.json(),{state:'unavailable'});assert.equal(calls,1);
 for(const [req,status] of [[request('{}',{},undefined,'GET'),405],[request('{}',{origin:'https://evil.test'}),403],[request('{}',{'sec-fetch-site':'cross-site'}),403],[request('{}',{'content-type':'text/plain'}),415],[request('{}',{},'https://xedo.test/api/v1/environment?url=https://evil.test'),404],[request('{}',{},'https://xedo.test/api/v1/devices/pi-001'),404],[request('{'),400],[request(' '.repeat(8193)),413],[request('{}',{'content-length':'9000'}),413]])assert.equal((await hostedEnvironmentFetch(req,{fetchEnvironment})).status,status);
 assert.equal(calls,1);
});
test('Only validated input errors are exposed; upstream/internal messages stay private',async()=>{
 for(const err of [Error('private token https://private.test'),Object.assign(Error('private token'),{status:422})]){const reply=await hostedEnvironmentFetch(request(),{fetchEnvironment:async()=>{throw err;}});assert.equal(reply.status,503);assert.doesNotMatch(await reply.text(),/private|token/);}
 const reply=await hostedEnvironmentFetch(request(),{fetchEnvironment:async()=>{throw Object.assign(Error('Select a Thailand-region polygon.'),{status:422,code:'ENV_INPUT_INVALID'});}});assert.equal(reply.status,422);assert.match(await reply.text(),/Thailand-region/);
});
test('Gateway limits concurrent environmental computations and releases capacity after failure',async()=>{
 const releases=[];const fetchEnvironment=()=>new Promise(resolve=>releases.push(resolve));
 const first=hostedEnvironmentFetch(request(),{fetchEnvironment}),second=hostedEnvironmentFetch(request(),{fetchEnvironment});
 while(releases.length<2)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal((await hostedEnvironmentFetch(request(),{fetchEnvironment})).status,429);for(const release of releases)release({state:'partial'});assert.equal((await first).status,200);assert.equal((await second).status,200);
 assert.equal((await hostedEnvironmentFetch(request(),{fetchEnvironment:async()=>({state:'complete'})})).status,200);
});
test('Node adapter validates hosts and serves the same environment handler without persistence',async()=>{
 function output(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=value;}};}
 const res=output();await handleHostedEnvironment({url:'/api/v1/environment',method:'POST',headers:{host:'127.0.0.1:5180','content-type':'application/json'},body:{geometry:null}},res,{fetchEnvironment:async()=>({state:'partial'})});assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).state,'partial');
 const invalid=output();await handleHostedEnvironment({url:'/api/v1/environment',method:'POST',headers:{host:'bad/host'},body:{}},invalid);assert.equal(invalid.statusCode,400);
});

test('Node adapter propagates client disconnects to providers and cleans up listeners',async()=>{
  for(const event of ['response-close','request-aborted']){
    const req=Object.assign(new EventEmitter(),{url:'/api/v1/environment',method:'POST',headers:{host:'127.0.0.1:5180','content-type':'application/json'},body:{geometry:null}});
    const res=Object.assign(new EventEmitter(),{headers:{},writableEnded:false,setHeader(k,v){this.headers[k]=v;},end(value){this.body=value;this.writableEnded=true;}});
    let observedSignal,started;const ready=new Promise(resolve=>{started=resolve;});
    const work=handleHostedEnvironment(req,res,{fetchEnvironment:async(_input,{signal})=>{observedSignal=signal;started();return new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(Error('provider cancelled')),{once:true});});}});
    await ready;if(event==='response-close')res.emit('close');else req.emit('aborted');await work;
    assert.equal(observedSignal.aborted,true);assert.equal(res.statusCode,503);assert.equal(req.listenerCount('aborted'),0);assert.equal(res.listenerCount('close'),0);assert.doesNotMatch(res.body.toString(),/provider cancelled/);
  }
});

test('Normal Node adapter completion removes disconnect listeners without aborting the lookup',async()=>{
  const req=Object.assign(new EventEmitter(),{url:'/api/v1/environment',method:'POST',headers:{host:'127.0.0.1:5180','content-type':'application/json'},body:{}}),res=Object.assign(new EventEmitter(),{writableEnded:false,setHeader(){},end(){this.writableEnded=true;this.emit('close');}});let signal;
  await handleHostedEnvironment(req,res,{fetchEnvironment:async(_input,options)=>{signal=options.signal;return {state:'complete'};}});assert.equal(res.statusCode,200);assert.equal(signal.aborted,false);assert.equal(req.listenerCount('aborted'),0);assert.equal(res.listenerCount('close'),0);
});