import './styles.css';
import './branding.css';
import './mission.css';
import './planning-trial.css';
import './planning-brand.css';
import './planning-help.css';
import {initializePlanningHelp} from './planning-help.js';
import {planningRuntime,requestPlanningTrial} from './planning-runtime.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageStatic from 'ol/source/ImageStatic.js';
import XYZ from 'ol/source/XYZ.js';
import TileState from 'ol/TileState.js';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {QuickMission,selectionMetrics,recentDates} from './mission-flow.js';
import {selectArchivedSatellite,selectSceneSatellite,selectSavedSatellite,selectGEESatellite,bindGEESatelliteMap,satelliteTileClip,hasVisibleSatellitePixels} from './planning-satellite.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import OSM from 'ol/source/OSM.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Draw from 'ol/interaction/Draw.js';
import {unByKey} from 'ol/Observable.js';
import {Style,Stroke,Fill,Circle as CircleStyle} from 'ol/style.js';
import {fromLonLat,toLonLat} from 'ol/proj.js';
import {validateGeometry} from './domain.js';
import {createGEEBasemap} from './planning-basemap.js';

const runtime=planningRuntime(location.protocol,typeof __XEDO_STANDALONE__==='boolean'&&__XEDO_STANDALONE__);
const fileMode=runtime.standalone;
const geeHosted=!runtime.localFile&&(typeof __XEDO_GEE_HOSTED__!=='boolean'||__XEDO_GEE_HOSTED__===true);
const embeddedPreview=typeof __XEDO_PREVIEW_DATA__==='string'?__XEDO_PREVIEW_DATA__:null;
const $=q=>document.querySelector(q),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(value,places=2)=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:places}):'Unknown';
const list=values=>values?.length?'<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'';
const dl=rows=>'<dl>'+rows.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';
// Only documented project constants are filled initially. Hardware settings stay blank.
const fields={
  drift:[['observedAt','Observation time (UTC)','datetime-local'],['arriveAt','Arrive at search area (UTC)','datetime-local'],['endAt','Search window ends (UTC)','datetime-local'],['currentEastMps','Surface current east (m/s)'],['currentNorthMps','Surface current north (m/s)'],['windSpeedMps','10 m wind speed (m/s)'],['windFromDeg','Wind FROM bearing (° true)'],['alpha','Nominal windage',null,.03],['alphaMin','Lower windage',null,.025],['alphaMax','Upper windage',null,.04],['marginM','Additional search margin (m)',null,0]],
  camera:[['sensorWidthMm','Active sensor width (mm)'],['sensorHeightMm','Active sensor height (mm)'],['focalLengthMm','Actual focal length (mm)'],['imageWidthPx','Output width (px)'],['imageHeightPx','Output height (px)'],['sideOverlap','Side overlap (%)'],['frontOverlap','Front overlap (%)'],['minTriggerIntervalS','Camera minimum interval (s)']],
  aircraft:[['altitudeM','Requested height AGL (m)'],['speedMps','Target ground speed (m/s)'],['homeLongitude','Home longitude (°)'],['homeLatitude','Home latitude (°)'],['windEastMps','Flight-level wind east (m/s)'],['windNorthMps','Flight-level wind north (m/s)'],['windLimitMps','Aircraft wind limit (m/s)'],['maxAirspeedMps','Aircraft maximum airspeed (m/s)']],
  battery:[['usableWh','Starting usable energy (Wh)'],['reserveWh','Final landing reserve (Wh)'],['powerW','Calibrated / assumed power (W)'],['takeoffS','Takeoff + climb allowance (s)'],['landingS','Landing allowance (s)'],['turnS','Allowance per turn (s)']],
  export:[['firmware','Flight firmware','select'],['qgcVersion','Target QGC version','text'],['homeAmslM','Home altitude AMSL (m)'],['relativeHeightM','Route height above home (m)'],['ceilingM','Permitted ceiling above home (m)'],['corridorM','Route corridor margin (m)'],['plannedTakeoffAt','Scheduled takeoff (UTC)','datetime-local'],['plannedEndAt','Scheduled end incl. ground delays (UTC; optional)','datetime-local'],['validUntil','Constraint validity ends (UTC)','datetime-local'],['source','Constraint source / review reference','text']],
  oil:[['pixelCount','Reviewed oil pixels'],['gsdM','Image GSD X (m/pixel)'],['gsdYM','Image GSD Y (optional; same as X)'],['areaM2','OR measured oil area (m²)'],['thicknessLowUm','Lower thickness (µm)'],['thicknessHighUm','Upper thickness (µm; blank = unknown)'],['densityGml','Oil density (g/mL)',null,.86],['capacityGg','Capacity (g oil/g dry capsules)',null,3.42],['allowance','Material allowance factor',null,1.5],['targetFraction','Target fraction (0–1)',null,1],['oilFraction','Oil fraction of emulsion (0–1)']]
};
const prefixes={drift:'drift',camera:'flight',aircraft:'flight',battery:'flight',export:'export',oil:'oil'};
for(const [group,items] of Object.entries(fields)){
  const container=$('#'+(group==='export'?'export':group==='oil'?'oil':group==='drift'?'drift':group)+'-fields');
  for(const [key,label,type='number',value] of items){
    const actualType=type||'number',wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement(actualType==='select'?'select':'input');input.id='f-'+prefixes[group]+'-'+key;input.name=prefixes[group]+'.'+key;
    if(actualType==='select')input.innerHTML='<option value="">Unknown firmware</option><option value="PX4">PX4 · verify version</option><option value="ArduPilot">ArduPilot · verify version</option>';
    else{input.type=actualType;if(actualType==='number')input.step='any';if(actualType==='text')input.maxLength=300;}
    if(value!==undefined)input.value=value;input.placeholder=actualType==='number'?'Unknown':actualType==='text'?'Not configured':'';
    wrapper.append(input);container.append(wrapper);
  }
}
let geometry=null,surveyId=null,result=null,working=false,revision=0,abort=null,draw=null,sketch=null,sketchListener=null,vertexCount=0,selectHome=false,mode='2d',renderer=null,rendererTask=null,example=false;
let currentStep=1,review=null,webMission=null,satelliteRaster=null,satelliteAbort=null,satelliteToken=0,calculationTimer=null,satelliteBusy=false;
let satelliteScenes=[],satelliteSearchGeometry=null,satelliteExpiryTimer=null,lastSatelliteAction='search';
const format=new GeoJSON(),vectors=new VectorSource();
const colors={original:'#4cd0ce',nominal:'#b6a0ff',scenario:'#b6a0ff80',envelope:'#e8ae63',route:'#ffda8c',home:'#ffffff'};
const overlay=new VectorLayer({source:vectors,style:f=>{const role=f.get('role')||'original',color=colors[role]||colors.original;return new Style({stroke:new Stroke({color,width:role==='route'?2.5:2,lineDash:role==='envelope'?[7,5]:undefined}),fill:new Fill({color:role==='route'?'transparent':color+'12'}),image:new CircleStyle({radius:6,fill:new Fill({color}),stroke:new Stroke({color:'#102031',width:2})})});}});
const map=new Map({target:'trial-map',layers:[...(!geeHosted?[new TileLayer({source:new OSM(),zIndex:0})]:[]),overlay],view:new View({center:fromLonLat([101.23,12.62]),zoom:11})});
overlay.setZIndex(20);
const basemap=geeHosted?createGEEBasemap({map,onState(state){
  const panel=$('#trial-basemap-status');panel.dataset.state=state.status;
  $('#trial-basemap-source').textContent=state.label;$('#trial-basemap-message').textContent=state.message;$('#trial-basemap-retry').hidden=!state.retry;
}}):null;
if(geeHosted)$('#trial-map-title').textContent='Earth Engine satellite map';
$('#trial-basemap-status').hidden=!geeHosted;$('#trial-basemap-retry').onclick=()=>basemap?.retry();
window.addEventListener('pagehide',()=>basemap?.dispose(),{once:true});
function error(message=''){$('#trial-error').hidden=!message;$('#trial-error').textContent=message;}
function announce(message){$('#trial-live').textContent=message;}
function setWorking(value){
  working=value;const allowed=currentStep===3&&review?.ready;
  $('#trial-run').disabled=value||!!draw||!allowed;$('#trial-run').textContent=value?'Calculating…':'Refresh calculations';
  $('#trial-qgc').disabled=value||!!draw||!allowed||!result?.exportCheck?.pass;$('#trial-snapshot').disabled=value||!!draw||!result;
  $('#trial-settings').setAttribute('aria-busy',String(value));refreshFlow();
}
function queueCalculations(){
  clearTimeout(calculationTimer);if(currentStep!==3||!review?.ready)return;
  $('#trial-engine-status').textContent='Updating mission calculations…';
  calculationTimer=setTimeout(()=>{if(currentStep===3&&review?.ready&&!draw&&!working)$('#trial-run').click();},250);
}
function invalidate(){revision++;abort?.abort();abort=null;result=null;clearTimeout(calculationTimer);$('#trial-qgc').disabled=true;$('#trial-snapshot').disabled=true;for(const id of ['drift','flight','export','oil'])$('#'+id+'-result').textContent='Results update automatically when the mission is prepared.';$('#trial-sortie').innerHTML='<option value="0">No assessed sorties</option>';drawMap();update3D();statuses();if(working)setWorking(false);refreshFlow();queueCalculations();}
function field(group,key){return $('#f-'+group+'-'+key);}
function notice(){$('#trial-notice').textContent=runtime.label+(example?' · Test data':'');}
function resetReview(home=false){$('#export-airspace-reviewed').checked=false;$('#export-flat-confirmed').checked=false;if(home)$('#export-home-confirmed').checked=false;}
function clearGeometry(){resetSurvey();resetReview();geometry=null;surveyId=null;$('#trial-survey').value='';$('#trial-geometry').value='';$('#trial-source').textContent='No boundary selected.';invalidate();}
function read(group){const data={};for(const item of document.querySelectorAll('[name^="'+group+'."]')){const key=item.name.slice(group.length+1),value=item.value.trim();data[key]=value===''?null:item.type==='number'?Number(value):item.type==='datetime-local'?new Date(value+'Z').toISOString():value;}return data;}
function body(){
  const flight=read('flight'),lon=flight.homeLongitude,lat=flight.homeLatitude;delete flight.homeLongitude;delete flight.homeLatitude;
  flight.home=lon==null&&lat==null?null:[lon,lat];
  if(flight.sideOverlap!=null)flight.sideOverlap/=100;if(flight.frontOverlap!=null)flight.frontOverlap/=100;
  const exportSettings={...read('export'),limitReference:'relative_home',homeConfirmed:$('#export-home-confirmed').checked,flatSurfaceConfirmed:$('#export-flat-confirmed').checked,airspaceReviewed:$('#export-airspace-reviewed').checked};
  const noGo=$('#export-nogo').value.trim();if(noGo){try{exportSettings.noGo=JSON.parse(noGo);}catch{exportSettings.noGo=noGo;}}else exportSettings.noGo=null;
  const oil={...read('oil'),emulsion:$('#oil-emulsion').checked};if(oil.gsdYM==null)delete oil.gsdYM;if(!oil.emulsion&&oil.oilFraction==null)delete oil.oilFraction;
  return {...(surveyId?{surveyId}:{geometry}),driftEnabled:$('#drift-enabled').checked,drift:read('drift'),flight,export:exportSettings,oil};
}
function api(path,options={}){return requestPlanningTrial(runtime,path,options);}
function add(geometry,role){if(!geometry)return;const feature=format.readFeature({type:'Feature',geometry,properties:{role}},{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'});vectors.addFeature(feature);}
function displayPlan(){
  const plan=result?.flight?.plan,sorties=result?.flight?.battery?.sorties;
  if(!plan||!sorties?.length)return plan;
  return {...plan,waypoints:sorties.flatMap(s=>s.waypoints),localWaypoints:undefined};
}
function drawMap(){
  vectors.clear();add(geometry,'original');
  if(currentStep===3&&result?.drift?.geometry){add(result.drift.geometry,'envelope');add(result.drift.nominalArriveGeometry,'nominal');add(result.drift.nominalGeometry,'nominal');}
  const plan=currentStep===3?result?.flight?.plan:null,sorties=currentStep===3?result?.flight?.battery?.sorties:null;
  if(sorties?.length)for(const sortie of sorties)add({type:'LineString',coordinates:sortie.waypoints.map(w=>w.position)},'route');
  else if(plan?.status==='generated')for(const s of plan.segments)add({type:'LineString',coordinates:[plan.waypoints[s.from].position,plan.waypoints[s.to].position]},'route');
  const f=read('flight');if(Number.isFinite(f.homeLongitude)&&Number.isFinite(f.homeLatitude))add({type:'Point',coordinates:[f.homeLongitude,f.homeLatitude]},'home');
  $('#trial-route-note').textContent=sorties?.length?'Assessed routes · Includes home transit':plan?.status==='generated'?'Survey route only · Flight assessment needed':currentStep===2?'Satellite image · Review selected area':currentStep===3?'Route needs mission settings':geometry?'Inspection area selected':'No area selected';
}
function fit(){if(vectors.getFeatures().length)map.getView().fit(vectors.getExtent(),{padding:[45,45,45,45],maxZoom:17,duration:200});}
async function update3D(){
  if(mode!=='3d')return;const token=revision,plan=currentStep===3?displayPlan():null,generated=plan?.status==='generated';$('#trial-canvas').hidden=!generated;$('#trial-3d-empty').hidden=generated;$('#trial-3d-reset').hidden=!generated;
  if(!generated){$('#trial-3d-empty').textContent='Calculate a generated route to see its height diagram.';return;}
  try{if(!renderer){rendererTask??=import('./deployment-3d.js').then(m=>m.createDeployment3D($('#trial-canvas')));renderer=await rendererTask;}if(token!==revision||mode!=='3d')return;renderer.setData({plan,context:null});renderer.resize();}
  catch{if(token!==revision)return;$('#trial-canvas').hidden=true;$('#trial-3d-empty').hidden=false;$('#trial-3d-empty').innerHTML='The 3D tools could not load. <button class="button secondary" type="button" id="trial-reload">Reload page</button><p>Download a snapshot first to retain trial inputs.</p>';$('#trial-reload').onclick=()=>location.reload();}
}
function statuses(){const states=result?[['Drift scenarios',result.drift.state],['Camera route',result.flight.plan?.status==='generated'?'assumption_based':result.flight.state],['Flight file checks',result.exportCheck.state],['Oil & material',result.oil.state]]:[['Drift scenarios','waiting'],['Camera route','waiting'],['Flight file checks','waiting'],['Oil & material','waiting']];const labels={assumption_based:'Estimate computed',generated:'Route generated',pass:'Manual checks complete',incomplete:'Inputs needed',blocked:'Blocked',disabled:'Not selected',waiting:'Not calculated'};$('#trial-status').innerHTML=states.map(([name,state])=>'<div data-state="'+esc(state)+'"><small>'+esc(name)+'</small><strong>'+esc(labels[state]||state)+'</strong></div>').join('');renderMissionSummary();}
function render(){
  const {drift,flight,exportCheck,oil}=result,camera=flight.camera||{},battery=flight.battery||{};
  $('#drift-result').innerHTML='<p class="trial-result-context">'+esc(drift.state==='disabled'?'Original boundary selected':'Constant-vector search scenarios')+'</p>'+dl([['Nominal east displacement',number(drift.displacement?.eastM)+' m'],['Nominal north displacement',number(drift.displacement?.northM)+' m'],['Distance',number(drift.displacement?.distanceM)+' m']])+list(drift.missing)+list(drift.warnings);
  $('#flight-result').innerHTML='<p class="trial-result-context">Camera & flight estimates</p>'+dl([['Across / along footprint',number(camera.footprintAcrossM)+' / '+number(camera.footprintAlongM)+' m'],['GSD X / Y',number(camera.gsdXM,4)+' / '+number(camera.gsdYM,4)+' m/px'],['Line / photo spacing',number(camera.lineSpacingM)+' / '+number(camera.photoSpacingM)+' m'],['Trigger interval',number(camera.triggerIntervalS)+' s'],['Survey geometry distance',number(flight.plan?.estimates?.distanceM)+' m'],['All sorties incl. home transit',number(battery.totalDistanceM)+' m'],['Wind assessment',flight.wind?.state||'Unknown'],['Battery assessment',battery.state||'Unknown'],['Assessed sorties',battery.sorties?.length||0]])+list(flight.missing)+list(flight.wind?.missing)+list(battery.missing)+list(flight.warnings);
  if(battery.sorties?.length)$('#flight-result').innerHTML+='<table><thead><tr><th>Sortie</th><th>Time</th><th>Energy</th></tr></thead><tbody>'+battery.sorties.map((s,i)=>'<tr><td>'+String(i+1)+'</td><td>'+number(s.durationS/60)+' min</td><td>'+number(s.energyWh)+' Wh</td></tr>').join('')+'</tbody></table>';
  $('#export-result').innerHTML='<p class="trial-result-context">'+esc(exportCheck.pass?'Manual export checks complete':'Export checks need review')+'</p>'+(exportCheck.checks||[]).map(c=>'<span class="trial-checkline" data-state="'+esc(c.state)+'">'+esc(c.message||c.id)+'</span>').join('')+list(exportCheck.missing)+list(exportCheck.errors)+list(exportCheck.warnings);
  $('#oil-result').innerHTML='<p class="trial-result-context">Assumption-based quantity range</p>'+dl([['Reviewed oil area',number(oil.areaM2)+' m²'],['Oil volume lower / upper',number(oil.volumeLowL)+' / '+number(oil.volumeHighL)+' L'],['Oil mass lower / upper',number(oil.oilMassLowKg)+' / '+number(oil.oilMassHighKg)+' kg'],['Dry capsules lower / upper',number(oil.capsulesLowKg,3)+' / '+number(oil.capsulesHighKg,3)+' kg']])+list(oil.missing)+list(oil.warnings);
  $('#trial-sortie').innerHTML=battery.sorties?.length?battery.sorties.map((s,i)=>'<option value="'+i+'">Sortie '+(i+1)+' · '+number(s.distanceM)+' m</option>').join(''):'<option value="0">No assessed sorties</option>';
  statuses();drawMap();update3D();setWorking(false);
}
function setGeometry(value,sourceId=null){if(value?.type!=='Polygon'||value.coordinates?.length!==1||value.coordinates[0]?.length>121)throw Error('Choose a polygon with 3–120 vertices and no holes.');validateGeometry(value);resetSurvey();resetReview();geometry=structuredClone(value);surveyId=sourceId;$('#trial-geometry').value=JSON.stringify(geometry);$('#trial-source').textContent=sourceId?'Frozen inspection: '+sourceId:'Unsaved trial boundary · original inspection records are unchanged.';$('#trial-survey').value=sourceId||'';invalidate();refreshFlow();fit();}
async function loadSurvey(id){
  if(!id.trim())throw Error('Enter a saved survey ID.');stopDraw();resetSurvey();invalidate();const token=revision;
  let data;try{data=await api('/source?survey='+encodeURIComponent(id.trim()));}catch(e){if(token!==revision)return false;throw e;}
  if(token!==revision)return false;
  setGeometry(data.geometry,data.surveyId);$('#trial-back').href='/mission.html?incident='+encodeURIComponent(data.incidentId)+'&survey='+encodeURIComponent(data.surveyId);announce('Original saved boundary loaded. Configure the four trial tools.');return true;
}
$('#trial-run').onclick=async()=>{if(working||draw||currentStep!==3||!review?.ready)return;error();const token=revision;try{const inputs=body();abort=new AbortController();const controller=abort;setWorking(true);const timer=setTimeout(()=>controller.abort(),25000);let data;try{data=await api('',{method:'POST',body:JSON.stringify(inputs),signal:controller.signal});}finally{clearTimeout(timer);}if(token!==revision)return;result=data;render();announce('Mission calculations updated. Open Calculation details to inspect the assumptions.');fit();}catch(e){if(token===revision){setWorking(false);error(e.name==='AbortError'?'Mission calculation timed out. Open Calculation details to retry.':e.message);$('#trial-engine-status').textContent='Calculation needs another attempt.';announce('Mission calculation was not completed.');}}};
function download(text,filename,mime='application/json'){const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#trial-qgc').onclick=async()=>{
  if(working||draw||currentStep!==3||!review?.ready||!result?.exportCheck?.pass)return;const token=revision;error();setWorking(true);abort=new AbortController();const controller=abort,timer=setTimeout(()=>controller.abort(),25000);
  try{const data=await api('/export',{method:'POST',body:JSON.stringify({...body(),sortieIndex:Number($('#trial-sortie').value)}),signal:controller.signal});if(token!==revision)return;download(data.text,data.filename,data.mime);announce('QGC trial file downloaded. No aircraft or camera command was transmitted.');}
  catch(e){if(token===revision){error(e.name==='AbortError'?'Export timed out. Recalculate and try again.':e.message);invalidate();}}
  finally{clearTimeout(timer);if(token===revision)setWorking(false);}
};
$('#trial-snapshot').onclick=()=>{if(result&&!draw)download(JSON.stringify({...result,exampleData:example},null,2),'XEDO-planning-trial-'+result.inputHash.slice(0,12)+'.json');};
function restoreInputs(inputs){for(const input of document.querySelectorAll('#trial-settings input[name],#trial-settings select[name]')){const [group,key]=input.name.split('.');let value=inputs[group]?.[key];if(group==='flight'&&key==='homeLongitude')value=inputs.flight?.home?.[0];if(group==='flight'&&key==='homeLatitude')value=inputs.flight?.home?.[1];if(group==='flight'&&['sideOverlap','frontOverlap'].includes(key)&&value!=null)value*=100;if(input.type==='datetime-local'&&value){const date=new Date(value);value=Number.isFinite(date.getTime())?date.toISOString().slice(0,16):'';}input.value=value??'';}$('#drift-enabled').checked=inputs.driftEnabled===true;$('#export-home-confirmed').checked=inputs.export?.homeConfirmed===true;$('#export-flat-confirmed').checked=inputs.export?.flatSurfaceConfirmed===true;$('#export-airspace-reviewed').checked=inputs.export?.airspaceReviewed===true;$('#export-nogo').value=inputs.export?.noGo?JSON.stringify(inputs.export.noGo):'';$('#oil-emulsion').checked=inputs.oil?.emulsion===true;}
$('#trial-restore').onchange=async event=>{
  try{
    const file=event.target.files[0];if(!file)return;stopDraw();if(file.size>1500000)throw Error('Trial snapshot exceeds 1.5 MB.');
    const token=revision,data=JSON.parse(await file.text());if(token!==revision)return;
    if(data.schema_version!=='xedo-planning-trial/1'||!data.inputs)throw Error('Choose an XEDO planning trial snapshot.');
    const restored=structuredClone(data.inputs);let importedId=null;
    if(fileMode&&restored.surveyId){
      if(data.source?.surveyId!==restored.surveyId||!data.source?.geometry)throw Error('This snapshot does not contain a matching saved boundary. Import a polygon GeoJSON instead.');
      importedId=restored.surveyId;restored.geometry=structuredClone(data.source.geometry);delete restored.surveyId;
    }
    if(restored.surveyId){if(!await loadSurvey(restored.surveyId))return;}else if(restored.geometry==null)clearGeometry();else setGeometry(restored.geometry);
    restoreInputs(restored);resetReview(true);example=!!data.exampleData;notice();invalidate();drawMap();error();
    if(importedId)$('#trial-source').textContent='Imported snapshot boundary: '+importedId+' · Database linkage is unverified. New results use this as a local trial boundary.';
    announce('Inputs restored. Recalculate to refresh all results and validity checks.');
  }catch(e){error(e.message);}finally{event.target.value='';}
};
function changed(event){const input=event.target,name=input.name||'',id=input.id;if(name.startsWith('flight.')||name.startsWith('drift.')||id==='drift-enabled'||id==='trial-camera-preset')resetReview(name.startsWith('flight.home'));else if(name.startsWith('export.')||id==='export-nogo')resetReview(name==='export.homeAmslM');invalidate();error();}
$('#trial-settings').addEventListener('input',changed);$('#trial-settings').addEventListener('change',changed);$('#trial-settings').onsubmit=e=>e.preventDefault();
$('#trial-camera-preset').onchange=event=>{const presets={v2:[3.68,2.76,3.04,3280,2464],v3:[6.45,3.63,4.74,4608,2592],wide:[6.45,3.63,2.75,4608,2592]},v=presets[event.target.value];if(!v)return;['sensorWidthMm','sensorHeightMm','focalLengthMm','imageWidthPx','imageHeightPx'].forEach((key,i)=>field('flight',key).value=v[i]);invalidate();announce('Candidate camera values filled. Verify the module, lens, active crop and calibration.');};
$('#trial-2d').onclick=()=>{mode='2d';$('#trial-map-title').textContent=review?.label||(geeHosted?'Earth Engine satellite map':'Inspection boundary');$('#trial-map').hidden=false;$('#trial-3d-wrap').hidden=true;$('#trial-2d').setAttribute('aria-pressed','true');$('#trial-3d').setAttribute('aria-pressed','false');requestAnimationFrame(()=>map.updateSize());};$('#trial-3d').onclick=()=>{stopDraw();mode='3d';$('#trial-map-title').textContent='Mission route preview';$('#trial-map').hidden=true;$('#trial-3d-wrap').hidden=false;$('#trial-2d').setAttribute('aria-pressed','false');$('#trial-3d').setAttribute('aria-pressed','true');update3D();};$('#trial-3d-reset').onclick=()=>renderer?.reset();$('#trial-fit').onclick=()=>mode==='3d'?renderer?.reset():fit();
function stopDraw(){if(sketchListener)unByKey(sketchListener);sketchListener=null;sketch=null;vertexCount=0;if(draw){draw.abortDrawing();map.removeInteraction(draw);draw=null;}$('#trial-finish').hidden=true;$('#trial-cancel').hidden=true;$('#trial-draw').textContent='Draw polygon';setWorking(working);}
$('#trial-draw').onclick=()=>{if(working)return;$('#trial-2d').click();stopDraw();selectHome=false;draw=new Draw({type:'Polygon',stopClick:true,freehandCondition:()=>false,maxPoints:120});draw.on('drawstart',event=>{sketch=event.feature;vertexCount=1;sketchListener=sketch.getGeometry().on('change',()=>{vertexCount=Math.max(1,sketch.getGeometry().getCoordinates()[0].length-2);$('#trial-finish').disabled=vertexCount<3;});});draw.on('drawend',event=>{try{const value=format.writeGeometryObject(event.feature.getGeometry(),{featureProjection:'EPSG:3857',dataProjection:'EPSG:4326'});setGeometry(value);error();announce('Area selected. Review a dated image of this area next.');}catch(e){error(e.message);}queueMicrotask(stopDraw);});map.addInteraction(draw);setWorking(working);$('#trial-draw').textContent='Drawing…';$('#trial-finish').hidden=false;$('#trial-finish').disabled=true;$('#trial-cancel').hidden=false;announce('Select at least three corners, then double click or choose Finish area.');};$('#trial-finish').onclick=()=>{if(draw&&vertexCount>=3)draw.finishDrawing();};$('#trial-cancel').onclick=()=>{stopDraw();announce('Drawing cancelled. The previous area is retained.');};
$('#trial-home').onclick=()=>{if(working)return;$('#trial-settings-dialog').close();stopDraw();$('#trial-2d').click();selectHome=!selectHome;announce(selectHome?'Click the reviewed launch and landing position on the map.':'Home selection cancelled.');};map.on('singleclick',event=>{if(!selectHome)return;selectHome=false;const [lon,lat]=toLonLat(event.coordinate);field('flight','homeLongitude').value=lon.toFixed(7);field('flight','homeLatitude').value=lat.toFixed(7);resetReview(true);invalidate();announce('Home position set. Confirm the real launch and landing location before export.');});
$('#trial-clear').onclick=()=>{if(working)return;stopDraw();selectHome=false;clearGeometry();error();announce('Current trial boundary and results cleared. Saved inspections are retained.');};$('#trial-load').onclick=()=>loadSurvey($('#trial-survey').value).catch(e=>error(e.message));$('#trial-import-geometry').onclick=()=>{try{const data=JSON.parse($('#trial-geometry').value);stopDraw();setGeometry(data.type==='Feature'?data.geometry:data);error();}catch(e){error(e.message);}};
$('#trial-example').onclick=()=>{stopDraw();const now=Date.now(),iso=offset=>new Date(now+offset*60000).toISOString();setGeometry({type:'Polygon',coordinates:[[[101.22,12.62],[101.222,12.62],[101.222,12.621],[101.22,12.621],[101.22,12.62]]]});restoreInputs({driftEnabled:false,drift:{observedAt:iso(0),arriveAt:iso(10),endAt:iso(120),currentEastMps:.2,currentNorthMps:0,windSpeedMps:5,windFromDeg:180,alpha:.03,alphaMin:.025,alphaMax:.04,marginM:10},flight:{sensorWidthMm:6.4,sensorHeightMm:4.8,focalLengthMm:4,imageWidthPx:4000,imageHeightPx:3000,sideOverlap:.7,frontOverlap:.8,minTriggerIntervalS:1,altitudeM:50,speedMps:5,home:[101.22,12.62],windEastMps:0,windNorthMps:0,windLimitMps:8,maxAirspeedMps:12,usableWh:100,reserveWh:20,powerW:180,takeoffS:20,landingS:20,turnS:3},export:{firmware:'PX4',qgcVersion:'5.1.0',homeAmslM:0,relativeHeightM:50,ceilingM:60,corridorM:5,plannedTakeoffAt:iso(15),validUntil:iso(180),source:'Synthetic test fixture — not current airspace clearance',noGo:{type:'FeatureCollection',features:[]}},oil:{pixelCount:2500000,gsdM:.02,thicknessLowUm:10,thicknessHighUm:30,densityGml:.86,capacityGg:3.42,allowance:1.5,targetFraction:1,emulsion:false}});example=true;notice();invalidate();drawMap();fit();announce('Test area and synthetic aircraft settings loaded. Next, survey the satellite image.');error();};
window.addEventListener('pagehide',()=>{revision++;abort?.abort();satelliteAbort?.abort();clearTimeout(calculationTimer);clearTimeout(satelliteTimer);clearTimeout(satelliteExpiryTimer);setWorking(false);});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]')){stopDraw();selectHome=false;}});

function renderMissionSummary(){
  const flight=result?.flight,battery=flight?.battery,oil=result?.oil,route=flight?.plan;
  const distance=battery?.totalDistanceM??route?.estimates?.distanceM;
  $('#trial-summary-distance').textContent=!Number.isFinite(distance)?'Settings needed':distance>=1000?number(distance/1000,2)+' km':distance>0&&distance<1?'<1 m':number(distance,0)+' m';
  $('#trial-summary-sorties').textContent=battery?.state==='pass'?String(battery.sorties.length):'Settings needed';
  if(Number.isFinite(oil?.capsulesLowKg)){
    const hasUpper=Number.isFinite(oil.capsulesHighKg),inGrams=Math.max(oil.capsulesLowKg,hasUpper?oil.capsulesHighKg:0)<1;
    const scale=inGrams?1000:1,places=inGrams?0:1,minimum=10**-places;
    const display=value=>value>0&&value*scale<minimum?'<'+number(minimum,places):number(value*scale,places);
    const low=display(oil.capsulesLowKg),high=hasUpper?display(oil.capsulesHighKg):null,unit=inGrams?' g':' kg';
    $('#trial-summary-material').textContent=(hasUpper?'~'+low+(low===high?'':'–'+high):'From ~'+low)+unit;
  }else $('#trial-summary-material').textContent='Awaiting reviewed drone evidence';
  $('#trial-sortie-wrap').hidden=!(battery?.sorties?.length>1);
  if(working)$('#trial-engine-status').textContent='Calculating…';
  else if(result)$('#trial-engine-status').textContent=result.exportCheck.pass?'Trial file ready · Review before field use':flight?.state==='blocked'?'Flight blocked · Open Calculation details':'Mission settings or export review needed';
  else if(currentStep===3)$('#trial-engine-status').textContent='Calculating…';
}
function refreshFlow(){
  basemap?.setActive(currentStep===1);
  ['area','survey','deploy'].forEach((name,i)=>$('#trial-'+name+'-step').hidden=currentStep!==i+1);
  [...$('#trial-progress').children].forEach((item,i)=>{item.classList.toggle('active',i+1===currentStep);item.classList.toggle('done',i+1<currentStep);if(i+1===currentStep)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
  $('#trial-step-2').disabled=!geometry||satelliteBusy||!!draw;$('#trial-step-3').disabled=!review?.ready||satelliteBusy||!!draw;
  $('#trial-survey-action').disabled=!geometry||!!draw||satelliteBusy||working;
  $('#trial-prepare').disabled=!review?.ready||satelliteBusy;$('#trial-survey-retry').hidden=!!review?.ready||satelliteBusy;$('#trial-survey-retry').disabled=satelliteBusy;$('#trial-archive').hidden=!geeHosted||!!surveyId||!!review?.ready;$('#trial-archive').disabled=satelliteBusy;
  $('#trial-gee-controls').hidden=!geeHosted||!!surveyId;
  for(const input of document.querySelectorAll('#trial-image-search input'))input.disabled=satelliteBusy;
  $('#trial-image-search-submit').disabled=satelliteBusy||!geometry;$('#trial-image-scenes').disabled=satelliteBusy||!satelliteScenes.length;
  $('#trial-image-load').disabled=satelliteBusy||!$('#trial-image-scenes').value;$('#trial-image-cancel').hidden=!satelliteBusy;
  $('#trial-map-hint').hidden=geeHosted||!!review?.ready;
  $('#trial-map-hint').textContent=satelliteBusy?'Base map · Loading a satellite image for the selected area…':!geometry?'Base map · Draw an inspection area, then choose Load satellite image.':currentStep===1?'Base map · Choose Load satellite image to show a dated acquisition for this area.':geeHosted&&!surveyId?satelliteScenes.length?'Base map · Choose an acquisition, then Load selected image.':'Base map · Search for a covering acquisition using the dates and cloud limit.':'Base map · Retry loading the original satellite image.';
  $('#trial-map-views').hidden=currentStep!==3;$('#trial-boundary-tools').hidden=currentStep!==1;
  if(geometry){const metrics=selectionMetrics(geometry);$('#trial-area-size').textContent=metrics.areaM2>=1e6?number(metrics.areaM2/1e6)+' km²':number(metrics.areaM2,0)+' m²';$('#trial-area-vertices').textContent=(geometry.coordinates[0].length-1)+' boundary corners';}
  else{$('#trial-area-size').textContent='No area selected';$('#trial-area-vertices').textContent='Place at least three corners.';}
  [...document.querySelectorAll('.trial-map-legend>span')].forEach((item,i)=>{item.hidden=i>0&&(currentStep!==3||(i<3&&!result?.drift?.geometry)||(i===3&&result?.flight?.plan?.status!=='generated'));});
  renderMissionSummary();
}
function setStep(next){
  if(next>1&&!geometry)return;if(next===3&&!review?.ready)return;stopDraw();selectHome=false;if(next===1){resetSurvey();invalidate();}currentStep=next;
  if(next!==3)$('#trial-2d').click();refreshFlow();drawMap();setWorking(working);
  if(next===3&&!result)queueCalculations();
}
let satelliteTimer=null,lastSurveyArchived=false;
function resetSurvey(keepScenes=false){
  satelliteToken++;satelliteAbort?.abort();satelliteAbort=null;clearTimeout(satelliteTimer);satelliteTimer=null;clearTimeout(satelliteExpiryTimer);satelliteExpiryTimer=null;satelliteBusy=false;selectHome=false;
  if(satelliteRaster)map.removeLayer(satelliteRaster);satelliteRaster=null;review=null;webMission=null;currentStep=1;
  if(!keepScenes){satelliteScenes=[];satelliteSearchGeometry=null;$('#trial-image-scenes').innerHTML='<option value="">Search for images first</option>';}
  $('#trial-2d').click();$('#trial-image-status').textContent='Choose a covering satellite image.';$('#trial-image-date').textContent='No image loaded';$('#trial-image-caption').textContent='';$('#trial-map-title').textContent=geeHosted?'Earth Engine satellite map':'Inspection boundary';
}
async function workspaceAPI(path,options={}){
  const response=await fetch('/api/'+path,{credentials:'same-origin',redirect:'error',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('The server did not return workspace data.');
  const data=await response.json();if(!response.ok)throw Error(data.message||'Satellite survey could not be completed.');return data;
}
function revokeSatellite(token,signal,message){
  if(token!==satelliteToken||signal.aborted||!review?.ready)return;
  if(review)review.ready=false;if(webMission)webMission.imageReady=false;currentStep=2;
  if($('#trial-results-dialog').open)$('#trial-results-dialog').close();$('#trial-2d').click();invalidate();
  $('#trial-image-status').textContent='The image is no longer ready. Reload it before preparing the mission.';error(message);refreshFlow();
}
async function geeTileHasVisibleData(blob,ring,extent){
  let bitmap,objectUrl;
  try{
    if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(blob);
    else{
      objectUrl=URL.createObjectURL(blob);bitmap=new Image();
      await new Promise((resolve,reject)=>{bitmap.onload=resolve;bitmap.onerror=()=>reject(Error('Satellite image could not be decoded.'));bitmap.src=objectUrl;});
    }
    const width=bitmap.width,height=bitmap.height;
    if(width<1||height<1||width>2048||height>2048)throw Error('Satellite image dimensions are invalid.');
    const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Satellite image pixels could not be checked.');
    const clip=satelliteTileClip(ring,extent,width,height);
    context.beginPath();context.moveTo(...clip[0]);for(const point of clip.slice(1))context.lineTo(...point);context.closePath();context.clip();
    context.drawImage(bitmap,0,0);
    return hasVisibleSatellitePixels(context.getImageData(0,0,width,height).data);
  }finally{bitmap?.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);}
}
function showSatellite(selection,token,signal){
  return new Promise(async(resolve,reject)=>{
    let settled=false,renderListener=null,sawTile=false;const pendingTiles=new Set();
    const finish=(failure)=>{if(settled)return;settled=true;if(renderListener)unByKey(renderListener);clearTimeout(satelliteTimer);signal.removeEventListener('abort',cancel);if(failure)reject(failure);else resolve();};
    const cancel=()=>finish(new DOMException('Satellite survey cancelled.','AbortError'));signal.addEventListener('abort',cancel,{once:true});
    const failed=message=>{if(settled)revokeSatellite(token,signal,message);else finish(Error(message));};
    satelliteTimer=setTimeout(()=>finish(Error('Satellite image is taking too long to load. Retry or change the area.')),30000);
    try{
      const epsg=Number(selection.image.epsg??selection.scene.epsg);
      if(epsg>=32601&&epsg<=32760&&!proj4.defs('EPSG:'+epsg)){proj4.defs('EPSG:'+epsg,'+proj=utm +zone='+(epsg%100)+(epsg>=32700?' +south':'')+' +datum=WGS84 +units=m +no_defs');register(proj4);}
      if(selection.image.kind==='preview'){
        const url=fileMode?embeddedPreview:selection.image.url;if(!url)throw Error('The archived satellite image is not embedded. Rebuild the prototype.');
        satelliteRaster=new ImageLayer({source:new ImageStatic({url,projection:'EPSG:'+epsg,imageExtent:selection.image.extent})});
        satelliteRaster.getSource().on('imageloadend',()=>finish());satelliteRaster.getSource().on('imageloaderror',()=>failed('The archived satellite image could not load.'));
      }else if(selection.image.kind==='gee'){
        if(!geeHosted||!selection.image.url)throw Error('Earth Engine imagery needs the hosted workspace.');
        const inspectionRing=selection.geometry.coordinates[0].map(point=>fromLonLat(point)),visibleTiles=new WeakSet();let sawVisibleData=false;
        const source=new XYZ({url:selection.image.url,maxZoom:18,wrapX:false,transition:0,
          tileLoadFunction:async(tile,url)=>{
            try{
              const response=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal});
              if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw Error('Image tile unavailable');
              const blob=await response.blob();if(signal.aborted||token!==satelliteToken)return;
              if(await geeTileHasVisibleData(blob,inspectionRing,source.getTileGrid().getTileCoordExtent(tile.getTileCoord())))visibleTiles.add(tile);
              if(signal.aborted||token!==satelliteToken)return;
              const objectUrl=URL.createObjectURL(blob),image=tile.getImage();
              const cleanup=()=>{URL.revokeObjectURL(objectUrl);image.removeEventListener('load',cleanup);image.removeEventListener('error',cleanup);};
              image.addEventListener('load',cleanup,{once:true});image.addEventListener('error',cleanup,{once:true});image.src=objectUrl;
            }catch{tile.setState(TileState.ERROR);}
          }});
        satelliteRaster=new TileLayer({source});
        source.on('tileloadstart',event=>pendingTiles.add(event.tile));
        source.on('tileloadend',event=>{pendingTiles.delete(event.tile);sawTile=true;if(visibleTiles.has(event.tile))sawVisibleData=true;});
        source.on('tileloaderror',event=>{pendingTiles.delete(event.tile);failed('Earth Engine image tiles could not load. Reload the selected image or search again.');});
        renderListener=map.on('rendercomplete',()=>{if(sawTile&&!pendingTiles.size)finish(sawVisibleData?null:Error('The selected image has no visible satellite pixels inside the inspection area. Choose another acquisition.'));});
      }else{
        if(fileMode)throw Error('This prototype contains the stored satellite preview only.');
        const {createCogRaster}=await import('./raster-cog.js');if(token!==satelliteToken||signal.aborted)return cancel();
        const raster=createCogRaster(selection.image.url);satelliteRaster=raster.layer;
        raster.source.on('tileloadend',()=>{sawTile=true;});
        renderListener=map.on('rendercomplete',()=>{if(sawTile)finish();});
        raster.source.on('tileloaderror',()=>failed('Satellite image tiles could not load.'));raster.source.on('error',()=>failed('The satellite image format could not be read.'));
      }
      if(token!==satelliteToken||signal.aborted)return cancel();satelliteRaster.getSource().setAttributions('Contains modified Copernicus Sentinel data '+new Date(selection.scene.acquiredAt).getUTCFullYear()+'.');satelliteRaster.setZIndex(10);map.getLayers().insertAt(1,satelliteRaster);map.updateSize();fit();
    }catch(e){finish(e);}
  });
}
const acquisitionLabel=scene=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(scene.acquiredAt))+' UTC';
async function geeAPI(action,body,signal){
  const response=await fetch('/api/v1/gee/imagery/'+action,{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Earth Engine imagery did not return a valid response. Retry the request.');
  const data=await response.json();if(!response.ok)throw Error(data.message||'Earth Engine imagery is unavailable. Retry the request.');return data;
}
async function renewGEEMap(selection,signal){
  const manifest=await geeAPI('map',{sceneId:selection.scene.id,geometry:selection.geometry},signal);
  return bindGEESatelliteMap(selection,manifest);
}
async function reviewSatellite(selection,token,signal){
  if(token!==satelliteToken||signal.aborted)return;
  review={...selection,ready:false};$('#trial-map-title').textContent=selection.label;$('#trial-image-kind').textContent=selection.label;
  $('#trial-image-date').textContent=acquisitionLabel(selection.scene);
  $('#trial-image-caption').textContent=selection.image.kind==='gee'
    ? 'Google Earth Engine · '+selection.scene.platform+' · '+number(selection.scene.cloudCover,1)+'% scene cloud · '+number(selection.scene.resolution,0)+' m RGB'
    : selection.scene.platform+' · '+(selection.image.kind==='preview'?'Stored image · not live':'Original satellite source');
  $('#trial-image-status').textContent='Loading the covering image…';await showSatellite(selection,token,signal);
  if(token!==satelliteToken||signal.aborted)return;
  if(selection.image.kind==='gee'&&Date.parse(selection.image.expiresAt)<=Date.now())throw Error('The Earth Engine image session expired. Reload the selected image.');
  review.ready=true;if(webMission)webMission.imageReady=true;
  if(selection.image.kind==='gee')satelliteExpiryTimer=setTimeout(()=>revokeSatellite(token,signal,'The Earth Engine image session expired. Reload the selected image.'),Math.max(0,Date.parse(selection.image.expiresAt)-Date.now()));
  if(!field('drift','observedAt').value)field('drift','observedAt').value=new Date(selection.scene.acquiredAt).toISOString().slice(0,16);
  $('#trial-image-status').textContent='Image ready for review';announce('Satellite image ready for review.');
}
async function searchSatellite({autoLoad=false}={}){
  if(!geeHosted||!geometry||draw||satelliteBusy||working||surveyId)return;
  const start=$('#trial-image-start').value,end=$('#trial-image-end').value,maxCloud=Number($('#trial-image-cloud').value);
  if(!$('#trial-image-search').reportValidity()||!start||!end||start>end||!Number.isFinite(maxCloud)||maxCloud<0||maxCloud>100){error('Choose a valid acquisition date range and cloud cover from 0 to 100%.');return;}
  stopDraw();resetSurvey();currentStep=2;satelliteBusy=true;lastSatelliteAction='search';lastSurveyArchived=false;
  const token=satelliteToken,controller=new AbortController();satelliteAbort=controller;satelliteTimer=setTimeout(()=>controller.abort(),30000);
  let automaticSceneId=null;
  error();invalidate();refreshFlow();$('#trial-image-status').textContent='Searching Earth Engine for covering images…';announce('Searching satellite acquisitions.');
  try{
    const data=await geeAPI('search',{geometry:structuredClone(geometry),start,end,maxCloud},controller.signal);
    if(token!==satelliteToken||controller.signal.aborted)return;
    if(!Array.isArray(data.scenes)||data.scenes.length>100)throw Error('The image search returned an invalid scene list. Retry the search.');
    satelliteScenes=data.scenes.map(scene=>selectGEESatellite(scene,geometry).scene).sort((a,b)=>Date.parse(b.acquiredAt)-Date.parse(a.acquiredAt));
    if(new Set(satelliteScenes.map(scene=>scene.id)).size!==satelliteScenes.length)throw Error('The image search returned duplicate sources. Retry the search.');
    satelliteSearchGeometry=structuredClone(geometry);
    $('#trial-image-scenes').innerHTML='<option value="">'+(satelliteScenes.length?'Choose an acquisition':'No matching covering images')+'</option>'+satelliteScenes.map(scene=>'<option value="'+esc(scene.id)+'">'+esc(acquisitionLabel(scene)+' · '+number(scene.cloudCover,1)+'% cloud · '+scene.platform)+'</option>').join('');
    $('#trial-image-status').textContent=satelliteScenes.length?satelliteScenes.length+' covering image'+(satelliteScenes.length===1?'':'s')+' found. Choose one and load it for review.':'No image covers the whole area within these dates and cloud limit. Widen the dates or cloud limit, or change the area.';
    announce(satelliteScenes.length?'Choose a satellite acquisition to review.':'No matching covering satellite image found.');
    if(autoLoad&&satelliteScenes.length){automaticSceneId=satelliteScenes[0].id;$('#trial-image-scenes').value=automaticSceneId;}
  }catch(e){
    if(token!==satelliteToken)return;satelliteScenes=[];satelliteSearchGeometry=null;
    $('#trial-image-status').textContent='Image search needs another attempt.';error(e.name==='AbortError'?'Earth Engine image search timed out. Retry or narrow the date range.':e.message);
  }finally{if(token===satelliteToken){clearTimeout(satelliteTimer);satelliteTimer=null;satelliteBusy=false;refreshFlow();}}
  if(automaticSceneId&&token===satelliteToken&&!controller.signal.aborted&&currentStep===2&&$('#trial-image-scenes').value===automaticSceneId&&JSON.stringify(satelliteSearchGeometry)===JSON.stringify(geometry)){
    announce('Loading the newest covering satellite acquisition.');await loadGEEScene();
  }
}
async function loadGEEScene(){
  if(!geeHosted||satelliteBusy||working||!geometry)return;
  const id=$('#trial-image-scenes').value,scene=satelliteScenes.find(item=>item.id===id);
  if(!scene||JSON.stringify(satelliteSearchGeometry)!==JSON.stringify(geometry)){error('Search for images covering the current inspection area first.');return;}
  stopDraw();resetSurvey(true);currentStep=2;satelliteBusy=true;lastSatelliteAction='load';
  const token=satelliteToken,controller=new AbortController();satelliteAbort=controller;satelliteTimer=setTimeout(()=>controller.abort(),30000);
  error();invalidate();refreshFlow();$('#trial-image-status').textContent='Preparing the selected Earth Engine image…';
  try{
    const selection=await renewGEEMap(selectGEESatellite(scene,geometry),controller.signal);
    if(token!==satelliteToken||controller.signal.aborted)return;clearTimeout(satelliteTimer);satelliteTimer=null;
    if(!fileMode){webMission=new QuickMission((path,options={})=>workspaceAPI(path,{...options,signal:controller.signal}));webMission.selectArea(geometry);webMission.useScene(selection.scene);}
    await reviewSatellite(selection,token,controller.signal);
  }catch(e){
    if(token!==satelliteToken)return;review=null;webMission=null;if(satelliteRaster)map.removeLayer(satelliteRaster);satelliteRaster=null;
    $('#trial-image-status').textContent='The selected image needs another attempt.';error(e.name==='AbortError'?'Earth Engine image loading timed out. Reload the selected image.':e.message);
  }finally{if(token===satelliteToken){clearTimeout(satelliteTimer);satelliteTimer=null;satelliteBusy=false;refreshFlow();}}
}
async function surveySatellite(archived=false){
  if(geeHosted&&!archived&&!surveyId)return searchSatellite({autoLoad:true});
  if(!geometry||draw||satelliteBusy||working)return;lastSurveyArchived=archived;stopDraw();error();resetSurvey();currentStep=2;satelliteBusy=true;const token=satelliteToken,controller=new AbortController();satelliteAbort=controller;satelliteTimer=setTimeout(()=>controller.abort(),30000);invalidate();refreshFlow();
  lastSatelliteAction='legacy';
  $('#trial-image-status').textContent=fileMode||archived?'Opening the stored satellite image…':'Searching available satellite imagery…';announce('Satellite survey in progress.');
  try{
    let selection;
    if(surveyId){const state=await workspaceAPI('state',{signal:controller.signal});selection=selectSavedSatellite({geometry,surveyId,state});}
    else if(fileMode)selection=selectArchivedSatellite(geometry);
    else{
      await workspaceAPI('state?scope=satellite',{signal:controller.signal});if(token!==satelliteToken||controller.signal.aborted)return;
      webMission=new QuickMission((path,options={})=>workspaceAPI(path,{...options,signal:controller.signal}));webMission.selectArea(geometry);
      const stored=archived?selectArchivedSatellite(geometry).scene:null,scene=await webMission.survey({archivedScene:stored});selection=selectSceneSatellite(scene,geometry);
    }
    if(token!==satelliteToken||controller.signal.aborted)return;
    if(selection.image.kind==='gee')selection=await renewGEEMap(selection,controller.signal);
    clearTimeout(satelliteTimer);satelliteTimer=null;
    await reviewSatellite(selection,token,controller.signal);
  }catch(e){if(token!==satelliteToken)return;review=null;if(satelliteRaster)map.removeLayer(satelliteRaster);satelliteRaster=null;$('#trial-image-status').textContent='Image review needs another attempt.';error(e.name==='AbortError'?'Satellite survey was cancelled.':e.message);}
  finally{if(token===satelliteToken){clearTimeout(satelliteTimer);satelliteTimer=null;satelliteBusy=false;refreshFlow();}}
}
async function prepareMission(){
  if(!review?.ready||satelliteBusy)return;error();satelliteBusy=true;refreshFlow();const token=satelliteToken;
  try{
    if(review.image.kind==='gee'&&(JSON.stringify(review.geometry)!==JSON.stringify(geometry)||Date.parse(review.image.expiresAt)<=Date.now()))throw Error('The reviewed Earth Engine image no longer matches a valid session. Reload it before preparing the mission.');
    if(webMission&&!surveyId){const saved=await webMission.prepare();if(token!==satelliteToken)return;surveyId=saved.surveyId;$('#trial-survey').value=surveyId;$('#trial-source').textContent='Frozen inspection: '+surveyId;$('#trial-back').href='/mission.html?incident='+encodeURIComponent(saved.incidentId)+'&survey='+encodeURIComponent(saved.surveyId);}
    if(token!==satelliteToken)return;currentStep=3;refreshFlow();setWorking(false);queueCalculations();announce('Mission prepared. Calculations are running in the background.');
  }catch(e){if(token===satelliteToken)error(e.message);}finally{if(token===satelliteToken){satelliteBusy=false;refreshFlow();}}
}
function openSettings(imports=false){$('#trial-settings-dialog').showModal();if(imports){const detail=$('.trial-source-input');detail.parentElement.open=true;detail.open=true;detail.scrollIntoView({block:'center'});}}
$('#trial-config-open').onclick=()=>openSettings();$('#trial-required-settings').onclick=()=>openSettings();$('#trial-import-open').onclick=()=>openSettings(true);
$('#trial-config-close').onclick=()=>$('#trial-settings-dialog').close();$('#trial-results-open').onclick=()=>$('#trial-results-dialog').showModal();$('#trial-results-close').onclick=()=>$('#trial-results-dialog').close();
$('#trial-survey-action').onclick=()=>surveySatellite();$('#trial-survey-retry').onclick=()=>lastSatelliteAction==='load'?loadGEEScene():surveySatellite(lastSurveyArchived);$('#trial-archive').onclick=()=>surveySatellite(true);$('#trial-prepare').onclick=prepareMission;
const initialImageDates=recentDates();$('#trial-image-start').value=initialImageDates.start;$('#trial-image-end').value=initialImageDates.end;
$('#trial-image-search').onsubmit=event=>{event.preventDefault();searchSatellite();};$('#trial-image-load').onclick=loadGEEScene;
$('#trial-image-scenes').onchange=()=>{if(satelliteBusy)return;resetSurvey(true);currentStep=2;invalidate();error();$('#trial-image-status').textContent='Load the selected acquisition to review its image.';refreshFlow();};
for(const input of document.querySelectorAll('#trial-image-search input'))input.addEventListener('change',()=>{if(satelliteBusy)return;resetSurvey();currentStep=2;invalidate();error();$('#trial-image-status').textContent='Search again with the updated acquisition filters.';refreshFlow();});
$('#trial-image-cancel').onclick=()=>{resetSurvey(true);currentStep=2;invalidate();error();$('#trial-image-status').textContent='Image request cancelled. Search again or reload an acquisition.';announce('Satellite image request cancelled.');refreshFlow();};
$('#trial-step-1').onclick=()=>setStep(1);$('#trial-step-2').onclick=()=>review?.ready?setStep(2):surveySatellite();$('#trial-step-3').onclick=()=>currentStep===3?null:prepareMission();
$('#trial-change-area').onclick=()=>{setStep(1);error();};$('#trial-back-image').onclick=()=>setStep(2);$('#trial-new').onclick=()=>{$('#trial-clear').click();refreshFlow();};
initializePlanningHelp();statuses();notice();refreshFlow();setWorking(false);
if(fileMode){
  $('#trial-survey').closest('label').hidden=true;$('#trial-load').hidden=true;$('.trial-source-input summary').textContent='Import a boundary (GeoJSON)';
  $('#trial-live').textContent='Draw an inspection area to begin.';
}
const initial=new URLSearchParams(location.search).get('survey');if(initial&&!fileMode)loadSurvey(initial).catch(e=>error(e.message));
