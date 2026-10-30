// Public, read-only imagery gateway. Keep all other workspace APIs private.
import {safeImageryTimingHeader} from '../src/gee-imagery-timing.js';
import {waitUntil,getDeadline} from '@vercel/functions';
const PREFIX = '/api/v1/gee/imagery/';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_EXPENSIVE_REQUESTS = 2;
let activeExpensiveRequests = 0;

function problem(status, code, message, extraHeaders = {}) {
  return Response.json({code, message, error: message, retryable: [429, 502, 503, 504].includes(status)}, {
    status,
    headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', ...extraHeaders},
  });
}

function selectedRoute(url) {
  const routes = url.searchParams.getAll('route');
  if (routes.length > 1) return null;
  let route;
  if (url.pathname === '/api/gee') route = routes[0];
  else if (url.pathname.startsWith(PREFIX)) {
    route = url.pathname.slice(PREFIX.length);
    if (routes.length && routes[0] !== route) return null;
  } else return null;
  if (route === 'search' || route === 'map' || route === 'basemap') return route;
  // Tokens are opaque; accepting a token never accepts an upstream URL or EE expression.
  const tile = /^tiles\/([A-Za-z0-9_-]{16,4096})\/(\d{1,2})\/(\d{1,8})\/(\d{1,8})$/.exec(route || '');
  if (!tile) return null;
  const [z, x, y] = tile.slice(2).map(Number);
  if (z > 18 || x >= 2 ** z || y >= 2 ** z) return null;
  return route;
}

function sameOrigin(request, url) {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  for (const name of ['origin', 'referer']) {
    const value = request.headers.get(name);
    if (!value) continue;
    try { if (new URL(value).origin !== url.origin) return false; }
    catch { return false; }
  }
  return true;
}

async function limitedBody(request) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    return {error: problem(413, 'GEE_BODY_TOO_LARGE', 'Imagery request exceeds the size limit.')};
  }
  if (!request.body) return {body: new Uint8Array()};
  const reader = request.body.getReader(), chunks = [];
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return {error: problem(413, 'GEE_BODY_TOO_LARGE', 'Imagery request exceeds the size limit.')};
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return {body};
}

function runtimeEnvironment(source) {
  // Deliberately exclude local credential paths, database credentials and other APIs.
  return {GEE_PROJECT_ID: source.GEE_PROJECT_ID, GEE_SERVICE_ACCOUNT_JSON: source.GEE_SERVICE_ACCOUNT_JSON,...(source.GEE_CACHE_ENABLED==='1'?{GEE_CACHE_ENABLED:'1',GEE_CACHE_URL:source.GEE_CACHE_URL,GEE_CACHE_SERVER_KEY:source.GEE_CACHE_SERVER_KEY}:{})};
}

function safeResponse(response) {
  const headers = new Headers({'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin'});
  for (const name of ['content-type', 'cache-control', 'retry-after']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  const timing = safeImageryTimingHeader(response.headers.get('server-timing'));
  if (timing) headers.set('Server-Timing', timing);
  const cache = response.headers.get('x-xedo-cache');
  if (['hit', 'miss', 'outside-aoi'].includes(cache)) headers.set('X-XEDO-Cache', cache);
  const persistent=response.headers.get('x-xedo-persistent-cache');
  if(['hit','miss','bypass','follower','disabled'].includes(persistent))headers.set('X-XEDO-Persistent-Cache',persistent);
  return new Response(response.body, {status: response.status, headers});
}

export async function hostedGEEFetch(request, {handler, env = process.env,cacheContext} = {}) {
  try {
    const url = new URL(request.url), route = selectedRoute(url);
    if (!route) return problem(404, 'NOT_FOUND', 'Imagery endpoint not found.');
    if (!sameOrigin(request, url)) return problem(403, 'GEE_ORIGIN_DENIED', 'Use imagery from the XEDO website.');
    const expensive = route === 'search' || route === 'map' || route === 'basemap';
    const method = expensive ? 'POST' : 'GET';
    if (request.method !== method) return problem(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', {Allow: method});
    if (expensive && request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return problem(415, 'GEE_JSON_REQUIRED', 'Send imagery requests as JSON.');
    }
    const runtimeEnv = runtimeEnvironment(env);
    if (!runtimeEnv.GEE_PROJECT_ID || !runtimeEnv.GEE_SERVICE_ACCOUNT_JSON) {
      return problem(503, 'GEE_NOT_CONFIGURED', 'Satellite imagery is not configured on this server.');
    }
    if (expensive && activeExpensiveRequests >= MAX_EXPENSIVE_REQUESTS) {
      return problem(429, 'GEE_BUSY', 'Satellite imagery is busy. Retry shortly.', {'Retry-After': '3'});
    }
    let body;
    if (expensive) {
      const result = await limitedBody(request);
      if (result.error) return result.error;
      body = result.body;
    }
    // Only these headers reach core code; browser cookies and authorization never do.
    const headers = new Headers();
    if (expensive) headers.set('Content-Type', 'application/json');
    const coreRequest = new Request(url.origin + PREFIX + route, {method, headers, body, signal: request.signal});
    // Recheck after reading a streaming body because other requests may have started.
    if (expensive && activeExpensiveRequests >= MAX_EXPENSIVE_REQUESTS) {
      return problem(429, 'GEE_BUSY', 'Satellite imagery is busy. Retry shortly.', {'Retry-After': '3'});
    }
    if (expensive) activeExpensiveRequests++;
    try {
      const run = handler || (await import('../src/gee-imagery-api.js')).geeImageryAPI;
      const response = await run(coreRequest, runtimeEnv,{cacheContext:cacheContext??{defer:waitUntil,deadline:()=>getDeadline()?.getTime()??0}});
      return response instanceof Response ? safeResponse(response) : problem(404, 'NOT_FOUND', 'Imagery endpoint not found.');
    } finally { if (expensive) activeExpensiveRequests--; }
  } catch {
    // Never forward exception messages, credentials, upstream URLs or stack traces.
    console.error('XEDO hosted imagery request failed', {code: 'GEE_UNAVAILABLE'});
    return problem(503, 'GEE_UNAVAILABLE', 'Satellite imagery is temporarily unavailable.');
  }
}

// Also usable by Node's HTTP server when exercising the deployed adapter locally.
export async function handleHostedGEE(req, res, options) {
  const disconnect=new AbortController(),abort=()=>disconnect.abort(),close=()=>{if(!res.writableEnded)abort();};
  req.once?.('aborted',abort);res.once?.('close',close);
  let response;
  try {
    const host = req.headers.host;
    if (typeof host !== 'string' || /[\s/@\\?#]/.test(host)) throw new Error('Invalid host');
    const protocol = req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http');
    if (protocol !== 'http' && protocol !== 'https') throw new Error('Invalid protocol');
    const url = new URL(req.url, `${protocol}://${host}`);
    if (url.host.toLowerCase() !== host.toLowerCase()) throw new Error('Invalid host');
    if (req.query?.route !== undefined && !url.searchParams.has('route')) {
      if (typeof req.query.route !== 'string') throw new Error('Invalid route');
      url.searchParams.set('route', req.query.route);
    }
    const headers = new Headers();
    for (const name of ['content-type', 'content-length', 'origin', 'referer', 'sec-fetch-site']) {
      const value = req.headers[name];
      if (typeof value === 'string') headers.set(name, value);
      else if (value !== undefined) throw new Error('Invalid header');
    }
    const method = req.method || 'GET', init = {method, headers,signal:disconnect.signal};
    if (method !== 'GET' && method !== 'HEAD') {
      if (req.body !== undefined) {
        init.body = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
      } else if (req[Symbol.asyncIterator]) {
        init.body = req;
        init.duplex = 'half';
      }
    }
    response = await hostedGEEFetch(new Request(url, init), options);
  } catch { response = problem(400, 'GEE_REQUEST_INVALID', 'Invalid imagery request.'); }
  res.statusCode = response.status;
  for (const [name, value] of response.headers) res.setHeader(name, value);
  res.end(Buffer.from(await response.arrayBuffer()));
  req.removeListener?.('aborted',abort);res.removeListener?.('close',close);
}

// Vercel's Node runtime supports this Web Standard entry point for api/*.mjs.
export default {fetch: hostedGEEFetch};
