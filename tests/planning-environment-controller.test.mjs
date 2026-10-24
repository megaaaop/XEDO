import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanningEnvironmentController} from '../src/planning-environment-controller.js';

const epoch = Date.parse('2026-10-24T00:00:00Z');
const geometry = () => ({type: 'Polygon', coordinates: [[[101.2,12.6],[101.21,12.6],[101.21,12.61],[101.2,12.6]]]});
const context = () => ({eligible: true, geometry: geometry(), startAt: '2026-10-24T01:00:00Z', endAt: '2026-10-24T02:00:00Z', altitudeM: 50});
const flush = async () => { for (let i=0; i<12; i++) await Promise.resolve(); };
function clock() {
  let time = epoch, id = 0;
  const jobs = new Map();
  return {
    now: () => time,
    set: value => { time = value; },
    timers: {
      setTimeout(fn, delay) { const key=++id; jobs.set(key, {at: time+delay, fn}); return key; },
      clearTimeout(key) { jobs.delete(key); }
    },
    count: () => jobs.size,
    async advance(ms) {
      const target=time+ms;
      for (;;) {
        const next=[...jobs].filter(([,job]) => job.at<=target).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
        if (!next) break;
        jobs.delete(next[0]); time=next[1].at; next[1].fn(); await flush();
      }
      time=target; await flush();
    }
  };
}
function response(payload, time, overrides={}) {
  const series = Object.fromEntries(['wind10m','flightWind','currentSurface'].map(name => [name, {
    status: 'complete', freshness: {state: 'fresh'}, samples: [{eastMps: 0, northMps: 0}]
  }]));
  return {schema: 'xedo-planning-environment/1', state: 'complete', fetchedAt: new Date(time).toISOString(),
    expiresAt: new Date(time+600000).toISOString(), request: structuredClone(payload), series, ...overrides};
}
function harness(options={}) {
  const time=clock(), calls=[], applies=[], revokes=[], states=[];
  let current=context();
  const controller=createPlanningEnvironmentController({
    request(payload, {signal}) {
      let resolve, reject;
      const promise=new Promise((yes,no) => {resolve=yes; reject=no;});
      calls.push({payload, signal, resolve, reject});
      return promise;
    },
    getContext: () => current,
    onApply: (data, meta) => applies.push({data,meta}),
    onRevoke: data => revokes.push(data),
    onState: data => states.push(data),
    now: time.now, timers: time.timers, ...options
  });
  return {controller,time,calls,applies,revokes,states,
    get context(){return current;}, set context(value){current=value;},
    async ready(overrides={}) {
      const pending=controller.refresh({force:true}); await flush();
      const call=calls.at(-1); call.resolve(response(call.payload,time.now(),overrides));
      await pending; return controller.getState();
    }
  };
}

test('Automatic checks debounce AOI/time changes, with no duplicate request for an unchanged context', async () => {
  const h=harness();
  h.controller.changed(); await h.time.advance(499); assert.equal(h.calls.length,0);
  await h.time.advance(1); assert.equal(h.calls.length,1);
  h.controller.changed(); assert.equal(h.calls.length,1); assert.equal(h.calls[0].signal.aborted,false);
  h.calls[0].resolve(response(h.calls[0].payload,h.time.now())); await flush();
  assert.equal(h.controller.isReady(),true); assert.equal(h.applies.length,1);
  h.context.startAt='2026-10-24T01:00:00.000Z'; h.controller.changed();
  await h.time.advance(500); assert.equal(h.calls.length,1); assert.equal(h.revokes.length,0);
  h.controller.dispose();
});

test('A changed AOI immediately revokes auto-owned values and ignores an older aborted result', async () => {
  const h=harness(); await h.ready();
  h.context.geometry.coordinates[0][0][0]=101.3; h.controller.changed();
  assert.equal(h.controller.isReady(),false); assert.equal(h.revokes.length,1);
  await h.time.advance(500); const old=h.calls[1];
  h.context.endAt='2026-10-24T03:00:00Z'; h.controller.changed();
  assert.equal(old.signal.aborted,true);
  await h.time.advance(500); const latest=h.calls[2];
  old.resolve(response(old.payload,h.time.now())); await flush();
  assert.equal(h.applies.length,1);
  latest.resolve(response(latest.payload,h.time.now())); await flush();
  assert.equal(h.applies.length,2); assert.equal(h.applies[1].data.request.endAt,h.context.endAt);
  h.controller.dispose();
});

test('A request result also checks current context when the UI has not yet called changed', async () => {
  const h=harness(), pending=h.controller.refresh(); await flush();
  h.context.altitudeM=80;
  h.calls[0].resolve(response(h.calls[0].payload,h.time.now())); await pending;
  assert.equal(h.applies.length,0); assert.equal(h.controller.getState().status,'waiting');
  await h.time.advance(500); assert.equal(h.calls[1].payload.altitudeM,80);
  h.controller.dispose();
});

test('Request, response, notification, and manual mission inputs are isolated copies', async () => {
  const h=harness(), reviews={homeConfirmed:false,flatSurfaceConfirmed:false,airspaceReviewed:false};
  h.context.manualInputs={windEastMps:7,reviews};
  const before=structuredClone(h.context), pending=h.controller.refresh(); await flush();
  h.calls[0].payload.geometry.coordinates[0][0][0]=999;
  assert.deepEqual(h.context,before);
  const source=response(before,h.time.now());
  source.request={geometry:before.geometry,startAt:before.startAt,endAt:before.endAt,altitudeM:before.altitudeM};
  h.calls[0].resolve(source); await pending;
  h.applies[0].data.series.wind10m.samples[0].eastMps=123;
  h.states.at(-1).response.series.wind10m.samples[0].eastMps=456;
  assert.equal(h.controller.getState().response.series.wind10m.samples[0].eastMps,0);
  h.controller.dispose(); assert.deepEqual(h.context,before); assert.deepEqual(reviews,{homeConfirmed:false,flatSurfaceConfirmed:false,airspaceReviewed:false});
});

test('Partial data retains explicit nulls without inventing calm wind or current', async () => {
  const h=harness();
  const state=await h.ready({state:'partial', series:{
    wind10m:{status:'complete',freshness:{state:'fresh'},samples:[{eastMps:0,northMps:0}]},
    flightWind:{status:'unavailable',freshness:{state:'unknown'},samples:[{eastMps:null,northMps:null}]},
    currentSurface:{status:'partial',freshness:{state:'fresh'},samples:[{eastMps:null,northMps:0}]}
  }});
  assert.equal(state.status,'partial'); assert.equal(h.controller.isReady(),false);
  assert.equal(h.applies[0].data.series.flightWind.samples[0].eastMps,null);
  assert.equal(h.applies[0].data.series.currentSurface.samples[0].northMps,0);
  h.controller.dispose();
});

test('Unavailable results and provider failures clear previously applied values', async () => {
  const h=harness(); await h.ready();
  let pending=h.controller.refresh({force:true}); await flush();
  assert.equal(h.revokes.length,1); assert.equal(h.controller.isReady(),false);
  h.calls.at(-1).resolve(response(h.calls.at(-1).payload,h.time.now(),{state:'unavailable'})); await pending;
  assert.equal(h.controller.getState().status,'unavailable'); assert.equal(h.applies.length,1);
  await h.ready();
  pending=h.controller.refresh({force:true}); await flush();
  h.calls.at(-1).reject(new Error('Provider unavailable')); await pending;
  assert.equal(h.controller.getState().status,'error'); assert.equal(h.controller.getState().response,null);
  assert.equal(h.revokes.length,2); assert.equal(h.applies.length,2);
  h.controller.dispose();
});

test('Fresh HTTP fetch time cannot make stale or unknown provider metadata ready', async () => {
  for (const freshness of ['stale','unknown']) {
    const h=harness(), series=response(h.context,h.time.now()).series;
    series.currentSurface.freshness.state=freshness;
    await h.ready({series});
    assert.equal(h.controller.getState().status,'partial'); assert.equal(h.controller.isReady(),false);
    h.controller.dispose();
  }
});

test('Missing or mismatched area/time responses cannot reach the calculators', async () => {
  const cases=[
    data=>{delete data.request;},
    data=>{data.request.geometry.coordinates[0][0][0]+=1;},
    data=>{data.request.endAt='2026-10-24T03:00:00Z';},
    data=>{data.request.altitudeM=100;},
    data=>{data.fetchedAt='invalid';},
    data=>{data.expiresAt=null;},
    data=>{data.fetchedAt='2026-10-24T00:02:00Z';},
    data=>{data.state='guessed';}
  ];
  for (const change of cases) {
    const h=harness(), pending=h.controller.refresh(); await flush();
    const data=response(h.calls[0].payload,h.time.now()); change(data); h.calls[0].resolve(data); await pending;
    assert.equal(h.controller.getState().status,'error'); assert.equal(h.applies.length,0); assert.equal(h.controller.isReady(),false);
    h.controller.dispose();
  }
});

test('Expired provider responses remain unknown even when received just now', async () => {
  const h=harness();
  await h.ready({fetchedAt:new Date(epoch-600001).toISOString(),expiresAt:new Date(epoch+600000).toISOString()});
  assert.equal(h.controller.getState().status,'stale'); assert.equal(h.applies.length,0);
  h.controller.dispose();
});

test('Response TTL is capped at ten minutes and expiry revokes then refreshes automatically', async () => {
  const h=harness(); await h.ready({expiresAt:new Date(epoch+86400000).toISOString()});
  assert.equal(h.controller.getState().expiresAt,new Date(epoch+600000).toISOString());
  await h.time.advance(599999); assert.equal(h.calls.length,1); assert.equal(h.controller.isReady(),true);
  await h.time.advance(1); assert.equal(h.calls.length,2); assert.equal(h.revokes.length,1);
  assert.equal(h.controller.isReady(),false); assert.equal(h.controller.getState().status,'loading');
  h.controller.dispose();
});

test('Earlier source expiry supersedes the regular refresh interval', async () => {
  const h=harness(); await h.ready({expiresAt:new Date(epoch+120000).toISOString()});
  await h.time.advance(120000); assert.equal(h.calls.length,2); assert.equal(h.revokes.length,1);
  h.controller.dispose();
});

test('Readiness expires synchronously even when a suspended browser has not run timers', async () => {
  const h=harness(); await h.ready(); h.time.set(epoch+600001);
  assert.equal(h.controller.isReady(),false); assert.equal(h.controller.getState().status,'stale');
  assert.equal(h.revokes.length,1); assert.equal(h.controller.getState().response,null);
  h.controller.dispose();
});

test('Periodic retry continues after unavailable data without overlapping identical requests', async () => {
  const h=harness({refreshMs:10000}); await h.ready({state:'unavailable'});
  await h.time.advance(10000); assert.equal(h.calls.length,2);
  const one=h.controller.refresh(), two=h.controller.refresh(); assert.strictEqual(one,two);
  h.calls[1].resolve(response(h.calls[1].payload,h.time.now())); await one;
  assert.equal(h.controller.isReady(),true); h.controller.dispose();
});

test('Example, manual, file, and offline modes never fetch or replace manual inputs', async () => {
  for (const mode of ['example','manual','localFile','offline']) {
    const h=harness(); h.context[mode]=true;
    h.controller.changed(); await h.time.advance(1000); await h.controller.refresh();
    assert.equal(h.calls.length,0); assert.equal(h.applies.length,0); assert.equal(h.revokes.length,0);
    h.context[mode]=false; await h.ready();
    h.context[mode]=true; h.controller.changed();
    assert.equal(h.revokes.length,1); assert.equal(h.controller.isReady(),false); assert.equal(h.controller.getState().response,null);
    h.controller.dispose();
  }
});

test('Clearing geometry or invalidating mission times cancels a pending request', async () => {
  for (const change of [ctx=>{ctx.geometry=null;},ctx=>{ctx.endAt='2026-10-24T00:00:00Z';},ctx=>{ctx.startAt='';},ctx=>{ctx.eligible=false;}]) {
    const h=harness(), pending=h.controller.refresh(); await flush(); change(h.context); h.controller.changed();
    assert.equal(h.calls[0].signal.aborted,true); await pending;
    assert.equal(h.controller.getState().status,'waiting'); assert.equal(h.applies.length,0);
    h.controller.dispose();
  }
});

test('Hidden or inactive pages abort work, revoke auto values, and resume with a new check', async () => {
  const h=harness(); await h.ready(); h.controller.setActive(false);
  assert.equal(h.revokes.length,1); assert.equal(h.controller.getState().status,'inactive');
  assert.equal(h.time.count(),0); await h.time.advance(600000); assert.equal(h.calls.length,1);
  h.controller.setActive(true); await h.time.advance(500); assert.equal(h.calls.length,2);
  assert.equal(h.controller.isReady(),false); h.controller.dispose();
});

test('Disposal aborts unresolved work, resolves its controller promise, and removes all timers', async () => {
  const h=harness(), pending=h.controller.refresh(); await flush(); h.controller.dispose(); await pending;
  assert.equal(h.calls[0].signal.aborted,true); assert.equal(h.time.count(),0);
  h.calls[0].resolve(response(h.calls[0].payload,h.time.now())); await flush();
  assert.equal(h.applies.length,0); assert.equal(h.controller.getState().active,false);
  await h.controller.refresh(); await h.time.advance(600000); assert.equal(h.calls.length,1);
});

test('A hung provider has a deadline and never leaves automatic values ready', async () => {
  const h=harness({requestTimeoutMs:1000}), pending=h.controller.refresh(); await flush();
  await h.time.advance(1000); await pending;
  assert.equal(h.calls[0].signal.aborted,true); assert.equal(h.controller.getState().status,'error');
  assert.match(h.controller.getState().reason,/timed out/); assert.equal(h.applies.length,0);
  h.controller.dispose();
});

test('A failed calculator application is revoked rather than retained as a ready result', async () => {
  const revokes=[], h=harness({onApply(){throw new Error('Cannot apply inputs');},onRevoke:data=>revokes.push(data)});
  await h.ready(); assert.equal(h.controller.getState().status,'error'); assert.equal(revokes.length,1);
  assert.equal(h.controller.isReady(),false); h.controller.dispose();
});

test('Invalid controller configuration is rejected before any request', () => {
  assert.throws(()=>createPlanningEnvironmentController(),/callbacks/);
  for (const options of [{debounceMs:-1},{refreshMs:0},{requestTimeoutMs:NaN},{timers:{}}]) {
    assert.throws(()=>harness(options),TypeError);
  }
});

test('Reading partial state also expires auto-owned inputs when timers were suspended', async () => {
  const h=harness(); await h.ready({state:'partial'}); h.time.set(epoch+600001);
  const state=h.controller.getState();
  assert.equal(state.status,'stale'); assert.equal(state.response,null); assert.equal(h.revokes.length,1);
  h.controller.dispose();
});