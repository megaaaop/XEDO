import test from 'node:test';
import assert from 'node:assert/strict';
import gateway, {handleHostedGEE, hostedGEEFetch} from '../api/gee.mjs';
import {geeImageryAPI} from '../src/gee-imagery-api.js';

const env = {GEE_PROJECT_ID: 'xedo-test', GEE_SERVICE_ACCOUNT_JSON: 'private-service-account-json', DATABASE_URL: 'private-database', GEE_SERVICE_ACCOUNT_FILE: '/secrets/private.json'};
const session = 'opaque_'.repeat(16);
function request(route = 'search', {method = 'POST', body = '{}', headers = {}, path = '/api/gee'} = {}) {
  return new Request('https://xedo.example' + path + '?route=' + route, {
    method, headers: {'content-type': 'application/json', origin: 'https://xedo.example', 'sec-fetch-site': 'same-origin', ...headers},
    ...(method !== 'GET' && method !== 'HEAD' ? {body} : {}),
  });
}

test('Hosted gateway maps only bounded imagery routes and preserves the incoming origin', async () => {
  assert.equal(typeof gateway.fetch, 'function');
  let seen;
  const handler = async (req, runtimeEnv) => {
    seen = req;
    assert.deepEqual(runtimeEnv, {GEE_PROJECT_ID: env.GEE_PROJECT_ID, GEE_SERVICE_ACCOUNT_JSON: env.GEE_SERVICE_ACCOUNT_JSON});
    assert.equal(await req.text(), '{"bbox":[101,12,102,13]}');
    assert.equal(req.headers.get('cookie'), null);
    assert.equal(req.headers.get('authorization'), null);
    return Response.json({scenes: []});
  };
  let response = await hostedGEEFetch(request('search', {body: '{"bbox":[101,12,102,13]}', headers: {cookie: 'private-session', authorization: 'Bearer private-user'}}), {env, handler});
  assert.equal(response.status, 200);
  assert.equal(seen.url, 'https://xedo.example/api/v1/gee/imagery/search');
  response = await hostedGEEFetch(request('map', {path: '/api/v1/gee/imagery/map', body: '{"bbox":[101,12,102,13]}'}), {env, handler});
  assert.equal(response.status, 200);
  assert.equal(seen.url, 'https://xedo.example/api/v1/gee/imagery/map');
  for (const route of ['config', 'search/extra', '../config', `tiles/${session}/19/0/0`, `tiles/${session}/2/4/0`, `tiles/${session}/2/0/4`, 'tiles/https://evil.example/1/0/0', 'search&route=map']) {
    response = await hostedGEEFetch(request(route), {env, handler: () => assert.fail('Invalid routes must not run core code')});
    assert.equal(response.status, 404, route);
  }
});

test('Hosted gateway restricts methods, cross-origin requests, fetch sites and browser credentials', async () => {
  const handler = () => assert.fail('Rejected requests must not run core code');
  for (const headers of [{origin: 'https://evil.example'}, {origin: 'null'}, {'sec-fetch-site': 'cross-site'}, {'sec-fetch-site': 'same-site'}, {referer: 'https://evil.example/path'}]) {
    const response = await hostedGEEFetch(request('search', {headers}), {env, handler});
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  }
  let response = await hostedGEEFetch(request('search', {method: 'GET'}), {env, handler});
  assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'POST');
  response = await hostedGEEFetch(request(`tiles/${session}/2/1/1`, {method: 'POST'}), {env, handler});
  assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'GET');
  response = await hostedGEEFetch(request('map', {headers: {'content-type': 'text/plain'}}), {env, handler});
  assert.equal(response.status, 415);
});

test('Hosted gateway bounds request bodies using declared bytes and streamed bytes', async () => {
  const handler = () => assert.fail('Oversized requests must not run core code');
  let response = await hostedGEEFetch(request('search', {headers: {'content-length': '65537'}}), {env, handler});
  assert.equal(response.status, 413);
  response = await hostedGEEFetch(request('map', {body: 'ก'.repeat(22000)}), {env, handler});
  assert.equal(response.status, 413);
  const stream = new ReadableStream({start(controller) {controller.enqueue(new Uint8Array(40000)); controller.enqueue(new Uint8Array(40000)); controller.close();}});
  response = await hostedGEEFetch(new Request('https://xedo.example/api/gee?route=search', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: stream, duplex: 'half'}), {env, handler});
  assert.equal(response.status, 413);
});

test('Hosted tiles preserve binary pixels and safe response headers without cookies or upstream metadata', async () => {
  const pixels = new Uint8Array([137, 80, 78, 71, 0, 255]);
  const response = await hostedGEEFetch(request(`tiles/${session}/2/1/1`, {method: 'GET'}), {env, handler: async req => {
    assert.equal(req.url, `https://xedo.example/api/v1/gee/imagery/tiles/${session}/2/1/1`);
    return new Response(pixels, {headers: {'Content-Type': 'image/png', 'Cache-Control': 'private,max-age=60', 'Set-Cookie': 'private', 'X-Upstream-Token': 'private'}});
  }});
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), pixels);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'private,max-age=60');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('x-upstream-token'), null);
});

test('Missing hosted configuration and failures produce sanitized errors without local credentials', async () => {
  for (const runtimeEnv of [{}, {GEE_PROJECT_ID: 'xedo-test', GEE_SERVICE_ACCOUNT_FILE: '/secrets/private.json'}]) {
    const response = await hostedGEEFetch(request(), {env: runtimeEnv, handler: () => assert.fail('Missing runtime config must not run core code')});
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'GEE_NOT_CONFIGURED');
  }
  const originalError = console.error, logged = [];
  console.error = (...args) => logged.push(args);
  let response;
  try { response = await hostedGEEFetch(request(), {env, handler: async () => {throw new Error('private-service-account-json /secrets/private.json');}}); }
  finally { console.error = originalError; }
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private|secrets|stack|at hosted/);
  assert.doesNotMatch(JSON.stringify(logged), /private|secrets/);
});

test('Hosted gateway limits expensive concurrent requests while tiles continue and capacity is released', async () => {
  let release;
  const waiting = new Promise(resolve => {release = resolve;});
  let entered = 0;
  const handler = async () => {entered++; await waiting; return Response.json({ok: true});};
  const pending = [hostedGEEFetch(request(), {env, handler}), hostedGEEFetch(request('map'), {env, handler})];
  while (entered < 2) await new Promise(resolve => setImmediate(resolve));
  let response = await hostedGEEFetch(request(), {env, handler});
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '3');
  response = await hostedGEEFetch(request(`tiles/${session}/2/1/1`, {method: 'GET'}), {env, handler: async () => new Response(new Uint8Array([0]), {headers: {'Content-Type': 'image/png'}})});
  assert.equal(response.status, 200);
  release();
  for (const result of await Promise.all(pending)) assert.equal(result.status, 200);
  response = await hostedGEEFetch(request(), {env, handler: async () => Response.json({ok: true})});
  assert.equal(response.status, 200);
});

test('Node bridge maps Vercel route query, validates host and writes binary responses', async () => {
  const response = () => ({headers: {}, setHeader(name, value) {this.headers[name] = value;}, end(body) {this.body = body;}});
  const req = {url: '/api/gee', query: {route: 'search'}, method: 'POST', headers: {host: 'xedo.example', 'x-forwarded-proto': 'https', 'content-type': 'application/json', origin: 'https://xedo.example'}, body: {bbox: [101, 12, 102, 13]}};
  let res = response();
  await handleHostedGEE(req, res, {env, handler: async request => {assert.equal(request.url, 'https://xedo.example/api/v1/gee/imagery/search'); assert.deepEqual(await request.json(), req.body); return Response.json({ok: true});}});
  assert.equal(res.statusCode, 200); assert.deepEqual(JSON.parse(res.body), {ok: true});
  res = response();
  await handleHostedGEE({...req, headers: {...req.headers, host: 'evil.example/path'}}, res, {env, handler: () => assert.fail('Invalid host must fail')});
  assert.equal(res.statusCode, 400);
  res = response();
  await handleHostedGEE({...req, query: {route: ['search', 'map']}}, res, {env, handler: () => assert.fail('Duplicate routes must fail')});
  assert.equal(res.statusCode, 400);
  res = response();
  await handleHostedGEE({...req, url: `/api/gee?route=tiles/${session}/2/1/1`, method: 'GET', query: {}, body: undefined}, res, {env, handler: async () => new Response(new Uint8Array([0, 255]), {headers: {'Content-Type': 'image/png'}})});
  assert.equal(res.statusCode, 200); assert.deepEqual([...res.body], [0, 255]);
});

test('Hosted source path reaches actual imagery API without exposing the workspace backend', async () => {
  const geometry = {type: 'Polygon', coordinates: [[[101, 12], [101.01, 12], [101.01, 12.01], [101, 12.01], [101, 12]]]};
  let seen;
  const handler = (req, runtimeEnv) => geeImageryAPI(req, runtimeEnv, {services: {
    searchGEEImagery: async (_env, input) => {seen = input; return {scenes: []};},
  }});
  const response = await hostedGEEFetch(new Request('https://xedo.example/api/v1/gee/imagery/search', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({geometry})}), {env, handler});
  assert.equal(response.status, 200);
  assert.deepEqual(seen, {geometry});
  assert.deepEqual(await response.json(), {scenes: []});
  const other = await hostedGEEFetch(new Request('https://xedo.example/api/v1/telemetry/batches', {method: 'POST'}), {env, handler: () => assert.fail('Workspace APIs must remain private')});
  assert.equal(other.status, 404);
});
