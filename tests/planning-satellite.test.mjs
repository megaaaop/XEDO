import test from 'node:test';
import assert from 'node:assert/strict';
import proof from '../src/fixtures/proof-scene.json' with {type:'json'};
import {inspectionRectangle} from '../src/mission-flow.js';
import {selectArchivedSatellite,selectSavedSatellite,selectSceneSatellite,selectGEESatellite,bindGEESatelliteMap,satelliteTileClip,hasVisibleSatellitePixels} from '../src/planning-satellite.js';

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

const geeScene=()=>({
  id:'gee:COPERNICUS/S2_SR_HARMONIZED/20261022T034539_20261022T035146_T47PQP',provider:'gee',assetKind:'gee_tiles',collection:'COPERNICUS/S2_SR_HARMONIZED',
  acquiredAt:'2026-10-22T03:45:39.000Z',cloudCover:17.5,platform:'Sentinel-2A',resolution:10,
  footprint:inspectionRectangle([101,12.3,101.7,12.9]),bbox:[101,12.3,101.7,12.9],
});
const mapSession=(scene,geometry)=>({sessionId:'sealed_session_token_1234567890',expiresAt:'2099-01-01T01:00:00.000Z',scene:structuredClone(scene),geometry:structuredClone(geometry),tileUrl:'/api/v1/gee/imagery/tiles/sealed_session_token_1234567890/{z}/{x}/{y}'});

test('GEE image selection freezes the chosen scene and complete boundary without accepting asset URLs',()=>{
  const geometry=selected(),scene=geeScene(),before=structuredClone({scene,geometry});
  const selection=selectSceneSatellite({...scene,visual:'https://untrusted.invalid/map'},geometry);
  assert.equal(selection.image.kind,'gee');assert.equal(selection.image.sceneId,scene.id);assert.equal(selection.image.url,undefined);
  assert.deepEqual(selection.geometry,geometry);assert.equal(selection.scene.cloudCover,17.5);
  selection.geometry.coordinates[0][0][0]=0;selection.scene.footprint.coordinates[0][0][0]=0;
  assert.deepEqual({scene,geometry},before);
  assert.throws(()=>selectGEESatellite(scene,inspectionRectangle([101.65,12.5,101.75,12.6])),/cover the whole/);
  for(const change of [s=>s.provider='earth',s=>s.assetKind='cog',s=>s.id='unrelated-image',s=>s.collection='other',s=>s.acquiredAt='unknown',s=>s.cloudCover=101,s=>s.cloudCover=null,s=>s.resolution=null]){
    const altered=geeScene();change(altered);assert.throws(()=>selectGEESatellite(altered,geometry));
  }
});

test('GEE maps must bind the exact chosen source and geometry to a valid same-origin tile session',()=>{
  const geometry=selected(),scene=geeScene(),selection=selectGEESatellite(scene,geometry),manifest=mapSession(scene,geometry),before=structuredClone({selection,manifest});
  const bound=bindGEESatelliteMap(selection,manifest,{now:0});
  assert.equal(bound.image.url,manifest.tileUrl);assert.equal(bound.image.sessionId,manifest.sessionId);
  assert.deepEqual({selection,manifest},before);
  bound.scene.cloudCover=99;bound.geometry.coordinates[0][0][0]=0;assert.deepEqual({selection,manifest},before);
  for(const url of ['https://earthengine.googleapis.com/map/token/{z}/{x}/{y}','//evil.invalid/tiles/{z}/{x}/{y}','/api/v1/gee/imagery/tiles/different_session_1234/{z}/{x}/{y}',manifest.tileUrl+'?token=untrusted',manifest.tileUrl.replace('/{z}/','/../{z}/')]){
    assert.throws(()=>bindGEESatelliteMap(selection,{...manifest,tileUrl:url},{now:0}),/invalid or expired/);
  }
  for(const change of [
    m=>m.scene.id=m.scene.id.replace('20261022','20261021'),m=>m.scene.acquiredAt='2026-10-21T03:45:39.000Z',m=>m.scene.cloudCover=20,
    m=>m.scene.footprint=inspectionRectangle([100.99,12.3,101.7,12.9]),m=>m.geometry=outsideCrop(),m=>delete m.geometry,
    m=>m.expiresAt='1970-01-01T00:00:00Z',m=>m.expiresAt='unknown',m=>m.sessionId='../untrusted-session',
  ]){
    const altered=structuredClone(manifest);change(altered);assert.throws(()=>bindGEESatelliteMap(selection,altered,{now:1}));
  }
  const longSession='a'.repeat(4096);assert.equal(bindGEESatelliteMap(selection,{...manifest,sessionId:longSession,tileUrl:'/api/v1/gee/imagery/tiles/'+longSession+'/{z}/{x}/{y}'},{now:0}).image.sessionId,longSession);
});

test('Saved GEE surveys reopen their frozen source and require a renewed tile session',()=>{
  const input=saved('gee_tiles'),scene=geeScene();input.state.scenes=[scene];
  Object.assign(input.state.records[1].boundarySnapshot.features[0].properties,{scene_id:scene.id,acquired_at:scene.acquiredAt});
  const selection=selectSavedSatellite(input);
  assert.equal(selection.label,'Saved Earth Engine image');assert.equal(selection.image.kind,'gee');assert.equal(selection.image.url,undefined);
  assert.equal(selection.scene.id,scene.id);assert.deepEqual(selection.geometry,input.geometry);
  assert.throws(()=>selectSavedSatellite({...input,geometry:outsideCrop()}),/differs from the frozen/);
});

test('Satellite pixel readiness requires nonzero alpha and accepts opaque black RGB',()=>{
  const transparent=new Uint8ClampedArray([200,100,50,0,255,255,255,0]);
  assert.equal(hasVisibleSatellitePixels(transparent),false,'RGB values beneath a fully transparent mask do not count');
  assert.equal(hasVisibleSatellitePixels(new Uint8ClampedArray([0,0,0,255])),true,'A decoded opaque RGB pixel can be black');
  assert.equal(hasVisibleSatellitePixels(new Uint8ClampedArray([0,0,0,0,10,20,30,1])),true,'One rendered pixel with nonzero alpha is sufficient');
  for(const invalid of [null,new Uint8ClampedArray(),new Uint8ClampedArray([0,0,255])])assert.equal(hasVisibleSatellitePixels(invalid),false);
});

test('Satellite tile clipping preserves the complete concave polygon and correct PNG row orientation',()=>{
  const ring=[[12,28],[18,28],[18,26],[15,26],[15,22],[12,22],[12,28]],before=structuredClone(ring);
  const clip=satelliteTileClip(ring,[10,20,20,30],100,200);
  assert.deepEqual(clip,[[20,40],[80,40],[80,80],[50,80],[50,160],[20,160],[20,40]]);
  assert.deepEqual(ring,before);
  assert.deepEqual(satelliteTileClip([[0,0],[20,0],[20,20],[0,0]],[10,10,20,20],256,256),[[-256,512],[256,512],[256,0],[-256,512]],'Coordinates outside the tile remain outside its canvas clip');
  assert.throws(()=>satelliteTileClip(ring,[10,20,10,30],100,200),/grid is invalid/);
});
