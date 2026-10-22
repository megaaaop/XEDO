import './styles.css';
import './branding.css';
import './mission.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import ImageLayer from 'ol/layer/Image.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import ImageStatic from 'ol/source/ImageStatic.js';
import OSM from 'ol/source/OSM.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Draw from 'ol/interaction/Draw.js';
import Modify from 'ol/interaction/Modify.js';
import MultiPoint from 'ol/geom/MultiPoint.js';
import {unByKey} from 'ol/Observable.js';
import {Style,Fill,Stroke,Text,Circle as CircleStyle} from 'ol/style.js';
import {fromLonLat,toLonLat} from 'ol/proj.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {QuickMission,inspectionRectangle,selectionMetrics} from './mission-flow.js';
import {initMapLatency} from './map-latency.js';
import {createDeploymentPlanner} from './deployment-client.js';

const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(v))+' ICT';
async function api(path,options={}) {
  const response=await fetch('/api/'+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Sign in to XEDO and reload the page.');
  const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||'Unable to complete this request.');return data;
}
document.documentElement.dataset.theme=localStorage.getItem('xedo-theme')||'dark';
const latency=initMapLatency();latency.page('mission');
let flow=new QuickMission(api);const format=new GeoJSON(),zone=new VectorSource();
const cornerStyle=new CircleStyle({radius:5,fill:new Fill({color:'#65ddd0'}),stroke:new Stroke({color:'#102b3e',width:2})});
const map=new Map({target:'mission-map',layers:[new TileLayer({source:new OSM()}),new VectorLayer({source:zone,style:[new Style({stroke:new Stroke({color:'#0b2031bb',width:4}),fill:new Fill({color:'#65ddd022'})}),new Style({stroke:new Stroke({color:'#65ddd0',width:2,lineDash:[7,5]}),text:new Text({text:'INSPECTION AREA',font:'600 11px sans-serif',fill:new Fill({color:'#ffffff'}),stroke:new Stroke({color:'#102b3e',width:4})})}),new Style({geometry:feature=>new MultiPoint(feature.getGeometry().getCoordinates()[0].slice(0,-1)),image:cornerStyle})]})],view:new View({center:fromLonLat([101.225,12.605]),zoom:12,enableRotation:false})});
let page=1,working=false,drawing=true,modifying=false,sketch=null,sketchListener=null,vertexCount=0,finishScheduled=false,initial=null,raster=null,imageToken=0,failedImageToken=null,imageTimer=null,deploymentPlanner=null;
const areaDraw=new Draw({type:'Polygon',stopClick:true,freehandCondition:()=>false,style:new Style({stroke:new Stroke({color:'#65ddd0',width:3}),fill:new Fill({color:'#65ddd026'}),image:cornerStyle})});
const areaModify=new Modify({source:zone,pixelTolerance:12,style:new Style({image:new CircleStyle({radius:7,fill:new Fill({color:'#ffffff'}),stroke:new Stroke({color:'#007f92',width:3})})})});
map.addInteraction(areaModify);map.addInteraction(areaDraw);
function error(message=''){$('#mission-error').textContent=message;$('#mission-error').hidden=!message;}
function announce(message){$('#mission-live').textContent=message;}
function sketchControls(){
  $('#mission-sketch-tools').hidden=!sketch||page!==1;
  const label=vertexCount+' '+(vertexCount===1?'point':'points')+' placed';if($('#mission-vertices').textContent!==label)$('#mission-vertices').textContent=label;
  $('#mission-finish').disabled=working||vertexCount<3;$('#mission-undo').disabled=working||!sketch;$('#mission-cancel').disabled=working||!sketch;
}
function mapMode(){const active=page===1&&!working,hasSelection=!!flow.geometry||!!sketch;areaDraw.setActive(active&&drawing);areaModify.setActive(active&&!drawing&&!!flow.geometry);$('#mission-map').classList.toggle('is-drawing',active&&drawing);$('#mission-draw-tools').hidden=page!==1&&!hasSelection;$('#mission-draw').hidden=page!==1;$('#mission-pan').hidden=page!==1;$('#mission-clear').hidden=!hasSelection;$('#mission-clear').disabled=working||modifying;$('#mission-draw').disabled=!active||modifying;$('#mission-pan').disabled=!active||modifying;$('#mission-view').disabled=!active||!!sketch||modifying;$('#mission-draw').setAttribute('aria-pressed',String(drawing));$('#mission-pan').setAttribute('aria-pressed',String(!drawing));$('#mission-draw').textContent=flow.geometry?'▱ Redraw area':'▱ Draw area';sketchControls();}
function step(value){page=value;['mark','review','deploy'].forEach((name,i)=>$('#mission-'+name).hidden=i+1!==value);document.querySelectorAll('.mission-steps li').forEach((el,i)=>{el.classList.toggle('active',i+1===value);el.classList.toggle('done',i+1<value);if(i+1===value)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});deploymentPlanner?.setActive(value===3);mapMode();}
function busy(value){working=value;mapMode();deploymentPlanner?.busy(value);$('#mission-survey').disabled=value||!flow.geometry||!!sketch||modifying;$('#mission-archived').disabled=value||!flow.geometry||!!sketch||modifying||!!flow.saved||!!flow.preparationStarted;$('#mission-edit').disabled=value;$('#mission-new').disabled=value;$('#mission-retry').disabled=value;$('#mission-prepare').disabled=value||!flow.imageReady;document.querySelector('.mission-action-panel').setAttribute('aria-busy',String(value));}
function clearImage(){clearTimeout(imageTimer);$('#mission-retry').hidden=true;imageToken++;if(raster)map.removeLayer(raster);raster=null;flow.imageReady=false;}
const distance=m=>m>=1000?(m/1000).toFixed(2)+' km':Math.round(m)+' m';
const areaSize=m2=>m2>=1e6?(m2/1e6).toFixed(2)+' km²':Math.round(m2).toLocaleString('en-GB')+' m²';
function drawZone(){zone.clear();if(!flow.geometry)return;zone.addFeature(format.readFeature({type:'Feature',geometry:flow.geometry},{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}));const metrics=selectionMetrics(flow.geometry);$('#mission-position').textContent=areaSize(metrics.areaM2)+' selected';$('#mission-size').textContent=(flow.geometry.coordinates[0].length-1)+' vertices · '+distance(metrics.widthM)+' × '+distance(metrics.heightM)+' bounding extent';}
function fit(){if(flow.geometry)map.getView().fit(zone.getExtent(),{padding:[45,45,45,45],maxZoom:16,duration:200});}
function selectArea(geometry){if(working||page!==1)return false;try{flow.selectArea(geometry);clearImage();deploymentPlanner?.reset();drawing=false;drawZone();error();announce('Area selected. Ready for satellite survey.');$('#mission-map-label').textContent='Selected inspection area';$('#mission-map-caption').textContent='Area selected. Drag a vertex to adjust it, or choose Redraw area.';busy(false);return true;}catch(e){drawZone();error(e.message);announce('Boundary rejected. Your previous selection is unchanged.');busy(false);return false;}}
function clearSketch(){if(sketchListener)unByKey(sketchListener);sketchListener=null;sketch=null;vertexCount=0;sketchControls();}
areaDraw.on('drawstart',event=>{
  sketch=event.feature;vertexCount=1;error();
  sketchListener=sketch.getGeometry().on('change',()=>{
    vertexCount=Math.max(1,sketch.getGeometry().getCoordinates()[0].length-2);sketchControls();
    // Finish after OpenLayers completes appendCoordinates, which otherwise
    // continues reading a cleared sketch when its built-in limit is reached.
    if(vertexCount>=500&&!finishScheduled){finishScheduled=true;const current=sketch;queueMicrotask(()=>{finishScheduled=false;if(sketch===current&&vertexCount>=500)areaDraw.finishDrawing();});}
  });
  busy(false);announce('Drawing boundary. Place at least three points, then choose Finish area.');
  $('#mission-map-caption').textContent='Click or tap each corner. Double-click or choose Finish area to close the polygon.';
});
areaDraw.on('drawend',event=>{const geometry=format.writeGeometryObject(event.feature.getGeometry(),{featureProjection:'EPSG:3857',dataProjection:'EPSG:4326'});clearSketch();selectArea(geometry);});
areaDraw.on('drawabort',()=>{clearSketch();busy(working);if(page===1&&!working){announce(flow.geometry?'Drawing cancelled. Previous area retained.':'Drawing cancelled. Click the map to start again.');$('#mission-map-caption').textContent='Click or tap the map to place the corners of your area.';}});
areaModify.on('modifystart',()=>{modifying=true;busy(false);announce('Adjusting boundary. Release the vertex to apply the change.');});
areaModify.on('modifyend',event=>{modifying=false;const feature=event.features.item(0);if(feature)selectArea(format.writeGeometryObject(feature.getGeometry(),{featureProjection:'EPSG:3857',dataProjection:'EPSG:4326'}));else busy(false);});
function chooseMode(draw){drawing=draw;if(sketch)areaDraw.abortDrawing();mapMode();$('#mission-map-caption').textContent=draw?'Click or tap each corner, then choose Finish area.':'Drag to move the map or adjust a boundary vertex. Choose Draw area to start another polygon.';}
$('#mission-draw').onclick=()=>chooseMode(true);$('#mission-pan').onclick=()=>chooseMode(false);$('#mission-fit').onclick=()=>{if(!deploymentPlanner?.fit())fit();};
$('#mission-finish').onclick=()=>{if(!working&&vertexCount>=3)areaDraw.finishDrawing();};$('#mission-undo').onclick=()=>{if(!working)areaDraw.removeLastPoint();};$('#mission-cancel').onclick=()=>{if(!working)areaDraw.abortDrawing();};
$('#mission-map').addEventListener('keydown',event=>{
  if(working||page!==1||!drawing)return;
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
  if(directions[event.key]){const view=map.getView(),centre=view.getCenter(),size=view.getResolution()*48*(event.shiftKey?2:1),direction=directions[event.key];view.cancelAnimations();view.setCenter([centre[0]+direction[0]*size,centre[1]+direction[1]*size]);event.preventDefault();event.stopPropagation();}
  else if(event.key==='Escape'){areaDraw.abortDrawing();event.preventDefault();}
  else if(event.key==='Backspace'){areaDraw.removeLastPoint();event.preventDefault();}
  else if(event.key==='Enter'){if(event.ctrlKey||event.metaKey){if(vertexCount>=3)areaDraw.finishDrawing();}else areaDraw.appendCoordinates([map.getView().getCenter()]);event.preventDefault();}
},true);
$('#mission-view').onclick=()=>{if(working||page!==1)return;const size=map.getSize(),a=toLonLat(map.getCoordinateFromPixel([24,24])),b=toLonLat(map.getCoordinateFromPixel([size[0]-24,size[1]-24]));try{const geometry=inspectionRectangle([...a,...b]);$('#mission-dialog').close();selectArea(geometry);}catch(e){error(e.message);$('#mission-dialog').close();}};
function setImageReady(token){if(token!==imageToken||token===failedImageToken||flow.imageReady)return;clearTimeout(imageTimer);flow.imageReady=true;$('#mission-survey-status').textContent='Image ready. Review your marked area on the map.';$('#mission-map-caption').textContent='Satellite image · '+date(flow.scene.acquiredAt);$('#mission-retry').hidden=true;busy(working);deploymentPlanner?.refresh();announce(flow.saved?'Inspection request restored. Ready for 2D and 3D planning.':'Satellite image ready. You can prepare the drone inspection request.');}
function imageError(token,message){if(token!==imageToken)return;clearTimeout(imageTimer);failedImageToken=token;flow.imageReady=false;$('#mission-prepare').disabled=true;$('#mission-survey-status').textContent='Satellite image could not be loaded.';$('#mission-retry').textContent=flow.saved?'Reload saved image':'Retry image loading';$('#mission-retry').hidden=false;error(message);$('#mission-map-caption').textContent=flow.saved?'Saved image unavailable. Reload the original image.':'Satellite image unavailable. Retry image loading.';announce(flow.saved?'Saved inspection retained. The original image could not be loaded.':'Satellite image could not be loaded.');busy(working);}
async function showImage(scene) {
  clearImage();const token=imageToken;imageTimer=setTimeout(()=>imageError(token,'The satellite image is taking too long to load. Retry the survey.'),60000);
  $('#mission-acquired').textContent=date(scene.acquiredAt);$('#mission-source').textContent=(scene.localPreview?'Archived image · ':'')+'Sentinel-2 · '+(scene.cloudCover==null?'Cloud cover unknown':scene.cloudCover.toFixed(1)+'% scene cloud cover');$('#mission-map-label').textContent='Sentinel-2 · User-marked inspection area';
  const epsg=Number(scene.epsg);if(epsg>=32601&&epsg<=32760&&!proj4.defs('EPSG:'+epsg)){proj4.defs('EPSG:'+epsg,`+proj=utm +zone=${epsg%100} ${epsg>=32700?'+south':''} +datum=WGS84 +units=m +no_defs`);register(proj4);}
  if(scene.localPreview){raster=new ImageLayer({source:new ImageStatic({url:scene.localPreview,projection:'EPSG:'+scene.epsg,imageExtent:scene.previewExtent})});raster.getSource().on('imageloadend',()=>setImageReady(token));raster.getSource().on('imageloaderror',()=>imageError(token,'Unable to load the stored satellite image. Retry the survey.'));}
  else {const {createCogRaster}=await import('./raster-cog.js');if(token!==imageToken)return;const cog=createCogRaster('/api/assets/'+encodeURIComponent(scene.id));raster=cog.layer;cog.source.on('tileloadend',()=>setImageReady(token));cog.source.on('tileloaderror',()=>imageError(token,'Satellite image tiles could not be read. Retry or open Advanced workspace.'));cog.source.on('error',()=>imageError(token,'The satellite image format or coordinates could not be read.'));}
  if(token!==imageToken)return;raster.getSource().setAttributions('Contains modified Copernicus Sentinel data '+new Date(scene.acquiredAt).getUTCFullYear()+'. Source: Earth Search.');map.getLayers().insertAt(1,raster);fit();
}
async function survey(archived=false){
  if(working||!flow.geometry||sketch||modifying)return;step(2);busy(true);error();clearImage();$('#mission-acquired').textContent='Searching…';$('#mission-map-caption').textContent='Searching satellite imagery…';$('#mission-source').textContent='';$('#mission-survey-status').textContent=archived?'Opening the archived satellite image…':'Searching the last 30 days for a usable satellite image covering your area…';$('#mission-retry').hidden=true;announce('Satellite survey in progress.');
  try{const archivedScene=archived?initial.scenes.find(s=>s.localPreview):null;if(archived&&!archivedScene)throw new Error('No archived image is available.');const scene=await flow.survey({archivedScene});$('#mission-survey-status').textContent='Loading satellite imagery…';await showImage(scene);}
  catch(e){error(e.message);$('#mission-acquired').textContent=flow.scene?date(flow.scene.acquiredAt):'No image loaded';$('#mission-map-caption').textContent='Satellite survey unavailable. Retry or change the area.';$('#mission-survey-status').textContent='Survey needs another attempt.';$('#mission-retry').textContent=flow.scene?'Retry image loading':'Retry satellite survey';$('#mission-retry').hidden=false;announce('Satellite survey could not be completed.');}
  finally{busy(false);}
}
$('#mission-survey').onclick=()=>survey();
$('#mission-retry').onclick=async()=>{
  if(working)return;
  if(!flow.scene){survey();return;}
  busy(true);error();$('#mission-retry').hidden=true;
  announce(flow.saved?'Reloading the original saved image…':'Reloading the selected satellite image…');
  try{await showImage(flow.scene);}catch(e){imageError(imageToken,e.message);}finally{busy(false);}
};
$('#mission-archived').onclick=()=>{$('#mission-dialog').close();survey(true);};
$('#mission-edit').onclick=()=>{if(working)return;if(flow.geometry)flow.selectArea(flow.geometry);clearImage();drawing=false;step(1);error();announce('Drag vertices to adjust the boundary, or choose Redraw area.');$('#mission-map-label').textContent='Inspection area · Edit boundary';$('#mission-map-caption').textContent='Drag a vertex to adjust the polygon, or choose Redraw area.';busy(false);};
function resetInspection(message='Area cleared. Draw a new inspection boundary.'){
  if(working||modifying)return;
  areaDraw.abortDrawing();clearImage();flow=new QuickMission(api);deploymentPlanner?.reset();zone.clear();
  history.replaceState(null,'','/mission.html');$('#mission-position').textContent='No area selected';$('#mission-size').textContent='Draw a polygon on the map';
  $('#mission-saved').hidden=true;$('#mission-request-id').textContent='';$('#mission-export').href='#';$('#mission-acquired').textContent='Waiting for image';$('#mission-source').textContent='';
  drawing=true;step(1);error();announce(message);$('#mission-map-label').textContent='Draw an inspection area';$('#mission-map-caption').textContent='Click or tap each corner, then choose Finish area.';busy(false);$('#mission-map').focus({preventScroll:true});
}
$('#mission-clear').onclick=()=>resetInspection();$('#mission-new').onclick=()=>resetInspection('Select a new inspection area.');
function savedRequest(){step(3);document.querySelector("#mission-lab").href="/planning.html?survey="+encodeURIComponent(flow.saved.surveyId);$('#mission-request-id').textContent=flow.saved.surveyId;$('#mission-export').href='/api/survey-export/'+encodeURIComponent(flow.saved.surveyId);$('#mission-saved').hidden=false;$('#mission-deploy-status').textContent='Choose a 2D route plan or 3D height preview using your saved inspection area.';history.replaceState(null,'','/mission.html?incident='+encodeURIComponent(flow.saved.incidentId)+'&survey='+encodeURIComponent(flow.saved.surveyId));announce('Inspection request saved. Ready for 2D and 3D planning.');}
$('#mission-prepare').onclick=async()=>{if(working||!flow.imageReady)return;busy(true);error();announce('Saving the inspection request…');try{await flow.prepare(initial?.user||'Workspace operator');savedRequest();}catch(e){error(e.message);announce('The request was not completed. Retry to resume saving.');}finally{busy(false);}};
$('#mission-options').onclick=()=>{const s=flow.scene,metrics=flow.geometry?selectionMetrics(flow.geometry):null;$('#mission-details').innerHTML=`<dl><dt>Inspection area · WGS84 bounds</dt><dd>${metrics?['West','South','East','North'].map((label,i)=>label+' '+metrics.bbox[i].toFixed(5)+'°').join(' · '):'Not selected'}</dd><dt>Selected area</dt><dd>${metrics?areaSize(metrics.areaM2)+' · '+(flow.geometry.coordinates[0].length-1)+' vertices · '+distance(metrics.widthM)+' × '+distance(metrics.heightM)+' bounding extent (approximate)':'Draw a polygon on the map'}</dd><dt>Satellite source</dt><dd>Sentinel-2 · Earth Search. GEE imagery is not connected to this workflow yet.</dd><dt>GEE connection check</dt><dd>${esc($('#mission-gee').getAttribute('aria-label'))}</dd><dt>Pi data channel</dt><dd>${initial?.piConfigured?'Configured. Open Monitor & Replay to inspect live readings.':'Not configured.'}</dd><dt>Image</dt><dd>${s?esc(s.productId):'No image selected'}</dd><dt>Acquired</dt><dd>${s?esc(date(s.acquiredAt)):'Unknown'}</dd><dt>Quality inside the inspection area</dt><dd>Not evaluated. Scene cloud cover does not establish visibility across the selected area.</dd><dt>Analysis</dt><dd>Manual image review. Satellite AI is not connected to this workflow yet.</dd><dt>Drone release</dt><dd>Hardware control not connected. Preparing a request does not send a flight or release command.</dd></dl>`;$('#mission-dialog').showModal();};$('#mission-dialog-close').onclick=()=>$('#mission-dialog').close();
document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self'||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();location.assign(link.href);});
async function start(){
  busy(true);announce('Loading your workspace…');
  try{const incidentId=new URLSearchParams(location.search).get('incident');if(incidentId&&!/^[a-zA-Z0-9_-]{5,80}$/.test(incidentId))throw new Error('Invalid inspection link.');initial=await api('state'+(incidentId?'':'?scope=satellite'));
    if(incidentId){const surveyId=new URLSearchParams(location.search).get('survey');if(surveyId&&!/^[a-zA-Z0-9_-]{5,80}$/.test(surveyId))throw new Error('Invalid inspection request link.');flow.restore(incidentId,initial,surveyId);drawZone();savedRequest();await showImage(flow.scene);}
    else announce('Ready. Click or tap the map to draw an inspection polygon.');
  }catch(e){error(e.message);announce('Workspace could not be loaded. Reload to try again.');}finally{busy(false);}
}
deploymentPlanner=createDeploymentPlanner({map,format,api,getSelection:()=>({saved:flow.saved,geometry:flow.geometry,scene:flow.scene}),setBusy:busy,announce});
start();
