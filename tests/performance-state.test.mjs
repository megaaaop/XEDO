import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from '../src/worker.js';
import {localEnvironment} from '../scripts/local-storage.mjs';
import {database,insertStatement} from '../src/storage.js';

test('satellite startup omits unrelated history while full state remains complete and fresh',async()=>{
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-performance-')));
  try {
    const call=async(scope,user='reviewer-a')=>{
      const response=await worker.fetch(new Request('http://localhost/api/state'+(scope?'?scope='+scope:''),{headers:{'oai-authenticated-user-id':user}}),env,{});
      return {response,text:await response.text()};
    };
    assert.equal((await call()).response.status,200);
    const db=database(env),records=[
      {id:'INC_perf',kind:'incident',areaId:'rayong',title:'Performance fixture',status:'suspected'},
      {id:'OBS_perf',kind:'observation',incidentId:'INC_perf',sceneId:'earth:referenced'}
    ];
    for(let i=0;i<80;i++)records.push({id:'EVENT_perf_'+i,kind:'event',target:'INC_perf',note:'x'.repeat(2000)});
    await db.batch(records.map(record=>insertStatement(record)));
    await db.batch(Array.from({length:40},(_,i)=>['INSERT INTO scenes(id,provider,acquired_at,metadata,fetched_at) VALUES(?,?,?,?,?)',[
      i===0?'earth:referenced':'earth:unused-'+i,'earth','2026-09-29',JSON.stringify({id:i===0?'earth:referenced':'earth:unused-'+i,metadataPadding:'x'.repeat(1000)}),'2026-10-05'
    ]]));
    const lean=await call('satellite'),full=await call();
    const data=JSON.parse(lean.text),complete=JSON.parse(full.text);
    assert.equal(data.scope,'satellite');
    assert.deepEqual(new Set(data.records.map(record=>record.kind)),new Set(['area','incident','observation']));
    assert.ok(data.records.some(record=>record.id==='INC_perf'));
    assert.equal(data.scenes.length,2);
    assert.ok(data.scenes.some(scene=>scene.id==='earth:referenced'));
    assert.ok(data.scenes.some(scene=>scene.localPreview));
    assert.equal(complete.records.filter(record=>record.kind==='event').length,80);
    assert.equal(complete.scenes.length,41);
    assert.ok(Buffer.byteLength(lean.text)<Buffer.byteLength(full.text)/4);
    assert.match(lean.response.headers.get('server-timing'),/^workspace;dur=\d+\.\d$/);
    assert.equal(lean.response.headers.get('cache-control'),'no-store');
    assert.equal(JSON.parse((await call('satellite','reviewer-b')).text).user,'reviewer-b');
    assert.equal((await call('unknown')).response.status,422);
  } finally {env.close();}
});

test('workspace setup is reused without caching records, and transient setup failure is retried',async()=>{
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-setup-')));
  const original=env.DB.prepare;
  let failOnce=true,writes=0;
  env.DB.prepare=sql=>{
    if(/^INSERT|^UPDATE/.test(sql)){
      writes++;
      if(failOnce){failOnce=false;throw new Error('temporary test database failure');}
    }
    return original(sql);
  };
  try {
    const call=()=>worker.fetch(new Request('http://localhost/api/state?scope=satellite'),env,{});
    assert.equal((await call()).status,503);
    assert.equal((await call()).status,200);
    const afterSetup=writes;
    assert.equal((await call()).status,200);
    assert.equal(writes,afterSetup);
    await database(env).batch([insertStatement({id:'INC_new',kind:'incident',title:'Fresh record',status:'suspected'})]);
    const response=await call();
    assert.ok((await response.json()).records.some(record=>record.id==='INC_new'));
  } finally {env.close();}
});
