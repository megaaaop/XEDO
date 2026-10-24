/**
 * Fixed equipment candidates for the project's custom-built aircraft.
 * Photo/AI identifications are not calibrated aircraft specifications.
 * Edit this one profile when the installed equipment is verified.
 */
function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') deepFreeze(nested);
  }
  return Object.freeze(value);
}

export const XEDO_HARDWARE_PROFILE = deepFreeze({
  id: 'xedo-prototype-01',
  name: 'XEDO Prototype 01',
  status: 'candidate',
  cameraPreset: 'v2',
  cameraLabel: 'Candidate NoIR v2',
  components: [
    {key: 'frame', label: 'Frame', model: 'Tarot 650 Sport', status: 'candidate', wheelbaseMm: 650, notes: '650 mm folding frame; identification from the supplied AI equipment list.'},
    {key: 'controller', label: 'Flight controller', model: 'CubePilot Cube / Pixhawk 2.1', status: 'candidate', variants: ['Cube Black', 'Cube Orange'], notes: 'Variant and installed firmware are unverified.'},
    {key: 'carrierBoard', label: 'Carrier board', model: 'ADS-B Carrier Board', status: 'candidate', notes: 'Carrier markings do not identify the installed PX4 or ArduPilot firmware.'},
    {key: 'gps', label: 'GNSS', model: 'CubePilot Here', status: 'candidate', variants: ['Here2', 'Here3'], notes: 'Exact variant is unverified.'},
    {key: 'telemetry', label: 'Telemetry', model: '3DR Radio Telemetry', status: 'candidate', frequencyMHz: 433, notes: 'Frequency and model are candidates from the supplied list.'},
    {key: 'receiver', label: 'Radio receiver', model: 'FlySky FS-iA6B', status: 'candidate'},
    {key: 'propellers', label: 'Propellers', model: 'Folding carbon propellers', status: 'candidate', diameterRangeIn: [15, 16], notes: 'Exact diameter, pitch and manufacturer remain unknown.'},
    {key: 'motors', label: 'Motors', model: null, status: 'unknown', notes: 'Only a partial …MAX marking was reported; no motor or power rating is assumed.'},
    {key: 'camera', label: 'Planning camera', model: 'Raspberry Pi Camera Module 2 NoIR', status: 'candidate', alternatives: ['Camera Module 3 NoIR', 'Camera Module 3 NoIR Wide'], notes: 'The v2 stock-lens/full-sensor specification is a planning candidate, not an identification of the installed camera.'},
    {key: 'computer', label: 'Companion computer', model: 'Raspberry Pi 5', status: 'confirmed', notes: 'Board model supplied directly by the project owner; this does not confirm the camera.'},
    {key: 'statusLights', label: 'Status lighting', model: '3-colour status LED set', status: 'candidate'},
    {key: 'dispenser', label: 'Capsule dispenser', model: '3D-printed capsule dispenser', status: 'candidate', notes: 'Payload capacity and release control are unverified.'},
    {key: 'battery', label: 'Battery', model: null, status: 'unknown', notes: 'Voltage, capacity, usable energy, reserve and loaded-flight power remain unknown.'}
  ],
  // Camera Module 2 stock-lens/full-sensor specification, used as a candidate.
  // Height, ground speed, overlap and interval are explicit preview assumptions.
  // No weather, home, battery, firmware, airspace or oil evidence is invented.
  flightDefaults: {
    sensorWidthMm: 3.68,
    sensorHeightMm: 2.76,
    focalLengthMm: 3.04,
    imageWidthPx: 3280,
    imageHeightPx: 2464,
    sideOverlap: 0.7,
    frontOverlap: 0.8,
    minTriggerIntervalS: 1,
    altitudeM: 50,
    speedMps: 5
  },
  // Locked trial policy; these values do not verify the aircraft or environment.
  fixedDefaults: {
    drift: {alpha: 0.03, alphaMin: 0.025, alphaMax: 0.04, marginM: 0},
    oil: {densityGml: 0.86, capacityGg: 3.42, allowance: 1.5, targetFraction: 1},
    export: {qgcVersion: '5.1.0', limitReference: 'relative_home', relativeHeightM: 50}
  },
  satelliteDefaults: {maxCloud: 80, lookbackDays: 30},
  cameraSpecification: 'https://www.raspberrypi.com/documentation/accessories/camera.html'
});

/** Independent mutable copy for generic callers; the planner uses fixed policy. */
export function createHardwareFlightDefaults() {
  return {...XEDO_HARDWARE_PROFILE.flightDefaults};
}

/** Only describes the chosen calibration; it never modifies or validates inputs. */
export function isHardwareProfileCalibration(flight) {
  return !!flight && typeof flight === 'object' && !Array.isArray(flight) &&
    Object.entries(XEDO_HARDWARE_PROFILE.flightDefaults).every(([key, value]) => flight[key] === value);
}
