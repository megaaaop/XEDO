import test from 'node:test';
import assert from 'node:assert/strict';
import {probeGEE} from '../src/gee-connection.js';
import {connectionQuality} from '../src/connection-quality.js';
import worker from '../src/worker.js';

test('GEE placeholder never makes an upstream call or substitutes a web ping', async () => {
  let calls = 0;
  const result = await probeGEE({}, {fetchImpl:async () => {calls++;throw new Error('unexpected');}});
  assert.deepEqual(result, {state:'not_configured', upstream_ms:null});
  assert.equal(calls, 0);
  const response = await worker.fetch(new Request('http://localhost/api/v1/gee/ping?nonce=test_nonce'), {}, {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const data = await response.json();
  assert.equal(data.service, 'gee');
  assert.equal(data.nonce, 'test_nonce');
  assert.equal(data.state, 'not_configured');
  assert.equal(data.upstream_ms, null);
  assert.equal((await worker.fetch(new Request('http://localhost/api/v1/gee/ping'), {}, {})).status, 422);
  assert.equal((await worker.fetch(new Request('http://localhost/api/v1/gee/ping?nonce=test', {method:'POST'}), {}, {})).status, 405);
});

test('GEE probe authenticates, verifies the response, reuses token and sanitizes errors', async () => {
  const keys = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256'}, true, ['sign','verify']);
  const pem = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64');
  const env = {GEE_PROJECT_ID:'xedo-test-project', GEE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account', client_email:'xedo@xedo-test-project.iam.gserviceaccount.com', private_key:'-----BEGIN PRIVATE KEY-----\n' + pem + '\n-----END PRIVATE KEY-----'})};
  let authCalls = 0, geeCalls = 0, mode = 'ok';
  const fetchImpl = async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      authCalls++;
      const jwt = options.body.get('assertion').split('.');
      assert.equal(options.body.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      const claims = JSON.parse(Buffer.from(jwt[1], 'base64url').toString());
      assert.equal(claims.aud, url);
      assert.equal(claims.iss, 'xedo@xedo-test-project.iam.gserviceaccount.com');
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/earthengine.readonly');
      assert.equal(claims.exp - claims.iat, 3600);
      assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', keys.publicKey, Buffer.from(jwt[2], 'base64url'), new TextEncoder().encode(jwt[0] + '.' + jwt[1])), true);
      return Response.json({access_token:'test-secret-access-token', token_type:'Bearer', expires_in:3600});
    }
    geeCalls++;
    assert.equal(url, 'https://earthengine.googleapis.com/v1/projects/earthengine-public/assets/COPERNICUS/S2_SR_HARMONIZED');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer test-secret-access-token');
    assert.equal(options.headers['X-Goog-User-Project'], 'xedo-test-project');
    assert.equal(options.redirect, 'error');
    if (mode === 'denied') return Response.json({error:{message:'test-secret-access-token'}}, {status:403});
    if (mode === 'quota') return Response.json({}, {status:429});
    if (mode === 'wrong') return Response.json({name:'different-asset', type:'IMAGE_COLLECTION'});
    if (mode === 'network') throw new Error('test-secret-access-token');
    if (mode === 'coded-network') throw Object.assign(new Error('test-secret-access-token'), {code:'ECONNRESET'});
    if (mode === 'spoofed-gee') throw Object.assign(new Error('test-secret-access-token'), {code:'GEE_ACCESS_DENIED'});
    return Response.json({name:'projects/earthengine-public/assets/COPERNICUS/S2_SR_HARMONIZED', type:'IMAGE_COLLECTION'});
  };
  for (let i = 0; i < 2; i++) {
    const result = await probeGEE(env, {fetchImpl});
    assert.equal(result.state, 'connected');
    assert.ok(Number.isFinite(result.upstream_ms));
  }
  assert.equal(authCalls, 1);
  assert.equal(geeCalls, 2);
  for (const [nextMode, code] of [['denied','GEE_ACCESS_DENIED'], ['quota','GEE_QUOTA_LIMIT'], ['wrong','GEE_RESPONSE_INVALID'], ['network','GEE_UNAVAILABLE'], ['coded-network','GEE_UNAVAILABLE'], ['spoofed-gee','GEE_UNAVAILABLE']]) {
    mode = nextMode;
    const result = await probeGEE(env, {fetchImpl});
    assert.equal(result.state, 'error');
    assert.equal(result.code, code);
    assert.equal(result.upstream_ms, null);
    assert.doesNotMatch(JSON.stringify(result), /test-secret|PRIVATE KEY/);
    if (['network','coded-network','spoofed-gee'].includes(nextMode)) assert.equal(result.message, 'GEE connection check failed');
    if (nextMode === 'denied') assert.equal(result.message, 'GEE connection permissions are not ready');
  }
  const invalid = await probeGEE({...env, GEE_PROBE_ASSET:'https://example.com'}, {fetchImpl});
  assert.equal(invalid.code, 'GEE_CONFIG_INVALID');
  const invalidAccount = await probeGEE({...env, GEE_SERVICE_ACCOUNT_JSON:'invalid-private-details'}, {fetchImpl});
  assert.equal(invalidAccount.code, 'GEE_CONFIG_INVALID');
  assert.equal(invalidAccount.message, 'Invalid GEE connection details');
});

test('Connection colors preserve unknown, failures and exact boundaries', () => {
  assert.equal(connectionQuality(null), 'unknown');
  assert.equal(connectionQuality(NaN), 'unknown');
  assert.equal(connectionQuality(-1), 'unknown');
  assert.equal(connectionQuality(299), 'good');
  assert.equal(connectionQuality(300), 'moderate');
  assert.equal(connectionQuality(999), 'moderate');
  assert.equal(connectionQuality(1000), 'bad');
  assert.equal(connectionQuality(null, true), 'bad');
});
