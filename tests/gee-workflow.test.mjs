import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {localEnvironment} from '../scripts/local-storage.mjs';
import worker from '../src/worker.js';
import {QuickMission} from '../src/mission-flow.js';
import {selectSavedSatellite} from '../src/planning-satellite.js';

test('GEE reviewed scene saves the exact source and reopens its frozen survey boundary',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'xedo-gee-workflow-'));
  const env=await localEnvironment(directory);
  try{
    const api=async(route,options={})=>{const response=await worker.fetch(new Request('http://localhost/api/'+route,{...options,headers:{'Content-Type':'application/json',...options.headers}}),env,{waitUntil:()=>{}});const data=await response.json();assert(response.ok,JSON.stringify(data));return data;};
    const geometry={type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.6],[101.202,12.602],[101.2,12.602],[101.2,12.6]]]};
    const footprint={type:'Polygon',coordinates:[[[101,12],[102,12],[102,13],[101,13],[101,12]]]};
    const source={id:'gee:COPERNICUS/S2_SR_HARMONIZED/20261020T034531_20261020T035958_T47PQP',provider:'gee',collection:'COPERNICUS/S2_SR_HARMONIZED',assetKind:'gee_tiles',acquiredAt:'2026-10-20T03:45:31Z',cloudCover:15,footprint,resolution:10,platform:'Sentinel-2A'};
    await env.DB.prepare('INSERT INTO scenes (id,provider,acquired_at,metadata,fetched_at) VALUES (?,?,?,?,?)').bind(source.id,'gee',source.acquiredAt,JSON.stringify(source),new Date().toISOString()).run();
    const flow=new QuickMission(api);flow.selectArea(geometry);flow.useScene(source);
    await assert.rejects(flow.prepare(),/image is ready/);
    flow.imageReady=true;const saved=await flow.prepare();
    const state=await api('state');
    const selection=selectSavedSatellite({geometry,surveyId:saved.surveyId,state});
    assert.equal(selection.scene.id,source.id);assert.equal(selection.image.kind,'gee');
    const survey=state.records.find(record=>record.id===saved.surveyId);
    assert.equal(survey.boundarySnapshot.features[0].properties.display_asset_kind,'gee_tiles');
    assert.deepEqual(survey.boundarySnapshot.features[0].geometry,geometry);
    const observation=state.records.find(record=>record.kind==='observation');
    assert.equal(observation.assetKind,'gee_tiles');assert.equal(observation.displayGrid.epsg,3857);
    assert.equal(await flow.prepare(),saved);
  }finally{env.close();}
});
