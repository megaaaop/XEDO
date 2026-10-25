import test from 'node:test';
import assert from 'node:assert/strict';
import { planningRouteSamples } from '../src/planning-route-samples.js';

const waypoint = (longitude, latitude = 12) => ({ position: [longitude, latitude], purpose: 'survey' });
const generated = waypoints => ({ plan: { status: 'generated', waypoints } });

test('missing or ungenerated routes produce no samples', () => {
  for (const value of [undefined, null, {}, { plan: { status: 'incomplete', waypoints: [waypoint(100)] } }]) {
    assert.deepEqual(planningRouteSamples(value), []);
  }
});

test('assessed battery sorties take precedence and include Home, return and separate sortie endpoints', () => {
  const flight = {
    plan: { status: 'generated', waypoints: [waypoint(80), waypoint(81)] },
    battery: { state: 'pass', sorties: [
      { waypoints: [waypoint(100), waypoint(101), waypoint(102), waypoint(100)] },
      { waypoints: [waypoint(100), waypoint(103), waypoint(104), waypoint(100)] },
    ] },
  };
  assert.deepEqual(planningRouteSamples(flight), [[100, 12], [101, 12], [102, 12], [103, 12], [104, 12]]);
});

test('fallback uses generated route when battery routes have no valid vertices', () => {
  const flight = { ...generated([waypoint(100), waypoint(101)]), battery: { sorties: [{ waypoints: [{ position: [Infinity, 12] }] }] } };
  assert.deepEqual(planningRouteSamples(flight), [[100, 12], [101, 12]]);
});

test('sparse samples cover the full route, retain endpoints, and are deterministic', () => {
  const flight = generated(Array.from({ length: 101 }, (_, i) => waypoint(100 + i / 1000)));
  const samples = planningRouteSamples(flight);
  assert.equal(samples.length, 24);
  assert.deepEqual(samples[0], [100, 12]);
  assert.deepEqual(samples.at(-1), [100.1, 12]);
  assert.ok(samples.some(position => position[0] > 100.04 && position[0] < 100.06));
  assert.deepEqual(planningRouteSamples(flight), samples);
  const source = new Set(flight.plan.waypoints.map(point => JSON.stringify(point.position)));
  assert.ok(samples.every(position => source.has(JSON.stringify(position))));
});

test('route endpoints across all sorties are prioritized where capacity permits', () => {
  const sorties = [0, 1, 2].map(sortie => ({ waypoints: Array.from({ length: 30 }, (_, i) => waypoint(100 + sortie + i / 1000)) }));
  const samples = planningRouteSamples({ battery: { sorties } }, { limit: 8 });
  assert.equal(samples.length, 8);
  for (const sortie of sorties) {
    assert.ok(samples.some(position => position[0] === sortie.waypoints[0].position[0]));
    assert.ok(samples.some(position => position[0] === sortie.waypoints.at(-1).position[0]));
  }
});

test('many sortie endpoints still obey limit and cover first and final route sections', () => {
  const sorties = Array.from({ length: 30 }, (_, i) => ({ waypoints: [waypoint(100 + i / 100), waypoint(100 + i / 100 + 0.001)] }));
  const samples = planningRouteSamples({ battery: { sorties } }, { limit: 6 });
  assert.equal(samples.length, 6);
  assert.deepEqual(samples[0], [100, 12]);
  assert.deepEqual(samples.at(-1), sorties.at(-1).waypoints.at(-1).position);
});

test('invalid, nonfinite or out-of-range positions are excluded and duplicates collapse', () => {
  const flight = generated([
    waypoint(100), waypoint(100), waypoint(-0, 0), waypoint(0, -0), null, {}, { position: null },
    { position: ['101', 12] }, { position: [null, 12] }, { position: [100] },
    waypoint(Infinity), waypoint(NaN), waypoint(181), waypoint(-181), waypoint(100, 91), waypoint(100, -91),
    waypoint(-180, -90), waypoint(180, 90), [101, 13, 50],
  ]);
  const samples = planningRouteSamples(flight);
  assert.equal(samples.length, 5);
  assert.deepEqual(samples[0], [100, 12]);
  assert.deepEqual(samples.slice(2), [[-180, -90], [180, 90], [101, 13]]);
  assert.equal(new Set(samples.map(position => `${position[0]},${position[1]}`)).size, samples.length);
});

test('antimeridian vertices are selected directly without creating interpolated positions', () => {
  const flight = generated([waypoint(179.9), waypoint(-179.9), waypoint(179.8), waypoint(-179.8)]);
  assert.deepEqual(planningRouteSamples(flight, { limit: 2 }), [[179.9, 12], [-179.8, 12]]);
});

test('outputs are cloned and sampling never modifies input route arrays', () => {
  const flight = generated([waypoint(100), waypoint(101)]);
  const before = structuredClone(flight);
  const samples = planningRouteSamples(flight);
  samples[0][0] = 0;
  samples.push([50, 50]);
  assert.deepEqual(flight, before);
});

test('limits zero and one are supported, larger limits cap at twenty four, invalid limits fail', () => {
  const flight = generated(Array.from({ length: 40 }, (_, i) => waypoint(100 + i / 100)));
  assert.deepEqual(planningRouteSamples(flight, { limit: 0 }), []);
  assert.deepEqual(planningRouteSamples(flight, { limit: 1 }), [[100, 12]]);
  assert.equal(planningRouteSamples(flight, { limit: 200 }).length, 24);
  for (const limit of [-1, 1.5, NaN, Infinity, '12', null]) {
    assert.throws(() => planningRouteSamples(flight, { limit }), TypeError);
  }
});
