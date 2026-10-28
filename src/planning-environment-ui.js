import {createPlanningEnvironmentController} from './planning-environment-controller.js';
import {aggregatePlanningEnvironment} from './planning-environment-inputs.js';
const emptyDrift=()=>({currentEastMps:null,currentNorthMps:null,windSpeedMps:null,windFromDeg:null});
const emptyFlight=()=>({windEastMps:null,windNorthMps:null,windSamples:null,windGustMps:null});
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=value=>Number.isFinite(value)?value.toFixed(2):'Unknown';
const displayTime=value=>value?new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour12:false})+' ICT':'Unknown';

/** Connects automatic conditions to existing mission inputs and review lifecycle. */
export function initializePlanningEnvironmentUI({root=document,localFile=false,getMission,onChange,fetchImpl=fetch,now=Date.now}={}){
  const $=selector=>root.querySelector(selector),field=(group,key)=>$('#f-'+group+'-'+key);
  let response=null,aggregation=null,expiresAt=null;
  const owned=new Map();
  const sourceMode=()=>$('#trial-environment-mode').value;
  const isAutomatic=()=>sourceMode()==='automatic'&&!getMission().example;
  const environmentNames={drift:['currentEastMps','currentNorthMps','windSpeedMps','windFromDeg'],flight:['windEastMps','windNorthMps']};
  function clearOwned(){for(const [name,value] of owned){const [group,key]=name.split('.');if(field(group,key).value===value)field(group,key).value='';}owned.clear();response=null;aggregation=null;expiresAt=null;}
  function windowFor(){
    const mission=getMission(),startAt=mission.export.plannedTakeoffAt,endAt=mission.export.plannedEndAt;
    let from=startAt;
    const observation=mission.drift.observedAt;
    if(mission.driftEnabled&&Number.isFinite(Date.parse(observation))&&Date.parse(observation)<=Date.parse(startAt)&&Date.parse(endAt)-Date.parse(observation)<=86400000)from=observation;
    const driftEnd=Date.parse(mission.drift.endAt),extendedEnd=mission.driftEnabled&&Number.isFinite(driftEnd)&&driftEnd>Date.parse(endAt)&&driftEnd-Date.parse(from)<=86400000?mission.drift.endAt:endAt;
    return {mission,startAt,endAt,from,extendedEnd};
  }
  function context(){const {mission,startAt,endAt,from,extendedEnd}=windowFor();return {eligible:!!mission.geometry&&!!startAt&&!!endAt,geometry:mission.geometry,startAt:from,endAt:extendedEnd,altitudeM:mission.altitudeM,example:mission.example,manual:sourceMode()==='manual',localFile,offline:globalThis.navigator?.onLine===false};}
  function currentAggregation(){
    if(!response||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=now())return null;
    const {mission,startAt,endAt}=windowFor();
    if(JSON.stringify(response.request?.geometry)!==JSON.stringify(mission.geometry)||response.request?.altitudeM!==mission.altitudeM)return null;
    const observed=Date.parse(mission.drift.observedAt),driftEnd=Date.parse(mission.drift.endAt),requestStart=Date.parse(response.request.startAt),requestEnd=Date.parse(response.request.endAt);
    const driftCovered=Number.isFinite(observed)&&Number.isFinite(driftEnd)&&observed>=requestStart&&driftEnd<=requestEnd&&driftEnd>=observed;
    const result=aggregatePlanningEnvironment(response,{now:now(),flightWindow:{startAt,endAt},...(mission.driftEnabled&&driftCovered?{driftWindow:{startAt:mission.drift.observedAt,endAt:mission.drift.endAt}}:{})});
    if(mission.driftEnabled&&!driftCovered){result.ready.drift=false;result.patch.drift=null;result.warnings.push('The original observation-to-survey window is not covered. Drift keeps its original timestamps and remains unavailable.');}
    if($('#trial-environment-site').value==='channel'){
      result.ready.drift=false;result.patch.drift=null;
      result.warnings.push('Estuary or mangrove channel: the regional current grid is unsuitable for local drift. Supply independently reviewed local currents in Manual mode.');
    }
    return result;
  }
  function render(state){
    const labels={waiting:'Choose area & time',loading:'Checking conditions…',ready:'Regional forecast ready',partial:'Some conditions unavailable',unavailable:'Conditions unavailable',error:'Conditions unavailable',stale:'Conditions expired',inactive:'Checks paused',skipped:'Automatic checks off',offline:'Offline · Conditions unknown'};
    const derived=currentAggregation();
    let label=labels[state.status]||'Conditions unknown';
    if(derived?.ready.flight && $('#trial-environment-site').value==='channel')label='Wind ready · Local current unknown';
    if(getMission().example)label='Synthetic test conditions';
    else if(localFile&&sourceMode()==='automatic')label='Live conditions need local API';
    else if(sourceMode()==='manual')label='Manual conditions';
    $('#trial-environment-badge').textContent=label;$('#trial-environment-badge').dataset.state=state.status;
    $('#trial-environment-status').textContent=label;$('#trial-environment-refresh').disabled=state.status==='loading'||localFile||sourceMode()==='manual'||getMission().example;
    $('#trial-environment-refresh').textContent=state.status==='loading'?'Checking conditions…':'Refresh conditions';
    $('#trial-environment-refresh').dataset.actionBusy=String(state.status==='loading');
    const report=state.response||response;
    const wind10=derived?.series?.wind10m?.mean,flow=derived?.series?.currentSurface?.mean;
    const rows=[['10 m wind',wind10?format(wind10.speedMps)+' m/s':'Unknown'],['Flight wind',derived?.patch.flight?format(Math.hypot(derived.patch.flight.windEastMps,derived.patch.flight.windNorthMps))+' m/s · Model estimate':'Unknown'],['Surface current',flow&&$('#trial-environment-site').value!=='channel'?format(flow.speedMps)+' m/s · Regional estimate':'Unknown']];
    $('#trial-environment-summary').innerHTML='<dl>'+rows.map(([k,v])=>'<dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd>').join('')+'</dl>';
    const details=[];
    if(report){details.push('Checked: '+displayTime(report.fetchedAt));for(const [name,series] of Object.entries(report.series||{})){details.push(name+': '+(series.source||series.model||'Unknown')+' · '+(series.resolutionM?format(series.resolutionM/1000)+' km grid':'Resolution unknown')+' · Model run '+displayTime(series.modelRunAt)+' · '+(series.freshness?.state||'Unknown'));}details.push('Window: '+displayTime(report.request?.startAt)+' – '+displayTime(report.request?.endAt));}
    details.push(...(report?.warnings||[]),...Object.entries(report?.series||{}).flatMap(([name,series])=>(series.warnings||[]).map(message=>name+': '+message)),...(derived?.warnings||[]),...(derived?.reasons||[]));if(!report&&state.reason)details.push(state.reason);
    $('#trial-environment-details-body').innerHTML='<ul>'+[...new Set(details)].map(text=>'<li>'+escape(text)+'</li>').join('')+'</ul><p>Wind: NOAA GFS · Currents: Copernicus Marine SMOC · Served by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>';
  }
  const controller=createPlanningEnvironmentController({
    now,getContext:context,
    request:async(input,{signal})=>{
      const reply=await fetchImpl('/api/v1/environment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),credentials:'same-origin',redirect:'error',cache:'no-store',signal});
      if(!reply.headers.get('content-type')?.includes('application/json'))throw Error('The local environment API did not return JSON.');
      const data=await reply.json();if(!reply.ok)throw Error(data.message||'Mission conditions are unavailable.');return data;
    },
    onState:render,
    onRevoke(){clearOwned();onChange();},
    onApply(report,meta){
      clearOwned();response=report;expiresAt=meta.expiresAt;aggregation=currentAggregation();
      if(aggregation)for(const [group,keys] of Object.entries(environmentNames))for(const key of keys){const value=aggregation.patch[group]?.[key];if(Number.isFinite(value)){field(group,key).value=String(value);owned.set(group+'.'+key,String(value));}}
      onChange();
    }
  });
  function configure(){
    const automatic=isAutomatic();
    for(const [group,keys] of Object.entries(environmentNames))for(const key of keys){const input=field(group,key);input.readOnly=automatic;input.closest('label').hidden=automatic;}
    controller.changed();render(controller.getState());
  }
  function getPatch(){
    if(!isAutomatic())return null;
    const derived=currentAggregation(),{startAt,endAt,mission}=windowFor();
    const ready=derived?.ready||{flight:false,drift:false};
    const sources=response?Object.fromEntries(Object.entries(response.series).map(([name,series])=>[name,{model:series.model,modelRunAt:series.modelRunAt,freshness:series.freshness?.state,resolutionM:series.resolutionM,heightMethod:series.heightMethod||series.samples?.[0]?.heightMethod,includesTides:series.includesTides,includesStokes:series.includesStokes}])):{};
    const evidence={mode:'automatic',ready:ready.flight===true,fetchedAt:response?.fetchedAt||null,expiresAt,startAt,endAt,sources,approximation:'Regional sampled forecast; flight height may be interpolated',geometry:response?.request?.geometry||mission.geometry};
    return {flight:{...(derived?.patch.flight||emptyFlight()),environment:evidence},drift:{...(derived?.patch.drift||emptyDrift()),environment:{...evidence,ready:ready.drift===true,startAt:mission.drift.observedAt,endAt:mission.drift.endAt}}};
  }
  for(const key of ['plannedTakeoffAt','plannedEndAt'])$('#trial-environment-times').append(field('export',key).closest('label'));
  if(!field('export','plannedTakeoffAt').value)field('export','plannedTakeoffAt').value=new Date(now()+15*60000).toISOString().slice(0,16);
  if(!field('export','plannedEndAt').value)field('export','plannedEndAt').value=new Date(now()+135*60000).toISOString().slice(0,16);
  $('#trial-environment-mode').addEventListener('change',()=>{clearOwned();onChange();configure();});
  $('#trial-environment-site').addEventListener('change',()=>{const previous=controller.getState();clearOwned();if(previous.response&&Date.parse(previous.expiresAt)>now()){response=previous.response;expiresAt=previous.expiresAt;aggregation=currentAggregation();if(aggregation)for(const [group,keys] of Object.entries(environmentNames))for(const key of keys){const value=aggregation.patch[group]?.[key];if(Number.isFinite(value)){field(group,key).value=String(value);owned.set(group+'.'+key,String(value));}}}onChange();configure();});
  $('#trial-environment-refresh').onclick=()=>controller.refresh({force:true});
  $('#trial-environment-open').onclick=()=>{$('#trial-settings-dialog').showModal();$('#trial-environment-panel').scrollIntoView({block:'start'});};
  const visibility=()=>controller.setActive(!root.hidden),online=()=>controller.changed();
  root.addEventListener('visibilitychange',visibility);globalThis.addEventListener('online',online);globalThis.addEventListener('offline',online);
  controller.setActive(!root.hidden);configure();
  return {changed:configure,getPatch,
    async ensureFresh(){if(!isAutomatic())return true;controller.changed();controller.getState();const existing=getPatch();if(existing?.flight.environment.ready&&Date.parse(existing.flight.environment.expiresAt)>now())return true;await controller.refresh({force:true});return false;},
    dispose(){controller.dispose();root.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('online',online);globalThis.removeEventListener('offline',online);},getState:controller.getState};
}
