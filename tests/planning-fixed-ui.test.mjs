import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {XEDO_HARDWARE_PROFILE} from '../src/planning-hardware-profile.js';
import {FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings,fixedSettingConflicts} from '../src/planning-fixed-settings.js';
import {fileTrialAPI} from '../src/planning-file-api.js';
import {validateGeometry} from '../src/domain.js';

const client=await readFile(new URL('../src/planning-trial-client.js',import.meta.url),'utf8');
const polygon=()=>({type:'Polygon',coordinates:[[[101.31,12.71],[101.313,12.71],[101.313,12.712],[101.31,12.712],[101.31,12.71]]]});
const plain=value=>JSON.parse(JSON.stringify(value));
function section(from,to){const start=client.indexOf(from),end=client.indexOf(to,start);assert.ok(start>=0&&end>start,'Missing client section: '+from);return client.slice(start,end);}

// Run production form generation, payload, restore and example paths without
// browser/map/network adapters. Hidden controls remain in queries as in the DOM.
function harness(){
  const nodes=[];
  class Element{
    constructor(tag='input'){this.type=tag==='select'?'select-one':'text';this.children=[];this.dataset={};this.hidden=false;this.readOnly=false;this.disabled=false;this.checked=false;this._value='';nodes.push(this);}
    set value(value){this._value=String(value);} get value(){return this._value;}
    append(...items){this.children.push(...items);for(const child of items)child.parentElement=this;}
  }
  const document={
    createElement:tag=>new Element(tag),
    querySelector(selector){assert.ok(selector.startsWith('#'),'Unsupported selector: '+selector);let node=nodes.find(item=>item.id===selector.slice(1));if(!node){node=new Element('div');node.id=selector.slice(1);}return node;},
    querySelectorAll(selector){const named=nodes.filter(node=>node.name);if(selector==='#trial-settings input[name],#trial-settings select[name]')return named;const prefix=selector.match(/^\[name\^="([^"]+)"\]$/)?.[1];assert.ok(prefix,'Unsupported selector: '+selector);return named.filter(item=>item.name.startsWith(prefix));}
  };
  const calls={stopDraw:0,loadSurvey:0,setGeometry:0,invalidate:0,errors:[]};
  const context=vm.createContext({document,calls,structuredClone,Date,JSON,XEDO_HARDWARE_PROFILE,FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings,fixedSettingConflicts,validateGeometry});
  vm.runInContext(`
    const $=selector=>document.querySelector(selector);
    let geometry=${JSON.stringify(polygon())},surveyId=null,revision=0,example=false,draw={active:true};
    const fileMode=true;
    function stopDraw(){calls.stopDraw++;draw=null;}
    async function loadSurvey(){calls.loadSurvey++;return true;}
    function resetSurvey(){}
    function invalidate(){calls.invalidate++;}
    function setGeometry(value){validateGeometry(value);calls.setGeometry++;geometry=structuredClone(value);resetReview();}
    function updateHardwareProfileState(){}
    function notice(){}
    function drawMap(){}
    function fit(){}
    function error(message=''){calls.errors.push(message);}
    function announce(){}
    function state(){return {geometry,surveyId,draw,example};}
    ${section('const fields={','let geometry=null')}
    ${section('function resetReview(','function api(')}
    ${section('function compatibleInputs(','function changed(')}
    ${section("$('#trial-example').onclick=","window.addEventListener('pagehide'")}
  `,context);
  return {context,document,calls,input:(group,key)=>document.querySelector('#f-'+group+'-'+key),node:id=>document.querySelector('#'+id),body:()=>plain(context.body()),state:()=>plain(context.state()),restore:input=>context.restoreInputs(input),async snapshot(input){const text=JSON.stringify(input),target={files:[{size:text.length,text:async()=>text}],value:'selected.json'};await document.querySelector('#trial-restore').onchange({target});return target;}};
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
