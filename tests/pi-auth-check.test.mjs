import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from '../src/worker.js';
import {localEnvironment} from '../scripts/local-storage.mjs';

test('Pi connectivity check verifies credentials without writing live telemetry', async () => {
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-pi-auth-')));
  const ctx={waitUntil:p=>p.catch(()=>{})};
  const call=(token, device='pi-001', method='GET')=>worker.fetch(new Request(`http://localhost/api/v1/devices/${device}/auth-check`,{method,headers:token?{'X-XEDO-Device-Token':token}:{}}),env,ctx);
  assert.equal((await call()).status,503);
  env.XEDO_PI_TOKEN='fixture-only-device-token-at-least-32-characters';
  assert.equal((await call()).status,403);
  assert.equal((await call('wrong')).status,403);
  assert.equal((await call(env.XEDO_PI_TOKEN,'sim-pi-001')).status,403);
  assert.equal((await call(env.XEDO_PI_TOKEN,'pi-001','POST')).status,405);
  const good=await call(env.XEDO_PI_TOKEN); assert.equal(good.status,200);
  assert.equal((await good.json()).hardware_tested,false);
  const state=await worker.fetch(new Request('http://localhost/api/v1/devices/pi-001/state'),env,ctx);
  assert.equal((await state.json()).latest,null);
});
