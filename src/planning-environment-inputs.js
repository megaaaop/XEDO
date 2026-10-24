const HOUR=3600000,MAX_POINTS=5,MAX_HOURS=24;
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const time=x=>typeof x==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const unique=x=>[...new Set(x)];
const clean=x=>Math.abs(x)<1e-12?0:x;
function windowOf(input,fallback){const startAt=time(input?.startAt??fallback.startAt),endAt=time(input?.endAt??fallback.endAt);return startAt===null||endAt===null||endAt<startAt?null:{startAt,endAt};}
function atVector(a,b,t){if(a.at===b.at)return{eastMps:a.eastMps,northMps:a.northMps};const f=(t-a.at)/(b.at-a.at);return{eastMps:a.eastMps+(b.eastMps-a.eastMps)*f,northMps:a.northMps+(b.northMps-a.northMps)*f};}
function minimumSpeed(a,b){const e=b.eastMps-a.eastMps,n=b.northMps-a.northMps,l=e*e+n*n,f=l===0?0:Math.max(0,Math.min(1,-(a.eastMps*e+a.northMps*n)/l));return Math.hypot(a.eastMps+e*f,a.northMps+n*f);}
function summary(key,s,window){return{key,state:'unavailable',reasons:[],warnings:[],source:s?.source??null,model:s?.model??null,modelRunAt:s?.modelRunAt??null,modelAvailableAt:s?.modelAvailableAt??null,resolutionM:s?.resolutionM??null,coverage:s?.coverage??null,includesTides:s?.includesTides??null,includesStokes:s?.includesStokes??null,heightMethod:s?.heightMethod??s?.samples?.[0]?.heightMethod??null,sourceHeightsM:s?.sourceHeightsM??s?.samples?.[0]?.sourceHeightsM??null,window:window?{startAt:new Date(window.startAt).toISOString(),endAt:new Date(window.endAt).toISOString()}:null,mean:null,componentRange:null,speedRangeMps:null,maxSpeedMps:null,maxGustMps:null,maxVectorDeviationMps:null,vectorSamples:[]};}
function aggregateSeries(key,s,r,w,now,response){
 const out=summary(key,s,w),fail=x=>out.reasons.push(`${key}: ${x}`);
 if(!record(s)){fail('no source series is available.');return out;}if(!w){fail('the selected time window is invalid.');return out;}
 const start=time(r.startAt),end=time(r.endAt);
 if(w.startAt<start||w.endAt>end)fail('the selected window falls outside fetched coverage.');
 if(s.status!=='complete')fail(`source coverage is ${s.status??'unknown'}.`);
 if(typeof s.source!=='string'||!s.source.trim()||typeof s.model!=='string'||!s.model.trim())fail('source/model provenance is missing.');
 const run=time(s.modelRunAt),checked=time(s.freshness?.checkedAt),available=s.modelAvailableAt==null?null:time(s.modelAvailableAt),age=s.freshness?.maxAgeMs;
 if(s.freshness?.state!=='fresh'||!finite(age)||age<=0||age>(key==='currentSurface'?48:24)*HOUR||run===null||checked===null||now-run>age||now-checked>age||run>now+300000||checked>now+300000)fail('model freshness is stale or cannot be verified.');
 if(s.modelAvailableAt!=null&&(available===null||available+(s.freshness?.propagationGraceMs??0)>now))fail('model availability metadata is invalid.');
 if(time(response.expiresAt)===null||time(response.expiresAt)<=now)fail('the fetched response has expired.');
 if(time(s.dataEndAt)===null||time(s.dataEndAt)<Math.ceil(end/HOUR)*HOUR)fail('provider data does not cover the requested end time.');
 if(!finite(s.resolutionM)||s.resolutionM<=0)fail('model grid resolution is unknown.');
 if(s.units!==undefined&&!['m/s','m s-1'].includes(s.units))fail('vectors must use metres per second.');
 if(key==='currentSurface'){
  if(typeof s.includesTides!=='boolean'||typeof s.includesStokes!=='boolean')fail('tide/wave composition is unknown.');
  if(s.includesTides)out.warnings.push('Surface-current vectors already include tides; do not add another tide vector.');
  if(s.includesStokes)out.warnings.push('Surface-current vectors already include Stokes drift; do not add another wave/Stokes term. Project oil windage remains uncalibrated.');
  out.warnings.push('Regional ocean-grid estimates do not resolve every estuary, mangrove channel or shoreline flow.');
 }
 if(!Array.isArray(s.samples)||s.samples.length>MAX_POINTS*(MAX_HOURS+2)){fail('sample collection is invalid or too large.');return out;}
 const byPoint=new Map(r.points.map(p=>[p.id,new Map()])),hours=[];
 for(let t=Math.floor(start/HOUR)*HOUR;t<=Math.ceil(end/HOUR)*HOUR;t+=HOUR)hours.push(t);
 for(const sample of s.samples){
  const t=time(sample?.at),point=byPoint.get(sample?.pointId),limit=key==='currentSurface'?10:100;
  if(!point||t===null||t%HOUR!==0||!finite(sample.eastMps)||!finite(sample.northMps)||Math.hypot(sample.eastMps,sample.northMps)>limit){fail('a vector sample is missing, invalid or outside supported bounds.');continue;}
  if(point.has(t)){fail('duplicate point/time sample.');continue;}
  if(sample.gridAccepted!==true||!finite(sample.gridLongitude)||!finite(sample.gridLatitude)||!finite(sample.gridDistanceM)||sample.gridDistanceM<0)fail('source grid acceptance/position is unknown.');
  if(sample.speedMps!=null&&(!finite(sample.speedMps)||Math.abs(sample.speedMps-Math.hypot(sample.eastMps,sample.northMps))>0.001))fail('vector speed does not match its components.');
  if(sample.gustMps!=null&&(!finite(sample.gustMps)||sample.gustMps<0||sample.gustMps>150))fail('gust speed is outside supported bounds.');
  if(key==='wind10m'&&sample.sourceHeightM!==10)fail('wind reference height is not 10 m.');
  if(key==='flightWind'){
   const method=sample.heightMethod??s.heightMethod,heights=sample.sourceHeightsM??s.sourceHeightsM,estimated=sample.estimated??s.estimated;
   const direct=sample.sourceHeightM===r.altitudeM&&estimated!==true&&(!method||(['native_model_level','provider_height'].includes(method)||(method==='model_10m'&&r.altitudeM===10)||(method==='model_80m'&&r.altitudeM===80)));
   const interpolated=sample.sourceHeightM===r.altitudeM&&estimated===true&&method==='linear_10m_80m_estimate'&&Array.isArray(heights)&&heights.length===2&&heights[0]===10&&heights[1]===80&&r.altitudeM>=10&&r.altitudeM<=80;
   if(!direct&&!interpolated)fail('flight-height coverage or interpolation metadata is invalid.');
  }
  point.set(t,{...sample,at:t});
 }
 for(const point of byPoint.values())if(hours.some(t=>!point.has(t)))fail('at least one requested point/hour bracket is missing.');
 out.reasons=unique(out.reasons);if(out.reasons.length){out.state=s.status==='unavailable'?'unavailable':'partial';return out;}
 let east=0,north=0,minSpeed=Infinity;const vectors=[];
 for(const [pointId,values]of byPoint){
  const times=unique([w.startAt,...hours.filter(t=>t>w.startAt&&t<w.endAt),w.endAt]).sort((a,b)=>a-b);
  const evaluated=times.map(t=>{
   const low=values.get(Math.floor(t/HOUR)*HOUR),high=values.get(Math.ceil(t/HOUR)*HOUR),gusts=finite(low.gustMps)&&finite(high.gustMps)?[low.gustMps,high.gustMps]:[];
   return{pointId,at:new Date(t).toISOString(),...atVector(low,high,t),...(gusts.length?{gustMps:Math.max(...gusts)}:{})};
  });
  vectors.push(...evaluated);
  if(evaluated.length===1){east+=evaluated[0].eastMps;north+=evaluated[0].northMps;minSpeed=Math.min(minSpeed,Math.hypot(evaluated[0].eastMps,evaluated[0].northMps));}
  for(let i=1;i<evaluated.length;i++){const a=evaluated[i-1],b=evaluated[i],dt=Date.parse(b.at)-Date.parse(a.at);east+=(a.eastMps+b.eastMps)*dt/2;north+=(a.northMps+b.northMps)*dt/2;minSpeed=Math.min(minSpeed,minimumSpeed(a,b));}
 }
 const divisor=r.points.length*(w.endAt===w.startAt?1:w.endAt-w.startAt),eastMps=clean(east/divisor),northMps=clean(north/divisor),speedMps=Math.hypot(eastMps,northMps);
 out.state='complete';out.mean={eastMps,northMps,speedMps,directionToDeg:speedMps<1e-12?null:(Math.atan2(eastMps,northMps)*180/Math.PI+360)%360};
 out.componentRange={eastMps:[Math.min(...vectors.map(v=>v.eastMps)),Math.max(...vectors.map(v=>v.eastMps))],northMps:[Math.min(...vectors.map(v=>v.northMps)),Math.max(...vectors.map(v=>v.northMps))]};
 out.maxSpeedMps=Math.max(...vectors.map(v=>Math.hypot(v.eastMps,v.northMps)));out.speedRangeMps=[minSpeed,out.maxSpeedMps];
 const gusts=vectors.map(v=>v.gustMps).filter(finite);out.maxGustMps=gusts.length?Math.max(...gusts):null;
 out.maxVectorDeviationMps=Math.max(...vectors.map(v=>Math.hypot(v.eastMps-eastMps,v.northMps-northMps)));out.vectorSamples=vectors;
 out.warnings.push('Hourly linear time integration and equally weighted AOI sample points form a constant-vector trial approximation; finer flows and gusts are unresolved.');
 if(key==='flightWind'&&s.samples.some(v=>(v.estimated??s.estimated)===true))out.warnings.push('Flight wind is estimated between modelled 10 m and 80 m winds, not a direct observation at flight height.');
 if(key==='flightWind')out.warnings.push(out.maxGustMps===null?'Gust data is unavailable; wind assessment remains incomplete.':'Gust values are a 10 m proxy, not a measured flight-height gust.');
 return out;
}
/** Pure mapping: does not fetch, retimestamp observations, or change review confirmations. */
export function aggregatePlanningEnvironment(response,{now=Date.now(),driftWindow,flightWindow}={}){
 const nowMs=typeof now==='string'?time(now):now,out={state:'unavailable',ready:{drift:false,flight:false},patch:{drift:null,flight:null},series:{},reasons:[],warnings:[],method:'hourly-integrated, equally weighted sample-point vectors; constant-vector trial approximation'};
 if(!finite(nowMs)||!record(response)||response.schema_version!=='xedo-planning-environment/1'||!record(response.request)){out.reasons.push('The environment response or evaluation time is invalid.');return out;}
 const r=response.request,start=time(r.startAt),end=time(r.endAt),points=r.points;
 if(start===null||end===null||end<start||end-start>MAX_HOURS*HOUR||!finite(r.altitudeM)||r.altitudeM<5||r.altitudeM>500||!Array.isArray(points)||points.length<1||points.length>MAX_POINTS||points.some(p=>!record(p)||typeof p.id!=='string'||!p.id||!finite(p.longitude)||Math.abs(p.longitude)>180||!finite(p.latitude)||Math.abs(p.latitude)>85)||new Set(points.map(p=>p.id)).size!==points.length){out.reasons.push('AOI sample points, time interval or flight height are invalid.');return out;}
 const drift=windowOf(driftWindow,r),flight=windowOf(flightWindow,r);
 for(const key of['wind10m','flightWind','currentSurface'])out.series[key]=aggregateSeries(key,response.series?.[key],r,key==='flightWind'?flight:drift,nowMs,response);
 if(drift&&drift.endAt-drift.startAt>24*HOUR)out.reasons.push('Drift supports at most 24 hours from the original observation. Old imagery must not be retimestamped.');
 out.ready.drift=!!drift&&drift.endAt-drift.startAt<=24*HOUR&&out.series.wind10m.state==='complete'&&out.series.currentSurface.state==='complete';out.ready.flight=out.series.flightWind.state==='complete';
 if(out.ready.drift){const wind=out.series.wind10m.mean,current=out.series.currentSurface.mean;out.patch.drift={currentEastMps:current.eastMps,currentNorthMps:current.northMps,windSpeedMps:wind.speedMps,windFromDeg:wind.directionToDeg===null?0:(wind.directionToDeg+180)%360};}
 if(out.ready.flight){const wind=out.series.flightWind.mean;out.patch.flight={windEastMps:wind.eastMps,windNorthMps:wind.northMps,windSamples:out.series.flightWind.vectorSamples.map(v=>({eastMps:v.eastMps,northMps:v.northMps,...(v.gustMps!=null?{gustMps:v.gustMps}:{})})),windGustMps:out.series.flightWind.maxGustMps};}
 out.reasons=unique([...out.reasons,...Object.values(out.series).flatMap(s=>s.reasons)]);out.warnings=unique(Object.values(out.series).flatMap(s=>s.warnings));
 out.warnings.push('The existing drift calculator applies one equivalent vector at arrival and end. Its envelope does not bound intermediate spatial/temporal variation.');
 out.warnings.push('Assess all flight-wind samples and maximum gusts; a mean vector alone can cancel opposing unsafe winds.');
 out.state=out.ready.drift&&out.ready.flight?'complete':out.ready.drift||out.ready.flight?'partial':'unavailable';return out;
}
