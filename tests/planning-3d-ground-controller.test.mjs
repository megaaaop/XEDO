import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundController} from '../src/planning-3d-ground-controller.js';

const geometry={type:'Polygon',coordinates:[[[101,12],[101.01,12],[101.01,12.01],[101,12.01],[101,12]]]};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function texture(expiry=Date.now()+60000){return {image:{width:256,height:256},extent:[1,2,3,4],expiresAt:new Date(expiry).toISOString(),disposed:0,dispose(){this.disposed++;}};}
function harness(load,extra={}){
  const states=[],images=[];
  const controller=createGroundController({load,onState:value=>states.push(value),onTexture:value=>images.push(value),...extra});
  return {controller,states,images};
}

test('Diagram needs no imagery; unchanged updates and mode switches reuse one atlas',async()=>{
  let calls=0;const image=texture(),h=harness(async()=>{calls++;return image;});
  h.controller.update({geometry});await tick();assert.equal(calls,0);
  h.controller.setMode('satellite');await tick();assert.equal(calls,1);assert.equal(h.states.at(-1).status,'ready');
  for(let i=0;i<8;i++)h.controller.update({geometry:structuredClone(geometry)});
  assert.equal(calls,1);assert.equal(h.images.length,1,'same texture is not reallocated or republished');
  h.controller.setMode('diagram');assert.equal(h.images.at(-1),null);
  h.controller.setMode('satellite');await tick();assert.equal(calls,1);assert.equal(h.images.at(-1),image);
  assert.deepEqual(geometry.coordinates[0][0],[101,12]);h.controller.dispose();assert.equal(image.disposed,1);
});

test('Switching to 2D/suspending aborts and disposes a late image without showing success',async()=>{
  const wait=deferred();let signal;const image=texture();const h=harness(async(_,options)=>{signal=options.signal;return wait.promise;});
  h.controller.update({geometry});h.controller.setMode('satellite');h.controller.suspend();assert(signal.aborted);
  wait.resolve(image);await tick();assert.equal(image.disposed,1);assert(!h.states.some(state=>state.status==='ready'));assert(!h.images.includes(image));
  h.controller.dispose();
});

test('A changed floor cannot receive an older request or its late progress',async()=>{
  const requests=[];const h=harness((_,options)=>{const wait=deferred();requests.push({wait,options});return wait.promise;});
  h.controller.update({geometry});h.controller.setMode('satellite');
  const next=structuredClone(geometry);next.coordinates[0]=next.coordinates[0].map(([x,y])=>[x+.1,y]);
  h.controller.update({geometry:next});const stateCount=h.states.length;
  requests[0].options.onProgress({stage:'tiles',completedTiles:64,totalTiles:64});assert.equal(h.states.length,stateCount);
  const old=texture(),fresh=texture();requests[0].wait.resolve(old);requests[1].wait.resolve(fresh);await tick();
  assert.equal(old.disposed,1);assert.equal(h.images.at(-1),fresh);h.controller.dispose();
});

test('Failures retain a safe reason, do not retry on updates, and recover only on explicit retry',async()=>{
  let calls=0;const h=harness(async()=>{if(++calls===1)throw Object.assign(Error('private provider body'),{code:'GROUND_PARTIAL'});return texture();});
  h.controller.update({geometry});h.controller.setMode('satellite');await tick();
  assert.equal(h.states.at(-1).status,'error');assert.match(h.states.at(-1).message,/complete ground/);assert(!JSON.stringify(h.states).includes('private provider'));
  h.controller.update({geometry});h.controller.setMode('diagram');h.controller.setMode('satellite');await tick();assert.equal(calls,1);
  h.controller.retry();await tick();assert.equal(calls,2);assert.equal(h.states.at(-1).status,'ready');h.controller.dispose();
});

test('Offline/standalone availability never starts relative API requests',async()=>{
  let calls=0;const h=harness(async()=>{calls++;return texture();});
  h.controller.update({geometry,available:false});h.controller.setMode('satellite');await tick();
  assert.equal(calls,0);assert.equal(h.states.at(-1).status,'unavailable');h.controller.dispose();
});

test('Clear/dispose releases cache and prevents late completions from mutating the view',async()=>{
  const wait=deferred(),old=texture();let count=0;
  const h=harness(async()=>++count===1?old:wait.promise);
  h.controller.update({geometry});h.controller.setMode('satellite');await tick();h.controller.clear();assert.equal(old.disposed,1);
  h.controller.update({geometry});h.controller.dispose();const length=h.states.length,newImage=texture();wait.resolve(newImage);await tick();
  assert.equal(newImage.disposed,1);assert.equal(h.states.length,length);assert.equal(h.images.at(-1),null);
});

test('Expired sessions refresh once and rejected geometry never claims a ready satellite floor',async()=>{
  let clock=Date.now(),calls=0;const first=texture(clock+1000),second=texture(clock+60000);const images=[];
  const h=harness(async()=>++calls===1?first:second,{now:()=>clock,onTexture:value=>{images.push(value);return value!==second;}});
  h.controller.update({geometry});h.controller.setMode('satellite');await tick();assert.equal(calls,1);
  clock+=2000;h.controller.update({geometry});await tick();assert.equal(calls,2);assert.equal(first.disposed,1);assert.equal(second.disposed,1);
  assert.equal(h.states.at(-1).status,'error');assert.match(h.states.at(-1).message,/match this floor/);assert.equal(images.at(-1),null);h.controller.dispose();
});
