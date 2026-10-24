import {pointWithin,validateGeometry} from './domain.js';

const HOUR=3600000,DAY=24*HOUR,CACHE_MS=10*60*1000,MAX_BODY_BYTES=512*1024;
const MAX_POINTS=5,MAX_CACHE=32,REQUEST_TIMEOUT_MS=12000,TOTAL_TIMEOUT_MS=25000;
const cacheByFetch=new WeakMap(),slotsByFetch=new WeakMap();

// Provider URLs and model choices are server-owned. No request can supply a URL.
export const PLANNING_ENVIRONMENT_SOURCES=Object.freeze({
  weather:Object.freeze({endpoint:'https://api.open-meteo.com/v1/forecast',metadata:'https://api.open-meteo.com/data/ncep_gfs013/static/meta.json',model:'gfs_global',resolutionM:13000,maxGridDistanceM:25000,maxAgeMs:24*HOUR}),
  marine:Object.freeze({endpoint:'https://marine-api.open-meteo.com/v1/marine',metadata:'https://marine-api.open-meteo.com/data/meteofrance_currents/static/meta.json',model:'meteofrance_currents',resolutionM:9000,maxGridDistanceM:18000,maxAgeMs:48*HOUR})
});

function record(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function instant(value,label){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error(`${label} must be a valid timestamp with a timezone.`);
  const clock=/T(\d\d):(\d\d)(?::(\d\d))?/.exec(value);if(Number(clock[1])>23||Number(clock[2])>59||Number(clock[3]||0)>59)throw new Error(`${label} is not a valid clock time.`);
  const date=new Date(value),calendar=value.slice(0,10),calendarDate=new Date(`${calendar}T00:00:00Z`);
  if(calendarDate.toISOString().slice(0,10)!==calendar)throw new Error(`${label} is not a valid calendar date.`);
  return date.toISOString();
}
function distance(a,b){const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r,x=Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
function samplePoints(geometry){
  const ring=geometry.coordinates[0].slice(0,-1),xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
  const centre=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];
  let anchor=pointWithin(centre,geometry)?centre:null;
  if(!anchor){for(let i=1;i<ring.length-1&&!anchor;i++){const candidate=[(ring[0][0]+ring[i][0]+ring[i+1][0])/3,(ring[0][1]+ring[i][1]+ring[i+1][1])/3];if(pointWithin(candidate,geometry))anchor=candidate;}}
  anchor??=ring[0];
  const points=[anchor];
  for(let i=0;i<ring.length&&points.length<MAX_POINTS;i++){
    const vertex=ring[Math.floor(i*ring.length/Math.min(4,ring.length))%ring.length];
    const candidate=[anchor[0]+.9*(vertex[0]-anchor[0]),anchor[1]+.9*(vertex[1]-anchor[1])];
    const selected=pointWithin(candidate,geometry)?candidate:vertex;
    if(!points.some(p=>distance(p,selected)<.01))points.push(selected);
  }
  return points.map(([longitude,latitude],i)=>({id:`p${i+1}`,longitude,latitude}));
}
function validateInput(input,{now=Date.now()}={}){
  if(!record(input))throw new Error('Environment request must be an object.');
  for(const key of Object.keys(input))if(!['geometry','startAt','endAt','altitudeM'].includes(key))throw new Error(`Unsupported environment request field: ${key}`);
  validateGeometry(input.geometry);
  const ring=input.geometry.coordinates[0];
  if(ring.length-1>120)throw new Error('Environment area must have at most 120 vertices.');
  if(ring.some(([lon,lat])=>lon<97||lon>106||lat<5||lat>21))throw new Error('Environment trial supports the Thailand region only (97–106° E, 5–21° N).');
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),low=[Math.min(...xs),Math.min(...ys)],high=[Math.max(...xs),Math.max(...ys)];
  if(distance(low,[high[0],low[1]])>100000||distance(low,[low[0],high[1]])>100000)throw new Error('Environment area must fit within a 100 km extent.');
  const startAt=instant(input.startAt,'Environment start'),endAt=instant(input.endAt,'Environment end');
  const start=Date.parse(startAt),end=Date.parse(endAt),nowMs=typeof now==='function'?now():now;
  if(!Number.isFinite(nowMs))throw new Error('Environment clock is invalid.');
  if(end<start||end-start>DAY)throw new Error('Environment window must be ordered and no longer than 24 hours.');
  if(start<nowMs-5*DAY||end>nowMs+7*DAY)throw new Error('Environment trial supports at most five days in the past and seven days ahead.');
  if(typeof input.altitudeM!=='number'||!Number.isFinite(input.altitudeM)||input.altitudeM<10||input.altitudeM>80)throw new Error('Environment flight height must be between 10 and 80 m.');
  return {geometry:structuredClone(input.geometry),startAt,endAt,altitudeM:input.altitudeM,points:samplePoints(input.geometry)};
}
export function validatePlanningEnvironmentRequest(input,options={}){try{return validateInput(input,options);}catch(error){error.code='ENV_INPUT_INVALID';error.status=422;throw error;}}
function hours(request){const result=[];for(let at=Math.floor(Date.parse(request.startAt)/HOUR)*HOUR;at<=Math.ceil(Date.parse(request.endAt)/HOUR)*HOUR;at+=HOUR)result.push(new Date(at).toISOString());return result;}
function metadataInstant(value){const at=typeof value==='number'?value*1000:typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(at)&&at>=Date.UTC(2000,0,1)&&at<=Date.UTC(2100,0,1)?new Date(at).toISOString():null;}
function modelFreshness(metadata,source,nowMs,request){
  const modelRunAt=metadataInstant(metadata?.last_run_initialisation_time),modelAvailableAt=metadataInstant(metadata?.last_run_availability_time),dataEndAt=metadataInstant(metadata?.data_end_time);
  const run=modelRunAt?Date.parse(modelRunAt):NaN,available=modelAvailableAt?Date.parse(modelAvailableAt):NaN,end=dataEndAt?Date.parse(dataEndAt):NaN;
  const unknown=!Number.isFinite(run)||!Number.isFinite(available)||!Number.isFinite(end)||run>nowMs+5*60*1000||available<run||end<run||available>nowMs-10*60*1000||end<Math.ceil(Date.parse(request.endAt)/HOUR)*HOUR||metadata?.temporal_resolution_seconds!==3600;
  const state=unknown?'unknown':nowMs-run>source.maxAgeMs?'stale':'fresh';
  return {modelRunAt,modelAvailableAt,dataEndAt,modelRunScope:'latest_available_provider_run',historicalReconstruction:Number.isFinite(run)&&Date.parse(request.startAt)<run,freshness:{state,checkedAt:new Date(nowMs).toISOString(),maxAgeMs:source.maxAgeMs,propagationGraceMs:10*60*1000}};
}
async function acquireSlot(fetchImpl,signal){
  let slots=slotsByFetch.get(fetchImpl);if(!slots){slots={active:0,queue:[]};slotsByFetch.set(fetchImpl,slots);}
  if(slots.active>=2){if(slots.queue.length>=16)throw new Error('Environment provider queue is busy. Retry shortly.');await new Promise((resolve,reject)=>{const item={resolve,reject};const abort=()=>{const index=slots.queue.indexOf(item);if(index>=0)slots.queue.splice(index,1);reject(new Error('Environment request was aborted.'));};item.resolve=()=>{signal?.removeEventListener('abort',abort);resolve();};slots.queue.push(item);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});}else slots.active++;
  return ()=>{const next=slots.queue.shift();if(next)next.resolve();else slots.active--;};
}
async function boundedJSON(url,{fetchImpl,signal}){
  const release=await acquireSlot(fetchImpl,signal);
  const controller=new AbortController();let rejectAbort;const cancelled=new Promise((_,reject)=>{rejectAbort=reject;});const abort=()=>{controller.abort(signal?.reason);rejectAbort(new Error('Environment request was aborted.'));};
  if(signal?.aborted){release();throw new Error('Environment request was aborted.');}
  signal?.addEventListener('abort',abort,{once:true});
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Environment provider timed out.'));},REQUEST_TIMEOUT_MS);});
  const read=async()=>{
    const response=await fetchImpl(url,{method:'GET',headers:{accept:'application/json'},redirect:'error',signal:controller.signal});
    if(!response?.ok)throw new Error(`Environment provider returned HTTP ${response?.status??'unknown'}.`);
    const size=Number(response.headers?.get?.('content-length'));
    if(Number.isFinite(size)&&size>MAX_BODY_BYTES)throw new Error('Environment provider response is too large.');
    let raw='';
    if(response.body?.getReader){const reader=response.body.getReader(),decoder=new TextDecoder();let count=0;try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>MAX_BODY_BYTES)throw new Error('Environment provider response is too large.');raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}}
    else {raw=await response.text();if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)throw new Error('Environment provider response is too large.');}
    let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('Environment provider returned invalid JSON.');}
    if(!record(parsed)&&!Array.isArray(parsed))throw new Error('Environment provider returned an invalid object.');
    return parsed;
  };
  try{return await Promise.race([read(),timeout,cancelled]);}finally{clearTimeout(timer);controller.abort();signal?.removeEventListener('abort',abort);release();}
}
function urlFor(source,request,variables){
  const url=new URL(source.endpoint),brackets=hours(request);
  url.searchParams.set('latitude',request.points.map(p=>p.latitude).join(','));url.searchParams.set('longitude',request.points.map(p=>p.longitude).join(','));
  url.searchParams.set('cell_selection','nearest');url.searchParams.set('hourly',variables.join(','));url.searchParams.set('models',source.model);url.searchParams.set('timezone','GMT');url.searchParams.set('wind_speed_unit','ms');
  url.searchParams.set('start_date',brackets[0].slice(0,10));url.searchParams.set('end_date',brackets.at(-1).slice(0,10));
  return url.toString();
}
function vector(speed,direction,convention,max){
  if(typeof speed!=='number'||!Number.isFinite(speed)||speed<0||speed>max)return null;
  if(speed===0)return {eastMps:0,northMps:0,speedMps:0,directionDeg:typeof direction==='number'&&Number.isFinite(direction)?((direction%360)+360)%360:null};
  if(typeof direction!=='number'||!Number.isFinite(direction)||direction<0||direction>360)return null;
  const angle=direction*Math.PI/180,sign=convention==='FROM'?-1:1;
  return {eastMps:sign*speed*Math.sin(angle),northMps:sign*speed*Math.cos(angle),speedMps:speed,directionDeg:direction%360};
}
function rowIndex(entry){
  if(entry?.utc_offset_seconds!==0||!Array.isArray(entry?.hourly?.time)||entry.hourly.time.length>500)return null;
  const map=new Map();for(let i=0;i<entry.hourly.time.length;i++){const value=entry.hourly.time[i];if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(value))return null;const at=Date.parse(value+'Z');if(!Number.isFinite(at)||map.has(at))return null;map.set(at,i);}return map;
}
function gridFor(entry,point,source){
  const lon=entry?.longitude,lat=entry?.latitude;
  if(typeof lon!=='number'||typeof lat!=='number'||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return null;
  const gridDistanceM=distance([point.longitude,point.latitude],[lon,lat]);
  return {gridLongitude:lon,gridLatitude:lat,gridDistanceM,gridAccepted:gridDistanceM<=source.maxGridDistanceM};
}
function normalizeSeries({kind,request,data,metadata,nowMs,error}){
  const marine=kind==='currentSurface',source=marine?PLANNING_ENVIRONMENT_SOURCES.marine:PLANNING_ENVIRONMENT_SOURCES.weather;
  const freshness=modelFreshness(metadata,source,nowMs,request),entries=Array.isArray(data)?data:request.points.length===1?[data]:[];
  const samples=[],warnings=[];let valid=0;
  if(error)warnings.push(error);
  if(freshness.historicalReconstruction)warnings.push('Past model values are reconstructed recent history; the latest model metadata does not establish a forecast issued at the historical observation time.');
  for(let p=0;p<request.points.length;p++){
    const point=request.points[p],entry=entries[p],index=rowIndex(entry),grid=gridFor(entry,point,source);
    for(const at of hours(request)){
      const base={pointId:point.id,at,eastMps:null,northMps:null,speedMps:null,directionDeg:null,sourceHeightM:marine?0:kind==='wind10m'?10:request.altitudeM,...(grid??{gridLongitude:null,gridLatitude:null,gridDistanceM:null,gridAccepted:false})};
      const i=index?.get(Date.parse(at));let value=null,gustMps=null;
      const get=(name)=>entry?.hourly?.[name]?.[i];
      const units=(name,expected)=>entry?.hourly_units?.[name]===expected;
      if(i!==undefined&&grid?.gridAccepted){
        const gust=get('wind_gusts_10m');if(!marine&&units('wind_gusts_10m','m/s')&&typeof gust==='number'&&Number.isFinite(gust)&&gust>=0&&gust<=150)gustMps=gust;
        if(marine&&units('ocean_current_velocity','m/s')&&units('ocean_current_direction','°'))value=vector(get('ocean_current_velocity'),get('ocean_current_direction'),'TO',10);
        else if(!marine&&units('wind_speed_10m','m/s')&&units('wind_direction_10m','°')){
          const low=vector(get('wind_speed_10m'),get('wind_direction_10m'),'FROM',100);
          if(kind==='wind10m'||request.altitudeM===10)value=low;
          else if(units('wind_speed_80m','m/s')&&units('wind_direction_80m','°')){
            const high=vector(get('wind_speed_80m'),get('wind_direction_80m'),'FROM',100);
            if(request.altitudeM===80)value=high;
            else if(low&&high){const weight=(request.altitudeM-10)/70,eastMps=low.eastMps+(high.eastMps-low.eastMps)*weight,northMps=low.northMps+(high.northMps-low.northMps)*weight;value={eastMps,northMps,speedMps:Math.hypot(eastMps,northMps),directionDeg:(Math.atan2(-eastMps,-northMps)*180/Math.PI+360)%360};}
          }
        }
      }
      const heightMethod=marine?'surface_model':kind==='wind10m'||request.altitudeM===10?'model_10m':request.altitudeM===80?'model_80m':'linear_10m_80m_estimate';
      samples.push({...base,...value,gustMps,gustSourceHeightM:marine?null:10,heightMethod,sourceHeightsM:marine?[0]:kind==='wind10m'||request.altitudeM===10?[10]:request.altitudeM===80?[80]:[10,80],estimated:!marine&&kind==='flightWind'&&request.altitudeM!==10&&request.altitudeM!==80});
      if(value)valid++;
    }
  }
  const status=valid===0?'unavailable':valid===samples.length&&freshness.freshness.state==='fresh'?'complete':'partial';
  if(freshness.freshness.state!=='fresh')warnings.push(`Provider model update is ${freshness.freshness.state}; retrieval time is not the model run time.`);
  if(valid<samples.length)warnings.push('Some requested point/hour values are missing, invalid, or outside the accepted model-grid distance.');
  if(!marine){warnings.push('Gust values are referenced to 10 m; they are not measured or interpolated at aircraft height.');if(samples.some(sample=>sample.gustMps===null))warnings.push('Some 10 m gust values are unavailable; missing gusts do not establish calm or safe flight conditions.');}
  if(marine)warnings.push('Regional offshore model estimate; local channels, mangroves, river discharge and shoreline currents are not certified by this grid.');
  if(kind==='flightWind'&&request.altitudeM!==10&&request.altitudeM!==80)warnings.push('Flight-height wind is a linear interpolation of 10 m and 80 m model vectors; it is an estimate, not a measurement at aircraft height.');
  return {status,valueKind:'numerical_model_estimate',source:'Open-Meteo',sourceUrl:source.endpoint,model:source.model,...freshness,resolutionM:source.resolutionM,gustReferenceHeightM:marine?null:10,coverage:marine?'regional_estimate':'model_grid',directionConvention:marine?'TO':'FROM',includesTides:marine,includesStokes:marine,samples,warnings};
}

/** Read-only, bounded public-model lookup. No GEE jobs, secrets or device actions. */
export async function fetchPlanningEnvironment(input,{fetchImpl=globalThis.fetch,now=Date.now(),signal}={}){
  const nowMs=typeof now==='function'?now():now,request=validatePlanningEnvironmentRequest(input,{now:nowMs});
  if(typeof fetchImpl!=='function')throw new Error('An environment fetch implementation is required.');
  if(signal?.aborted)throw new Error('Environment request was aborted.');
  let cache=cacheByFetch.get(fetchImpl);if(!cache){cache=new Map();cacheByFetch.set(fetchImpl,cache);}
  const key=JSON.stringify(request),existing=cache.get(key);
  if(existing&&existing.until>nowMs){const result=await existing.promise;if(signal?.aborted)throw new Error('Environment request was aborted.');return structuredClone(result);}
  const promise=(async()=>{
    const lookup=new AbortController();let deadlineElapsed=false;const cancel=()=>lookup.abort(signal?.reason);signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
    const deadline=setTimeout(()=>{deadlineElapsed=true;lookup.abort();},TOTAL_TIMEOUT_MS);
    try{
    const weather=PLANNING_ENVIRONMENT_SOURCES.weather,marine=PLANNING_ENVIRONMENT_SOURCES.marine;
    const jobs=[urlFor(weather,request,['wind_speed_10m','wind_direction_10m','wind_speed_80m','wind_direction_80m','wind_gusts_10m']),weather.metadata,urlFor(marine,request,['ocean_current_velocity','ocean_current_direction']),marine.metadata];
    // Two bounded batches avoid unbounded parallel provider calls.
    const results=[];for(let i=0;i<jobs.length;i+=2)results.push(...await Promise.allSettled(jobs.slice(i,i+2).map(url=>boundedJSON(url,{fetchImpl,signal:lookup.signal}))));
    if(signal?.aborted)throw new Error('Environment request was aborted.');
    const data=i=>results[i].status==='fulfilled'?results[i].value:null,errors=(a,b)=>[a,b].filter(i=>results[i].status==='rejected').map(i=>i<2?'Weather model lookup unavailable.':'Marine current lookup unavailable.').join(' ');
    const series={};for(const kind of ['wind10m','flightWind','currentSurface']){const offset=kind==='currentSurface'?2:0;series[kind]=normalizeSeries({kind,request,data:data(offset),metadata:data(offset+1),nowMs,error:errors(offset,offset+1)});}
    const states=Object.values(series).map(s=>s.status),state=states.every(s=>s==='complete')?'complete':states.every(s=>s==='unavailable')?'unavailable':'partial';
    return {schema_version:'xedo-planning-environment/1',state,fetchedAt:new Date(nowMs).toISOString(),expiresAt:new Date(Math.min(nowMs+CACHE_MS,...Object.values(series).filter(s=>s.freshness.state==='fresh').map(s=>Date.parse(s.modelRunAt)+s.freshness.maxAgeMs))).toISOString(),request,series,warnings:[...(deadlineElapsed?['The environmental lookup deadline elapsed; incomplete values remain unknown.']:[]),'Public numerical model estimates are not real-time site measurements.','A Thailand-region lookup does not establish detailed coastal, estuary or mangrove coverage.'],hardwareControl:false,releaseControl:false};
    }finally{clearTimeout(deadline);signal?.removeEventListener('abort',cancel);}
  })();
  cache.set(key,{until:nowMs+CACHE_MS,promise});while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
  try{const result=await promise,entry=cache.get(key);if(entry?.promise===promise)entry.until=Math.min(entry.until,Date.parse(result.expiresAt));return structuredClone(result);}catch(error){if(cache.get(key)?.promise===promise)cache.delete(key);throw error;}
}
