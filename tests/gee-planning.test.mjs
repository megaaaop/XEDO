import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from '../src/worker.js';
import {database} from '../src/storage.js';
import {localEnvironment} from '../scripts/local-storage.mjs';
import {QuickMission,inspectionRectangle} from '../src/mission-flow.js';
import {samplePlanningContext,MAX_GEE_PLANNING_POINTS} from '../src/gee-planning.js';
import {deploymentPreviewAPI,deploymentSamplePoints} from '../src/deployment-api.js';

async function credentials(project='xedo-planning-test') {
  const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const pem=Buffer.from(await crypto.subtle.exportKey('pkcs8',keys.privateKey)).toString('base64');
  return {GEE_PROJECT_ID:project,GEE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'planner@'+project+'.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY-----\n'+pem+'\n-----END PRIVATE KEY-----'})};
}
const expressionPoints=expression=>expression.values.points.functionInvocationValue.arguments.features.arrayValue.values;
function resultFor(expression,properties=(i)=>({elevation:i?null:35,occurrence:i?null:70})) {
  return {result:{type:'FeatureCollection',features:expressionPoints(expression).map((_,index)=>({type:'Feature',properties:{sample_index:index,...properties(index)}})).reverse()}};
}

test('Missing GEE configuration returns honest nulls without upstream calls; point bounds are enforced',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw new Error('Unexpected upstream request');};
  const result=await samplePlanningContext({},[[101.2,12.6]],{fetchImpl});
  assert.equal(result.state,'not_configured');assert.deepEqual(result.samples,[{longitude:101.2,latitude:12.6,elevationM:null,waterOccurrencePct:null}]);assert.equal(calls,0);
  for(const points of [[],Array.from({length:MAX_GEE_PLANNING_POINTS+1},()=>[101,12]),[[NaN,12]],[[181,12]],[[101,81]],[[101,12,0]]])await assert.rejects(()=>samplePlanningContext({},points,{fetchImpl}),/valid WGS84/);
  assert.equal(calls,0);
});

test('GEE planning signs server auth, executes one bounded fixed expression, preserves masks and caches by sample inputs',async()=>{
  const env=await credentials(),points=[[101.2,12.6],[101.201,12.6],[101.202,12.6]];let auth=0,compute=0;
  const fetchImpl=async(url,options)=>{
    assert.equal(options.redirect,'error');
    if(url==='https://oauth2.googleapis.com/token'){
      auth++;const claims=JSON.parse(Buffer.from(options.body.get('assertion').split('.')[1],'base64url').toString());
      assert.equal(claims.scope,'https://www.googleapis.com/auth/earthengine.readonly');assert.equal(claims.aud,url);
      return Response.json({access_token:'private-planning-token',token_type:'Bearer',expires_in:3600});
    }
    compute++;assert.equal(url,'https://earthengine.googleapis.com/v1/projects/xedo-planning-test/value:compute');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer private-planning-token');
    const {expression,workloadTag}=JSON.parse(options.body),args=expression.values.result.functionInvocationValue.arguments;
    assert.equal(workloadTag,'xedo-deployment-preview');assert.equal(args.scale.constantValue,30);assert.equal(args.maxPixelsPerRegion.constantValue,4);
    assert.equal(expression.values.result.functionInvocationValue.functionName,'Image.reduceRegions');
    assert.equal(expression.values.water.functionInvocationValue.arguments.input.functionInvocationValue.arguments.id.constantValue,'JRC/GSW1_4/GlobalSurfaceWater');
    assert.equal(expression.values.elevation.functionInvocationValue.arguments.input.functionInvocationValue.arguments.id.constantValue,'USGS/SRTMGL1_003');
    assert.ok(expressionPoints(expression).length<=80);
    return Response.json(resultFor(expression,i=>i===0?{elevation:35,occurrence:70}:i===1?{occurrence:0}:{}));
  };
  const first=await samplePlanningContext(env,points,{fetchImpl});assert.equal(first.state,'connected');assert.equal(first.cached,false);
  assert.equal(first.samples[0].elevationM,35);assert.equal(first.samples[1].elevationM,null);assert.equal(first.samples[1].waterOccurrencePct,0);assert.equal(first.samples[2].waterOccurrencePct,null);
  assert.deepEqual(first.samples.map(p=>[p.longitude,p.latitude]),points);
  assert.doesNotMatch(JSON.stringify(first),/private-planning-token|PRIVATE KEY|gserviceaccount/);
  first.samples[0].elevationM=999;
  const cached=await samplePlanningContext(env,points,{fetchImpl});assert.equal(cached.cached,true);assert.equal(cached.samples[0].elevationM,35);assert.equal(compute,1);
  await samplePlanningContext(env,[[101.3,12.6]],{fetchImpl});assert.equal(compute,2);assert.equal(auth,1);
});

test('Permission, quota, malformed responses, network failures and timeouts never expose auth details or stale samples',async()=>{
  const env=await credentials('xedo-planning-errors'),points=[[101.2,12.6]];let mode='denied',auth=0;
  const fetchImpl=async(url,options)=>{
    if(url==='https://oauth2.googleapis.com/token'){auth++;return Response.json({access_token:'private-upstream-token',token_type:'Bearer',expires_in:3600});}
    if(mode==='denied')return Response.json({error:{message:'private-upstream-token'}},{status:403});
    if(mode==='quota')return Response.json({},{status:429});
    if(mode==='unauthorized')return Response.json({},{status:401});
    if(mode==='network')throw new Error('private-upstream-token');
    if(mode==='coded-network')throw Object.assign(new Error('private-upstream-token'),{code:'ECONNRESET'});
    if(mode==='spoofed-gee')throw Object.assign(new Error('private-upstream-token'),{code:'GEE_ACCESS_DENIED'});
    if(mode==='timeout')return new Promise((resolve,reject)=>{if(options.signal.aborted)reject(new Error('aborted'));else options.signal.addEventListener('abort',()=>reject(new Error('private-upstream-token')),{once:true});});
    if(mode==='invalid-value')return Response.json(resultFor(JSON.parse(options.body).expression,()=>({elevation:'35',occurrence:150})));
    return Response.json({result:{type:'FeatureCollection',features:[]}});
  };
  for(const [next,code] of [['denied','GEE_ACCESS_DENIED'],['quota','GEE_QUOTA_LIMIT'],['network','GEE_UNAVAILABLE'],['coded-network','GEE_UNAVAILABLE'],['spoofed-gee','GEE_UNAVAILABLE'],['invalid-value','GEE_RESPONSE_INVALID'],['wrong-count','GEE_RESPONSE_INVALID'],['unauthorized','GEE_ACCESS_DENIED'],['timeout','GEE_TIMEOUT']]){
    mode=next;const result=await samplePlanningContext(env,points,{fetchImpl,useCache:false,timeoutMs:next==='timeout'?5:10000});
    assert.equal(result.state,'error',next);assert.equal(result.code,code,next);assert.equal(result.samples[0].elevationM,null);assert.equal(result.sampledAt,null);
    assert.doesNotMatch(JSON.stringify(result),/private-upstream-token|PRIVATE KEY|gserviceaccount/);
    if(['network','coded-network','spoofed-gee'].includes(next))assert.equal(result.message,'GEE planning request failed.');
    if(next==='denied')assert.equal(result.message,'GEE planning permissions are not ready.');
  }
  assert.equal(auth,2,'A 401 invalidates the cached token before the next attempt');
  const invalid=await samplePlanningContext({...env,GEE_SERVICE_ACCOUNT_JSON:'invalid-private-config'},points,{fetchImpl,useCache:false});assert.equal(invalid.code,'GEE_CONFIG_INVALID');assert.equal(invalid.message,'Invalid GEE connection details');
});

test('Identical planning requests share one computation and excess concurrent work is bounded',async()=>{
  const env=await credentials('xedo-planning-concurrency'),releases=[];let computes=0;
  const fetchImpl=async(url,options)=>{
    if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'private-concurrent-token',token_type:'Bearer',expires_in:3600});
    computes++;return new Promise(resolve=>releases.push(()=>resolve(Response.json(resultFor(JSON.parse(options.body).expression)))));
  };
  const first=samplePlanningContext(env,[[101.1,12.6]],{fetchImpl}),same=samplePlanningContext(env,[[101.1,12.6]],{fetchImpl}),second=samplePlanningContext(env,[[101.2,12.6]],{fetchImpl});
  while(releases.length<2)await new Promise(setImmediate);
  const busy=await samplePlanningContext(env,[[101.3,12.6]],{fetchImpl});assert.equal(busy.code,'GEE_BUSY');assert.equal(computes,2);assert.equal(busy.samples[0].elevationM,null);
  releases.forEach(release=>release());const results=await Promise.all([first,same,second]);assert.ok(results.every(r=>r.state==='connected'));assert.deepEqual(results[0],results[1]);assert.equal(computes,2);
});

test('Deployment sample selection stays bounded and clips a ground grid to the exact polygon',()=>{
  const geometry={type:'Polygon',coordinates:[[[101.19,12.595],[101.215,12.595],[101.215,12.6],[101.2,12.6],[101.2,12.61],[101.19,12.61],[101.19,12.595]]]};
  const route=Array.from({length:500},(_,i)=>({position:[101.19+i*.00001,12.597]}));
  const points=deploymentSamplePoints({waypoints:route},geometry);
  assert.ok(points.length<=80);assert.deepEqual(points[0],route[0].position);assert.ok(points.some(p=>p[0]===route.at(-1).position[0]));
  assert.ok(points.every(([lon,lat])=>!(lon>101.2&&lat>12.6)));
});

test('Deployment endpoint reads frozen Quick snapshot despite edits and returns a local preview with no writes or upstream calls',async()=>{
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-deployment-')));
  const call=async(route,body,method='POST')=>worker.fetch(new Request('http://localhost/api/'+route,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,{waitUntil:p=>p.catch(()=>{})});
  const api=async(route,options={})=>{const r=await worker.fetch(new Request('http://localhost/api/'+route,options),env,{waitUntil:p=>p.catch(()=>{})}),data=await r.json();if(!r.ok)throw new Error(data.message);return data;};
  try{
    const state=await api('state'),scene=state.scenes.find(s=>s.localPreview),flow=new QuickMission(api);
    const original=inspectionRectangle([101.2,12.6,101.202,12.601]);flow.selectArea(original);await flow.survey({archivedScene:scene});flow.imageReady=true;const saved=await flow.prepare();
    const observation=(await api('state')).records.find(r=>r.id===flow.ids.observation),ring=original.coordinates[0];
    await call('records/'+observation.id,{revision:observation.revision,geometry:{type:'Polygon',coordinates:[[ring[0],ring[1],ring[2],ring[0]]]},reviewer:'test',reason:'Current observation changed'},'PATCH');
    const db=database(env),before=await db.all('SELECT * FROM records ORDER BY id');
    const response=await call('v1/deployment-preview',{surveyId:saved.surveyId}),data=await response.json();
    assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(data.schema_version,'xedo-deployment-preview/1');assert.deepEqual(data.target,original);assert.deepEqual(data.plan.target,original);assert.equal(data.scene.id,scene.id);assert.equal(data.context.state,'not_configured');assert.equal(data.hardwareControl,false);
    assert.ok(data.plan.waypoints.length>0);assert.ok(data.plan.waypoints.every(p=>p.groundElevationM===null&&p.estimatedAltitudeMSLM===null));
    let calls=0;const configured=await credentials('xedo-deployment-offline');Object.assign(env,configured);
    const request=new Request('http://localhost/api/v1/deployment-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({surveyId:saved.surveyId,useGEE:false})});
    const local=await deploymentPreviewAPI(request,env,db,new URL(request.url),{fetchImpl:async()=>{calls++;throw new Error('No network expected');}});
    assert.equal((await local.json()).context.state,'disabled');assert.equal(calls,0);assert.deepEqual(await db.all('SELECT * FROM records ORDER BY id'),before);
    const connectedRequest=new Request(request.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({surveyId:saved.surveyId,useGEE:true,altitudeM:60})});
    const connectedResponse=await deploymentPreviewAPI(connectedRequest,env,db,new URL(request.url),{fetchImpl:async(url,options)=>{
      calls++;if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'private-endpoint-token',token_type:'Bearer',expires_in:3600});
      return Response.json(resultFor(JSON.parse(options.body).expression,i=>({elevation:i===0?12:null,occurrence:80})));
    }});
    const connected=await connectedResponse.json();assert.equal(connected.context.state,'connected');assert.deepEqual(connected.target,original);assert.equal(connected.plan.waypoints[0].groundElevationM,12);assert.equal(connected.plan.waypoints[0].estimatedAltitudeMSLM,72);assert.ok(connected.plan.waypoints.some(p=>p.groundElevationM===null));assert.equal(calls,2);
    assert.doesNotMatch(JSON.stringify(connected),/private-endpoint-token|PRIVATE KEY|gserviceaccount/);assert.deepEqual(await db.all('SELECT * FROM records ORDER BY id'),before);
    for(const [body,status] of [[{surveyId:saved.surveyId,altitudeM:0},422],[{surveyId:saved.surveyId,spacingM:1001},422],[{surveyId:saved.surveyId,speedMps:31},422],[{surveyId:saved.surveyId,useGEE:'true'},422],[{surveyId:saved.surveyId,geometry:original},422],[{surveyId:'SUR_missing'},404]])assert.equal((await call('v1/deployment-preview',body)).status,status);
    assert.equal((await call('v1/deployment-preview',undefined,'GET')).status,405);
    const foreign=new Request('http://localhost/api/v1/deployment-preview',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({surveyId:saved.surveyId,useGEE:false})});assert.equal((await worker.fetch(foreign,env,{})).status,403);
    assert.deepEqual(await db.all('SELECT * FROM records ORDER BY id'),before);
  }finally{env.close();}
});
