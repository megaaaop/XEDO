import {record} from './storage.js';
import {invalid} from './planning.js';
import {TRACK_LIMIT, summarizeTrack} from './drone-track.js';

export async function readDeviceTrack(req, env, db, device, url, deviceState) {
  if (req.method !== 'GET') invalid('METHOD_NOT_ALLOWED', 'Use GET to read a device track.', 405);
  const mode = url.searchParams.get('mode') || device.sourceMode;
  if (!['live', 'replay'].includes(mode) || mode === 'live' && device.sourceMode !== 'live') {
    invalid('INVALID_SOURCE_MODE', 'Choose a live device or a recorded replay stream.');
  }
  const stored = await record(db, 'STATE_' + device.id + '_' + mode);
  const now = Date.now(), state = deviceState(device, stored, Boolean(env.XEDO_PI_TOKEN));
  // The existing sequence index supports this bounded current-boot snapshot.
  const rows = state.latest ? await db.all(
    'SELECT payload FROM telemetry WHERE device_id=? AND mode=? AND boot_id=? AND sequence<=? ORDER BY sequence DESC LIMIT ?',
    device.id, mode, state.latest.boot_id, state.latest.sequence, TRACK_LIMIT + 1
  ) : [];
  const events = rows.slice(0, TRACK_LIMIT).reverse().map(row => JSON.parse(row.payload));
  return {...state, source_mode: mode, events, ...summarizeTrack(state, events, now),
    truncated: rows.length > TRACK_LIMIT, history_limit: TRACK_LIMIT,
    server_time: new Date(now).toISOString(), hardware_tested: false};
}
