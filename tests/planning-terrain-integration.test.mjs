import test from 'node:test';
import assert from 'node:assert/strict';
import {createEstimatedDemoInputs} from '../src/planning-estimated-demo.js';
import {planningRouteSamples} from '../src/planning-route-samples.js';
import {missionContextSamplePoints} from '../src/gee-mission-context.js';
import {assessPlanningTerrain} from '../src/planning-terrain.js';
import {calculatePlanningTrial} from '../src/trial-api.js';
import {fileTrialAPI} from '../src/planning-file-api.js';
import {pointWithin} from '../src/domain.js';

const samePoint=(a,b)=>a.every((value,index)=>Math.abs(value-b[index])<1e-9);
const clone=value=>structuredClone(value);
const calculate=input=>calculatePlanningTrial(null,input);
const file=(input,path='/export')=>fileTrialAPI(path,{method:'POST',body:JSON.stringify(input)});

async function fixture(){
  const now=Date.now(),iso=minutes=>new Date(now+minutes*60000).toISOString();
  const input=createEstimatedDemoInputs(now);
  input.flight.home=[101.219,12.619];
  input.driftEnabled=true;
  Object.assign(input.drift,{
    observedAt:iso(0),arriveAt:iso(60),endAt:iso(180),
    currentEastMps:.005,currentNorthMps:0,windSpeedMps:0,windFromDeg:0
  });
  Object.assign(input.export,{
    plannedTakeoffAt:iso(60),plannedEndAt:iso(120),validUntil:iso(240),
    homeConfirmed:true,flatSurfaceConfirmed:true,airspaceReviewed:true,
    terrainMode:'automatic',terrainToleranceM:2
  });
  const initial=await calculate(input),routePoints=planningRouteSamples(initial.flight);
  assert.equal(initial.flight.plan?.status,'generated');
  assert.ok(routePoints.length>1&&routePoints.length<=24);
  assert.ok(routePoints.some(point=>!pointWithin(point,input.geometry)&&!samePoint(point,input.flight.home)),
    'The real generated route must contain a non-Home sample outside the observed inspection boundary.');
  const request={geometry:clone(input.geometry),home:clone(input.flight.home),sceneId:null,startAt:null,endAt:null,routePoints};
  const samples=missionContextSamplePoints(request).map((sample,index)=>({
    longitude:sample.coordinates[0],latitude:sample.coordinates[1],elevationM:8+index*.01,
    role:sample.home?'home':sample.route?'route':'area'
  }));
  const report={
    schema_version:'xedo-gee-mission-context/1',state:'complete',request,
    fetchedAt:iso(0),expiresAt:new Date(now+600000).toISOString(),
    terrain:{state:'ready',datasetId:'COPERNICUS/DEM/GLO30_2024_1',verticalDatum:'EGM2008',resolutionM:30,
      homeElevationM:8,samples},
    landcover:{state:'ready',year:2021,resolutionM:10,waterPct:100,mangrovePct:0,coveragePct:100},
    quality:{state:'not_requested'},forecast:{state:'not_requested'}
  };
  bindModel(input,report,now);
  return {input,report,initial,now};
}

function bindModel(input,report,now){
  input.export.terrainAssessment=assessPlanningTerrain(report,{geometry:input.geometry,home:input.flight.home,now});
  input.export.flatSurfaceConfirmed=input.export.terrainAssessment.state==='ready';
  input.export.homeAmslM=report.terrain.homeElevationM;
  input.export.homeElevationEvidence={
    mode:'gee_model',reviewed:false,home:clone(input.flight.home),valueM:report.terrain.homeElevationM,
    datasetId:report.terrain.datasetId,verticalDatum:report.terrain.verticalDatum,resolutionM:30,
    acceptedAt:new Date(now).toISOString(),fetchedAt:report.fetchedAt,expiresAt:report.expiresAt
  };
  input.flight.geospatialEvidence={
    mode:'gee_context',fetchedAt:report.fetchedAt,expiresAt:report.expiresAt,
    geometry:clone(report.request.geometry),home:clone(report.request.home),routePoints:clone(report.request.routePoints),
    terrain:{state:'ready',datasetId:report.terrain.datasetId,verticalDatum:report.terrain.verticalDatum},
    landcover:clone(report.landcover),quality:clone(report.quality),forecast:clone(report.forecast)
  };
}

function assertIndependentEngines(result){
  assert.equal(result.drift.state,'assumption_based');
  assert.deepEqual(result.target,result.drift.geometry);
  assert.equal(result.flight.plan.status,'generated');
  assert.equal(result.flight.camera.state,'pass');
  assert.equal(result.flight.wind.state,'pass');
  assert.equal(result.flight.battery.state,'pass');
  assert.equal(result.oil.state,'assumption_based');
  assert.equal(result.oil.volumeLowL,10);
  assert.equal(result.oil.volumeHighL,30);
  assert.ok(Math.abs(result.oil.capsulesLowKg-3.7719298245614032)<1e-9);
  assert.equal(result.hardwareControl,false);
  assert.equal(result.releaseControl,false);
}

test('Estimated-demo coordinator composes all four engines with real route samples and downloads a matching model-based QGC file',async()=>{
  const {input,report}=await fixture(),before=clone(input),result=await calculate(input);
  assert.deepEqual(input,before);
  assertIndependentEngines(result);
  assert.equal(input.export.terrainAssessment.state,'ready');
  assert.equal(input.export.terrainAssessment.coverage.fraction,1);
  assert.deepEqual(planningRouteSamples(result.flight),report.request.routePoints);
  assert.equal(input.export.homeElevationEvidence.reviewed,false);
  assert.equal(result.exportCheck.pass,true);
  assert.equal(result.exportCheck.canExport,true);
  assert.equal(result.exportCheck.notFlightApproval,true);
  const local=await file(input,''),download=await file(input),native=JSON.parse(download.text);
  assert.equal(local.inputHash,result.inputHash);
  assert.equal(download.inputHash,result.inputHash);
  assert.match(download.filename,/\.plan$/);
  assert.equal(native.fileType,'Plan');
  assert.deepEqual(native.mission.plannedHomePosition,[input.flight.home[1],input.flight.home[0],8]);
  assert.ok(native.mission.items.length>2);
  assert.equal(download.report.notFlightApproval,true);
  assert.equal(download.hardwareControl,false);
  assert.equal(download.releaseControl,false);
});

test('A missing outside-route terrain sample blocks model download while drift, flight and oil results remain available',async()=>{
  const {input,report,now}=await fixture();
  const outside=report.request.routePoints.find(point=>!pointWithin(point,input.geometry)&&!samePoint(point,input.flight.home));
  report.terrain.samples=report.terrain.samples.filter(sample=>!samePoint([sample.longitude,sample.latitude],outside));
  bindModel(input,report,now);
  assert.equal(input.export.terrainAssessment.state,'unknown');
  assert.match(input.export.terrainAssessment.reasons[0],/route.*incomplete/);
  input.export.flatSurfaceConfirmed=true; // An obsolete checkbox cannot substitute for model evidence.
  const result=await calculate(input);
  assertIndependentEngines(result);
  assert.equal(result.exportCheck.pass,false);
  assert.ok(result.exportCheck.checks.some(check=>check.id==='terrain-model-evidence'));
  await assert.rejects(file(input),error=>error.code==='TRIAL_CHECKS_INCOMPLETE');
});

test('A stale ready model or a different Home estimate cannot reuse a previously valid download decision',async()=>{
  for(const kind of ['stale','wrong-home','missing-home']){
    const {input,now}=await fixture();
    if(kind==='stale'){
      for(const evidence of [input.export.terrainAssessment,input.flight.geospatialEvidence,input.export.homeElevationEvidence]){
        evidence.fetchedAt=new Date(now-600001).toISOString();evidence.expiresAt=new Date(now-1).toISOString();
      }
    }else if(kind==='wrong-home')input.export.homeElevationEvidence.home=[101.218,12.618];
    else input.export.homeElevationEvidence=null;
    assert.equal(input.export.terrainAssessment.state,'ready');
    const result=await calculate(input);
    assertIndependentEngines(result);
    assert.equal(result.exportCheck.pass,false);
    assert.ok(result.exportCheck.checks.some(check=>check.id==='terrain-model-evidence'));
    await assert.rejects(file(input),error=>error.code==='TRIAL_CHECKS_INCOMPLETE');
  }
});

test('Saved-survey model evidence is checked against the frozen original boundary using reads only',async()=>{
  const {input}=await fixture(),original=clone(input.geometry),surveyId='SUR_terrain_saved01',incidentId='INC_terrain_saved01';
  const rows=new Map([
    [surveyId,{incidentId,boundarySnapshot:{type:'FeatureCollection',features:[{
      type:'Feature',geometry:original,properties:{observation_id:'OBS_terrain_saved01',incident_id:incidentId,
        scene_id:'terrain-test-scene',acquired_at:'2026-10-24T03:54:00.000Z'}
    }]}}],
    [incidentId,{}]
  ]),reads=[];
  const db={async first(query,id){
    assert.match(query,/^SELECT \* FROM records WHERE id = \?$/);reads.push(id);
    if(!rows.has(id))return null;
    return {id,kind:id===surveyId?'survey':'incident',data:JSON.stringify(rows.get(id)),revision:1,
      created_at:'2026-10-24T00:00:00.000Z',updated_at:'2026-10-24T00:00:00.000Z'};
  },async run(){assert.fail('Terrain integration must never mutate saved records.');}};
  delete input.geometry;input.surveyId=surveyId;
  const valid=await calculatePlanningTrial(db,input);
  assertIndependentEngines(valid);
  assert.equal(valid.source.kind,'frozen_survey_snapshot');
  assert.deepEqual(valid.source.geometry,original);
  assert.equal(valid.exportCheck.pass,true);
  const altered=clone(original);altered.coordinates[0].forEach(point=>{point[0]+=.01;});
  input.export.terrainAssessment.geometry=altered;
  input.flight.geospatialEvidence.geometry=clone(altered);
  const mismatch=await calculatePlanningTrial(db,input);
  assertIndependentEngines(mismatch);
  assert.deepEqual(mismatch.source.geometry,original);
  assert.equal(mismatch.exportCheck.pass,false);
  assert.ok(mismatch.exportCheck.checks.some(check=>check.id==='terrain-model-evidence'&&/area, route or Home/.test(check.message)));
  assert.deepEqual(reads,[surveyId,incidentId,surveyId,incidentId]);
  assert.deepEqual(rows.get(surveyId).boundarySnapshot.features[0].geometry,original);
});
