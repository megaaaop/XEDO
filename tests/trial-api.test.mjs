import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from '../src/worker.js';
import {database} from '../src/storage.js';
import {localEnvironment} from '../scripts/local-storage.mjs';
import {QuickMission,inspectionRectangle} from '../src/mission-flow.js';

const BASE='/api/v2/planning-trial',ORIGIN='http://localhost';
const geometry=()=>inspectionRectangle([101.2,12.6,101.202,12.602]);
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} differs from ${expected}`);
function inputs(){
  return {
    geometry:geometry(),driftEnabled:true,
    drift:{observedAt:'2099-01-01T00:00:00Z',arriveAt:'2099-01-01T00:10:00Z',endAt:'2099-01-02T00:00:00Z',currentEastMps:0,currentNorthMps:0,windSpeedMps:0,windFromDeg:0,alpha:.03,alphaMin:.025,alphaMax:.04,marginM:0},
    flight:{sensorWidthMm:6.4,sensorHeightMm:4.8,focalLengthMm:4,imageWidthPx:4000,imageHeightPx:3000,sideOverlap:.7,frontOverlap:.8,altitudeM:50,speedMps:5,minTriggerIntervalS:1,windEastMps:0,windNorthMps:0,windLimitMps:6,maxAirspeedMps:12,usableWh:120,reserveWh:20,powerW:180,takeoffS:15,landingS:15,turnS:1,home:[101.2,12.6]},
    export:{homeAmslM:12,firmware:'PX4',qgcVersion:'5.1.0',relativeHeightM:50,ceilingM:120,limitReference:'relative_home',flatSurfaceConfirmed:true,homeConfirmed:true,airspaceReviewed:true,source:'Local test-only manual constraint fixture, not live authority data.',plannedTakeoffAt:'2099-01-01T00:10:00Z',validUntil:'2099-01-02T00:00:00Z',noGo:{type:'FeatureCollection',features:[]},corridorM:5},
    oil:{areaM2:1000,thicknessLowUm:10,thicknessHighUm:10,densityGml:.86,capacityGg:3.42,allowance:1.5,targetFraction:1,oilFraction:1,emulsion:false}
  };
}
async function fixture(t){
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-trial-api-'))),db=database(env);
  t.after(()=>env.close());
  const execute=req=>worker.fetch(req,env,{waitUntil:promise=>promise.catch(()=>{})});
  const send=async(body={},route=BASE,options={})=>{
    const method=options.method??'POST',headers={'Content-Type':'application/json',...options.headers};
    const req=new Request(ORIGIN+route,{method,headers,...(!['GET','HEAD'].includes(method)&&!options.noBody?{body:Object.hasOwn(options,'raw')?options.raw:JSON.stringify(body)}:{})});
    const response=await execute(req),data=response.headers.get('Content-Type')?.includes('json')?await response.json():null;
    return {response,data};
  };
  const api=async(route,options={})=>{
    const response=await execute(new Request(ORIGIN+'/api/'+route,{...options,headers:{'Content-Type':'application/json',...options.headers}})),data=await response.json();
    if(!response.ok)throw new Error(data.message||data.error);return data;
  };
  const snapshot=async()=>{
    const tables=await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"),state={};
    for(const {name} of tables)state[name]=(await db.all('SELECT * FROM "'+name.replaceAll('"','""')+'"')).map(row=>JSON.stringify(row)).sort();
    return state;
  };
  const rejectWrites=()=>{
    const prepare=env.DB.prepare;
    env.DB.prepare=query=>{assert.match(query.trim(),/^SELECT\b/i,'Trial request attempted a database mutation: '+query);return prepare(query);};
  };
  return {env,db,send,api,snapshot,rejectWrites};
}

test('Manual trial API composes all four modules and downloads only a checked local QGC artifact',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),body=inputs(),beforeInput=structuredClone(body),before=await snapshot();rejectWrites();
  const {response,data}=await send(body);
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(data.schema_version,'xedo-planning-trial/1');assert.equal(data.purpose,'planning_trial_only');
  assert.equal(data.source.kind,'user_trial_boundary');assert.deepEqual(data.source.geometry,body.geometry);assert.deepEqual(body,beforeInput);
  assert.equal(data.drift.state,'assumption_based');assert.deepEqual(data.target,data.drift.geometry);assert.deepEqual(data.flight.plan.target,data.target);
  assert.equal(data.flight.state,'generated');assert.equal(data.flight.camera.state,'pass');assert.equal(data.flight.wind.state,'pass');assert.equal(data.flight.battery.state,'pass');assert(data.flight.battery.sorties.length>0);
  assert.equal(data.exportCheck.pass,true);assert.equal(data.exportCheck.canExport,true);assert.equal(data.exportCheck.notFlightApproval,true);
  assert.equal(data.oil.state,'assumption_based');assert.equal(data.oil.volumeLowL,10);near(data.oil.capsulesLowKg,3.7719298245614032);
  assert.match(data.inputHash,/^[a-f0-9]{64}$/);assert.equal(data.hardwareControl,false);assert.equal(data.releaseControl,false);
  const file=await send(body,BASE+'/export');assert.equal(file.response.status,200);assert.equal(file.data.inputHash,data.inputHash);assert.match(file.data.filename,/\.plan$/);
  const native=JSON.parse(file.data.text);assert.equal(native.fileType,'Plan');assert.deepEqual(native.mission.plannedHomePosition,[12.6,101.2,12]);assert(native.mission.items.every(item=>[22,178,16,21].includes(item.command)));
  assert.equal(file.data.hardwareControl,false);assert.equal(file.data.releaseControl,false);assert.equal(file.data.report.notFlightApproval,true);
  assert.deepEqual(await snapshot(),before);
});

test('Incomplete and cleared trial inputs return progressive nulls without erasing or creating database records',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),before=await snapshot();rejectWrites();
  const empty=await send({});assert.equal(empty.response.status,200);assert.equal(empty.data.drift.state,'disabled');assert.equal(empty.data.target,null);assert.equal(empty.data.flight.plan,null);assert.equal(empty.data.exportCheck.pass,false);assert.equal(empty.data.oil.areaM2,null);assert.equal(empty.data.oil.volumeLowL,null);assert.equal(empty.data.oil.capsulesLowKg,null);
  const onlyOil=await send({oil:{areaM2:1000,thicknessLowUm:10,thicknessHighUm:null,densityGml:null,capacityGg:null}});
  assert.equal(onlyOil.response.status,200);assert.equal(onlyOil.data.oil.areaM2,1000);assert.equal(onlyOil.data.oil.volumeLowL,10);assert.equal(onlyOil.data.oil.volumeHighL,null);assert.equal(onlyOil.data.oil.oilMassLowKg,null);assert.equal(onlyOil.data.oil.capsulesLowKg,null);assert.equal(onlyOil.data.oil.state,'incomplete');
  const body=inputs();delete body.drift.currentNorthMps;const missingDrift=await send(body);
  assert.equal(missingDrift.response.status,200);assert.equal(missingDrift.data.drift.state,'incomplete');assert.equal(missingDrift.data.drift.inputs.currentNorthMps,null);assert.equal(missingDrift.data.target,null);assert.equal(missingDrift.data.flight.plan,null);assert.equal(missingDrift.data.exportCheck.pass,false);assert.equal(missingDrift.data.oil.volumeLowL,10);
  assert.deepEqual(await snapshot(),before);
});

test('Saved-survey trial reads the exact frozen Quick boundary after live observation edits, with no source writes',async t=>{
  const {api,send,snapshot,rejectWrites}=await fixture(t),state=await api('state'),scene=state.scenes.find(item=>item.localPreview),flow=new QuickMission(api),original=geometry();
  flow.selectArea(original);await flow.survey({archivedScene:scene});flow.imageReady=true;const saved=await flow.prepare('Trial API test operator');
  const observation=(await api('state')).records.find(item=>item.id===flow.ids.observation),ring=original.coordinates[0],edited={type:'Polygon',coordinates:[[ring[0],ring[1],ring[2],ring[0]]]};
  await api('records/'+observation.id,{method:'PATCH',body:JSON.stringify({revision:observation.revision,geometry:edited,reviewer:'test operator',reason:'Independent current observation revision after saved snapshot'})});
  const before=await snapshot();rejectWrites();
  const source=await send(undefined,BASE+'/source?survey='+saved.surveyId,{method:'GET'});assert.equal(source.response.status,200);assert.equal(source.data.kind,'frozen_survey_snapshot');assert.deepEqual(source.data.geometry,original);assert.equal(source.data.sceneId,scene.id);assert.equal(source.data.acquiredAt,scene.acquiredAt);
  const body=inputs();delete body.geometry;body.surveyId=saved.surveyId;body.driftEnabled=false;
  const result=await send(body);assert.equal(result.response.status,200);assert.deepEqual(result.data.target,original);assert.deepEqual(result.data.flight.plan.target,original);assert.equal(result.data.source.surveyId,saved.surveyId);assert.equal(result.data.source.incidentId,saved.incidentId);assert.equal(result.data.source.sceneId,scene.id);
  const second=await send(body);assert.equal(second.data.inputHash,result.data.inputHash);
  const override=await send({...body,geometry:edited});assert.equal(override.response.status,422);assert.match(override.data.message,/frozen geometry/);
  const current=(await api('state')).records.find(item=>item.id===flow.ids.observation);assert.deepEqual(current.geometry,edited);
  assert.deepEqual(await snapshot(),before);
});

test('Trial Worker rejects malformed, non-JSON, oversized, cross-origin and unknown-field requests without writes',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),before=await snapshot();rejectWrites();
  const cases=[
    [{raw:'{'},400,/valid JSON/],
    [{raw:'{}',headers:{'Content-Type':'text/plain'}},415,/application\/json/],
    [{noBody:true},400,/body is required/],
    [{raw:'null'},422,/JSON object/],
    [{raw:'[]'},422,/JSON object/],
    [{raw:JSON.stringify({oil:{note:'x'.repeat(65536)}})},413,/64 KiB/],
    [{headers:{Origin:'https://other.invalid'}},403,/other websites|Cross-site/],
    [{headers:{'Sec-Fetch-Site':'cross-site'}},403,/other websites|Cross-site/]
  ];
  for(const [options,status,message] of cases){const result=await send({},BASE,options);assert.equal(result.response.status,status);assert.match(result.data.message,message);assert.equal(result.data.retryable,false);assert(result.data.request_id);}
  for(const body of [{unknown:1},{geometry:geometry(),hardwareControl:true},{driftEnabled:'true'},{drift:[]},{flight:'profile'},{export:[]},{oil:3}]){const result=await send(body);assert.equal(result.response.status,422);assert.equal(result.data.code,'VALIDATION_ERROR');}
  const sameOrigin=await send({},BASE,{headers:{Origin:ORIGIN}});assert.equal(sameOrigin.response.status,200);
  const method=await send(undefined,BASE,{method:'GET'});assert.equal(method.response.status,405);assert.equal(method.response.headers.get('Allow'),'POST');
  assert.equal((await send({},BASE+'/missing')).response.status,404);
  assert.equal((await send(undefined,BASE+'/source',{method:'GET'})).response.status,422);
  assert.equal((await send(undefined,BASE+'/source?survey=SUR_missing',{method:'GET'})).response.status,404);
  assert.deepEqual(await snapshot(),before);
});

test('Missing export checks block artifact creation while calculate retains independently available oil values',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),before=await snapshot(),body=inputs();body.driftEnabled=false;delete body.export.airspaceReviewed;rejectWrites();
  const calculation=await send(body);assert.equal(calculation.response.status,200);assert.equal(calculation.data.flight.state,'generated');assert.equal(calculation.data.exportCheck.pass,false);assert.equal(calculation.data.oil.volumeLowL,10);
  const result=await send(body,BASE+'/export');assert.equal(result.response.status,422);assert.equal(result.data.code,'TRIAL_CHECKS_INCOMPLETE');assert.equal(result.data.details.pass,false);assert(result.data.details.missing.length>0);assert.equal(result.data.text,undefined);assert.equal(result.data.filename,undefined);assert.equal(result.data.retryable,false);
  assert.deepEqual(await snapshot(),before);
});

test('Flight energy-budget failure preserves oil estimate and blocks export rather than returning a fake successful route',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),before=await snapshot(),body=inputs();body.driftEnabled=false;Object.assign(body.flight,{usableWh:1,reserveWh:0});rejectWrites();
  const calculation=await send(body);assert.equal(calculation.response.status,200);assert.equal(calculation.data.flight.state,'blocked');assert.equal(calculation.data.flight.code,'SORTIE_INFEASIBLE');assert.equal(calculation.data.flight.battery.state,'blocked');assert.deepEqual(calculation.data.flight.battery.sorties,[]);assert.equal(calculation.data.exportCheck.pass,false);assert.equal(calculation.data.oil.volumeLowL,10);near(calculation.data.oil.capsulesLowKg,3.7719298245614032);
  const download=await send(body,BASE+'/export');assert.equal(download.response.status,422);assert.equal(download.data.text,undefined);assert.deepEqual(await snapshot(),before);
});

test('Trial input hash is stable across nested object-key order and changes with meaningful inputs',async t=>{
  const {send,rejectWrites}=await fixture(t);rejectWrites();
  const body=inputs(),reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)])):value;
  const first=await send(body),reordered=await send(reverseKeys(body));assert.equal(first.response.status,200);assert.equal(reordered.response.status,200);assert.equal(reordered.data.inputHash,first.data.inputHash);
  const changed=await send({...body,oil:{...body.oil,thicknessLowUm:9}});assert.equal(changed.response.status,200);assert.notEqual(changed.data.inputHash,first.data.inputHash);
});

test('The coordinator refuses export when a complete assessed flight falls outside the supplied drift window',async t=>{
  const {send,rejectWrites}=await fixture(t);rejectWrites();
  const body=inputs();body.drift.endAt=body.drift.arriveAt;
  const calculation=await send(body);assert.equal(calculation.response.status,200);assert.equal(calculation.data.flight.battery.state,'pass');assert.equal(calculation.data.exportCheck.pass,false);assert.equal(calculation.data.exportCheck.state,'incomplete');assert.equal(calculation.data.exportCheck.canExport,false);assert(calculation.data.exportCheck.checks.some(check=>check.id==='drift-window'&&check.state==='incomplete'));
  const download=await send(body,BASE+'/export');assert.equal(download.response.status,422);assert.equal(download.data.text,undefined);
});

test('Declared ground-delay end is included when checking drift-window coverage before export',async t=>{
  const {send,rejectWrites}=await fixture(t);rejectWrites();
  const body=inputs();body.export.plannedEndAt='2099-01-02T01:00:00Z';body.export.validUntil='2099-01-03T00:00:00Z';
  const result=await send(body);assert.equal(result.response.status,200);assert.equal(result.data.flight.battery.state,'pass');assert.equal(result.data.exportCheck.plannedEndAt,new Date(body.export.plannedEndAt).toISOString());assert.equal(result.data.exportCheck.pass,false);assert.equal(result.data.exportCheck.canExport,false);
  const download=await send(body,BASE+'/export');assert.equal(download.response.status,422);assert.equal(download.data.text,undefined);
});

test('Conflicting oil-area inputs block only the oil module and preserve assessed flight outputs',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),body=inputs(),before=await snapshot();rejectWrites();
  body.oil.pixelCount=2500000;body.oil.gsdM=.02;
  const {response,data}=await send(body);
  assert.equal(response.status,200);assert.equal(data.flight.state,'generated');assert.equal(data.flight.camera.state,'pass');assert.equal(data.flight.wind.state,'pass');assert.equal(data.flight.battery.state,'pass');assert(data.flight.battery.sorties.length>0);
  assert.equal(data.oil.state,'blocked');assert.equal(data.oil.volumeLowL??null,null);assert.equal(data.oil.capsulesLowKg??null,null);
  assert.equal(data.hardwareControl,false);assert.equal(data.releaseControl,false);assert.deepEqual(await snapshot(),before);
});

test('Invalid present camera focal length blocks flight but preserves independently available oil estimate',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),body=inputs(),before=await snapshot();rejectWrites();
  body.flight.focalLengthMm=-1;
  const {response,data}=await send(body);
  assert.equal(response.status,200);assert.equal(data.flight.state,'blocked');assert.equal(data.flight.camera.state,'blocked');assert.equal(data.flight.plan??null,null);assert.equal(data.exportCheck.pass,false);
  assert.equal(data.oil.state,'assumption_based');assert.equal(data.oil.volumeLowL,10);assert.equal(data.oil.volumeHighL,10);near(data.oil.capsulesLowKg,3.7719298245614032);
  assert.equal(data.hardwareControl,false);assert.equal(data.releaseControl,false);assert.deepEqual(await snapshot(),before);
});

test('A flight completed before the swept-envelope arrival window cannot export a prematurely acquired route',async t=>{
  const {send,snapshot,rejectWrites}=await fixture(t),body=inputs(),before=await snapshot();rejectWrites();
  Object.assign(body.drift,{observedAt:'2099-01-02T00:00:00Z',arriveAt:'2099-01-02T01:00:00Z',endAt:'2099-01-02T01:30:00Z',currentEastMps:.2,currentNorthMps:0,windSpeedMps:0});
  Object.assign(body.export,{plannedTakeoffAt:'2099-01-02T00:01:00Z',validUntil:'2099-01-02T02:00:00Z'});body.flight.usableWh=10000;
  const {response,data}=await send(body);
  assert.equal(response.status,200);assert.equal(data.drift.state,'assumption_based');assert.equal(data.flight.state,'generated');assert.equal(data.flight.battery.state,'pass');assert(data.flight.battery.sorties.length>0);
  assert(Date.parse(data.exportCheck.plannedEndAt)<Date.parse(body.drift.arriveAt),'Fixture must finish the whole assessed flight before the envelope begins.');
  assert.equal(data.exportCheck.pass,false);assert.equal(data.exportCheck.canExport,false);assert(data.exportCheck.checks.some(check=>check.id==='drift-window'&&check.state!=='pass'));
  const download=await send(body,BASE+'/export');assert.equal(download.response.status,422);assert.equal(download.data.code,'TRIAL_CHECKS_INCOMPLETE');assert.equal(download.data.text,undefined);
  assert.deepEqual(await snapshot(),before);
});
