import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createPlanningSchedule} from '../src/planning-schedule.js';
import {planningRouteSamples} from '../src/planning-route-samples.js';
import {createEstimatedDemoInputs} from '../src/planning-estimated-demo.js';
import {FIXED_PLANNING_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings} from '../src/planning-fixed-settings.js';
import {fileTrialAPI} from '../src/planning-file-api.js';
import {setViewProperty} from '../src/planning-view.js';
import {createActionFeedback,paintActionButton} from '../src/action-feedback.js';

const client = await readFile(new URL('../src/planning-trial-client.js', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function production(from, to) {
  const start = client.indexOf(from), end = client.indexOf(to, start);
  assert.ok(start >= 0 && end > start, 'Production section must resolve: ' + from);
  return client.slice(start, end);
}

// The handlers, form reader, readiness and invalidation below are production
// code. Only DOM, mapping, rendering and network boundaries are replaced.
function harness() {
  const nodes = [], events = new Map(), calls = {invalidate:0, geo:0, revoke:0, environment:0, queued:0, requests:[], notices:[], downloads:[]};
  let now = Date.now(), ownedHome = false, heldExport = null;
  class Element {
    constructor(tag = 'input') { this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this._value='';this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';nodes.push(this); }
    get value() { return this._value; }
    set value(value) {
      const text=String(value);
      // Native datetime-local controls drop redundant fractional zeros and
      // optional zero seconds. The controller must compare instants, not text.
      this._value=this.type==='datetime-local'
        ? text.replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1').replace(/(T\d{2}:\d{2}):00$/,'$1')
        : text;
    }
    append(...items) { this.children.push(...items);items.forEach(item=>{item.parentElement=this;}); }
    setAttribute(name,value) { this.attributes[name]=String(value); }
    getAttribute(name) { return this.attributes[name]??null; }
    close() { this.open=false; }
    focus(options) { this.focused=true;this.focusCalls=(this.focusCalls||0)+1;this.focusOptions=options; }
    scrollIntoView(options) { this.scrollCalls=(this.scrollCalls||0)+1;this.scrollOptions=options; }
    click() { if (!this.disabled) return this.onclick?.(); }
  }
  const document = {
    createElement:tag=>new Element(tag),
    querySelector(selector) {
      assert.ok(selector.startsWith('#'), 'Unsupported selector: '+selector);
      let node=nodes.find(item=>item.id===selector.slice(1));
      if(!node){node=new Element('div');node.id=selector.slice(1);}
      return node;
    },
    querySelectorAll(selector) {
      const prefix=selector.match(/^\[name\^="([^"]+)"\]$/)?.[1];
      assert.ok(prefix,'Unsupported selector: '+selector);
      return nodes.filter(item=>item.name?.startsWith(prefix));
    },
  };
  const schedule=createPlanningSchedule({now:()=>now});
  let assessment={state:'unknown',label:'GEE samples unavailable',reasons:['No samples']},evidence=null;
  const geospatialUI={
    changed(){calls.geo++;},
    getTerrainAssessment(){return structuredClone(assessment);},
    getPatch(){return {flight:{},export:{homeElevationEvidence:evidence&&structuredClone(evidence)}};},
    useModelHomeEstimate(){return false;},
    revokeHomeEstimate(){calls.revoke++;if(ownedHome){document.querySelector('#f-export-homeAmslM').value='';ownedHome=false;}evidence=null;},
  };
  const input=createEstimatedDemoInputs();
  const context=vm.createContext({
    document, calls, schedule:{...schedule,setManual:fields=>schedule.setManual(plain(fields))}, geospatialUI, AbortController, structuredClone, Date, JSON,
    FIXED_PLANNING_SETTINGS,isFixedPlanningField,applyFixedPlanningSettings,planningRouteSamples,setViewProperty,paintActionButton,downloadFeedback:createActionFeedback(),
    geometry:input.geometry,surveyId:null,result:null,working:false,revision:0,abort:null,
    draw:null,selectHome:false,routePoints:[],currentStep:3,review:{ready:true},calculationTimer:null,example:false,
    readinessUI:null,mode:'2d',
    $:selector=>document.querySelector(selector),
    number:(value,places=2)=>Number.isFinite(value)?value.toFixed(places):'Unknown',
    map:{on:(name,handler)=>events.set(name,handler)},toLonLat:value=>value,
    environmentUI:{changed(){calls.environment++;},getPatch(){return null;},async ensureFresh(){return true;}},
    inspectorUI:null,
    setTimeout:()=>1,clearTimeout(){},
    queueCalculations(){calls.queued++;},
    drawMap(){},update3D(){},statuses(){},fit(){},refreshFlow(){},updateHardwareProfileState(){},
    stopDraw(){context.draw=null;},
    error(message=''){calls.error=message;},
    announce(message){calls.notices.push(message);},
    setWorking(value){context.working=value;},
    async api(path,options){calls.requests.push(JSON.parse(options.body));if(path==='/export'&&heldExport)return heldExport;return fileTrialAPI(path,options);},
    download(text,filename,mime){calls.downloads.push({text,filename,mime});},
    render(){context.working=false;context.renderReadiness();},
  });
  vm.runInContext(production('const fields={','let environmentUI=null')+
    production('function invalidate()','function field(')+
    production('function field(','function updateHardwareProfileState()')+
    production('function resetReview(','function api(')+
    production("$('#trial-run').onclick=",'function download(')+
    production("$('#trial-qgc').onclick=","$('#trial-snapshot').onclick=")+
    production('function changed(event)',"$('#trial-settings').addEventListener")+
    production('function chooseHome()',"$('#trial-clear').onclick=")+
    production("$('#trial-replan').onclick=",'const readinessTimer='),context);
  const node=id=>document.querySelector('#'+id), field=(group,key)=>node('f-'+group+'-'+key);
  for(const item of nodes.filter(item=>item.name)) {
    const [group,key]=item.name.split('.');let value=input[group]?.[key];
    if(group==='flight'&&key==='homeLongitude')value=input.flight.home[0];
    if(group==='flight'&&key==='homeLatitude')value=input.flight.home[1];
    if(group==='flight'&&['sideOverlap','frontOverlap'].includes(key))value*=100;
    if(item.type==='datetime-local'&&typeof value==='string')value=value.replace(/Z$/,'');
    if(value!=null)item.value=value;
  }
  node('trial-terrain-mode').value='manual';node('trial-terrain-tolerance').value='2';
  node('export-nogo').value=JSON.stringify({type:'FeatureCollection',features:[]});
  node('trial-2d').onclick=()=>{context.mode='2d';};
  function confirm(){for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])node(id).checked=true;}
  function begin(){context.syncScheduleFields(schedule.begin());}
  return {
    context,calls,schedule,node,field,confirm,begin,
    setNow(value){now=value;},now:()=>now,
    clickMap(position){events.get('singleclick')({coordinate:position});},
    async calculate(){await node('trial-run').onclick();assert.equal(calls.error,'',calls.error);},
    readiness(){return plain(context.readinessState());},
    setTerrain(value,homeEvidence=null){assessment=value;evidence=homeEvidence;},
    ownModelHome(value){ownedHome=true;evidence={mode:'gee_model'};field('export','homeAmslM').value=value;},
    holdExport(){let resolve;heldExport=new Promise(yes=>{resolve=yes;});return data=>resolve(data);},
  };
}

test('Visible map picker selects launch/return, clears old reviews and model-owned height, and resets route samples', () => {
  const h=harness();h.confirm();h.ownModelHome('3.4');h.context.routePoints=[[101,12]];
  h.node('trial-home-pick').onclick();
  assert.equal(h.context.selectHome,true);
  h.clickMap([101.345678912,12.654321098]);
  assert.equal(h.field('flight','homeLongitude').value,'101.3456789');
  assert.equal(h.field('flight','homeLatitude').value,'12.6543211');
  assert.equal(h.context.selectHome,false);
  assert.equal(h.node('export-home-confirmed').checked,true);
  assert.equal(h.node('export-airspace-reviewed').checked,false);
  assert.equal(h.node('export-flat-confirmed').checked,false);
  assert.equal(h.field('export','homeAmslM').value,'');
  assert.deepEqual(plain(h.context.routePoints),[]);
  assert.equal(h.calls.revoke,1);
  assert.match(h.calls.notices.at(-1),/both transit legs/);
  assert.equal(h.node('trial-qgc').disabled,true);
});

test('Moving and clearing launch point work independently of the polygon and disable old downloads', async () => {
  const h=harness(),geometry=plain(h.context.geometry);h.begin();await h.calculate();h.confirm();
  h.context.result.exportCheck.pass=true;h.context.renderReadiness();
  assert.equal(h.node('trial-qgc').disabled,false);
  h.node('trial-home').onclick();h.clickMap([101.23,12.64]);
  assert.deepEqual(plain(h.context.geometry),geometry);
  assert.equal(h.context.result,null);
  assert.equal(h.node('trial-qgc').disabled,true);
  h.confirm();h.context.routePoints=[[101.23,12.64]];
  h.node('trial-home-clear').onclick();
  assert.equal(h.field('flight','homeLongitude').value,'');
  assert.equal(h.field('flight','homeLatitude').value,'');
  assert.equal(h.node('export-home-confirmed').checked,false);
  assert.equal(h.node('export-airspace-reviewed').checked,false);
  assert.equal(h.node('export-flat-confirmed').checked,false);
  assert.deepEqual(plain(h.context.routePoints),[]);
  assert.equal(h.context.result,null);
  assert.equal(h.node('trial-qgc').disabled,true);
  assert.equal(h.readiness().rows[0].state,'waiting');
});

test('Point selection can be cancelled and map clicks while idle or calculating do not move Home', () => {
  const h=harness(),before=h.field('flight','homeLongitude').value;
  h.clickMap([100,13]);assert.equal(h.field('flight','homeLongitude').value,before);
  h.node('trial-home-pick').onclick();h.node('trial-home-pick').onclick();
  assert.equal(h.context.selectHome,false);h.clickMap([100,13]);
  assert.equal(h.field('flight','homeLongitude').value,before);
  h.node('trial-home-pick').onclick();assert.equal(h.node('trial-home-cancel').hidden,false);
  h.node('trial-home-cancel').onclick();assert.equal(h.context.selectHome,false);
  assert.equal(h.node('trial-home-cancel').hidden,true);h.clickMap([100,13]);
  assert.equal(h.field('flight','homeLongitude').value,before);
  h.context.working=true;h.node('trial-home-pick').onclick();h.node('trial-home-clear').onclick();
  h.context.selectHome=true;h.clickMap([100,13]);
  assert.equal(h.field('flight','homeLongitude').value,before);
  assert.equal(h.calls.revoke,0);
});

test('Launch selection brings the map into view and focuses it without refocusing on cancellation',()=>{
  const h=harness(),map=h.node('trial-map');
  h.node('trial-home-pick').onclick();
  assert.equal(h.context.selectHome,true);assert.equal(map.focused,true);
  assert.equal(map.focusCalls,1);assert.equal(map.scrollCalls,1);
  assert.deepEqual(plain(map.scrollOptions),{block:'center'});
  assert.deepEqual(plain(map.focusOptions),{preventScroll:true});
  h.node('trial-home-pick').onclick();assert.equal(h.context.selectHome,false);
  assert.equal(map.focusCalls,1);assert.equal(map.scrollCalls,1);
});

test('Moving a ready launch point blocks download immediately and cancellation restores the unchanged reviewed mission',async t=>{
  for(const cancelId of ['trial-home-cancel','trial-home-pick'])await t.test(cancelId,async()=>{
    const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
    h.context.renderReadiness();assert.equal(h.readiness().canExport,true);assert.equal(h.node('trial-qgc').disabled,false);
    const originalResult=h.context.result,originalGeometry=plain(h.context.geometry),originalHome=h.context.body().flight.home;
    const originalSamples=plain(h.context.routePoints),originalRevision=h.context.revision,requestCount=h.calls.requests.length;
    h.node('trial-home-pick').onclick();
    assert.equal(h.context.selectHome,true);assert.equal(h.readiness().canExport,false);
    assert.equal(h.node('trial-qgc').disabled,true,'The previous valid file must not remain downloadable during an unfinished move.');
    assert.equal(h.readiness().rows[0].state,'review');assert.match(h.readiness().rows[0].detail,/finish or cancel/i);
    assert.equal(h.readiness().rows[0].actionLabel,'Cancel selection');
    await h.node('trial-qgc').onclick();
    assert.equal(h.calls.requests.length,requestCount,'Pending selection must block even a direct export handler invocation.');
    assert.deepEqual(h.calls.downloads,[]);
    h.node(cancelId).onclick();
    assert.equal(h.context.selectHome,false);assert.equal(h.readiness().canExport,true);
    assert.equal(h.node('trial-qgc').disabled,false);assert.equal(h.readiness().rows[0].actionLabel,'Move point');
    assert.equal(h.context.result,originalResult);assert.deepEqual(plain(h.context.geometry),originalGeometry);
    assert.deepEqual(h.context.body().flight.home,originalHome);assert.deepEqual(plain(h.context.routePoints),originalSamples);
    assert.equal(h.context.revision,originalRevision,'Cancelling an uncommitted move must retain the existing calculation.');
    for(const id of ['export-home-confirmed','export-flat-confirmed','export-airspace-reviewed'])assert.equal(h.node(id).checked,true);
  });
});

test('Invalid or emptied schedule fields revoke an earlier ready mission instead of retaining stale export readiness',async t=>{
  for(const key of ['plannedTakeoffAt','plannedEndAt'])for(const value of ['10000-01-01T12:00','999999-01-01T12:00','']){
    await t.test(key+' = '+(value||'(empty)'),async()=>{
      const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
      h.context.renderReadiness();assert.equal(h.node('trial-qgc').disabled,false);
      const input=h.field('export',key);input.value=value;
      assert.doesNotThrow(()=>h.context.changed({target:input}));
      assert.equal(h.context.read('export')[key],null);
      assert.equal(h.context.result,null);assert.equal(h.node('export-airspace-reviewed').checked,false);
      assert.equal(h.node('export-flat-confirmed').checked,false);assert.equal(h.node('trial-qgc').disabled,true);
      assert.equal(h.schedule.getState().mode,'manual');assert.equal(h.schedule.getPatch()[key],null);
      assert.equal(h.readiness().canExport,false);assert.equal(h.readiness().rows[1].state,'blocked');
      assert.equal(h.context.body().export[key],null,'An earlier accepted timestamp must not leak back into the request.');
    });
  }
});

test('A valid manual schedule edit keeps its timestamp while revoking the old calculation and route reviews',async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();
  const expected=new Date(h.now()+90*60000).toISOString(),input=h.field('export','plannedTakeoffAt');
  input.value=expected.replace(/Z$/,'');h.context.changed({target:input});
  assert.equal(h.schedule.getState().mode,'manual');assert.equal(h.schedule.getPatch().plannedTakeoffAt,expected);
  assert.equal(h.context.result,null);assert.equal(h.node('export-airspace-reviewed').checked,false);
  assert.equal(h.node('export-flat-confirmed').checked,false);assert.equal(h.node('export-home-confirmed').checked,true);
  assert.equal(h.node('trial-qgc').disabled,true);assert.equal(h.calls.error,'');
});

test('Actual route analysis anchors once, includes Home transits, and unchanged refreshes converge', async () => {
  const h=harness();h.begin();const provisional=h.schedule.getPatch().plannedTakeoffAt;
  h.setNow(h.now()+4000);await h.calculate();
  assert.equal(h.context.result.flight.plan.status,'generated');
  const anchor=h.schedule.getState().analysedAt,takeoff=h.schedule.getPatch().plannedTakeoffAt;
  assert.equal(Date.parse(takeoff)-Date.parse(anchor),3600000);
  assert.notEqual(takeoff,provisional);
  const home=h.calls.requests[0].flight.home;
  assert.ok(h.context.result.flight.battery.sorties.length>0,'Demo energy profile must produce assessed sorties');
  for(const sortie of h.context.result.flight.battery.sorties){assert.deepEqual(plain(sortie.waypoints[0].position),home);assert.deepEqual(plain(sortie.waypoints.at(-1).position),home);}
  assert.ok(h.context.routePoints.length>1);
  const geo=h.calls.geo,queued=h.calls.queued;
  h.setNow(h.now()+60000);await h.calculate();
  assert.equal(h.schedule.getState().analysedAt,anchor);
  assert.equal(h.schedule.getPatch().plannedTakeoffAt,takeoff);
  assert.equal(h.calls.geo,geo,'Same route and schedule must not trigger another GEE lookup');
  assert.equal(h.calls.queued,queued,'Same route and schedule must not queue endless calculation');
  assert.equal(h.calls.requests[1].export.plannedTakeoffAt,takeoff);
});

test('Browser-normalized datetime fields do not report a changed schedule for the same instant', () => {
  const h=harness();
  const patch={plannedTakeoffAt:'2026-10-25T12:00:00.000Z',plannedEndAt:'2026-10-25T12:25:00.000Z'};
  assert.equal(h.context.syncScheduleFields(patch),true);
  assert.equal(h.field('export','plannedTakeoffAt').value,'2026-10-25T12:00');
  assert.equal(h.field('export','plannedEndAt').value,'2026-10-25T12:25');
  assert.equal(h.context.syncScheduleFields(patch),false,'Native datetime string normalization must not queue an endless update');
  assert.equal(h.context.syncScheduleFields({...patch,plannedEndAt:'2026-10-25T12:26:00.000Z'}),true);
  assert.equal(h.context.syncScheduleFields({...patch,plannedEndAt:'2026-10-25T12:26:00.000Z'}),false);
  const fractional={...patch,plannedTakeoffAt:'2026-10-25T12:00:07.120Z'};
  assert.equal(h.context.syncScheduleFields(fractional),true);
  assert.equal(h.field('export','plannedTakeoffAt').value,'2026-10-25T12:00:07.12');
  assert.equal(h.context.syncScheduleFields(fractional),false,'Fractional normalization preserves the scheduled instant too');
});

test('Explicit Replan reanchors after the next successful analysis and clears airspace/surface reviews', async () => {
  const h=harness();h.begin();await h.calculate();h.confirm();
  const old=h.schedule.getPatch().plannedTakeoffAt;
  h.setNow(h.now()+300000);h.node('trial-replan').onclick();
  assert.equal(h.schedule.getState().pending,true);
  assert.equal(h.node('export-airspace-reviewed').checked,false);
  assert.equal(h.node('export-flat-confirmed').checked,false);
  assert.equal(h.node('trial-qgc').disabled,true);
  h.setNow(h.now()+2000);await h.calculate();
  assert.equal(Date.parse(h.schedule.getPatch().plannedTakeoffAt),h.now()+3600000);
  assert.notEqual(h.schedule.getPatch().plannedTakeoffAt,old);
});

test('First route under a manually chosen schedule still requires fresh route and surface reviews', async () => {
  const h=harness();
  h.context.syncScheduleFields(h.schedule.setManual({plannedTakeoffAt:new Date(h.now()+3600000).toISOString(),plannedEndAt:new Date(h.now()+7200000).toISOString()}));
  h.confirm();await h.calculate();
  assert.equal(h.schedule.getState().mode,'manual');
  assert.equal(h.node('export-home-confirmed').checked,true);
  assert.equal(h.node('export-airspace-reviewed').checked,false);
  assert.equal(h.node('export-flat-confirmed').checked,false);
  assert.equal(h.node('trial-qgc').disabled,true);
});

test('Automatic terrain stays blocked without matching GEE Home provenance; manual mode requires explicit review', async () => {
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  h.node('trial-terrain-mode').value='automatic';
  assert.equal(h.readiness().canExport,false);
  assert.equal(h.readiness().rows[2].state,'unknown');
  h.setTerrain({state:'ready',label:'Model samples within tolerance'});
  assert.equal(h.readiness().rows[2].state,'review','Ready model without using its Home estimate is insufficient');
  h.setTerrain({state:'ready',label:'Model samples within tolerance'},{mode:'gee_model'});
  assert.equal(h.readiness().canExport,true);
  h.node('trial-terrain-mode').value='manual';h.node('export-flat-confirmed').checked=false;
  assert.equal(h.readiness().canExport,false);
  assert.equal(h.readiness().rows[2].state,'review');
  h.node('export-flat-confirmed').checked=true;
  assert.equal(h.readiness().canExport,true);
});

test('Expired schedule disables download even when an earlier export assessment passed', async () => {
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  h.context.renderReadiness();assert.equal(h.node('trial-qgc').disabled,false);
  h.setNow(Date.parse(h.schedule.getPatch().plannedTakeoffAt));
  const status=h.readiness();
  assert.equal(status.canExport,false);
  assert.equal(status.rows[1].state,'blocked');
  assert.equal(status.rows[1].actionLabel,'Replan');
  assert.match(status.blockingReasons.join(' '),/passed/);
  h.context.renderReadiness();
  assert.equal(h.node('trial-qgc').disabled,true);
  assert.equal(h.context.result.exportCheck.pass,true,'Expired timing is checked again beyond the stored engine result');
});

test('Export response arriving after schedule expiry cannot download a stale mission', async () => {
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  h.context.renderReadiness();assert.equal(h.node('trial-qgc').disabled,false);
  const resolve=h.holdExport(),pending=h.node('trial-qgc').onclick();
  for(let i=0;i<10&&h.calls.requests.length<2;i++)await Promise.resolve();
  assert.equal(h.calls.requests.length,2,'Export must be waiting at the response boundary');
  assert.equal(h.context.working,true);
  h.setNow(Date.parse(h.schedule.getPatch().plannedTakeoffAt));
  resolve({text:'mission content',filename:'trial.plan',mime:'application/json'});await pending;
  assert.deepEqual(h.calls.downloads,[]);
  assert.match(h.calls.error,/readiness changed.*replan/i);
  assert.equal(h.context.result,null);
  assert.equal(h.node('trial-qgc').disabled,true);
  assert.equal(h.context.working,false);
});

test('A response for a still-ready mission downloads normally after the same asynchronous check', async () => {
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  const resolve=h.holdExport(),pending=h.node('trial-qgc').onclick();
  for(let i=0;i<10&&h.calls.requests.length<2;i++)await Promise.resolve();
  assert.equal(h.calls.requests.length,2);
  h.setNow(h.now()+1000);
  resolve({text:'mission content',filename:'trial.plan',mime:'application/json'});await pending;
  assert.deepEqual(h.calls.downloads,[{text:'mission content',filename:'trial.plan',mime:'application/json'}]);
  assert.equal(h.calls.error,'');
  assert.equal(h.context.working,false);
  assert.notEqual(h.context.result,null);
});

test('Account change during the first asynchronous export check prevents the export request', async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  let key='account-a',release;h.context.inspectorUI={contextKey:()=>key,changed(){},ensureSession:()=>new Promise(resolve=>{release=resolve;})};
  const pending=h.node('trial-qgc').onclick();key='signed-out';release(true);await pending;
  assert.equal(h.calls.requests.length,1);assert.deepEqual(h.calls.downloads,[]);
});

test('Account change after the export response was requested prevents a late download', async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  let key='account-a';h.context.inspectorUI={contextKey:()=>key,changed(){},async ensureSession(){return true;}};
  const resolve=h.holdExport(),pending=h.node('trial-qgc').onclick();
  for(let i=0;i<20&&h.calls.requests.length<2;i++)await Promise.resolve();
  assert.equal(h.calls.requests.length,2);key='account-b';resolve({text:'private plan',filename:'trial.plan',mime:'application/json'});await pending;
  assert.deepEqual(h.calls.downloads,[]);
});

test('A session that expires while the export is being prepared cannot download the response',async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  let checks=0;h.context.inspectorUI={contextKey:()=> 'same-tab',changed(){},async ensureSession(){return ++checks===1;}};
  const resolve=h.holdExport(),pending=h.node('trial-qgc').onclick();
  for(let i=0;i<20&&h.calls.requests.length<2;i++)await Promise.resolve();
  resolve({text:'expired plan',filename:'trial.plan',mime:'application/json'});await pending;
  assert.equal(checks,2);assert.deepEqual(h.calls.downloads,[]);
});

test('Download feedback covers preflight and ten repeated calls cannot duplicate an export',async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;
  let checks=0,release;h.context.inspectorUI={contextKey:()=> 'same',changed(){},ensureSession(){checks++;return checks===1?new Promise(resolve=>{release=resolve;}):Promise.resolve(true);}};
  const pending=h.node('trial-qgc').onclick();assert.match(h.node('trial-download-status').textContent,/Checking account/);assert.equal(h.node('trial-qgc').dataset.actionBusy,'true');
  for(let i=0;i<10;i++)await h.node('trial-qgc').onclick();assert.equal(checks,1);assert.equal(h.calls.requests.length,1);
  release(true);await pending;assert.equal(h.calls.downloads.length,1);assert.equal(h.node('trial-qgc').dataset.actionBusy,'false');assert.equal(h.node('trial-download-status').textContent,'Mission file ready. Download started.');
});

test('A changed conditions preflight ends pending without creating or downloading a file',async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;h.context.environmentUI.ensureFresh=async()=>false;
  await h.node('trial-qgc').onclick();assert.equal(h.calls.requests.length,1);assert.equal(h.calls.downloads.length,0);assert.equal(h.context.working,false);assert.equal(h.node('trial-qgc').dataset.actionBusy,'false');assert.match(h.node('trial-download-status').textContent,/Conditions updated/);
});

test('A completed demo download retains its demo label and filename',async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;h.context.example=true;await h.node('trial-qgc').onclick();assert.equal(h.calls.downloads.length,1);assert.match(h.calls.downloads[0].filename,/^XEDO-estimated-demo-/);assert.equal(h.node('trial-qgc').textContent,'Download demo mission file');assert.equal(h.node('trial-qgc').dataset.actionBusy,'false');
});

test('Editing the mission clears an earlier completed download message and immediately blocks its old file',async()=>{
  const h=harness();h.begin();await h.calculate();h.confirm();h.context.result.exportCheck.pass=true;await h.node('trial-qgc').onclick();assert.equal(h.node('trial-download-status').hidden,false);h.node('export-airspace-reviewed').checked=false;h.context.changed({target:h.node('export-airspace-reviewed')});assert.equal(h.node('trial-download-status').hidden,true);assert.equal(h.node('trial-download-status').textContent,'');assert.equal(h.node('trial-qgc').disabled,true);assert.equal(h.context.result,null);
});

test('Native checkbox input/change pair performs one invalidation while number input stays immediate',()=>{
  const h=harness(),control=h.node('export-airspace-reviewed'),semanticChanged=vm.runInContext('semanticChanged',h.context);control.type='checkbox';semanticChanged({type:'input',target:control});assert.equal(h.calls.geo,0);semanticChanged({type:'change',target:control});assert.equal(h.calls.geo,1);semanticChanged({type:'change',target:h.field('flight','speedMps')});assert.equal(h.calls.geo,1);semanticChanged({type:'input',target:h.field('flight','speedMps')});assert.equal(h.calls.geo,2);
});

test('Readiness checkbox retains its dialog and applies the review while navigation actions still close it',()=>{
  const h=harness();let onAction;h.context.initializePlanningReadiness=options=>{onAction=options.onAction;return {render(){}};};h.context.node=h.node;
  vm.runInContext(production('readinessUI=initializePlanningReadiness(',"$('#trial-replan').onclick="),h.context);
  h.node('trial-readiness-dialog').open=true;onAction('airspace-toggle',true);assert.equal(h.node('trial-readiness-dialog').open,true);assert.equal(h.node('export-airspace-reviewed').checked,true);assert.equal(h.context.result,null);assert.match(h.calls.notices.at(-1),/Airspace review recorded/);
  onAction('home');assert.equal(h.node('trial-readiness-dialog').open,false);
});

test('Back-forward cache preserves live controllers and resumes the preview, while a full unload disposes them',()=>{
  const events=new Map(),calls=[];const service=name=>({dispose:()=>calls.push(name+' dispose'),destroy:()=>calls.push(name+' destroy'),setActive:active=>calls.push(name+' '+active),changed:()=>calls.push(name+' changed')});
  const context=vm.createContext({window:{addEventListener:(name,fn)=>events.set(name,fn)},renderer:service('renderer'),groundController:service('ground'),geospatialUI:service('geo'),environmentUI:service('environment'),readinessUI:service('readiness'),revision:0,abort:null,satelliteAbort:null,calculationTimer:1,satelliteTimer:2,satelliteExpiryTimer:3,readinessTimer:4,readinessVisibility(){},clearTimeout(){},clearInterval(){calls.push('clear interval');},document:{removeEventListener(){calls.push('remove visibility');}},setWorking(){calls.push('idle');},refreshFlow(){calls.push('refresh');},map:{updateSize(){calls.push('map resize');}},mode:'3d',update3D(){calls.push('3d resume');},renderReadiness(){calls.push('readiness render');}});
  vm.runInContext(production("window.addEventListener('pagehide',event=>{if(event.persisted){renderer", "window.addEventListener('keydown'"),context);
  events.get('pagehide')({persisted:true});assert.deepEqual(calls,['renderer false']);events.get('pageshow')({persisted:true});assert(calls.includes('3d resume'));assert(!calls.some(x=>x.includes('dispose')));events.get('pagehide')({persisted:false});assert(calls.includes('renderer destroy'));assert(calls.includes('ground dispose'));assert(calls.includes('clear interval'));assert(calls.includes('remove visibility'));assert.equal(context.revision,1);
});
