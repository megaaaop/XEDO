import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const client=await readFile(new URL('../src/planning-trial-client.js',import.meta.url),'utf8');
const start=client.indexOf('function syncImageObservationTime('),end=client.indexOf('async function reviewSatellite(',start);
assert.ok(start>=0&&end>start);
function harness(){
 const observed={value:'',dataset:{}};
 const context=vm.createContext({Date,Number,field:(group,key)=>{assert.equal(group,'drift');assert.equal(key,'observedAt');return observed;}});
 vm.runInContext(client.slice(start,end),context);
 return {observed,select:time=>context.syncImageObservationTime(time)};
}
test('Switching acquisitions updates an observation time owned by the previous image',()=>{
 const h=harness();h.select('2026-10-22T03:54:13Z');assert.equal(h.observed.value,'2026-10-22T03:54');
 h.select('2026-10-19T03:55:12Z');assert.equal(h.observed.value,'2026-10-19T03:55');
 assert.equal(h.observed.dataset.satelliteObservedAt,h.observed.value);
});
test('Selecting a new image preserves a manually edited or imported observation time',()=>{
 const h=harness();h.select('2026-10-22T03:54:13Z');h.observed.value='2026-10-22T04:00';
 h.select('2026-10-19T03:55:12Z');assert.equal(h.observed.value,'2026-10-22T04:00');
 delete h.observed.dataset.satelliteObservedAt;h.observed.value='2026-10-22T03:54';
 h.select('2026-10-17T03:54:00Z');assert.equal(h.observed.value,'2026-10-22T03:54');
});
test('Cleared observation times can adopt the selected image, while invalid acquisition times never overwrite',()=>{
 const h=harness();h.select('2026-10-22T03:54:13Z');h.observed.value='';
 h.select('2026-10-19T03:55:12Z');assert.equal(h.observed.value,'2026-10-19T03:55');
 h.select('invalid');assert.equal(h.observed.value,'2026-10-19T03:55');
});
