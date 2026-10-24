import test from 'node:test';
import assert from 'node:assert/strict';
import {ESTIMATED_DEMO_PROFILE, createEstimatedDemoInputs} from '../src/planning-estimated-demo.js';
import {XEDO_HARDWARE_PROFILE, createHardwareFlightDefaults} from '../src/planning-hardware-profile.js';
import {FIXED_PLANNING_SETTINGS} from '../src/planning-fixed-settings.js';
import {buildTrialFlight} from '../src/trial-flight.js';
import {fileTrialAPI} from '../src/planning-file-api.js';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
const calculate = input => fileTrialAPI('', {method: 'POST', body: JSON.stringify(input)});

test('Estimated demo is immutable and does not turn assumptions into real hardware defaults', () => {
  const before = structuredClone(XEDO_HARDWARE_PROFILE), fixedBefore = structuredClone(FIXED_PLANNING_SETTINGS);
  function frozen(value) {
    if (!value || typeof value !== 'object') return;
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(frozen);
  }
  frozen(ESTIMATED_DEMO_PROFILE);
  assert.equal(ESTIMATED_DEMO_PROFILE.id, 'xedo-estimated-demo/1');
  assert.equal(ESTIMATED_DEMO_PROFILE.label, 'Estimated demo');
  assert.equal(ESTIMATED_DEMO_PROFILE.hardwareControl, false);
  assert.equal(ESTIMATED_DEMO_PROFILE.releaseControl, false);
  createEstimatedDemoInputs();
  for (const key of Object.keys(ESTIMATED_DEMO_PROFILE.flight)) assert.equal(Object.hasOwn(createHardwareFlightDefaults(), key), false, key);
  assert.deepEqual(XEDO_HARDWARE_PROFILE, before);
  assert.deepEqual(FIXED_PLANNING_SETTINGS, fixedBefore);
});

test('Estimated battery inputs reproduce the stated assumption budget and phase values', () => {
  const {flight, battery} = ESTIMATED_DEMO_PROFILE;
  assert.deepEqual(flight, {usableWh: 177.6, reserveWh: 44.4, powerW: 600, windLimitMps: 8, maxAirspeedMps: 12, takeoffS: 30, landingS: 30, turnS: 5});
  near(battery.nominalVoltageV * battery.capacityAh, battery.nominalWh);
  near(battery.nominalWh * battery.startingUsableFraction, flight.usableWh);
  near(flight.usableWh * battery.reserveFractionOfStarting, flight.reserveWh);
  near(flight.usableWh - flight.reserveWh, battery.missionBudgetWh);
  near(battery.missionBudgetWh / flight.powerW * 60, 13.32);
});

test('Every demo factory call returns fresh mutable geometry, settings, timestamps and confirmations', () => {
  const clock = Date.UTC(2026, 9, 25, 8), first = createEstimatedDemoInputs(clock), second = createEstimatedDemoInputs(clock + 60000);
  assert.equal(first.drift.observedAt, '2026-10-25T08:00:00.000Z');
  assert.equal(second.drift.observedAt, '2026-10-25T08:01:00.000Z');
  assert.equal(first.export.plannedTakeoffAt, '2026-10-25T08:15:00.000Z');
  assert.equal(first.export.plannedEndAt, '2026-10-25T10:00:00.000Z');
  assert.equal(first.export.validUntil, '2026-10-25T11:00:00.000Z');
  first.geometry.coordinates[0][0][0] = 99;
  first.flight.usableWh = 1;
  first.export.noGo.features.push({type: 'Feature'});
  first.export.homeConfirmed = true;
  assert.equal(second.geometry.coordinates[0][0][0], 101.22);
  assert.equal(second.flight.usableWh, 177.6);
  assert.deepEqual(second.export.noGo.features, []);
  for (const key of ['homeConfirmed', 'flatSurfaceConfirmed', 'airspaceReviewed']) assert.equal(second.export[key], false);
  assert.equal(second.flight.windEastMps, 0);
  assert.equal(second.flight.windNorthMps, 0);
  assert.equal(second.driftEnabled, false);
  assert.equal(second.export.firmware, 'PX4');
  assert.match(second.export.source, /synthetic.*no current airspace clearance/i);
  assert.throws(() => createEstimatedDemoInputs(NaN), /finite timestamp/);
  assert.throws(() => createEstimatedDemoInputs('2026-10-25'), /finite timestamp/);
});

test('Demo computes the same camera, flight, drift and oil engines without enabling export confirmations', async () => {
  const input = createEstimatedDemoInputs(), before = structuredClone(input), result = await calculate(input);
  assert.deepEqual(input, before);
  assert.equal(result.flight.plan.status, 'generated');
  assert.equal(result.flight.camera.state, 'pass');
  assert.equal(result.flight.wind.state, 'pass');
  assert.equal(result.flight.battery.state, 'pass');
  near(result.flight.battery.budgetWh, 133.2);
  assert.ok(result.flight.battery.sorties.length >= 1);
  assert.ok(result.flight.battery.sorties.every(sortie => sortie.energyWh <= 133.2 + 1e-8));
  assert.equal(result.drift.state, 'disabled');
  assert.equal(result.oil.state, 'assumption_based');
  assert.equal(result.exportCheck.canExport, false);
  assert.equal(result.exportCheck.pass, false);
  for (const id of ['homeConfirmed', 'flatSurfaceConfirmed', 'airspaceReviewed']) assert.equal(result.exportCheck.checks.find(check => check.id === id)?.state, 'incomplete');
  assert.equal(result.hardwareControl, false);
  assert.equal(result.releaseControl, false);
  await assert.rejects(fileTrialAPI('/export', {method: 'POST', body: JSON.stringify(input)}), error => error.code === 'TRIAL_CHECKS_INCOMPLETE');
  const driftResult = await calculate({...input, driftEnabled: true});
  assert.equal(driftResult.drift.state, 'assumption_based');
  assert.ok(driftResult.drift.geometry);
  assert.equal(driftResult.exportCheck.pass, false);
});

test('A threshold wind can still fail the demo airspeed check instead of bypassing it', () => {
  const {geometry, flight} = createEstimatedDemoInputs();
  const result = buildTrialFlight(geometry, {...flight, windEastMps: 8});
  assert.equal(result.state, 'blocked');
  assert.equal(result.wind.state, 'blocked');
  assert.equal(result.battery.state, 'blocked');
  assert.ok(result.wind.requiredMaxAirspeedMps > 12.9);
  assert.deepEqual(result.battery.sorties, []);
});
