const MAX_AGE_MS = 10 * 60 * 1000;
const CANCELLED = Symbol('cancelled environment request');
const SERIES = ['wind10m', 'flightWind', 'currentSurface'];
const copy = value => structuredClone(value);

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Owns the lifetime of automatic environmental inputs, without touching forms,
 * calculations, or manual review flags. The UI clears only auto-owned inputs in
 * onRevoke and derives calculator patches from the full response in onApply.
 */
export function createPlanningEnvironmentController({
  request, getContext, onState = () => {}, onApply = () => {}, onRevoke = () => {},
  now = Date.now, timers = globalThis, debounceMs = 500,
  refreshMs = MAX_AGE_MS, requestTimeoutMs = 30000
} = {}) {
  if (typeof request !== 'function' || typeof getContext !== 'function') {
    throw new TypeError('Environment request and getContext callbacks are required.');
  }
  for (const [name, value] of Object.entries({debounceMs, refreshMs, requestTimeoutMs})) {
    if (!Number.isFinite(value) || value < 0 || (name !== 'debounceMs' && value === 0)) {
      throw new TypeError(name+' must be a finite positive duration.');
    }
  }
  if (typeof timers.setTimeout !== 'function' || typeof timers.clearTimeout !== 'function') {
    throw new TypeError('Environment timers must provide setTimeout and clearTimeout.');
  }
  const later = (fn, ms) => timers.setTimeout(fn, ms);
  const clear = id => { if (id !== null) timers.clearTimeout(id); };
  const refreshEvery = Math.min(refreshMs, MAX_AGE_MS);
  let active = true, disposed = false, revision = 0, running = null;
  let debounceTimer = null, periodicTimer = null, expiryTimer = null;
  let ownsValues = false, signature = null;
  let state = {
    status: 'waiting', reason: 'Select an area and mission time.', key: null,
    requestedAt: null, fetchedAt: null, expiresAt: null, response: null
  };

  function snapshot() {
    return copy({...state, active: active && !disposed, revision,
      ready: state.status === 'ready' && Date.parse(state.expiresAt) > now()});
  }
  function emit() { onState(snapshot()); }
  function revoke(reason) {
    if (!ownsValues) return;
    ownsValues = false;
    onRevoke({reason, key: state.key, revision});
  }
  function clearScheduled() {
    clear(debounceTimer); clear(periodicTimer); clear(expiryTimer);
    debounceTimer = periodicTimer = expiryTimer = null;
  }
  function cancelRequest() {
    if (!running) return;
    const previous = running;
    running = null;
    clear(previous.timeout);
    previous.abort.abort();
    previous.cancel();
  }
  function context() {
    if (disposed) return {mode: 'inactive', reason: 'Environment checks stopped.', signature: 'disposed'};
    if (!active) return {mode: 'inactive', reason: 'Environment checks paused.', signature: 'inactive'};
    const input = getContext();
    if (!record(input)) throw new TypeError('Environment context must be an object.');
    for (const [flag, reason] of [
      ['example', 'Test data is kept separate from automatic environmental inputs.'],
      ['manual', 'Manual environmental inputs are selected.'],
      ['localFile', 'Live environmental data needs the local backend.'],
      ['offline', 'The browser is offline.']
    ]) {
      if (input[flag] === true) return {mode: flag === 'offline' ? 'offline' : 'skipped', reason, signature: flag};
    }
    if (input.eligible !== true || !record(input.geometry) ||
      typeof input.startAt !== 'string' || !Number.isFinite(Date.parse(input.startAt)) ||
      typeof input.endAt !== 'string' || !Number.isFinite(Date.parse(input.endAt)) ||
      Date.parse(input.endAt) < Date.parse(input.startAt) ||
      !Number.isFinite(input.altitudeM) || input.altitudeM <= 0) {
      return {mode: 'waiting', reason: 'Select an area and a valid mission time.', signature: 'ineligible'};
    }
    const payload = copy({geometry: input.geometry, startAt: input.startAt,
      endAt: input.endAt, altitudeM: input.altitudeM});
    const key = JSON.stringify({geometry: payload.geometry, startAt: Date.parse(payload.startAt),
      endAt: Date.parse(payload.endAt), altitudeM: payload.altitudeM});
    return {mode: 'eligible', payload, key, signature: key};
  }
  function blocked(current) {
    ++revision;
    clearScheduled(); cancelRequest(); revoke(current.reason);
    signature = current.signature;
    state = {status: current.mode, reason: current.reason, key: null,
      requestedAt: null, fetchedAt: null, expiresAt: null, response: null};
    emit();
    return snapshot();
  }
  function failContext(error) {
    return blocked({mode: 'error', signature: 'invalid-context', reason: error.message || 'Invalid environment context.'});
  }
  function fresh() {
    return state.response !== null && Number.isFinite(Date.parse(state.expiresAt)) &&
      Date.parse(state.expiresAt) > now();
  }
  function armPeriodic() {
    clear(periodicTimer);
    periodicTimer = later(() => { periodicTimer = null; void refresh({force: true}); }, refreshEvery);
  }
  function expired() {
    if (disposed) return;
    clear(expiryTimer); expiryTimer = null;
    revoke('Environmental data expired.');
    state = {...state, status: 'stale', reason: 'Environmental data expired. Refreshing is required.', response: null};
    emit();
  }
  function validResponse(response, payload) {
    if (!record(response) || !['complete', 'partial', 'unavailable'].includes(response.state)) {
      throw new TypeError('The environmental service returned an invalid response.');
    }
    const fetched = Date.parse(response.fetchedAt), expires = Date.parse(response.expiresAt);
    if (!Number.isFinite(fetched) || !Number.isFinite(expires) || fetched > now()+60000) {
      throw new TypeError('The environmental service did not provide valid freshness times.');
    }
    const returned = response.request;
    if (!record(returned) || JSON.stringify(returned.geometry) !== JSON.stringify(payload.geometry) ||
      Date.parse(returned.startAt) !== Date.parse(payload.startAt) ||
      Date.parse(returned.endAt) !== Date.parse(payload.endAt) || returned.altitudeM !== payload.altitudeM) {
      throw new TypeError('Environmental data does not match the selected area and time.');
    }
    return Math.min(expires, fetched+MAX_AGE_MS, now()+MAX_AGE_MS);
  }

  /** Invalidate changed AOI/time/height immediately, then debounce its request. */
  function changed() {
    let current;
    try { current = context(); } catch (error) { return failContext(error); }
    if (current.mode !== 'eligible') {
      if (signature === current.signature && state.status === current.mode) return snapshot();
      return blocked(current);
    }
    if (signature === current.signature && (running || debounceTimer !== null || fresh())) return snapshot();
    ++revision;
    clearScheduled(); cancelRequest(); revoke('Selected area or mission time changed.');
    signature = current.signature;
    state = {status: 'waiting', reason: 'Checking the selected area and time…', key: current.key,
      requestedAt: null, fetchedAt: null, expiresAt: null, response: null};
    debounceTimer = later(() => { debounceTimer = null; void refresh(); }, debounceMs);
    emit();
    return snapshot();
  }

  /** Resolve with controller state; provider failures never become calm values. */
  function refresh({force = false} = {}) {
    let current;
    try { current = context(); } catch (error) { return Promise.resolve(failContext(error)); }
    if (current.mode !== 'eligible') return Promise.resolve(blocked(current));
    if (!force && current.key === state.key && running) return running.promise;
    if (!force && current.key === state.key && fresh()) return Promise.resolve(snapshot());
    ++revision;
    clearScheduled(); cancelRequest(); revoke('Environmental data is being checked again.');
    signature = current.signature;
    const token = {revision, key: current.key, abort: new AbortController(), timeout: null};
    const cancelled = new Promise(resolve => { token.cancel = () => resolve(CANCELLED); });
    const deadline = new Promise((resolve, reject) => {
      token.timeout = later(() => {
        token.abort.abort();
        reject(new Error('The environmental service timed out.'));
      }, requestTimeoutMs);
    });
    state = {status: 'loading', reason: 'Checking wind and surface currents…', key: current.key,
      requestedAt: new Date(now()).toISOString(), fetchedAt: null, expiresAt: null, response: null};
    const latest = () => !disposed && active && running === token && token.revision === revision;
    const task = Promise.resolve().then(() => {
      if (!latest()) return CANCELLED;
      return Promise.race([request(copy(current.payload), {signal: token.abort.signal}), cancelled, deadline]);
    }).then(response => {
      if (response === CANCELLED || !latest()) return snapshot();
      const present = context();
      if (present.mode !== 'eligible' || present.key !== token.key) { changed(); return snapshot(); }
      const expires = validResponse(response, current.payload);
      if (expires <= now()) {
        state = {...state, status: 'stale', reason: 'The environmental service returned expired data.',
          fetchedAt: response.fetchedAt, expiresAt: new Date(expires).toISOString(), response: null};
      } else {
        const complete = response.state === 'complete' && SERIES.every(name =>
          response.series?.[name]?.status === 'complete' && response.series[name].freshness?.state === 'fresh');
        state = {...state, status: response.state === 'unavailable' ? 'unavailable' : complete ? 'ready' : 'partial',
          reason: complete ? 'Environmental data checked.' : 'Some environmental data is unavailable or unverified.',
          fetchedAt: response.fetchedAt, expiresAt: new Date(expires).toISOString(), response: copy(response)};
        if (response.state !== 'unavailable') {
          ownsValues = true;
          onApply(copy(response), {key: token.key, expiresAt: state.expiresAt});
        }
        expiryTimer = later(() => {
          expiryTimer = null; expired(); void refresh({force: true});
        }, expires-now());
      }
      emit();
      return snapshot();
    }).catch(error => {
      if (!latest()) return snapshot();
      revoke('Environmental data could not be verified.');
      state = {...state, status: 'error', reason: String(error?.message || 'Environmental data could not be loaded.').slice(0, 300),
        fetchedAt: null, expiresAt: null, response: null};
      emit();
      return snapshot();
    }).finally(() => {
      clear(token.timeout);
      if (running === token) { running = null; if (active && !disposed) armPeriodic(); }
    });
    token.promise = task;
    running = token;
    emit();
    return task;
  }

  function isReady() {
    let current;
    try { current = context(); } catch (error) { failContext(error); return false; }
    if (current.mode !== 'eligible' || current.key !== state.key) { changed(); return false; }
    if (state.response !== null && !fresh()) { expired(); return false; }
    return state.status === 'ready' && fresh();
  }
  function setActive(value) {
    if (disposed) return snapshot();
    const next = value === true;
    if (active === next) return snapshot();
    active = next;
    return changed();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    blocked({mode: 'inactive', signature: 'disposed', reason: 'Environment checks stopped.'});
  }

  function getState() {
    if (state.response !== null && !fresh()) expired();
    return snapshot();
  }

  return {changed, schedule: changed, refresh, setActive, getState, isReady, dispose};
}
