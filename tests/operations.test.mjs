import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import worker from '../src/worker.js';import {localEnvironment} from '../scripts/local-storage.mjs';import {buildPlan,simulate,profileInput} from '../src/planning.js';import {previewLab,labHeaders} from '../src/lab.js';
const target={type:'Polygon',coordinates:[[[101.20,12.60],[101.202,12.60],[101.202,12.602],[101.20,12.602],[101.20,12.60]]]};
const profile=profileInput({name:'test simulation',source:'fixture only',sourceMode:'simulated',speedMps:5,altitudeM:50,altitudeReference:'AGL',swathM:50,enduranceS:1200,reserveFraction:0.2,turnS:3,takeoffS:20,landingS:20,capacityKg:null});
const basic=(geometry=target,extra={})=>buildPlan({geometry,profile,home:[101.20,12.60],spacingM:50,...extra});
test('Planner: 14 geometry/budget cases and estimates in local metres',()=>{
  const p=basic();assert.equal(p.status,'generated');assert.match(p.calculationCrs,/32647/);assert.ok(p.estimates.distanceM>1500&&p.estimates.distanceM<1900);assert.ok(Math.abs(p.estimates.workingDistanceM-1106.6)<5);assert.ok(p.waypoints.every(x=>x.dispenser==='off'));assert.equal(p.estimates.coveragePercent,null);
  assert.equal(basic({type:'Polygon',coordinates:[target.coordinates[0].toReversed()]}).status,'generated');
  assert.equal(basic(target,{angleDeg:45}).status,'generated');
  assert.equal(basic({type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.6],[101.201,12.602],[101.2,12.6]]]}).status,'generated');
  assert.throws(()=>basic({type:'Polygon',coordinates:[]}),e=>e.code==='INVALID_GEOMETRY');
  assert.throws(()=>basic({type:'Polygon',coordinates:[[]]}),e=>e.code==='INVALID_GEOMETRY');
  assert.equal(basic({type:'Polygon',coordinates:[target.coordinates[0],target.coordinates[0]]}).status,'unsupported');
  assert.equal(basic({type:'MultiPolygon',coordinates:[target.coordinates]}).status,'unsupported');
  assert.equal(basic({type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.6],[101.201,12.601],[101.202,12.602],[101.2,12.602],[101.2,12.6]]]}).status,'unsupported');
  assert.throws(()=>basic({type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.602],[101.202,12.6],[101.2,12.602],[101.2,12.6]]]}));
  const blocked=basic(target,{noGo:[target]});assert.equal(blocked.status,'blocked');assert.equal(blocked.waypoints.length,0);
  assert.equal(basic(target,{profile:{...profile,enduranceS:1}}).status,'blocked');
  assert.throws(()=>basic(target,{spacingM:0}));assert.equal(basic(target,{purpose:'treatment'}).status,'unsupported');
  assert.equal(basic(target,{profile:{...profile,enduranceS:null,turnS:null}}).estimates.durationS,null);
});
test('Simulator is reproducible; fault/loss are failed partial logs, not device state',()=>{
  const p=basic(),a=simulate(p,{seed:42}),b=simulate(p,{seed:42});assert.deepEqual(a,b);assert.equal(a.status,'completed');assert.equal(a.events.at(-1).route_progress,100);assert.equal(a.events.at(-1).battery,null);
  for(const scenario of ['signal_loss','dispenser_fault']){const r=simulate(p,{scenario,seed:42});assert.equal(r.status,'failed');assert.ok(r.summary.progressPercent<100);assert.ok(r.events.at(-1).health.fault_code);}
});
test('API workflow: plan/log/capture/processing/telemetry/CSV/report/restart/restore',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'xedo-v2-'));let env=await localEnvironment(dir);env.XEDO_PI_TOKEN='fixture-device-token-not-a-production-secret';
  const call=async(method,route,data,headers={})=>{const r=await worker.fetch(new Request('http://localhost/api/'+route,{method,headers,...(data?{body:data instanceof FormData?data:JSON.stringify(data)}:{})}),env,{waitUntil:p=>p.catch(()=>{})});return {status:r.status,data:await r.json()};};
  const start=await call('GET','state'),scene=start.data.scenes.find(s=>s.localPreview);
  await call('POST','records',{id:'INC_v2_test',kind:'incident',areaId:'rayong',title:'V2 test-only incident',owner:'test',reason:'Not an oil detection; fixture only'});
  await call('POST','records',{id:'OBS_v2_test',kind:'observation',incidentId:'INC_v2_test',sceneId:scene.id,geometry:target,note:'fixture geometry',reviewer:'test'});
  await call('POST','records',{id:'SUR_v2_test',kind:'survey',incidentId:'INC_v2_test',title:'survey fixture',note:'snapshot test'});
  const planInput={id:'MSN_v2_test',surveyId:'SUR_v2_test',observationId:'OBS_v2_test',profileId:'PROFILE_sim_basic',home:target.coordinates[0][0],spacingM:50};
  const plan=await call('POST','v1/mission-plans',planInput);assert.equal(plan.status,201);assert.equal(plan.data.status,'generated');assert.equal((await call('POST','v1/mission-plans',planInput)).status,200);
  assert.equal((await call('GET','v1/mission-plans/MSN_v2_test/export?format=geojson')).data.metadata.plan.targetRevision,1);
  const exportedPlan=(await call('GET','v1/mission-plans/MSN_v2_test/export?format=json')).data;assert.equal((await call('POST','v1/mission-plans/import',exportedPlan)).data.id,'MSN_v2_test');
  const run=await call('POST','v1/runs',{id:'SIM_v2_test',planId:planInput.id,scenario:'success',seed:42,startedAt:'2026-10-04T03:00:00Z'});assert.equal(run.status,201);const log=(await call('GET','v1/runs/SIM_v2_test/log')).data;assert.equal(log.plan_id,planInput.id);assert.equal(log.events.at(-1).route_progress,100);
  assert.equal((await call('GET','v1/devices/pi-001/state')).data.latest,null);
  const importedLog=await call('POST','v1/runs/import',{id:'REPLAY_v2_test',log});assert.equal(importedLog.status,201);assert.equal(importedLog.data.sourceMode,'replay');assert.equal((await call('GET','v1/runs/REPLAY_v2_test/log')).data.events[0].observed_at,log.events[0].observed_at);assert.equal((await call('GET','v1/devices/pi-001/state')).data.latest,null);
  const f=new FormData();f.set('file',new File([await readFile('public/assets/sentinel-proof.png')],'fixture.png',{type:'image/png'}));f.set('metadata',JSON.stringify({schema_version:'1.0',capture_id:'CAP_v2_test',device_id:'pi-001',incident_id:'INC_v2_test',source_mode:'live',capture_mode:'imported',captured_at:'2026-09-29T03:55:05Z',width:768,height:370,position:null}));
  const capture=await call('POST','v1/captures',f);assert.equal(capture.status,201);assert.equal(capture.data.processingState,'processing_unavailable');assert.equal((await call('POST','v1/captures',f)).status,200);
  const proc={schema_version:'1.0',run_id:'PROC_v2_test',capture_id:'CAP_v2_test',status:'completed',algorithm_version:'fixture-only/1',parameters:{},duration_ms:42,bboxes:[[10,10,40,40]],coordinate_space:'pixel',processed_at:'2026-10-04T03:00:00Z',reason:'Test adapter; not a deployed oil model'};
  assert.equal((await call('POST','v1/image-processing-results',{...proc,bboxes:[[0,0,99999,1]]})).status,422);assert.equal((await call('POST','v1/image-processing-results',proc)).status,201);
  const ev=(sequence,boot='BOOT_v2_test')=>({schema_version:'1.0',event_id:'EVT_test_'+boot+'_'+sequence,device_id:'pi-001',boot_id:boot,sequence,observed_at:new Date().toISOString(),clock_quality:'unknown',mission_id:null,source_mode:'live',position:null,battery:null,dispenser:{state:'unknown',requested_setting:null,measured_remaining_kg:null},health:{agent:'online',fault_code:null}});
  const batch=e=>({device_id:'pi-001',source_mode:'live',events:e}),auth={'x-xedo-device-token':env.XEDO_PI_TOKEN},e2=ev(2),e1=ev(1);
  assert.equal((await call('POST','v1/telemetry/batches',batch([e2]))).status,403);
  const first=await call('POST','v1/telemetry/batches',batch([e2,e2]),auth);assert.equal(first.status,202);assert.equal(first.data.accepted,1);assert.equal(first.data.duplicates,1);
  assert.equal((await call('POST','v1/telemetry/batches',batch([e2]),auth)).data.duplicates,1);assert.equal((await call('POST','v1/telemetry/batches',batch([e1]),auth)).status,202);
  assert.equal((await call('GET','v1/devices/pi-001/state')).data.latest.sequence,2);const reboot=ev(0,'BOOT_new_test');assert.equal((await call('POST','v1/telemetry/batches',batch([reboot]),auth)).status,202);await call('POST','v1/telemetry/batches',batch([ev(9)]),auth);assert.equal((await call('GET','v1/devices/pi-001/state')).data.latest.boot_id,'BOOT_new_test');
  const rows=[['SAMPLE_v2','INC_v2_test','','BATCH_v2','control','2026-10-04T03:00:00Z','oil_concentration','12.4','mg/L','water','lab test','fixture.csv','1','=','']];const csv=labHeaders.join(',')+'\n'+rows.map(r=>r.join(',')).join('\n');
  const preview=await call('POST','v1/lab-imports',{id:'IMPORT_v2_test',csv,name:'fixture.csv',sourceMode:'simulated'});assert.equal(preview.status,201);assert.equal(preview.data.valid,true);assert.equal((await call('POST','v1/lab-imports/IMPORT_v2_test/commit',{revision:1})).status,200);assert.equal((await call('POST','v1/lab-imports/IMPORT_v2_test/commit',{revision:1})).status,200);
  assert.equal(previewLab(csv,[],[{id:'INC_v2_test'}],[],'simulated').rows.length,1);assert.equal(previewLab(csv.replace('mg/L','mg/kg'),[],[{id:'INC_v2_test'}],[],'simulated').errors[0].code,'INVALID_UNITS');
  const duplicate=await call('POST','v1/lab-imports',{id:'IMPORT_duplicate',csv,name:'fixture.csv',sourceMode:'simulated'});assert.equal(duplicate.data.valid,false);assert.equal(duplicate.data.errors[0].code,'DUPLICATE_RESULT');
  let report=(await call('GET','v1/incidents/INC_v2_test/report')).data;assert.equal(report.results.length,1);assert.equal(report.captures.length,1);assert.equal(report.processing[0].coordinateSpace,'pixel');assert.equal(report.results[0].sourceMode,'simulated');assert.equal(report.plans[0].needsReview,false);
  const filtered=(await call('GET','v1/incidents/INC_v2_test/report?mission=MSN_v2_test')).data;assert.equal(filtered.captures.length,0);assert.equal(filtered.results.length,0);assert.equal(filtered.plans.length,1);
  await call('PATCH','records/OBS_v2_test',{revision:1,geometry:{...target,coordinates:[target.coordinates[0].map(p=>[p[0]+0.00001,p[1]])]},reviewer:'test',reason:'revision test'});assert.equal((await call('GET','v1/mission-plans/MSN_v2_test')).data.needsReview,true);assert.equal((await call('POST','v1/runs',{id:'SIM_stale_test',planId:planInput.id,scenario:'success',seed:42,startedAt:'2026-10-04T03:00:00Z'})).status,409);
  const backup=await call('GET','backup');assert.equal(backup.status,200);assert.equal(backup.data.telemetry.length,4);assert.ok(backup.data.files.some(f=>f.key==='assets/LOG_SIM_v2_test'));
  env.close();env=await localEnvironment(dir);assert.equal((await call('GET','v1/runs/SIM_v2_test/log')).data.events.length,log.events.length);assert.equal((await call('GET','v1/devices/pi-001/state')).data.latest.boot_id,'BOOT_new_test');env.close();env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-v2-restored-')));
  assert.equal((await call('POST','restore',backup.data)).status,200);assert.equal((await call('GET','v1/incidents/INC_v2_test/report')).data.results[0].value,12.4);assert.equal((await call('GET','v1/runs/SIM_v2_test/log')).data.events.length,log.events.length);assert.equal((await call('GET','v1/devices/pi-001/events?mode=live')).data.items.length,4);env.close();
});

test('Capture and processing IDs accept identical retries and reject changed data without replacing originals',async()=>{
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-upload-conflicts-'))),bytes=await readFile('public/assets/sentinel-proof.png');
  const call=async(route,body,headers={})=>{const response=await worker.fetch(new Request('http://localhost/api/'+route,{method:body?'POST':'GET',headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env,{waitUntil:p=>p.catch(()=>{})});return {status:response.status,data:await response.json()};};
  try{
    await call('state');
    for(const id of ['INC_upload_original','INC_upload_other'])assert.equal((await call('records',{id,kind:'incident',areaId:'rayong',title:'Local upload conflict fixture',owner:'test',reason:'Local fixture only'})).status,201);
    const metadata={schema_version:'1.0',capture_id:'CAP_upload_original',device_id:'pi-001',incident_id:'INC_upload_original',source_mode:'live',capture_mode:'imported',captured_at:'2026-10-22T00:00:00Z',width:768,height:370,camera_model:'fixture-camera',position:null};
    const upload=(changes={},image=bytes,name='fixture.png',headers={})=>{const form=new FormData();form.set('file',new File([image],name,{type:'image/png'}));form.set('metadata',JSON.stringify({...metadata,...changes}));return call('v1/captures',form,headers);};
    assert.equal((await upload()).status,201);assert.equal((await upload()).status,200);
    // Existing records have mapped fields and an asset checksum; no request
    // fingerprint or database migration is required for retry comparisons.
    assert.equal((await upload({captured_at:'2026-10-22T07:00:00+07:00'})).status,200);
    for(const changes of [{incident_id:'INC_upload_other'},{device_id:'sim-pi-001',source_mode:'simulated'},{camera_model:'different-camera'},{width:767},{height:369},{position:[101.2,12.6]},{captured_at:'2026-10-22T00:00:01Z'},{capture_mode:'captured_live'}]){
      const conflict=await upload(changes);assert.equal(conflict.status,409);assert.equal(conflict.data.code,'ID_CONFLICT');
    }
    const altered=Buffer.from(bytes);altered[altered.length-1]^=1;
    for(const result of [await upload({},altered),await upload({},bytes,'other-name.png')]){assert.equal(result.status,409);assert.equal(result.data.code,'ID_CONFLICT');}
    assert.equal((await upload({capture_id:'CAP_upload_other',incident_id:'INC_upload_other'})).status,201);
    const processing={schema_version:'1.0',run_id:'PROC_upload_original',capture_id:metadata.capture_id,status:'completed',algorithm_version:'fixture/1',parameters:{threshold:0.5,nested:{width:1,height:2}},duration_ms:12,bboxes:[[10,10,40,40]],coordinate_space:'pixel',processed_at:'2026-10-22T00:00:00Z',reason:'Local processing fixture'};
    assert.equal((await call('v1/image-processing-results',processing)).status,201);assert.equal((await call('v1/image-processing-results',processing)).status,200);
    assert.equal((await call('v1/image-processing-results',{...processing,parameters:{nested:{height:2,width:1},threshold:0.5}})).status,200);
    for(const changes of [{capture_id:'CAP_upload_other'},{algorithm_version:'fixture/2'},{parameters:{threshold:0.6}},{duration_ms:13},{bboxes:[[11,10,40,40]]},{processed_at:'2026-10-22T00:00:01Z'},{reason:'Different result'},{status:'unavailable',coordinate_space:'none'}]){
      const conflict=await call('v1/image-processing-results',{...processing,...changes});assert.equal(conflict.status,409);assert.equal(conflict.data.code,'ID_CONFLICT');
    }
    env.XEDO_PI_TOKEN='fixture-only-live-capture-token-at-least-32-characters';
    const auth={'x-xedo-device-token':env.XEDO_PI_TOKEN},live={capture_id:'CAP_upload_live_fixture',capture_mode:'captured_live'};
    assert.equal((await upload(live,bytes,'fixture.png',auth)).status,201);
    assert.equal((await upload(live)).status,403);assert.equal((await upload(live,bytes,'fixture.png',auth)).status,200);
    const liveProcessing={...processing,run_id:'PROC_live_fixture',capture_id:live.capture_id};
    assert.equal((await call('v1/image-processing-results',liveProcessing,auth)).status,201);
    assert.equal((await call('v1/image-processing-results',liveProcessing)).status,403);assert.equal((await call('v1/image-processing-results',liveProcessing,auth)).status,200);
    const after=(await call('state')).data.records;
    assert.equal(after.filter(r=>r.kind==='capture').length,3);assert.equal(after.filter(r=>r.kind==='processing').length,2);
    assert.equal(after.find(r=>r.id===metadata.capture_id).incidentId,metadata.incident_id);assert.equal(after.find(r=>r.id===processing.run_id).captureId,metadata.capture_id);
    assert.deepEqual(Buffer.from(await (await env.BUCKET.get('assets/IMAGE_'+metadata.capture_id)).arrayBuffer()),bytes);
  }finally{env.close();}
});
