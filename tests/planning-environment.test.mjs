import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPlanningEnvironment,validatePlanningEnvironmentRequest,PLANNING_ENVIRONMENT_SOURCES} from '../src/planning-environment.js';

const NOW=Date.parse('2026-10-24T06:00:00Z'),HOUR=3600000;
const polygon=()=>({type:'Polygon',coordinates:[[[101.2,12.6],[101.204,12.6],[101.204,12.604],[101.2,12.604],[101.2,12.6]]]});
const input=(extra={})=>({geometry:polygon(),startAt:'2026-10-24T07:00:00Z',endAt:'2026-10-24T08:00:00Z',altitudeM:50,...extra});
const near=(actual,expected,tolerance=1e-9)=>assert(Math.abs(actual-expected)<tolerance,`${actual} differs from ${expected}`);
const metadata=()=>({last_run_initialisation_time:NOW/1000-6*3600,last_run_availability_time:NOW/1000-5*3600,data_end_time:NOW/1000+8*86400,temporal_resolution_seconds:3600,update_interval_seconds:21600});
function provider({mutate,fail,delay=0}={}){
  const calls=[];let active=0,maxActive=0;
  const fetchImpl=async(raw,options)=>{
    const url=new URL(raw);calls.push({url,options});active++;maxActive=Math.max(maxActive,active);
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    try{
      if(fail?.(url))throw new Error('SECRET_UPSTREAM_MESSAGE');
      let value;
      if(url.pathname.endsWith('/meta.json'))value=metadata();
      else {
        const lat=url.searchParams.get('latitude').split(',').map(Number),lon=url.searchParams.get('longitude').split(',').map(Number),marine=url.hostname.startsWith('marine-');
        const start=Date.parse(url.searchParams.get('start_date')+'T00:00:00Z'),end=Date.parse(url.searchParams.get('end_date')+'T00:00:00Z')+23*HOUR,times=[];
        for(let at=start;at<=end;at+=HOUR)times.push(new Date(at).toISOString().slice(0,16));
        value=lat.map((latitude,i)=>({latitude,longitude:lon[i],utc_offset_seconds:0,hourly_units:marine?{time:'iso8601',ocean_current_velocity:'m/s',ocean_current_direction:'°'}:{time:'iso8601',wind_speed_10m:'m/s',wind_direction_10m:'°',wind_speed_80m:'m/s',wind_direction_80m:'°',wind_gusts_10m:'m/s'},hourly:marine?{time:times,ocean_current_velocity:times.map(()=>.5),ocean_current_direction:times.map(()=>90)}:{time:times,wind_speed_10m:times.map(()=>4),wind_direction_10m:times.map(()=>90),wind_speed_80m:times.map(()=>11),wind_direction_80m:times.map(()=>90),wind_gusts_10m:times.map(()=>13)}}));
      }
      mutate?.(value,url);
      return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json','Date':new Date(NOW).toUTCString()}});
    }finally{active--;}
  };
  return {fetchImpl,calls,get maxActive(){return maxActive;}};
}

test('Environment request is immutable, bounded to Thailand, and samples several AOI points',()=>{
  const request=input(),before=structuredClone(request),normalized=validatePlanningEnvironmentRequest(request,{now:NOW});
  assert.deepEqual(request,before);assert.notStrictEqual(normalized.geometry,request.geometry);
  assert.equal(normalized.points.length,5);assert.equal(new Set(normalized.points.map(p=>p.id)).size,5);
  assert.equal(normalized.startAt,'2026-10-24T07:00:00.000Z');
  for(const bad of [null,[],{...input(),url:'http://localhost'},{...input(),altitudeM:5},{...input(),altitudeM:81},{...input(),startAt:'2026-10-24T07:00:00'},{...input(),startAt:'2026-02-30T07:00:00Z'},{...input(),endAt:'2026-10-23T07:00:00Z'},{...input(),endAt:'2026-10-25T07:00:01Z'},{...input(),startAt:'2026-10-18T07:00:00Z'},{...input(),endAt:'2026-11-02T08:00:00Z'},{...input(),geometry:{type:'Point',coordinates:[101,12]}}])assert.throws(()=>validatePlanningEnvironmentRequest(bad,{now:NOW}),error=>error.code==='ENV_INPUT_INVALID'&&error.status===422);
  const abroad=polygon();abroad.coordinates[0]=abroad.coordinates[0].map(([lon,lat])=>[lon-10,lat]);assert.throws(()=>validatePlanningEnvironmentRequest(input({geometry:abroad}),{now:NOW}),/Thailand/);
  const large={type:'Polygon',coordinates:[[[100,12],[101.1,12],[101.1,12.01],[100,12.01],[100,12]]]};assert.throws(()=>validatePlanningEnvironmentRequest(input({geometry:large}),{now:NOW}),/100 km/);
});

test('Model lookups use fixed official endpoints, nearest cells, SI units and explicit 10/80 m vector interpolation',async()=>{
  const p=provider(),request=input(),before=structuredClone(request),result=await fetchPlanningEnvironment(request,{fetchImpl:p.fetchImpl,now:NOW});
  assert.deepEqual(request,before);assert.equal(result.state,'complete');assert.equal(result.hardwareControl,false);assert.equal(result.releaseControl,false);
  assert.equal(p.calls.length,4);assert(p.maxActive<=2);
  for(const {url,options}of p.calls){assert(['api.open-meteo.com','marine-api.open-meteo.com'].includes(url.hostname));assert.equal(options.redirect,'error');assert.equal(options.method,'GET');assert.equal(options.headers.authorization,undefined);if(url.searchParams.has('hourly')){assert.equal(url.searchParams.get('cell_selection'),'nearest');assert.equal(url.searchParams.get('wind_speed_unit'),'ms');}}
  assert.equal(result.request.points.length,5);assert.equal(result.series.wind10m.samples.length,10);
  const low=result.series.wind10m.samples[0],flight=result.series.flightWind.samples[0],current=result.series.currentSurface.samples[0];
  near(low.eastMps,-4);near(low.northMps,0);near(flight.eastMps,-8);near(current.eastMps,.5);near(current.northMps,0);
  assert.equal(flight.gustMps,13);assert.equal(low.gustMps,13);assert.equal(flight.gustSourceHeightM,10);assert.equal(result.series.flightWind.gustReferenceHeightM,10);assert.equal(p.calls.find(c=>c.url.pathname==='/v1/forecast').url.searchParams.get('hourly').includes('wind_gusts_10m'),true);
  assert.equal(flight.sourceHeightM,50);assert.equal(flight.heightMethod,'linear_10m_80m_estimate');assert.deepEqual(flight.sourceHeightsM,[10,80]);assert.equal(flight.estimated,true);
  assert.equal(result.series.currentSurface.coverage,'regional_estimate');assert.equal(result.series.currentSurface.includesTides,true);assert.equal(result.series.currentSurface.includesStokes,true);assert.equal(result.series.currentSurface.model,'meteofrance_currents');assert.equal(result.series.wind10m.model,'gfs_global');
  assert.equal(result.series.wind10m.freshness.state,'fresh');assert.equal(result.series.wind10m.modelRunAt,'2026-10-24T00:00:00.000Z');assert.equal(result.series.wind10m.resolutionM,13000);
  assert.equal(result.expiresAt,'2026-10-24T06:10:00.000Z');assert.match(result.series.currentSurface.warnings.join(' '),/mangroves/);
});

test('Hourly brackets cover non-hourly intervals and cross-midnight times',async()=>{
  const p=provider(),result=await fetchPlanningEnvironment(input({startAt:'2026-10-24T23:45:00Z',endAt:'2026-10-25T00:05:00Z'}),{fetchImpl:p.fetchImpl,now:NOW});
  assert.equal(result.state,'complete');assert.deepEqual(result.series.wind10m.samples.filter(s=>s.pointId==='p1').map(s=>s.at),['2026-10-24T23:00:00.000Z','2026-10-25T00:00:00.000Z','2026-10-25T01:00:00.000Z']);
});

test('Calm model values preserve zero without fabricating missing vectors',async()=>{
  const p=provider({mutate(value,url){if(url.searchParams.has('hourly'))for(const entry of value)for(const key of Object.keys(entry.hourly)){if(key.includes('speed')||key.includes('velocity'))entry.hourly[key].fill(0);if(key.includes('direction'))entry.hourly[key].fill(null);}}});
  const result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(result.state,'complete');for(const series of Object.values(result.series))for(const sample of series.samples){assert.equal(sample.eastMps,0);assert.equal(sample.northMps,0);assert.equal(sample.speedMps,0);}
});

test('Missing grid point/hour or incorrect units cannot become complete or calm water',async()=>{
  for(const mode of ['null','units','missing-hour','wrong-timezone']){
    const p=provider({mutate(value,url){if(url.pathname==='/v1/marine'){const entry=value[0];if(mode==='null')entry.hourly.ocean_current_velocity.fill(null);if(mode==='units')entry.hourly_units.ocean_current_velocity='km/h';if(mode==='missing-hour')entry.hourly.time.splice(7,1);if(mode==='wrong-timezone')entry.utc_offset_seconds=25200;}}});
    const result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(result.state,'partial');assert.equal(result.series.currentSurface.status,'partial');assert(result.series.currentSurface.samples.some(sample=>sample.eastMps===null));assert.equal(result.series.wind10m.status,'complete');
  }
});

test('Unavailable or distant marine grids remain unknown and are never relocated offshore',async()=>{
  const p=provider({mutate(value,url){if(url.pathname==='/v1/marine')for(const entry of value){entry.longitude+=1;}}}),result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});
  assert.equal(result.state,'partial');assert.equal(result.series.currentSurface.status,'unavailable');assert(result.series.currentSurface.samples.every(s=>s.eastMps===null&&s.gridAccepted===false&&s.gridDistanceM>18000));
  assert.equal(p.calls.find(c=>c.url.pathname==='/v1/marine').url.searchParams.get('cell_selection'),'nearest');
});

test('Stale, unknown, propagating, or short-range model metadata prevents ready state even when HTTP is fresh',async()=>{
  for(const mode of ['old','missing','propagating','range','resolution','invalid']){
    const p=provider({mutate(value,url){if(url.pathname.endsWith('/meta.json')){if(mode==='old')value.last_run_initialisation_time=NOW/1000-4*86400;if(mode==='missing')delete value.last_run_initialisation_time;if(mode==='propagating')value.last_run_availability_time=NOW/1000-60;if(mode==='range')value.data_end_time=NOW/1000;if(mode==='resolution')value.temporal_resolution_seconds=10800;if(mode==='invalid')value.last_run_initialisation_time=1e200;}}});
    const result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(result.state,'partial');assert.equal(result.series.wind10m.status,'partial');assert.equal(result.series.wind10m.freshness.state,mode==='old'?'stale':'unknown');assert.equal(result.fetchedAt,new Date(NOW).toISOString());
  }
});

test('Historical samples are explicitly reconstructed rather than claimed as historical issued forecasts',async()=>{
  const p=provider(),result=await fetchPlanningEnvironment(input({startAt:'2026-10-23T07:00:00Z',endAt:'2026-10-23T08:00:00Z'}),{fetchImpl:p.fetchImpl,now:NOW});
  assert.equal(result.series.wind10m.historicalReconstruction,true);assert.equal(result.series.wind10m.modelRunScope,'latest_available_provider_run');assert.match(result.series.wind10m.warnings.join(' '),/reconstructed/);
});

test('Provider failure and malformed payload are sanitized and no secrets or dates substitute for metadata',async()=>{
  const p=provider({fail:()=>true}),result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(result.state,'unavailable');assert.doesNotMatch(JSON.stringify(result),/SECRET_UPSTREAM_MESSAGE/);assert.equal(result.series.wind10m.modelRunAt,null);assert.equal(result.series.wind10m.freshness.state,'unknown');
  const bad=async()=>new Response('not JSON',{status:200});const second=await fetchPlanningEnvironment(input(),{fetchImpl:bad,now:NOW});assert.equal(second.state,'unavailable');assert(second.series.currentSurface.samples.every(s=>s.eastMps===null));
});

test('Identical in-flight requests deduplicate, cached returns are isolated and cache expires within ten minutes',async()=>{
  const p=provider({delay:5}),[a,b]=await Promise.all([fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW}),fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW})]);
  assert.equal(p.calls.length,4);assert.deepEqual(a,b);a.request.points[0].longitude=0;a.series.wind10m.samples[0].eastMps=999;
  const again=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW+1000});assert.notEqual(again.request.points[0].longitude,0);assert.notEqual(again.series.wind10m.samples[0].eastMps,999);assert.equal(p.calls.length,4);
  await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW+10*60*1000});assert.equal(p.calls.length,8);
});

test('Response body bounds and aborted requests do not leak a previous successful result',async()=>{
  const tooLarge=async()=>new Response('{}',{status:200,headers:{'content-length':String(1024*1024)}}),result=await fetchPlanningEnvironment(input(),{fetchImpl:tooLarge,now:NOW});assert.equal(result.state,'unavailable');
  const controller=new AbortController();controller.abort();const p=provider();await assert.rejects(fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW,signal:controller.signal}),/aborted/);assert.equal(p.calls.length,0);
  assert.equal(PLANNING_ENVIRONMENT_SOURCES.marine.endpoint,'https://marine-api.open-meteo.com/v1/marine');assert(Object.isFrozen(PLANNING_ENVIRONMENT_SOURCES.weather));
});
test('Concurrent different areas share a bounded provider pool',async()=>{
  const p=provider({delay:5});
  await Promise.all([0,.01,.02].map(offset=>{const geometry=polygon();geometry.coordinates[0]=geometry.coordinates[0].map(([lon,lat])=>[lon+offset,lat]);return fetchPlanningEnvironment(input({geometry}),{fetchImpl:p.fetchImpl,now:NOW});}));
  assert.equal(p.calls.length,12);assert(p.maxActive<=2);
});

test('Reported expiry and cache lifetime stop at model freshness boundary',async()=>{
  const p=provider({mutate(value,url){if(url.hostname==='api.open-meteo.com'&&url.pathname.endsWith('/meta.json')){value.last_run_initialisation_time=NOW/1000-24*3600+60;value.last_run_availability_time=NOW/1000-23*3600;}}});
  const first=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(first.state,'complete');assert.equal(first.expiresAt,new Date(NOW+60000).toISOString());
  const second=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW+60001});assert.equal(p.calls.length,8);assert.equal(second.series.wind10m.freshness.state,'stale');assert.equal(second.state,'partial');
});
test('Missing, invalid or non-SI gusts stay unknown without discarding valid wind vectors',async()=>{
  for(const gust of [null,undefined,-1,151,'13',Infinity]){
    const p=provider({mutate(value,url){if(url.pathname==='/v1/forecast')for(const entry of value)entry.hourly.wind_gusts_10m.fill(gust);}}),result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});
    assert.equal(result.state,'complete');for(const name of ['wind10m','flightWind']){assert(result.series[name].samples.every(s=>s.gustMps===null&&s.eastMps!==null));assert.match(result.series[name].warnings.join(' '),/gust values are unavailable/);}
  }
  const p=provider({mutate(value,url){if(url.pathname==='/v1/forecast')for(const entry of value){entry.hourly_units.wind_gusts_10m='km/h';}}}),result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(result.state,'complete');assert(result.series.flightWind.samples.every(s=>s.gustMps===null));
});

test('Explicit zero gust remains zero and retains its 10 m reference',async()=>{
  const p=provider({mutate(value,url){if(url.pathname==='/v1/forecast')for(const entry of value)entry.hourly.wind_gusts_10m.fill(0);}}),result=await fetchPlanningEnvironment(input(),{fetchImpl:p.fetchImpl,now:NOW});assert.equal(result.state,'complete');assert(result.series.flightWind.samples.every(s=>s.gustMps===0&&s.gustSourceHeightM===10));assert.match(result.series.flightWind.warnings.join(' '),/not measured or interpolated at aircraft height/);
});
test('Invalid ISO clock fields and invalid environment clocks are rejected before lookup',async()=>{
  for(const value of ['2026-10-24T24:00:00Z','2026-10-24T07:60:00Z','2026-10-24T07:00:60Z'])assert.throws(()=>validatePlanningEnvironmentRequest(input({startAt:value}),{now:NOW}),error=>error.code==='ENV_INPUT_INVALID'&&error.status===422);
  for(const now of [null,undefined,NaN,Infinity,'2026-10-24']){if(now===undefined)continue;assert.throws(()=>validatePlanningEnvironmentRequest(input(),{now}),error=>error.code==='ENV_INPUT_INVALID');}
});

test('Total lookup deadline cancels active and queued provider work within 25 seconds',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const signals=[],fetchImpl=async(_url,{signal})=>{signals.push(signal);return new Promise(()=>{});};
  const pending=fetchPlanningEnvironment(input(),{fetchImpl,now:NOW});
  for(let i=0;i<10;i++)await Promise.resolve();
  t.mock.timers.tick(12000);for(let i=0;i<20;i++)await Promise.resolve();
  t.mock.timers.tick(13000);for(let i=0;i<20;i++)await Promise.resolve();
  const result=await pending;assert.equal(result.state,'unavailable');assert.match(result.warnings.join(' '),/deadline elapsed/);assert(signals.length>=2);assert(signals.every(signal=>signal.aborted));
});

test('Caller abort rejects promptly even when provider fetch ignores its AbortSignal',async()=>{
  const controller=new AbortController(),signals=[],fetchImpl=async(_url,{signal})=>{signals.push(signal);return new Promise(()=>{});};
  const pending=fetchPlanningEnvironment(input(),{fetchImpl,now:NOW,signal:controller.signal});for(let i=0;i<10;i++)await Promise.resolve();controller.abort();
  await assert.rejects(pending,/aborted/);assert(signals.every(signal=>signal.aborted));
});