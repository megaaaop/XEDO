import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanningSchedule } from '../src/planning-schedule.js';
import {buildTrialFlight} from '../src/trial-flight.js';
import {createHardwareFlightDefaults} from '../src/planning-hardware-profile.js';

const START = Date.parse('2026-10-25T10:00:00.000Z');
const iso = value => new Date(value).toISOString();
const flight = (durationS = 1200, sortieCount = 1) => ({
  plan: { status: 'generated', estimates: { durationS: 900 } },
  battery: { totalDurationS: durationS, sorties: Array.from({ length: sortieCount }, () => ({})) },
});

test('first successful analysis anchors takeoff exactly one hour later', () => {
  let time = START;
  const schedule = createPlanningSchedule({ now: () => time });
  assert.equal(schedule.getReadiness().status, 'waiting');
  const provisional = schedule.begin();
  assert.equal(provisional.plannedTakeoffAt, iso(START + 3600000));
  assert.equal(provisional.plannedEndAt, iso(START + 5400000));
  assert.equal(schedule.getReadiness().status, 'waiting');
  time += 12000;
  schedule.complete({ plan: { status: 'incomplete' } });
  assert.equal(schedule.getState().pending, true);
  const patch = schedule.complete(flight());
  assert.equal(patch.schedule.analysedAt, iso(time));
  assert.equal(patch.plannedTakeoffAt, iso(time + 3600000));
  assert.equal(patch.plannedEndAt, iso(time + 3600000 + 1500000));
  assert.equal(schedule.getReadiness().status, 'ready');
});

test('weather and GEE refreshes preserve anchor while changed duration updates mission end', () => {
  let time = START;
  const schedule = createPlanningSchedule({ now: () => time });
  schedule.begin();
  const initial = schedule.complete(flight());
  time += 600000;
  assert.deepEqual(schedule.complete(flight()), initial);
  const updated = schedule.complete(flight(2100));
  assert.equal(updated.schedule.analysedAt, initial.schedule.analysedAt);
  assert.equal(updated.plannedTakeoffAt, initial.plannedTakeoffAt);
  assert.equal(updated.plannedEndAt, iso(START + 3600000 + 2400000));
});

test('mission window covers all sortie durations, turnaround and labeled scheduling buffer', () => {
  const schedule = createPlanningSchedule({ now: () => START });
  schedule.begin();
  const patch = schedule.complete(flight(2400, 3));
  assert.equal(patch.schedule.flightDurationS, 2400);
  assert.equal(patch.schedule.sortieCount, 3);
  assert.equal(patch.schedule.schedulingBufferS, 300);
  assert.equal(patch.schedule.turnaroundS, 600);
  assert.equal(patch.schedule.windowDurationS, 3900);
  assert.equal(Date.parse(patch.plannedEndAt) - Date.parse(patch.plannedTakeoffAt), 3900000);
});

test('duration falls back to route estimate and then thirty minutes', () => {
  const schedule = createPlanningSchedule({ now: () => START, bufferS: 0 });
  schedule.begin();
  assert.equal(schedule.complete(flight(null)).schedule.flightDurationS, 900);
  assert.equal(schedule.complete({ plan: { status: 'generated', estimates: { durationS: NaN } } }).schedule.flightDurationS, 1800);
  assert.equal(schedule.getState().sortieCount, 1);
});

test('manual timestamps with explicit timezone survive calculations and normalize to UTC', () => {
  const schedule = createPlanningSchedule({ now: () => START });
  schedule.begin();
  const manual = schedule.setManual({ plannedTakeoffAt: '2026-10-25T19:00:00+07:00', plannedEndAt: '2026-10-25T20:00+07:00' });
  assert.equal(manual.schedule.mode, 'manual');
  assert.equal(manual.schedule.pending, false);
  assert.equal(manual.plannedTakeoffAt, '2026-10-25T12:00:00.000Z');
  assert.deepEqual(schedule.complete(flight(7200, 4)), manual);
  assert.equal(schedule.getReadiness().status, 'ready');
});

test('explicit replan replaces manual or expired anchor only after successful analysis', () => {
  let time = START;
  const schedule = createPlanningSchedule({ now: () => time });
  schedule.begin();
  schedule.complete(flight());
  time += 7200000;
  assert.equal(schedule.getReadiness().status, 'expired');
  schedule.begin();
  assert.equal(schedule.getReadiness().status, 'waiting');
  time += 45000;
  const patch = schedule.complete(flight());
  assert.equal(patch.schedule.analysedAt, iso(time));
  assert.equal(patch.plannedTakeoffAt, iso(time + 3600000));
  schedule.setManual({ plannedTakeoffAt: iso(time + 7200000), plannedEndAt: iso(time + 9000000) });
  schedule.begin();
  assert.equal(schedule.complete(flight()).schedule.mode, 'automatic');
});

test('readiness expires dynamically without mutating the saved schedule', () => {
  let time = START;
  const schedule = createPlanningSchedule({ now: () => time });
  schedule.begin();
  const patch = schedule.complete(flight());
  time = Date.parse(patch.plannedTakeoffAt) - 1;
  assert.equal(schedule.getReadiness().status, 'ready');
  time += 1;
  assert.deepEqual(schedule.getReadiness(), {
    status: 'expired', message: 'Takeoff time has passed. Replan or choose a future time.', expiresAt: patch.plannedTakeoffAt,
  });
  assert.deepEqual(schedule.getPatch(), patch);
});

test('snapshot restoration preserves automatic anchor without consulting current time', () => {
  const original = createPlanningSchedule({ now: () => START });
  original.begin();
  const snapshot = original.complete(flight(2100, 2));
  const restored = createPlanningSchedule({ now: () => { throw new Error('Clock should not be used during restore.'); } });
  assert.deepEqual(restored.restore(snapshot.schedule, snapshot), snapshot);
  assert.deepEqual(restored.complete(flight(2100, 2)), snapshot);
  assert.equal(restored.complete(flight(2400, 2)).plannedTakeoffAt, snapshot.plannedTakeoffAt);
});

test('pending snapshots restore provisionally and anchor only when analysis finishes', () => {
  const original = createPlanningSchedule({ now: () => START });
  const snapshot = original.begin();
  const restored = createPlanningSchedule({ now: () => START + 5000 });
  assert.deepEqual(restored.restore(snapshot.schedule, snapshot), snapshot);
  assert.equal(restored.complete(flight()).schedule.analysedAt, iso(START + 5000));
});

test('fractional route durations round-trip through millisecond ISO timestamps', () => {
  const original = createPlanningSchedule({ now: () => START });
  original.begin();
  const snapshot = original.complete(flight(1842.654321, 2));
  const restored = createPlanningSchedule({ now: () => START });
  assert.deepEqual(restored.restore(snapshot.schedule, snapshot), snapshot);
});

test('legacy or unknown metadata adopts saved dates as manual without creating timestamps', () => {
  const schedule = createPlanningSchedule({ now: () => { throw new Error('Unexpected clock read.'); } });
  const fields = { plannedTakeoffAt: iso(START), plannedEndAt: iso(START + 3600000) };
  assert.equal(schedule.restore(null, fields).schedule.mode, 'manual');
  assert.equal(schedule.restore({ version: 92, mode: 'automatic' }, fields).schedule.mode, 'manual');
  assert.equal(schedule.getState().analysedAt, null);
  assert.equal(schedule.restore(null, {}).schedule.mode, 'idle');
});

test('invalid dates, non-plain input and inconsistent automatic metadata fail atomically', () => {
  const schedule = createPlanningSchedule({ now: () => START });
  schedule.begin();
  const snapshot = schedule.complete(flight());
  for (const invalid of ['2026-02-30T10:00:00Z', '2026-10-25T10:00', '2026-10-25T24:00:00Z', '2026-10-25T10:00:00+25:00', 123]) {
    assert.throws(() => schedule.setManual({ plannedTakeoffAt: invalid, plannedEndAt: snapshot.plannedEndAt }), TypeError);
    assert.deepEqual(schedule.getPatch(), snapshot);
  }
  assert.throws(() => schedule.restore([], snapshot), TypeError);
  assert.throws(() => schedule.restore(snapshot.schedule, []), TypeError);
  assert.throws(() => schedule.restore({ ...snapshot.schedule, analysedAt: iso(START + 1000) }, snapshot), TypeError);
  assert.throws(() => schedule.restore({ ...snapshot.schedule, sortieCount: 0 }, snapshot), TypeError);
  assert.throws(() => schedule.restore({ ...snapshot.schedule, schedulingBufferS: -1 }, snapshot), TypeError);
  assert.deepEqual(schedule.getPatch(), snapshot);
});

test('manual missing or reversed times are blocked and reset clears all scheduling history', () => {
  const schedule = createPlanningSchedule({ now: () => START });
  schedule.setManual({ plannedTakeoffAt: iso(START + 10000) });
  assert.equal(schedule.getReadiness().status, 'blocked');
  schedule.setManual({ plannedTakeoffAt: iso(START + 20000), plannedEndAt: iso(START + 10000) });
  assert.equal(schedule.getReadiness().status, 'blocked');
  const reset = schedule.reset();
  assert.equal(reset.schedule.mode, 'idle');
  assert.equal(reset.schedule.analysedAt, null);
  assert.equal(reset.plannedTakeoffAt, null);
  assert.equal(reset.plannedEndAt, null);
  assert.equal(schedule.complete(flight()).schedule.mode, 'idle');
  assert.equal(schedule.getReadiness().status, 'waiting');
});

test('returned state and metadata cannot mutate internal schedule', () => {
  const schedule = createPlanningSchedule({ now: () => START });
  schedule.begin();
  const snapshot = schedule.complete(flight());
  const patch = schedule.getPatch();
  patch.schedule.mode = 'manual';
  patch.plannedTakeoffAt = null;
  schedule.getState().analysedAt = null;
  assert.deepEqual(schedule.getPatch(), snapshot);
});

test('clock and timing settings are validated before updating state', () => {
  assert.throws(() => createPlanningSchedule({ now: 10 }), TypeError);
  assert.throws(() => createPlanningSchedule({ bufferS: -1 }), TypeError);
  assert.throws(() => createPlanningSchedule({ turnaroundS: Infinity }), TypeError);
  const schedule = createPlanningSchedule({ now: () => NaN });
  assert.throws(() => schedule.begin(), TypeError);
  assert.equal(schedule.getState().mode, 'idle');
});
test('P14 an assessed multi-sortie window survives a temporary forecast gap, then updates once on the new assessment',()=>{
 const schedule=createPlanningSchedule({now:()=>START});schedule.begin();
 const before=schedule.complete(flight(10000,20));assert.equal(before.schedule.durationSource,'assessed_sorties');
 const pending={plan:{status:'generated',estimates:{durationS:900}},battery:{state:'incomplete',totalDurationS:null,sorties:[]}};
 for(let i=0;i<20;i++)assert.deepEqual(schedule.complete(pending),before);
 const restored=createPlanningSchedule({now:()=>START});restored.restore(before.schedule,before);assert.deepEqual(restored.complete(pending),before);
 const after=schedule.complete(flight(11000,21));assert.equal(after.plannedTakeoffAt,before.plannedTakeoffAt);assert.notEqual(after.plannedEndAt,before.plannedEndAt);
 assert.deepEqual(schedule.complete(flight(11000,21)),after);
});
test('Automatic and restored long schedules retain their real end and cannot report ready',()=>{
  const start=Date.parse('2026-10-27T20:24:05.270Z'),end=Date.parse('2026-10-30T01:15:37.015Z');
  const schedule=createPlanningSchedule({now:()=>start-3600000});schedule.begin();
  const patch=schedule.complete(flight((end-start)/1000-300));
  assert.equal(patch.plannedEndAt,iso(end));assert.equal(schedule.getReadiness().status,'blocked');assert.match(schedule.getReadiness().message,/52 h.*24 hours/);
  const restored=createPlanningSchedule({now:()=>start-3600000});restored.restore(patch.schedule,patch);assert.equal(restored.getReadiness().status,'blocked');
  schedule.complete(flight(1200));assert.equal(schedule.getReadiness().status,'ready');assert.equal(schedule.getPatch().plannedTakeoffAt,patch.plannedTakeoffAt);
});
test('A real long fixed-camera route and manual windows cannot bypass the24h planning limit',()=>{
  const geometry={type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.75],[101.2,12.75],[101.2,12.6]]]};
  const result=buildTrialFlight(geometry,{...createHardwareFlightDefaults(),home:[101.2,12.6]});
  assert.equal(result.plan.status,'generated');assert.ok(result.plan.estimates.durationS>86400);
  const schedule=createPlanningSchedule({now:()=>START});schedule.begin();const patch=schedule.complete(result);
  assert.equal(schedule.getReadiness().status,'blocked');assert.ok(Date.parse(patch.plannedEndAt)-Date.parse(patch.plannedTakeoffAt)>86400000);
  schedule.setManual({plannedTakeoffAt:iso(START+3600000),plannedEndAt:iso(START+3600000+86400001)});assert.equal(schedule.getReadiness().status,'blocked');
  schedule.setManual({plannedTakeoffAt:iso(START+3600000),plannedEndAt:iso(START+3600000+86400000)});assert.equal(schedule.getReadiness().status,'ready');
  schedule.setManual({plannedTakeoffAt:iso(START+7*86400000),plannedEndAt:iso(START+7*86400000+3600000)});assert.equal(schedule.getReadiness().status,'blocked');
});
