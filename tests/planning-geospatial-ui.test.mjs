import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {initializePlanningGeospatialUI} from '../src/planning-geospatial-ui.js';
const EPOCH=Date.parse('2026-10-25T00:00:00Z'),iso=value=>new Date(value).toISOString();
const geometry=()=>({type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.61],[101.2,12.61],[101.2,12.6]]]});
const sceneId='gee:COPERNICUS/S2_SR_HARMONIZED/20261024T035400_20261024T061122_T47PQP';
const acquiredAt='2026-10-24T03:54:00.000Z';
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const previous={add:globalThis.addEventListener,remove:globalThis.removeEventListener},globalEvents=new EventTarget();
globalThis.addEventListener=globalEvents.addEventListener.bind(globalEvents);globalThis.removeEventListener=globalEvents.removeEventListener.bind(globalEvents);
after(()=>{if(previous.add)globalThis.addEventListener=previous.add;else delete globalThis.addEventListener;if(previous.remove)globalThis.removeEventListener=previous.remove;else delete globalThis.removeEventListener;});
function fixture(payload,now=EPOCH){
 const first=payload.home||payload.geometry.coordinates[0][0];
 return {schema_version:'xedo-gee-mission-context/1',state:'complete',fetchedAt:iso(now),expiresAt:iso(now+600000),request:structuredClone(payload),
 terrain:{state:'ready',datasetId:'COPERNICUS/DEM/GLO30_2024_1',verticalDatum:'EGM2008',resolutionM:30,samples:[{longitude:first[0],latitude:first[1],elevationM:0},{longitude:101.21,latitude:12.61,elevationM:2},...(payload.routePoints||[]).map(p=>({longitude:p[0],latitude:p[1],elevationM:1,role:'route'}))],homeElevationM:payload.home?0:null,minElevationM:0,maxElevationM:2,warnings:[]},
 landcover:{state:'ready',areaM2:1000000,coveragePct:100,waterPct:60,mangrovePct:20,landPct:20,unknownPct:0,waterAreaM2:600000,mangroveAreaM2:200000,year:2021,resolutionM:10,warnings:[]},
 quality:{state:payload.sceneId?'ready':'not_requested',sceneId:payload.sceneId,acquiredAt:payload.sceneId?acquiredAt:null,method:'S2 cloud probability',resolutionM:10,coveragePct:100,cloudPct:10,clearPct:90,warnings:[]},
 forecast:{state:payload.startAt&&payload.endAt?'ready':'not_requested',scope:'takeoff_reference_only',modelRunAt:iso(now-6*3600000),validAt:payload.startAt,referenceHeightM:10,resolutionM:27830,windEastMps:3,windNorthMps:4,windSpeedMps:5,windFromDeg:216.869897645844,gustMps:7,warnings:[]},warnings:[],hardwareControl:false,releaseControl:false};
}
function harness({localFile=false,example=false,hidden=false,held=false,transform=value=>value,replyType='application/json',replyStatus=200,replyBody=null}={}){
 const nodes=[],events=new EventTarget(),calls=[],changes=[],jobs=new Map();let time=EPOCH,nextId=1,hold=held;
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.events=new Map();this.attributes=new Map();this.value='';this.textContent='';this.innerHTML='';this.dataset={};this.checked=false;this.disabled=false;this.hidden=false;nodes.push(this);}
  append(...children){for(const child of children){this.children.push(child);child.parentElement=this;}}
  insertBefore(child,before){if(before===null||before===undefined)this.append(child);else{const index=this.children.indexOf(before);assert.ok(index>=0);this.children.splice(index,0,child);child.parentElement=this;}}
  setAttribute(name,value){this.attributes.set(name,String(value));}getAttribute(name){return this.attributes.get(name)??null;}
  querySelector(selector){const match=item=>selector==='details'?item.tagName==='DETAILS':selector.startsWith('#')?item.id===selector.slice(1):false;const all=[];const walk=item=>{for(const child of item.children){all.push(child);walk(child);}};walk(this);return all.find(match)||null;}
  addEventListener(type,handler){this.events.set(type,handler);}removeEventListener(type){this.events.delete(type);}dispatch(type='change'){return this.events.get(type)?.({target:this});}
  showModal(){this.open=true;}scrollIntoView(){this.scrolled=true;}
 }
 const make=(id,tag='div')=>Object.assign(new Element(tag),{id});
 const settings=make('trial-settings','form'),legacy=make('legacy-details','details');
 const environment=make('trial-environment-panel','section'),sources=make('trial-environment-details','details');
 environment.append(sources);settings.append(environment,legacy);
 const bar=new Element();bar.className='trial-context-bar';
 const home=make('f-export-homeAmslM','input'),dialog=make('trial-settings-dialog','dialog');
 const node=id=>nodes.find(item=>item.id===id);
 const root={hidden,createElement:tag=>new Element(tag),querySelector:selector=>selector==='.trial-context-bar'?bar:selector.startsWith('#')?node(selector.slice(1))||null:null,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};
 const mission={geometry:geometry(),home:[101.2,12.6],sceneId,acquiredAt,startAt:iso(time+3600000),endAt:iso(time+2*3600000),example};
 const timers={setTimeout(fn,delay){const id=nextId++;jobs.set(id,{fn,at:time+delay});return id;},clearTimeout(id){jobs.delete(id);}};
 const fetchImpl=(url,init)=>{
  assert.equal(url,'/api/v1/gee/planning-context');assert.equal(init.method,'POST');assert.equal(init.credentials,'same-origin');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
  const payload=JSON.parse(init.body),report=replyBody??transform(fixture(payload,time)),reply={ok:replyStatus>=200&&replyStatus<300,status:replyStatus,headers:{get:name=>name==='content-type'?replyType:null},json:async()=>report};
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});calls.push({payload,signal:init.signal,report,resolve:()=>resolve(reply),reject});return hold?promise:Promise.resolve(reply);
 };
 const ui=initializePlanningGeospatialUI({root,localFile,getMission:()=>structuredClone(mission),onChange:event=>changes.push(event.reason),fetchImpl,now:()=>time,timers});
 return {ui,node,root,mission,calls,changes,settings,legacy,bar,home,jobs,setReply(status,body=null){replyStatus=status;replyBody=body;},setHeld:value=>{hold=value;},setTime:value=>{time=value;},async tick(ms){const target=time+ms;for(;;){const next=[...jobs].filter(([,job])=>job.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;time=next[1].at;jobs.delete(next[0]);next[1].fn();await flush();}time=target;await flush();},async accept(){node('trial-geospatial-home-reviewed').checked=true;node('trial-geospatial-home-reviewed').dispatch();return node('trial-geospatial-use-home').onclick();},async hidden(value){root.hidden=value;events.dispatchEvent(new Event('visibilitychange'));await flush();}};
}

test('The dynamic GEE panel uses a direct form child and preserves nested environment source details',()=>{
 const h=harness();try{assert.equal(h.settings.children[0].id,'trial-environment-panel');assert.equal(h.settings.children[1].id,'trial-geospatial-panel');assert.equal(h.settings.children[2],h.legacy);assert.equal(h.node('trial-environment-details').parentElement,h.settings.children[0]);assert.equal(h.bar.children.at(-1).id,'trial-geospatial-open');assert.equal(h.node('trial-geospatial-details').open,undefined);assert.equal(h.node('trial-geospatial-use-home').disabled,true);assert.equal(h.calls.length,0);h.node('trial-geospatial-open').onclick();assert.equal(h.node('trial-settings-dialog').open,true);assert.equal(h.node('trial-geospatial-panel').scrolled,true);}finally{h.ui.dispose();}
});
test('A matching request returns advisory terrain, area and image calculations without changing physical inputs',async()=>{
 const h=harness();try{h.home.value='47';await h.ui.refresh();assert.equal(h.calls.length,1);assert.deepEqual(Object.keys(h.calls[0].payload),['geometry','home','sceneId','startAt','endAt']);assert.equal(h.home.value,'47');assert.equal(h.ui.getState().status,'ready');const context=h.ui.getContext();assert.equal(context.samples[0].elevationM,0);context.samples[0].elevationM=999;assert.equal(h.ui.getContext().samples[0].elevationM,0);const patch=h.ui.getPatch();assert.equal(patch.flight.geospatialEvidence.terrain.elevationRangeM,2);assert.equal(patch.flight.geospatialEvidence.landcover.waterPct,60);assert.equal(patch.flight.geospatialEvidence.quality.cloudPct,10);assert.equal(patch.export.homeElevationEvidence,null);assert.equal(Object.hasOwn(patch.flight,'windEastMps'),false);assert.match(h.node('trial-geospatial-summary').innerHTML,/0 m.*EGM2008/);assert.match(h.node('trial-geospatial-summary').innerHTML,/5 m\/s/);assert.equal(h.changes.filter(x=>x==='home-accepted').length,0);}finally{h.ui.dispose();}
});
test('Home elevation, including valid zero, needs an explicit checked review before it is copied',async()=>{
 const h=harness();try{await h.ui.refresh();assert.equal(h.node('trial-geospatial-use-home').onclick(),false);assert.equal(h.home.value,'');assert.equal(await h.accept(),true);assert.equal(h.home.value,'0');const accepted=h.ui.getPatch().export.homeElevationEvidence;assert.equal(accepted.reviewed,true);assert.equal(accepted.valueM,0);assert.deepEqual(accepted.home,h.mission.home);assert.equal(accepted.verticalDatum,'EGM2008');assert.equal(Object.hasOwn(accepted,'fieldValue'),false);accepted.home[0]=1;assert.deepEqual(h.ui.getPatch().export.homeElevationEvidence.home,h.mission.home);assert.ok(h.changes.includes('home-accepted'));}finally{h.ui.dispose();}
});
test('Changing Home revokes an unchanged owned estimate; a manually edited altitude is preserved',async()=>{
 const h=harness();try{await h.ui.refresh();await h.accept();h.mission.home=[101.205,12.605];h.ui.changed();assert.equal(h.home.value,'');assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);assert.equal(h.ui.getContext(),null);await h.ui.refresh();await h.accept();h.home.value='18.4';h.mission.home=[101.206,12.606];h.ui.changed();assert.equal(h.home.value,'18.4');assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);}finally{h.ui.dispose();}
});
test('Manual altitude edits release accepted-estimate provenance even when other mission data is unchanged',async()=>{
 const h=harness();try{await h.ui.refresh();await h.accept();h.home.value='0.0';h.ui.changed();assert.equal(h.home.value,'0.0');assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);assert.ok(h.changes.includes('home-revoked'));}finally{h.ui.dispose();}
});

test('Releasing a real Home estimate before demo inputs preserves an equal zero at a different demo Home',async()=>{
 const h=harness();try{
  await h.ui.refresh();await h.accept();assert.equal(h.home.value,'0');
  h.mission.example=true;
  assert.equal(h.ui.revokeHomeEstimate(),true);assert.equal(h.home.value,'');
  h.mission.home=[101.22,12.62];h.home.value='0';h.ui.changed();
  assert.equal(h.home.value,'0');assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);
  assert.equal(h.ui.getContext(),null);await h.tick(1000);assert.equal(h.calls.length,2);
  assert.equal(h.calls[1].payload.sceneId,null);assert.equal(h.calls[1].payload.startAt,null);assert.equal(h.calls[1].payload.endAt,null);
  assert.equal(h.changes.filter(reason=>reason==='home-revoked').length,1);
 }finally{h.ui.dispose();}
});

test('Explicit Home-estimate release preserves a manual override and is harmless when ownership is already gone',async()=>{
 const h=harness();try{
  await h.ui.refresh();await h.accept();h.home.value='18.4';
  assert.equal(h.ui.revokeHomeEstimate(),true);assert.equal(h.home.value,'18.4');
  assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);
  assert.equal(h.node('trial-geospatial-home-reviewed').checked,false);
  assert.equal(h.ui.revokeHomeEstimate(),false);assert.equal(h.home.value,'18.4');
  assert.equal(h.changes.filter(reason=>reason==='home-revoked').length,1);
 }finally{h.ui.dispose();}
});
test('AOI changes immediately cancel an older request and its eventual result cannot replace new data',async()=>{
 const h=harness({held:true});try{const first=h.ui.refresh();h.mission.geometry.coordinates[0].forEach(p=>{p[0]+=.001;});h.ui.changed();assert.equal(h.calls[0].signal.aborted,true);await first;h.calls[0].resolve();await flush();assert.equal(h.ui.getContext(),null);const next=h.ui.refresh();assert.equal(h.calls.length,2);h.calls[1].resolve();await next;assert.deepEqual(h.ui.getPatch().flight.geospatialEvidence.geometry,h.mission.geometry);}finally{h.ui.dispose();}
});
test('Unannounced area/time changes also synchronously revoke old context on access',async()=>{
 const h=harness();try{await h.ui.refresh();h.mission.startAt=iso(EPOCH+90*60000);assert.equal(h.ui.getContext(),null);assert.equal(h.ui.getPatch().flight.geospatialEvidence,null);assert.ok(h.changes.includes('revoked'));}finally{h.ui.dispose();}
});
test('Expired context becomes Unknown while a reviewed static Home elevation stays bound to its same point',async()=>{
 const h=harness();try{await h.ui.refresh();await h.accept();h.setHeld(true);h.setTime(EPOCH+600001);assert.equal(h.ui.getContext(),null);const patch=h.ui.getPatch();assert.equal(patch.flight.geospatialEvidence,null);assert.equal(patch.export.homeElevationEvidence.valueM,0);assert.equal(h.home.value,'0');assert.equal(h.ui.getState().status,'stale');}finally{h.ui.dispose();}
});
test('Automatic changes debounce and identical fresh context does not make duplicate lookups',async()=>{
 const h=harness();try{h.ui.changed();h.ui.changed();await h.tick(599);assert.equal(h.calls.length,0);await h.tick(1);assert.equal(h.calls.length,1);h.ui.changed();await h.tick(1000);assert.equal(h.calls.length,1);await h.ui.refresh();assert.equal(h.calls.length,2);assert.ok(h.changes.includes('revoked'));}finally{h.ui.dispose();}
});
test('A mismatched response or expired fetched timestamp never reaches the calculations',async()=>{
 for(const transform of [data=>{data.request.home=[101.3,12.7];return data;},data=>{data.request.geometry.coordinates[0][1][0]+=.001;return data;},data=>{data.fetchedAt=iso(EPOCH-600001);return data;}]){const h=harness({transform});try{await h.ui.refresh();assert.equal(h.ui.getState().status,'error');assert.equal(h.ui.getContext(),null);assert.equal(h.ui.getPatch().flight.geospatialEvidence,null);assert.equal(h.home.value,'');}finally{h.ui.dispose();}}
});
test('Bad height references and missing home samples cannot produce a usable Home estimate',async()=>{
 for(const transform of [data=>{data.terrain.verticalDatum='unknown';return data;},data=>{data.terrain.samples=data.terrain.samples.slice(1);return data;},data=>{data.terrain.homeElevationM=null;return data;}]){const h=harness({transform});try{await h.ui.refresh();assert.equal(await h.accept(),false);assert.equal(h.home.value,'');assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);}finally{h.ui.dispose();}}
});
test('Wrong image acquisition metadata becomes Unknown without discarding other valid context',async()=>{
 const h=harness({transform:data=>{data.quality.acquiredAt=iso(EPOCH);return data;}});try{await h.ui.refresh();const patch=h.ui.getPatch().flight.geospatialEvidence;assert.equal(patch.quality.state,'unavailable');assert.equal(patch.quality.cloudPct,null);assert.equal(patch.terrain.minElevationM,0);assert.equal(h.ui.getState().status,'partial');assert.match(h.node('trial-geospatial-details-body').innerHTML,/do not match the reviewed image/);}finally{h.ui.dispose();}
});
test('Provider warnings are escaped and all unavailable values stay Unknown without a zero fallback',async()=>{
 const h=harness({transform:data=>{data.state='not_configured';for(const key of ['terrain','landcover','quality','forecast'])data[key]={state:'unavailable',warnings:['<img src=x onerror=alert(1)>']};return data;}});try{await h.ui.refresh();assert.equal(h.ui.getState().status,'not_configured');assert.equal(h.ui.getContext(),null);assert.equal(h.home.value,'');assert.equal(await h.accept(),false);assert.doesNotMatch(h.node('trial-geospatial-summary').innerHTML,/>0 m/);assert.match(h.node('trial-geospatial-details-body').innerHTML,/&lt;img/);assert.doesNotMatch(h.node('trial-geospatial-details-body').innerHTML,/<img/);}finally{h.ui.dispose();}
});
test('Standalone files cannot fetch GEE or change existing mission inputs',async()=>{
 const h=harness({localFile:true});try{h.home.value='31';await h.ui.refresh();await h.tick(1000);assert.equal(h.calls.length,0);assert.equal(h.home.value,'31');assert.equal(h.ui.getContext(),null);assert.equal(h.ui.getState().status,'skipped');}finally{h.ui.dispose();}
});
test('Estimated Demo may read only terrain and land cover without requesting scene quality or forecast',async()=>{
 const h=harness({example:true});try{h.home.value='31';h.mission.routePoints=[[101.195,12.595]];await h.ui.refresh();assert.equal(h.calls.length,1);assert.equal(h.calls[0].payload.sceneId,null);assert.equal(h.calls[0].payload.startAt,null);assert.equal(h.calls[0].payload.endAt,null);assert.deepEqual(h.calls[0].payload.routePoints,h.mission.routePoints);assert.equal(h.ui.getPatch().flight.geospatialEvidence.quality.state,'not_requested');assert.equal(h.ui.getPatch().flight.geospatialEvidence.forecast.state,'not_requested');assert.equal(h.home.value,'31');assert.equal(h.ui.useModelHomeEstimate(),false);assert.ok(h.ui.getContext());assert.doesNotMatch(h.node('trial-geospatial-summary').innerHTML,/GFS 10 m reference/);assert.equal(Object.hasOwn(h.ui.getPatch().flight,'windEastMps'),false);}finally{h.ui.dispose();}
});
test('Page hiding aborts and revokes pending context; disposal clears timers and ignores late replies',async()=>{
 const h=harness({held:true});const pending=h.ui.refresh();await h.hidden(true);assert.equal(h.calls[0].signal.aborted,true);await pending;assert.equal(h.ui.getState().status,'paused');await h.hidden(false);const second=h.ui.refresh();h.ui.dispose();assert.equal(h.calls[1].signal.aborted,true);await second;h.calls[1].resolve();await flush();assert.equal(h.jobs.size,0);assert.equal(h.ui.getContext(),null);
});
test('A hung request reaches the deadline and exposes no stale data',async()=>{
 const h=harness({held:true});try{const pending=h.ui.refresh();await h.tick(30000);await pending;assert.equal(h.calls[0].signal.aborted,true);assert.equal(h.ui.getState().status,'error');assert.equal(h.ui.getContext(),null);assert.match(h.ui.getState().reason,/30 seconds/);}finally{h.ui.dispose();}
});
test('An outside-AOI Home elevation can be reviewed without filling masked AOI terrain bounds',async()=>{
 const h=harness({transform:data=>{data.terrain.samples=[{longitude:101.19,latitude:12.59,elevationM:12},{longitude:101.205,latitude:12.605,elevationM:null}];data.terrain.homeElevationM=12;data.terrain.minElevationM=null;data.terrain.maxElevationM=null;return data;}});
 try{h.mission.home=[101.19,12.59];h.ui.changed();await h.ui.refresh();assert.equal(h.ui.getContext().samples[0].elevationM,12);const terrain=h.ui.getPatch().flight.geospatialEvidence.terrain;assert.equal(terrain.state,'ready');assert.equal(terrain.minElevationM,null);assert.equal(terrain.maxElevationM,null);assert.equal(terrain.elevationRangeM,null);assert.match(h.node('trial-geospatial-summary').innerHTML,/<dt>Surface elevation<\/dt><dd>Unknown<\/dd>/);assert.doesNotMatch(h.node('trial-geospatial-summary').innerHTML,/Unknown.*–.*Unknown/);assert.equal(await h.accept(),true);assert.equal(h.home.value,'12');assert.equal(h.ui.getPatch().export.homeElevationEvidence.valueM,12);}finally{h.ui.dispose();}
});
test('A concave AOI excludes samples inside its bounding box but outside its actual polygon',async()=>{
 const h=harness({transform:data=>{data.terrain.samples=[{longitude:101.2,latitude:12.6,elevationM:0},{longitude:101.202,latitude:12.602,elevationM:5},{longitude:101.207,latitude:12.607,elevationM:200}];data.terrain.maxElevationM=200;return data;}});
 try{h.mission.geometry={type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.603],[101.203,12.603],[101.203,12.61],[101.2,12.61],[101.2,12.6]]]};h.ui.changed();await h.ui.refresh();const context=h.ui.getContext(),terrain=h.ui.getPatch().flight.geospatialEvidence.terrain;assert.equal(context.samples.length,2);assert.equal(terrain.minElevationM,0);assert.equal(terrain.maxElevationM,5);assert.equal(terrain.elevationRangeM,5);}finally{h.ui.dispose();}
});
test('The labelled model Home estimate copies only an empty field and never fabricates human review',async()=>{
 const h=harness();try{await h.ui.refresh();h.home.value='17';assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.home.value,'17');h.home.value='';assert.equal(h.ui.useModelHomeEstimate(),true);assert.equal(h.home.value,'0');const patch=h.ui.getPatch();assert.equal(patch.export.homeElevationEvidence.mode,'gee_model');assert.equal(patch.export.homeElevationEvidence.reviewed,false);assert.equal(patch.export.homeElevationEvidence.resolutionM,30);assert.equal(Object.hasOwn(patch.export.homeElevationEvidence,'fieldValue'),false);assert.match(h.node('trial-geospatial-home-note').textContent,/model estimate/);assert.equal(h.ui.getTerrainAssessment().state,'ready');assert.equal(h.ui.useModelHomeEstimate(),true);assert.equal(h.changes.filter(x=>x==='home-model').length,1);h.home.value='18';h.ui.changed();assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.home.value,'18');}finally{h.ui.dispose();}
});
test('A known GEE Home elevation can fill while the full route terrain requires review',async()=>{
 const h=harness({transform:data=>{data.terrain.samples[0].elevationM=10.79;data.terrain.homeElevationM=10.79;data.terrain.samples[1].elevationM=0;return data;}});
 try{
  await h.ui.refresh();assert.equal(h.ui.getTerrainAssessment().state,'review');
  assert.equal(h.ui.canUseModelHomeEstimate(),true);assert.equal(h.ui.useModelHomeEstimate(),true);
  assert.equal(h.home.value,'10.79');assert.equal(h.ui.getTerrainAssessment().state,'review');
  const evidence=h.ui.getPatch().export.homeElevationEvidence;
  assert.equal(evidence.valueM,10.79);assert.equal(evidence.mode,'gee_model');assert.equal(evidence.reviewed,false);
  assert.match(h.node('trial-geospatial-home-note').textContent,/10\.79 m.*Route terrain assessment remains separate/);
 }finally{h.ui.dispose();}
});
test('Missing route or area samples and an unavailable independent provider do not hide a known Home elevation',async()=>{
 for(const transform of [
  data=>{data.terrain.samples=data.terrain.samples.filter(s=>s.role!=='route');return data;},
  data=>{data.terrain.samples[1].elevationM=null;return data;},
  data=>{data.landcover={state:'unavailable'};return data;}
 ]){
  const h=harness({transform});try{
   h.mission.home=[101.19,12.59];h.mission.routePoints=[[101.195,12.595]];
   await h.ui.refresh();assert.equal(h.ui.getState().status,'partial');
   assert.equal(h.ui.canUseModelHomeEstimate(),true);assert.equal(h.ui.useModelHomeEstimate(),true);
   assert.equal(h.home.value,'0');assert.equal(h.ui.getPatch().export.homeElevationEvidence.reviewed,false);
  }finally{h.ui.dispose();}
 }
});
test('Home availability rejects missing or invalid Home data, stale reports and a changed Home',async()=>{
 for(const transform of [
  data=>{data.terrain.homeElevationM=null;return data;},
  data=>{data.terrain.verticalDatum='ellipsoid';return data;},
  data=>{data.terrain.samples[0].elevationM=null;return data;}
 ]){
  const h=harness({transform});try{await h.ui.refresh();assert.equal(h.ui.canUseModelHomeEstimate(),false);assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.home.value,'');}finally{h.ui.dispose();}
 }
 const h=harness();try{
  await h.ui.refresh();assert.equal(h.ui.canUseModelHomeEstimate(),true);
  h.mission.home=[101.205,12.605];assert.equal(h.ui.canUseModelHomeEstimate(),false);
  await h.ui.refresh();assert.equal(h.ui.canUseModelHomeEstimate(),true);
  h.setTime(EPOCH+600001);assert.equal(h.ui.canUseModelHomeEstimate(),false);
 }finally{h.ui.dispose();}
});
test('Known zero and below-sea-level Home values are copied without overwriting a manual altitude',async()=>{
 for(const value of [0,-3.25]){
  const h=harness({transform:data=>{data.terrain.samples[0].elevationM=value;data.terrain.homeElevationM=value;return data;}});
  try{
   await h.ui.refresh();assert.equal(h.ui.canUseModelHomeEstimate(),true);
   h.home.value='23.5';assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.home.value,'23.5');
   h.home.value='';assert.equal(h.ui.useModelHomeEstimate(),true);assert.equal(h.home.value,String(value));
  }finally{h.ui.dispose();}
 }
});
test('Changing Home invalidates an owned model elevation and a fresh context is required before replacing it',async()=>{
 const h=harness();try{await h.ui.refresh();h.ui.useModelHomeEstimate();h.mission.home=[101.205,12.605];h.ui.changed();assert.equal(h.home.value,'');assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.ui.getTerrainAssessment().state,'unknown');await h.ui.refresh();assert.equal(h.ui.useModelHomeEstimate(),true);assert.deepEqual(h.ui.getPatch().export.homeElevationEvidence.home,h.mission.home);h.setTime(EPOCH+600001);assert.equal(h.ui.getTerrainAssessment().state,'unknown');}finally{h.ui.dispose();}
});
test('Model assessment includes explicitly requested outside route points and refreshes when they change',async()=>{
 const h=harness();try{h.mission.routePoints=[[101.195,12.595]];await h.ui.refresh();assert.equal(h.ui.getContext().samples.at(-1).role,'route');assert.equal(h.ui.getTerrainAssessment().state,'ready');assert.deepEqual(h.ui.getPatch().flight.geospatialEvidence.routePoints,h.mission.routePoints);h.mission.routePoints=[[101.194,12.594]];h.ui.changed();assert.equal(h.ui.getTerrainAssessment().state,'unknown');await h.ui.refresh();assert.equal(h.calls.length,2);assert.deepEqual(h.ui.getTerrainAssessment().routePoints,h.mission.routePoints);assert.equal(h.ui.getTerrainAssessment({toleranceM:1}).state,'review');}finally{h.ui.dispose();}
});
test('Invalid numerical area/route samples become Unknown instead of being silently dropped from model assessment',async()=>{
 const h=harness({transform:data=>{data.terrain.samples[1].elevationM='0';return data;}});try{await h.ui.refresh();assert.equal(h.ui.getTerrainAssessment().state,'unknown');assert.equal(h.ui.getContext().samples[1].elevationM,null);}finally{h.ui.dispose();}
});
test('Same-Home model evidence renews to the fresh report without losing ownership or claiming human review',async()=>{
 const h=harness();try{await h.ui.refresh();assert.equal(h.ui.useModelHomeEstimate(),true);const first=h.ui.getPatch().export.homeElevationEvidence;h.setTime(EPOCH+10000);await h.ui.refresh();assert.equal(h.ui.useModelHomeEstimate(),true);const current=h.ui.getPatch().export.homeElevationEvidence;assert.notEqual(current.fetchedAt,first.fetchedAt);assert.equal(current.fetchedAt,h.ui.getTerrainAssessment().fetchedAt);assert.equal(current.expiresAt,h.ui.getTerrainAssessment().expiresAt);assert.equal(current.reviewed,false);assert.equal(h.home.value,'0');h.home.value='20';h.setTime(EPOCH+20000);await h.ui.refresh();assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.home.value,'20');assert.equal(h.ui.getPatch().export.homeElevationEvidence,null);}finally{h.ui.dispose();}
});
test('A missing requested route sample leaves the model assessment unknown while independent GEE sources remain ready',async()=>{
 const h=harness({example:true,transform:data=>{data.terrain.samples=data.terrain.samples.filter(s=>s.role!=='route');return data;}});try{h.mission.routePoints=[[101.195,12.595]];await h.ui.refresh();assert.equal(h.ui.getState().status,'partial');assert.equal(h.ui.getPatch().flight.geospatialEvidence.landcover.state,'ready');assert.equal(h.ui.getTerrainAssessment().state,'unknown');assert.match(h.ui.getTerrainAssessment().reasons[0],/route.*incomplete/);assert.equal(h.ui.getPatch().flight.geospatialEvidence.forecast.state,'not_requested');}finally{h.ui.dispose();}
});

test('Partial coverage and masked requested samples never advertise the whole GEE context as ready',async()=>{
 const variants=[
  data=>{data.state='partial';return data;},
  data=>{data.terrain.samples[1].elevationM=null;return data;},
  data=>{data.terrain.homeElevationM=null;return data;},
  data=>{data.landcover.coveragePct=98;data.landcover.unknownPct=2;return data;},
  data=>{data.quality.coveragePct=98;return data;}
 ];
 for(const transform of variants){const h=harness({transform});try{await h.ui.refresh();assert.equal(h.ui.getState().status,'partial');assert.equal(h.node('trial-geospatial-badge').textContent,'Some GEE data unavailable');assert.ok(h.ui.getPatch().flight.geospatialEvidence);assert.equal(h.ui.getPatch().flight.geospatialEvidence.forecast.state,'ready');assert.equal(h.home.value,'');}finally{h.ui.dispose();}}
});

test('An unavailable response with contradictory ready data cannot supply context or a Home altitude',async()=>{
 for(const state of ['unavailable','not_configured','error']){const h=harness({transform:data=>({...data,state})});try{await h.ui.refresh();assert.equal(h.ui.getState().status,'error');assert.equal(h.ui.getContext(),null);assert.equal(h.ui.getPatch().flight.geospatialEvidence,null);assert.equal(h.ui.useModelHomeEstimate(),false);assert.equal(h.home.value,'');}finally{h.ui.dispose();}}
});

test('The GEE progress panel reports completed stages, keeps the server wait indeterminate and stops its elapsed timer',async()=>{
 const h=harness({held:true});try{
  const pending=h.ui.refresh();assert.equal(h.node('trial-geospatial-progress').hidden,false);
  assert.equal(h.ui.getState().progress.percent,33);assert.match(h.node('trial-geospatial-progress-label').textContent,/33%.*Waiting for GEE response/);
  await h.tick(5000);assert.equal(h.ui.getState().progress.percent,33);assert.match(h.node('trial-geospatial-progress-time').textContent,/Elapsed 5 s/);
  h.calls[0].resolve();await pending;assert.equal(h.ui.getState().progress.percent,100);assert.equal(h.ui.getStatus(),'ready');
  const finished=h.node('trial-geospatial-progress-time').textContent;await h.tick(5000);assert.equal(h.node('trial-geospatial-progress-time').textContent,finished);
 }finally{h.ui.dispose();}
});

test('Response-format and mission-mismatch failures show their actual safe category in the visible GEE panel',async()=>{
 for(const [options,code]of [[{replyType:'text/html'},'RESPONSE_TYPE'],[{transform:data=>{data.request.home=[101.3,12.7];return data;}},'RESPONSE_MISMATCH']]){
  const h=harness(options);try{await h.ui.refresh();assert.equal(h.ui.getState().errorCode,code);assert.equal(h.node('trial-geospatial-error').hidden,false);assert.doesNotMatch(h.node('trial-geospatial-error').textContent,/local server/);assert.match(h.node('trial-geospatial-details-body').innerHTML,new RegExp(code));assert.equal(h.ui.getState().progress.percent,67);assert.equal(h.ui.getContext(),null);}finally{h.ui.dispose();}
 }
});

test('A response arriving after the deadline cannot overwrite stopped progress or expose data',async()=>{
 const h=harness({held:true});try{
  const pending=h.ui.refresh();await h.tick(30000);await pending;
  assert.equal(h.ui.getState().errorCode,'TIMEOUT');const stopped=h.node('trial-geospatial-progress-label').textContent;
  h.calls[0].resolve();await flush();assert.equal(h.ui.getState().progress.percent,33);assert.equal(h.node('trial-geospatial-progress-label').textContent,stopped);assert.equal(h.ui.getContext(),null);
 }finally{h.ui.dispose();}
});
test('Unsupported mission times load static GEE context without silently shortening the forecast',async()=>{
 const h=harness();try{
  h.mission.endAt=iso(EPOCH+53*3600000);h.ui.changed();await h.ui.refresh();
  assert.equal(h.calls[0].payload.startAt,null);assert.equal(h.calls[0].payload.endAt,null);assert.equal(h.calls[0].payload.sceneId,sceneId);
  assert.equal(h.ui.getState().status,'partial');assert.equal(h.ui.getTerrainAssessment().state,'ready');
  const evidence=h.ui.getPatch().flight.geospatialEvidence;assert.equal(evidence.forecast.state,'not_requested');assert.equal(evidence.forecast.windSpeedMps,null);assert.equal(evidence.quality.state,'ready');
  assert.match(h.node('trial-geospatial-error').textContent,/52 h.*24 hours/);assert.equal(h.mission.endAt,iso(EPOCH+53*3600000));
  h.mission.endAt=iso(EPOCH+54*3600000);h.ui.changed();await h.ui.refresh();assert.equal(h.calls.length,2);assert.match(h.node('trial-geospatial-error').textContent,/53 h/);
  h.mission.endAt=iso(EPOCH+2*3600000);h.ui.changed();await h.ui.refresh();assert.equal(h.calls[2].payload.endAt,h.mission.endAt);assert.equal(h.ui.getState().status,'ready');assert.equal(h.ui.getPatch().flight.geospatialEvidence.forecast.state,'ready');assert.equal(h.node('trial-geospatial-error').hidden,true);
 }finally{h.ui.dispose();}
});
test('A rejected request gives Surface Unknown its true error while loading and expired data stay distinct',async()=>{
 const failure={code:'GEE_CONTEXT_INPUT_INVALID',message:'Use an ordered mission window of at most 24 hours, within five days back and seven days ahead.'};
 const h=harness({held:true,replyStatus:422,replyBody:failure});try{
  const request=h.ui.refresh();assert.match(h.ui.getTerrainAssessment().reasons[0],/Loading GEE terrain/);
  h.calls[0].resolve();await request;const assessment=h.ui.getTerrainAssessment();assert.equal(assessment.state,'unknown');assert.match(assessment.reasons[0],/mission request was rejected.*24 hours/);assert.doesNotMatch(assessment.reasons[0],/does not match/);assert.equal(h.ui.useModelHomeEstimate(),false);
  h.setReply(200);h.setHeld(false);await h.ui.refresh();assert.equal(h.ui.getTerrainAssessment().state,'ready');
  h.setTime(EPOCH+600001);const expired=h.ui.getTerrainAssessment();assert.equal(expired.state,'unknown');assert.match(expired.reasons[0],/expired/);assert.equal(h.ui.getContext(),null);
 }finally{h.ui.dispose();}
});
test('A late old422 cannot overwrite terrain or the reason for a newer mission',async()=>{
 const h=harness({held:true,replyStatus:422,replyBody:{code:'GEE_CONTEXT_INPUT_INVALID',message:'Use an ordered mission window of at most 24 hours, within five days back and seven days ahead.'}});try{
  const old=h.ui.refresh();h.mission.home=[101.21,12.61];h.setReply(200);h.setHeld(false);h.ui.changed();await h.ui.refresh();
  assert.equal(h.ui.getTerrainAssessment().state,'ready');h.calls[0].resolve();await old;await flush();assert.equal(h.ui.getTerrainAssessment().state,'ready');assert.equal(h.node('trial-geospatial-error').hidden,true);
 }finally{h.ui.dispose();}
});
