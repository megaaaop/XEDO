import test from 'node:test';
import assert from 'node:assert/strict';
import {fileTrialAPI} from '../src/planning-file-api.js';

const submit=(body,path='',options={})=>fileTrialAPI(path,{method:'POST',body:JSON.stringify(body),...options});
const fixture=()=>({
  geometry:{type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.6],[101.202,12.602],[101.2,12.602],[101.2,12.6]]]},driftEnabled:true,
  drift:{observedAt:'2099-01-01T00:00:00Z',arriveAt:'2099-01-01T00:10:00Z',endAt:'2099-01-02T00:00:00Z',currentEastMps:0,currentNorthMps:0,windSpeedMps:0,windFromDeg:0},
  flight:{sensorWidthMm:6.4,sensorHeightMm:4.8,focalLengthMm:4,imageWidthPx:4000,imageHeightPx:3000,sideOverlap:.7,frontOverlap:.8,altitudeM:50,speedMps:5,minTriggerIntervalS:1,windEastMps:0,windNorthMps:0,windLimitMps:6,maxAirspeedMps:12,usableWh:120,reserveWh:20,powerW:180,takeoffS:15,landingS:15,turnS:1,home:[101.2,12.6]},
  export:{homeAmslM:12,firmware:'PX4',qgcVersion:'5.1.0',relativeHeightM:50,ceilingM:120,limitReference:'relative_home',flatSurfaceConfirmed:true,homeConfirmed:true,airspaceReviewed:true,source:'Standalone unit-test synthetic manually reviewed constraints.',plannedTakeoffAt:'2099-01-01T00:10:00Z',validUntil:'2099-01-02T00:00:00Z',noGo:{type:'FeatureCollection',features:[]},corridorM:5},
  oil:{pixelCount:2500000,gsdM:.02,thicknessLowUm:10,thicknessHighUm:30,densityGml:.86,capacityGg:3.42,allowance:1.5,targetFraction:1,emulsion:false}
});

test('Standalone adapter calculates all four modules and a real input hash without HTTP, database or mutation',async t=>{
  let requests=0;t.mock.method(globalThis,'fetch',()=>{requests++;throw Error('No HTTP is permitted in this calculation.');});
  const input=fixture(),before=structuredClone(input),result=await submit(input);
  assert.equal(requests,0);assert.deepEqual(input,before);assert.equal(result.schema_version,'xedo-planning-trial/1');
  assert.equal(result.source.surveyId,null);assert.equal(result.source.kind,'user_trial_boundary');assert.deepEqual(result.source.geometry,input.geometry);
  assert.equal(result.drift.state,'assumption_based');assert.equal(result.flight.camera.state,'pass');assert.equal(result.flight.battery.state,'pass');assert.equal(result.exportCheck.pass,true);
  assert(Math.abs(result.flight.camera.lineSpacingM-24)<1e-9);assert(Math.abs(result.flight.camera.photoSpacingM-12)<1e-9);assert(Math.abs(result.flight.camera.triggerIntervalS-2.4)<1e-9);
  assert.equal(result.oil.volumeLowL,10);assert.equal(result.oil.volumeHighL,30);assert(Math.abs(result.oil.capsulesLowKg-3.7719298245614032)<1e-9);
  assert.match(result.inputHash,/^[0-9a-f]{64}$/);assert.equal(result.hardwareControl,false);assert.equal(result.releaseControl,false);
  const repeat=await submit(input);assert.equal(repeat.inputHash,result.inputHash);
});

test('Standalone native file export recomputes current manual checks and never creates hardware commands',async()=>{
  const input=fixture(),file=await submit(input,'/export'),native=JSON.parse(file.text);
  assert.equal(file.filename,'XEDO-trial-sortie-01.plan');assert.equal(file.mime,'application/json');assert.equal(file.report.pass,true);
  assert.equal(native.fileType,'Plan');assert.deepEqual(native.mission.plannedHomePosition,[12.6,101.2,12]);assert(native.mission.items.every(item=>[22,178,16,21].includes(item.command)));
  assert.equal(file.hardwareControl,false);assert.equal(file.releaseControl,false);assert.equal(file.report.notFlightApproval,true);
  input.export.airspaceReviewed=false;
  await assert.rejects(submit(input,'/export'),error=>error.status===422&&error.code==='TRIAL_CHECKS_INCOMPLETE'&&error.details.canExport===false&&!error.text);
  const calculation=await submit(input);assert.equal(calculation.exportCheck.pass,false);assert.equal(calculation.oil.volumeLowL,10);
});

test('Standalone inputs reject malformed/oversized data, unknown top-level and hardware keys, and invalid setting shapes',async()=>{
  for(const [raw,status] of [['',400],['{',400],['null',422],['[]',422],[JSON.stringify({oil:{note:'é'.repeat(33000)}}),413]])await assert.rejects(fileTrialAPI('',{body:raw}),error=>error.status===status);
  for(const input of [{unknown:true},{hardwareControl:true},{releaseControl:true},{drift:[]},{flight:'profile'},{export:[]},{oil:2},{driftEnabled:'true'}])await assert.rejects(submit(input),error=>error.status===422&&error.code==='VALIDATION_ERROR');
});

test('Standalone source lookup and non-null survey IDs fail before any database read or network request',async t=>{
  t.mock.method(globalThis,'fetch',()=>{throw Error('The standalone adapter must not fetch a survey.');});
  await assert.rejects(submit({surveyId:'SUR_existing'}),error=>error.status===409&&error.code==='LOCAL_SOURCE_UNAVAILABLE'&&/snapshot.*source geometry/.test(error.message));
  await assert.rejects(fileTrialAPI('/source?survey=SUR_existing',{method:'GET'}),error=>error.status===409&&/snapshot/.test(error.message));
  const empty=await submit({surveyId:null});assert.equal(empty.source.geometry,null);assert.equal(empty.oil.volumeLowL,null);assert.equal(empty.exportCheck.pass,false);
  await assert.rejects(fileTrialAPI('/not-a-route',{body:'{}'}),error=>error.status===404);
  await assert.rejects(fileTrialAPI('',{method:'GET',body:'{}'}),error=>error.status===405);
});

test('Standalone native export validates selected sortie index and geometry before downloading',async()=>{
  for(const sortieIndex of [-1,.5,'0'])await assert.rejects(submit({...fixture(),sortieIndex},'/export'),error=>error.status===422&&error.code==='INVALID_SORTIE_INDEX');
  await assert.rejects(submit({...fixture(),sortieIndex:999},'/export'),error=>error.status===422&&error.code==='INVALID_SORTIE_INDEX');
  await assert.rejects(submit({geometry:{type:'Point',coordinates:[101.2,12.6]}}),error=>error.status===422&&/polygon/i.test(error.message));
});

test('Standalone adapter rejects cancellation before and after the asynchronous calculation boundary',async()=>{
  const before=new AbortController();before.abort();await assert.rejects(submit({},'',{signal:before.signal}),error=>error.name==='AbortError');
  const during=new AbortController(),pending=submit({oil:{areaM2:1000,thicknessLowUm:10}},'',{signal:during.signal});during.abort();await assert.rejects(pending,error=>error.name==='AbortError');
});
