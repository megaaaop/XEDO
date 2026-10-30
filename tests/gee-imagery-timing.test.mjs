import test from 'node:test';
import assert from 'node:assert/strict';
import {imageryTiming, safeImageryTimingHeader} from '../src/gee-imagery-timing.js';
import {geeImageryAPI} from '../src/gee-imagery-api.js';
import {hostedGEEFetch} from '../api/gee.mjs';

test('timing diagnostics preserve binary bodies and omit untrusted labels and values', async () => {
  let now = 10;
  const timing = imageryTiming({clock: () => now});
  timing.record('gee_pixels', 12.5);
  timing.record('gee_pixels', 2.25);
  timing.record('private-session-id', 5);
  timing.record('gee_auth', NaN);
  timing.record('gee_auth', -1);
  timing.record('xedo_core', 9999);
  now = 30;
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255]);
  const response = timing.finish(new Response(bytes, {headers: {'Content-Type': 'image/png', 'X-XEDO-Cache': 'hit'}}));
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('x-xedo-cache'), 'hit');
  assert.equal(response.headers.get('server-timing'), 'gee_pixels;dur=14.75, xedo_core;dur=20.00');
  assert.equal(safeImageryTimingHeader(response.headers.get('server-timing')), response.headers.get('server-timing'));
  for (const value of ['secret;dur=1', 'gee_pixels;dur=1;desc="private token"', 'gee_pixels;dur=NaN', 'gee_pixels;dur=-1']) {
    assert.equal(safeImageryTimingHeader(value), null);
  }
});

test('imagery API exposes fixed stage timing while retaining sanitized failure responses', async () => {
  const req = new Request('https://xedo.example/api/v1/gee/imagery/search', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
  });
  const response = await geeImageryAPI(req, {}, {services: {searchGEEImagery: async (_env, _input, options) => {
    options.onTiming('gee_metadata', 5);
    options.onTiming('token-is-private', 20);
    throw new Error('private network URL and token');
  }}});
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'GEE_IMAGERY_UNAVAILABLE');
  assert.match(response.headers.get('server-timing'), /gee_metadata;dur=5\.00/);
  assert.doesNotMatch(response.headers.get('server-timing'), /private|token|URL/);
  assert.equal(await geeImageryAPI(new Request('https://xedo.example/unrelated'), {}), null);
});

test('hosted gateway allows bounded diagnostics and rejects arbitrary timing and cache metadata', async () => {
  const env = {GEE_PROJECT_ID: 'fixture-project', GEE_SERVICE_ACCOUNT_JSON: '{}'};
  const request = () => new Request('https://xedo.example/api/gee?route=tiles/' + 'opaque_'.repeat(16) + '/2/1/1');
  const bytes = new Uint8Array([137, 80, 78, 71]);
  for (const safe of [true, false]) {
    const response = await hostedGEEFetch(request(), {env, handler: async () => new Response(bytes, {headers: {
      'Content-Type': 'image/png', 'Cache-Control': 'private,max-age=300',
      'Server-Timing': safe ? 'gee_pixels;dur=20.00, xedo_core;dur=22.00' : 'gee_pixels;dur=1;desc="private"',
      'X-XEDO-Cache': safe ? 'hit' : 'private-token', 'X-Upstream-Token': 'private',
    }})});
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
    assert.equal(response.headers.get('x-upstream-token'), null);
    assert.equal(response.headers.get('x-xedo-cache'), safe ? 'hit' : null);
    assert.equal(response.headers.get('server-timing'), safe ? 'gee_pixels;dur=20.00, xedo_core;dur=22.00' : null);
  }
});
