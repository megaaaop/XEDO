import {pointWithin} from './domain.js';
import {assessPlanningTerrain} from './planning-terrain.js';
import {requestPlanningContext,planningContextError,classifyPlanningContextError} from './planning-context-request.js';
import {missionWindowProblem} from './planning-time-window.js';
const TTL=600000;
const DEM='COPERNICUS/DEM/GLO30_2024_1';
const clone=value=>value==null?value:structuredClone(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const pair=value=>Array.isArray(value)&&value.length===2&&value.every(finite)&&Math.abs(value[0])<=180&&Math.abs(value[1])<=85;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const samePoint=(a,b)=>pair(a)&&pair(b)&&a.every((value,index)=>Math.abs(value-b[index])<1e-7);
const percent=value=>finite(value)&&value>=0&&value<=100;
const elevation=value=>finite(value)&&value>=-12000&&value<=10000;
const instant=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=(value,unit='')=>finite(value)?value.toLocaleString('en-GB',{maximumFractionDigits:2})+unit:'Unknown';
const displayTime=value=>instant(value)?new Date(value).toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour12:false})+' ICT':'Unknown';
const warningList=value=>Array.isArray(value)?value.filter(item=>typeof item==='string').slice(0,100):[];
const aborted=()=>new DOMException('The planning-data request was cancelled.','AbortError');

/** Read-only GEE context. Home may use a labelled model estimate; no physical approval is inferred. */
export function initializePlanningGeospatialUI({root=document,localFile=false,getMission,onChange=()=>{},fetchImpl=fetch,now=Date.now,timers=globalThis}={}){
  if(typeof getMission!=='function'||typeof onChange!=='function'||typeof fetchImpl!=='function'||typeof now!=='function')throw new TypeError('Planning-data callbacks are required.');
  const $=selector=>root.querySelector(selector),create=(tag,props={})=>Object.assign(root.createElement(tag),props);
  const settings=$('#trial-settings'),bar=$('.trial-context-bar'),homeField=$('#f-export-homeAmslM');
  if(!settings||!bar||!homeField)throw new Error('Planning-data form targets are missing.');
  const panel=create('section',{id:'trial-geospatial-panel',className:'trial-geospatial-panel'});panel.setAttribute('aria-labelledby','trial-geospatial-title');
  const heading=create('div',{className:'trial-section-heading'}),title=create('strong',{id:'trial-geospatial-title',textContent:'GEE planning data'}),info=create('button',{type:'button',className:'information-button',textContent:'i'});
  info.setAttribute('data-help','geospatial');info.setAttribute('aria-label','About GEE planning data');heading.append(title,info);
  const status=create('p',{id:'trial-geospatial-status'});status.setAttribute('role','status');
  const failureDetails=create('p',{id:'trial-geospatial-error',className:'trial-geospatial-error'});failureDetails.hidden=true;
  const progressPanel=create('div',{id:'trial-geospatial-progress',className:'trial-geospatial-progress'});progressPanel.hidden=true;
  const progressLabel=create('span',{id:'trial-geospatial-progress-label'}),progressBar=create('progress',{id:'trial-geospatial-progress-bar',max:3}),progressTime=create('span',{id:'trial-geospatial-progress-time',className:'trial-geospatial-progress-time'});
  progressBar.setAttribute('aria-label','Completed GEE request stages');progressLabel.setAttribute('role','status');
  const progressNote=create('small',{textContent:'Percent counts completed request stages. GEE processing does not provide a live percentage.'});
  progressPanel.append(progressLabel,progressBar,progressTime,progressNote);
  const sourceStatus=create('ul',{id:'trial-geospatial-source-status',className:'trial-geospatial-source-status'});sourceStatus.hidden=true;
  const summary=create('div',{id:'trial-geospatial-summary',className:'trial-result'});
  const reviewLabel=create('label',{className:'trial-check trial-geospatial-home-review'}),review=create('input',{id:'trial-geospatial-home-reviewed',type:'checkbox'}),reviewText=create('span',{textContent:'I checked the launch elevation and its height reference'});reviewLabel.append(review,reviewText);
  const accept=create('button',{id:'trial-geospatial-use-home',type:'button',className:'button secondary',textContent:'Use reviewed estimate'});
  const hint=create('p',{id:'trial-geospatial-home-note',className:'trial-help',textContent:'30 m DSM · EGM2008 estimate. Confirm the actual launch level and compatible height reference.'});
  const refresh=create('button',{id:'trial-geospatial-refresh',type:'button',className:'button quiet',textContent:'Refresh GEE data'}),actions=create('div',{className:'trial-geospatial-actions'});actions.append(accept,refresh);
  const details=create('details',{id:'trial-geospatial-details'}),detailsTitle=create('summary',{textContent:'Sources & calculations'}),detailsBody=create('div',{id:'trial-geospatial-details-body'});details.append(detailsTitle,detailsBody);
  // The environment section also has nested <details>; insertBefore requires
  // a direct child of the form, rather than its first descendant disclosure.
  panel.append(heading,status,failureDetails,progressPanel,sourceStatus,summary,reviewLabel,hint,actions,details);
  settings.insertBefore(panel,[...settings.children].find(child=>child.tagName==='DETAILS')||null);
  const opener=create('button',{id:'trial-geospatial-open',type:'button',className:'button quiet trial-geospatial-badge'}),badge=create('span',{id:'trial-geospatial-badge'});badge.setAttribute('role','status');opener.setAttribute('aria-controls','trial-settings-dialog');opener.append(badge);bar.append(opener);
  let disposed=false,key=null,response=null,accepted=null,pending=null,revision=0,debounce=null,expiry=null,deadline=null,progressTimer=null,requestProgress=null,requestStartedAt=null;
  let state={status:'waiting',reason:null,fetchedAt:null,expiresAt:null};
  const cache=new Map();
  const notify=reason=>onChange({reason});
  function mission(){
    const source=clone(getMission()||{});
    // Demo may read static terrain and land cover. Synthetic scene/time inputs
    // must never trigger image-quality or forecast queries or replace weather.
    const windowProblem=source.example?null:missionWindowProblem(source.startAt,source.endAt,{now:now()});
    const payload={geometry:source.geometry??null,home:pair(source.home)?source.home:null,sceneId:!source.example&&typeof source.sceneId==='string'&&source.sceneId?source.sceneId:null,startAt:source.example||windowProblem?null:instant(source.startAt),endAt:source.example||windowProblem?null:instant(source.endAt),...(source.routePoints===undefined?{}:{routePoints:clone(source.routePoints)})};
    // Static context remains useful when forecast dates are unsupported. Retain
    // the real dates in the identity so omitted forecasts never reuse stale work.
    const contextKey=JSON.stringify({payload,acquiredAt:source.example?null:instant(source.acquiredAt),missionTimes:source.example?null:[source.startAt??null,source.endAt??null],windowProblem:windowProblem?.code??null});
    const blocked=localFile?'file':root.hidden?'hidden':globalThis.navigator?.onLine===false?'offline':!payload.geometry?'geometry':null;
    return {source,payload,key:contextKey,blocked,windowProblem};
  }
  function clearTimer(name){if(name==='debounce'&&debounce!==null){timers.clearTimeout(debounce);debounce=null;}if(name==='expiry'&&expiry!==null){timers.clearTimeout(expiry);expiry=null;}if(name==='deadline'&&deadline!==null){timers.clearTimeout(deadline);deadline=null;}if(name==='progress'&&progressTimer!==null){timers.clearTimeout(progressTimer);progressTimer=null;}}
  function cancel(){revision++;clearTimer('debounce');clearTimer('expiry');clearTimer('deadline');clearTimer('progress');pending?.controller.abort();pending=null;}
  function reconcileHome(){
    if(!accepted)return;
    const home=mission().payload.home,value=homeField.value;
    if(!same(home,accepted.home)){
      if(value===accepted.fieldValue)homeField.value='';accepted=null;review.checked=false;notify('home-revoked');
    }else if(value!==accepted.fieldValue){accepted=null;review.checked=false;notify('home-revoked');}
  }
  // Release ownership before replacing a mission with synthetic inputs. An
  // equal-valued demo altitude must not be mistaken for the old owned value.
  function revokeHomeEstimate(){
    const previous=accepted;accepted=null;review.checked=false;
    if(previous){if(homeField.value===previous.fieldValue)homeField.value='';notify('home-revoked');}
    render();return !!previous;
  }
  function invalidate(next,reason=null){
    const had=!!response;response=null;review.checked=false;state={status:next,reason,fetchedAt:null,expiresAt:null};if(next!=='error'){requestProgress=null;requestStartedAt=null;}if(had)notify('revoked');
  }
  function current(){
    if(disposed)return null;
    const context=mission();reconcileHome();
    if(context.key!==key||context.blocked){changed();return null;}
    if(response&&Date.parse(state.expiresAt)<=now()){invalidate('stale','GEE planning context expired.');render();schedule(0);return null;}
    return response;
  }
  function normalize(data,context){
    if(!data||data.schema_version!=='xedo-gee-mission-context/1'||!['complete','partial','unavailable','not_configured','error'].includes(data.state))throw planningContextError('RESPONSE_INVALID');
    if(['unavailable','not_configured','error'].includes(data.state)&&['terrain','landcover','quality','forecast'].some(name=>data[name]?.state==='ready'))throw planningContextError('RESPONSE_INVALID');
    const request=data.request||{},normal={geometry:request.geometry??null,home:request.home??null,sceneId:request.sceneId??null,startAt:instant(request.startAt),endAt:instant(request.endAt),...(request.routePoints===undefined?{}:{routePoints:request.routePoints})};
    if(!same(normal,context.payload))throw planningContextError('RESPONSE_MISMATCH');
    const fetched=Date.parse(data.fetchedAt),expires=Date.parse(data.expiresAt);
    if(!Number.isFinite(fetched)||fetched>now()+60000||now()-fetched>TTL||!Number.isFinite(expires)||expires<=now())throw planningContextError('RESPONSE_EXPIRED');
    const report=clone(data);report.expiresAt=new Date(Math.min(expires,fetched+TTL,now()+TTL)).toISOString();
    const terrain=report.terrain||{};
    const goodTerrain=terrain.state==='ready'&&terrain.datasetId===DEM&&terrain.verticalDatum==='EGM2008'&&terrain.resolutionM===30&&Array.isArray(terrain.samples)&&terrain.samples.length<=80;
    const inArea=point=>pointWithin(point,context.payload.geometry);
    const isRoute=coordinates=>Array.isArray(context.payload.routePoints)&&context.payload.routePoints.some(p=>same(p,coordinates));
    const samples=goodTerrain?terrain.samples.filter(s=>pair([s.longitude,s.latitude])&&(inArea([s.longitude,s.latitude])||same([s.longitude,s.latitude],context.payload.home)||isRoute([s.longitude,s.latitude]))).map(s=>({...s,elevationM:elevation(s.elevationM)?s.elevationM:null})):[];
    if(!goodTerrain||!samples.some(s=>elevation(s.elevationM))){report.terrain={...terrain,state:'unavailable',samples:[],homeElevationM:null,minElevationM:null,maxElevationM:null};}
    else{
      report.terrain.samples=samples;
      const known=samples.filter(s=>inArea([s.longitude,s.latitude])).map(s=>s.elevationM).filter(elevation);report.terrain.minElevationM=known.length?Math.min(...known):null;report.terrain.maxElevationM=known.length?Math.max(...known):null;
      const homeSample=samples.find(s=>same([s.longitude,s.latitude],context.payload.home));
      if(!context.payload.home||!elevation(terrain.homeElevationM)||homeSample?.elevationM!==terrain.homeElevationM)report.terrain.homeElevationM=null;
    }
    const land=report.landcover||{};
    if(land.state!=='ready'||!finite(land.areaM2)||land.areaM2<=0||![land.coveragePct,land.waterPct,land.mangrovePct,land.landPct,land.unknownPct].every(percent)||land.year!==2021||land.resolutionM!==10)report.landcover={...land,state:'unavailable'};
    const quality=report.quality||{};
    if(quality.state==='ready'&&(!context.payload.sceneId||quality.sceneId!==context.payload.sceneId||!instant(quality.acquiredAt)||(instant(context.source.acquiredAt)&&instant(quality.acquiredAt)!==instant(context.source.acquiredAt))||![quality.coveragePct,quality.cloudPct,quality.clearPct].every(percent)))report.quality={...quality,state:'unavailable',warnings:[...warningList(quality.warnings),'Image-quality values do not match the reviewed image.']};
    const forecast=report.forecast||{},run=Date.parse(forecast.modelRunAt),valid=Date.parse(forecast.validAt),from=Date.parse(context.payload.startAt),to=Date.parse(context.payload.endAt);
    if(forecast.state==='ready'&&(forecast.scope!=='takeoff_reference_only'||forecast.referenceHeightM!==10||!Number.isFinite(run)||run>now()+300000||now()-run>86400000||!Number.isFinite(valid)||!Number.isFinite(from)||!Number.isFinite(to)||valid<from||valid>to||!finite(forecast.windEastMps)||!finite(forecast.windNorthMps)||!finite(forecast.windSpeedMps)||forecast.windSpeedMps<0||Math.abs(forecast.windSpeedMps-Math.hypot(forecast.windEastMps,forecast.windNorthMps))>1e-5||forecast.gustMps!==null&&forecast.gustMps!==undefined&&(!finite(forecast.gustMps)||forecast.gustMps<0)))report.forecast={...forecast,state:'unavailable'};
    if(context.windowProblem)report.forecast={state:'not_requested',scope:'takeoff_reference_only',warnings:['GFS forecast not requested: '+context.windowProblem.message]};
    return report;
  }
  function terrainAssessment(report,context,toleranceM){
    const missingReasons={waiting:'GEE terrain data has not been loaded for this inspection.',loading:'Loading GEE terrain data for the current inspection and Home.',stale:'GEE terrain data has expired. Refresh it for the current inspection.',error:'GEE terrain data could not be loaded. Refresh to try again.',offline:'GEE terrain data is unavailable while the browser is offline.',paused:'GEE terrain checks are paused.',skipped:'GEE terrain data needs the hosted planning-data service.',not_configured:'The GEE terrain connection is not configured.'};
    return assessPlanningTerrain(report,{geometry:context.payload.geometry,home:context.payload.home,toleranceM,now:now(),unavailableReason:state.reason||missingReasons[state.status]||'GEE terrain data is unavailable for this inspection.'});
  }
  function textIfChanged(element,text){if(element.textContent!==text)element.textContent=text;}
  function htmlIfChanged(element,html){if(element.innerHTML!==html)element.innerHTML=html;}
  function renderProgress(){
    progressPanel.hidden=!requestProgress;
    if(!requestProgress)return;
    const labels={waiting:'Waiting for GEE response',reading:'Reading and checking response',retrying:'Retrying a temporary connection failure',complete:'Response checked'};
    const stopped=state.status==='error',waiting=!stopped&&['waiting','retrying'].includes(requestProgress.stage);
    textIfChanged(progressLabel,'Request stages: '+requestProgress.percent+'% · '+requestProgress.completed+'/'+requestProgress.total+' · '+(stopped?'Request stopped':labels[requestProgress.stage]||'Checking request'));
    if(waiting)progressBar.removeAttribute?.('value');else progressBar.value=requestProgress.completed;
    progressBar.setAttribute('aria-valuetext',requestProgress.percent+'% of request stages completed'+(waiting?'; server progress unavailable':''));
    progressPanel.dataset.state=stopped?'error':requestProgress.stage;
    const elapsed=Math.max(0,Math.floor((requestProgress.elapsedMs??now()-requestStartedAt)/1000));
    textIfChanged(progressTime,'Elapsed '+elapsed+' s · Attempt '+requestProgress.attempt+'/'+requestProgress.maxAttempts);
  }
  function armProgress(){
    clearTimer('progress');
    progressTimer=timers.setTimeout(()=>{progressTimer=null;if(disposed||state.status!=='loading')return;renderProgress();armProgress();},1000);
  }
  function render(){
    const report=response;
    const context=mission();
    const labels={waiting:'Choose an inspection area',loading:'Checking GEE planning data…',ready:'GEE planning data ready',partial:'Some GEE data unavailable',unavailable:'GEE planning data unavailable',not_configured:'GEE connection not configured',error:'GEE planning data unavailable',stale:'GEE planning data expired',skipped:'GEE data needs the local API',paused:'GEE checks paused',offline:'Offline · GEE data unknown'};
    const label=labels[state.status]||'GEE data unknown';textIfChanged(badge,label);badge.dataset.state=state.status;textIfChanged(status,label);
    const reason=state.reason||(context.windowProblem?'GFS forecast not requested: '+context.windowProblem.message:null);
    failureDetails.hidden=!reason;textIfChanged(failureDetails,reason||'');renderProgress();
    const terrain=report?.terrain,land=report?.landcover,quality=report?.quality,forecast=report?.forecast;
    sourceStatus.hidden=!report;
    if(report)htmlIfChanged(sourceStatus,Object.entries({terrain,landcover:land,quality,forecast}).map(([name,part])=>'<li data-state="'+escape(part?.state||'unavailable')+'"><strong>'+escape({terrain:'Terrain / Home',landcover:'Water / mangrove',quality:'Image quality',forecast:'GFS reference'}[name])+'</strong>: '+escape(part?.state==='ready'?'Ready':part?.state==='not_requested'?'Not requested':part?.failure?.message||'Unavailable for this area, image or time')+'</li>').join(''));
    const assessment=terrainAssessment(report,context,context.source.terrainToleranceM??2);
    const rows=[['Surface elevation',terrain?.state==='ready'&&elevation(terrain.minElevationM)&&elevation(terrain.maxElevationM)?format(terrain.minElevationM)+' – '+format(terrain.maxElevationM,' m')+' · DSM estimate':'Unknown'],['Home elevation estimate',terrain?.state==='ready'&&elevation(terrain.homeElevationM)?format(terrain.homeElevationM,' m')+' · EGM2008':context.payload.home?'Unknown':'Choose a Home position'],['GEE model assessment',assessment.label+' · '+format(assessment.toleranceM,' m')+' tolerance (unverified)'],['Water / mangrove',land?.state==='ready'?format(land.waterPct,'%')+' / '+format(land.mangrovePct,'%')+' · 2021':'Unknown'],...(!context.source.example?[['Image quality',quality?.state==='ready'?format(quality.clearPct,'% clear')+' · '+format(quality.coveragePct,'% coverage'):context.payload.sceneId?'Unknown':'Choose a GEE image'],['GFS 10 m reference',forecast?.state==='ready'?format(forecast.windSpeedMps,' m/s')+' · Gust '+format(forecast.gustMps,' m/s'):'Unknown']]:[])];
    htmlIfChanged(summary,'<dl>'+rows.map(([name,value])=>'<dt>'+escape(name)+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>');
    const homeReady=terrain?.state==='ready'&&elevation(terrain.homeElevationM)&&same(report.request.home,context.payload.home)&&pair(context.payload.home)&&Date.parse(state.expiresAt)>now();
    review.disabled=!homeReady;accept.disabled=!homeReady||!review.checked;refresh.disabled=state.status==='loading'||!!context.blocked;
    refresh.textContent=state.status==='loading'?'Loading GEE data…':'Refresh GEE data';refresh.dataset.actionBusy=String(state.status==='loading');
    hint.textContent=accepted?.mode==='gee_model'?'GEE model estimate retained for this Home: '+format(accepted.valueM,' m')+' · EGM2008. Route terrain assessment remains separate; actual launch level and flight clearance are not verified.':accepted?'Reviewed estimate retained for this Home position. Other export checks still require review.':'30 m DSM · EGM2008 estimate. Confirm the actual launch level and compatible height reference.';
    const lines=[];
    if(report){lines.push('Checked: '+displayTime(report.fetchedAt),'Context expires: '+displayTime(report.expiresAt),'GEE model sample completeness: '+assessment.coverage.known+'/'+assessment.coverage.total+'; this is not continuous area coverage.',...assessment.reasons);
      if(terrain)lines.push('Surface model: '+(terrain.datasetId||'Unknown')+' · '+format(terrain.resolutionM,' m')+' · '+(terrain.verticalDatum||'Height reference unknown'));
      if(land?.state==='ready')lines.push('WorldCover '+land.year+' · '+format(land.resolutionM,' m')+' · Coverage '+format(land.coveragePct,'%')+' · Unknown '+format(land.unknownPct,'%'),'Water area: '+format(land.waterAreaM2,' m²')+' · Mangrove area: '+format(land.mangroveAreaM2,' m²'));
      if(quality?.state==='ready')lines.push('Selected image: '+quality.sceneId+' · Acquired '+displayTime(quality.acquiredAt),'Quality method: '+(quality.method||'Unknown')+' · '+format(quality.resolutionM,' m')+' · Cloud '+format(quality.cloudPct,'%'));
      if(forecast?.state==='ready')lines.push('GFS model run: '+displayTime(forecast.modelRunAt)+' · Forecast valid: '+displayTime(forecast.validAt),'GFS reference is at 10 m on a '+format(forecast.resolutionM/1000,' km')+' grid for one takeoff reference time. It does not replace 50 m flight wind or whole-flight weather coverage.');
      lines.push(...warningList(report.warnings));for(const [name,part]of Object.entries({terrain,landcover:land,quality,forecast}))lines.push(...warningList(part?.warnings).map(text=>name+': '+text));
    }else if(state.reason)lines.push(state.reason);
    if(context.windowProblem)lines.push('GFS forecast not requested: '+context.windowProblem.message);
    if(state.errorCode)lines.push('Failure category: '+state.errorCode+(state.httpStatus?' · HTTP '+state.httpStatus:'')+(state.requestId?' · Request '+state.requestId:''));
    htmlIfChanged(detailsBody,'<ul>'+[...new Set(lines)].map(text=>'<li>'+escape(text)+'</li>').join('')+'</ul><p>Sources: <a href="https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30_2024_1" target="_blank" rel="noopener noreferrer">Copernicus DEM</a> · <a href="https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200" target="_blank" rel="noopener noreferrer">ESA WorldCover</a> · <a href="https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_CLOUD_PROBABILITY" target="_blank" rel="noopener noreferrer">Sentinel-2 quality</a> · <a href="https://developers.google.com/earth-engine/datasets/catalog/NOAA_GFS0P25" target="_blank" rel="noopener noreferrer">NOAA GFS</a></p>');
  }
  function armExpiry(){clearTimer('expiry');if(response)expiry=timers.setTimeout(()=>{expiry=null;if(disposed)return;invalidate('stale','GEE planning context expired.');render();refreshContext();},Math.max(1,Date.parse(state.expiresAt)-now()));}
  function apply(report,context){
    if(disposed||mission().key!==context.key||mission().blocked)return;
    response=clone(report);review.checked=false;
    const ready=['terrain','landcover','quality','forecast'].filter(name=>report[name]?.state!=='not_requested').map(name=>report[name]?.state==='ready');
    // Source availability and sample completeness are different. Keep usable
    // parts visible, but never call a partially masked/missing context ready.
    const terrain=report.terrain,samples=terrain?.samples||[];
    const missingTerrain=terrain?.state==='ready'&&(samples.some(sample=>!elevation(sample.elevationM))||context.payload.home&&!elevation(terrain.homeElevationM)||(context.payload.routePoints||[]).some(point=>!samples.some(sample=>samePoint(point,[sample.longitude,sample.latitude]))));
    const incomplete=!!context.windowProblem||report.state==='partial'||missingTerrain||report.landcover?.state==='ready'&&report.landcover.coveragePct<99||report.quality?.state==='ready'&&report.quality.coveragePct<99;
    const next=report.state==='not_configured'?'not_configured':ready.length&&ready.every(Boolean)&&!incomplete?'ready':ready.some(Boolean)?'partial':report.state==='error'?'error':'unavailable';
    clearTimer('progress');if(requestProgress)requestProgress.elapsedMs=now()-requestStartedAt;
    state={status:next,reason:null,fetchedAt:report.fetchedAt,expiresAt:report.expiresAt};armExpiry();render();notify('context');
  }
  function schedule(delay=600){clearTimer('debounce');if(disposed||mission().blocked)return;debounce=timers.setTimeout(()=>{debounce=null;refreshContext({force:false});},delay);}
  function changed(){
    if(disposed)return;reconcileHome();const context=mission();
    if(context.blocked){cancel();key=context.key;invalidate(context.blocked==='geometry'?'waiting':context.blocked==='hidden'?'paused':context.blocked==='offline'?'offline':'skipped',context.blocked==='offline'?planningContextError('OFFLINE').message:null);render();return;}
    if(context.key!==key){cancel();key=context.key;invalidate('waiting');render();schedule();return;}
    if(!response&&!pending){render();schedule();}
    else if(response&&Date.parse(state.expiresAt)<=now()){invalidate('stale');render();schedule(0);}
    else render();
  }
  function refreshContext({force=true}={}){
    if(disposed)return Promise.resolve(null);reconcileHome();const context=mission();
    if(context.blocked){changed();return Promise.resolve(null);}
    if(context.key!==key){cancel();key=context.key;invalidate('waiting');}
    if(pending?.key===context.key)return pending.promise;
    const saved=cache.get(context.key);if(!force&&saved&&Date.parse(saved.expiresAt)>now()){requestProgress=null;requestStartedAt=null;apply(saved,context);return Promise.resolve(clone(saved));}
    cancel();const version=revision,controller=new AbortController();let timedOut=false;invalidate('loading');requestStartedAt=now();render();armProgress();
    deadline=timers.setTimeout(()=>{timedOut=true;controller.abort();},30000);
    const task=(async()=>{
      try{
        const stopped=new Promise((_,reject)=>{if(controller.signal.aborted)reject(aborted());else controller.signal.addEventListener('abort',()=>reject(aborted()),{once:true});});
        const request=requestPlanningContext(context.payload,{signal:controller.signal,fetchImpl,timers,validate:data=>normalize(data,context),onProgress:progress=>{if(disposed||version!==revision||controller.signal.aborted||mission().key!==context.key)return;requestProgress=progress;renderProgress();}});
        const report=await Promise.race([request,stopped]);
        if(disposed||version!==revision||controller.signal.aborted||mission().key!==context.key||mission().blocked)return null;
        cache.set(context.key,clone(report));while(cache.size>8)cache.delete(cache.keys().next().value);apply(report,context);return clone(report);
      }catch(error){if(disposed||version!==revision||mission().key!==context.key)return null;const failure=classifyPlanningContextError(error,{offline:globalThis.navigator?.onLine===false,timedOut});clearTimer('progress');if(requestProgress)requestProgress.elapsedMs=now()-requestStartedAt;invalidate('error',failure.message);Object.assign(state,{errorCode:failure.code,httpStatus:failure.httpStatus,requestId:failure.requestId,retryable:failure.retryable});render();expiry=timers.setTimeout(()=>{expiry=null;refreshContext();},TTL);return null;}
      finally{if(pending?.controller===controller){pending=null;clearTimer('deadline');clearTimer('progress');}}
    })();pending={key:context.key,controller,promise:task};return task;
  }
  function getContext(){const data=current();if(data?.terrain?.state!=='ready')return null;return {state:'connected',provider:'Google Earth Engine',samples:clone(data.terrain.samples),datasets:[{id:data.terrain.datasetId,label:'Copernicus surface elevation estimate',resolutionM:data.terrain.resolutionM,verticalDatum:data.terrain.verticalDatum}],sampledAt:data.fetchedAt,expiresAt:data.expiresAt,geometry:clone(data.request.geometry),warnings:warningList(data.terrain.warnings)};}
  function getTerrainAssessment({toleranceM=2}={}){const data=current(),context=mission();return terrainAssessment(data,context,toleranceM);}
  function hasModelHomeEstimate(data,home){
    const t=data?.terrain;
    return t?.state==='ready'&&elevation(t.homeElevationM)&&pair(home)&&same(home,data.request.home);
  }
  function canUseModelHomeEstimate(){return hasModelHomeEstimate(current(),mission().payload.home);}
  function useModelHomeEstimate(){
    const data=current(),home=mission().payload.home,t=data?.terrain;reconcileHome();
    if(!hasModelHomeEstimate(data,home))return false;
    if(homeField.value!==''&&!(accepted?.mode==='gee_model'&&homeField.value===accepted.fieldValue&&same(home,accepted.home)))return false;
    if(accepted?.mode==='gee_model'&&accepted.valueM===t.homeElevationM&&accepted.fetchedAt===data.fetchedAt)return true;
    homeField.value=String(t.homeElevationM);accepted={mode:'gee_model',reviewed:false,home:clone(home),valueM:t.homeElevationM,verticalDatum:'EGM2008',datasetId:DEM,resolutionM:30,acceptedAt:new Date(now()).toISOString(),fetchedAt:data.fetchedAt,expiresAt:data.expiresAt,fieldValue:homeField.value};review.checked=false;render();notify('home-model');return true;
  }
  function getPatch(){
    const data=current();reconcileHome();let evidence=null;
    if(data){const t=data.terrain,l=data.landcover,q=data.quality,f=data.forecast;evidence={mode:'gee_context',fetchedAt:data.fetchedAt,expiresAt:data.expiresAt,geometry:clone(data.request.geometry),home:clone(data.request.home),routePoints:clone(data.request.routePoints||[]),sceneId:data.request.sceneId,terrain:{state:t?.state,datasetId:t?.datasetId,verticalDatum:t?.verticalDatum,minElevationM:t?.minElevationM??null,maxElevationM:t?.maxElevationM??null,elevationRangeM:t?.state==='ready'&&elevation(t.minElevationM)&&elevation(t.maxElevationM)?t.maxElevationM-t.minElevationM:null},landcover:{state:l?.state,year:l?.year,waterPct:l?.state==='ready'?l.waterPct:null,mangrovePct:l?.state==='ready'?l.mangrovePct:null,coveragePct:l?.state==='ready'?l.coveragePct:null},quality:{state:q?.state,acquiredAt:q?.acquiredAt??null,cloudPct:q?.state==='ready'?q.cloudPct:null,clearPct:q?.state==='ready'?q.clearPct:null,coveragePct:q?.state==='ready'?q.coveragePct:null},forecast:{state:f?.state,scope:f?.scope,referenceHeightM:10,modelRunAt:f?.modelRunAt??null,validAt:f?.validAt??null,windSpeedMps:f?.state==='ready'?f.windSpeedMps:null,gustMps:f?.state==='ready'?f.gustMps??null:null}};}
    return {flight:{geospatialEvidence:evidence},export:{homeElevationEvidence:accepted?clone(Object.fromEntries(Object.entries(accepted).filter(([name])=>name!=='fieldValue'))):null}};
  }
  review.addEventListener('change',render);
  accept.onclick=()=>{
    const data=current(),home=mission().payload.home,t=data?.terrain;if(!review.checked||t?.state!=='ready'||!elevation(t.homeElevationM)||!pair(home)||!same(home,data.request.home))return false;
    homeField.value=String(t.homeElevationM);accepted={mode:'gee_estimate',reviewed:true,home:clone(home),valueM:t.homeElevationM,verticalDatum:'EGM2008',datasetId:DEM,acceptedAt:new Date(now()).toISOString(),fieldValue:homeField.value};review.checked=false;render();notify('home-accepted');return true;
  };
  refresh.onclick=()=>refreshContext({force:true});
  opener.onclick=()=>{$('#trial-settings-dialog').showModal();panel.scrollIntoView({block:'start'});};
  const visibility=()=>changed(),connectivity=()=>changed();root.addEventListener('visibilitychange',visibility);globalThis.addEventListener('online',connectivity);globalThis.addEventListener('offline',connectivity);
  changed();
  return {changed,getContext,getPatch,getTerrainAssessment,canUseModelHomeEstimate,useModelHomeEstimate,revokeHomeEstimate,getStatus(){current();return state.status;},getState(){current();return {...clone(state),progress:clone(requestProgress),response:clone(response)};},refresh:refreshContext,dispose(){if(disposed)return;disposed=true;cancel();response=null;cache.clear();root.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('online',connectivity);globalThis.removeEventListener('offline',connectivity);}};
}
