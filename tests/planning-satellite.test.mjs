import test from 'node:test';
import assert from 'node:assert/strict';
import proof from '../src/fixtures/proof-scene.json' with {type:'json'};
import {inspectionRectangle} from '../src/mission-flow.js';
import {selectArchivedSatellite,selectSavedSatellite,selectSceneSatellite} from '../src/planning-satellite.js';

const selected=()=>inspectionRectangle([101.2,12.6,101.202,12.602]);
const outsideCrop=()=>inspectionRectangle([101.55,12.1,101.552,12.102]);
function saved(kind='cached_preview',geometry=selected()){
  const scene=structuredClone(proof),surveyId='SUR_satellite_fixture';
  const feature={type:'Feature',geometry:structuredClone(geometry),properties:{observation_id:'OBS_satellite_fixture',incident_id:'INC_satellite_fixture',scene_id:scene.id,acquired_at:scene.acquiredAt,display_asset_kind:kind}};
  const state={records:[{kind:'incident',id:'INC_satellite_fixture'},{kind:'survey',id:surveyId,incidentId:'INC_satellite_fixture',boundarySnapshot:{type:'FeatureCollection',features:[feature]}}],scenes:[scene]};
  return {geometry:structuredClone(geometry),surveyId,state};
}

test('Archived selection uses the real stored acquisition and crop grid without any fetch or input mutation',t=>{
  t.mock.method(globalThis,'fetch',()=>{throw Error('Image selection must not contact a server.');});
  const geometry=selected(),before=structuredClone(geometry),result=selectArchivedSatellite(geometry);
  assert.deepEqual(geometry,before);assert.equal(result.label,'Archived satellite image');
  assert.equal(result.scene.id,proof.id);assert.equal(result.scene.acquiredAt,proof.acquiredAt);
  assert.deepEqual(result.image,{kind:'preview',url:proof.localPreview,epsg:proof.epsg,extent:proof.previewExtent});
  result.scene.previewFootprint.coordinates[0][0][0]=0;result.image.extent[0]=0;
  const repeat=selectArchivedSatellite(geometry);assert.deepEqual(repeat.scene,proof);assert.deepEqual(repeat.image.extent,proof.previewExtent);
});

test('Archived selection rejects an area outside the stored crop even if it is inside the full satellite tile',()=>{
  const geometry=outsideCrop();
  assert.throws(()=>selectArchivedSatellite(geometry),/does not cover the whole/);
  const original=structuredClone(proof);delete original.localPreview;
  const selected=selectSceneSatellite(original,geometry);assert.equal(selected.image.kind,'cog');assert.equal(selected.image.url,'/api/assets/'+encodeURIComponent(proof.id));
});

test('A saved COG uses its original proxy asset without substituting the smaller cached image',()=>{
  const input=saved('cog',outsideCrop()),before=structuredClone(input),result=selectSavedSatellite(input);
  assert.deepEqual(input,before);assert.equal(result.label,'Saved satellite image');assert.equal(result.image.kind,'cog');
  assert.equal(result.image.url,'/api/assets/'+encodeURIComponent(proof.id));assert.equal(result.scene.localPreview,undefined);
  result.scene.footprint.coordinates[0][0][0]=0;assert.deepEqual(input,before);
  input.state.scenes[0].visual=null;assert.throws(()=>selectSavedSatellite(input),/original satellite image asset is unavailable/);
});

test('Saved previews retain the stored crop and reject a frozen area outside that crop',()=>{
  const input=saved(),before=structuredClone(input),result=selectSavedSatellite(input);
  assert.deepEqual(input,before);assert.equal(result.image.kind,'preview');assert.equal(result.image.url,proof.localPreview);
  assert.throws(()=>selectSavedSatellite(saved('cached_preview',outsideCrop())),/does not cover the whole/);
  result.scene.id='edited';result.image.extent[0]=0;assert.deepEqual(input,before);
});

test('Saved image selection rejects changes to the frozen geometry, scene, acquisition and source kind',()=>{
  const reject=change=>{const input=saved();change(input);assert.throws(()=>selectSavedSatellite(input));};
  reject(input=>{input.geometry.coordinates[0][1][0]+=.0001;});
  reject(input=>{input.state.scenes[0].id='unrelated-scene';});
  reject(input=>{input.state.scenes[0].acquiredAt='2026-10-01T00:00:00Z';});
  reject(input=>{input.state.records[1].boundarySnapshot.features[0].properties.display_asset_kind='unknown';});
  reject(input=>{input.state.records[1].boundarySnapshot.features[0].properties.incident_id='INC_other';});
  reject(input=>{input.state.records[1].boundarySnapshot.features.push(structuredClone(input.state.records[1].boundarySnapshot.features[0]));});
  reject(input=>{input.state.scenes.push(structuredClone(input.state.scenes[0]));});
  reject(input=>{input.state.records.push(structuredClone(input.state.records[1]));});
  reject(input=>{input.state.records=input.state.records.filter(record=>record.kind!=='incident');});
  reject(input=>{input.surveyId='SUR_missing';});
});

test('Saved source comes from its frozen feature, ignoring later edits to the live observation',()=>{
  const input=saved();input.state.records.push({kind:'observation',id:'OBS_satellite_fixture',sceneId:'new-scene',geometry:outsideCrop()});
  const result=selectSavedSatellite(input);assert.equal(result.scene.id,proof.id);assert.equal(result.scene.acquiredAt,proof.acquiredAt);
});

test('Scene selection requires the entire polygon and rejects unrecognized or altered cached assets',()=>{
  const geometry=selected(),before=structuredClone(proof),result=selectSceneSatellite(proof,geometry);
  assert.equal(result.image.kind,'preview');assert.deepEqual(proof,before);
  for(const change of [scene=>{scene.localPreview='https://example.invalid/other.png';},scene=>{scene.previewExtent[0]+=1;},scene=>{scene.previewFootprint.coordinates[0][0][0]+=0.001;},scene=>{scene.epsg=3857;},scene=>{scene.id='other-scene';}]){
    const scene=structuredClone(proof);change(scene);assert.throws(()=>selectSceneSatellite(scene,geometry),/cached satellite preview/);
  }
  assert.throws(()=>selectSceneSatellite({...proof,acquiredAt:'unknown'},geometry),/acquisition time/);
  assert.throws(()=>selectArchivedSatellite({type:'Point',coordinates:[101.2,12.6]}),/Polygon/);
});
