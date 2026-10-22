import {accessToken,invalidateGEEToken,publicGEEError} from './gee-connection.js';

export const MAX_GEE_PLANNING_POINTS=80;
export const planningDatasets=[
  {id:'USGS/SRTMGL1_003',label:'NASA/USGS SRTM elevation',band:'elevation',resolutionM:30,period:'11–22 February 2000',sourceUrl:'https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003',attribution:'NASA / USGS / JPL-Caltech'},
  {id:'JRC/GSW1_4/GlobalSurfaceWater',label:'JRC historical surface water occurrence',band:'occurrence',resolutionM:30,period:'1984–2021',sourceUrl:'https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_4_GlobalSurfaceWater',attribution:'EC JRC/Google'},
];
const cache=new Map(),pending=new Map(),cacheTTL=10*60*1000;
const publicProblems=new WeakMap();
const problem=(code,message)=>{const error=Object.assign(new Error(message),{code});publicProblems.set(error,Object.freeze({code,message}));return error;};
const value=constantValue=>({constantValue});
const call=(functionName,args={})=>({functionInvocationValue:{functionName,arguments:args}});
const ref=valueReference=>({valueReference});

function checkedPoints(points) {
  if(!Array.isArray(points)||!points.length||points.length>MAX_GEE_PLANNING_POINTS||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>80))throw problem('GEE_POINTS_INVALID','Supply between 1 and 80 valid WGS84 sample points between 80° south and north.');
  return points.map(p=>[...p]);
}
export function unavailablePlanningContext(state,points,message,code) {
  return {state,provider:'Google Earth Engine',datasets:structuredClone(planningDatasets),samples:points.map(([longitude,latitude])=>({longitude,latitude,elevationM:null,waterOccurrencePct:null})),sampledAt:null,cached:false,message,...(code?{code}:{})};
}

// One fixed, bounded computation; callers cannot supply asset names or EE code.
export function planningExpression(points) {
  const selected=(id,band)=>call('Image.select',{input:call('Image.load',{id:value(id)}),bandSelectors:value([band])});
  return {values:{
    water:selected(planningDatasets[1].id,'occurrence'),elevation:selected(planningDatasets[0].id,'elevation'),
    // Use the global water image's footprint; SRTM has limited latitude coverage.
    image:call('Image.addBands',{dstImg:ref('water'),srcImg:ref('elevation')}),
    points:call('Collection',{features:{arrayValue:{values:points.map((coordinates,index)=>call('Feature',{geometry:call('GeometryConstructors.Point',{coordinates:value(coordinates)}),metadata:value({sample_index:index})}))}}}),
    result:call('Image.reduceRegions',{image:ref('image'),collection:ref('points'),reducer:call('Reducer.first'),scale:value(30),crs:call('Projection',{crs:value('EPSG:4326')}),maxPixelsPerRegion:value(4)}),
  },result:'result'};
}

function decodedSamples(data,points) {
  const features=data?.result?.features;
  if(data?.result?.type!=='FeatureCollection'||!Array.isArray(features)||features.length!==points.length)throw problem('GEE_RESPONSE_INVALID','GEE returned an invalid planning sample response.');
  const rows=new Map();
  for(const feature of features) {
    const p=feature?.properties,index=p?.sample_index;
    if(!Number.isInteger(index)||index<0||index>=points.length||rows.has(index))throw problem('GEE_RESPONSE_INVALID','GEE returned invalid sample identifiers.');
    const number=(field,min,max)=>{const n=p[field];if(n==null)return null;if(!Number.isFinite(n)||n<min||n>max)throw problem('GEE_RESPONSE_INVALID','GEE returned invalid sample values.');return n;};
    rows.set(index,{longitude:points[index][0],latitude:points[index][1],elevationM:number('elevation',-12000,10000),waterOccurrencePct:number('occurrence',0,100)});
  }
  return points.map((_,i)=>rows.get(i));
}

export async function samplePlanningContext(env,input,{fetchImpl=fetch,timeoutMs=10000,useCache=true}={}) {
  const points=checkedPoints(input);
  if(!env.GEE_PROJECT_ID||!env.GEE_SERVICE_ACCOUNT_JSON)return unavailablePlanningContext('not_configured',points,'GEE credentials are not configured. Elevation and historical water occurrence are unknown.');
  if(!/^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]|[0-9]{6,20})$/.test(env.GEE_PROJECT_ID))return unavailablePlanningContext('error',points,'Invalid GEE project configuration.','GEE_CONFIG_INVALID');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([env.GEE_PROJECT_ID,env.GEE_SERVICE_ACCOUNT_JSON,points])));
  const key=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const cached=useCache&&cache.get(key);
  if(cached&&Date.now()-cached.at<cacheTTL)return {...structuredClone(cached.data),cached:true};
  if(useCache&&pending.has(key))return structuredClone(await pending.get(key));
  if(pending.size>=2)return unavailablePlanningContext('error',points,'GEE planning is busy. Retry this preview shortly.','GEE_BUSY');
  const task=(async()=>{
    const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),Math.max(1,Math.min(10000,timeoutMs)));
    try {
      const token=await accessToken(env.GEE_SERVICE_ACCOUNT_JSON,fetchImpl,controller.signal);
      const response=await fetchImpl('https://earthengine.googleapis.com/v1/projects/'+env.GEE_PROJECT_ID+'/value:compute',{
        method:'POST',cache:'no-store',redirect:'error',signal:controller.signal,
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Goog-User-Project':env.GEE_PROJECT_ID},
        body:JSON.stringify({expression:planningExpression(points),workloadTag:'xedo-deployment-preview'}),
      });
      if(!response.ok){if(response.status===401)invalidateGEEToken();throw problem(response.status===401||response.status===403?'GEE_ACCESS_DENIED':response.status===429?'GEE_QUOTA_LIMIT':'GEE_UNAVAILABLE',response.status===401||response.status===403?'GEE planning permissions are not ready.':response.status===429?'GEE planning quota is temporarily limited.':'GEE planning is unavailable.');}
      if(Number(response.headers.get('Content-Length'))>262144)throw problem('GEE_RESPONSE_INVALID','GEE planning response exceeded the size limit.');
      const raw=await response.text();if(raw.length>262144)throw problem('GEE_RESPONSE_INVALID','GEE planning response exceeded the size limit.');
      let data;try{data=JSON.parse(raw);}catch{throw problem('GEE_RESPONSE_INVALID','GEE planning returned an unreadable response.');}
      const result={state:'connected',provider:'Google Earth Engine',datasets:structuredClone(planningDatasets),samples:decodedSamples(data,points),sampledAt:new Date().toISOString(),cached:false,message:'Historical 30 m samples for planning context. Missing or masked values remain unknown; these data do not establish obstacle clearance or current water conditions.'};
      if(useCache){cache.delete(key);while(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),data:structuredClone(result)});}
      return result;
    } catch(error) {
      const details=publicProblems.get(error)||publicGEEError(error);
      return unavailablePlanningContext('error',points,controller.signal.aborted?'GEE planning did not respond within 10 seconds.':details?.message||'GEE planning request failed.',controller.signal.aborted?'GEE_TIMEOUT':details?.code||'GEE_UNAVAILABLE');
    } finally {clearTimeout(deadline);}
  })();
  pending.set(key,task);
  try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
}
