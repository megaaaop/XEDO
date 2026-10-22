// Read-only Earth Engine metadata probe. No map creation, pixels or computation.
const tokenUrl = 'https://oauth2.googleapis.com/token';
const scope = 'https://www.googleapis.com/auth/earthengine.readonly';
const defaultAsset = 'projects/earthengine-public/assets/COPERNICUS/S2_SR_HARMONIZED';
let tokenCache = null;
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const encodedJson = value => base64url(new TextEncoder().encode(JSON.stringify(value)));
const publicProblems = new WeakMap();
const problem = (code, message) => {
  const error = Object.assign(new Error(message), {code});
  publicProblems.set(error, Object.freeze({code, message}));
  return error;
};
export const publicGEEError = error => publicProblems.get(error) || null;

export async function accessToken(raw, fetchImpl, signal) {
  if (tokenCache?.credential === raw && tokenCache.expires > Date.now() + 60000) return tokenCache.token;
  let account;
  try {
    account = JSON.parse(raw);
    if (account.type !== 'service_account' || !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(account.client_email) || !account.private_key?.startsWith('-----BEGIN PRIVATE KEY-----')) throw new Error();
  } catch { throw problem('GEE_CONFIG_INVALID', 'Invalid GEE connection details'); }
  const iat = Math.floor(Date.now() / 1000);
  const jwt = encodedJson({alg:'RS256', typ:'JWT', ...(account.private_key_id ? {kid:account.private_key_id} : {})}) + '.' + encodedJson({iss:account.client_email, scope, aud:tokenUrl, iat, exp:iat + 3600});
  let assertion;
  try {
    const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
    const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['sign']);
    assertion = jwt + '.' + base64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(jwt)));
  } catch { throw problem('GEE_CONFIG_INVALID', 'Invalid GEE connection key'); }
  const response = await fetchImpl(tokenUrl, {
    method:'POST', redirect:'error', signal,
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion}),
  });
  if (!response.ok) throw problem('GEE_AUTH_FAILED', 'GEE authentication failed');
  const data = await response.json();
  if (typeof data.access_token !== 'string' || !data.access_token || data.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(data.expires_in) || data.expires_in < 60) throw problem('GEE_AUTH_FAILED', 'GEE authentication failed');
  tokenCache = {credential:raw, token:data.access_token, expires:Date.now() + Math.min(data.expires_in, 3600) * 1000};
  return data.access_token;
}

export function invalidateGEEToken() { tokenCache = null; }

export async function probeGEE(env, {fetchImpl = fetch} = {}) {
  if (!env.GEE_PROJECT_ID || !env.GEE_SERVICE_ACCOUNT_JSON) return {state:'not_configured', upstream_ms:null};
  const project = env.GEE_PROJECT_ID;
  const asset = env.GEE_PROBE_ASSET || defaultAsset;
  if (!/^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]|[0-9]{6,20})$/.test(project) || !/^projects\/[A-Za-z0-9_-]+\/assets\/[A-Za-z0-9_/-]+$/.test(asset) || asset.split('/').some(p => !p || p === '..' || p === '.')) return {state:'error', code:'GEE_CONFIG_INVALID', message:'Invalid GEE configuration', upstream_ms:null};
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 6500);
  try {
    const token = await accessToken(env.GEE_SERVICE_ACCOUNT_JSON, fetchImpl, controller.signal);
    const started = performance.now();
    const response = await fetchImpl('https://earthengine.googleapis.com/v1/' + asset, {
      method:'GET', cache:'no-store', redirect:'error', signal:controller.signal,
      headers:{Authorization:'Bearer ' + token, 'X-Goog-User-Project':project},
    });
    if (!response.ok) {
      if (response.status === 401) tokenCache = null;
      throw problem(response.status === 401 || response.status === 403 ? 'GEE_ACCESS_DENIED' : response.status === 429 ? 'GEE_QUOTA_LIMIT' : 'GEE_UNAVAILABLE', response.status === 401 || response.status === 403 ? 'GEE connection permissions are not ready' : response.status === 429 ? 'GEE is temporarily rate-limited' : 'GEE is unavailable');
    }
    const data = await response.json();
    if (data.name !== asset || !data.type) throw problem('GEE_RESPONSE_INVALID', 'Invalid response from GEE');
    return {state:'connected', upstream_ms:Math.round((performance.now() - started) * 10) / 10};
  } catch (error) {
    const details = publicGEEError(error);
    return {state:'error', upstream_ms:null, code:controller.signal.aborted ? 'GEE_TIMEOUT' : details?.code || 'GEE_UNAVAILABLE', message:controller.signal.aborted ? 'GEE did not respond within the time limit' : details?.message || 'GEE connection check failed'};
  } finally { clearTimeout(deadline); }
}
