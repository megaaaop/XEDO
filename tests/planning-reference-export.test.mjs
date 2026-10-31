import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanningFlightProfile,PLANNING_FLIGHT_PROFILE} from '../src/planning-flight-profile.js';
import {createEstimatedDemoInputs} from '../src/planning-estimated-demo.js';
import {calculatePlanningTrial,planningTrialAPI} from '../src/trial-api.js';
import {fileTrialAPI} from '../src/planning-file-api.js';
import {checkPlanningExport,buildPlanningQGCPlan} from '../src/planning-export-readiness.js';
import {buildQGCPlan} from '../src/trial-export.js';
import {planningRouteSamples} from '../src/planning-route-samples.js';
import {missionContextSamplePoints} from '../src/gee-mission-context.js';
import {assessPlanningTerrain} from '../src/planning-terrain.js';
import {buildTrialFlight} from '../src/trial-flight.js';

const clone=value=>structuredClone(value);
test('P01 profile owns only the eight assumptions and retains geometry, Home and actual wind',()=>{
 const profile=createPlanningFlightProfile(),input={home:[101.2,12.6],windEastMps:2};
 const before=clone(input),patch=profile.reconcile(input);
 assert.deepEqual(input,before);assert.deepEqual(patch,PLANNING_FLIGHT_PROFILE.values);assert.equal(Object.keys(patch).length,8);
 Object.assign(input,patch);assert.deepEqual(profile.reconcile(input),{});assert.deepEqual(input.home,before.home);assert.equal(input.windEastMps,2);
});
test('P02–P04 manual values, valid zero, invalid zero and a deliberate blank remain manual',()=>{
 const p=createPlanningFlightProfile(),input=p.reconcile({});
 for(const [key,value] of [['turnS',0],['landingS',0],['powerW',0],['usableWh',null],['maxAirspeedMps',15]]){p.edited(key);input[key]=value;}
 assert.deepEqual(p.reconcile(input),{});
 const saved=p.metadata(input),restored=createPlanningFlightProfile();restored.restore({...input,planningProfile:saved});
 assert.deepEqual(restored.reconcile(input),{});for(const key of ['turnS','landingS','powerW','usableWh','maxAirspeedMps'])assert.equal(saved.fields[key].mode,'manual');
 const initial=createEstimatedDemoInputs();Object.assign(initial.flight,input);
 assert.throws(()=>buildTrialFlight(initial.geometry,initial.flight),/powerW/);
});
test('P17 profile metadata round-trips; old snapshots fill only missing values and explicit reset touches no Home or wind',()=>{
 const p=createPlanningFlightProfile(),input={usableWh:200,reserveWh:0,powerW:500,home:[101.2,12.6],windEastMps:3};p.restore(input);
 Object.assign(input,p.reconcile(input));assert.equal(input.usableWh,200);assert.equal(input.reserveWh,0);
 const metadata=p.metadata(input),next=createPlanningFlightProfile();next.restore({...input,planningProfile:metadata});assert.deepEqual(next.reconcile(input),{});
 next.reset(input);Object.assign(input,next.reconcile(input));assert.equal(input.usableWh,177.6);assert.deepEqual(input.home,[101.2,12.6]);assert.equal(input.windEastMps,3);
});

async function fixture(){
 const now=Date.now(),iso=minutes=>new Date(now+minutes*60000).toISOString();
 const input=createEstimatedDemoInputs(now);input.driftEnabled=false;
 Object.assign(input.export,{purpose:'planning_reference',terrainMode:'automatic',terrainToleranceM:2,firmware:'ArduPilot',homeConfirmed:true,planningReviewed:true,airspaceReviewed:false,noGo:null,plannedTakeoffAt:iso(60),plannedEndAt:iso(120),validUntil:iso(180)});
 const p=createPlanningFlightProfile();p.restore(input.flight);input.flight.planningProfile=p.metadata(input.flight);
 const flight=buildTrialFlight(input.geometry,input.flight),request={geometry:clone(input.geometry),home:clone(input.flight.home),routePoints:planningRouteSamples(flight)};
 const samples=missionContextSamplePoints(request).map((sample,index)=>({longitude:sample.coordinates[0],latitude:sample.coordinates[1],elevationM:sample.home?1.5:index%2?0:2.58}));
 const report={request,fetchedAt:iso(0),expiresAt:iso(10),terrain:{state:'ready',datasetId:'COPERNICUS/DEM/GLO30_2024_1',verticalDatum:'EGM2008',resolutionM:30,homeElevationM:1.5,samples}};
 input.export.terrainAssessment=assessPlanningTerrain(report,{geometry:input.geometry,home:input.flight.home,now});
 input.export.flatSurfaceConfirmed=false;input.export.homeAmslM=1.5;
 input.export.homeElevationEvidence={mode:'gee_model',reviewed:false,home:clone(input.flight.home),valueM:1.5,datasetId:report.terrain.datasetId,verticalDatum:'EGM2008',resolutionM:30,acceptedAt:iso(0),fetchedAt:report.fetchedAt,expiresAt:report.expiresAt};
 input.flight.geospatialEvidence={mode:'gee_context',geometry:clone(input.geometry),home:clone(input.flight.home),routePoints:clone(request.routePoints),fetchedAt:report.fetchedAt,expiresAt:report.expiresAt};
 return {input,flight,now,report};
}
const file=(input,path='/planning-export')=>fileTrialAPI(path,{method:'POST',body:JSON.stringify(input)});
test('P05/P21 a complete uneven DSM permits a reference file while strict checks and actual terrain review remain unapproved',async()=>{
 const {input,flight,now}=await fixture(),before=clone(input),result=await calculatePlanningTrial(null,input);
 assert.equal(input.export.terrainAssessment.state,'review');assert.equal(input.export.terrainAssessment.terrainRangeM,2.58);
 assert.equal(result.planningCheck.pass,true);assert.equal(result.planningCheck.airspaceStatus,'not_assessed');assert.equal(result.exportCheck.pass,false);
 assert.equal(input.export.flatSurfaceConfirmed,false);assert.equal(input.export.airspaceReviewed,false);assert.equal(input.export.noGo,null);assert.deepEqual(input,before);
 const output=buildPlanningQGCPlan(flight,input,0,now),plan=JSON.parse(output.text);
 assert.equal(output.report.purpose,'planning_reference');assert.equal(plan.fileType,'Plan');assert.equal(plan.mission.firmwareType,3);
 assert.deepEqual(plan.mission.plannedHomePosition,[input.flight.home[1],input.flight.home[0],1.5]);assert.ok(output.report.warnings.some(x=>/relative to Home/.test(x)));
 assert.throws(()=>buildQGCPlan(flight,{...input.export,home:input.flight.home}),error=>error.code==='TRIAL_EXPORT_BLOCKED');
 await assert.rejects(file(input,'/export'),error=>error.code==='TRIAL_CHECKS_INCOMPLETE');
});
test('P06 missing, partial, expired, mismatched area/Home and changed route context cannot pass as known terrain',async t=>{
 for(const [name,mutate] of [
  ['missing',i=>{delete i.export.terrainAssessment;}],
  ['partial',i=>{i.export.terrainAssessment.coverage.known--;}],
  ['expired',i=>{i.export.terrainAssessment.expiresAt=new Date(Date.now()-1).toISOString();}],
  ['area',i=>{i.export.terrainAssessment.geometry.coordinates[0][0][0]+=.01;}],
  ['Home',i=>{i.flight.home[0]+=.001;}],
  ['route',i=>{i.export.terrainAssessment.routePoints=[];i.flight.geospatialEvidence.routePoints=[];}],
  ['inconsistent',i=>{i.export.terrainAssessment.maxElevationM=1;}]
 ])await t.test(name,async()=>{const {input}=await fixture();mutate(input);await assert.rejects(file(input),error=>error.code==='PLANNING_EXPORT_BLOCKED');});
});
test('P07 manual Home mismatch, missing provenance and a known DSM collision remain blocking',async t=>{
 for(const [name,mutate] of [
  ['manual Home',i=>{i.export.homeAmslM=99;}],
  ['missing evidence',i=>{delete i.export.homeElevationEvidence;}],
  ['DSM collision',i=>{i.export.relativeHeightM=5; i.export.terrainAssessment.maxElevationM=10;i.export.terrainAssessment.terrainRangeM=10;i.export.terrainAssessment.homeOffsetM=8.5;i.flight.altitudeM=5;}]
 ])await t.test(name,async()=>{const {input}=await fixture();mutate(input);const result=await calculatePlanningTrial(null,input);assert.equal(result.planningCheck.pass,false);if(name==='DSM collision')assert.ok(result.planningCheck.checks.some(c=>c.id==='known-surface-conflict'));});
});
test('P08 no missing wind is substituted with calm wind and excessive wind remains blocked',async()=>{
 for(const patch of [{windEastMps:null},{windEastMps:20}]){const {input}=await fixture();Object.assign(input.flight,patch);const r=await calculatePlanningTrial(null,input);assert.equal(r.planningCheck.pass,false);assert.notEqual(r.flight.wind.state,'pass');}
});
test('P04/P15 invalid flight fields show the rejected value with a friendly unit in the shared blocking report',async()=>{
 const {input}=await fixture();input.flight.powerW=0;const result=await calculatePlanningTrial(null,input);
 assert.equal(result.planningCheck.pass,false);assert.ok(result.planningCheck.checks.some(c=>c.id==='flight-input-validation'&&/Assumed power \(W\).*finite number/.test(c.message)));
});
test('P09/P10 optimized partition covers every original survey segment with explicit Home return and actual energy; impossible reserve is blocked',()=>{
 const input=createEstimatedDemoInputs();input.geometry={type:'Polygon',coordinates:[[[101.22,12.62],[101.24,12.62],[101.24,12.624],[101.22,12.624],[101.22,12.62]]]};input.flight.home=[101.23,12.616];
 input.flight.planningProfile={version:1,profileId:PLANNING_FLIGHT_PROFILE.id};
 const r=buildTrialFlight(input.geometry,input.flight);assert.equal(r.battery.state,'pass');assert.ok(r.battery.sorties.length>1&&r.battery.sorties.length<=40);
 const fractions=new Map();for(const s of r.battery.sorties){assert.ok(s.energyWh<=133.2+1e-6);assert.deepEqual(s.waypoints[0].position,input.flight.home);assert.deepEqual(s.waypoints.at(-1).position,input.flight.home);assert.ok(Math.abs(s.energyWh-s.durationS*600/3600)<1e-8);for(const part of s.surveySegments){const values=fractions.get(part.originalSegment)||[];values.push([part.from,part.to]);fractions.set(part.originalSegment,values);}}
 const surveyCount=r.plan.segments.filter(s=>s.purpose==='survey').length;assert.equal(fractions.size,surveyCount);
 for(const values of fractions.values()){values.sort((a,b)=>a[0]-b[0]);assert.equal(values[0][0],0);assert.equal(values.at(-1)[1],1);for(let i=1;i<values.length;i++)assert.equal(values[i][0],values[i-1][1]);}
 const impossible=buildTrialFlight(input.geometry,{...input.flight,usableWh:44.4,reserveWh:44.4});assert.equal(impossible.state,'blocked');assert.equal(impossible.battery.sorties.length,0);
});
test('P11/P12 expired constraint, incomplete time window and more than 24 hours cannot be silently clipped',async()=>{
 for(const patch of [{validUntil:new Date(Date.now()+1000).toISOString()},{plannedEndAt:new Date(Date.now()+50*3600000).toISOString()},{plannedTakeoffAt:new Date(Date.now()-3600000).toISOString()}]){const {input}=await fixture();Object.assign(input.export,patch);const r=await calculatePlanningTrial(null,input);assert.equal(r.planningCheck.pass,false);}
});
test('P13 null no-go remains not assessed; a supplied crossing polygon blocks a reference file',async()=>{
 const {input}=await fixture();const original=clone(input.geometry);input.export.noGo={type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:original}]};
 const r=await calculatePlanningTrial(null,input);assert.equal(r.planningCheck.pass,false);assert.ok(r.planningCheck.checks.some(c=>c.id==='no-go-route'&&c.state==='blocked'));
});
test('P08/P11 current automatic wind provenance must cover the complete sortie schedule',async()=>{
 const {input,flight,now}=await fixture(),iso=n=>new Date(now+n*60000).toISOString();
 input.flight.environment={mode:'automatic',ready:true,geometry:clone(input.geometry),fetchedAt:iso(0),expiresAt:iso(10),startAt:iso(60),endAt:iso(120),sources:{flightWind:{freshness:'fresh'}}};
 assert.equal(checkPlanningExport(flight,input,now).pass,true);
 for(const change of [i=>{i.flight.environment.endAt=iso(61);},i=>{i.flight.environment.expiresAt=iso(-1);},i=>{i.flight.environment.geometry=null;}]){const copy=clone(input);change(copy);assert.equal(checkPlanningExport(flight,copy,now).pass,false);}
});
test('P19 hosted browser adapter and workspace operation independently recompute identical file/checks; forged booleans do not approve export',async()=>{
 const {input}=await fixture(),local=await file(input),url=new URL('http://localhost/api/v2/planning-trial/planning-export');
 const req=new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:url.origin},body:JSON.stringify(input)});
 const response=await planningTrialAPI(req,{},null,url),workspace=await response.json();
 assert.equal(response.status,200);assert.equal(local.text,workspace.text);assert.equal(local.inputHash,workspace.inputHash);
 const plan=JSON.parse(local.text);assert.deepEqual(Object.keys(plan).sort(),['fileType','geoFence','groundStation','mission','rallyPoints','version']);assert.equal(plan.version,1);
 assert.ok(plan.mission.items.every(item=>[16,21,22,178].includes(item.command)));assert.ok(plan.mission.items.every(item=>item.params.every(v=>v===null||Number.isFinite(v))));
 input.export.planningReviewed=false;input.export.planningReady=true;await assert.rejects(file(input),error=>error.code==='PLANNING_EXPORT_BLOCKED');
 input.export.purpose='bypass';await assert.rejects(file(input),/supported export purpose/);
});
test('P16 invalid sortie index cannot select a different file or concatenate multiple sorties',async()=>{
 const {input}=await fixture();for(const index of [-1,1.5,999]){input.sortieIndex=index;await assert.rejects(file(input),error=>/SORTIE/.test(error.code));}
});
