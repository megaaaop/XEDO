// Position history is kept per device boot. A heartbeat alone is not a GPS fix.
export const TRACK_LIMIT = 300;
export const TRACK_GAP_S = 10;

export function validFix(event) {
  const p = event?.position;
  return p?.valid === true && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
    && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
}

export function metres(a, b) {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function trackSegments(events) {
  const segments = [];
  let current = [], previous = null;
  for (const event of events) {
    if (!validFix(event)) { current = []; previous = null; continue; }
    const dt = previous ? (Date.parse(event.observed_at) - Date.parse(previous.observed_at)) / 1000 : 0;
    if (!previous || previous.boot_id !== event.boot_id || !(dt > 0 && dt <= TRACK_GAP_S)) {
      current = [];
      segments.push(current);
    }
    current.push([event.position.longitude, event.position.latitude]);
    previous = event;
  }
  return segments;
}

export function positionStatus(state, fix, now = Date.now()) {
  if (!fix) return state.latest ? 'invalid' : 'waiting';
  if (!validFix(state.latest)) return 'invalid';
  if (state.connection === 'disconnected' || state.latest?.health?.agent === 'disconnected') return 'disconnected';
  if (fix.clock_quality !== 'synced') return 'clock_unknown';
  const age = (now - Date.parse(fix.observed_at)) / 1000;
  if (!Number.isFinite(age) || age < -5) return 'clock_unknown';
  if (age > 15) return 'disconnected';
  if (age > 5 || state.connection === 'stale') return 'stale';
  return 'current';
}

export function summarizeTrack(state, events, now = Date.now()) {
  const fix = events.findLast(validFix) || (validFix(state.latest) ? state.latest : null);
  const segments = trackSegments(events);
  const distance_m = segments.reduce((sum, segment) => sum + segment.slice(1).reduce((s, p, i) => s + metres(segment[i], p), 0), 0);
  const last = events.at(-1), previous = events.at(-2);
  const dt = last && previous ? (Date.parse(last.observed_at) - Date.parse(previous.observed_at)) / 1000 : 0;
  const speed_m_s = validFix(last) && validFix(previous) && last.boot_id === previous.boot_id && dt > 0 && dt <= TRACK_GAP_S
    ? metres([previous.position.longitude, previous.position.latitude], [last.position.longitude, last.position.latitude]) / dt : null;
  return {fix, segments, distance_m, speed_m_s, position_status: positionStatus(state, fix, now),
    position_age_s: fix ? Math.max(0, (now - Date.parse(fix.observed_at)) / 1000) : null};
}
