import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {XEDO_HARDWARE_PROFILE} from '../src/planning-hardware-profile.js';
import {FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings,fixedSettingConflicts} from '../src/planning-fixed-settings.js';
import {fileTrialAPI} from '../src/planning-file-api.js';
import {validateGeometry} from '../src/domain.js';
import {ESTIMATED_DEMO_PROFILE,createEstimatedDemoInputs} from '../src/planning-estimated-demo.js';
import {createPlanningSchedule} from '../src/planning-schedule.js';
import {createPlanningExportDefaults} from '../src/planning-export-defaults.js';
import {createActionFeedback} from '../src/action-feedback.js';

const client=await readFile(new URL('../src/planning-trial-client.js',import.meta.url),'utf8');
const polygon=()=>({type:'Polygon',coordinates:[[[101.31,12.71],[101.313,12.71],[101.313,12.712],[101.31,12.712],[101.31,12.71]]]});
const plain=value=>JSON.parse(JSON.stringify(value));
function section(from,to){const start=client.indexOf(from),end=client.indexOf(to,start);assert.ok(start>=0&&end>start,'Missing client section: '+from);return client.slice(start,end);}

// Run production form generation, payload, restore and example paths without
// browser/map/network adapters. Hidden controls remain in queries as in the DOM.
function harness(){
  const nodes=[];
  const explicitControls=new Set(['trial-camera-preset','drift-enabled','export-home-confirmed','export-flat-confirmed','export-airspace-reviewed','export-nogo','oil-emulsion','trial-environment-mode','trial-environment-site','trial-terrain-mode','trial-terrain-tolerance']);
  class Element{
    constructor(tag='input'){this.tagName=tag.toUpperCase();this.type=tag==='select'?'select-one':'text';this.children=[];this.dataset={};this.attributes={};this.textContent='';this.hidden=false;this.readOnly=false;this.disabled=false;this.checked=false;this._value='';nodes.push(this);}
    set value(value){this._value=String(value);} get value(){return this._value;}
    append(...items){this.children.push(...items);for(const child of items)child.parentElement=this;}
    setAttribute(name,value){this.attributes[name]=String(value);}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];}
  }
  const document={
    createElement:tag=>new Element(tag),
    getElementById:id=>nodes.find(item=>item.id===id)??null,
    querySelector(selector){assert.ok(selector.startsWith('#'),'Unsupported selector: '+selector);let node=nodes.find(item=>item.id===selector.slice(1));if(!node){node=new Element('div');node.id=selector.slice(1);}return node;},
    querySelectorAll(selector){const named=nodes.filter(node=>node.name);if(selector==='#trial-settings input[name],#trial-settings select[name]')return named;if(selector==='#trial-settings input[id],#trial-settings select[id],#trial-settings textarea[id]')return nodes.filter(node=>node.id&&(node.name||explicitControls.has(node.id)));const prefix=selector.match(/^\[name\^="([^"]+)"\]$/)?.[1];assert.ok(prefix,'Unsupported selector: '+selector);return named.filter(item=>item.name.startsWith(prefix));}
  };
  for(const id of explicitControls)document.querySelector('#'+id);
  document.querySelector('#trial-terrain-mode').value='manual';
  document.querySelector('#trial-terrain-tolerance').value='2';
  document.querySelector('#trial-back').setAttribute('href','/mission.html');
  const calls={stopDraw:0,loadSurvey:0,setGeometry:0,invalidate:0,errors:[],downloads:[]};
  // Browser modules share a realm; JSON-boundary cloning gives the imported pure
  // helper the same plain-record semantics while VM form functions remain real.
  function scheduleFactory(options){
    const helper=createPlanningSchedule(options);
    return {...helper,restore:(metadata,fields)=>helper.restore(metadata==null?metadata:plain(metadata),fields==null?fields:plain(fields)),setManual:fields=>helper.setManual(plain(fields))};
  }
  const context=vm.createContext({document,calls,structuredClone,Date,JSON,downloadFeedback:createActionFeedback(),createPlanningSchedule:scheduleFactory,createPlanningExportDefaults,XEDO_HARDWARE_PROFILE,FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings,fixedSettingConflicts,validateGeometry,ESTIMATED_DEMO_PROFILE,createEstimatedDemoInputs});
  vm.runInContext(`
    const $=selector=>document.querySelector(selector);
    let geometry=${JSON.stringify(polygon())},surveyId=null,revision=0,example=false,draw={active:true},selectHome=false,result=null,working=false,currentStep=3,review={ready:true};
    const fileMode=true,runtime={label:'Local trial',localFile:true},geeHosted=false,basemap=null;
    let savedImageSelection=null;
    const number=(value,places=2)=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:places}):'Unknown';
    function stopDraw(){calls.stopDraw++;draw=null;}
    async function loadSurvey(){calls.loadSurvey++;return true;}
    function resetSurvey(){}
    function invalidate(){calls.invalidate++;}
    function drawMap(){}
    function fit(){}
    function refreshFlow(){}
    function error(message=''){calls.errors.push(message);}
    function announce(){}
    function download(text,filename,mime){calls.downloads.push({text,filename,mime});}
    function state(){return {geometry,surveyId,draw,example,estimatedDemo,hasMissionBackup:missionBackup!==null,schedule:schedule.getPatch(),routePoints};}
    function setResult(value){result=value;draw=null;}
    function setGeospatial(value){geospatialUI=value;}
    function setEnvironment(value){environmentUI=value;}
    ${section('const fields={','let geometry=null')}
    ${section('function field(','function updateHardwareProfileState()')}
    ${section('function updateHardwareProfileState()','function resetReview(')}
    ${section('function resetReview(','function api(')}
    ${section('function setGeometry(','async function loadSurvey(')}
    const originalSetGeometry=setGeometry;setGeometry=(...args)=>{calls.setGeometry++;return originalSetGeometry(...args);};
    ${section("$('#trial-snapshot').onclick=",'function compatibleInputs(')}
    ${section('function compatibleInputs(','function changed(')}
    ${section("$('#trial-example').onclick=","window.addEventListener('pagehide'")}
  `,context);
  return {context,document,calls,schedule:vm.runInContext('schedule',context),input:(group,key)=>document.querySelector('#f-'+group+'-'+key),node:id=>document.querySelector('#'+id),body:()=>plain(context.body()),state:()=>plain(context.state()),restore:input=>context.restoreInputs(input),saveSnapshot(result){context.setResult(result);document.querySelector('#trial-snapshot').onclick();return calls.downloads.at(-1);},async snapshot(input){const text=JSON.stringify(input),target=Object.assign(new Element('input'),{files:[{size:text.length,text:async()=>text}],value:'selected.json'});await document.querySelector('#trial-restore').onchange({target});return target;}};
}
function assertConstants(input){for(const [group,settings]of Object.entries(FIXED_PLANNING_SETTINGS))for(const [key,expected]of Object.entries(settings))assert.equal(input[group][key],expected,group+'.'+key);}

test('Real form hides and locks fixed values while measured inputs start editable and unknown',()=>{
  const ui=harness();
  for(const [group,settings]of Object.entries(FIXED_PLANNING_SETTINGS))for(const key of Object.keys(settings)){if(key==='limitReference')continue;const input=ui.input(group,key);assert.equal(input.readOnly,true,group+'.'+key);assert.equal(input.parentElement.hidden,true,group+'.'+key);}
  assert.equal(ui.input('flight','sideOverlap').value,'70');assert.equal(ui.input('flight','frontOverlap').value,'80');
  for(const [group,key]of [['flight','usableWh'],['flight','windEastMps'],['flight','homeLongitude'],['export','firmware'],['oil','areaM2'],['drift','currentEastMps']]){const input=ui.input(group,key);assert.equal(input.value,'');assert.equal(input.readOnly,false);assert.equal(input.parentElement.hidden,false);}
  assertConstants(ui.body());
});

test('Real read/body includes hidden constants, converts overlap once and keeps dynamic null, zero and false',()=>{
  const ui=harness();assert.equal(ui.context.read('flight').sideOverlap,70);
  for(const key of ['homeLongitude','homeLatitude','windEastMps','reserveWh'])ui.input('flight',key).value='0';
  ui.input('flight','altitudeM').value='99';ui.input('flight','sideOverlap').value='5';
  const input=ui.body();assertConstants(input);assert.deepEqual(input.flight.home,[0,0]);assert.equal(input.flight.windEastMps,0);assert.equal(input.flight.reserveWh,0);assert.equal(input.flight.usableWh,null);assert.equal(input.driftEnabled,false);assert.equal(input.oil.emulsion,false);
  for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed'])assert.equal(input.export[key],false);
  assert.equal(input.export.noGo,null);assert.equal(Object.hasOwn(input.oil,'gsdYM'),false);assert.equal(Object.hasOwn(input.oil,'oilFraction'),false);assert.deepEqual(input.geometry,polygon());
});

test('A demo visit and saved restore retain automatic validity ownership and manual source edits',()=>{
 const ui=harness(),start='2026-11-01T01:00:00Z',end='2026-11-01T02:00:00Z';
 ui.restore({export:{plannedTakeoffAt:start,plannedEndAt:end,source:'Inspector field notes'}});
 assert.equal(ui.body().export.validUntil,'2026-11-01T02:00:00.000Z');
 const original=ui.body();
 ui.node('trial-example').onclick();ui.node('trial-demo-exit').onclick();
 assert.equal(ui.body().export.planningDefaults.fields.validUntil.mode,'automatic');
 assert.equal(ui.body().export.source,'Inspector field notes');
 const later={plannedTakeoffAt:'2026-11-01T03:00:00Z',plannedEndAt:'2026-11-01T04:00:00Z'};
 ui.schedule.setManual(later);ui.context.syncScheduleFields(ui.schedule.getPatch());
 assert.equal(ui.body().export.validUntil,'2026-11-01T04:00:00.000Z');
 const restored=harness();restored.restore(original);restored.schedule.setManual(later);restored.context.syncScheduleFields(restored.schedule.getPatch());
 assert.equal(restored.body().export.validUntil,'2026-11-01T04:00:00.000Z');
 assert.equal(restored.body().export.source,'Inspector field notes');
});

test('Real restore adopts missing constants, retains mission zeros, and is stable for matching snapshots',()=>{
  const ui=harness();ui.restore({flight:{home:[0,0],reserveWh:0,windNorthMps:0},oil:{areaM2:0},export:{homeAmslM:0},driftEnabled:false});
  const input=ui.body();assertConstants(input);assert.equal(ui.input('flight','sideOverlap').value,'70');assert.equal(ui.input('flight','frontOverlap').value,'80');assert.equal(ui.node('trial-camera-preset').value,XEDO_HARDWARE_PROFILE.cameraPreset);assert.deepEqual(input.flight.home,[0,0]);assert.equal(input.flight.reserveWh,0);assert.equal(input.flight.windNorthMps,0);assert.equal(input.flight.usableWh,null);assert.equal(input.oil.areaM2,0);assert.equal(input.export.homeAmslM,0);
  ui.restore(input);assert.deepEqual(ui.body(),input);
});

test('Real restore rejects changed or null constants before changing form values',()=>{
  const ui=harness();ui.input('flight','homeLongitude').value='101.31';const before=ui.body();
  for(const value of [100,null]){const conflict=structuredClone(before);conflict.flight.altitudeM=value;conflict.flight.home=[1,2];assert.throws(()=>ui.restore(conflict),/different fixed settings/);assert.deepEqual(ui.body(),before);}
});

test('Snapshot conflict atomically preserves polygon, drawing, reviews and inputs',async()=>{
  const ui=harness();for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])ui.node(id).checked=true;ui.input('flight','usableWh').value='42';
  const before=ui.body(),stateBefore=ui.state(),input=structuredClone(before);input.flight.altitudeM=100;input.geometry=null;
  const target=await ui.snapshot({schema_version:'xedo-planning-trial/1',inputs:input});
  assert.deepEqual(ui.body(),before);assert.deepEqual(ui.state(),stateBefore);for(const key of ['stopDraw','loadSurvey','setGeometry','invalidate'])assert.equal(ui.calls[key],0);assert.match(ui.calls.errors.at(-1),/different fixed settings/);assert.equal(target.value,'');
});

test('Compatible snapshot restores dynamic data and requires a fresh manual review',async()=>{
  const ui=harness(),input={geometry:polygon(),driftEnabled:false,flight:{home:[101.31,12.71],usableWh:90},export:{homeConfirmed:true,flatSurfaceConfirmed:true,airspaceReviewed:true}};
  await ui.snapshot({schema_version:'xedo-planning-trial/1',inputs:input});const restored=ui.body();assertConstants(restored);assert.deepEqual(restored.geometry,input.geometry);assert.equal(restored.flight.usableWh,90);assert.equal(ui.calls.stopDraw,1);assert.equal(ui.calls.setGeometry,1);assert.equal(ui.state().draw,null);for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed'])assert.equal(restored.export[key],false);
});

test('Real example uses fixed profile and local calculators without auto-confirming export',async()=>{
  const ui=harness();for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])ui.node(id).checked=true;ui.node('trial-example').onclick();
  const input=ui.body();assertConstants(input);assert.equal(ui.state().example,true);assert.equal(input.flight.sensorWidthMm,3.68);assert.equal(input.flight.imageWidthPx,3280);for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed'])assert.equal(input.export[key],false);
  const result=await fileTrialAPI('',{method:'POST',body:JSON.stringify(input)});assert.equal(result.flight.plan.status,'generated');assert.ok(result.flight.plan.waypoints.length>1);assert.equal(result.flight.camera.state,'pass');assert.equal(result.flight.wind.state,'pass');assert.equal(result.flight.battery.state,'pass');assert.ok(result.oil.capsulesLowKg>0);assert.equal(result.exportCheck.pass,false);assert.equal(result.hardwareControl,false);assert.equal(result.releaseControl,false);assert.deepEqual(result.inputs.geometry,input.geometry);
});

test('Estimated demo loads the approved eight assumptions and visibly retains a way back to mission inputs',()=>{
  const ui=harness();ui.node('trial-example').onclick();const input=ui.body();
  for(const [key,value]of Object.entries(ESTIMATED_DEMO_PROFILE.flight))assert.equal(input.flight[key],value,key);
  assert.deepEqual(input.geometry,createEstimatedDemoInputs().geometry);assert.equal(input.export.firmware,'PX4');assert.equal(input.flight.windEastMps,0);assert.equal(input.flight.windNorthMps,0);
  assert.equal(ui.state().estimatedDemo,true);assert.equal(ui.state().example,true);assert.equal(ui.state().hasMissionBackup,true);
  assert.match(ui.node('trial-notice').textContent,/Estimated demo.*Assumed inputs/);assert.equal(ui.node('trial-example').getAttribute('aria-pressed'),'true');
  assert.equal(ui.node('trial-demo-exit').hidden,false);assert.equal(ui.node('trial-demo-information').hidden,false);assert.equal(ui.node('trial-load').disabled,true);
  assertConstants(input);
});

test('Leaving demo restores raw mission values, geometry, source and manual environment choice while clearing export confirmations',()=>{
  const ui=harness();
  ui.input('flight','usableWh').value='42.5000';ui.input('flight','powerW').value='';ui.input('flight','windEastMps').value='3.140';ui.input('flight','homeLongitude').value='101.3100000';ui.input('flight','homeLatitude').value='12.7100000';
  ui.node('export-nogo').value='{"unfinished":';ui.node('trial-environment-mode').value='manual';ui.node('trial-environment-site').value='channel';ui.node('trial-source').textContent='Original inspected boundary';ui.node('trial-back').setAttribute('href','/mission.html?incident=INC_original');
  for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])ui.node(id).checked=true;
  const originalGeometry=ui.state().geometry;
  ui.node('trial-example').onclick();ui.input('flight','usableWh').value='150';ui.node('trial-demo-exit').onclick();
  assert.equal(ui.input('flight','usableWh').value,'42.5000');assert.equal(ui.input('flight','powerW').value,'');assert.equal(ui.input('flight','windEastMps').value,'3.140');
  assert.equal(ui.input('flight','homeLongitude').value,'101.3100000');assert.equal(ui.input('flight','homeLatitude').value,'12.7100000');assert.equal(ui.node('export-nogo').value,'{"unfinished":');
  assert.equal(ui.node('trial-environment-mode').value,'manual');assert.equal(ui.node('trial-environment-site').value,'channel');assert.equal(ui.node('trial-source').textContent,'Original inspected boundary');assert.equal(ui.node('trial-back').getAttribute('href'),'/mission.html?incident=INC_original');
  assert.deepEqual(ui.state().geometry,originalGeometry);assert.equal(ui.state().estimatedDemo,false);assert.equal(ui.state().example,false);assert.equal(ui.state().hasMissionBackup,false);
  for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])assert.equal(ui.node(id).checked,false,id);
  assert.equal(ui.node('trial-example').getAttribute('aria-pressed'),'false');assert.equal(ui.node('trial-demo-exit').hidden,true);assert.equal(ui.node('trial-load').disabled,false);
});

test('Repeated demo loading preserves the first mission backup rather than restoring a modified demo as real inputs',()=>{
  const ui=harness();ui.input('flight','usableWh').value='73.250';ui.input('flight','windLimitMps').value='4.5';const original=ui.state().geometry;
  ui.node('trial-example').onclick();ui.input('flight','usableWh').value='999';ui.node('trial-example').onclick();assert.equal(ui.body().flight.usableWh,177.6);
  ui.node('trial-demo-exit').onclick();assert.equal(ui.input('flight','usableWh').value,'73.250');assert.equal(ui.input('flight','windLimitMps').value,'4.5');assert.deepEqual(ui.state().geometry,original);
  ui.node('trial-demo-exit').onclick();assert.equal(ui.input('flight','usableWh').value,'73.250');
});

test('Drawing a new boundary or clearing it inside demo keeps assumed inputs visibly in demo mode',()=>{
  const ui=harness(),original=ui.state().geometry;ui.node('trial-example').onclick();
  const changed=polygon();changed.coordinates[0]=changed.coordinates[0].map(([lon,lat])=>[lon+.02,lat+.01]);ui.context.setGeometry(changed);
  assert.deepEqual(ui.state().geometry,changed);assert.equal(ui.state().estimatedDemo,true);assert.equal(ui.state().example,true);assert.match(ui.node('trial-notice').textContent,/Estimated demo/);
  ui.context.clearGeometry();assert.equal(ui.state().geometry,null);assert.equal(ui.state().estimatedDemo,true);assert.equal(ui.state().example,true);assert.equal(ui.body().flight.powerW,600);assert.equal(ui.node('trial-demo-exit').hidden,false);
  ui.node('trial-demo-exit').onclick();assert.deepEqual(ui.state().geometry,original);assert.equal(ui.state().example,false);assert.equal(ui.body().flight.powerW,null);
});

test('Estimated demo snapshots carry assumptions and round-trip without auto-confirming or overwriting the original mission backup',async()=>{
  const ui=harness();ui.node('trial-example').onclick();const result=await fileTrialAPI('',{method:'POST',body:JSON.stringify(ui.body())}),download=ui.saveSnapshot(result),saved=JSON.parse(download.text);
  assert.match(download.filename,/^XEDO-estimated-demo-.*\.json$/);assert.equal(saved.exampleData,true);assert.equal(saved.demoProfile.id,ESTIMATED_DEMO_PROFILE.id);assert.deepEqual(saved.demoProfile.flight,ESTIMATED_DEMO_PROFILE.flight);
  const target=harness();target.input('flight','usableWh').value='61.700';const original=target.state().geometry;
  for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed'])saved.inputs.export[key]=true;
  await target.snapshot(saved);assert.equal(target.state().estimatedDemo,true);assert.equal(target.state().example,true);assert.deepEqual(target.body().geometry,saved.inputs.geometry);
  for(const [key,value]of Object.entries(ESTIMATED_DEMO_PROFILE.flight))assert.equal(target.body().flight[key],value,key);
  for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed'])assert.equal(target.body().export[key],false,key);
  target.input('flight','usableWh').value='1';await target.snapshot(saved);target.node('trial-demo-exit').onclick();assert.equal(target.input('flight','usableWh').value,'61.700');assert.deepEqual(target.state().geometry,original);
});

test('Legacy example snapshots retain their own assumptions without adopting the new preset and can return to mission inputs',async()=>{
  const ui=harness();ui.input('flight','usableWh').value='88.80';const input=createEstimatedDemoInputs();input.flight.usableWh=100;input.flight.reserveWh=20;input.flight.powerW=180;
  await ui.snapshot({schema_version:'xedo-planning-trial/1',exampleData:true,inputs:input});
  assert.equal(ui.state().example,true);assert.equal(ui.state().estimatedDemo,false);assert.equal(ui.body().flight.usableWh,100);assert.equal(ui.body().flight.powerW,180);assert.match(ui.node('trial-notice').textContent,/Test data/);
  ui.node('trial-demo-exit').onclick();assert.equal(ui.input('flight','usableWh').value,'88.80');assert.equal(ui.body().flight.powerW,null);
});

test('Restoring an ordinary mission snapshot from demo removes assumed values and drops demo metadata on subsequent downloads',async()=>{
  const ui=harness();ui.input('flight','usableWh').value='33';ui.node('trial-example').onclick();
  const input={geometry:polygon(),driftEnabled:false,flight:{home:[101.31,12.71],usableWh:90},export:{homeConfirmed:true,flatSurfaceConfirmed:true,airspaceReviewed:true}};
  await ui.snapshot({schema_version:'xedo-planning-trial/1',inputs:input});const restored=ui.body();
  assert.equal(ui.state().example,false);assert.equal(ui.state().estimatedDemo,false);assert.equal(ui.state().hasMissionBackup,false);assert.equal(restored.flight.usableWh,90);
  for(const key of Object.keys(ESTIMATED_DEMO_PROFILE.flight).filter(key=>key!=='usableWh'))assert.equal(restored.flight[key],null,key);
  assert.equal(restored.export.firmware,null);assert.equal(restored.flight.windEastMps,null);assert.equal(restored.flight.windNorthMps,null);
  const result=await fileTrialAPI('',{method:'POST',body:JSON.stringify(restored)}),download=ui.saveSnapshot(result),saved=JSON.parse(download.text);
  assert.match(download.filename,/^XEDO-planning-trial-.*\.json$/);assert.equal(saved.exampleData,false);assert.equal(Object.hasOwn(saved,'demoProfile'),false);assert.equal(saved.inputs.flight.powerW,null);
  ui.node('trial-demo-exit').onclick();assert.equal(ui.body().flight.usableWh,90);
});

test('Downloaded mission snapshots preserve automatic schedule anchor and restore it with fresh review checks',async()=>{
  const ui=harness();
  const first=ui.schedule.begin();ui.context.syncScheduleFields(first);
  const completed=ui.schedule.complete({plan:{status:'generated',estimates:{durationS:1250}},battery:{totalDurationS:1800,sorties:[{},{}]}});
  ui.context.syncScheduleFields(completed);
  const input=ui.body();
  assert.deepEqual(input.export.schedule,completed.schedule);
  assert.equal(input.export.plannedTakeoffAt,completed.plannedTakeoffAt);
  assert.equal(input.export.plannedEndAt,completed.plannedEndAt);
  const result=await fileTrialAPI('',{method:'POST',body:JSON.stringify(input)});
  const saved=JSON.parse(ui.saveSnapshot(result).text);
  assert.deepEqual(saved.inputs.export.schedule,completed.schedule);
  const target=harness();await target.snapshot(saved);
  assert.deepEqual(target.state().schedule,completed);
  assert.equal(target.body().export.plannedTakeoffAt,completed.plannedTakeoffAt);
  assert.equal(target.body().export.plannedEndAt,completed.plannedEndAt);
  assert.equal(target.node('trial-terrain-mode').value,'manual');
  for(const key of ['homeConfirmed','flatSurfaceConfirmed','airspaceReviewed'])assert.equal(target.body().export[key],false,key);
});

test('A demo visit restores raw mission times, schedule metadata and terrain choices together',()=>{
  const ui=harness();
  ui.input('export','plannedTakeoffAt').value='2026-11-01T17:02:00.000';
  ui.input('export','plannedEndAt').value='2026-11-01T18:07:00.000';
  ui.schedule.setManual(ui.context.read('export'));
  ui.node('trial-terrain-mode').value='manual';ui.node('trial-terrain-tolerance').value='3.500';
  const original=ui.state().schedule;
  ui.node('trial-example').onclick();
  assert.equal(ui.state().schedule.schedule.mode,'idle');
  ui.input('export','plannedTakeoffAt').value='2026-11-02T10:00';
  ui.node('trial-terrain-mode').value='automatic';ui.node('trial-terrain-tolerance').value='99';
  ui.node('trial-demo-exit').onclick();
  assert.equal(ui.input('export','plannedTakeoffAt').value,'2026-11-01T17:02:00.000');
  assert.equal(ui.input('export','plannedEndAt').value,'2026-11-01T18:07:00.000');
  assert.deepEqual(ui.state().schedule,original);
  assert.equal(ui.node('trial-terrain-mode').value,'manual');
  assert.equal(ui.node('trial-terrain-tolerance').value,'3.500');
});

test('Invalid schedule snapshot is rejected before changing drawing, reviews, polygon, metadata or raw fields',async()=>{
  const ui=harness();
  ui.schedule.begin();ui.context.syncScheduleFields(ui.schedule.complete({plan:{status:'generated',estimates:{durationS:900}}}));
  for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])ui.node(id).checked=true;
  ui.input('flight','usableWh').value='42.5000';ui.node('trial-terrain-tolerance').value='3.500';
  const before=ui.body(),stateBefore=ui.state(),invalid=structuredClone(before);
  invalid.geometry=null;invalid.flight.usableWh=999;invalid.export.terrainMode='automatic';
  invalid.export.schedule.analysedAt=new Date(Date.parse(invalid.export.schedule.analysedAt)+1000).toISOString();
  const target=await ui.snapshot({schema_version:'xedo-planning-trial/1',inputs:invalid});
  assert.deepEqual(ui.body(),before);assert.deepEqual(ui.state(),stateBefore);
  assert.equal(ui.input('flight','usableWh').value,'42.5000');assert.equal(ui.node('trial-terrain-tolerance').value,'3.500');
  for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])assert.equal(ui.node(id).checked,true);
  for(const key of ['stopDraw','loadSurvey','setGeometry','invalidate'])assert.equal(ui.calls[key],0,key);
  assert.match(ui.calls.errors.at(-1),/timestamps do not match the saved analysis/);
  assert.equal(target.value,'');
});

test('Demo can consume explicit GEE terrain evidence while manual mode retains its own height reference',()=>{
  const ui=harness();ui.node('trial-example').onclick();
  const assessment={mode:'gee_model',state:'ready',label:'GEE model samples ready',coverage:{known:6,total:6},reasons:[]};
  const patch={flight:{geospatialEvidence:{mode:'gee_context',source:'Google Earth Engine'}},export:{homeAmslM:1.25,homeElevationEvidence:{mode:'gee_model',valueM:1.25}}};
  ui.context.setGeospatial({getPatch:()=>patch,getTerrainAssessment:()=>assessment});
  ui.node('trial-terrain-mode').value='automatic';
  const automatic=ui.body();
  assert.equal(automatic.export.homeAmslM,1.25);assert.deepEqual(automatic.export.terrainAssessment,assessment);
  assert.equal(automatic.export.flatSurfaceConfirmed,true);assert.equal(automatic.export.homeElevationEvidence.mode,'gee_model');
  assert.equal(automatic.flight.geospatialEvidence.source,'Google Earth Engine');
  assert.equal(automatic.flight.windEastMps,0);assert.equal(automatic.flight.windNorthMps,0);
  assert.equal(automatic.drift.currentEastMps,createEstimatedDemoInputs().drift.currentEastMps);
  ui.node('trial-terrain-mode').value='manual';ui.input('export','homeAmslM').value='7.5';
  const manual=ui.body();assert.equal(manual.export.homeAmslM,7.5);assert.equal(manual.export.flatSurfaceConfirmed,false);
  assert.equal(Object.hasOwn(manual.export,'homeElevationEvidence'),false);assert.equal(Object.hasOwn(manual.export,'terrainAssessment'),false);
});
