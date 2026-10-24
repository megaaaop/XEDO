import {XEDO_HARDWARE_PROFILE} from './planning-hardware-profile.js';

function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') deepFreeze(nested);
  }
  return Object.freeze(value);
}

/** Project policy for the planner UI, independent of generic calculator APIs. */
export const FIXED_PLANNING_SETTINGS = deepFreeze({
  flight: {...XEDO_HARDWARE_PROFILE.flightDefaults},
  drift: {...XEDO_HARDWARE_PROFILE.fixedDefaults.drift},
  oil: {...XEDO_HARDWARE_PROFILE.fixedDefaults.oil},
  export: {...XEDO_HARDWARE_PROFILE.fixedDefaults.export}
});
export const FIXED_SEARCH_SETTINGS = deepFreeze({...XEDO_HARDWARE_PROFILE.satelliteDefaults});

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  // Also accepts plain records from another JS realm, such as imported data.
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
function requireRecord(input) {
  if (!isRecord(input)) throw new TypeError('Planning inputs must be an object.');
}

export function isFixedPlanningField(group, key) {
  return Object.hasOwn(FIXED_PLANNING_SETTINGS, group) &&
    Object.hasOwn(FIXED_PLANNING_SETTINGS[group], key);
}

/** Clone mission inputs and enforce only the explicitly listed project fields. */
export function applyFixedPlanningSettings(input) {
  requireRecord(input);
  for (const group of Object.keys(FIXED_PLANNING_SETTINGS)) {
    if (Object.hasOwn(input, group) && !isRecord(input[group])) {
      throw new TypeError('Planning input group '+group+' must be an object.');
    }
  }
  const copy = structuredClone(input);
  for (const [group, settings] of Object.entries(FIXED_PLANNING_SETTINGS)) {
    copy[group] = {...copy[group], ...settings};
  }
  return copy;
}

/** Check a snapshot before any current mission state is changed. */
export function fixedSettingConflicts(input) {
  requireRecord(input);
  const conflicts = [];
  for (const [group, settings] of Object.entries(FIXED_PLANNING_SETTINGS)) {
    if (!Object.hasOwn(input, group)) continue;
    if (!isRecord(input[group])) { conflicts.push(group); continue; }
    for (const [key, expected] of Object.entries(settings)) {
      if (Object.hasOwn(input[group], key) && input[group][key] !== expected) conflicts.push(group+'.'+key);
    }
  }
  return conflicts;
}
