import test from 'node:test';
import assert from 'node:assert/strict';
import {probeSupabase} from '../src/supabase-connection.js';

const origin = 'https://abcdefghijklmnopqrst.supabase.co';
const key = 'sb_publishable_test-opaque_key';
const env = {SUPABASE_URL:origin, SUPABASE_PUBLISHABLE_KEY:key};
const settings = {disable_signup:false, external:{email:true}};
const schema = {swagger:'2.0', paths:{}};
const jsonFor = url => url.endsWith('/auth/v1/settings') ? settings : schema;
const assertSanitized = result => assert.doesNotMatch(JSON.stringify(result), /sb_publishable_|sb_secret_|abcdefghijklmnopqrst|supabase\.co|private-upstream-body|injected-error/);

test('Supabase checks both metadata APIs concurrently with only the publishable apikey header', async () => {
  const calls = [];
  let release;
  const ready = new Promise(resolve => {release = resolve;});
  const input = structuredClone(env);
  const pending = probeSupabase(input, {fetchImpl:async (url, options) => {
    calls.push({url, options});
    await ready;
    return Response.json(jsonFor(url));
  }});
  assert.equal(calls.length, 2, 'Both requests must begin before either response arrives');
  release();
  const result = await pending;
  assert.deepEqual(calls.map(call => call.url), [origin + '/auth/v1/settings', origin + '/rest/v1/']);
  assert.equal(calls[0].options.signal, calls[1].options.signal);
  for (const {options} of calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, {apikey:key});
    assert.equal(Object.hasOwn(options, 'body'), false);
    assert.equal(options.signal.aborted, false);
  }
  assert.equal(result.state, 'connected');
  assert.equal(result.auth, 'reachable');
  assert.equal(result.dataApi, 'reachable');
  assert.ok(Number.isFinite(result.upstream_ms) && result.upstream_ms >= 0);
  assert.deepEqual(input, env);
  assertSanitized(result);
});

test('Supabase accepts the alternate settings and OpenAPI response shapes', async () => {
  const result = await probeSupabase({...env, SUPABASE_URL:origin + '/'}, {fetchImpl:async url => Response.json(url.endsWith('/settings') ? {external:{}} : {openapi:'3.1.0', paths:{}})});
  assert.equal(result.state, 'connected');
});

test('Missing Supabase configuration makes no network requests', async () => {
  for (const input of [undefined, {}, {SUPABASE_URL:origin}, {SUPABASE_PUBLISHABLE_KEY:key}, {...env, SUPABASE_URL:''}, {...env, SUPABASE_PUBLISHABLE_KEY:''}]) {
    const result = await probeSupabase(input, {fetchImpl:async () => assert.fail('Unexpected upstream request')});
    assert.deepEqual(result, {state:'not_configured', upstream_ms:null});
  }
});

test('Invalid project URLs and key types are rejected before any network request', async () => {
  const urls = [
    'http://abcdefghijklmnopqrst.supabase.co', 'https://example.com',
    'https://abcdefghijklmnopqrst.supabase.co.evil.example', 'https://localhost',
    'https://abcdefghijklmnopqrs.supabase.co', 'https://abcdefghijklmnopqrs1.supabase.co',
    origin + ':8443', origin + '/rest/v1/', origin + '?key=private-upstream-body', origin + '#private-upstream-body',
    'https://user:password@abcdefghijklmnopqrst.supabase.co', 'not-a-url', {},
  ];
  for (const url of urls) {
    const result = await probeSupabase({...env, SUPABASE_URL:url}, {fetchImpl:async () => assert.fail('Unexpected upstream request')});
    assert.equal(result.code, 'SUPABASE_CONFIG_INVALID');
    assert.equal(result.state, 'error');
    assertSanitized(result);
  }
  for (const invalidKey of ['sb_secret_private-upstream-body', 'eyJlegacy-token', 'sb_publishable_', 'sb_publishable_private\r\nHeader:value', {}]) {
    const result = await probeSupabase({...env, SUPABASE_PUBLISHABLE_KEY:invalidKey}, {fetchImpl:async () => assert.fail('Unexpected upstream request')});
    assert.equal(result.code, 'SUPABASE_CONFIG_INVALID');
    assertSanitized(result);
  }
});

test('Authentication denial never reports connected or exposes upstream error content', async () => {
  for (const status of [401, 403]) {
    let bodyRead = false;
    const result = await probeSupabase(env, {fetchImpl:async url => url.endsWith('/settings') ? {
      ok:false, status, json:async () => {bodyRead = true; throw new Error('private-upstream-body');},
    } : Response.json(schema)});
    assert.equal(result.state, 'error');
    assert.equal(result.code, 'SUPABASE_ACCESS_DENIED');
    assert.equal(result.auth, undefined);
    assert.equal(result.dataApi, 'reachable');
    assert.equal(result.upstream_ms, null);
    assert.equal(bodyRead, false);
    assertSanitized(result);
  }
});

test('The Data API must also succeed before Supabase reports connected', async () => {
  for (const [status, code] of [[403, 'SUPABASE_ACCESS_DENIED'], [429, 'SUPABASE_RATE_LIMITED'], [503, 'SUPABASE_UNAVAILABLE']]) {
    const result = await probeSupabase(env, {fetchImpl:async url => url.endsWith('/settings') ? Response.json(settings) : Response.json({message:'private-upstream-body ' + key}, {status})});
    assert.equal(result.state, 'error');
    assert.equal(result.auth, 'reachable');
    assert.equal(result.dataApi, undefined);
    assert.equal(result.code, code);
    assertSanitized(result);
  }
});

test('A verified publishable key with restricted schema discovery reports partial readiness', async () => {
  const restricted = {message:'Secret API key required', hint:'Only secret API keys can be used for this endpoint.'};
  for (const [body, code, dataApi] of [
    [restricted, 'SUPABASE_SCHEMA_RESTRICTED', 'schema_check_requires_secret'],
    [{message:'private-upstream-body ' + key}, 'SUPABASE_DATA_API_ACCESS_REQUIRED', 'access_required'],
  ]) {
    const result = await probeSupabase(env, {fetchImpl:async url => url.endsWith('/settings') ? Response.json(settings) : Response.json(body, {status:401})});
    assert.equal(result.state, 'partial');
    assert.equal(result.auth, 'reachable');
    assert.equal(result.dataApi, dataApi);
    assert.equal(result.code, code);
    assert.equal(result.upstream_ms, null);
    assertSanitized(result);
  }
  const invalidKey = await probeSupabase(env, {fetchImpl:async url => Response.json(url.endsWith('/settings') ? {message:'private-upstream-body'} : restricted, {status:401})});
  assert.equal(invalidKey.state, 'error');
  assert.equal(invalidKey.code, 'SUPABASE_ACCESS_DENIED');
  assert.equal(invalidKey.auth, undefined);
  assertSanitized(invalidKey);
});

test('Malformed JSON and unrelated JSON cannot produce a connected status', async () => {
  for (const brokenEndpoint of ['/auth/v1/settings', '/rest/v1/']) {
    for (const malformed of ['{not-json-private-upstream-body', 'null', '[]', '{}', '{"status":"ok"}']) {
      const result = await probeSupabase(env, {fetchImpl:async url => url.endsWith(brokenEndpoint) ? new Response(malformed) : Response.json(jsonFor(url))});
      assert.equal(result.state, 'error');
      assert.equal(result.code, 'SUPABASE_RESPONSE_INVALID');
      assertSanitized(result);
    }
  }
  for (const wrongShape of [{disable_signup:'false'}, {external:[]}, {external:null}]) {
    const result = await probeSupabase(env, {fetchImpl:async url => Response.json(url.endsWith('/settings') ? wrongShape : schema)});
    assert.equal(result.code, 'SUPABASE_RESPONSE_INVALID');
  }
  for (const wrongShape of [{swagger:'2.0', paths:[]}, {swagger:'wrong', paths:{}}, {openapi:'private-upstream-body', paths:{}}, {openapi:'3.1.0', paths:null}]) {
    const result = await probeSupabase(env, {fetchImpl:async url => Response.json(url.endsWith('/settings') ? settings : wrongShape)});
    assert.equal(result.code, 'SUPABASE_RESPONSE_INVALID');
    assertSanitized(result);
  }
});

test('Network errors, redirects and spoofed exception codes remain sanitized', async () => {
  for (const error of [new Error('injected-error ' + origin + ' ' + key), Object.assign(new Error('injected-error ' + key), {code:'SUPABASE_ACCESS_DENIED'}), new TypeError('injected-error redirect')]) {
    const result = await probeSupabase(env, {fetchImpl:async () => {throw error;}});
    assert.deepEqual(result, {state:'error', upstream_ms:null, code:'SUPABASE_UNAVAILABLE', message:'Supabase connection check failed'});
    assertSanitized(result);
  }
});

test('The eight second deadline aborts both metadata checks without leaking errors', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const signals = [];
  const pending = probeSupabase(env, {fetchImpl:async (url, {signal}) => {
    signals.push(signal);
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('injected-error ' + key)), {once:true}));
  }});
  t.mock.timers.tick(7999);
  assert.equal(signals.length, 2);
  assert.equal(signals[0].aborted, false);
  t.mock.timers.tick(1);
  const result = await pending;
  assert.equal(signals.every(signal => signal.aborted), true);
  assert.deepEqual(result, {state:'error', upstream_ms:null, code:'SUPABASE_TIMEOUT', message:'Supabase did not respond within the time limit'});
  assertSanitized(result);
});
