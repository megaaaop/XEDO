import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectorFetch} from '../api/inspector.mjs';

const user={id:'65c039f9-cb8c-42fa-a1ed-5c2fb6fa698e'};
const jobId='91d11ef4-ad50-41f6-b0b2-f5e37ab2aabb';
const input={missionId:user.id,expectedRevision:1,mutationId:jobId};
const origin='https://xedo.test';
const request=(path,body)=>new Request(origin+path,{method:body?'POST':'GET',headers:{origin,cookie:'__Host-xedo_inspector=a.b.c','x-xedo-inspector':user.id,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const publicPath='/api/v1/inspector/';

test('owned analysis routes support direct and matching Vercel rewrite paths',async()=>{
  for(const [route,action,body,status,payload] of [
    ['analysis-worker','worker_status',null,200,{}],['analysis-jobs','jobs',null,200,{}],
    ['analysis-jobs','create_job',input,202,input],['analysis-jobs/'+jobId,'job',null,200,{jobId}],
    ['analysis-jobs/'+jobId+'/cancel','cancel_job',{},200,{jobId}]
  ])for(const path of [publicPath+route,'/api/inspector?route='+route+'&path='+route]){
    let calls=0;
    const response=await inspectorFetch(request(path,body),{fetchImpl:async(url,options)=>{
      if(url.endsWith('/user'))return Response.json(user);
      calls++;const value=JSON.parse(options.body);assert.deepEqual(value,{p_action:action,p_payload:payload});
      assert.equal(options.headers.Authorization,'Bearer a.b.c');return Response.json({jobId});
    }});
    assert.equal(response.status,status);assert.equal(calls,1);assert.equal((await response.json()).jobId,jobId);
  }
});

test('job routes reject owner injection, invalid revisions and mismatched rewrites before any mutation',async()=>{
  let writes=0;const fetchImpl=async url=>{if(url.endsWith('/user'))return Response.json(user);writes++;return Response.json({});};
  for(const body of [{...input,ownerId:user.id},{...input,geometry:{}},{...input,expectedRevision:0},{...input,start:'tomorrow'},{...input,mutationId:'bad'}]){
    assert.equal((await inspectorFetch(request(publicPath+'analysis-jobs',body),{fetchImpl})).status,422);
  }
  assert.equal((await inspectorFetch(request(publicPath+'analysis-jobs/'+jobId+'/cancel',{ownerId:user.id}),{fetchImpl})).status,422);
  assert.equal((await inspectorFetch(request(publicPath+'analysis-jobs?route=missions',input),{fetchImpl})).status,404);
  assert.equal((await inspectorFetch(request('/api/inspector?route=analysis-jobs&path=analysis-worker',input),{fetchImpl})).status,404);
  assert.equal(writes,0);
});

test('only known queue failures receive actionable messages; provider details remain private',async()=>{
  for(const [label,status,match] of [['WORKER_OFFLINE',503,/processor offline/],['QUEUE_FULL',429,/queue is full/],['MONTHLY_JOB_LIMIT',429,/100 analyses/],['MISSION_REVISION_CHANGED',409,/mission changed/],['JOB_NOT_FOUND',404,/not found/],['private SQL secret',503,/could not complete/]]){
    const response=await inspectorFetch(request(publicPath+'analysis-jobs',input),{fetchImpl:async url=>url.endsWith('/user')?Response.json(user):Response.json({code:'PT'+status,message:label,details:'private SQL secret'},{status})});
    assert.equal(response.status,status);const data=await response.json();assert.match(data.message,match);assert.doesNotMatch(JSON.stringify(data),/private SQL secret/);
  }
});
