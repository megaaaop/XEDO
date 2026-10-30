import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalysisJobs} from '../src/planning-analysis-jobs.js';
const clone=value=>structuredClone(value);
const geometry=(x=101)=>({type:'Polygon',coordinates:[[[x,12],[x+.01,12],[x+.01,12.01],[x,12]]]});
const settle=async()=>{for(let n=0;n<35;n++)await Promise.resolve();};
const failure=(message,status)=>Object.assign(Error(message),status?{status}:{});

function harness(t){
  let actor='alice',signedIn=true,key='context-a',area=geometry(),visible=true,saves=0,confirmations=0,id=0,timerId=0;
  const requests=[],opens=[],states=[],timers=new Map();
  const api={
    accountId:()=>actor,isSignedIn:()=>signedIn,contextKey:()=>key,
    confirmChange:async()=>{confirmations++;return true;},
    prepareAnalysis:async()=>{saves++;return {missionId:'00000000-0000-4000-8000-000000000001',expectedRevision:saves};},
    analysisRequest(path,options){return new Promise((resolve,reject)=>requests.push({path,options,reply:resolve,reject}));},
  };
  const ui=createAnalysisJobs({inspector:()=>api,getContext:()=>({geometry:area}),
    openResult:async(resultId,options)=>{opens.push({resultId,options});return true;},
    onChange:value=>states.push(value),isVisible:()=>visible,
    setTimer(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimer:id=>timers.delete(id),
    idFactory:()=>`00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`});
  t.after(()=>ui.dispose());
  function take(path,method){const index=requests.findIndex(r=>r.path===path&&(!method||r.options?.method===method));assert.notEqual(index,-1,`Expected ${method||'GET'} ${path}; pending: ${requests.map(r=>r.path)}`);return requests.splice(index,1)[0];}
  async function submitted(){
    const operation=ui.analyze();take('analysis-worker').reply({online:true});await settle();
    const post=take('analysis-jobs','POST');return {operation,post};
  }
  async function queued(){const {operation,post}=await submitted();post.reply({jobId:'job-a',status:'queued',stage:'queued'});await operation;return post;}
  return {ui,api,requests,opens,states,timers,take,submitted,queued,
    actor(value,signed=!!value){actor=value;signedIn=signed;ui.syncContext();},
    geometry(value){area=value;ui.syncContext();},context(value){key=value;ui.syncContext();},visible(value){visible=value;},
    get saves(){return saves;},get confirmations(){return confirmations;}};
}

test('Offline processor ends feedback and does not Save, confirm or create a job',async t=>{
  const h=harness(t),operation=h.ui.analyze();assert.equal(h.ui.snapshot().busy,true);
  h.take('analysis-worker').reply({online:false});await operation;
  assert.equal(h.saves,0);assert.equal(h.confirmations,0);assert.equal(h.requests.length,0);
  assert.equal(h.ui.snapshot().busy,false);assert.equal(h.ui.snapshot().error,true);assert.match(h.ui.snapshot().message,/offline/i);
});

test('Uncertain submit retry keeps exact mutation body and avoids another Save or confirmation',async t=>{
  const h=harness(t),first=await h.submitted();const original=first.post.options.body;
  first.post.reject(failure('Network response unavailable'));await first.operation;
  assert.equal(h.saves,1);assert.equal(h.ui.snapshot().job,null);
  const second=await h.submitted();assert.equal(second.post.options.body,original);assert.equal(h.saves,1);assert.equal(h.confirmations,1);
  second.post.reply({jobId:'job-a',status:'queued',stage:'queued'});await second.operation;
  assert.equal(h.ui.snapshot().job.jobId,'job-a');assert.equal(h.ui.snapshot().busy,false);
});

test('A definite submit validation rejection clears its mutation for a new attempt',async t=>{
  const h=harness(t),first=await h.submitted();const original=JSON.parse(first.post.options.body);
  first.post.reject(failure('Invalid area',422));await first.operation;
  const second=await h.submitted();assert.notEqual(JSON.parse(second.post.options.body).mutationId,original.mutationId);
  assert.equal(h.saves,2);second.post.reply({jobId:'job-b',status:'queued'});await second.operation;
});

test('Repeated Analyze clicks while checking presence produce one request',async t=>{
  const h=harness(t),operation=h.ui.analyze();await h.ui.analyze();await h.ui.analyze();
  assert.equal(h.requests.length,1);h.take('analysis-worker').reply({online:false});await operation;
});

test('A matching successful job automatically opens its returned result with its frozen guard',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'succeeded',resultId:'result-new'});await operation;
  assert.equal(h.opens.length,1);assert.equal(h.opens[0].resultId,'result-new');assert.equal(h.opens[0].options.automatic,true);
  assert.equal(h.opens[0].options.guard.account,'alice');assert.equal(h.opens[0].options.guard.context,'context-a');
  assert.equal(h.ui.snapshot().job.resultId,'result-new');assert.match(h.ui.snapshot().message,/loaded/i);
});

test('Changing geometry while waiting retains the completed result in history without automatic open',async t=>{
  const h=harness(t);await h.queued();h.geometry(geometry(102));const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'succeeded',resultId:'result-old-area'});await operation;
  assert.equal(h.opens.length,0);assert.equal(h.ui.snapshot().jobs[0].resultId,'result-old-area');
  assert.match(h.ui.snapshot().message,/Open the result/i);
});

test('Changing Inspector context while waiting prevents automatic open',async t=>{
  const h=harness(t);await h.queued();h.context('context-b');const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'succeeded',resultId:'result-old-context'});await operation;
  assert.equal(h.opens.length,0);assert.equal(h.ui.snapshot().job.resultId,'result-old-context');
});

test('Account change during result fetch clears old private state and ignores old completion',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll();const old=h.take('analysis-jobs/job-a');
  h.actor('bob');assert.equal(h.ui.snapshot().job,null);assert.deepEqual(h.ui.snapshot().jobs,[]);
  old.reply({jobId:'job-a',status:'succeeded',resultId:'alice-private-result'});await operation;
  assert.equal(h.opens.length,0);assert.equal(h.ui.snapshot().job,null);assert.deepEqual(h.ui.snapshot().jobs,[]);assert.equal(h.ui.snapshot().worker,null);
});

test('Logout immediately clears job rows, worker information and private result references',async t=>{
  const h=harness(t);await h.queued();assert(h.ui.snapshot().worker.online);
  h.actor(null);const snapshot=h.ui.snapshot();assert.equal(snapshot.signedIn,false);assert.equal(snapshot.job,null);assert.deepEqual(snapshot.jobs,[]);assert.equal(snapshot.worker,null);
  await h.ui.poll();assert.equal(h.requests.length,0);assert.match(h.ui.snapshot().message,/Sign in/i);
});

test('Hidden page polling makes no requests and keeps the active job',async t=>{
  const h=harness(t);await h.queued();h.visible(false);await h.ui.poll();
  assert.equal(h.requests.length,0);assert.equal(h.ui.snapshot().job.jobId,'job-a');
  assert([...h.timers.values()].some(timer=>timer.delay===15000));
});

test('Cancel remains pending until server reports cancelled and preserves the mission draft',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.cancel();const request=h.take('analysis-jobs/job-a/cancel','POST');
  assert.equal(request.options.body,'{}');assert.equal(h.ui.snapshot().busy,true);
  request.reply({jobId:'job-a',status:'cancel_requested',stage:'cancel_requested'});await operation;
  assert.equal(h.ui.snapshot().job.status,'cancel_requested');assert.match(h.ui.snapshot().message,/Waiting for the processor/i);assert.equal(h.ui.snapshot().busy,false);
  const poll=h.ui.poll();h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'cancelled'});await poll;
  assert.equal(h.ui.snapshot().job.status,'cancelled');assert.match(h.ui.snapshot().message,/draft is kept/i);assert.equal(h.opens.length,0);
});

test('Polling server cancelRequested flag reports pending cancellation without claiming cancelled',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'running',stage:'inferencing',cancelRequested:true,processedTiles:1,totalTiles:9});await operation;
  assert.equal(h.ui.snapshot().job.status,'running');assert.match(h.ui.snapshot().message,/Cancellation requested.*Waiting/i);assert.equal(h.opens.length,0);
});

test('Background polling during uncertain submit does not erase the new-job auto-open guard',async t=>{
  const h=harness(t),submission=await h.submitted();
  const background=h.ui.poll();await settle();
  // Either defer polling while busy or reconcile the same pending job safely.
  if(h.requests.some(r=>r.path==='analysis-worker')){
    h.take('analysis-worker').reply({online:true});await settle();
    h.take('analysis-jobs').reply({jobs:[{jobId:'job-a',status:'queued',stage:'queued'}]});
  }
  await background;submission.post.reply({jobId:'job-a',status:'queued',stage:'queued'});await submission.operation;
  const completion=h.ui.poll();h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'succeeded',resultId:'result-same-area'});await completion;
  assert.equal(h.opens.length,1);assert.equal(h.opens[0].resultId,'result-same-area');
});

test('Late presence after logout cannot restore old worker state or leave loading active',async t=>{
  const h=harness(t),operation=h.ui.analyze(),presence=h.take('analysis-worker');
  h.actor(null);assert.equal(h.ui.snapshot().busy,false);
  presence.reply({online:true,ownerId:'alice'});await operation;
  assert.equal(h.ui.snapshot().worker,null);assert.equal(h.ui.snapshot().signedIn,false);assert.equal(h.ui.snapshot().busy,false);assert.match(h.ui.snapshot().message,/Sign in/i);assert.equal(h.saves,0);
});

test('Old Analyze completion cannot clear a new account pending action',async t=>{
  const h=harness(t),oldOperation=h.ui.analyze(),oldPresence=h.take('analysis-worker');
  h.actor('bob');const currentOperation=h.ui.analyze(),currentPresence=h.take('analysis-worker');
  oldPresence.reply({online:true});await oldOperation;
  assert.equal(h.ui.snapshot().busy,true,'Bob remains busy while his own request is outstanding');assert.equal(h.saves,0);
  currentPresence.reply({online:false});await currentOperation;assert.equal(h.ui.snapshot().busy,false);assert.match(h.ui.snapshot().message,/offline/i);
});

test('Late cancel error after logout cannot replace signed-out feedback',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.cancel(),request=h.take('analysis-jobs/job-a/cancel','POST');
  h.actor(null);request.reject(failure('Obsolete private cancellation failure'));await operation;
  assert.equal(h.ui.snapshot().error,false);assert.match(h.ui.snapshot().message,/Sign in/i);assert.equal(h.ui.snapshot().worker,null);assert.equal(h.ui.snapshot().busy,false);
});

test('Current account failed job reports its bounded reason and keeps review selection available',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'failed',errorCode:'result_too_complex'});await operation;
  assert.equal(h.ui.snapshot().error,true);assert.match(h.ui.snapshot().message,/too many boundaries/);assert.match(h.ui.snapshot().message,/draft is kept/);assert.equal(h.opens.length,0);
});

test('Disposing during result fetch suppresses late callbacks and new timers',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll(),request=h.take('analysis-jobs/job-a');
  h.ui.dispose();const paints=h.states.length;request.reply({jobId:'job-a',status:'succeeded',resultId:'late-result'});await operation;
  assert.equal(h.states.length,paints);assert.equal(h.opens.length,0);
});

test('A stopped processor updates active job presence and explains recovery without opening a result',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'running',stage:'downloading',workerOnline:false,workerLastSeenAt:'2026-10-30T00:00:00Z'});await operation;
  assert.equal(h.ui.snapshot().worker.online,false);assert.match(h.ui.snapshot().message,/offline.*job and draft are kept/i);assert.equal(h.opens.length,0);
});

test('Deadline failure releases the active Analyze control and keeps the mission draft',async t=>{
  const h=harness(t);await h.queued();const operation=h.ui.poll();
  h.take('analysis-jobs/job-a').reply({jobId:'job-a',status:'failed',stage:'failed',workerOnline:false,errorCode:'worker_timeout'});await operation;
  assert.equal(h.ui.snapshot().busy,false);assert.equal(h.ui.snapshot().job.status,'failed');assert.match(h.ui.snapshot().message,/deadline.*draft is kept/i);assert.equal(h.opens.length,0);
});

test('Idle presence refresh keeps the completed job failure visible until an explicit action',async t=>{
  const h=harness(t);await h.queued();const failed={jobId:'job-a',status:'failed',errorCode:'input_invalid'};
  let operation=h.ui.poll();h.take('analysis-jobs/job-a').reply(failed);await operation;
  const previous=h.ui.snapshot().message;
  operation=h.ui.poll();h.take('analysis-worker').reply({online:true});await settle();h.take('analysis-jobs').reply({jobs:[failed]});await operation;
  assert.equal(h.ui.snapshot().message,previous);assert.equal(h.ui.snapshot().error,true);
});
