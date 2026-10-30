/** Editable planning assumptions, not a provider's flight permission or review. */
export const EXPORT_PLANNING_PROFILE = Object.freeze({
  id: 'xedo-export-planning-v1',
  ceilingM: 60,
  corridorM: 5,
  source: 'XEDO planning profile v1 · planning assumptions'
});

const KEYS = ['ceilingM', 'corridorM', 'validUntil', 'source'];
const empty = value => value == null || value === '';
function valueOf(key, value) {
  if (empty(value)) return null;
  if (key === 'validUntil' && typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return value;
}
function missionEnd(value) {
  const normalized = valueOf('validUntil', value);
  return typeof normalized === 'string' && /Z$/.test(normalized) && Number.isFinite(Date.parse(normalized)) ? normalized : null;
}

/** Own only automatically filled values; manual edits, including blanks, win. */
export function createPlanningExportDefaults() {
  let automatic = Object.fromEntries(KEYS.map(key => [key, true]));
  let last = {};

  function reconcile(settings = {}) {
    const desired = {...EXPORT_PLANNING_PROFILE, validUntil: missionEnd(settings.plannedEndAt)};
    const patch = {};
    for (const key of KEYS) {
      if (!automatic[key]) continue;
      const current = valueOf(key, settings[key]);
      if (Object.hasOwn(last, key) ? current !== last[key] : current !== null) {
        automatic[key] = false;
        continue;
      }
      if (current !== desired[key]) patch[key] = desired[key];
      last[key] = desired[key];
    }
    return patch;
  }

  function edited(key) { if (KEYS.includes(key)) automatic[key] = false; }
  function reset(settings = {}) {
    automatic = Object.fromEntries(KEYS.map(key => [key, true]));
    last = Object.fromEntries(KEYS.map(key => [key, valueOf(key, settings[key])]));
  }
  function metadata(settings = {}) {
    return {version: 1, profileId: EXPORT_PLANNING_PROFILE.id,
      fields: Object.fromEntries(KEYS.map(key => [key, {
        mode: automatic[key] ? 'automatic' : 'manual', value: valueOf(key, settings[key])
      }]))};
  }
  function restore(settings = {}) {
    last = {};
    const saved = settings.planningDefaults;
    for (const key of KEYS) {
      const current = valueOf(key, settings[key]), record = saved?.fields?.[key];
      // Older missions retain supplied values. Their missing fields may use defaults.
      automatic[key] = saved == null ? current === null :
        saved.version === 1 && saved.profileId === EXPORT_PLANNING_PROFILE.id &&
        record?.mode === 'automatic' && valueOf(key, record.value) === current;
      if (automatic[key]) last[key] = current;
    }
  }
  return {reconcile, edited, reset, metadata, restore};
}
