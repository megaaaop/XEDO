import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregatePlanningEnvironment} from '../src/planning-environment-inputs.js';
import {buildTrialFlight} from '../src/trial-flight.js';
const HOUR=3600000,NOW=Date.parse('2026-10-24T00:00:00Z'),iso=x=>new Date(x).toISOString();
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);
function fixture({start=NOW,end=NOW+2*HOUR,points=2,vectors}={}){
 const request={startAt:iso(start),endAt:iso(end),altitudeM:50,points:Array.from({length:points},(_,i)=>({id:`p${i+1}`,longitude:101.2+i*.001,latitude:12.6}))},series={};
 for(const key of ['wind10m','flightWind','currentSurface']){
  const current=key==='currentSurface',samples=[];
  for(const [index,point]of request.points.entries())for(let at=Math.floor(start/HOUR)*HOUR;at<=Math.ceil(end/HOUR)*HOUR;at+=HOUR){
   const v=vectors?.(key,index,(at-NOW)/HOUR)??{eastMps:current?.2:2,northMps:0};
   samples.push({pointId:point.id,at:iso(at),...v,speedMps:Math.hypot(v.eastMps,v.northMps),sourceHeightM:current?0:key==='wind10m'?10:50,heightMethod:current?'surface_model':key==='wind10m'?'model_10m':'linear_10m_80m_estimate',sourceHeightsM:current?[0]:key==='wind10m'?[10]:[10,80],estimated:key==='flightWind',gridLongitude:point.longitude,gridLatitude:point.latitude,gridDistanceM:0,gridAccepted:true,...(!current?{gustMps:4,gustSourceHeightM:10}:{})});
  }
  series[key]={status:'complete',source:'Fixture numerical model',model:current?'meteofrance_currents':'gfs_global',modelRunAt:iso(NOW-6*HOUR),modelAvailableAt:iso(NOW-5*HOUR),dataEndAt:iso(NOW+7*24*HOUR),freshness:{state:'fresh',checkedAt:iso(NOW),maxAgeMs:current?48*HOUR:24*HOUR,propagationGraceMs:600000},resolutionM:current?9000:13000,coverage:current?'regional_estimate':'model_grid',includesTides:current,includesStokes:current,samples};
 }
 return{schema_version:'xedo-planning-environment/1',state:'complete',fetchedAt:iso(NOW),expiresAt:iso(NOW+600000),request,series};
}
const derive=(report,options={})=>aggregatePlanningEnvironment(report,{now:NOW,...options});
const geometry={type:'Polygon',coordinates:[[[101.2,12.6],[101.201,12.6],[101.201,12.6001],[101.2,12.6001],[101.2,12.6]]]};
const profile={sensorWidthMm:6.4,sensorHeightMm:4.8,focalLengthMm:4,imageWidthPx:4000,imageHeightPx:3000,minTriggerIntervalS:2,home:[101.2,12.6],windEastMps:0,windNorthMps:0,windLimitMps:8,maxAirspeedMps:15,usableWh:100,reserveWh:20,powerW:360,takeoffS:10,landingS:10,turnS:2};

test('Complete model vectors map into calculator units without mutating inputs, times or review flags',()=>{
 const report=fixture(),before=structuredClone(report),out=derive(report);
 assert.equal(out.state,'complete');assert.deepEqual(out.ready,{drift:true,flight:true});
 near(out.patch.drift.currentEastMps,.2);near(out.patch.drift.windSpeedMps,2);near(out.patch.drift.windFromDeg,270);
 near(out.patch.flight.windEastMps,2);assert.equal(out.patch.flight.windSamples.length,6);assert.equal(out.patch.flight.windGustMps,4);
 assert(!Object.hasOwn(out.patch.drift,'observedAt'));assert(!Object.hasOwn(out.patch.flight,'home'));assert.deepEqual(report,before);
 assert.match(out.warnings.join(' '),/do not add another tide|Stokes/);assert.match(out.warnings.join(' '),/10 m and 80 m/);assert.match(out.warnings.join(' '),/does not bound intermediate/);
});

test('Time integration clips hourly brackets to the precise requested window',()=>{
 const report=fixture({start:NOW+.25*HOUR,end:NOW+1.5*HOUR,vectors:(key,p,t)=>({eastMps:key==='currentSurface'?t:2*t,northMps:0})});
 const out=derive(report);near(out.series.currentSurface.mean.eastMps,.875);near(out.series.wind10m.mean.eastMps,1.75);
 assert.deepEqual(out.series.currentSurface.componentRange.eastMps,[.25,1.5]);
 const later=derive(report,{flightWindow:{startAt:iso(NOW+HOUR),endAt:iso(NOW+1.5*HOUR)}});near(later.patch.flight.windEastMps,2.5);
});

test('Opposing spatial vectors cancel the mean without hiding maximum wind or vector spread',()=>{
 const out=derive(fixture({vectors:(key,p)=>({eastMps:key==='currentSurface'?.2:p?12:-12,northMps:0})}));
 assert.equal(out.patch.flight.windEastMps,0);assert.equal(out.series.flightWind.maxSpeedMps,12);assert.equal(out.series.flightWind.maxVectorDeviationMps,12);
 const flight=buildTrialFlight(geometry,{...profile,...out.patch.flight});assert.equal(flight.state,'blocked');assert.equal(flight.code,'WIND_INFEASIBLE');assert.equal(flight.wind.maximumSampleSpeedMps,12);
});

test('Circular wind direction is calculated from vectors rather than averaging bearings',()=>{
 const out=derive(fixture({vectors:(key,p)=>{if(key==='currentSurface')return{eastMps:0,northMps:0};const from=(p?350:10)*Math.PI/180;return{eastMps:-2*Math.sin(from),northMps:-2*Math.cos(from)};}}));
 near(out.patch.drift.windFromDeg,0);near(out.patch.drift.windSpeedMps,2*Math.cos(10*Math.PI/180));
});

test('A temporal reversal retains the zero-speed crossing and actual maxima',()=>{
 const out=derive(fixture({vectors:(key,p,t)=>({eastMps:key==='currentSurface'?(t-1)*.5:(t-1)*4,northMps:0})}));
 near(out.patch.flight.windEastMps,0);near(out.series.flightWind.speedRangeMps[0],0);near(out.series.flightWind.maxSpeedMps,4);
});

test('Null, missing, duplicate and unaccepted grid samples never become calm conditions',()=>{
 for(const mutate of [r=>r.series.currentSurface.samples.pop(),r=>r.series.currentSurface.samples[0].eastMps=null,r=>r.series.currentSurface.samples.push(r.series.currentSurface.samples[0]),r=>r.series.currentSurface.samples[0].gridAccepted=false]){
  const r=fixture();mutate(r);const out=derive(r);assert.equal(out.ready.drift,false);assert.equal(out.patch.drift,null);assert.equal(out.ready.flight,true);assert(out.reasons.length);
 }
 const zero=fixture({vectors:()=>({eastMps:0,northMps:0})});assert.equal(derive(zero).patch.drift.windSpeedMps,0);assert.equal(derive(zero).patch.drift.windFromDeg,0);
});

test('Freshness, expiry, unit and source-composition failures reject auto-fill',()=>{
 for(const mutate of [r=>r.series.flightWind.freshness.state='unknown',r=>r.series.flightWind.modelRunAt=iso(NOW-25*HOUR),r=>r.expiresAt=iso(NOW),r=>r.series.flightWind.units='km/h',r=>r.series.flightWind.dataEndAt=iso(NOW+HOUR),r=>r.series.flightWind.modelAvailableAt=iso(NOW-1000),r=>r.series.flightWind.samples[0].speedMps=99]){
  const r=fixture();mutate(r);assert.equal(derive(r).ready.flight,false);
 }
 const r=fixture();r.series.currentSurface.includesStokes=null;assert.equal(derive(r).ready.drift,false);
});

test('Flight-height estimates need explicit valid source heights and method; native 10/80 remain supported',()=>{
 for(const height of[10,80]){const r=fixture();r.request.altitudeM=height;for(const s of r.series.flightWind.samples){s.sourceHeightM=height;s.sourceHeightsM=[height];s.heightMethod=`model_${height}m`;s.estimated=false;}assert.equal(derive(r).ready.flight,true);}
 const r=fixture();delete r.series.flightWind.samples[0].sourceHeightsM;assert.equal(derive(r).ready.flight,false);
 const wrong=fixture();wrong.series.flightWind.samples[0].sourceHeightM=100;assert.equal(derive(wrong).ready.flight,false);
});

test('Old or invalid drift observation window does not retimestamp imagery or disable covered flight data',()=>{
 const r=fixture(),before=structuredClone(r);
 for(const driftWindow of[{startAt:iso(NOW-30*HOUR),endAt:r.request.endAt},{startAt:'invalid',endAt:r.request.endAt},{startAt:r.request.endAt,endAt:r.request.startAt}]){
  const out=derive(r,{driftWindow});assert.equal(out.ready.drift,false);assert.equal(out.patch.drift,null);assert.equal(out.ready.flight,true);
 }
 assert.deepEqual(r,before);
});

test('Malformed and unbounded responses return unavailable rather than throwing',()=>{
 for(const value of[null,{},[],{schema_version:'wrong'},fixture({points:6}),fixture({start:NOW,end:NOW+25*HOUR})])assert.equal(derive(value).state,'unavailable');
 const r=fixture();r.request.points[1].id=r.request.points[0].id;assert.equal(derive(r).state,'unavailable');
 const instant=derive(fixture({start:NOW,end:NOW}));assert.equal(instant.state,'complete');near(instant.patch.flight.windEastMps,2);
});

test('All-vector airspeed and gust checks conservatively reject cancellation and headwind extremes',()=>{
 const samples=[{eastMps:7,northMps:0,gustMps:7},{eastMps:-7,northMps:0,gustMps:7}];
 const f=buildTrialFlight(geometry,{...profile,maxAirspeedMps:11,windSamples:samples,windGustMps:7});assert.equal(f.state,'blocked');assert(f.wind.requiredMaxAirspeedMps>=12);
 const gust=buildTrialFlight(geometry,{...profile,windSamples:[{eastMps:0,northMps:0,gustMps:9}],windGustMps:9});assert.equal(gust.code,'WIND_INFEASIBLE');assert.equal(gust.wind.gustMps,9);
});

test('Missing automatic gust coverage stays incomplete and legacy manual vectors retain existing behavior',()=>{
 const missing=buildTrialFlight(geometry,{...profile,windSamples:[{eastMps:0,northMps:0}],windGustMps:null});assert.equal(missing.wind.state,'incomplete');assert.equal(missing.battery.state,'incomplete');assert(missing.missing.includes('windGustMps'));
 const pending=buildTrialFlight(geometry,{...profile,windEastMps:null,windNorthMps:null,windSamples:null,windGustMps:null});assert.equal(pending.wind.state,'incomplete');
 const manual=buildTrialFlight(geometry,profile);assert.equal(manual.wind.state,'pass');assert.equal(manual.battery.state,'pass');assert.equal(manual.wind.sampleCount,undefined);
 const valid=buildTrialFlight(geometry,{...profile,windSamples:[{eastMps:0,northMps:0,gustMps:0}],windGustMps:0});assert.equal(valid.wind.state,'pass');assert.equal(valid.battery.state,'pass');
 for(const windSamples of[[],Array.from({length:151},()=>({eastMps:0,northMps:0})),[{eastMps:null,northMps:0}],[{eastMps:Infinity,northMps:0}],[{eastMps:0,northMps:0,gustMps:-1}]])assert.throws(()=>buildTrialFlight(geometry,{...profile,windSamples}),/wind|Wind|gust|Sample/);
});

test('Missing gust in an interpolation bracket remains unknown rather than borrowing adjacent gust',()=>{
 const r=fixture({start:NOW+.25*HOUR,end:NOW+.5*HOUR});r.series.flightWind.samples[0].gustMps=null;const out=derive(r);assert.equal(out.ready.flight,true);assert(out.patch.flight.windSamples.some(s=>s.gustMps===undefined));
 const flight=buildTrialFlight(geometry,{...profile,...out.patch.flight});assert.equal(flight.wind.state,'incomplete');assert.equal(flight.battery.state,'incomplete');
});
