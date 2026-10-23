import test from 'node:test';
import assert from 'node:assert/strict';
import {
  XEDO_HARDWARE_PROFILE,
  createHardwareFlightDefaults,
  isHardwareProfileCalibration,
} from '../src/planning-hardware-profile.js';
import {buildTrialFlight} from '../src/trial-flight.js';
import {fileTrialAPI} from '../src/planning-file-api.js';

const ownPolygon = () => ({
  type: 'Polygon',
  coordinates: [[
    [101.31, 12.71], [101.313, 12.71], [101.313, 12.712],
    [101.31, 12.712], [101.31, 12.71],
  ]],
});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const calculate = input => fileTrialAPI('', {method: 'POST', body: JSON.stringify(input)});

function assertDeeplyFrozen(value) {
  if (value === null || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value));
  for (const nested of Object.values(value)) assertDeeplyFrozen(nested);
}

test('The XEDO equipment profile is deeply immutable and each flight-settings copy is independent', () => {
  assert.equal(XEDO_HARDWARE_PROFILE.status, 'candidate');
  assertDeeplyFrozen(XEDO_HARDWARE_PROFILE);
  const before = structuredClone(XEDO_HARDWARE_PROFILE);
  assert.throws(() => { XEDO_HARDWARE_PROFILE.flightDefaults.altitudeM = 80; }, TypeError);
  assert.throws(() => { XEDO_HARDWARE_PROFILE.components[0].model = 'A confirmed replacement'; }, TypeError);
  assert.throws(() => { XEDO_HARDWARE_PROFILE.components.push({}); }, TypeError);
  const first = createHardwareFlightDefaults(), second = createHardwareFlightDefaults();
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first, XEDO_HARDWARE_PROFILE.flightDefaults);
  assert.equal(Object.isFrozen(first), false);
  first.altitudeM = 80;
  first.home = [101.31, 12.71];
  assert.equal(second.altitudeM, 50);
  assert.equal(Object.hasOwn(second, 'home'), false);
  assert.deepEqual(XEDO_HARDWARE_PROFILE, before);
});

test('The hardware metadata keeps photo-identification candidates separate from the user-confirmed Pi', () => {
  const components = XEDO_HARDWARE_PROFILE.components;
  const confirmed = components.filter(component => /confirmed/.test(component.status));
  assert.equal(confirmed.length, 1);
  assert.match(confirmed[0].model, /Raspberry\s*Pi\s*5/i);
  const motor = components.find(component => /motor/i.test(component.key + ' ' + component.label));
  const battery = components.find(component => /battery/i.test(component.key + ' ' + component.label));
  assert.ok(motor, 'The motor must remain recorded as unknown rather than inferred from the frame.');
  assert.ok(battery, 'Missing battery information must remain explicit.');
  assert.equal(motor.status, 'unknown');
  assert.equal(battery.status, 'unknown');
  for (const component of components) {
    if (component === confirmed[0]) continue;
    assert.doesNotMatch(component.status, /confirmed/);
  }
});

test('Candidate optics generate a geometric route for the user polygon without substituting the example area', () => {
  const geometry = ownPolygon(), input = createHardwareFlightDefaults();
  const beforeGeometry = structuredClone(geometry), beforeInput = structuredClone(input);
  const flight = buildTrialFlight(geometry, input);
  assert.equal(flight.state, 'generated');
  assert.equal(flight.plan.status, 'generated');
  assert.deepEqual(flight.plan.target, beforeGeometry);
  assert.ok(flight.plan.waypoints.length > 1);
  near(flight.camera.footprintAcrossM, 50 * 3.68 / 3.04);
  near(flight.camera.footprintAlongM, 50 * 2.76 / 3.04);
  near(flight.camera.lineSpacingM, 50 * 3.68 / 3.04 * 0.3);
  near(flight.camera.photoSpacingM, 50 * 2.76 / 3.04 * 0.2);
  near(flight.camera.triggerIntervalS, flight.camera.photoSpacingM / 5);
  assert.equal(flight.camera.state, 'pass');
  assert.deepEqual(geometry, beforeGeometry);
  assert.deepEqual(input, beforeInput);
});

test('A generated candidate route does not invent wind, home, battery performance or oil evidence', async () => {
  const flightInput = createHardwareFlightDefaults();
  for (const key of ['windEastMps', 'windNorthMps', 'windLimitMps', 'maxAirspeedMps', 'home', 'usableWh', 'reserveWh', 'powerW', 'takeoffS', 'landingS', 'turnS', 'firmware']) {
    assert.equal(Object.hasOwn(flightInput, key), false, key + ' must not be a hardware-profile default.');
  }
  const input = {geometry: ownPolygon(), driftEnabled: false, flight: flightInput};
  const before = structuredClone(input), result = await calculate(input);
  assert.equal(result.flight.plan.status, 'generated');
  assert.equal(result.flight.wind.state, 'incomplete');
  assert.equal(result.flight.wind.speedMps, null);
  assert.equal(result.flight.battery.state, 'incomplete');
  assert.deepEqual(result.flight.battery.sorties, []);
  assert.equal(result.flight.battery.usableWh, null);
  assert.equal(result.flight.battery.totalDistanceM, null);
  assert.equal(result.flight.settings.home, null);
  assert.equal(result.flight.home.assumed, true, 'The diagram fallback must remain explicitly assumed.');
  assert.equal(Object.hasOwn(result.inputs.flight, 'home'), false);
  assert.equal(result.exportCheck.pass, false);
  assert.equal(result.exportCheck.firmware, null);
  assert.equal(result.drift.state, 'disabled');
  assert.equal(result.oil.state, 'incomplete');
  for (const key of ['areaM2', 'volumeLowL', 'volumeHighL', 'capsulesLowKg', 'capsulesHighKg']) assert.equal(result.oil[key], null, key);
  assert.equal(result.hardwareControl, false);
  assert.equal(result.releaseControl, false);
  assert.deepEqual(input, before);
});

test('Calibration comparison is read-only and rejects changed, missing, null or nonnumeric values', () => {
  const defaults = createHardwareFlightDefaults();
  assert.equal(isHardwareProfileCalibration(defaults), true);
  for (const key of Object.keys(defaults)) {
    const altered = {...defaults, [key]: defaults[key] + 1}, before = structuredClone(altered);
    assert.equal(isHardwareProfileCalibration(altered), false, key + ' has been changed.');
    assert.deepEqual(altered, before);
    assert.equal(isHardwareProfileCalibration({...defaults, [key]: null}), false);
    const missing = {...defaults}; delete missing[key];
    assert.equal(isHardwareProfileCalibration(missing), false);
  }
  assert.equal(isHardwareProfileCalibration({...defaults, altitudeM: '50'}), false);
  assert.equal(isHardwareProfileCalibration(null), false);
  assert.equal(isHardwareProfileCalibration(undefined), false);
  assert.equal(isHardwareProfileCalibration({...defaults, home: [101.31, 12.71]}), true, 'Additional measured fields do not change candidate optics/mission values.');
  assert.deepEqual(defaults, XEDO_HARDWARE_PROFILE.flightDefaults);
});

test('Explicitly cleared calibration and restored inputs stay missing instead of being silently defaulted by the API', async () => {
  for (const key of ['altitudeM', 'sensorWidthMm']) {
    const flight = {...createHardwareFlightDefaults(), [key]: null};
    const input = {geometry: ownPolygon(), driftEnabled: false, flight};
    const before = structuredClone(input), result = await calculate(input);
    assert.equal(result.inputs.flight[key], null);
    assert.equal(result.flight.settings[key], null);
    assert.equal(result.flight.state, 'incomplete');
    assert.equal(result.flight.plan, null);
    assert.ok(result.flight.missing.includes(key));
    assert.equal(result.exportCheck.pass, false);
    assert.deepEqual(input, before);
  }
  const snapshotInput = {geometry: ownPolygon(), driftEnabled: false, flight: null};
  const restored = await calculate(structuredClone(snapshotInput));
  assert.equal(restored.inputs.flight, null);
  assert.equal(restored.flight.plan, null);
  assert.equal(restored.flight.state, 'incomplete');
  const withoutFlight = await calculate({geometry: ownPolygon(), driftEnabled: false});
  assert.equal(Object.hasOwn(withoutFlight.inputs, 'flight'), false);
  assert.equal(withoutFlight.flight.plan, null);
});

test('Supplied zero values and an explicitly cleared camera interval are retained without enabling export', async () => {
  const flight = {...createHardwareFlightDefaults(), minTriggerIntervalS: null, home: [101.31, 12.71], reserveWh: 0, takeoffS: 0, landingS: 0, turnS: 0, windEastMps: 0, windNorthMps: 0};
  const input = {geometry: ownPolygon(), driftEnabled: false, flight}, before = structuredClone(input);
  const result = await calculate(input);
  assert.equal(result.flight.plan.status, 'generated');
  assert.equal(result.flight.camera.state, 'incomplete');
  assert.equal(result.flight.settings.minTriggerIntervalS, null);
  for (const key of ['reserveWh', 'takeoffS', 'landingS', 'turnS', 'windEastMps', 'windNorthMps']) assert.equal(result.flight.settings[key], 0, key);
  assert.deepEqual(result.flight.settings.home, input.flight.home);
  assert.equal(result.flight.home.assumed, false);
  assert.equal(result.flight.battery.state, 'incomplete');
  assert.equal(result.exportCheck.pass, false);
  assert.deepEqual(input, before);
});
