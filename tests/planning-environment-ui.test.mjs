import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {initializePlanningEnvironmentUI} from '../src/planning-environment-ui.js';
import {validatePlanningEnvironmentRequest} from '../src/planning-environment.js';

const HOUR=3600000, EPOCH=Date.parse('2026-10-24T00:00:00Z');
const iso=at=>new Date(at).toISOString();
const polygon=()=>({type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.61],[101.2,12.61],[101.2,12.6]]]});
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
const previousEvents={add:globalThis.addEventListener,remove:globalThis.removeEventListener};
const events=new EventTarget();
globalThis.addEventListener=events.addEventListener.bind(events);
globalThis.removeEventListener=events.removeEventListener.bind(events);
after(()=>{if(previousEvents.add)globalThis.addEventListener=previousEvents.add;else delete globalThis.addEventListener;if(previousEvents.remove)globalThis.removeEventListener=previousEvents.remove;else delete globalThis.removeEventListener;});

function reportFor(payload,now=EPOCH){
  const request=validatePlanningEnvironmentRequest(payload,{now}),series={};
  for(const kind of ['wind10m','flightWind','currentSurface']){
    const current=kind==='currentSurface',height=current?0:kind==='wind10m'?10:request.altitudeM;
    const speed=current ? .2 : kind==='wind10m' ? 2 : 3,samples=[];
    for(const point of request.points)for(let at=Math.floor(Date.parse(request.startAt)/HOUR)*HOUR;at<=Math.ceil(Date.parse(request.endAt)/HOUR)*HOUR;at+=HOUR){
      samples.push({pointId:point.id,at:iso(at),eastMps:speed,northMps:0,speedMps:speed,directionDeg:current?90:270,sourceHeightM:height,gridLongitude:point.longitude,gridLatitude:point.latitude,gridDistanceM:0,gridAccepted:true,gustMps:current?null:4,gustSourceHeightM:current?null:10,heightMethod:current?'surface_model':kind==='wind10m'?'model_10m':'linear_10m_80m_estimate',sourceHeightsM:current?[0]:kind==='wind10m'?[10]:[10,80],estimated:kind==='flightWind'});
    }
    series[kind]={status:'complete',valueKind:'numerical_model_estimate',source:'Fixture model',sourceUrl:'https://example.invalid/model',model:current?'meteofrance_currents':'gfs_global',modelRunAt:iso(now-6*HOUR),modelAvailableAt:iso(now-5*HOUR),dataEndAt:iso(now+7*24*HOUR),modelRunScope:'latest_available_provider_run',historicalReconstruction:false,freshness:{state:'fresh',checkedAt:iso(now),maxAgeMs:current?48*HOUR:24*HOUR,propagationGraceMs:600000},resolutionM:current?9000:13000,gustReferenceHeightM:current?null:10,coverage:current?'regional_estimate':'model_grid',directionConvention:current?'TO':'FROM',includesTides:current,includesStokes:current,samples,warnings:[]};
  }
  return {schema_version:'xedo-planning-environment/1',state:'complete',fetchedAt:iso(now),expiresAt:iso(now+600000),request,series,warnings:[],hardwareControl:false,releaseControl:false};
}
function harness({example=false,localFile=false,mode='automatic',driftEnabled=false,observedAt=null,driftEndAt=null,transform=data=>data,held=false}={}){
  const nodes=new Map(),rootEvents=new EventTarget(),calls=[],changes=[];
  class Element{
    constructor(id){this.id=id;this.value='';this.innerHTML='';this.textContent='';this.dataset={};this.hidden=false;this.readOnly=false;this.disabled=false;this.children=[];this.events=new Map();this.label={hidden:false,node:this};}
    closest(selector){assert.equal(selector,'label');return this.label;}
    append(child){this.children.push(child);}
    addEventListener(type,fn){this.events.set(type,fn);}
    async dispatch(type='change'){return this.events.get(type)?.({target:this});}
    showModal(){this.open=true;}
    scrollIntoView(){this.scrolled=true;}
  }
  const node=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
  const root={hidden:false,querySelector(selector){assert.ok(selector.startsWith('#'));return node(selector.slice(1));},addEventListener:rootEvents.addEventListener.bind(rootEvents),removeEventListener:rootEvents.removeEventListener.bind(rootEvents)};
  node('trial-environment-mode').value=mode;node('trial-environment-site').value='regional';
  node('f-export-plannedTakeoffAt').value='2026-10-24T01:00';node('f-export-plannedEndAt').value='2026-10-24T02:00';
  const mission={geometry:polygon(),example,altitudeM:50,driftEnabled,drift:{observedAt,endAt:driftEndAt},export:{}};
  let time=EPOCH;
  const getMission=()=>({...mission,export:{plannedTakeoffAt:iso(Date.parse(node('f-export-plannedTakeoffAt').value+'Z')),plannedEndAt:iso(Date.parse(node('f-export-plannedEndAt').value+'Z'))}});
  const fetchImpl=(url,init)=>{
    assert.equal(url,'/api/v1/environment');assert.equal(init.method,'POST');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
    const payload=JSON.parse(init.body),data=transform(reportFor(payload,time));
    let resolve,reject;const pending=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const reply={ok:true,headers:{get:name=>name.toLowerCase()==='content-type'?'application/json':null},json:async()=>data};
    calls.push({payload,signal:init.signal,resolve:()=>resolve(reply),reject,data});
    return held?pending:Promise.resolve(reply);
  };
  const ui=initializePlanningEnvironmentUI({root,localFile,getMission,onChange:()=>changes.push('invalidated'),fetchImpl,now:()=>time});
  return {ui,node,root,mission,calls,changes,now:()=>time,setTime:at=>{time=at;},refresh:()=>node('trial-environment-refresh').onclick(),async mode(value){node('trial-environment-mode').value=value;await node('trial-environment-mode').dispatch();},async site(value){node('trial-environment-site').value=value;await node('trial-environment-site').dispatch();},async hidden(value){root.hidden=value;rootEvents.dispatchEvent(new Event('visibilitychange'));await flush();}};
}

// These are real UI and aggregation paths. DOM stubs implement only the native
// input, label, event, and text surfaces used by the production module.
test('Mission window fetches conditions without moving or inventing drift observation times',async()=>{
  const h=harness();try{
    await h.refresh();const patch=h.ui.getPatch();
    assert.equal(h.calls.length,1);assert.equal(h.calls[0].payload.startAt,'2026-10-24T01:00:00.000Z');
    assert.equal(h.mission.drift.observedAt,null);assert.equal(h.mission.drift.endAt,null);
    assert.equal(patch.flight.environment.ready,true);
    assert.equal(patch.flight.windEastMps,3);
    assert.match(h.node('trial-environment-summary').innerHTML,/10 m wind<\/dt><dd>2\.00 m\/s/);
    assert.match(h.node('trial-environment-summary').innerHTML,/Surface current<\/dt><dd>0\.20 m\/s/);
  }finally{h.ui.dispose();}
});

test('Matching observed-to-end coverage fills drift while keeping flight time separate',async()=>{
  const h=harness({driftEnabled:true,observedAt:'2026-10-24T00:00:00Z',driftEndAt:'2026-10-24T02:00:00Z'});try{
    await h.refresh();const patch=h.ui.getPatch();
    assert.equal(h.calls[0].payload.startAt,'2026-10-24T00:00:00Z');
    assert.equal(patch.flight.environment.ready,true);assert.equal(patch.drift.environment.ready,true);
    assert.equal(patch.drift.currentEastMps,.2);assert.equal(patch.drift.windSpeedMps,2);
    assert.equal(patch.flight.environment.startAt,'2026-10-24T01:00:00.000Z');
    assert.equal(patch.drift.environment.startAt,'2026-10-24T00:00:00Z');
  }finally{h.ui.dispose();}
});

test('Missing marine coverage blocks drift but retains fresh flight input and provenance',async()=>{
  const h=harness({driftEnabled:true,observedAt:'2026-10-24T00:00:00Z',driftEndAt:'2026-10-24T02:00:00Z',transform:data=>{
    data.state='partial';const series=data.series.currentSurface;series.status='unavailable';series.warnings.push('Provider marine coverage is masked.');series.samples.forEach(sample=>{sample.eastMps=null;sample.northMps=null;sample.speedMps=null;});return data;
  }});try{
    await h.refresh();const patch=h.ui.getPatch();
    assert.equal(patch.flight.environment.ready,true);
    assert.equal(patch.flight.windEastMps,3);
    assert.equal(patch.drift.environment.ready,false);assert.equal(patch.drift.currentEastMps,null);
    assert.match(h.node('trial-environment-summary').innerHTML,/10 m wind<\/dt><dd>2\.00 m\/s/);
    const evidence=patch.flight.environment;
    assert.equal(evidence.mode,'automatic');assert.equal(evidence.sources.flightWind.model,'gfs_global');
    assert.equal(evidence.sources.currentSurface.includesTides,true);assert.equal(evidence.sources.currentSurface.includesStokes,true);
    assert.match(h.node('trial-environment-details-body').innerHTML,/currentSurface: Provider marine coverage is masked/);
    assert.equal(evidence.sources.flightWind.resolutionM,13000);assert.equal(evidence.sources.flightWind.freshness,'fresh');
    assert.deepEqual(evidence.geometry,h.mission.geometry);assert.equal(evidence.fetchedAt,iso(EPOCH));
  }finally{h.ui.dispose();}
});

test('Channel choice explicitly blocks regional drift without discarding flight conditions',async()=>{
  const h=harness({driftEnabled:true,observedAt:'2026-10-24T00:00:00Z',driftEndAt:'2026-10-24T02:00:00Z'});try{
    await h.refresh();await h.site('channel');const patch=h.ui.getPatch();
    assert.equal(patch.flight.environment.ready,true);assert.equal(patch.drift.environment.ready,false);
    assert.equal(h.node('trial-environment-badge').textContent,'Wind ready · Local current unknown');
    assert.equal(patch.drift.currentEastMps,null);assert.match(h.node('trial-environment-details-body').innerHTML,/regional current grid is unsuitable/);
  }finally{h.ui.dispose();}
});

test('Automatic to manual clears auto fields while retaining unrelated mission settings',async()=>{
  const h=harness({driftEnabled:true,observedAt:'2026-10-24T00:00:00Z',driftEndAt:'2026-10-24T02:00:00Z'});try{
    h.node('f-flight-usableWh').value='42';h.node('f-flight-homeLongitude').value='101.2';
    await h.refresh();assert.equal(h.node('f-flight-windEastMps').value,'3');await h.mode('manual');
    assert.equal(h.node('f-flight-windEastMps').value,'');assert.equal(h.node('f-drift-currentEastMps').value,'');
    assert.equal(h.node('f-flight-usableWh').value,'42');assert.equal(h.node('f-flight-homeLongitude').value,'101.2');
    h.node('f-flight-windEastMps').value='7';h.ui.changed();assert.equal(h.node('f-flight-windEastMps').value,'7');
    assert.equal(h.ui.getPatch(),null);assert.equal(h.node('f-flight-windEastMps').readOnly,false);
    assert.equal(h.node('f-flight-windEastMps').label.hidden,false);
    assert.equal(await h.ui.ensureFresh(),true);
  }finally{h.ui.dispose();}
});

test('Manual or demo values never become automatic evidence without a new lookup',async()=>{
  const h=harness({mode:'manual'});try{
    h.node('f-flight-windEastMps').value='7';h.node('f-drift-currentEastMps').value='.9';h.ui.changed();
    assert.equal(h.calls.length,0);assert.equal(h.ui.getPatch(),null);
    h.mission.example=true;h.ui.changed();assert.equal(h.ui.getPatch(),null);assert.equal(h.calls.length,0);
    assert.equal(h.node('f-flight-windEastMps').value,'7');
    h.mission.example=false;await h.mode('automatic');
    const pending=h.ui.getPatch();assert.equal(pending.flight.environment.ready,false);assert.equal(pending.flight.windEastMps,null);
    await h.refresh();assert.equal(h.ui.getPatch().flight.windEastMps,3);
  }finally{h.ui.dispose();}
});

test('Expired sources clear auto values and revoke export before a fresh review',async()=>{
  const h=harness();try{
    await h.refresh();const before=h.changes.length;h.setTime(EPOCH+600001);
    assert.equal(h.ui.getState().status,'stale');assert.equal(h.node('f-flight-windEastMps').value,'');
    const patch=h.ui.getPatch();assert.equal(patch.flight.environment.ready,false);assert.equal(patch.flight.windEastMps,null);
    assert.ok(h.changes.length>before);assert.equal(await h.ui.ensureFresh(),false);
    assert.equal(h.ui.getPatch().flight.environment.ready,true);
  }finally{h.ui.dispose();}
});

test('Snapshot form values do not bypass the automatic evidence lookup',async()=>{
  const h=harness();try{
    h.node('f-flight-windEastMps').value='99';h.node('f-flight-windNorthMps').value='99';
    h.node('f-drift-currentEastMps').value='99';h.ui.changed();
    let patch=h.ui.getPatch();assert.equal(patch.flight.windEastMps,null);assert.equal(patch.flight.environment.ready,false);assert.equal(patch.drift.currentEastMps,null);
    await h.refresh();patch=h.ui.getPatch();assert.equal(patch.flight.windEastMps,3);assert.equal(h.node('f-flight-windEastMps').value,'3');
  }finally{h.ui.dispose();}
});

test('Export refresh after mission change returns false for calculation and confirmation review',async()=>{
  const h=harness();try{
    await h.refresh();h.mission.geometry=polygon();h.mission.geometry.coordinates[0].forEach(point=>{point[0]+=.001;});h.ui.changed();
    assert.equal(h.ui.getPatch().flight.environment.ready,false);assert.equal(await h.ui.ensureFresh(),false);
    assert.equal(h.ui.getPatch().flight.environment.ready,true);assert.equal(await h.ui.ensureFresh(),true);
  }finally{h.ui.dispose();}
});

test('An unannounced mission change also cannot reuse old automatic evidence for export',async()=>{
  const h=harness();try{
    await h.refresh();h.mission.geometry=polygon();h.mission.geometry.coordinates[0].forEach(point=>{point[0]+=.001;});
    assert.equal(await h.ui.ensureFresh(),false);assert.equal(h.calls.length,2);
  }finally{h.ui.dispose();}
});

test('Static file mode stays explicit and performs no live lookup',async()=>{
  const h=harness({localFile:true});try{
    h.ui.changed();assert.equal(h.calls.length,0);assert.equal(h.node('trial-environment-refresh').disabled,true);
    assert.match(h.node('trial-environment-status').textContent,/local API/);assert.equal(h.ui.getPatch().flight.environment.ready,false);
  }finally{h.ui.dispose();}
});
test('Manual edits made during a transition are preserved while unchanged auto fields are cleared',async()=>{
  const h=harness();try{
    await h.refresh();h.node('f-flight-windEastMps').value='7';await h.mode('manual');
    assert.equal(h.node('f-flight-windEastMps').value,'7');assert.equal(h.node('f-flight-windNorthMps').value,'');
    assert.equal(h.ui.getPatch(),null);
  }finally{h.ui.dispose();}
});

test('Visibility events revoke automatic inputs and abort a pending refresh',async()=>{
  const h=harness({held:true});try{
    let pending=h.refresh();await flush();h.calls[0].resolve();await pending;
    assert.equal(h.ui.getPatch().flight.environment.ready,true);
    pending=h.refresh();await flush();assert.equal(h.calls.length,2);
    await h.hidden(true);await pending;
    assert.equal(h.calls[1].signal.aborted,true);assert.equal(h.ui.getState().status,'inactive');
    assert.equal(h.ui.getPatch().flight.environment.ready,false);assert.equal(h.node('f-flight-windEastMps').value,'');
    h.calls[1].resolve();await flush();assert.equal(h.ui.getPatch().flight.environment.ready,false);
  }finally{h.ui.dispose();}
});
test('Missing observation times block drift calculation while retaining mission-window conditions summary',async()=>{
  const h=harness({driftEnabled:true});try{
    await h.refresh();const patch=h.ui.getPatch();
    assert.equal(patch.flight.environment.ready,true);assert.equal(patch.drift.environment.ready,false);
    assert.equal(h.node('trial-environment-badge').textContent,'Regional forecast ready');
    assert.equal(patch.drift.currentEastMps,null);assert.equal(h.mission.drift.observedAt,null);
    assert.match(h.node('trial-environment-summary').innerHTML,/10 m wind<\/dt><dd>2\.00 m\/s/);
    assert.match(h.node('trial-environment-summary').innerHTML,/Surface current<\/dt><dd>0\.20 m\/s/);
  }finally{h.ui.dispose();}
});