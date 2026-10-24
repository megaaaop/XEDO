import test from 'node:test';
import assert from 'node:assert/strict';
import {XEDO_HARDWARE_PROFILE} from '../src/planning-hardware-profile.js';
import {FIXED_PLANNING_SETTINGS, FIXED_SEARCH_SETTINGS, isFixedPlanningField, applyFixedPlanningSettings, fixedSettingConflicts} from '../src/planning-fixed-settings.js';
import {fileTrialAPI} from '../src/planning-file-api.js';

const ownPolygon = () => ({type: 'Polygon', coordinates: [[[101.31, 12.71], [101.313, 12.71], [101.313, 12.712], [101.31, 12.712], [101.31, 12.71]]]});
function assertFrozen(value) {
  if (value === null || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value));
  for (const nested of Object.values(value)) assertFrozen(nested);
}

test('Fixed constants are deeply immutable and match the single candidate hardware profile', () => {
  assertFrozen(FIXED_PLANNING_SETTINGS);
  assertFrozen(FIXED_SEARCH_SETTINGS);
  assert.deepEqual(FIXED_PLANNING_SETTINGS.flight, XEDO_HARDWARE_PROFILE.flightDefaults);
  for (const group of ['drift', 'oil', 'export']) assert.deepEqual(FIXED_PLANNING_SETTINGS[group], XEDO_HARDWARE_PROFILE.fixedDefaults[group]);
  assert.deepEqual(FIXED_SEARCH_SETTINGS, XEDO_HARDWARE_PROFILE.satelliteDefaults);
  assert.deepEqual(FIXED_SEARCH_SETTINGS, {maxCloud: 80, lookbackDays: 30});
  assert.deepEqual(FIXED_PLANNING_SETTINGS.drift, {alpha: .03, alphaMin: .025, alphaMax: .04, marginM: 0});
  assert.deepEqual(FIXED_PLANNING_SETTINGS.oil, {densityGml: .86, capacityGg: 3.42, allowance: 1.5, targetFraction: 1});
  assert.deepEqual(FIXED_PLANNING_SETTINGS.export, {qgcVersion: '5.1.0', limitReference: 'relative_home', relativeHeightM: 50});
  assert.equal(FIXED_PLANNING_SETTINGS.export.relativeHeightM, FIXED_PLANNING_SETTINGS.flight.altitudeM);
  assert.equal(XEDO_HARDWARE_PROFILE.status, 'candidate');
  assert.throws(() => { FIXED_PLANNING_SETTINGS.flight.altitudeM = 99; }, TypeError);
  assert.throws(() => { FIXED_PLANNING_SETTINGS.oil.allowance = 0; }, TypeError);
  assert.throws(() => { FIXED_SEARCH_SETTINGS.maxCloud = 0; }, TypeError);
});

test('Field detection only accepts own configured fields, not dynamic measurements or inherited names', () => {
  for (const [group, settings] of Object.entries(FIXED_PLANNING_SETTINGS)) {
    for (const key of Object.keys(settings)) assert.equal(isFixedPlanningField(group, key), true);
  }
  for (const [group, key] of [['flight', 'usableWh'], ['flight', 'home'], ['drift', 'currentEastMps'], ['oil', 'areaM2'], ['oil', 'gsdM'], ['export', 'firmware'], ['export', 'homeConfirmed'], ['export', 'flatSurfaceConfirmed'], ['export', 'airspaceReviewed'], ['flight', 'toString'], ['toString', 'name'], ['__proto__', 'name'], ['satellite', 'maxCloud']]) {
    assert.equal(isFixedPlanningField(group, key), false, `${group}.${key}`);
  }
  assert.equal(isFixedPlanningField(null, null), false);
  assert.equal(isFixedPlanningField(undefined, undefined), false);
});

test('Missing fixed groups are supplied without fabricating any unknown mission measurements', () => {
  const input = {geometry: ownPolygon(), driftEnabled: false};
  const before = structuredClone(input), output = applyFixedPlanningSettings(input);
  assert.deepEqual(input, before);
  assert.notStrictEqual(output.geometry, input.geometry);
  for (const [group, settings] of Object.entries(FIXED_PLANNING_SETTINGS)) assert.deepEqual(output[group], settings);
  const unknown = {
    flight: ['home', 'windEastMps', 'windNorthMps', 'windLimitMps', 'maxAirspeedMps', 'usableWh', 'reserveWh', 'powerW', 'takeoffS', 'landingS', 'turnS'],
    drift: ['observedAt', 'arriveAt', 'endAt', 'currentEastMps', 'currentNorthMps', 'windSpeedMps', 'windFromDeg'],
    oil: ['areaM2', 'pixelCount', 'gsdM', 'gsdYM', 'thicknessLowUm', 'thicknessHighUm', 'emulsion', 'oilFraction'],
    export: ['firmware', 'homeAmslM', 'ceilingM', 'corridorM', 'plannedTakeoffAt', 'validUntil', 'source', 'noGo', 'homeConfirmed', 'flatSurfaceConfirmed', 'airspaceReviewed']
  };
  for (const [group, keys] of Object.entries(unknown)) for (const key of keys) assert.equal(Object.hasOwn(output[group], key), false, `${group}.${key}`);
  assert.equal(Object.hasOwn(output, 'sortieIndex'), false);
  output.flight.altitudeM = 100;
  output.geometry.coordinates[0][0][0] = 1;
  assert.equal(FIXED_PLANNING_SETTINGS.flight.altitudeM, 50);
  assert.deepEqual(input, before);
});

test('Known fixed fields override changed values but dynamic zero, null and false remain unchanged', () => {
  const input = {
    geometry: ownPolygon(), driftEnabled: false, sortieIndex: 0,
    flight: {altitudeM: 90, sideOverlap: 0, home: [101.31, 12.71], reserveWh: 0, takeoffS: 0, landingS: 0, turnS: 0, windEastMps: 0, windNorthMps: 0, usableWh: null},
    drift: {alpha: null, currentEastMps: 0, currentNorthMps: null, observedAt: null},
    oil: {capacityGg: 99, pixelCount: null, areaM2: 0, oilFraction: 0, emulsion: false},
    export: {qgcVersion: null, homeAmslM: 0, source: null, noGo: {type: 'FeatureCollection', features: []}, homeConfirmed: false, flatSurfaceConfirmed: false, airspaceReviewed: false}
  };
  const before = structuredClone(input), output = applyFixedPlanningSettings(input);
  for (const [group, settings] of Object.entries(FIXED_PLANNING_SETTINGS)) for (const [key, value] of Object.entries(settings)) assert.equal(output[group][key], value);
  for (const key of ['reserveWh', 'takeoffS', 'landingS', 'turnS', 'windEastMps', 'windNorthMps']) assert.equal(output.flight[key], 0, key);
  assert.equal(output.flight.usableWh, null);
  assert.deepEqual(output.flight.home, input.flight.home);
  assert.notStrictEqual(output.flight.home, input.flight.home);
  assert.equal(output.drift.currentEastMps, 0);
  assert.equal(output.drift.currentNorthMps, null);
  assert.equal(output.drift.observedAt, null);
  assert.equal(output.oil.pixelCount, null);
  assert.equal(output.oil.areaM2, 0);
  assert.equal(output.oil.oilFraction, 0);
  assert.equal(output.oil.emulsion, false);
  assert.equal(output.export.source, null);
  assert.equal(output.export.homeAmslM, 0);
  assert.notStrictEqual(output.export.noGo, input.export.noGo);
  for (const key of ['homeConfirmed', 'flatSurfaceConfirmed', 'airspaceReviewed']) assert.equal(output.export[key], false, key);
  assert.equal(output.driftEnabled, false);
  assert.equal(output.sortieIndex, 0);
  assert.deepEqual(input, before);
});

test('Each manual review flag retains true, false, null or absence without being prechecked', () => {
  const flags = ['homeConfirmed', 'flatSurfaceConfirmed', 'airspaceReviewed'];
  for (const value of [true, false, null]) {
    const input = {export: Object.fromEntries(flags.map(key => [key, value]))};
    const output = applyFixedPlanningSettings(input);
    assert.deepEqual(fixedSettingConflicts(input), []);
    for (const key of flags) assert.equal(output.export[key], value);
  }
  for (const key of flags) assert.equal(Object.hasOwn(applyFixedPlanningSettings({}).export, key), false);
});

test('Missing and matching snapshot fields are compatible without mutating the snapshot', () => {
  assert.deepEqual(fixedSettingConflicts({}), []);
  assert.deepEqual(fixedSettingConflicts({flight: {}, export: {homeConfirmed: false}}), []);
  const input = applyFixedPlanningSettings({geometry: ownPolygon(), driftEnabled: false, flight: {home: [101.31, 12.71], reserveWh: 0}, export: {homeConfirmed: false}});
  const before = structuredClone(input);
  assert.deepEqual(fixedSettingConflicts(input), []);
  assert.deepEqual(applyFixedPlanningSettings(input), input);
  assert.deepEqual(input, before);
});

test('Every explicitly changed fixed field reports its path, including null, undefined and type mismatch', () => {
  for (const [group, settings] of Object.entries(FIXED_PLANNING_SETTINGS)) {
    for (const [key, value] of Object.entries(settings)) {
      for (const changed of [null, undefined, typeof value === 'number' ? String(value) : value + '-changed']) {
        const input = {[group]: {[key]: changed}}, before = structuredClone(input);
        assert.deepEqual(fixedSettingConflicts(input), [`${group}.${key}`]);
        assert.deepEqual(input, before);
      }
    }
  }
  assert.deepEqual(fixedSettingConflicts({flight: {altitudeM: 80}, oil: {capacityGg: 1}, export: {firmware: null}}), ['flight.altitudeM', 'oil.capacityGg']);
});

test('Invalid explicit groups conflict and policy rejects them atomically rather than replacing them', () => {
  for (const group of Object.keys(FIXED_PLANNING_SETTINGS)) {
    for (const invalid of [null, undefined, false, 0, '', [], new Date(0)]) {
      const input = {geometry: ownPolygon(), [group]: invalid}, before = structuredClone(input);
      assert.deepEqual(fixedSettingConflicts(input), [group]);
      assert.throws(() => applyFixedPlanningSettings(input), TypeError);
      assert.deepEqual(input, before);
    }
  }
  for (const invalid of [null, undefined, false, 0, [], new Date(0)]) {
    assert.throws(() => fixedSettingConflicts(invalid), TypeError);
    assert.throws(() => applyFixedPlanningSettings(invalid), TypeError);
  }
});

test('Policy expects overlap fractions and does not mutate UI-unit percentage inputs', () => {
  const input = {flight: {sideOverlap: .7, frontOverlap: .8}}, before = structuredClone(input);
  assert.deepEqual(fixedSettingConflicts(input), []);
  const output = applyFixedPlanningSettings(input);
  assert.equal(output.flight.sideOverlap, .7);
  assert.equal(output.flight.frontOverlap, .8);
  const percentages = {flight: {sideOverlap: 70, frontOverlap: 80}}, percentBefore = structuredClone(percentages);
  assert.deepEqual(fixedSettingConflicts(percentages), ['flight.sideOverlap', 'flight.frontOverlap']);
  assert.equal(applyFixedPlanningSettings(percentages).flight.sideOverlap, .7);
  assert.deepEqual(input, before);
  assert.deepEqual(percentages, percentBefore);
});

test('Frozen inputs and repeated application are independent and idempotent', () => {
  const input = Object.freeze({flight: Object.freeze({windEastMps: 0}), driftEnabled: false});
  const first = applyFixedPlanningSettings(input), second = applyFixedPlanningSettings(first);
  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.flight, second.flight);
  assert.equal(Object.hasOwn(input.flight, 'altitudeM'), false);
});

test('Policy produces a nonzero route for the actual polygon but unknown dynamics keep export blocked', async () => {
  const input = {geometry: ownPolygon(), driftEnabled: false, export: {homeConfirmed: false, flatSurfaceConfirmed: false, airspaceReviewed: false}};
  const before = structuredClone(input), settings = applyFixedPlanningSettings(input);
  const result = await fileTrialAPI('', {method: 'POST', body: JSON.stringify(settings)});
  assert.equal(result.flight.state, 'generated');
  assert.equal(result.flight.plan.status, 'generated');
  assert.deepEqual(result.flight.plan.target, input.geometry);
  assert.ok(result.flight.plan.waypoints.length > 1);
  assert.deepEqual(result.inputs.flight, XEDO_HARDWARE_PROFILE.flightDefaults);
  assert.equal(result.flight.camera.state, 'pass');
  assert.equal(result.flight.wind.state, 'incomplete');
  assert.equal(result.flight.wind.speedMps, null);
  assert.equal(result.flight.battery.state, 'incomplete');
  assert.deepEqual(result.flight.battery.sorties, []);
  assert.equal(result.flight.settings.home, null);
  assert.equal(result.flight.home.assumed, true);
  assert.equal(result.oil.state, 'incomplete');
  assert.equal(result.oil.areaM2, null);
  assert.equal(result.oil.volumeLowL, null);
  assert.equal(result.exportCheck.pass, false);
  for (const key of ['homeConfirmed', 'flatSurfaceConfirmed', 'airspaceReviewed']) assert.equal(result.inputs.export[key], false);
  assert.equal(result.hardwareControl, false);
  assert.equal(result.releaseControl, false);
  await assert.rejects(() => fileTrialAPI('/export', {method: 'POST', body: JSON.stringify(settings)}), error => error.code === 'TRIAL_CHECKS_INCOMPLETE');
  assert.deepEqual(input, before);
});
