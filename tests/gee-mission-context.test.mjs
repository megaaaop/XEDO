import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {validateMissionContextRequest,missionContextExpressions,missionContextSamplePoints,fetchGEEMissionContext,GEE_MISSION_DATASETS} from '../src/gee-mission-context.js';
import {pointWithin} from '../src/domain.js';
const NOW=Date.parse('2026-10-25T00:00:00Z'),iso=n=>new Date(n).toISOString();
const geometry=()=>({type:'Polygon',coordinates:[[[101.229,12.619],[101.231,12.619],[101.231,12.621],[101.229,12.621],[101.229,12.619]]]});
const sceneId='gee:COPERNICUS/S2_SR_HARMONIZED/20261024T035400_20261024T045400_T47PQQ';
const request=()=>({geometry:geometry(),home:[101.229,12.619],sceneId,startAt:iso(NOW+HOUR),endAt:iso(NOW+3*HOUR)});
const HOUR=3600000;
const privateKey=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
let nextId=0;
function fixture(){
 const env={GEE_PROJECT_ID:'xedo-context-test-'+(++nextId),GEE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'fixture@xedo-context-test.iam.gserviceaccount.com',private_key:privateKey})};
 const calls={auth:0,compute:0,bodies:[]},state={mode:'ok',parts:{},maxActive:0,active:0};
 const secret='secret-provider-token-never-in-output';
 const fetchImpl=async(url,options)=>{
  assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
  if(url==='https://oauth2.googleapis.com/token'){
   calls.auth++;const assertion=options.body.get('assertion'),claims=JSON.parse(Buffer.from(assertion.split('.')[1],'base64url').toString());assert.equal(claims.scope,'https://www.googleapis.com/auth/earthengine.readonly');
   return Response.json({access_token:secret,token_type:'Bearer',expires_in:3600});
  }
  assert.equal(url,'https://earthengine.googleapis.com/v1/projects/'+env.GEE_PROJECT_ID+'/value:compute');assert.equal(options.headers.Authorization,'Bearer '+secret);assert.equal(options.headers['X-Goog-User-Project'],env.GEE_PROJECT_ID);
  calls.compute++;const body=JSON.parse(options.body),kind=body.workloadTag.replace('xedo-context-','');calls.bodies.push({kind,...body});
  state.active++;state.maxActive=Math.max(state.active,state.maxActive);
  try{
   if(state.mode==='hang')return await new Promise(()=>{});
   if(state.mode==='network')throw Object.assign(Error(secret),{code:'GEE_ACCESS_DENIED'});
   if(state.mode==='oversized')return new Response(secret,{headers:{'Content-Length':String(512*1024+1)}});
   if(state.mode==='invalid-json')return new Response(secret);
   if(state.mode==='denied')return Response.json({error:{message:secret}},{status:403});
   if(state.mode==='http-error')return Response.json({error:{message:state.errorMessage}},{status:state.httpStatus??400});
   let result;
   if(kind==='terrain'){
    const entries=body.expression.values.points.functionInvocationValue.arguments.features.arrayValue.values;
    result={type:'FeatureCollection',features:entries.map((entry,index)=>({type:'Feature',properties:{sample_index:index,elevation:index===0?0:5+index}})).reverse()};
   }else if(kind==='landcover')result={total_m2:10000,mapped_m2:10000,water_m2:6000,mangrove_m2:1000,land_m2:3000};
   else if(kind==='quality')result={sceneId:sceneId.slice(4),acquiredMs:Date.parse('2026-10-24T03:54:00Z'),sceneCloudPct:20,coversAOI:true,hasProbability:true,stats:{total_m2:10000,image_m2:10000,classified_m2:10000,cloud_m2:2000,clear_m2:8000}};
   else if(kind==='forecast')result={available:true,modelRunMs:NOW-6*HOUR,validMs:NOW+HOUR,values:{u_component_of_wind_10m_above_ground:3,v_component_of_wind_10m_above_ground:4,gust:7}};
   else throw Error('Unexpected fixed workload');
   if(state.parts[kind])result=state.parts[kind](result,body);
   return Response.json({result});
  }finally{state.active--;}
 };
 return {env,fetchImpl,calls,state,secret};
}
const lookup=(v,input=request(),options={})=>fetchGEEMissionContext(v.env,input,{fetchImpl:v.fetchImpl,now:NOW,...options});

test('Input contract is bounded, cloned and rejects arbitrary assets, clock normalization and unsupported fields',()=>{
 const input=request(),normalized=validateMissionContextRequest(input,{now:NOW});assert.deepEqual(normalized,input);normalized.geometry.coordinates[0][0][0]=100;assert.equal(input.geometry.coordinates[0][0][0],101.229);
 for(const change of [r=>{r.url='https://evil.invalid';},r=>{r.points=[[101,12]];},r=>{r.sceneId='gee:users/private/image';},r=>{r.startAt='2026-10-25T24:00:00Z';},r=>{r.startAt='2026-02-30T00:00:00Z';},r=>{r.startAt=null;},r=>{r.home=[180,0];},r=>{r.geometry.coordinates[0][0][0]=NaN;},r=>{r.geometry={type:'Polygon',coordinates:[[[100,10],[100.2,10],[100.2,10.2],[100,10.2],[100,10]]]};},r=>{r.endAt=iso(NOW+26*HOUR);},r=>{r.startAt=iso(NOW-6*24*HOUR);}]){const bad=request();change(bad);assert.throws(()=>validateMissionContextRequest(bad,{now:NOW}),error=>error.code==='GEE_CONTEXT_INPUT_INVALID'&&error.status===422);}
 assert.deepEqual(validateMissionContextRequest({geometry:geometry()},{now:NOW}),{geometry:geometry(),home:null,sceneId:null,startAt:null,endAt:null});
 assert.throws(()=>validateMissionContextRequest(request(),{now:NaN}),/clock/);
});

test('Deterministic samples include an explicit outside home while area samples stay inside a concave AOI',()=>{
 const input={...request(),geometry:{type:'Polygon',coordinates:[[[101.19,12.595],[101.215,12.595],[101.215,12.6],[101.2,12.6],[101.2,12.61],[101.19,12.61],[101.19,12.595]]]},home:[101.18,12.59]};
 const normalized=validateMissionContextRequest(input,{now:NOW}),points=missionContextSamplePoints(normalized);
 assert.ok(points.length<=80);assert.deepEqual(points[0],{coordinates:input.home,home:true});assert.ok(points.filter(p=>!p.home).every(p=>pointWithin(p.coordinates,input.geometry)));assert.deepEqual(points,missionContextSamplePoints(normalized));
});
test('Optional route samples are bounded Thailand coordinates and preserve the legacy request shape when absent',()=>{
 const input={...request(),routePoints:[[101.228,12.618],[101.232,12.622]]},normalized=validateMissionContextRequest(input,{now:NOW});assert.deepEqual(normalized,input);normalized.routePoints[0][0]=100;assert.equal(input.routePoints[0][0],101.228);
 for(const points of [null,{},Array.from({length:25},()=>[101.23,12.62]),[[107,12]],[[101,22]],[[97.1,5.1]],[[NaN,12]],[[101,12,0]]])assert.throws(()=>validateMissionContextRequest({...request(),routePoints:points},{now:NOW}),error=>error.code==='GEE_CONTEXT_INPUT_INVALID');
 assert.equal(Object.hasOwn(validateMissionContextRequest(request(),{now:NOW}),'routePoints'),false);
});
test('Route points outside AOI are deterministic and do not displace Home or the 7 by 7 area grid',()=>{
 const input={...request(),routePoints:Array.from({length:24},(_,i)=>[101.225+i*.00001,12.615])},normalized=validateMissionContextRequest(input,{now:NOW}),points=missionContextSamplePoints(normalized);
 assert.ok(points.length<=80);assert.equal(points[0].home,true);assert.equal(points.filter(p=>p.route).length,24);assert.ok(points.filter(p=>!p.home&&!p.route).every(p=>pointWithin(p.coordinates,input.geometry)));assert.deepEqual(points,missionContextSamplePoints(normalized));
 const area=points.filter(p=>!p.home&&!p.route);assert.equal(area.length,52);const expression=JSON.stringify(missionContextExpressions(normalized,{now:NOW}).terrain);for(const route of input.routePoints)assert.ok(expression.includes(JSON.stringify(route)));
});

test('Fixed expression trees retain dataset versions, pixel-area partitions, bounds and exact source identity',()=>{
 const e=missionContextExpressions(validateMissionContextRequest(request(),{now:NOW}),{now:NOW}),text=JSON.stringify(e);
 for(const dataset of Object.values(GEE_MISSION_DATASETS))assert.ok(text.includes(dataset.id));
 assert.match(text,/Image\.pixelArea/);assert.match(text,/EPSG:4326/);assert.match(text,/1500000/);assert.match(text,/maxPixelsPerRegion/);assert.match(text,/Geometry\.contains/);assert.match(text,/system:index/);assert.match(text,/AggregateFeatureCollection\.max/);assert.match(text,/Collection\.first/);assert.match(text,/Image\.constant/);
 assert.ok(!text.includes(privateKey));assert.ok(!text.includes('HYCOM/'));assert.ok(!text.includes('COPERNICUS/DEM/GLO30"'));
 const noOptional=missionContextExpressions(validateMissionContextRequest({geometry:geometry()},{now:NOW}),{now:NOW});assert.equal(noOptional.quality,null);assert.equal(noOptional.forecast,null);
});

test('Terrain and area reductions use supported WGS84 with explicit metre scales and retain pixel-area units',()=>{
 const e=missionContextExpressions(validateMissionContextRequest(request(),{now:NOW}),{now:NOW});
 const reductions=[
  [e.terrain.values.result,30],
  [e.landcover.values.result,10],
  [e.quality.values.result.dictionaryValue.values.stats,20]
 ];
 for(const [expression,scale]of reductions){
  const args=expression.functionInvocationValue.arguments;
  assert.equal(args.crs.functionInvocationValue.functionName,'Projection');
  assert.equal(args.crs.functionInvocationValue.arguments.crs.constantValue,'EPSG:4326');
  assert.equal(args.scale.constantValue,scale);
 }
 const terrainReducer=e.terrain.values.result.functionInvocationValue.arguments.reducer.functionInvocationValue;
 assert.equal(terrainReducer.functionName,'Reducer.setOutputs');
 assert.equal(terrainReducer.arguments.reducer.functionInvocationValue.functionName,'Reducer.first');
 assert.deepEqual(terrainReducer.arguments.outputs.constantValue,['elevation']);
 // Image.pixelArea supplies square metres independently of the chosen CRS;
 // retain it in both the total area and all classified-area partitions.
 for(const kind of ['landcover','quality']){
  const areas=JSON.stringify(e[kind].values.areas);
  assert.match(areas,/Image\.pixelArea/);assert.match(areas,/total_m2/);
  assert.doesNotMatch(areas,/pixelLonLat|Geometry\.area/);
 }
 assert.doesNotMatch(JSON.stringify(e),/EPSG:6933/);
});

test('Cloud-probability availability emits a JSON boolean rather than GEE numeric comparison output',()=>{
 const e=missionContextExpressions(validateMissionContextRequest(request(),{now:NOW}),{now:NOW});
 const availability=e.quality.values.hasProbability.functionInvocationValue;
 assert.equal(availability.functionName,'If');
 assert.equal(availability.arguments.condition.functionInvocationValue.functionName,'Number.gt');
 assert.equal(availability.arguments.trueCase.constantValue,true);
 assert.equal(availability.arguments.falseCase.constantValue,false);
});

test('Unconfigured credentials return explicit Unknown with matching request and no upstream access',async()=>{
 let calls=0;const input=request(),result=await fetchGEEMissionContext({},input,{now:NOW,fetchImpl:async()=>{calls++;throw Error();}});
 assert.equal(calls,0);assert.equal(result.state,'not_configured');assert.equal(result.schema_version,'xedo-gee-mission-context/1');assert.deepEqual(result.request,input);assert.equal(result.terrain.homeElevationM,null);assert.equal(result.landcover.waterPct,null);assert.equal(result.quality.cloudPct,null);assert.equal(result.forecast.windEastMps,null);assert.equal(Date.parse(result.expiresAt)-Date.parse(result.fetchedAt),600000);
});

test('Internal compute diagnostics never log untrusted provider messages, authentication material or arbitrary exception text',async()=>{
 const logs=[],previous=console.warn;console.warn=value=>logs.push(value);
 try{
  for(const mode of ['network','denied','invalid-json']){
   const v=fixture();v.state.mode=mode;const r=await lookup(v);
   assert.equal(r.state,'unavailable');assert.doesNotMatch(JSON.stringify(r),new RegExp(v.secret+'|PRIVATE KEY|gserviceaccount'));
  }
  assert.ok(logs.length>=12);
  for(const entry of logs){assert.equal(entry.event,'XEDO_GEE_CONTEXT_FAILURE');assert.ok(['terrain','landcover','quality','forecast'].includes(entry.kind));assert.deepEqual(Object.keys(entry).sort(),['event','httpStatus','kind','reason']);assert.ok(['COMPUTE_FAILED','UPSTREAM_HTTP_ERROR','RESPONSE_JSON_INVALID'].includes(entry.reason));}
  assert.doesNotMatch(JSON.stringify(logs),/secret-provider|PRIVATE KEY|gserviceaccount|Bearer|private upstream/);
 }finally{console.warn=previous;}
});

test('Known technical diagnostics are bounded and redact URLs, emails, coordinates and tokens without reaching public responses',async()=>{
 const logs=[],previous=console.warn;console.warn=value=>logs.push(value);
 try{
  const v=fixture();v.state.mode='http-error';v.state.httpStatus=400;
  v.state.errorMessage="Image.select: Pattern DEM missing at https://example.invalid/request?q=101.22 for robot@example.invalid near [101.22, 12.62]; Bearer "+'A'.repeat(64)+'; '+'B'.repeat(64)+'\n'+'diagnostic '.repeat(30);
  const r=await lookup(v);assert.equal(r.state,'unavailable');assert.equal(logs.length,4);
  for(const entry of logs){assert.equal(entry.httpStatus,400);assert.match(entry.reason,/^Image\.select:/);assert.ok(entry.reason.length<=240);assert.doesNotMatch(entry.reason,/https?:|robot@|101\.22|12\.62|A{40}|B{40}|\n/);}
  assert.doesNotMatch(JSON.stringify(r),/Image\.select|robot@|A{40}|B{40}/);
 }finally{console.warn=previous;}
});

test('Oversized, sensitive and parser-failed diagnostics retain only static internal reason codes',async()=>{
 const logs=[],previous=console.warn;console.warn=value=>logs.push(value);
 try{
  for(const [message,reason] of [['Parameter key: -----BEGIN PRIVATE KEY----- private-material','UPSTREAM_HTTP_ERROR_REDACTED'],['Image.select: '+ 'x'.repeat(9000),'UPSTREAM_ERROR_BODY_TOO_LARGE']]){
   const before=logs.length,v=fixture();v.state.mode='http-error';v.state.errorMessage=message;const r=await lookup(v);
   assert.equal(r.state,'unavailable');assert.ok(logs.slice(before).every(entry=>entry.reason===reason));
  }
  const v=fixture();v.state.parts.terrain=()=>({providerPayload:v.secret});const r=await lookup(v);
  assert.equal(r.terrain.state,'unavailable');assert.ok(logs.some(entry=>entry.kind==='terrain'&&entry.reason==='RESULT_PARSE_FAILED'&&entry.httpStatus===null));
  assert.doesNotMatch(JSON.stringify(logs),/PRIVATE KEY|private-material|secret-provider|providerPayload/);
 }finally{console.warn=previous;}
});

test('Signed real adapter preserves zero, source dates, coverage and takeoff wind direction without changing inputs',async()=>{
 const v=fixture(),input=request(),before=structuredClone(input),r=await lookup(v,input);
 assert.deepEqual(input,before);assert.equal(r.state,'complete');assert.equal(v.calls.compute,4);assert.ok(v.state.maxActive<=2);assert.equal(r.terrain.homeElevationM,0);assert.equal(r.terrain.verticalDatum,'EGM2008');assert.ok(r.terrain.samples.length<=80);assert.equal(r.landcover.waterPct,60);assert.equal(r.landcover.mangrovePct,10);assert.equal(r.landcover.unknownPct,0);assert.equal(r.quality.acquiredAt,'2026-10-24T03:54:00.000Z');assert.equal(r.quality.cloudPct,20);assert.equal(r.quality.clearPct,80);assert.equal(r.forecast.windSpeedMps,5);assert.ok(Math.abs(r.forecast.windFromDeg-216.869897645844)<1e-8);assert.equal(r.forecast.scope,'takeoff_reference_only');assert.equal(r.forecast.referenceHeightM,10);assert.equal(r.hardwareControl,false);assert.equal(r.releaseControl,false);
 assert.doesNotMatch(JSON.stringify(r),/secret-provider|PRIVATE KEY|gserviceaccount/);
});

test('Missing observations stay Unknown while independent terrain, land and forecast outputs survive',async()=>{
 const v=fixture();v.state.parts.terrain=r=>{r.features[0].properties.elevation=null;return r;};v.state.parts.landcover=r=>({...r,mapped_m2:9000,land_m2:2000});v.state.parts.quality=r=>({...r,stats:{...r.stats,classified_m2:7000,cloud_m2:2000,clear_m2:5000}});
 const r=await lookup(v);assert.equal(r.state,'partial');assert.ok(r.terrain.samples.some(p=>p.elevationM===null));assert.equal(r.landcover.unknownPct,10);assert.equal(r.quality.coveragePct,70);assert.equal(r.quality.clearPct,50);assert.equal(r.quality.unknownPct,30);assert.equal(r.forecast.state,'ready');
});

test('Masked land cover and quality are not converted into all-land or cloud-free readiness',async()=>{
 const v=fixture();v.state.parts.landcover=r=>({...r,mapped_m2:0,water_m2:0,mangrove_m2:0,land_m2:0});v.state.parts.quality=r=>({...r,stats:{...r.stats,image_m2:0,classified_m2:0,cloud_m2:0,clear_m2:0}});
 const r=await lookup(v);assert.equal(r.landcover.state,'unavailable');assert.equal(r.landcover.waterPct,null);assert.equal(r.landcover.unknownPct,100);assert.equal(r.quality.state,'unavailable');assert.equal(r.quality.unknownPct,100);assert.equal(r.quality.clearPct,0);assert.equal(r.terrain.state,'ready');
});

test('Scene footprint, source timestamp and quality area conflicts invalidate only that independent part',async()=>{
 for(const change of [r=>({...r,coversAOI:false}),r=>({...r,sceneId:sceneId.replace('20261024','20261023').slice(4)}),r=>({...r,acquiredMs:NOW+HOUR}),r=>({...r,hasProbability:'true'}),r=>({...r,stats:{...r.stats,clear_m2:10000}})]){
  const v=fixture();v.state.parts.quality=change;const r=await lookup(v);assert.equal(r.quality.state,'unavailable');assert.equal(r.quality.acquiredAt,null);assert.equal(r.quality.cloudPct,null);assert.equal(r.terrain.state,'ready');assert.equal(r.forecast.state,'ready');
 }
});

test('Real granule acquisition milliseconds are retained when product time differs, with exact full or short source identity',async()=>{
 const selected='gee:COPERNICUS/S2_SR_HARMONIZED/20261022T033809_20261022T035258_T47PQQ',acquiredAt='2026-10-22T03:54:37.155Z';
 const full=selected.slice(4),short=full.slice(full.lastIndexOf('/')+1);
 for(const sourceId of [full,short]){
  const v=fixture();v.state.parts.quality=r=>({...r,sceneId:sourceId,acquiredMs:Date.parse(acquiredAt)});
  const r=await lookup(v,{...request(),sceneId:selected});
  assert.equal(r.quality.state,'ready');assert.equal(r.quality.sceneId,selected);
  assert.equal(r.quality.acquiredAt,acquiredAt);assert.equal(r.terrain.state,'ready');
 }
});

test('Quality source normalization rejects a different index or collection and keeps acquisition time range validation',async()=>{
 const selected='gee:COPERNICUS/S2_SR_HARMONIZED/20261022T033809_20261022T035258_T47PQQ',short=selected.split('/').at(-1);
 const valid=r=>({...r,sceneId:short,acquiredMs:Date.parse('2026-10-22T03:54:37.155Z')});
 for(const change of [
  r=>({...r,sceneId:short.replace('T47PQQ','T47PQP')}),
  r=>({...r,sceneId:'COPERNICUS/S2/'+short}),
  r=>({...r,sceneId:null}),
  r=>({...r,acquiredMs:NOW+5*60000+1}),
  r=>({...r,acquiredMs:Date.UTC(2017,2,27)}),
  r=>({...r,acquiredMs:null}),
  r=>({...r,acquiredMs:'2026-10-22T03:54:37.155Z'})
 ]){
  const v=fixture();v.state.parts.quality=r=>change(valid(r));const r=await lookup(v,{...request(),sceneId:selected});
  assert.equal(r.quality.state,'unavailable');assert.equal(r.quality.acquiredAt,null);assert.equal(r.quality.cloudPct,null);assert.equal(r.landcover.state,'ready');
 }
});

test('SCL fallback is labelled and does not become cloud-probability evidence',async()=>{
 const v=fixture();v.state.parts.quality=r=>({...r,hasProbability:false});const r=await lookup(v);assert.equal(r.quality.state,'ready');assert.equal(r.quality.resolutionM,20);assert.match(r.quality.method,/SCL/);assert.ok(r.quality.warnings.some(text=>text.includes('fallback')||text.includes('unavailable')));
});

test('Stale, future, masked and uncovered GFS values never become 50 m mission-wind input',async()=>{
 for(const change of [r=>({...r,modelRunMs:NOW-25*HOUR}),r=>({...r,modelRunMs:NOW+HOUR}),r=>({...r,validMs:NOW+4*HOUR}),r=>({...r,values:{...r.values,u_component_of_wind_10m_above_ground:null}}),()=>({available:false})]){
  const v=fixture();v.state.parts.forecast=change;const r=await lookup(v);assert.equal(r.forecast.state,'unavailable');assert.equal(r.forecast.windSpeedMps,null);assert.equal(r.forecast.referenceHeightM,10);assert.equal(r.terrain.state,'ready');
 }
 const v=fixture();v.state.parts.forecast=r=>({...r,values:{...r.values,gust:null}});const r=await lookup(v);assert.equal(r.forecast.state,'ready');assert.equal(r.forecast.gustMps,null);assert.ok(r.forecast.warnings.some(t=>t.includes('gust is unavailable')));
});

test('No selected image or mission time means no optional source requests and no invented metadata',async()=>{
 const v=fixture(),r=await lookup(v,{geometry:geometry()});assert.equal(v.calls.compute,2);assert.equal(r.state,'complete');assert.equal(r.quality.state,'not_requested');assert.equal(r.forecast.state,'not_requested');assert.equal(r.quality.acquiredAt,null);assert.equal(r.forecast.validAt,null);
});

test('Cache clones responses, isolates credential/AOI/home/time scopes and expires after ten minutes',async()=>{
 const v=fixture(),r=await lookup(v);r.terrain.homeElevationM=999;const next=await lookup(v);assert.equal(next.cached,true);assert.equal(next.terrain.homeElevationM,0);assert.equal(v.calls.compute,4);
 const otherHome={...request(),home:[101.228,12.618]};await lookup(v,otherHome);assert.equal(v.calls.compute,7);
 await lookup(v,request(),{now:NOW+600001});assert.equal(v.calls.compute,11);
 const otherEnv={...v.env,GEE_PROJECT_ID:v.env.GEE_PROJECT_ID+'-other'};await fetchGEEMissionContext(otherEnv,request(),{now:NOW,fetchImpl:async(url,options)=>url==='https://oauth2.googleapis.com/token'?Response.json({access_token:'other',token_type:'Bearer',expires_in:3600}):Promise.reject(Error('No source'))});
 const before=v.calls.compute;await lookup(v);assert.equal(v.calls.compute,before);
});
test('Route sampling is read only, role-labelled and independently scoped in static terrain caches',async()=>{
 const v=fixture(),input={...request(),sceneId:null,startAt:null,endAt:null,routePoints:[[101.228,12.618]]},first=await lookup(v,input);assert.equal(v.calls.compute,2);assert.equal(first.terrain.samples.filter(p=>p.role==='route').length,1);assert.equal(first.quality.state,'not_requested');assert.equal(first.forecast.state,'not_requested');assert.deepEqual(first.request.routePoints,input.routePoints);
 await lookup(v,input);assert.equal(v.calls.compute,2);const next={...input,routePoints:[[101.227,12.617]]};await lookup(v,next);assert.equal(v.calls.compute,3,'Only terrain changes; landcover is reusable');assert.equal(v.calls.bodies.at(-1).kind,'terrain');assert.equal(first.hardwareControl,false);assert.equal(first.releaseControl,false);
});

test('Provider failures, oversized bodies, bad JSON and malformed result partitions are sanitized',async()=>{
 for(const mode of ['network','oversized','invalid-json','denied']){const v=fixture();v.state.mode=mode;const r=await lookup(v);assert.equal(r.state,'unavailable');assert.equal(r.terrain.homeElevationM,null);assert.equal(r.landcover.waterPct,null);assert.doesNotMatch(JSON.stringify(r),new RegExp(v.secret+'|PRIVATE KEY|gserviceaccount'));}
 const v=fixture();v.state.parts.landcover=r=>({...r,water_m2:99999});const r=await lookup(v);assert.equal(r.landcover.state,'unavailable');assert.equal(r.quality.state,'ready');
});

test('Overall deadline bounds stalled active and queued work even when fetch ignores abort',async()=>{
 const v=fixture();v.state.mode='hang';const started=performance.now(),r=await lookup(v,request(),{timeoutMs:10});assert.ok(performance.now()-started<500);assert.equal(r.state,'unavailable');assert.equal(v.calls.compute,2);assert.ok(r.warnings.some(t=>t.includes('deadline')));
 v.state.mode='ok';const recovered=await lookup(v,request(),{useCache:false});assert.equal(recovered.state,'complete');
});

test('Caller cancellation releases queues and rejects rather than returning previously usable context',async()=>{
 const v=fixture(),controller=new AbortController();v.state.mode='hang';const promise=lookup(v,request(),{signal:controller.signal});setTimeout(()=>controller.abort(),5);await assert.rejects(promise,e=>e.name==='AbortError');
 const aborted=new AbortController();aborted.abort();await assert.rejects(lookup(v,request(),{signal:aborted.signal}),e=>e.name==='AbortError');
 v.state.mode='ok';assert.equal((await lookup(v)).state,'complete');
});
test('Changing scene or time reuses static sources while a failed optional part can recover immediately',async()=>{
 const v=fixture();v.state.parts.quality=r=>({...r,coversAOI:false});const failed=await lookup(v);assert.equal(failed.quality.state,'unavailable');assert.equal(v.calls.compute,4);
 delete v.state.parts.quality;const recovered=await lookup(v);assert.equal(recovered.quality.state,'ready');assert.equal(v.calls.compute,6,'Only quality and forecast retry; terrain/land remain cached');
 const withoutScene={...request(),sceneId:null};await lookup(v,withoutScene);assert.equal(v.calls.compute,7,'Changing scene does not repeat static terrain/land computations');
});

test('A nearly expired GFS run caps context cache lifetime rather than extending source freshness',async()=>{
 const v=fixture();v.state.parts.forecast=r=>({...r,modelRunMs:NOW-24*HOUR+5000});const result=await lookup(v);assert.equal(result.forecast.state,'ready');assert.equal(Date.parse(result.expiresAt),NOW+5000);
 const stale=await lookup(v,request(),{now:NOW+6000});assert.equal(stale.forecast.state,'unavailable');assert.equal(stale.forecast.windSpeedMps,null);assert.equal(stale.state,'partial');
});
test('The emitted SCL fallback mask keeps unclassified class 7 out of clear AOI area',()=>{
 const expression=missionContextExpressions(validateMissionContextRequest(request(),{now:NOW}),{now:NOW}).quality;
 function evaluate(node,scl){
  if(Object.hasOwn(node,'constantValue'))return node.constantValue;
  if(node.valueReference){if(node.valueReference==='rgbValid')return 1;if(node.valueReference==='hasProbability')return false;if(node.valueReference==='scl')return scl;return evaluate(expression.values[node.valueReference],scl);}
  const {functionName:name,arguments:a}=node.functionInvocationValue,value=k=>evaluate(a[k],scl);
  if(name==='If')return value('condition')?value('trueCase'):value('falseCase');
  if(name==='Image.constant')return value('value');if(name==='Image.unmask'||name==='Image.rename')return value('input');if(name==='Image.pixelArea')return 1;
  const left=value('image1'),right=value('image2');
  if(name==='Image.and')return Number(!!left&&!!right);if(name==='Image.or')return Number(!!left||!!right);if(name==='Image.gte')return Number(left>=right);if(name==='Image.lte')return Number(left<=right);if(name==='Image.eq')return Number(left===right);if(name==='Image.neq')return Number(left!==right);if(name==='Image.multiply')return left*right;throw Error('Unexpected quality operator '+name);
 }
 function findClear(node){if(node?.functionInvocationValue?.functionName==='Image.rename'&&node.functionInvocationValue.arguments.names.constantValue[0]==='clear_m2')return node;for(const child of Object.values(node||{})){if(Array.isArray(child)){for(const part of child){const found=findClear(part);if(found)return found;}}else if(child&&typeof child==='object'){const found=findClear(child);if(found)return found;}}return null;}
 const clear=findClear(expression.values.areas);assert.ok(clear);
 for(const scl of [0,1,3,7,8,9,10,11])assert.equal(evaluate(clear,scl),0,'SCL '+scl+' must not count as clear');
 for(const scl of [2,4,5,6])assert.equal(evaluate(clear,scl),1,'Known clear SCL '+scl+' remains eligible');
});

test('Independent source failures expose safe permission, quota and computation categories without provider text',async()=>{
 const previous=console.warn;console.warn=()=>{};
 try{
  for(const [httpStatus,code]of [[403,'GEE_ACCESS_DENIED'],[429,'GEE_QUOTA_LIMIT'],[400,'GEE_COMPUTE_REJECTED'],[503,'GEE_SOURCE_UNAVAILABLE']]){
   const v=fixture();v.state.mode='http-error';v.state.httpStatus=httpStatus;v.state.errorMessage='PRIVATE provider secret and arbitrary stack';
   const result=await lookup(v);
   for(const name of ['terrain','landcover','quality','forecast']){assert.equal(result[name].failure.code,code);assert.equal(result[name].failure.httpStatus,httpStatus);assert.equal(result[name].state,'unavailable');assert.ok(result[name].warnings.includes(result[name].failure.message));}
   assert.doesNotMatch(JSON.stringify(result),/PRIVATE|provider secret|arbitrary stack|secret-provider-token/);
  }
 }finally{console.warn=previous;}
});
