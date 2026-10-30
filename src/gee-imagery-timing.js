// Fixed names only: no coordinates, credentials, session IDs or upstream URLs.
const names = new Set(['xedo_core', 'gee_upstream', 'gee_auth', 'gee_metadata', 'gee_pixels', 'gee_map', 'gee_tiles','gee_cache_lookup','gee_cache_read','gee_cache_validate','gee_cache_write']);
const metric='(?:'+[...names].join('|')+');dur=\\d+(?:\\.\\d{1,2})?';
const timingPattern = new RegExp('^'+metric+'(?:, '+metric+')*$');

export function safeImageryTimingHeader(value) {
  return typeof value === 'string' && value.length <= 512 && timingPattern.test(value) ? value : null;
}

export function imageryTiming({clock = () => performance.now()} = {}) {
  const started = clock(), totals = new Map();
  const record = (name, duration) => {
    if (names.has(name) && name !== 'xedo_core' && Number.isFinite(duration) && duration >= 0) {
      totals.set(name, Math.min(600000, (totals.get(name) || 0) + duration));
    }
  };
  return {
    record,
    finish(response) {
      if (!(response instanceof Response)) return response;
      const elapsed = clock() - started;
      totals.set('xedo_core', Number.isFinite(elapsed) ? Math.min(600000, Math.max(0, elapsed)) : 0);
      const headers = new Headers(response.headers);
      headers.set('Server-Timing', [...totals].map(([name, duration]) => `${name};dur=${duration.toFixed(2)}`).join(', '));
      return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
    },
  };
}
