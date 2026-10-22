import test from 'node:test';
import assert from 'node:assert/strict';
import proj4 from 'proj4';
import {buildTrialFlight} from '../src/trial-flight.js';

const polygon=ring=>({type:'Polygon',coordinates:[ring]});
const small=()=>polygon([[101.2,12.6],[101.201,12.6],[101.201,12.6001],[101.2,12.6001],[101.2,12.6]]);
const rectangle=()=>polygon([[101.2,12.6],[101.203,12.6],[101.203,12.601],[101.2,12.601],[101.2,12.6]]);
const notch=()=>polygon([[101.2,12.6],[101.202,12.6],[101.202,12.6015],[101.2013,12.6015],[101.2013,12.6005],[101.2007,12.6005],[101.2007,12.6015],[101.2,12.6015],[101.2,12.6]]);
const optics={sensorWidthMm:6.4,sensorHeightMm:4.8,focalLengthMm:4,imageWidthPx:4000,imageHeightPx:3000,minTriggerIntervalS:2};
const profile={...optics,home:[101.2,12.6],windEastMps:0,windNorthMps:0,windLimitMps:8,maxAirspeedMps:15,usableWh:100,reserveWh:20,powerW:360,takeoffS:10,landingS:10,turnS:2};
const near=(actual,expected,tolerance=1e-9)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);

function inside(point,ring){
  let crossings=0;
  for(let i=0;i<ring.length-1;i++){
    const a=ring[i],b=ring[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),projected=((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length);
    if(projected>=-1e-8&&projected<=1+1e-8&&Math.abs(dx*(point[1]-a[1])-dy*(point[0]-a[0]))/length<1e-4)return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<a[0]+(point[1]-a[1])*dx/dy)crossings++;
  }
  return crossings%2===1;
}

test('Trial camera reproduces hand-calculated fixture and explicitly rejects impossible trigger/spacing',()=>{
  const geometry=small(),input=structuredClone(profile),before=structuredClone(geometry),flight=buildTrialFlight(geometry,input);
  assert.equal(flight.state,'generated');assert.equal(flight.camera.state,'pass');assert.equal(flight.wind.state,'pass');assert.equal(flight.battery.state,'pass');
  near(flight.camera.footprintAcrossM,80);near(flight.camera.footprintAlongM,60);near(flight.camera.gsdXM,0.02);near(flight.camera.gsdYM,0.02);near(flight.camera.lineSpacingM,24);near(flight.camera.photoSpacingM,12);near(flight.camera.triggerIntervalS,2.4);
  assert.deepEqual(input,profile);assert.deepEqual(geometry,before);assert.deepEqual(flight.plan.target,before);assert.deepEqual(flight,buildTrialFlight(geometry,input));
  const slowCamera=buildTrialFlight(geometry,{...profile,minTriggerIntervalS:3});assert.equal(slowCamera.state,'blocked');assert.equal(slowCamera.code,'CAMERA_INTERVAL_INFEASIBLE');
  const slowerFlight=buildTrialFlight(geometry,{...profile,minTriggerIntervalS:3,speedMps:4});assert.equal(slowerFlight.camera.state,'pass');near(slowerFlight.camera.triggerIntervalS,3);
  const narrow=buildTrialFlight(geometry,{...profile,sideOverlap:0.95});assert.equal(narrow.state,'blocked');assert.equal(narrow.code,'CAMERA_SPACING_UNSUPPORTED');near(narrow.camera.lineSpacingM,4);assert.equal(narrow.plan,null);
});

test('Missing inputs remain incomplete and explicit zero values are distinguished from missing',()=>{
  const noOptics=buildTrialFlight(small());assert.equal(noOptics.state,'incomplete');assert.equal(noOptics.plan,null);assert.equal(noOptics.camera.gsdXM,null);
  const flight=buildTrialFlight(small(),{...optics,windEastMps:'',windNorthMps:null,usableWh:''});
  assert.equal(flight.state,'generated');assert.equal(flight.wind.state,'incomplete');assert.equal(flight.battery.state,'incomplete');assert.deepEqual(flight.battery.sorties,[]);assert.equal(flight.wind.speedMps,null);assert(flight.home.assumed);assert(flight.missing.includes('home'));assert(flight.missing.includes('windEastMps'));assert(flight.missing.includes('usableWh'));
  assert.match(flight.warnings.join(' '),/calm wind was not assumed/);
  const noAirspeed=buildTrialFlight(small(),{...profile,maxAirspeedMps:null});assert.equal(noAirspeed.wind.state,'incomplete');assert.equal(noAirspeed.battery.state,'incomplete');
  const noInterval=buildTrialFlight(small(),{...profile,minTriggerIntervalS:null});assert.equal(noInterval.state,'generated');assert.equal(noInterval.camera.state,'incomplete');assert(noInterval.missing.includes('minTriggerIntervalS'));
  const noAltitude=buildTrialFlight(small(),{...profile,altitudeM:null});assert.equal(noAltitude.state,'incomplete');assert.equal(noAltitude.camera.footprintAcrossM,null);
  const zeros=buildTrialFlight(small(),{...profile,reserveWh:0,takeoffS:0,landingS:0,turnS:0,windLimitMps:0});assert.equal(zeros.battery.state,'pass');assert.equal(zeros.wind.state,'pass');assert.equal(zeros.wind.speedMps,0);
  for(const [name,value] of [['sensorWidthMm',NaN],['focalLengthMm',0],['sideOverlap',1],['frontOverlap',-0.1],['imageWidthPx',20.5],['powerW',Infinity],['takeoffS',-1],['speedMps','5'],['maxAirspeedMps',0]])assert.throws(()=>buildTrialFlight(small(),{...profile,[name]:value}),new RegExp(name));
  assert.throws(()=>buildTrialFlight(small(),{...profile,home:[12,200]}),/home/);
});

test('Battery boundary retains final reserve and charges actual outbound, return and phase time once',()=>{
  const baseline=buildTrialFlight(small(),profile),trip=baseline.battery.sorties[0];assert.equal(baseline.battery.sorties.length,1);
  const powerW=80*3600/trip.durationS,atBoundary=buildTrialFlight(small(),{...profile,powerW});
  assert.equal(atBoundary.battery.state,'pass');near(atBoundary.battery.budgetWh,80);near(atBoundary.battery.sorties[0].energyWh,80);
  const tooLittle=buildTrialFlight(small(),{...profile,powerW,usableWh:99.99});assert.equal(tooLittle.state,'blocked');assert.equal(tooLittle.battery.state,'blocked');assert.equal(tooLittle.code,'SORTIE_INFEASIBLE');assert.deepEqual(tooLittle.battery.sorties,[]);
  const noBudget=buildTrialFlight(small(),{...profile,usableWh:20,reserveWh:20});assert.equal(noBudget.code,'BATTERY_RESERVE_INFEASIBLE');
  const surveyDistance=baseline.plan.segments.filter(s=>s.purpose==='survey').reduce((sum,s)=>sum+s.distanceM,0);assert(trip.distanceM>surveyDistance*1.8,'Returning home must contribute to the budget.');
  near(trip.durationS,trip.distanceM/5+10+10+trip.phases.turnCount*2);near(trip.energyWh,trip.durationS/10);
  assert.deepEqual(trip.waypoints[0].position,profile.home);assert.deepEqual(trip.waypoints.at(-1).position,profile.home);assert.equal(trip.waypoints.at(-1).purpose,'return');
  assert(trip.waypoints.every(p=>p.altitudeReference==='AGL'&&p.altitudeM===50&&p.dispenser==='off'));assert.equal(atBoundary.hardwareControl,false);assert.equal(atBoundary.releaseControl,false);
});

test('Wind checks air-relative speed on both directions and manual-home return rather than assuming calm',()=>{
  const flight=buildTrialFlight(small(),{...profile,windEastMps:4,windLimitMps:5,maxAirspeedMps:10});assert.equal(flight.wind.state,'pass');assert(flight.wind.requiredMaxAirspeedMps>8.9);
  let expected=4;
  for(const sortie of flight.battery.sorties)for(let i=1;i<sortie.waypoints.length;i++){
    const a=sortie.waypoints[i-1].position,b=sortie.waypoints[i].position,east=(b[0]-a[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),north=b[1]-a[1],d=Math.hypot(east,north);expected=Math.max(expected,Math.hypot(5*east/d-4,5*north/d));
  }
  near(flight.wind.requiredMaxAirspeedMps,expected,1e-4);
  const insufficient=buildTrialFlight(small(),{...profile,windEastMps:4,maxAirspeedMps:8});assert.equal(insufficient.state,'blocked');assert.equal(insufficient.wind.state,'blocked');assert.equal(insufficient.battery.state,'blocked');
  const environmental=buildTrialFlight(small(),{...profile,windEastMps:4,windLimitMps:3});assert.equal(environmental.code,'WIND_INFEASIBLE');
  const externalHome=[101.199,12.599],outside=buildTrialFlight(small(),{...profile,home:externalHome});assert.equal(outside.battery.state,'pass');assert.equal(outside.home.assumed,false);assert(outside.battery.totalDistanceM>flight.battery.totalDistanceM);assert.deepEqual(outside.battery.sorties[0].waypoints.at(-1).position,externalHome);assert.match(outside.warnings.join(' '),/outside the selected survey area/);
  const northern=polygon([[5.5,75],[5.503,75],[5.503,75.0006],[5.5,75.0006],[5.5,75]]),gridConvergence=buildTrialFlight(northern,{...profile,home:[5.5,75],windEastMps:4,maxAirspeedMps:8.999});assert.equal(gridConvergence.wind.state,'blocked','True east wind must not be silently aligned with UTM grid east.');
  const remoteHome=buildTrialFlight(small(),{...profile,home:[-80,12.6]});assert.equal(remoteHome.state,'blocked');assert.equal(remoteHome.code,'HOME_TOO_DISTANT');
});

test('Sorties partition at complete survey segments, repeat home transits, and preserve concave connectors',()=>{
  const split=buildTrialFlight(rectangle(),{...profile,usableWh:40,reserveWh:20});assert.equal(split.battery.state,'pass',split.message);assert(split.battery.sorties.length>1);assert(split.battery.sorties.every(s=>s.energyWh<=20+1e-9));
  const planned=split.plan.segments.filter(s=>s.purpose==='survey').map(s=>[split.plan.waypoints[s.from].position,split.plan.waypoints[s.to].position]);
  const actual=[];for(const sortie of split.battery.sorties){assert.deepEqual(sortie.waypoints[0].position,profile.home);assert.deepEqual(sortie.waypoints.at(-1).position,profile.home);for(let i=1;i<sortie.waypoints.length;i++)if(sortie.waypoints[i].purpose==='survey')actual.push([sortie.waypoints[i-1].position,sortie.waypoints[i].position]);}
  assert.deepEqual(actual,planned);assert(split.battery.totalDistanceM>split.plan.estimates.distanceM);
  const geometry=notch(),concave=buildTrialFlight(geometry,{...profile,home:[101.2004,12.6002],usableWh:1000});assert.equal(concave.battery.state,'pass',concave.message);
  const projection=proj4('EPSG:4326',concave.plan.projection.definition),origin=concave.plan.projection.origin,local=p=>{const xy=projection.forward(p);return [xy[0]-origin[0],xy[1]-origin[1]];};
  for(const sortie of concave.battery.sorties)for(let i=1;i<sortie.waypoints.length;i++){
    const a=local(sortie.waypoints[i-1].position),b=local(sortie.waypoints[i].position);
    for(let step=0;step<=80;step++){const t=step/80;assert(inside([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],concave.plan.localTarget.coordinates[0]),'A concave connector crosses the exterior notch.');}
  }
  const capped=buildTrialFlight(polygon([[101,12],[101.1,12],[101.1,12.1],[101,12.1],[101,12]]),profile);assert.equal(capped.state,'blocked');assert.equal(capped.plan.status,'blocked');assert.equal(capped.code,'TOO_MANY_TRACKS');assert.deepEqual(capped.battery.sorties,[]);
});
