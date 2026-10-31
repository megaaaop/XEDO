import './styles.css';
import './branding.css';
import './mission.css';
import './planning-trial.css';
import './planning-brand.css';
import './planning-help.css';
import './planning-readiness.css';
import './action-feedback.css';
import {createActionFeedback,paintActionButton} from './action-feedback.js';
import {setViewProperty} from './planning-view.js';
import {createPlanningMapOverlay} from './planning-map-overlay.js';
import {createInspectionTileReadiness,expectedInspectionTileKeys} from './planning-image-readiness.js';
import {initializePlanningReadiness} from './planning-readiness.js';
import {createPlanningSchedule} from './planning-schedule.js';
import {createPlanningExportDefaults} from './planning-export-defaults.js';
import {createPlanningFlightProfile} from './planning-flight-profile.js';
import {planningRouteSamples} from './planning-route-samples.js';
import {initializePlanningHelp} from './planning-help.js';
import {initializePlanningEnvironmentUI} from './planning-environment-ui.js';
import {initializePlanningGeospatialUI} from './planning-geospatial-ui.js';
import './planning-geospatial.css';
import {XEDO_HARDWARE_PROFILE} from './planning-hardware-profile.js';
import {ESTIMATED_DEMO_PROFILE,createEstimatedDemoInputs} from './planning-estimated-demo.js';
import {FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings,fixedSettingConflicts} from './planning-fixed-settings.js';
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
import {QuickMission,selectionMetrics} from './mission-flow.js';
import {selectArchivedSatellite,selectSceneSatellite,selectSavedSatellite,selectGEESatellite,bindGEESatelliteMap,satelliteTileClip,hasVisibleSatellitePixels} from './planning-satellite.js';
import OSM from 'ol/source/OSM.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Draw from 'ol/interaction/Draw.js';
import {unByKey} from 'ol/Observable.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom.js';
import {focusWithTabindex} from 'ol/events/condition.js';
import {intersects as extentsIntersect} from 'ol/extent.js';
import {fromLonLat,toLonLat} from 'ol/proj.js';
import {validateGeometry} from './domain.js';
import {createGEEBasemap} from './planning-basemap.js';
import {createGroundController} from './planning-3d-ground-controller.js';
import {initializeInspector} from './inspector-client.js';
import {initializeRiskEditor} from './planning-risk-editor.js';
import {coversGeometry} from './planning-risk-geometry.js';

const runtime=planningRuntime(location.protocol,typeof __XEDO_STANDALONE__==='boolean'&&__XEDO_STANDALONE__);
const fileMode=runtime.standalone;
const geeHosted=!runtime.localFile&&(typeof __XEDO_GEE_HOSTED__!=='boolean'||__XEDO_GEE_HOSTED__===true);
const embeddedPreview=typeof __XEDO_PREVIEW_DATA__==='string'?__XEDO_PREVIEW_DATA__:null;
const $=q=>document.querySelector(q),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const downloadFeedback=createActionFeedback();
const number=(value,places=2)=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:places}):'Unknown';
const list=values=>values?.length?'<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'';
const dl=rows=>'<dl>'+rows.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>';
// Project constants are not mission inputs. Keep named controls for payload
// compatibility; show their values in profile Information instead of the form.
const fields={
  drift:[['observedAt','Observation time (UTC)','datetime-local'],['arriveAt','Arrive at search area (UTC)','datetime-local'],['endAt','Search window ends (UTC)','datetime-local'],['currentEastMps','Surface current east (m/s)'],['currentNorthMps','Surface current north (m/s)'],['windSpeedMps','10 m wind speed (m/s)'],['windFromDeg','Wind FROM bearing (° true)'],['alpha','Nominal windage'],['alphaMin','Lower windage'],['alphaMax','Upper windage'],['marginM','Additional search margin (m)']],
  camera:[['sensorWidthMm','Active sensor width (mm)'],['sensorHeightMm','Active sensor height (mm)'],['focalLengthMm','Actual focal length (mm)'],['imageWidthPx','Output width (px)'],['imageHeightPx','Output height (px)'],['sideOverlap','Side overlap (%)'],['frontOverlap','Front overlap (%)'],['minTriggerIntervalS','Camera minimum interval (s)']],
  aircraft:[['altitudeM','Requested height AGL (m)'],['speedMps','Target ground speed (m/s)'],['homeLongitude','Home longitude (°)'],['homeLatitude','Home latitude (°)'],['windEastMps','Flight-level wind east (m/s)'],['windNorthMps','Flight-level wind north (m/s)'],['windLimitMps','Aircraft wind limit (m/s)'],['maxAirspeedMps','Aircraft maximum airspeed (m/s)']],
  battery:[['usableWh','Starting usable energy (Wh)'],['reserveWh','Final landing reserve (Wh)'],['powerW','Calibrated / assumed power (W)'],['takeoffS','Takeoff + climb allowance (s)'],['landingS','Landing allowance (s)'],['turnS','Allowance per turn (s)']],
  export:[['firmware','Flight firmware','select'],['qgcVersion','Target QGC version','text'],['homeAmslM','Home altitude AMSL (m)'],['relativeHeightM','Route height above home (m)'],['ceilingM','Planning ceiling above home (m)'],['corridorM','Route corridor margin (m)'],['plannedTakeoffAt','Scheduled takeoff (UTC)','datetime-local'],['plannedEndAt','Mission window ends (UTC; automatic data requires this)','datetime-local'],['validUntil','Planning constraints valid until (UTC)','datetime-local'],['source','Constraint source / review reference','text']],
  oil:[['pixelCount','Reviewed oil pixels'],['gsdM','Image GSD X (m/pixel)'],['gsdYM','Image GSD Y (optional; same as X)'],['areaM2','OR measured oil area (m²)'],['thicknessLowUm','Lower thickness (µm)'],['thicknessHighUm','Upper thickness (µm; blank = unknown)'],['densityGml','Oil density (g/mL)'],['capacityGg','Capacity (g oil/g dry capsules)'],['allowance','Material allowance factor'],['targetFraction','Target fraction (0–1)'],['oilFraction','Oil fraction of emulsion (0–1)']]
};
const prefixes={drift:'drift',camera:'flight',aircraft:'flight',battery:'flight',export:'export',oil:'oil'};
for(const [group,items] of Object.entries(fields)){
  const container=$('#'+(group==='export'?'export':group==='oil'?'oil':group==='drift'?'drift':group)+'-fields');
  for(const [key,label,type='number',value] of items){
    const actualType=type||'number',wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement(actualType==='select'?'select':'input');input.id='f-'+prefixes[group]+'-'+key;input.name=prefixes[group]+'.'+key;
    if(actualType==='select')input.innerHTML='<option value="">Unknown firmware</option><option value="PX4">PX4 · verify version</option><option value="ArduPilot">ArduPilot · verify version</option>';
    else{input.type=actualType;if(actualType==='number')input.step='any';if(actualType==='text')input.maxLength=300;}
    const fixed=isFixedPlanningField(prefixes[group],key);
    let initialValue=fixed?FIXED_PLANNING_SETTINGS[prefixes[group]][key]:value;
    if(fixed&&prefixes[group]==='flight'&&['sideOverlap','frontOverlap'].includes(key))initialValue*=100;
    if(initialValue!==undefined)input.value=initialValue;input.placeholder=actualType==='number'?'Unknown':actualType==='text'?'Not configured':'';
    if(fixed){input.readOnly=true;input.dataset.profileFixed='';wrapper.hidden=true;}
    wrapper.append(input);container.append(wrapper);
  }
}
let environmentUI=null;let geospatialUI=null;let inspectorUI=null;let riskUI=null;let applyingRiskReceipt=false;let riskPixelKey=null;
let estimatedDemo=false,missionBackup=null;
const schedule=createPlanningSchedule();
const exportDefaults=createPlanningExportDefaults();
const flightProfile=createPlanningFlightProfile();
let routePoints=[],readinessUI=null;
let geometry=null,surveyId=null,result=null,working=false,revision=0,abort=null,draw=null,sketch=null,sketchListener=null,vertexCount=0,selectHome=false,mode='2d',renderer=null,rendererTask=null,example=false;
let currentStep=1,review=null,webMission=null,satelliteRaster=null,satelliteAbort=null,satelliteToken=0,calculationTimer=null,satelliteBusy=false;
let satelliteScenes=[],satelliteSearchGeometry=null,satelliteExpiryTimer=null,lastSatelliteAction='search',savedImageSelection=null;
let groundMode='diagram';
const groundController=createGroundController({onTexture:texture=>renderer?.setGroundTexture(texture),onState:renderGroundState});
function renderGroundState(state){
  const status=$('#trial-ground-status'),progress=$('#trial-ground-progress');
  status.dataset.state=state.status;status.setAttribute('aria-busy',String(state.status==='loading'));
  $('#trial-ground-retry').hidden=state.status!=='error';
  progress.hidden=state.status!=='loading';
  if(state.status==='loading'&&Number.isFinite(state.completedTiles)&&state.totalTiles>0)progress.value=Math.round(state.completedTiles/state.totalTiles*100);
  else progress.removeAttribute('value');
  let message=state.message;
  if(state.status==='loading'&&state.stage==='tiles')message=`Loading satellite ground · ${state.completedTiles||0}/${state.totalTiles} tiles`;
  if(state.status==='ready'){
    const texture=state.texture,date=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
    message=`Ground: Sentinel-2 mosaic · ${date(texture.acquiredFrom)}–${date(texture.acquiredTo)} UTC · 10 m source`;
    if(texture.pixelSizeM>15)message+=` · ${number(texture.pixelSizeM,0)} m display pixels`;
    message+=` · Contains modified Copernicus Sentinel data ${new Date(texture.acquiredTo).getUTCFullYear()}`;
  }
  setViewProperty($('#trial-ground-message'),'textContent',message||'Preparing satellite ground…');
}
const format=new GeoJSON(),mapOverlay=createPlanningMapOverlay({format}),vectors=mapOverlay.source;
// Let a wheel scroll the page until the map is explicitly focused. Drag, pinch,
// keyboard and the visible zoom buttons retain their normal map behavior.
$('#trial-map').setAttribute('tabindex','0');
const interactions=defaultInteractions({mouseWheelZoom:false}).extend([new MouseWheelZoom({condition:focusWithTabindex})]);
const map=new Map({target:'trial-map',interactions,layers:[...(!geeHosted?[new TileLayer({source:new OSM(),zIndex:0})]:[]),mapOverlay.layer],view:new View({center:fromLonLat([101.23,12.62]),zoom:11})});
const basemap=geeHosted?createGEEBasemap({map,onState(state){
  const panel=$('#trial-basemap-status');panel.dataset.state=state.status;
  $('#trial-basemap-source').textContent=state.label;$('#trial-basemap-message').textContent=state.message;$('#trial-basemap-retry').hidden=!state.retry;
}}):null;
if(geeHosted)$('#trial-map-title').textContent='Earth Engine satellite map';
$('#trial-basemap-status').hidden=!geeHosted;$('#trial-basemap-retry').onclick=()=>basemap?.retry();
window.addEventListener('pagehide',event=>{if(event.persisted)basemap?.setActive(false);else basemap?.dispose();});
function error(message=''){$('#trial-error').hidden=!message;$('#trial-error').textContent=message;}
function announce(message){$('#trial-live').textContent=message;}
function setWorking(value,label='Calculating…'){
  working=value;const allowed=currentStep===3&&review?.ready;
  $('#trial-run').disabled=value||!!draw||!allowed;paintActionButton($('#trial-run'),value,label,'Refresh calculations');
  $('#trial-qgc').disabled=value||!!draw||!allowed||!selectedExportCheck()?.pass;$('#trial-snapshot').disabled=value||!!draw||!result;
  $('#trial-sortie').disabled=value||!!downloadFeedback.current;
  $('#trial-settings').setAttribute('aria-busy',String(value));refreshFlow();
}
function queueCalculations(){
  clearTimeout(calculationTimer);if(currentStep!==3||!review?.ready||riskUI?.blocked())return;
  $('#trial-engine-status').textContent='Updating mission calculations…';
  calculationTimer=setTimeout(()=>{if(currentStep===3&&review?.ready&&!draw&&!working)$('#trial-run').click();},250);
}
function invalidate(){
  syncFlightPlanningProfile();
  syncExportPlanningDefaults();
  if(!downloadFeedback.current){$('#trial-download-status').hidden=true;$('#trial-download-status').textContent='';}
  revision++;if(!applyingRiskReceipt)inspectorUI?.changed();abort?.abort();abort=null;result=null;clearTimeout(calculationTimer);$('#trial-qgc').disabled=true;$('#trial-snapshot').disabled=true;for(const id of ['drift','flight','export','oil'])$('#'+id+'-result').textContent='Results update automatically when the mission is prepared.';$('#trial-sortie').innerHTML='<option value="0">No assessed sorties</option>';drawMap();update3D();statuses();if(working)setWorking(false);refreshFlow();geospatialUI?.changed();queueCalculations();
}
function field(group,key){return $('#f-'+group+'-'+key);}
function syncFlightPlanningProfile(){
  const patch=flightProfile.reconcile(read('flight'));
  for(const [key,value] of Object.entries(patch))field('flight',key).value=value??'';
  return Object.keys(patch).length>0;
}
function selectedExportCheck(){return example?result?.exportCheck:result?.planningCheck;}
function syncExportPlanningDefaults(){
  const patch=exportDefaults.reconcile(read('export'));
  for(const [key,value] of Object.entries(patch))field('export',key).value=key==='validUntil'?value?.replace(/Z$/,'')||'':value??'';
  return Object.keys(patch).length>0;
}
function syncScheduleFields(patch){
  let changed=false;
  for(const key of ['plannedTakeoffAt','plannedEndAt']){
    const input=field('export',key),value=patch[key]?.replace(/Z$/,'')||'';
    // Native datetime-local controls normalize trailing seconds/fraction zeros.
    // Compare instants so that normalization cannot trigger an endless replan.
    const unchanged=value?input.value!==''&&Date.parse(input.value+'Z')===Date.parse(patch[key]):input.value==='';
    if(!unchanged){input.value=value;changed=true;}
  }
  return syncExportPlanningDefaults()||changed;
}
function terrainMode(){return $('#trial-terrain-mode').value==='manual'?'manual':'automatic';}
function terrainAssessment(){return geospatialUI?.getTerrainAssessment({toleranceM:Number($('#trial-terrain-tolerance').value)})||{mode:'gee_model',state:'unknown',label:'GEE samples unavailable',reasons:['GEE surface samples are not available.']};}
function reconcileModelHome(){
  // A known Home elevation does not depend on the whole route being level.
  // The separate terrain assessment still gates the export.
  if(terrainMode()==='automatic')geospatialUI?.useModelHomeEstimate();
}
function readinessState(){
  const f=read('flight'),hasHome=Number.isFinite(f.homeLongitude)&&Number.isFinite(f.homeLatitude),selected=hasHome&&$('#export-home-confirmed').checked&&!selectHome;
  const timing=schedule.getReadiness(),assessment=terrainAssessment(),model=geospatialUI?.getPatch()?.export?.homeElevationEvidence?.mode==='gee_model';
  const geospatialStatus=geospatialUI?.getStatus?.()??geospatialUI?.getState?.().status;
  const surfaceDetail=geospatialStatus==='not_configured'?'GEE connection not configured':assessment.state==='unknown'?(assessment.reasons?.[0]||assessment.label):assessment.label+(assessment.state==='review'?' · Range '+number(assessment.terrainRangeM)+' m / tolerance '+number(assessment.toleranceM)+' m; planning heights remain relative to Home.':'');
  const manual=terrainMode()==='manual',surfaceReady=manual?$('#export-flat-confirmed').checked:assessment.state==='ready'&&model;
  const referenceTerrainAllowed=!example&&!manual&&['ready','review'].includes(assessment.state)&&model;
  const rows=[
    {id:'home',title:'Launch / Return',state:selected?'ready':hasHome?'review':'waiting',detail:selectHome?'Finish or cancel launch-point selection on the map.':selected?number(f.homeLatitude,5)+', '+number(f.homeLongitude,5):'Choose the drone launch and return point.',actionLabel:selectHome?'Cancel selection':selected?'Move point':'Choose on map'},
    {id:'schedule',title:'Takeoff time',state:timing.status==='expired'?'blocked':timing.status,detail:timing.status==='ready'?new Date(schedule.getPatch().plannedTakeoffAt).toLocaleString('en-GB',{timeZone:'UTC',hour12:false})+' UTC':timing.message,actionLabel:timing.status==='expired'?'Replan':'Time settings'},
    {id:'terrain',title:'Surface model',state:surfaceReady?'ready':manual?'review':assessment.state==='ready'?'review':assessment.state,detail:manual?($('#export-flat-confirmed').checked?'Manually reviewed reference':'Review the surface and Home height reference'):assessment.state==='ready'&&!model?'Use the GEE Home estimate or choose a manual reference':surfaceDetail||'Waiting for GEE samples',actionLabel:'Surface settings'},
    {id:'airspace',title:example?'Route & airspace':'Planning review',state:$(example?'#export-airspace-reviewed':'#export-planning-reviewed').checked?'ready':'review',detail:example?'I reviewed the full route, return and current airspace constraints.':'Review the aircraft and battery assumptions, route, return and terrain findings. Airspace data remains separately assessed.'}
  ];
  const blockers=rows.filter(row=>row.state!=='ready'&&!(row.id==='terrain'&&referenceTerrainAllowed)).map(row=>row.title+': '+row.detail);
  if(!result)blockers.push(currentStep===3?'Waiting for route calculations.':'Complete the satellite survey and prepare the mission.');
  else for(const check of selectedExportCheck()?.checks||[])if(['blocked','incomplete'].includes(check.state))blockers.push(check.message);
  if(riskUI?.blocked())blockers.push('Confirm the current Inspector risk area before planning or downloading.');
  return {purpose:example?'strict_trial':'planning_reference',rows,canExport:!riskUI?.blocked()&&!!selectedExportCheck()?.pass&&rows.every(row=>row.state==='ready'||(referenceTerrainAllowed&&row.id==='terrain')),blockingReasons:[...new Set(blockers)],working,homeModelReady:geospatialUI?.canUseModelHomeEstimate()===true};
}
const readinessNodes=Object.create(null);
const readinessNode=id=>readinessNodes[id]??=(document.querySelector('#'+id));
function renderReadiness(){
  const state=readinessState(),f=read('flight'),hasHome=Number.isFinite(f.homeLongitude)&&Number.isFinite(f.homeLatitude);
  const set=(id,name,value)=>setViewProperty(readinessNode(id),name,value),text=(id,value)=>set(id,'textContent',value);
  text('trial-home-pick',selectHome?'Cancel point selection':hasHome?'Move launch point':'Set launch point');
  set('trial-home-clear','disabled',working||!hasHome);
  set('trial-home-pick','disabled',working);
  set('trial-home-cancel','hidden',!selectHome);
  text('trial-home-status',selectHome?'Click the launch and return position on the map.':hasHome?number(f.homeLatitude,5)+', '+number(f.homeLongitude,5):'Choose a point on the map.');
  const automatic=terrainMode()==='automatic';
  set('trial-flat-manual','hidden',automatic);set('trial-terrain-tolerance-label','hidden',!automatic);
  set('trial-terrain-use-model','hidden',!automatic);
  set('trial-terrain-use-model','disabled',working||!state.homeModelReady);
  text('trial-terrain-status',state.rows[2].detail);
  set('trial-planning-review','hidden',example);
  const timing=schedule.getState();
  text('trial-schedule-summary',timing.mode==='automatic'&&!timing.pending?'Takeoff: analysis + 1 hour · '+number(timing.windowDurationS/60,1)+' min mission window':'');
  set('trial-replan','disabled',working||!review?.ready);
  set('trial-qgc','disabled',working||!!downloadFeedback.current||!!draw||currentStep!==3||!review?.ready||!state.canExport);
  readinessUI?.render(state);
}
function updateHardwareProfileState(){
  $('#trial-hardware-name').textContent=XEDO_HARDWARE_PROFILE.name;
  $('#trial-hardware-state').textContent=(estimatedDemo?'Estimated demo · ':'Fixed inspection settings · ')+XEDO_HARDWARE_PROFILE.cameraLabel;
}
function notice(){
  $('#trial-notice').textContent=estimatedDemo?'Estimated demo · Assumed inputs':runtime.label+(example?' · Test data':' · Fixed profile');
  $('#trial-notice').hidden=!example;
  $('#trial-notice').dataset.mode=example?'demo':'mission';
  $('#trial-example').setAttribute('aria-pressed',String(estimatedDemo));
  $('#trial-demo-exit').hidden=!example;
  $('#trial-demo-information').hidden=!estimatedDemo;
  $('#trial-load').disabled=example;$('#trial-survey').disabled=example;
  $('#trial-basemap-status').hidden=!geeHosted||example;
  if(!downloadFeedback.current)$('#trial-qgc').textContent=example?'Download demo mission file':'Download planning file';
  updateHardwareProfileState();environmentUI?.changed();
}
function resetReview(home=false){$('#export-planning-reviewed').checked=false;$('#export-airspace-reviewed').checked=false;$('#export-flat-confirmed').checked=false;if(home)$('#export-home-confirmed').checked=false;}
function clearGeometry(){riskUI?.reset();resetSurvey();resetReview();schedule.reset();routePoints=[];geometry=null;surveyId=null;environmentUI?.changed();$('#trial-survey').value='';$('#trial-geometry').value='';$('#trial-source').textContent='No boundary selected.';notice();invalidate();}
function read(group){const data={};for(const item of document.querySelectorAll('[name^="'+group+'."]')){const key=item.name.slice(group.length+1),value=item.value.trim();if(item.type==='datetime-local'){const instant=new Date(value+'Z');data[key]=/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(instant.getTime())?instant.toISOString():null;}else data[key]=value===''?null:item.type==='number'?Number(value):value;}return data;}
function body(){
  syncFlightPlanningProfile();
  syncExportPlanningDefaults();
  const flight=read('flight'),lon=flight.homeLongitude,lat=flight.homeLatitude;delete flight.homeLongitude;delete flight.homeLatitude;
  flight.home=lon==null&&lat==null?null:[lon,lat];
  flight.planningProfile=flightProfile.metadata(flight);
  if(flight.sideOverlap!=null)flight.sideOverlap/=100;if(flight.frontOverlap!=null)flight.frontOverlap/=100;
  const exportValues=read('export');
  const exportSettings={...exportValues,purpose:example?'strict_trial':'planning_reference',planningReviewed:$('#export-planning-reviewed').checked,planningDefaults:exportDefaults.metadata(exportValues),schedule:schedule.getPatch().schedule,homeConfirmed:$('#export-home-confirmed').checked,flatSurfaceConfirmed:$('#export-flat-confirmed').checked,airspaceReviewed:$('#export-airspace-reviewed').checked};
  const noGo=$('#export-nogo').value.trim();if(noGo){try{exportSettings.noGo=JSON.parse(noGo);}catch{exportSettings.noGo=noGo;}}else exportSettings.noGo=null;
  const oil={...read('oil'),emulsion:$('#oil-emulsion').checked};if(oil.gsdYM==null)delete oil.gsdYM;if(!oil.emulsion&&oil.oilFraction==null)delete oil.oilFraction;
  const drift=read('drift'),automatic=environmentUI?.getPatch();if(automatic){Object.assign(flight,automatic.flight);Object.assign(drift,automatic.drift);}
  const geospatial=geospatialUI?.getPatch();if(geospatial){Object.assign(flight,geospatial.flight);if(terrainMode()==='automatic'||geospatial.export?.homeElevationEvidence?.mode==='gee_estimate')Object.assign(exportSettings,geospatial.export);}
  exportSettings.terrainMode=terrainMode();exportSettings.terrainToleranceM=Number($('#trial-terrain-tolerance').value);
  if(terrainMode()==='automatic'){exportSettings.terrainAssessment=terrainAssessment();exportSettings.flatSurfaceConfirmed=exportSettings.terrainAssessment.state==='ready';}
  return applyFixedPlanningSettings({...(riskUI?.hasAnalysis()?{geometry:riskUI.target()||geometry}:surveyId?{surveyId}:{geometry}),driftEnabled:$('#drift-enabled').checked,drift,flight,export:exportSettings,oil});
}
function api(path,options={}){return requestPlanningTrial(example&&!path.startsWith('/source')?{...runtime,standalone:true}:runtime,path,options);}
function displayPlan(){
  const plan=result?.flight?.plan,sorties=result?.flight?.battery?.sorties;
  if(!plan||!sorties?.length)return plan;
  return {...plan,waypoints:sorties.flatMap(s=>s.waypoints),localWaypoints:undefined};
}
function drawMap(){
  const plan=currentStep===3?result?.flight?.plan:null,sorties=currentStep===3?result?.flight?.battery?.sorties:null;
  const f=read('flight'),home=Number.isFinite(f.homeLongitude)&&Number.isFinite(f.homeLatitude)?[f.homeLongitude,f.homeLatitude]:null;
  mapOverlay.update({geometry,drift:currentStep===3?result?.drift:null,plan,sorties,home});
  setViewProperty($('#trial-route-note'),'textContent',sorties?.length?'Assessed routes · Includes home transit':plan?.status==='generated'?'Survey route only · Flight assessment needed':currentStep===2?'Satellite image · Review selected area':currentStep===3?'Route needs mission settings':geometry?'Inspection area selected':'No area selected');
}
function fit(){if(vectors.getFeatures().length)map.getView().fit(vectors.getExtent(),{padding:[45,45,45,45],maxZoom:17,duration:200});}
async function update3D(){
  if(mode!=='3d')return;const token=revision,plan=currentStep===3?displayPlan():null,generated=plan?.status==='generated';$('#trial-canvas').hidden=!generated;$('#trial-3d-empty').hidden=generated;$('#trial-3d-reset').hidden=!generated;
  $('#trial-3d-tools').hidden=!generated;
  if(!generated){renderer?.setActive(false);groundController.suspend();$('#trial-3d-empty').textContent=result?.flight?.message||'Prepare the mission to create the route preview.';return;}
  try{if(!renderer){$('#trial-3d-empty').hidden=false;$('#trial-3d-empty').textContent='Preparing 3D view…';rendererTask??=import('./deployment-3d.js').then(m=>m.createDeployment3D($('#trial-canvas'),{onInteractionChange:active=>{const b=$('#trial-3d-interact');b.textContent=active?'Exit 3D controls':'Interact with 3D';b.setAttribute('aria-pressed',String(active));}}));renderer=await rendererTask;}if(token!==revision||mode!=='3d')return;$('#trial-3d-empty').hidden=true;const context=geospatialUI?.getContext();renderer.setActive(true);renderer.setData({plan,context});renderer.setGroundMode(groundMode);groundController.update({geometry:renderer.getGroundGeometry(),available:!runtime.localFile&&(geeHosted||!fileMode)});document.querySelector('.trial-3d-label').textContent=(context?'GEE surface samples · Flat flight-height illustration':'Flat height preview')+' · Click to orbit; Escape to scroll the page';}
  catch{if(token!==revision)return;$('#trial-canvas').hidden=true;$('#trial-3d-empty').hidden=false;$('#trial-3d-empty').innerHTML='The 3D tools could not load. <button class="button secondary" type="button" id="trial-reload">Reload page</button><p>Download a snapshot first to retain your inputs.</p>';$('#trial-reload').onclick=()=>location.reload();}
}
function statuses(){const states=result?[['Drift scenarios',result.drift.state],['Camera route',result.flight.plan?.status==='generated'?'assumption_based':result.flight.state],['Planning file checks',selectedExportCheck()?.state||'incomplete'],['Oil & material',result.oil.state]]:[['Drift scenarios','waiting'],['Camera route','waiting'],['Flight file checks','waiting'],['Oil & material','waiting']];const labels={assumption_based:'Estimate computed',generated:'Route generated',pass:'Manual checks complete',incomplete:'Inputs needed',blocked:'Blocked',disabled:'Not selected',waiting:'Not calculated'};$('#trial-status').innerHTML=states.map(([name,state])=>'<div data-state="'+esc(state)+'"><small>'+esc(name)+'</small><strong>'+esc(labels[state]||state)+'</strong></div>').join('');renderMissionSummary();}
function render(){
  const {drift,flight,exportCheck,oil}=result,camera=flight.camera||{},battery=flight.battery||{};
  $('#drift-result').innerHTML='<p class="trial-result-context">'+esc(drift.state==='disabled'?'Original boundary selected':'Constant-vector search scenarios')+'</p>'+dl([['Nominal east displacement',number(drift.displacement?.eastM)+' m'],['Nominal north displacement',number(drift.displacement?.northM)+' m'],['Distance',number(drift.displacement?.distanceM)+' m']])+list(drift.missing)+list(drift.warnings);
  $('#flight-result').innerHTML='<p class="trial-result-context">Camera & flight estimates</p>'+dl([['Across / along footprint',number(camera.footprintAcrossM)+' / '+number(camera.footprintAlongM)+' m'],['GSD X / Y',number(camera.gsdXM,4)+' / '+number(camera.gsdYM,4)+' m/px'],['Line / photo spacing',number(camera.lineSpacingM)+' / '+number(camera.photoSpacingM)+' m'],['Trigger interval',number(camera.triggerIntervalS)+' s'],['Survey geometry distance',number(flight.plan?.estimates?.distanceM)+' m'],['All sorties incl. home transit',number(battery.totalDistanceM)+' m'],['Wind assessment',flight.wind?.state||'Unknown'],['Battery assessment',battery.state||'Unknown'],['Assessed sorties',battery.sorties?.length||0]])+list(flight.missing)+list(flight.wind?.missing)+list(battery.missing)+list(flight.warnings);
  if(battery.sorties?.length)$('#flight-result').innerHTML+='<table><thead><tr><th>Sortie</th><th>Time</th><th>Energy</th></tr></thead><tbody>'+battery.sorties.map((s,i)=>'<tr><td>'+String(i+1)+'</td><td>'+number(s.durationS/60)+' min</td><td>'+number(s.energyWh)+' Wh</td></tr>').join('')+'</tbody></table>';
  const planning=result.planningCheck;
  $('#export-result').innerHTML=(planning?'<p class="trial-result-context">Planning reference · '+esc(planning.pass?'File checks complete':'File checks need attention')+'</p>'+(planning.checks||[]).map(c=>'<span class="trial-checkline" data-state="'+esc(c.state)+'">'+esc(c.message||c.id)+'</span>').join('')+list(planning.warnings):'')+'<details><summary>Strict trial export checks · '+esc(exportCheck.pass?'Complete':'Review needed')+'</summary>'+(exportCheck.checks||[]).map(c=>'<span class="trial-checkline" data-state="'+esc(c.state)+'">'+esc(c.message||c.id)+'</span>').join('')+list(exportCheck.warnings)+'</details>';
  $('#oil-result').innerHTML='<p class="trial-result-context">Assumption-based quantity range</p>'+dl([['Reviewed oil area',number(oil.areaM2)+' m²'],['Oil volume lower / upper',number(oil.volumeLowL)+' / '+number(oil.volumeHighL)+' L'],['Oil mass lower / upper',number(oil.oilMassLowKg)+' / '+number(oil.oilMassHighKg)+' kg'],['Dry capsules lower / upper',number(oil.capsulesLowKg,3)+' / '+number(oil.capsulesHighKg,3)+' kg']])+list(oil.missing)+list(oil.warnings);
  $('#trial-sortie').innerHTML=battery.sorties?.length?battery.sorties.map((s,i)=>'<option value="'+i+'">Sortie '+(i+1)+' · '+number(s.distanceM)+' m</option>').join(''):'<option value="0">No assessed sorties</option>';
  statuses();drawMap();update3D();setWorking(false);
}
function setGeometry(value,sourceId=null){if(value?.type!=='Polygon'||value.coordinates?.length!==1||value.coordinates[0]?.length>121)throw Error('Choose a polygon with 3–120 vertices and no holes.');validateGeometry(value);riskUI?.reset();resetSurvey();resetReview();schedule.reset();routePoints=[];geometry=structuredClone(value);surveyId=sourceId;environmentUI?.changed();$('#trial-geometry').value=JSON.stringify(geometry);$('#trial-source').textContent=sourceId?'Frozen inspection: '+sourceId:'Unsaved inspection boundary.';$('#trial-survey').value=sourceId||'';notice();invalidate();refreshFlow();fit();}
async function loadSurvey(id){
  const requested=typeof id==='string'?id.trim():'';
  if(!requested)throw Error('Enter a saved survey ID.');
  const token=revision,lookup=(loadSurvey.requestId||0)+1;loadSurvey.requestId=lookup;
  paintActionButton($('#trial-load'),true,'Loading boundary…','Load saved boundary');announce('Loading saved boundary…');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  let data;
  try{data=await api('/source?survey='+encodeURIComponent(requested),{signal:controller.signal});}
  catch(e){if(token!==revision||lookup!==loadSurvey.requestId)return false;throw e.name==='AbortError'?Error('Saved boundary lookup timed out. The current mission has been kept.'):e;}
  finally{clearTimeout(timer);if(lookup===loadSurvey.requestId)paintActionButton($('#trial-load'),false,null,'Load saved boundary');}
  if(token!==revision||lookup!==loadSurvey.requestId)return false;
  if(data?.surveyId!==requested||typeof data.incidentId!=='string'||!data.incidentId)throw Error('The saved boundary response does not match the requested survey. The current mission has been kept.');
  // setGeometry validates before changing the reviewed image, inputs or schedule.
  // A failed lookup must also leave an in-progress drawing untouched.
  setGeometry(data.geometry,data.surveyId);stopDraw();$('#trial-back').href='/mission.html?incident='+encodeURIComponent(data.incidentId)+'&survey='+encodeURIComponent(data.surveyId);announce('Original saved boundary loaded. Review the four planning calculators.');return true;
}
$('#trial-run').onclick=async()=>{
  if(working||draw||currentStep!==3||!review?.ready||riskUI?.blocked())return;
  reconcileModelHome();error();const token=revision;
  try{
    const inputs=body();abort=new AbortController();const controller=abort;setWorking(true);
    const timer=setTimeout(()=>controller.abort(),25000);let data;
    try{data=await api('',{method:'POST',body:JSON.stringify(inputs),signal:controller.signal});}finally{clearTimeout(timer);}
    if(token!==revision)return;
    const timingChanged=syncScheduleFields(schedule.complete(data.flight));
    const samples=data.flight.battery?.state==='incomplete'&&schedule.getState().durationSource==='assessed_sorties'?routePoints:planningRouteSamples(data.flight),samplesChanged=JSON.stringify(samples)!==JSON.stringify(routePoints);
    routePoints=samples;result=data;render();
    if(timingChanged||samplesChanged)resetReview();
    if(timingChanged)environmentUI?.changed();
    if(samplesChanged||timingChanged)geospatialUI?.changed();
    // A second calculation binds checks to the anchored time and new model context.
    if(timingChanged||samplesChanged){$('#trial-qgc').disabled=true;queueCalculations();}
    announce('Mission calculations updated.');fit();
  }catch(e){if(token===revision){setWorking(false);error(e.name==='AbortError'?'Mission calculation timed out. Retry calculations.':e.message);$('#trial-engine-status').textContent='Calculation needs another attempt.';announce('Mission calculation was not completed.');}}
};
function download(text,filename,mime='application/json'){const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#trial-qgc').onclick=async()=>{
  if(downloadFeedback.current||working||draw||currentStep!==3||!review?.ready||riskUI?.blocked()||!readinessState().canExport){renderReadiness();return;}
  const context=inspectorUI?.contextKey(),token=revision,selectedSortie=Number($('#trial-sortie').value),operation=downloadFeedback.begin('download','Checking account…');
  const output=$('#trial-download-status');let timer,completed=false;
  const phase=label=>{if(!downloadFeedback.update(operation,label))return;paintActionButton($('#trial-qgc'),true,label,'Download mission file');output.hidden=false;output.textContent=label;output.dataset.actionBusy='true';};
  const unchanged=()=>token===revision&&context===inspectorUI?.contextKey()&&selectedSortie===Number($('#trial-sortie').value);
  error();setWorking(true,'Preparing mission file…');phase('Checking account…');
  try{
    if(inspectorUI&&!await inspectorUI.ensureSession())return;
    if(!unchanged())return;
    if(riskUI?.hasAnalysis()){await verifyRiskTargetPixels(riskUI.target());if(!unchanged()||riskUI.blocked())return;}
    phase('Checking current conditions…');
    if(environmentUI&&!await environmentUI.ensureFresh()){output.textContent='Conditions updated. Review the calculations and confirmations before downloading.';error(output.textContent);return;}
    if(!unchanged()||!readinessState().canExport)return;
    phase('Preparing mission file…');abort=new AbortController();const controller=abort;timer=setTimeout(()=>controller.abort(),25000);
    const data=await api(example?'/export':'/planning-export',{method:'POST',body:JSON.stringify({...body(),sortieIndex:selectedSortie}),signal:controller.signal});
    if(!unchanged())return;
    if(data.inputHash!==result?.inputHash)throw Error('The file does not match the current mission inputs. Recalculate before downloading.');
    phase('Checking account before download…');if(inspectorUI&&!await inspectorUI.ensureSession())return;
    if(!unchanged())return;
    if(!readinessState().canExport)throw Error('Flight readiness changed while the file was being prepared. Review or replan before downloading.');
    download(data.text,example?'XEDO-estimated-demo-'+data.filename:data.filename,data.mime);completed=true;output.textContent='Mission file ready. Download started.';announce(example?'Estimated demo file ready. Download started using assumed inputs.':'Mission file ready. Download started.');
  }catch(e){if(token===revision){output.textContent=e.name==='AbortError'?'Export timed out. Recalculate and try again.':e.message;error(output.textContent);invalidate();}}
  finally{clearTimeout(timer);if(downloadFeedback.end(operation)){paintActionButton($('#trial-qgc'),false,'',example?'Download demo mission file':'Download planning file');output.dataset.actionBusy='false';if(!completed&&output.textContent.endsWith('…'))output.textContent='Download paused. Review the current mission and try again.';if(token===revision)setWorking(false);else renderReadiness();}}
};
$('#trial-snapshot').onclick=()=>{if(result&&!draw)download(JSON.stringify({...result,exampleData:example,...(estimatedDemo?{demoProfile:ESTIMATED_DEMO_PROFILE}:{})},null,2),(example?'XEDO-estimated-demo-':'XEDO-planning-trial-')+result.inputHash.slice(0,12)+'.json');};
function compatibleInputs(inputs){
  const conflicts=fixedSettingConflicts(inputs);
  if(conflicts.length)throw Error('Snapshot uses different fixed settings ('+conflicts.join(', ')+'). The current mission has been kept. Use a snapshot matching '+XEDO_HARDWARE_PROFILE.name+' or import its boundary only.');
  return applyFixedPlanningSettings(inputs);
}
function restoreInputs(inputs){
  const restored=compatibleInputs(inputs);
  schedule.restore(restored.export?.schedule,restored.export||{});
  $('#trial-terrain-mode').value=restored.export?.terrainMode|| (runtime.localFile?'manual':'automatic');
  $('#trial-terrain-tolerance').value=String(restored.export?.terrainToleranceM??2);
  for(const input of document.querySelectorAll('#trial-settings input[name],#trial-settings select[name]')){
    const [group,key]=input.name.split('.');let value=restored[group]?.[key];
    if(group==='drift'&&key==='observedAt')delete input.dataset.satelliteObservedAt;
    if(group==='flight'&&key==='homeLongitude')value=restored.flight?.home?.[0];
    if(group==='flight'&&key==='homeLatitude')value=restored.flight?.home?.[1];
    if(group==='flight'&&['sideOverlap','frontOverlap'].includes(key)&&value!=null)value*=100;
    if(input.type==='datetime-local'&&value){const date=new Date(value);value=Number.isFinite(date.getTime())?date.toISOString().replace(/Z$/,''):'';}
    input.value=value??'';
  }
  $('#drift-enabled').checked=restored.driftEnabled===true;
  $('#export-home-confirmed').checked=restored.export.homeConfirmed===true;
  $('#export-flat-confirmed').checked=restored.export.flatSurfaceConfirmed===true;
  $('#export-airspace-reviewed').checked=restored.export.airspaceReviewed===true;
  $('#export-planning-reviewed').checked=restored.export.planningReviewed===true;
  $('#export-nogo').value=restored.export.noGo?JSON.stringify(restored.export.noGo):'';
  $('#oil-emulsion').checked=restored.oil.emulsion===true;
  $('#trial-camera-preset').value=XEDO_HARDWARE_PROFILE.cameraPreset;updateHardwareProfileState();
  exportDefaults.restore(restored.export);syncExportPlanningDefaults();flightProfile.restore(restored.flight);syncFlightPlanningProfile();
}
// Keep raw values: even a partially entered mission must survive a demo visit.
function captureMission(){
  return {geometry:structuredClone(geometry),surveyId,schedule:schedule.getPatch(),exportDefaults:exportDefaults.metadata(read('export')),flightProfile:flightProfile.metadata(read('flight')),source:$('#trial-source').textContent,back:$('#trial-back').getAttribute('href'),riskBackup:riskUI?.backup(),savedImageSelection:structuredClone(savedImageSelection),
    controls:[...document.querySelectorAll('#trial-settings input[id],#trial-settings select[id],#trial-settings textarea[id]')].filter(input=>input.type!=='file').map(input=>({id:input.id,value:input.value,checked:input.checked}))};
}
function useDemo(){
  if(!example)missionBackup=captureMission();
  stopDraw();selectHome=false;estimatedDemo=true;example=true;
  // Revoke auto-owned inputs before assigning values that may also equal zero.
  environmentUI?.changed();geospatialUI?.revokeHomeEstimate();geospatialUI?.changed();basemap?.setActive(false);
  const inputs=createEstimatedDemoInputs();setGeometry(inputs.geometry);restoreInputs(inputs);schedule.reset();if(!runtime.localFile&&terrainMode()==='automatic')field('export','homeAmslM').value='';resetReview(true);
  notice();invalidate();drawMap();fit();error();
  announce('Estimated demo loaded. Review the stored satellite image, then prepare the mission.');
}
function leaveDemo(){
  if(!example)return;
  stopDraw();selectHome=false;const previous=missionBackup;missionBackup=null;estimatedDemo=false;example=false;
  if(previous?.geometry)setGeometry(previous.geometry,previous.surveyId);else clearGeometry();
  if(previous){
    for(const saved of previous.controls){const input=document.getElementById(saved.id);if(input){input.value=saved.value;if(typeof saved.checked==='boolean')input.checked=saved.checked;}}
    $('#trial-source').textContent=previous.source;$('#trial-back').setAttribute('href',previous.back);schedule.restore(previous.schedule?.schedule,previous.schedule||{});exportDefaults.restore({...read('export'),planningDefaults:previous.exportDefaults});syncExportPlanningDefaults();flightProfile.restore({...read('flight'),planningProfile:previous.flightProfile});syncFlightPlanningProfile();savedImageSelection=structuredClone(previous.savedImageSelection||null);riskUI?.restoreBackup(previous.riskBackup);
  }else restoreInputs(applyFixedPlanningSettings({}));
  resetReview(true);notice();geospatialUI?.changed();invalidate();drawMap();error();
  announce('Mission inputs restored. Review the image and export confirmations again.');
}
$('#trial-restore').onchange=async event=>{
  if(event.target.dataset.actionBusy==='true')return;
  try{
    const file=event.target.files[0];if(!file)return;if(file.size>1500000)throw Error('Mission snapshot exceeds 1.5 MB.');
    event.target.dataset.actionBusy='true';event.target.setAttribute('aria-busy','true');announce('Reading mission snapshot…');
    const token=revision,data=JSON.parse(await file.text());if(token!==revision)return;
    if(data.schema_version!=='xedo-planning-trial/1'||!data.inputs)throw Error('Choose an XEDO planning snapshot.');
    const restored=compatibleInputs(data.inputs);createPlanningSchedule().restore(restored.export?.schedule,restored.export||{});const incomingDemo=data.demoProfile?.id===ESTIMATED_DEMO_PROFILE.id,incomingExample=incomingDemo||data.exampleData===true;let importedId=null;
    if((fileMode||incomingExample)&&restored.surveyId){
      if(data.source?.surveyId!==restored.surveyId||!data.source?.geometry)throw Error('This snapshot does not contain a matching saved boundary. Import a polygon GeoJSON instead.');
      importedId=restored.surveyId;restored.geometry=structuredClone(data.source.geometry);delete restored.surveyId;
    }
    if(restored.geometry!=null)validateGeometry(restored.geometry);
    // A failed source lookup must not relabel the current demo as real inputs.
    if(restored.surveyId&&!await loadSurvey(restored.surveyId))return;
    if(!restored.surveyId)stopDraw();
    if(incomingExample&&!example)missionBackup=captureMission();
    if(!incomingExample)missionBackup=null;
    estimatedDemo=incomingDemo;example=incomingExample;environmentUI?.changed();if(incomingExample)geospatialUI?.revokeHomeEstimate();geospatialUI?.changed();
    if(!restored.surveyId){if(restored.geometry==null)clearGeometry();else setGeometry(restored.geometry);}
    restoreInputs(restored);resetReview(true);notice();invalidate();drawMap();error();
    if(importedId)$('#trial-source').textContent='Imported snapshot boundary: '+importedId+' · Database linkage is unverified. New results use this as a local inspection boundary.';
    announce('Inputs restored. Recalculate to refresh all results and validity checks.');
  }catch(e){error(e.message);}finally{event.target.value='';event.target.dataset.actionBusy='false';event.target.setAttribute('aria-busy','false');}
};
function changed(event){
  const input=event.target,name=input.name||'',id=input.id;
  if(name.startsWith('export.'))exportDefaults.edited(name.slice(7));
  if(name.startsWith('flight.'))flightProfile.edited(name.slice(7));
  if(name==='drift.observedAt')delete input.dataset.satelliteObservedAt;
  if(['export.plannedTakeoffAt','export.plannedEndAt'].includes(name)){
    try{schedule.setManual(read('export'));}catch{error('Choose valid takeoff and end times.');return;}
  }
  if(name.startsWith('flight.')||name.startsWith('drift.')||id==='drift-enabled'||id==='trial-camera-preset')resetReview(name.startsWith('flight.home'));
  else if(name.startsWith('export.')||id==='export-nogo'||id==='trial-terrain-mode'||id==='trial-terrain-tolerance')resetReview(name==='export.homeAmslM');
  if(name.startsWith('flight.')||name.startsWith('drift.')||id==='drift-enabled')routePoints=[];
  invalidate();updateHardwareProfileState();environmentUI?.changed();reconcileModelHome();error();
}
const semanticChanged=event=>{const control=event.target,discrete=control.type==='checkbox'||control.type==='radio'||control.tagName==='SELECT';if(event.type===(discrete?'change':'input'))changed(event);};
$('#trial-settings').addEventListener('input',semanticChanged);$('#trial-settings').addEventListener('change',semanticChanged);$('#trial-settings').onsubmit=e=>e.preventDefault();
$('#trial-2d').onclick=()=>{mode='2d';renderer?.setActive(false);groundController.suspend();$('#trial-3d-tools').hidden=true;$('#trial-map-title').textContent=review?.label||(geeHosted?'Earth Engine satellite map':'Inspection boundary');$('#trial-map').hidden=false;$('#trial-3d-wrap').hidden=true;$('#trial-2d').setAttribute('aria-pressed','true');$('#trial-3d').setAttribute('aria-pressed','false');requestAnimationFrame(()=>map.updateSize());};
$('#trial-3d').onclick=()=>{stopDraw();mode='3d';$('#trial-map-title').textContent='Mission route preview';$('#trial-map').hidden=true;$('#trial-3d-wrap').hidden=false;$('#trial-2d').setAttribute('aria-pressed','false');$('#trial-3d').setAttribute('aria-pressed','true');update3D();};
let interactionBeforePointer=null;
$('#trial-3d-interact').onpointerdown=()=>{interactionBeforePointer=$('#trial-3d-interact').getAttribute('aria-pressed')==='true';};
$('#trial-3d-interact').onpointercancel=()=>{interactionBeforePointer=null;};
$('#trial-3d-interact').onclick=()=>{if(!renderer)return;const active=interactionBeforePointer??($('#trial-3d-interact').getAttribute('aria-pressed')==='true');interactionBeforePointer=null;renderer.setInteractive(!active);if(!active)$('#trial-canvas').focus({preventScroll:true});};
for(const value of ['diagram','satellite'])$('#trial-ground-'+value).onclick=()=>{
  groundMode=value;for(const option of ['diagram','satellite'])$('#trial-ground-'+option).setAttribute('aria-pressed',String(option===value));
  renderer?.setGroundMode(value);groundController.setMode(value);
};
$('#trial-ground-retry').onclick=()=>groundController.retry();
$('#trial-3d-reset').onclick=()=>renderer?.reset();$('#trial-fit').onclick=()=>mode==='3d'?renderer?.reset():fit();
function stopDraw(){loadSurvey.requestId=(loadSurvey.requestId||0)+1;paintActionButton($('#trial-load'),false,null,'Load saved boundary');if(sketchListener)unByKey(sketchListener);sketchListener=null;sketch=null;vertexCount=0;if(draw){draw.abortDrawing();map.removeInteraction(draw);draw=null;}$('#trial-finish').hidden=true;$('#trial-cancel').hidden=true;$('#trial-draw').textContent='Draw polygon';setWorking(working);}
$('#trial-draw').onclick=()=>{if(working)return;$('#trial-2d').click();stopDraw();selectHome=false;draw=new Draw({type:'Polygon',stopClick:true,freehandCondition:()=>false,maxPoints:120});draw.on('drawstart',event=>{sketch=event.feature;vertexCount=1;sketchListener=sketch.getGeometry().on('change',()=>{vertexCount=Math.max(1,sketch.getGeometry().getCoordinates()[0].length-2);$('#trial-finish').disabled=vertexCount<3;});});draw.on('drawend',event=>{try{const value=format.writeGeometryObject(event.feature.getGeometry(),{featureProjection:'EPSG:3857',dataProjection:'EPSG:4326'});setGeometry(value);error();announce('Area selected. Review a dated image of this area next.');}catch(e){error(e.message);}queueMicrotask(stopDraw);});map.addInteraction(draw);setWorking(working);$('#trial-draw').textContent='Drawing…';$('#trial-finish').hidden=false;$('#trial-finish').disabled=true;$('#trial-cancel').hidden=false;announce('Select at least three corners, then double click or choose Finish area.');};$('#trial-finish').onclick=()=>{if(draw&&vertexCount>=3)draw.finishDrawing();};$('#trial-cancel').onclick=()=>{stopDraw();announce('Drawing cancelled. The previous area is retained.');};
function chooseHome(){
  if(working)return;$('#trial-settings-dialog').close();$('#trial-readiness-dialog').close();
  riskUI?.cancelEdit();
  stopDraw();$('#trial-2d').click();selectHome=!selectHome;
  announce(selectHome?'Click the launch and return point on the map.':'Point selection cancelled.');renderReadiness();
  if(selectHome){$('#trial-map').scrollIntoView?.({block:'center'});$('#trial-map').focus?.({preventScroll:true});}
}
$('#trial-home').onclick=chooseHome;$('#trial-home-pick').onclick=chooseHome;
$('#trial-home-cancel').onclick=()=>{selectHome=false;renderReadiness();announce('Point selection cancelled.');};
$('#trial-terrain-use-model').onclick=()=>{
  if(working||terrainMode()!=='automatic'||!geospatialUI?.canUseModelHomeEstimate())return;
  geospatialUI?.revokeHomeEstimate();field('export','homeAmslM').value='';
  geospatialUI?.useModelHomeEstimate();resetReview();invalidate();
};
$('#trial-export-defaults').onclick=()=>{
  if(working)return;
  exportDefaults.reset(read('export'));syncExportPlanningDefaults();resetReview();invalidate();
  announce('Planning values restored. Review the route and airspace before downloading.');
};
$('#trial-flight-defaults').onclick=()=>{
  if(working)return;
  flightProfile.reset(read('flight'));syncFlightPlanningProfile();resetReview();invalidate();
  announce('Aircraft planning assumptions restored. Review the recalculated route and battery sorties.');
};
$('#trial-home-clear').onclick=()=>{
  if(working)return;selectHome=false;geospatialUI?.revokeHomeEstimate();
  field('flight','homeLongitude').value='';field('flight','homeLatitude').value='';routePoints=[];
  resetReview(true);invalidate();announce('Launch and return point cleared.');
};
map.on('singleclick',event=>{
  if(!selectHome||working)return;selectHome=false;geospatialUI?.revokeHomeEstimate();
  const [lon,lat]=toLonLat(event.coordinate);
  field('flight','homeLongitude').value=lon.toFixed(7);field('flight','homeLatitude').value=lat.toFixed(7);
  routePoints=[];resetReview(true);$('#export-home-confirmed').checked=true;invalidate();
  announce('Launch and return point selected. Route calculations include both transit legs.');
});
$('#trial-clear').onclick=()=>{if(working)return;stopDraw();selectHome=false;clearGeometry();error();announce('Current boundary and results cleared. Saved inspections are retained.');};$('#trial-load').onclick=()=>loadSurvey($('#trial-survey').value).catch(e=>error(e.message));$('#trial-import-geometry').onclick=()=>{try{const data=JSON.parse($('#trial-geometry').value);stopDraw();setGeometry(data.type==='Feature'?data.geometry:data);error();}catch(e){error(e.message);}};
$('#trial-example').onclick=useDemo;
$('#trial-demo-exit').onclick=leaveDemo;
window.addEventListener('pagehide',event=>{if(event.persisted){renderer?.setActive(false);return;}groundController.dispose();renderer?.destroy();geospatialUI?.dispose();environmentUI?.dispose();revision++;abort?.abort();satelliteAbort?.abort();clearTimeout(calculationTimer);clearTimeout(satelliteTimer);clearTimeout(satelliteExpiryTimer);clearInterval(readinessTimer);readinessUI?.dispose();document.removeEventListener('visibilitychange',readinessVisibility);setWorking(false);});
window.addEventListener('pageshow',event=>{if(!event.persisted)return;refreshFlow();geospatialUI?.changed();environmentUI?.changed();map.updateSize();if(mode==='3d')update3D();renderReadiness();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]')){stopDraw();selectHome=false;renderReadiness();}});

function renderMissionSummary(){
  const flight=result?.flight,battery=flight?.battery,oil=result?.oil,route=flight?.plan;
  const distance=battery?.totalDistanceM??route?.estimates?.distanceM;
  $('#trial-summary-distance').textContent=!Number.isFinite(distance)?'Settings needed':distance>=1000?number(distance/1000,2)+' km':distance>0&&distance<1?'<1 m':number(distance,0)+' m';
  $('#trial-summary-sorties').textContent=battery?.state==='pass'?String(battery.sorties.length):route?.status==='generated'?'Flight inputs needed':'Settings needed';
  if(Number.isFinite(oil?.capsulesLowKg)){
    const hasUpper=Number.isFinite(oil.capsulesHighKg),inGrams=Math.max(oil.capsulesLowKg,hasUpper?oil.capsulesHighKg:0)<1;
    const scale=inGrams?1000:1,places=inGrams?0:1,minimum=10**-places;
    const display=value=>value>0&&value*scale<minimum?'<'+number(minimum,places):number(value*scale,places);
    const low=display(oil.capsulesLowKg),high=hasUpper?display(oil.capsulesHighKg):null,unit=inGrams?' g':' kg';
    $('#trial-summary-material').textContent=(hasUpper?'~'+low+(low===high?'':'–'+high):'From ~'+low)+unit;
  }else $('#trial-summary-material').textContent='Awaiting reviewed drone evidence';
  $('#trial-sortie-wrap').hidden=!(battery?.sorties?.length>1);
  if(working)$('#trial-engine-status').textContent='Calculating…';
  else if(result)$('#trial-engine-status').textContent=selectedExportCheck()?.pass?(example?'Demo file ready · Assumed inputs':'Planning file ready · Select a sortie to download'):flight?.state==='blocked'?'Flight blocked · Open Calculation details':route?.status==='generated'&&battery?.state!=='pass'?'Route preview ready · Complete wind, battery and home settings':'Mission settings or export review needed';
  else if(currentStep===3)$('#trial-engine-status').textContent=riskUI?.blocked()?'Confirm the current inspection area to update the route.':'Calculating…';
}
function refreshFlow(){
  basemap?.setActive(currentStep===1&&!example);
  ['area','survey','deploy'].forEach((name,i)=>$('#trial-'+name+'-step').hidden=currentStep!==i+1);
  [...$('#trial-progress').children].forEach((item,i)=>{item.classList.toggle('active',i+1===currentStep);item.classList.toggle('done',i+1<currentStep);if(i+1===currentStep)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
  $('#trial-step-2').disabled=!geometry||satelliteBusy||!!draw;$('#trial-step-3').disabled=!review?.ready||satelliteBusy||!!draw||!!riskUI?.blocked();
  $('#trial-survey-action').disabled=!geometry||!!draw||satelliteBusy||working;
  $('#trial-prepare').disabled=!review?.ready||satelliteBusy||!!riskUI?.blocked();$('#trial-survey-retry').hidden=!!review?.ready||satelliteBusy;$('#trial-survey-retry').disabled=satelliteBusy;$('#trial-archive').hidden=!geeHosted||!!surveyId||!!review?.ready;$('#trial-archive').disabled=satelliteBusy;
  $('#trial-gee-controls').hidden=!geeHosted||!!surveyId||example;
  for(const input of document.querySelectorAll('#trial-image-search input'))input.disabled=satelliteBusy;
  $('#trial-image-search-submit').disabled=satelliteBusy||!geometry;$('#trial-image-scenes').disabled=satelliteBusy||!satelliteScenes.length;
  $('#trial-image-load').disabled=satelliteBusy||!$('#trial-image-scenes').value;$('#trial-image-cancel').hidden=!satelliteBusy;
  $('#trial-map-hint').hidden=geeHosted||!!review?.ready;
  $('#trial-map-hint').textContent=satelliteBusy?'Base map · Loading a satellite image for the selected area…':!geometry?'Base map · Draw an inspection area, then choose Load satellite image.':currentStep===1?'Base map · Choose Load satellite image to show a dated acquisition for this area.':geeHosted&&!surveyId?satelliteScenes.length?'Base map · Choose an acquisition, then Load selected image.':'Base map · Search for a covering acquisition using the dates and cloud limit.':'Base map · Retry loading the original satellite image.';
  $('#trial-map-views').hidden=currentStep!==3;$('#trial-boundary-tools').hidden=currentStep!==1;
  if(geometry){const metrics=selectionMetrics(geometry);$('#trial-area-size').textContent=metrics.areaM2>=1e6?number(metrics.areaM2/1e6)+' km²':number(metrics.areaM2,0)+' m²';$('#trial-area-vertices').textContent=(geometry.coordinates[0].length-1)+' boundary corners';}
  else{$('#trial-area-size').textContent='No area selected';$('#trial-area-vertices').textContent='Place at least three corners.';}
  [...document.querySelectorAll('.trial-map-legend>span')].forEach((item,i)=>{item.hidden=i>0&&(currentStep!==3||(i<3&&!result?.drift?.geometry)||(i===3&&result?.flight?.plan?.status!=='generated'));});
  renderMissionSummary();renderReadiness();
}
function setStep(next){
  if(next>1&&!geometry)return;if(next===3&&!review?.ready)return;stopDraw();selectHome=false;if(next===1){resetSurvey();invalidate();}currentStep=next;
  if(next!==3)$('#trial-2d').click();refreshFlow();drawMap();setWorking(working);
  if(next===3&&!result)queueCalculations();
}
let satelliteTimer=null,lastSurveyArchived=false;
function resetSurvey(keepScenes=false){
  paintActionButton($('#trial-prepare'),false,null,'Prepare drone mission →');
  groundController.clear();
  satelliteToken++;satelliteAbort?.abort();satelliteAbort=null;clearTimeout(satelliteTimer);satelliteTimer=null;clearTimeout(satelliteExpiryTimer);satelliteExpiryTimer=null;satelliteBusy=false;selectHome=false;
  if(satelliteRaster)map.removeLayer(satelliteRaster);satelliteRaster=null;review=null;webMission=null;savedImageSelection=null;currentStep=1;
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
    let settled=false,renderListener=null,sawTile=false,contextWarningMessage=null;
    const finish=(failure)=>{if(settled)return;settled=true;if(renderListener)unByKey(renderListener);clearTimeout(satelliteTimer);signal.removeEventListener('abort',cancel);if(failure)reject(failure);else resolve({contextWarning:contextWarningMessage});};
    const cancel=()=>finish(new DOMException('Satellite survey cancelled.','AbortError'));signal.addEventListener('abort',cancel,{once:true});
    const failed=message=>{if(settled)revokeSatellite(token,signal,message);else finish(Error(message));};
    satelliteTimer=setTimeout(()=>finish(Error('Satellite image is taking too long to load. Retry or change the area.')),30000);
    try{
      const epsg=Number(selection.image.epsg??selection.scene.epsg);
      if(epsg>=32601&&epsg<=32760&&!proj4.defs('EPSG:'+epsg)){proj4.defs('EPSG:'+epsg,'+proj=utm +zone='+(epsg%100)+(epsg>=32700?' +south':'')+' +datum=WGS84 +units=m +no_defs');register(proj4);}
      if(selection.image.kind==='preview'){
        const url=fileMode?embeddedPreview:selection.image.url;if(!url)throw Error('The archived satellite image is not embedded. Rebuild the standalone planner.');
        satelliteRaster=new ImageLayer({source:new ImageStatic({url,projection:'EPSG:'+epsg,imageExtent:selection.image.extent})});
        satelliteRaster.getSource().on('imageloadend',()=>finish());satelliteRaster.getSource().on('imageloaderror',()=>failed('The archived satellite image could not load.'));
      }else if(selection.image.kind==='gee'){
        if(!geeHosted||!selection.image.url)throw Error('Earth Engine imagery needs the hosted workspace.');
        const inspectionRing=selection.geometry.coordinates[0].map(point=>fromLonLat(point)),visibleTiles=new WeakSet(),tileReadiness=createInspectionTileReadiness();let contextWarningShown=false;
        const inspectionExtent=format.readGeometry(selection.geometry,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).getExtent();
        const displayExtent=format.readGeometry(selection.image.displayGeometry||selection.geometry,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).getExtent();
        const inspectionTile=tile=>extentsIntersect(inspectionExtent,source.getTileGrid().getTileCoordExtent(tile.getTileCoord()));
        const tileKey=tile=>tile.getTileCoord().join('/');
        const source=new XYZ({url:selection.image.url,maxZoom:18,wrapX:false,transition:0,
          tileLoadFunction:async(tile,url)=>{
            try{
              const response=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal});
              if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw Error('Image tile unavailable');
              const blob=await response.blob();if(signal.aborted||token!==satelliteToken)return;
              // Context-only tiles are displayed without decoding them a second
              // time for pixel review. Only the original AOI can pass review.
              if(inspectionTile(tile)&&await geeTileHasVisibleData(blob,inspectionRing,source.getTileGrid().getTileCoordExtent(tile.getTileCoord())))visibleTiles.add(tile);
              if(signal.aborted||token!==satelliteToken)return;
              const objectUrl=URL.createObjectURL(blob),image=tile.getImage();
              const cleanup=()=>{URL.revokeObjectURL(objectUrl);image.removeEventListener('load',cleanup);image.removeEventListener('error',cleanup);};
              image.addEventListener('load',cleanup,{once:true});image.addEventListener('error',cleanup,{once:true});image.src=objectUrl;
            }catch{tile.setState(TileState.ERROR);}
          }});
        satelliteRaster=new TileLayer({source,extent:displayExtent});
        source.on('tileloadstart',event=>tileReadiness.start(tileKey(event.tile),inspectionTile(event.tile)));
        source.on('tileloadend',event=>tileReadiness.complete(tileKey(event.tile),inspectionTile(event.tile),visibleTiles.has(event.tile)));
        source.on('tileloaderror',event=>{
          if(signal.aborted||token!==satelliteToken)return;
          if(tileReadiness.fail(tileKey(event.tile),inspectionTile(event.tile)))failed('Earth Engine image tiles could not load. Reload the selected image or search again.');
          else if(!contextWarningShown){contextWarningShown=true;contextWarningMessage='Some surrounding imagery could not load. Reload the image to retry.';$('#trial-image-caption').textContent+=' · '+contextWarningMessage;}
        });
        // Prime the full wanted AOI range before checking readiness. A queued
        // tile that has not emitted tileloadstart still prevents approval.
        const checkInspection=()=>{
          if(signal.aborted||token!==satelliteToken||settled)return;
          const view=map.getView(),size=map.getSize();
          if(!size||view.getAnimating()||view.getInteracting())return;
          try{
            tileReadiness.expect(expectedInspectionTileKeys({tileGrid:source.getTileGrid(),inspectionExtent,viewExtent:view.calculateExtent(size),resolution:view.getResolution(),rotation:view.getRotation(),center:view.getCenter(),size}));
            const state=tileReadiness.getState();
            if(state.expected&&!state.pending)finish(state.ready?null:Error('The selected image has no visible satellite pixels inside the inspection area. Choose another acquisition.'));
          }catch(error){finish(error);}
        };
        renderListener=[map.on('postrender',checkInspection),map.on('rendercomplete',checkInspection)];
      }else{
        if(fileMode)throw Error('This standalone planner contains the stored satellite image only.');
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
function syncImageObservationTime(acquiredAt){
  const observed=field('drift','observedAt');
  // Only replace an empty value or the exact value supplied by the last image.
  // Imported or manually edited observation times keep their own provenance.
  if(observed.value&&observed.value!==observed.dataset.satelliteObservedAt)return;
  const acquired=new Date(acquiredAt);if(!Number.isFinite(acquired.getTime()))return;
  observed.value=acquired.toISOString().slice(0,16);observed.dataset.satelliteObservedAt=observed.value;
}
async function reviewSatellite(selection,token,signal){
  if(token!==satelliteToken||signal.aborted)return;
  review={...selection,ready:false};$('#trial-map-title').textContent=selection.label;$('#trial-image-kind').textContent=selection.label;
  $('#trial-image-date').textContent=acquisitionLabel(selection.scene);
  $('#trial-image-caption').textContent=selection.image.kind==='gee'
    ? 'Google Earth Engine · '+selection.scene.platform+' · '+number(selection.scene.cloudCover,1)+'% scene cloud · '+number(selection.scene.resolution,0)+' m RGB'
    : selection.scene.platform+' · '+(selection.image.kind==='preview'?'Stored image · not live':'Original satellite source');
  $('#trial-image-status').textContent='Loading the covering image…';const loadedImage=await showSatellite(selection,token,signal);
  if(token!==satelliteToken||signal.aborted)return;
  if(loadedImage?.contextWarning&&!$('#trial-image-caption').textContent.includes(loadedImage.contextWarning))$('#trial-image-caption').textContent+=' · '+loadedImage.contextWarning;
  if(selection.image.kind==='gee'&&Date.parse(selection.image.expiresAt)<=Date.now())throw Error('The Earth Engine image session expired. Reload the selected image.');
  review.ready=true;if(webMission)webMission.imageReady=true;
  if(['gee','archived'].includes(selection.scene?.provider))savedImageSelection={provider:selection.scene.provider,sceneId:selection.scene.id,acquiredAt:selection.scene.acquiredAt,selectionGeometry:structuredClone(selection.geometry)};
  if(selection.image.kind==='gee')satelliteExpiryTimer=setTimeout(()=>revokeSatellite(token,signal,'The Earth Engine image session expired. Reload the selected image.'),Math.max(0,Date.parse(selection.image.expiresAt)-Date.now()));
  syncImageObservationTime(selection.scene.acquiredAt);
  environmentUI?.changed();geospatialUI?.changed();$('#trial-image-status').textContent='Image ready for review';announce('Satellite image ready for review.');
}
async function searchSatellite({autoLoad=false}={}){
  if(!geeHosted||example||!geometry||draw||satelliteBusy||working||surveyId)return;
  const start=$('#trial-image-start').value,end=$('#trial-image-end').value,maxCloud=FIXED_SEARCH_SETTINGS.maxCloud;
  $('#trial-image-cloud').value=maxCloud;
  if(!$('#trial-image-search').reportValidity()||!start||!end||start>end){error('Choose a valid acquisition date range.');return;}
  const preferred=savedImageSelection?.provider==='gee'?structuredClone(savedImageSelection):null;
  stopDraw();resetSurvey();if(preferred)savedImageSelection=preferred;currentStep=2;satelliteBusy=true;lastSatelliteAction='search';lastSurveyArchived=false;
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
    $('#trial-image-status').textContent=satelliteScenes.length?satelliteScenes.length+' covering image'+(satelliteScenes.length===1?'':'s')+' found. Choose one and load it for review.':'No image covers the whole area within these dates and the fixed cloud limit. Widen the dates or change the area.';
    announce(satelliteScenes.length?'Choose a satellite acquisition to review.':'No matching covering satellite image found.');
    const wanted=preferred?satelliteScenes.find(scene=>scene.id===preferred.sceneId):satelliteScenes[0];
    if(preferred&&!wanted){$('#trial-image-status').textContent='The saved acquisition is outside these search results. Adjust the dates or explicitly choose another image.';}
    if(wanted){$('#trial-image-scenes').value=wanted.id;if(autoLoad)automaticSceneId=wanted.id;}
  }catch(e){
    if(token!==satelliteToken)return;satelliteScenes=[];satelliteSearchGeometry=null;
    $('#trial-image-status').textContent='Image search needs another attempt.';error(e.name==='AbortError'?'Earth Engine image search timed out. Retry or narrow the date range.':e.message);
    announce('Satellite image search stopped. Retry the search.');
  }finally{if(token===satelliteToken){clearTimeout(satelliteTimer);satelliteTimer=null;satelliteBusy=false;refreshFlow();}}
  if(automaticSceneId&&token===satelliteToken&&!controller.signal.aborted&&currentStep===2&&$('#trial-image-scenes').value===automaticSceneId&&JSON.stringify(satelliteSearchGeometry)===JSON.stringify(geometry)){
    announce('Loading the selected covering satellite acquisition.');await loadGEEScene();
  }
}
async function loadGEEScene(){
  if(!geeHosted||example||satelliteBusy||working||!geometry)return;
  const id=$('#trial-image-scenes').value,scene=satelliteScenes.find(item=>item.id===id);
  if(!scene||JSON.stringify(satelliteSearchGeometry)!==JSON.stringify(geometry)){error('Search for images covering the current inspection area first.');return;}
  const durableSelection=savedImageSelection?structuredClone(savedImageSelection):null;
  stopDraw();resetSurvey(true);savedImageSelection=durableSelection;currentStep=2;satelliteBusy=true;lastSatelliteAction='load';
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
    announce('Satellite image loading stopped. Reload the selected image.');
  }finally{if(token===satelliteToken){clearTimeout(satelliteTimer);satelliteTimer=null;satelliteBusy=false;refreshFlow();}}
}
async function surveySatellite(archived=false){
  if(geeHosted&&!example&&!archived&&!surveyId)return searchSatellite({autoLoad:true});
  if(!geometry||draw||satelliteBusy||working)return;lastSurveyArchived=archived;stopDraw();error();resetSurvey();currentStep=2;satelliteBusy=true;const token=satelliteToken,controller=new AbortController();satelliteAbort=controller;satelliteTimer=setTimeout(()=>controller.abort(),30000);invalidate();refreshFlow();
  lastSatelliteAction='legacy';
  $('#trial-image-status').textContent=fileMode||archived?'Opening the stored satellite image…':'Searching available satellite imagery…';announce('Satellite survey in progress.');
  try{
    let selection;
    if(example)selection=selectArchivedSatellite(geometry);
    else if(surveyId){const state=await workspaceAPI('state',{signal:controller.signal});selection=selectSavedSatellite({geometry,surveyId,state});}
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
  }catch(e){if(token!==satelliteToken)return;review=null;if(satelliteRaster)map.removeLayer(satelliteRaster);satelliteRaster=null;$('#trial-image-status').textContent='Image review needs another attempt.';error(e.name==='AbortError'?'Satellite survey was cancelled.':e.message);announce('Satellite image review stopped. Retry loading the image.');}
  finally{if(token===satelliteToken){clearTimeout(satelliteTimer);satelliteTimer=null;satelliteBusy=false;refreshFlow();}}
}
async function prepareMission(){
  if(!review?.ready||satelliteBusy||riskUI?.blocked())return;error();satelliteBusy=true;refreshFlow();paintActionButton($('#trial-prepare'),true,'Preparing mission…','Prepare drone mission →');$('#trial-image-status').textContent='Preparing mission…';announce('Preparing mission…');const token=satelliteToken;
  try{
    if(review.image.kind==='gee'&&(JSON.stringify(review.geometry)!==JSON.stringify(geometry)||Date.parse(review.image.expiresAt)<=Date.now()))throw Error('The reviewed Earth Engine image no longer matches a valid session. Reload it before preparing the mission.');
    if(riskUI?.hasAnalysis()){await verifyRiskTargetPixels(riskUI.target());if(token!==satelliteToken||riskUI.blocked())return;}
    if(!example&&webMission&&!surveyId&&!riskUI?.hasAnalysis()){const saved=await webMission.prepare();if(token!==satelliteToken)return;surveyId=saved.surveyId;$('#trial-survey').value=surveyId;$('#trial-source').textContent='Frozen inspection: '+surveyId;$('#trial-back').href='/mission.html?incident='+encodeURIComponent(saved.incidentId)+'&survey='+encodeURIComponent(saved.surveyId);}
    if(token!==satelliteToken)return;if(schedule.getState().mode==='idle')syncScheduleFields(schedule.begin());currentStep=3;environmentUI?.changed();geospatialUI?.changed();refreshFlow();setWorking(false);queueCalculations();announce('Mission prepared. Calculations are running in the background.');
  }catch(e){if(token===satelliteToken){error(e.message);$('#trial-image-status').textContent='Mission preparation needs another attempt.';announce('Mission preparation stopped. Try again.');}}finally{if(token===satelliteToken){satelliteBusy=false;paintActionButton($('#trial-prepare'),false,'','Prepare drone mission →');refreshFlow();}}
}
function openSettings(imports=false){$('#trial-settings-dialog').showModal();if(imports){const detail=$('.trial-source-input');detail.parentElement.open=true;detail.open=true;detail.scrollIntoView({block:'center'});}}
$('#trial-config-open').onclick=()=>openSettings();$('#trial-required-settings').onclick=()=>openSettings();$('#trial-import-open').onclick=()=>openSettings(true);
$('#trial-config-close').onclick=()=>$('#trial-settings-dialog').close();$('#trial-results-open').onclick=()=>$('#trial-results-dialog').showModal();$('#trial-results-close').onclick=()=>$('#trial-results-dialog').close();
$('#trial-survey-action').onclick=()=>surveySatellite();$('#trial-survey-retry').onclick=()=>lastSatelliteAction==='load'?loadGEEScene():surveySatellite(lastSurveyArchived);$('#trial-archive').onclick=()=>surveySatellite(true);$('#trial-prepare').onclick=prepareMission;
const initialImageEnd=new Date(),initialImageStart=new Date(initialImageEnd);initialImageStart.setUTCDate(initialImageStart.getUTCDate()-FIXED_SEARCH_SETTINGS.lookbackDays);
$('#trial-image-start').value=initialImageStart.toISOString().slice(0,10);$('#trial-image-end').value=initialImageEnd.toISOString().slice(0,10);
$('#trial-image-cloud').value=FIXED_SEARCH_SETTINGS.maxCloud;$('#trial-image-cloud').readOnly=true;
$('#trial-image-search').onsubmit=event=>{event.preventDefault();searchSatellite();};$('#trial-image-load').onclick=loadGEEScene;
$('#trial-image-scenes').onchange=()=>{if(satelliteBusy)return;resetSurvey(true);currentStep=2;invalidate();error();$('#trial-image-status').textContent='Load the selected acquisition to review its image.';refreshFlow();};
for(const input of document.querySelectorAll('#trial-image-search input'))input.addEventListener('change',()=>{if(satelliteBusy)return;resetSurvey();currentStep=2;invalidate();error();$('#trial-image-status').textContent='Search again with the updated acquisition filters.';refreshFlow();});
$('#trial-image-cancel').onclick=()=>{resetSurvey(true);currentStep=2;invalidate();error();$('#trial-image-status').textContent='Image request cancelled. Search again or reload an acquisition.';announce('Satellite image request cancelled.');refreshFlow();};
$('#trial-step-1').onclick=()=>setStep(1);$('#trial-step-2').onclick=()=>review?.ready?setStep(2):surveySatellite();$('#trial-step-3').onclick=()=>currentStep===3?null:prepareMission();
$('#trial-change-area').onclick=()=>{setStep(1);error();};$('#trial-back-image').onclick=()=>setStep(2);$('#trial-new').onclick=()=>{if(inspectorUI){inspectorUI.startNew();return;}$('#trial-clear').click();refreshFlow();};
$('#trial-camera-preset').value=XEDO_HARDWARE_PROFILE.cameraPreset;
$('#trial-camera-preset').disabled=true;$('#trial-camera-preset').closest('details').hidden=true;
environmentUI=initializePlanningEnvironmentUI({localFile:runtime.localFile,getMission:()=>({geometry,example,altitudeM:FIXED_PLANNING_SETTINGS.flight.altitudeM,driftEnabled:$('#drift-enabled').checked,drift:read('drift'),export:read('export')}),onChange:()=>{resetReview();invalidate();}});
geospatialUI=initializePlanningGeospatialUI({
 localFile:runtime.localFile,
 getMission:()=>{const f=read('flight'),e=read('export'),target=riskUI?.hasAnalysis()?riskUI.target():geometry;return {geometry:target?structuredClone(target):null,home:Number.isFinite(f.homeLongitude)&&Number.isFinite(f.homeLatitude)?[f.homeLongitude,f.homeLatitude]:null,sceneId:review?.ready&&review.scene?.provider==='gee'?review.scene.id:null,acquiredAt:review?.ready?review.scene?.acquiredAt:null,startAt:e.plannedTakeoffAt,endAt:e.plannedEndAt,routePoints:structuredClone(routePoints),terrainToleranceM:Number($('#trial-terrain-tolerance').value),example};},
 onChange:({reason}={})=>{if(reason==='home-accepted'||reason==='home-revoked'||reason==='home-model'){resetReview();invalidate();}else{reconcileModelHome();update3D();if(result&&currentStep===3){resetReview();invalidate();}}renderReadiness();}
});
if(runtime.localFile)$('#trial-terrain-mode').value='manual';
readinessUI=initializePlanningReadiness({getState:readinessState,onAction:(id,checked)=>{
  if(id!=='airspace-toggle')$('#trial-readiness-dialog').close();
  if(id==='home')chooseHome();
  else if(id==='schedule'){if(schedule.getReadiness().status==='expired')$('#trial-replan').click();else{openSettings();field('export','plannedTakeoffAt').focus();}}
  else if(id==='terrain'){openSettings();$('#trial-export-panel').parentElement.open=true;$('#trial-terrain-mode').focus();}
  else if(id==='checks')$('#trial-results-open').click();
  else if(id==='airspace-toggle'){$(example?'#export-airspace-reviewed':'#export-planning-reviewed').checked=checked;invalidate();announce(checked?'Review recorded. Updating mission checks…':'Review cleared. Updating mission checks…');}
}});
$('#trial-replan').onclick=()=>{if(working||!review?.ready)return;syncScheduleFields(schedule.begin());resetReview();environmentUI?.changed();invalidate();announce('Replanning. Takeoff will be one hour after successful route analysis.');};
const readinessVisibility=()=>{if(!document.hidden)renderReadiness();};
const readinessTimer=setInterval(readinessVisibility,1000);
document.addEventListener('visibilitychange',readinessVisibility);
initializePlanningHelp();statuses();notice();refreshFlow();setWorking(false);
if(fileMode){
  $('#trial-back').hidden=true;
  $('#trial-survey').closest('label').hidden=true;$('#trial-load').hidden=true;$('.trial-source-input summary').textContent='Import a boundary (GeoJSON)';
  $('#trial-live').textContent='Draw an inspection area to begin.';
}
const initial=new URLSearchParams(location.search).get('survey');if(initial&&!fileMode)loadSurvey(initial).catch(e=>error(e.message));

// Hosted account persistence stays separate from the browser calculation API.
const inspectorDefaults=structuredClone(body());
inspectorUI=initializeInspector({localFile:runtime.localFile,
  captureDocument:title=>{
    const inputs=body();delete inputs.surveyId;inputs.geometry=structuredClone(riskUI?.target()||geometry);
    for(const key of ['terrainAssessment','homeElevationEvidence'])delete inputs.export[key];
    inputs.export.homeConfirmed=false;inputs.export.flatSurfaceConfirmed=false;inputs.export.airspaceReviewed=false;inputs.export.planningReviewed=false;
    const scene=review?.scene,image=geometry&&['gee','archived'].includes(scene?.provider)&&scene?.id&&scene?.acquiredAt?{provider:scene.provider,sceneId:scene.id,acquiredAt:scene.acquiredAt,selectionGeometry:structuredClone(geometry)}:structuredClone(savedImageSelection);
    return {schemaVersion:'xedo-inspector-mission/1',title,inputMode:estimatedDemo?'estimated_demo':'mission',searchGeometry:structuredClone(geometry),imageSelection:image,...(riskUI?.capture()||{analysisRef:null,riskDraft:null}),planningInputs:inputs};
  },
  restoreDocument:(doc,data)=>{
    if(doc?.schemaVersion!=='xedo-inspector-mission/1'||!doc.planningInputs)throw Error('This mission cannot be opened. Your current draft is kept.');
    const area=doc.searchGeometry;
    if(area){if(area.type!=='Polygon'||area.coordinates?.length!==1||area.coordinates[0]?.length>121)throw Error('The saved boundary exceeds the planner limits. Your draft is kept.');validateGeometry(area);}
    const inputs=compatibleInputs({...doc.planningInputs,export:{...doc.planningInputs.export},oil:{...doc.planningInputs.oil}});
    riskUI?.validateRestore(doc,data);
    stopDraw();estimatedDemo=doc.inputMode==='estimated_demo';example=estimatedDemo;missionBackup=null;
    if(area)setGeometry(area);else clearGeometry();
    restoreInputs(inputs);savedImageSelection=structuredClone(doc.imageSelection);riskUI?.restore(doc,data);resetReview(true);environmentUI?.changed();geospatialUI?.changed();notice();invalidate();refreshFlow();
    announce(doc.imageSelection?'Saved image: '+doc.imageSelection.acquiredAt+'. Search and reload this acquisition before preparing the mission.':'Saved mission reopened. Reload satellite imagery and review readiness before preparing the mission.');
  },
  clearMission:()=>{stopDraw();estimatedDemo=false;example=false;missionBackup=null;clearGeometry();restoreInputs(structuredClone(inspectorDefaults));resetReview(true);notice();invalidate();refreshFlow();},
  invalidateContext:()=>{resetReview();invalidate();},
  onSaved:(data,options)=>riskUI?.saved(data,options)
});
if(!runtime.localFile)riskUI=initializeRiskEditor({map,inspector:()=>inspectorUI,getContext:()=>({geometry:geometry?structuredClone(geometry):null,imageReady:!!review?.ready,imageGeometry:review?.geometry,imageKey:satelliteToken,working,editing:!!draw,step:currentStep}),useArea:area=>setGeometry(area),onDraft:()=>invalidate(),onTarget:()=>{applyingRiskReceipt=true;try{routePoints=[];resetReview();invalidate();}finally{applyingRiskReceipt=false;}},prepareEdit:()=>{inspectorUI?.interactionStarted();stopDraw();selectHome=false;renderReadiness();},verifyTargetPixels:verifyRiskTargetPixels});

async function verifyRiskTargetPixels(target){
  if(!review?.ready||review.image.kind!=='gee'||Date.parse(review.image.expiresAt)<=Date.now()||!coversGeometry(review.geometry,target))throw Error('Reload a covering Earth Engine image before confirming this inspection area.');
  const key=JSON.stringify([satelliteToken,review.image.url,review.image.expiresAt,target]);if(key===riskPixelKey)return;
  const token=revision,imageToken=satelliteToken,url=review.image.url,grid=satelliteRaster?.getSource()?.getTileGrid?.();if(!grid||!url)throw Error('The reviewed image is unavailable. Reload it.');
  const ring=target.coordinates[0].map(point=>fromLonLat(point)),extent=format.readGeometry(target,{dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).getExtent();
  let z=Math.min(17,Math.max(12,grid.getZForResolution(map.getView().getResolution()))),range=grid.getTileRangeForExtentAndZ(extent,z);
  while((range.maxX-range.minX+1)*(range.maxY-range.minY+1)>64&&z>0){z--;range=grid.getTileRangeForExtentAndZ(extent,z);}
  const signal=AbortSignal.timeout(18000);let visible=false;
  for(let x=range.minX;x<=range.maxX;x++)for(let y=range.minY;y<=range.maxY;y++){
    const response=await fetch(url.replace('{z}',z).replace('{x}',x).replace('{y}',y),{credentials:'same-origin',redirect:'error',signal});
    if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw Error('Inspection image pixels could not be checked. Retry loading the image.');
    const seen=await geeTileHasVisibleData(await response.blob(),ring,grid.getTileCoordExtent([z,x,y]));visible=visible||seen;
    if(token!==revision||imageToken!==satelliteToken)throw Error('The mission changed during image checking. Confirm the current draft again.');
  }
  if(!visible)throw Error('The selected inspection area has no visible pixels in this image. Load another acquisition or adjust the boundary.');
  riskPixelKey=key;
}
