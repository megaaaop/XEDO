import {applyFixedPlanningSettings} from './planning-fixed-settings.js';

function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') deepFreeze(nested);
  }
  return Object.freeze(value);
}

/** Opt-in software fixture, separate from the actual aircraft profile. */
export const ESTIMATED_DEMO_PROFILE = deepFreeze({
  id: 'xedo-estimated-demo/1',
  label: 'Estimated demo',
  status: 'estimated',
  flight: {
    usableWh: 177.6,
    reserveWh: 44.4,
    powerW: 600,
    windLimitMps: 8,
    maxAirspeedMps: 12,
    takeoffS: 30,
    landingS: 30,
    turnS: 5
  },
  battery: {
    nominalVoltageV: 22.2,
    capacityAh: 10,
    nominalWh: 222,
    startingUsableFraction: 0.8,
    reserveFractionOfStarting: 0.25,
    missionBudgetWh: 133.2
  },
  camera: {preset: 'v2', status: 'candidate'},
  firmware: {target: 'PX4', status: 'synthetic'},
  notes: [
    'All values are software-test assumptions, not measured aircraft performance or flight approval.',
    'The hypothetical 22.2 V, 10 Ah battery provides 222 Wh nominal; 80% gives 177.6 Wh starting usable energy. Reserving 25% of that leaves a 133.2 Wh mission budget.',
    'Battery voltage compatibility, battery weight and actual loaded aircraft power remain unverified.',
    'Calm flight-level wind is synthetic. Drift wind and current are separate synthetic examples, not API observations.',
    'The 8 m/s wind threshold and 12 m/s airspeed limit are test inputs, not certified operating limits.',
    'NoIR v2 remains a candidate camera; PX4 is an export-format fixture, not identification of the installed firmware.',
    'Home height, no-go polygons, ceiling, times and oil thickness are synthetic examples. Export confirmations remain unchecked.'
  ],
  hardwareControl: false,
  releaseControl: false
});

/** New mutable inputs each time; never fills or changes a real mission. */
export function createEstimatedDemoInputs(nowMs = Date.now()) {
  if (!Number.isFinite(nowMs)) throw new TypeError('The estimated-demo clock must be a finite timestamp.');
  const iso = minutes => new Date(nowMs + minutes * 60000).toISOString();
  return applyFixedPlanningSettings({
    geometry: {
      type: 'Polygon',
      coordinates: [[[101.22, 12.62], [101.222, 12.62], [101.222, 12.621], [101.22, 12.621], [101.22, 12.62]]]
    },
    driftEnabled: false,
    drift: {
      observedAt: iso(0), arriveAt: iso(10), endAt: iso(120),
      currentEastMps: 0.2, currentNorthMps: 0,
      windSpeedMps: 5, windFromDeg: 180
    },
    flight: {
      ...ESTIMATED_DEMO_PROFILE.flight,
      home: [101.22, 12.62], windEastMps: 0, windNorthMps: 0
    },
    export: {
      firmware: ESTIMATED_DEMO_PROFILE.firmware.target,
      homeAmslM: 0, ceilingM: 60, corridorM: 5,
      plannedTakeoffAt: iso(15), plannedEndAt: iso(120), validUntil: iso(180),
      source: 'Estimated demo: synthetic constraints only; no current airspace clearance or installed firmware verification.',
      noGo: {type: 'FeatureCollection', features: []},
      homeConfirmed: false, flatSurfaceConfirmed: false, airspaceReviewed: false
    },
    oil: {pixelCount: 2500000, gsdM: 0.02, thicknessLowUm: 10, thicknessHighUm: 30, emulsion: false}
  });
}
