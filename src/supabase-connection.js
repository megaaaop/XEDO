// Read-only service metadata checks. This does not read records or modify the project.
const timeoutMs = 8000;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const failure = (code, message) => ({code, message});
const invalidResponse = () => failure('SUPABASE_RESPONSE_INVALID', 'Invalid response from Supabase');

function projectOrigin(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !/^[a-z]{20}\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

function authSettings(data) {
  return isObject(data) && (typeof data.disable_signup === 'boolean' || isObject(data.external));
}

function dataApiSchema(data) {
  return isObject(data) && isObject(data.paths) && (data.swagger === '2.0' || (typeof data.openapi === 'string' && /^3\.\d+\.\d+(?:[-+].*)?$/.test(data.openapi)));
}

async function checkEndpoint(url, key, validate, fetchImpl, signal, schemaCheck = false) {
  try {
    const response = await fetchImpl(url, {
      method:'GET', cache:'no-store', redirect:'error', signal,
      headers:{apikey:key},
    });
    if (!response.ok) {
      if (schemaCheck && response.status === 401) {
        let details;
        try { details = await response.json(); } catch {}
        const restricted = isObject(details) && details.message === 'Secret API key required' && details.hint === 'Only secret API keys can be used for this endpoint.';
        return {
          accessRequired:true,
          ...(restricted
            ? {schemaRestricted:true, ...failure('SUPABASE_SCHEMA_RESTRICTED', 'Supabase Auth is reachable; Data API schema discovery requires a secret key')}
            : failure('SUPABASE_DATA_API_ACCESS_REQUIRED', 'Supabase Auth is reachable; Data API access could not be verified')),
        };
      }
      if (response.status === 401 || response.status === 403) return failure('SUPABASE_ACCESS_DENIED', 'Supabase connection permissions are not ready');
      if (response.status === 429) return failure('SUPABASE_RATE_LIMITED', 'Supabase is temporarily rate-limited');
      return failure('SUPABASE_UNAVAILABLE', 'Supabase is unavailable');
    }
    let data;
    try { data = await response.json(); }
    catch { return invalidResponse(); }
    return validate(data) ? {reachable:true} : invalidResponse();
  } catch {
    // Upstream bodies and exception messages may contain connection credentials.
    return failure('SUPABASE_UNAVAILABLE', 'Supabase connection check failed');
  }
}

export async function probeSupabase(env, {fetchImpl = fetch} = {}) {
  const rawUrl = env?.SUPABASE_URL;
  const key = env?.SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !key) return {state:'not_configured', upstream_ms:null};
  const origin = projectOrigin(rawUrl);
  if (!origin || typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    return {state:'error', upstream_ms:null, code:'SUPABASE_CONFIG_INVALID', message:'Invalid Supabase configuration'};
  }
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const [auth, dataApi] = await Promise.all([
      checkEndpoint(origin + '/auth/v1/settings', key, authSettings, fetchImpl, controller.signal),
      checkEndpoint(origin + '/rest/v1/', key, dataApiSchema, fetchImpl, controller.signal, true),
    ]);
    const reachable = {
      ...(auth.reachable ? {auth:'reachable'} : {}),
      ...(dataApi.reachable ? {dataApi:'reachable'} : {}),
    };
    if (controller.signal.aborted) return {state:'error', ...reachable, upstream_ms:null, code:'SUPABASE_TIMEOUT', message:'Supabase did not respond within the time limit'};
    if (auth.reachable && dataApi.accessRequired) return {
      state:'partial', auth:'reachable', dataApi:dataApi.schemaRestricted ? 'schema_check_requires_secret' : 'access_required',
      upstream_ms:null, code:dataApi.code, message:dataApi.message,
    };
    if (!auth.reachable || !dataApi.reachable) return {state:'error', ...reachable, upstream_ms:null, ...(!auth.reachable ? auth : dataApi)};
    return {state:'connected', ...reachable, upstream_ms:Math.round((performance.now() - started) * 10) / 10};
  } finally { clearTimeout(deadline); }
}
