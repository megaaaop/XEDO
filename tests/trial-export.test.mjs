import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrialFlight} from '../src/trial-flight.js';
import {checkTrialExport,buildQGCPlan} from '../src/trial-export.js';

const NOW=Date.parse('2099-01-01T00:00:00Z');
const target={type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.6],[101.202,12.602],[101.2,12.602],[101.2,12.6]]]};
const home=[101.2,12.6];
const profile={sensorWidthMm:6.4,sensorHeightMm:4.8,focalLengthMm:4,imageWidthPx:4000,imageHeightPx:3000,sideOverlap:.7,frontOverlap:.8,altitudeM:50,speedMps:5,minTriggerIntervalS:1,windEastMps:0,windNorthMps:0,windLimitMps:6,maxAirspeedMps:12,usableWh:120,reserveWh:20,powerW:180,takeoffS:15,landingS:15,turnS:1,home};
const settings={home,homeAmslM:12,firmware:'PX4',qgcVersion:'5.1.0',relativeHeightM:50,ceilingM:120,limitReference:'relative_home',flatSurfaceConfirmed:true,homeConfirmed:true,airspaceReviewed:true,source:'Test-only manually reviewed constraint fixture; not live authority data.',plannedTakeoffAt:'2099-01-01T00:10:00Z',validUntil:'2099-01-02T00:00:00Z',noGo:{type:'FeatureCollection',features:[]},corridorM:5};
function fixture(){return {flight:buildTrialFlight(target,structuredClone(profile)),settings:structuredClone(settings)};}
const check=(flight,input)=>checkTrialExport(flight,input,NOW);
const rectangle=(west,south,east,north)=>({type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]});
function controlledRoute(points){const {flight,settings}=fixture();flight.battery.sorties=[{...flight.battery.sorties[0],waypoints:points.map((position,index)=>({position,altitudeM:50,altitudeReference:'AGL',purpose:index===0?'transit':index===points.length-1?'return':'survey',dispenser:'off'}))}];return {flight,settings};}

test('Trial export gates use real camera/wind/battery results and retain manual assumptions',()=>{
  const {flight,settings}=fixture(),before=structuredClone({flight,settings}),report=check(flight,settings);
  assert.equal(flight.camera.state,'pass');assert.equal(flight.wind.state,'pass');assert.equal(flight.battery.state,'pass');
  assert.equal(report.state,'pass');assert.equal(report.pass,true);assert.equal(report.canExport,true);assert.equal(report.hardwareControl,false);assert.equal(report.releaseControl,false);assert.equal(report.notFlightApproval,true);assert.equal(report.selfAttested,true);
  assert.deepEqual(report.missing,[]);assert.deepEqual(report.errors,[]);assert.match(report.warnings.join(' '),/user-attested/);assert.match(report.warnings.join(' '),/not.*flight approval/i);assert.match(report.warnings.join(' '),/does not configure an onboard geofence/);
  assert.deepEqual({flight,settings},before);
});

test('Missing review, position, time and altitude data never pass or become zero',()=>{
  const {flight,settings}=fixture();
  for(const key of ['home','homeAmslM','firmware','qgcVersion','relativeHeightM','ceilingM','limitReference','source','plannedTakeoffAt','validUntil','noGo','corridorM']){
    const input=structuredClone(settings);delete input[key];const report=check(flight,input);assert.equal(report.pass,false,key);assert.ok(report.missing.length>0,key);
  }
  for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed']){const report=check(flight,{...settings,[key]:false});assert.equal(report.state,'incomplete',key);}
  const empty=checkTrialExport(null,{},NOW);assert.equal(empty.state,'incomplete');assert.equal(empty.homeAmslM,null);assert.equal(empty.relativeHeightM,null);assert.equal(empty.validUntil,null);
  assert.equal(checkTrialExport(null,null,NOW).state,'incomplete');assert.equal(checkTrialExport(flight,null,NOW).pass,false);
});

test('Incomplete or failed physical assumptions block file creation without substituting successful geometry',()=>{
  for(const [key,value]of [['minTriggerIntervalS',null],['windEastMps',null],['powerW',null],['home',null]]){
    const flight=buildTrialFlight(target,{...profile,[key]:value});const report=check(flight,settings);assert.equal(report.pass,false,key);assert.ok(report.missing.length>0,key);
  }
  const unsafeWind=buildTrialFlight(target,{...profile,windEastMps:10,windLimitMps:6});assert.equal(check(unsafeWind,settings).state,'blocked');
  const exhausted=buildTrialFlight(target,{...profile,usableWh:20,reserveWh:20});assert.equal(check(exhausted,settings).state,'blocked');
  assert.throws(()=>buildQGCPlan(exhausted,settings),error=>error.code==='TRIAL_EXPORT_BLOCKED'&&error.report.pass===false);
});

test('Unknown datum/reference, inconsistent height, different home and non-survey controls are rejected',()=>{
  const {flight,settings}=fixture();
  assert.equal(check(flight,{...settings,limitReference:'MSL'}).state,'blocked');
  assert.equal(check(flight,{...settings,relativeHeightM:51}).state,'blocked');
  assert.equal(check(flight,{...settings,ceilingM:49}).state,'blocked');
  assert.equal(check(flight,{...settings,home:[101.201,12.601]}).state,'blocked');
  for(const [key,value]of [['altitudeReference','MSL'],['altitudeM',NaN],['dispenser','on'],['purpose','release']]){const changed=structuredClone(flight);changed.battery.sorties[0].waypoints[1][key]=value;assert.equal(check(changed,settings).state,'blocked',key);}
  const assumed=structuredClone(flight);assumed.home.assumed=true;assert.equal(check(assumed,settings).state,'blocked');
  const invalidSpeed=structuredClone(flight);invalidSpeed.settings.speedMps=0;assert.equal(check(invalidSpeed,settings).state,'blocked');assert.throws(()=>buildQGCPlan(invalidSpeed,settings),error=>error.code==='TRIAL_EXPORT_BLOCKED'&&error.report.canExport===false);
});

test('Manual review validity covers takeoff, every sortie, and explicit ground-delay end time',()=>{
  const {flight,settings}=fixture(),durationS=flight.battery.sorties.reduce((sum,sortie)=>sum+sortie.durationS,0),start=Date.parse(settings.plannedTakeoffAt);
  assert.equal(check(flight,{...settings,plannedTakeoffAt:'2098-12-31T23:00:00Z'}).state,'blocked');
  assert.equal(check(flight,{...settings,validUntil:'2098-12-31T23:00:00Z'}).state,'blocked');
  assert.equal(check(flight,{...settings,validUntil:new Date(start+(durationS-1)*1000).toISOString()}).state,'blocked');
  assert.equal(check(flight,{...settings,validUntil:new Date(start+(durationS+1)*1000).toISOString()}).pass,true);
  assert.equal(check(flight,{...settings,plannedEndAt:'2099-01-03T00:00:00Z'}).state,'blocked');
  assert.equal(check(flight,{...settings,plannedEndAt:'2098-12-31T00:00:00Z'}).state,'blocked');
  for(const key of ['plannedTakeoffAt','validUntil','plannedEndAt'])assert.equal(check(flight,{...settings,[key]:'2099-01-01T12:00:00'}).state,'blocked',key);
});

test('No-go checking examines full outbound/return segments, including crossing between endpoints',()=>{
  const outbound=controlledRoute([home,[101.202,12.6],home]);
  outbound.settings.noGo=[rectangle(101.2009,12.5999,101.2011,12.6001)];
  const a=check(outbound.flight,outbound.settings);assert.equal(a.state,'blocked');assert.match(a.errors.join(' '),/segment 1 intersects or touches/);
  const returning=controlledRoute([home,[101.202,12.6],[101.202,12.602],home]);
  returning.settings.noGo={type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:rectangle(101.2009,12.6009,101.2011,12.6011)}]};
  const b=check(returning.flight,returning.settings);assert.equal(b.state,'blocked');assert.match(b.errors.join(' '),/segment 3 intersects or touches/);
});

test('No-go corridor blocks nearby polygon and boundary touch even when all waypoint positions are outside',()=>{
  const {flight,settings}=controlledRoute([home,[101.202,12.6],home]);
  const nearby=[rectangle(101.2008,12.60005,101.2012,12.6001)];
  assert.equal(check(flight,{...settings,noGo:nearby,corridorM:0}).pass,true);
  assert.equal(check(flight,{...settings,noGo:nearby,corridorM:10}).state,'blocked');
  assert.equal(check(flight,{...settings,noGo:[rectangle(101.2008,12.6,101.2012,12.6001)],corridorM:0}).state,'blocked');
});

test('Unsupported/malformed no-go geometry is rejected rather than ignored; explicit reviewed empty data works',()=>{
  const {flight,settings}=fixture(),outer=rectangle(101.21,12.61,101.22,12.62);
  for(const noGo of [null,{type:'FeatureCollection',features:[{type:'Feature',geometry:null}]},[{type:'MultiPolygon',coordinates:[outer.coordinates]}],[{...outer,coordinates:[outer.coordinates[0],outer.coordinates[0]]}],{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:[[101,12],[101.1,12]]}}]}])assert.equal(check(flight,{...settings,noGo}).pass,false);
  assert.equal(check(flight,{...settings,noGo:[]}).pass,true);
  assert.equal(check(flight,{...settings,noGo:Array.from({length:33},()=>outer)}).state,'blocked');
  assert.equal(check(flight,{...settings,corridorM:-1}).state,'blocked');
});

test('QGC .plan preserves latitude/longitude, relative-home references, return path and explicit landing',()=>{
  const {flight,settings}=fixture(),file=buildQGCPlan(flight,settings),qgc=JSON.parse(file.text),items=qgc.mission.items;
  assert.match(file.filename,/\.plan$/);assert.equal(file.mime,'application/json');assert.equal(qgc.fileType,'Plan');assert.equal(qgc.version,1);assert.equal(qgc.mission.version,2);assert.equal(qgc.mission.vehicleType,2);assert.equal(qgc.mission.firmwareType,12);assert.equal(qgc.mission.globalPlanAltitudeMode,1);
  assert.deepEqual(qgc.mission.plannedHomePosition,[12.6,101.2,12]);assert.deepEqual(qgc.geoFence,{circles:[],polygons:[],version:2});assert.deepEqual(qgc.rallyPoints,{points:[],version:2});
  assert.equal(items[0].command,22);assert.equal(items[1].command,178);assert.equal(items[1].frame,2);assert.deepEqual(items[1].params,[1,5,-1,0,0,0,0]);assert.equal(items.at(-1).command,21);assert.deepEqual(items.at(-1).params.slice(4),[12.6,101.2,0]);
  assert.deepEqual(items.map(item=>item.doJumpId),items.map((_,index)=>index+1));
  const navigation=items.filter(item=>item.command!==178);assert.ok(navigation.every(item=>item.frame===3&&item.AltitudeMode===1));assert.ok(navigation.slice(0,-1).every(item=>item.Altitude===50&&item.params[6]===50));
  assert.deepEqual(items.slice(2,-1).map(item=>[item.params[5],item.params[4]]),flight.battery.sorties[0].waypoints.slice(1).map(point=>point.position));
  assert.ok(items.every(item=>[22,178,16,21].includes(item.command)));assert.ok(!items.some(item=>[20,183,211,400].includes(item.command)),'No shortcut RTL, servo, gripper or arm command');assert.equal(file.report.hardwareControl,false);assert.match(file.report.warnings.join(' '),/Camera capture\/trigger integration is not included/);
  assert.equal(buildQGCPlan(flight,settings).text,file.text,'Native plan JSON is deterministic; report times stay outside it.');
});

test('ArduPilot target, selected sortie and unsupported target/index validation remain explicit',()=>{
  const {flight,settings}=fixture();assert.equal(JSON.parse(buildQGCPlan(flight,{...settings,firmware:'ArduPilot'}).text).mission.firmwareType,3);
  for(const firmware of ['DJI','unknown'])assert.equal(check(flight,{...settings,firmware}).state,'blocked');
  assert.equal(check(flight,{...settings,qgcVersion:'4.4.0'}).state,'blocked');
  for(const index of [-1,.5,1,'0'])assert.throws(()=>buildQGCPlan(flight,settings,index),error=>error.code==='INVALID_SORTIE_INDEX');
  const duplicate=structuredClone(flight);duplicate.battery.sorties.push({...structuredClone(duplicate.battery.sorties[0]),index:2});const second=buildQGCPlan(duplicate,settings,1);assert.equal(second.filename,'XEDO-trial-sortie-02.plan');assert.equal(second.report.sortieIndex,1);
});
