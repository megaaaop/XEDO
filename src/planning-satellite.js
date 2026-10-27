import proofScene from './fixtures/proof-scene.json' with {type:'json'};
import {validateGeometry} from './domain.js';
import {coveringScenes} from './mission-flow.js';
import {satelliteDisplayContext,SATELLITE_CONTEXT_BUFFER_M} from './satellite-context.js';

const fail=message=>{throw new Error(message);};
const sameCoordinates=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sameGeometry=(a,b)=>a?.type===b?.type&&sameCoordinates(a?.coordinates,b?.coordinates);

/** Project an inspection ring into PNG pixels (image rows run north to south). */
export function satelliteTileClip(ring,extent,width,height){
  if(!Array.isArray(ring)||ring.length<4||ring.some(point=>!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))||!Array.isArray(extent)||extent.length!==4||!extent.every(Number.isFinite)||extent[0]>=extent[2]||extent[1]>=extent[3]||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)fail('The satellite image grid is invalid.');
  return ring.map(([x,y])=>[(x-extent[0])/(extent[2]-extent[0])*width,(extent[3]-y)/(extent[3]-extent[1])*height]);
}

/** Scan decoded RGBA after clipping to the inspection polygon. Black RGB is valid imagery. */
export function hasVisibleSatellitePixels(data){
  if(!data||!Number.isInteger(data.length)||!data.length||data.length%4!==0)return false;
  for(let index=3;index<data.length;index+=4)if(data[index]>0)return true;
  return false;
}

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

/** GEE scenes retain their exact acquisition and complete footprint. No remote image URL is accepted. */
export function selectGEESatellite(scene,geometry){
  boundary(geometry);sceneMetadata(scene);
  if(!/^gee:COPERNICUS\/S2_SR_HARMONIZED\/\d{8}T\d{6}_\d{8}T\d{6}_T\d{2}[A-Z]{3}$/.test(scene.id)||scene.provider!=='gee'||scene.assetKind!=='gee_tiles'||scene.collection!=='COPERNICUS/S2_SR_HARMONIZED'||!Number.isFinite(scene.cloudCover)||scene.cloudCover<0||scene.cloudCover>100||typeof scene.platform!=='string'||!scene.platform||!Number.isFinite(scene.resolution)||scene.resolution<=0)fail('The Earth Engine image source is incomplete or unsupported.');
  // Reuse the full polygon coverage check without treating an imported URL as an asset.
  covered({...scene,visual:'metadata-only',localPreview:null},geometry);
  return {scene:structuredClone(scene),geometry:structuredClone(geometry),image:{kind:'gee',sceneId:scene.id},label:'Earth Engine satellite image'};
}

/** Bind only a server-issued, same-origin tile session to the selected scene and boundary. */
export function bindGEESatelliteMap(selection,manifest,{now=Date.now()}={}){
  const expected=selectGEESatellite(selection?.scene,selection?.geometry);
  const actual=selectGEESatellite(manifest?.scene,expected.geometry);
  if(!sameGeometry(expected.geometry,manifest?.geometry))fail('The Earth Engine map boundary does not match the selected inspection area.');
  const hasContext=manifest?.displayGeometry!==undefined||manifest?.contextBufferM!==undefined;
  const displayGeometry=hasContext?satelliteDisplayContext(expected.geometry):expected.geometry;
  if(hasContext&&(manifest.contextBufferM!==SATELLITE_CONTEXT_BUFFER_M||!sameGeometry(displayGeometry,manifest.displayGeometry)))fail('The Earth Engine display context does not match the selected inspection area. Reload the image.');
  if(['id','provider','assetKind','collection','acquiredAt','cloudCover','platform','resolution'].some(key=>expected.scene[key]!==actual.scene[key])||!sameGeometry(expected.scene.footprint,actual.scene.footprint))fail('The Earth Engine map does not match the selected satellite source. Search again.');
  const session=manifest?.sessionId,expires=Date.parse(manifest?.expiresAt);
  if(typeof session!=='string'||!/^[A-Za-z0-9_-]{16,4096}$/.test(session)||manifest.tileUrl!=='/api/v1/gee/imagery/tiles/'+session+'/{z}/{x}/{y}'||!Number.isFinite(expires)||expires<=now)fail('The Earth Engine tile session is invalid or expired. Reload the selected image.');
  return {...expected,image:{kind:'gee',sceneId:expected.scene.id,url:manifest.tileUrl,sessionId:session,expiresAt:manifest.expiresAt,displayGeometry:structuredClone(displayGeometry),contextBufferM:hasContext?SATELLITE_CONTEXT_BUFFER_M:0}};
}

/** Pure image selection; the caller must still load and review the image. */
export function selectArchivedSatellite(geometry){
  boundary(geometry);sceneMetadata(proofScene);
  return preview(proofScene,geometry,'Archived satellite image');
}

/** A scene returned by the existing Quick mission catalogue workflow. */
export function selectSceneSatellite(scene,geometry){
  boundary(geometry);sceneMetadata(scene);
  if(scene.provider==='gee'||scene.assetKind==='gee_tiles')return selectGEESatellite(scene,geometry);
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
  if(properties.display_asset_kind==='gee_tiles')return {...selectGEESatellite(scene,geometry),label:'Saved Earth Engine image'};
  if(properties.display_asset_kind==='cog')return cog(scene,geometry,'Saved satellite image');
  if(properties.display_asset_kind==='cached_preview')return preview(scene,geometry,'Saved satellite image');
  fail('The saved survey does not identify its original display asset. Review its source in Advanced workspace.');
}
