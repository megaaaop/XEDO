import proofScene from './fixtures/proof-scene.json' with {type:'json'};
import {validateGeometry} from './domain.js';
import {coveringScenes} from './mission-flow.js';

const fail=message=>{throw new Error(message);};
const sameCoordinates=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sameGeometry=(a,b)=>a?.type===b?.type&&sameCoordinates(a?.coordinates,b?.coordinates);

function boundary(geometry){
  validateGeometry(geometry);
  if(geometry.coordinates[0].length>121)fail('Choose a boundary with no more than 120 vertices.');
}
function sceneMetadata(scene){
  if(!scene||typeof scene!=='object'||typeof scene.id!=='string'||!scene.id||typeof scene.acquiredAt!=='string'||!Number.isFinite(Date.parse(scene.acquiredAt)))fail('The satellite image has no valid source or acquisition time.');
}
function covered(scene,geometry){
  if(coveringScenes([scene],geometry).length!==1)fail('The satellite image does not cover the whole inspection boundary. Choose another area or image.');
}
function preview(scene,geometry,label){
  // Only this prepared crop has a bundled image and a known display grid.
  // An arbitrary URL in an imported object is not a verified cached asset.
  if(scene.id!==proofScene.id||scene.localPreview!==proofScene.localPreview||scene.epsg!==proofScene.epsg||!sameCoordinates(scene.previewExtent,proofScene.previewExtent)||!sameGeometry(scene.previewFootprint,proofScene.previewFootprint))fail('This cached satellite preview is unavailable or its display grid does not match the stored image.');
  covered(scene,geometry);
  return {scene:structuredClone(scene),image:{kind:'preview',url:scene.localPreview,epsg:scene.epsg,extent:structuredClone(scene.previewExtent)},label};
}
function cog(scene,geometry,label){
  if(typeof scene.visual!=='string'||!scene.visual)fail('The original satellite image asset is unavailable.');
  const original=structuredClone(scene);
  // A COG snapshot must retain the original full-resolution source even when
  // the catalogue also knows about a cropped preview of the same scene.
  delete original.localPreview;
  covered(original,geometry);
  return {scene:original,image:{kind:'cog',url:'/api/assets/'+encodeURIComponent(scene.id)},label};
}

/** Pure image selection; the caller must still load and review the image. */
export function selectArchivedSatellite(geometry){
  boundary(geometry);sceneMetadata(proofScene);
  return preview(proofScene,geometry,'Archived satellite image');
}

/** A scene returned by the existing Quick mission catalogue workflow. */
export function selectSceneSatellite(scene,geometry){
  boundary(geometry);sceneMetadata(scene);
  return scene.localPreview?preview(scene,geometry,'Archived satellite image'):cog(scene,geometry,'Satellite image');
}

/** Reopen exactly the image and geometry frozen in a saved Quick survey. */
export function selectSavedSatellite({geometry,surveyId,state}={}){
  boundary(geometry);
  if(typeof surveyId!=='string'||!/^SUR_[A-Za-z0-9_-]+$/.test(surveyId)||!Array.isArray(state?.records)||!Array.isArray(state?.scenes))fail('The saved survey and its original satellite source could not be restored.');
  const surveys=state.records.filter(record=>record?.kind==='survey'&&record.id===surveyId);
  if(surveys.length!==1)fail('The saved survey could not be uniquely restored.');
  const survey=surveys[0],incidents=state.records.filter(record=>record?.kind==='incident'&&record.id===survey.incidentId);
  if(incidents.length!==1||!/^INC_[A-Za-z0-9_-]+$/.test(incidents[0].id))fail('The saved survey incident could not be restored.');
  const incident=incidents[0],observationId='OBS_'+incident.id.slice(4),features=survey.boundarySnapshot?.features;
  const matches=Array.isArray(features)?features.filter(feature=>feature?.properties?.observation_id===observationId):[];
  if(matches.length!==1||matches[0].properties.incident_id!==incident.id)fail('The survey has no unique original Quick mission image snapshot.');
  const feature=matches[0],properties=feature.properties;
  if(!sameGeometry(geometry,feature.geometry))fail('The inspection boundary differs from the frozen survey boundary. Reload the saved survey.');
  const scenes=state.scenes.filter(scene=>scene?.id===properties.scene_id);
  if(scenes.length!==1)fail('The original saved satellite scene could not be uniquely restored.');
  const scene=scenes[0];sceneMetadata(scene);
  if(typeof properties.acquired_at!=='string'||properties.acquired_at!==scene.acquiredAt)fail('The satellite acquisition time does not match the frozen survey source.');
  if(properties.display_asset_kind==='cog')return cog(scene,geometry,'Saved satellite image');
  if(properties.display_asset_kind==='cached_preview')return preview(scene,geometry,'Saved satellite image');
  fail('The saved survey does not identify its original display asset. Review its source in Advanced workspace.');
}
