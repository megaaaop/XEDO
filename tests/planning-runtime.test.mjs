import test from 'node:test';
import assert from 'node:assert/strict';
import {planningRuntime,requestPlanningTrial} from '../src/planning-runtime.js';

test('Standalone HTTPS prototype retains browser calculations instead of calling absent APIs', () => {
  assert.deepEqual(planningRuntime('https:', true), {standalone:true, localFile:false, label:'Prototype trial'});
  assert.equal(planningRuntime('http:', true).standalone, true);
});

test('Full workspace HTTPS still uses server APIs and local files remain standalone', () => {
  assert.deepEqual(planningRuntime('https:', false), {standalone:false, localFile:false, label:'Trial'});
  assert.equal(planningRuntime('https:').standalone, false);
  assert.deepEqual(planningRuntime('file:', false), {standalone:true, localFile:true, label:'Local trial'});
  assert.equal(planningRuntime('https:', 'true').standalone, false);
});

test('Hosted standalone calculation returns real module results without touching fetch', async () => {
  let calls = 0;
  const result = await requestPlanningTrial(planningRuntime('https:', true), '', {
    method: 'POST', body: JSON.stringify({oil:{areaM2:1000,thicknessLowUm:10,thicknessHighUm:30,densityGml:.86,capacityGg:3.42,allowance:1.5}})
  }, () => { calls++; throw new Error('Static prototype must not call an API.'); });
  assert.equal(calls, 0);
  for (const name of ['drift', 'flight', 'exportCheck', 'oil']) assert.ok(result[name]);
  assert.equal(result.oil.volumeLowL, 10);
  assert.ok(Math.abs(result.oil.capsulesLowKg - 3.7719298245614032) < 1e-9);
  assert.equal(result.exportCheck.pass, false);
  assert.equal(result.hardwareControl, false);
});

test('Workspace API route retains request settings and rejects a missing backend without falling back', async () => {
  let received;
  const result = await requestPlanningTrial(planningRuntime('https:', false), '/export', {method:'POST',body:'{}'}, async (url, options) => {
    received = {url, options};
    return new Response('{"ok":true}', {headers:{'Content-Type':'application/json'}});
  });
  assert.equal(result.ok, true);
  assert.equal(received.url, '/api/v2/planning-trial/export');
  assert.equal(received.options.credentials, 'same-origin');
  assert.equal(received.options.redirect, 'error');
  assert.equal(received.options.body, '{}');
  await assert.rejects(requestPlanningTrial(planningRuntime('https:', false), '', {}, async () => new Response('Not found', {status:404})), /did not return API JSON/);
});
