import {accessToken,invalidateGEEToken,publicGEEError} from './gee-connection.js';
import {validateGeometry,pointWithin} from './domain.js';
import {satelliteDisplayContext,SATELLITE_CONTEXT_BUFFER_M} from './satellite-context.js';

const COLLECTION='COPERNICUS/S2_SR_HARMONIZED';
const API='https://earthengine.googleapis.com/v1/';
const DAY=86400000,SESSION_MS=30*60*1000,SEARCH_MS=5*60*1000;
const MAX_SCENES=12,MAX_CANDIDATES=31,MAX_JSON=1024*1024,MAX_PNG=1024*1024;
const scopes=new Map(),problems=new WeakSet();
const textEncoder=new TextEncoder();
const c=constantValue=>({constantValue});
const f=(functionName,args={})=>({functionInvocationValue:{functionName,arguments:args}});
const a=argumentReference=>({argumentReference});
const list=values=>({arrayValue:{values}});
const polygon=geometry=>f('GeometryConstructors.Polygon',{coordinates:c(geometry.coordinates),geodesic:c(false)});
const bounds=g=>{const points=g.type==='Polygon'?g.coordinates.flat():g.coordinates.flat(2);return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];};
const rectangle=([w,s,e,n])=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
const failure=(code,message,status=422)=>{const error=Object.assign(new Error(message),{code,status,retryable:[429,502,503,504].includes(status)});problems.add(error);return error;};
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unbase64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),v=>v.charCodeAt(0));
const contextOptions=opts=>({fetchImpl:opts.fetchImpl||fetch,timeoutMs:Math.max(1,Math.min(30000,opts.timeoutMs??25000)),now:opts.now||Date.now});
const trim=(map,maximum)=>{while(map.size>maximum)map.delete(map.keys().next().value);};

function checkedGeometry(geometry) {
  try {validateGeometry(geometry);}catch {throw failure('GEE_GEOMETRY_INVALID','Choose a valid single polygon for the satellite search.');}
  if(geometry.coordinates[0].length>121)throw failure('GEE_GEOMETRY_INVALID','Choose a polygon with no more than 120 vertices.');
  const bbox=bounds(geometry),mid=(bbox[1]+bbox[3])/2;
  if(bbox[2]-bbox[0]>180||Math.max(Math.abs(bbox[1]),Math.abs(bbox[3]))>80||(bbox[2]-bbox[0])*111320*Math.cos(mid*Math.PI/180)>100000||(bbox[3]-bbox[1])*111320>100000)throw failure('GEE_GEOMETRY_INVALID','Choose an area no wider or taller than 100 km, between 80° south and north.');
  return structuredClone(geometry);
}

function checkedSearch(input,now) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['geometry','start','end','maxCloud'].includes(k)))throw failure('GEE_INPUT_INVALID','Invalid satellite search fields.');
  const geometry=checkedGeometry(input.geometry),today=new Date(now()).toISOString().slice(0,10);
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  const end=input.end??today;if(!validDate(end))throw failure('GEE_DATE_RANGE_INVALID','Choose valid dates spanning no more than 90 days.');
  const start=input.start??new Date(Date.parse(end)-29*DAY).toISOString().slice(0,10),maxCloud=input.maxCloud??80;
  if(!validDate(start)||!validDate(end)||start>end||Date.parse(end)-Date.parse(start)>=90*DAY)throw failure('GEE_DATE_RANGE_INVALID','Choose valid dates spanning no more than 90 days.');
  if(typeof maxCloud!=='number'||!Number.isFinite(maxCloud)||maxCloud<0||maxCloud>100)throw failure('GEE_INPUT_INVALID','Cloud cover must be between 0 and 100 percent.');
  return {geometry,start,end,maxCloud};
}

function canonicalScene(id) {
  if(typeof id!=='string'||!/^gee:COPERNICUS\/S2_SR_HARMONIZED\/\d{8}T\d{6}_\d{8}T\d{6}_T[A-Z0-9]{5}$/.test(id))throw failure('GEE_SCENE_INVALID','Select a Sentinel-2 scene returned by XEDO.');
  return id.slice(4);
}

async function scopeFor(env) {
  if(!env.GEE_PROJECT_ID||!env.GEE_SERVICE_ACCOUNT_JSON)throw failure('GEE_NOT_CONFIGURED','GEE server credentials are not configured.',503);
  if(typeof env.GEE_PROJECT_ID!=='string'||!/^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]|[0-9]{6,20})$/.test(env.GEE_PROJECT_ID)||typeof env.GEE_SERVICE_ACCOUNT_JSON!=='string')throw failure('GEE_CONFIG_INVALID','Invalid GEE configuration.',503);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',textEncoder.encode('xedo-gee-imagery/1\0'+env.GEE_PROJECT_ID+'\0'+env.GEE_SERVICE_ACCOUNT_JSON)));
  const id=base64(digest);
  if(!scopes.has(id)){scopes.set(id,{key:await crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt']),searches:new Map(),basemaps:new Map(),scenes:new Map(),maps:new Map(),tiles:new Map(),pending:new Map(),tileBytes:0});trim(scopes,4);}
  return scopes.get(id);
}

function safeError(error,signal) {
  if(problems.has(error))return error;
  if(signal?.aborted)return failure('GEE_TIMEOUT','GEE imagery did not respond within the time limit.',504);
  const known=publicGEEError(error);
  if(known)return failure(known.code,known.message,503);
  return failure('GEE_UNAVAILABLE','GEE imagery is temporarily unavailable.',503);
}

function upstreamError(status) {
  if(status===401)invalidateGEEToken();
  return status===401||status===403?failure('GEE_ACCESS_DENIED','GEE imagery permissions are not ready.',403):status===429?failure('GEE_QUOTA_LIMIT','GEE imagery is temporarily rate-limited.',429):failure('GEE_UNAVAILABLE','GEE imagery is temporarily unavailable.',503);
}

async function limitedBytes(response,maximum) {
  if(Number(response.headers.get('Content-Length'))>maximum)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery response.',502);
  const reader=response.body?.getReader();
  if(!reader)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery response.',502);
  const chunks=[];let size=0;
  try {while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>maximum)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery response.',502);chunks.push(next.value);}}finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}

async function authenticated(env,route,body,opts,read) {
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),opts.timeoutMs);
  try {
    const token=await accessToken(env.GEE_SERVICE_ACCOUNT_JSON,opts.fetchImpl,controller.signal);
    const response=await opts.fetchImpl(API+route,{method:body===undefined?'GET':'POST',redirect:'error',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token,'X-Goog-User-Project':env.GEE_PROJECT_ID,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return await read(response);
  }catch(error){throw safeError(error,controller.signal);}finally{clearTimeout(deadline);}
}

async function jsonCall(env,route,body,opts) {
  return authenticated(env,route,body,opts,async response=>{
    if(response.status===403&&route.endsWith('/maps'))throw failure('GEE_ACCESS_DENIED','The GEE service account needs the earthengine.maps.create permission on the project.',403);
    if(!response.ok)throw upstreamError(response.status);
    const bytes=await limitedBytes(response,MAX_JSON);
    try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch {throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery response.',502);}
  });
}

async function once(scope,key,maximum,run) {
  if(scope.pending.has(key))return scope.pending.get(key);
  const kind=key.slice(0,key.indexOf(':')+1);
  if([...scope.pending.keys()].filter(pendingKey=>pendingKey.startsWith(kind)).length>=maximum)throw failure('GEE_BUSY','GEE imagery is busy. Retry shortly.',429);
  const task=Promise.resolve().then(run);scope.pending.set(key,task);
  try{return await task;}finally{if(scope.pending.get(key)===task)scope.pending.delete(key);}
}

function metadataFeature(image,geometry) {
  const footprint=f('Image.geometry',{feature:image});
  return f('Feature',{geometry:footprint,metadata:{dictionaryValue:{values:{id:f('Image.id',{element:image}),acquiredMs:f('Element.get',{object:image,property:c('system:time_start')}),cloudCover:f('Element.get',{object:image,property:c('CLOUDY_PIXEL_PERCENTAGE')}),platform:f('Element.get',{object:image,property:c('SPACECRAFT_NAME')}),coversAOI:f('Geometry.contains',{left:footprint,right:polygon(geometry),maxError:f('ErrorMargin',{value:c(1)})})}}}});
}

function searchExpression({geometry,start,end,maxCloud}) {
  const filters=[f('Filter.greaterThanOrEquals',{leftField:c('system:time_start'),rightValue:c(Date.parse(start))}),f('Filter.lessThan',{leftField:c('system:time_start'),rightValue:c(Date.parse(end)+DAY)}),f('Filter.lessThanOrEquals',{leftField:c('CLOUDY_PIXEL_PERCENTAGE'),rightValue:c(maxCloud)}),f('Filter.intersects',{leftField:c('.all'),rightValue:f('Feature',{geometry:polygon(geometry)})})];
  const filtered=f('Collection.filter',{collection:f('ImageCollection.load',{id:c(COLLECTION)}),filter:f('Filter.and',{filters:list(filters)})});
  const sorted=f('Collection.limit',{collection:filtered,limit:c(MAX_CANDIDATES),key:c('system:time_start'),ascending:c(false)});
  // Map to small metadata features before materializing a list of images.
  const metadata=f('Collection.map',{collection:sorted,baseAlgorithm:{functionDefinitionValue:{argumentNames:['image'],body:'sceneMetadata'}}});
  return {result:'result',values:{sceneMetadata:metadataFeature(a('image'),geometry),result:f('Collection.toList',{collection:metadata,count:c(MAX_CANDIDATES)})}};
}

function checkedFootprint(geometry) {
  if(!geometry||!['Polygon','MultiPolygon'].includes(geometry.type)||!Array.isArray(geometry.coordinates))throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid scene footprint.',502);
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  let count=0;
  if(!polygons.length||polygons.length>16)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid scene footprint.',502);
  for(const rings of polygons){if(!Array.isArray(rings)||!rings.length||rings.length>16)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid scene footprint.',502);for(const ring of rings){if(!Array.isArray(ring)||ring.length<4||ring.length>4096||ring.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid scene footprint.',502);count+=ring.length;}}
  if(count>4096)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid scene footprint.',502);
  return structuredClone(geometry);
}

function sceneFrom(feature,geometry) {
  const p=feature?.properties;
  if(feature?.type!=='Feature'||!p||typeof p.id!=='string'||!Number.isFinite(p.acquiredMs)||p.acquiredMs<0||p.acquiredMs>8640000000000000||!Number.isFinite(p.cloudCover)||p.cloudCover<0||p.cloudCover>100||typeof p.coversAOI!=='boolean')throw failure('GEE_RESPONSE_INVALID','GEE returned invalid Sentinel-2 scene metadata.',502);
  const assetId=p.id.startsWith(COLLECTION+'/')?p.id:COLLECTION+'/'+p.id,id='gee:'+assetId;
  try{canonicalScene(id);}catch{throw failure('GEE_RESPONSE_INVALID','GEE returned invalid Sentinel-2 scene metadata.',502);}
  const footprint=checkedFootprint(feature.geometry);
  if(!p.coversAOI||geometry.coordinates[0].some(point=>!pointWithin(point,footprint)))return null;
  return {id,provider:'gee',providerLabel:'Google Earth Engine · Sentinel-2',collection:COLLECTION,productId:assetId.split('/').at(-1),catalogueId:assetId,acquiredAt:new Date(p.acquiredMs).toISOString(),cloudCover:p.cloudCover,footprint,bbox:bounds(footprint),platform:typeof p.platform==='string'&&/^Sentinel-2[A-C]$/.test(p.platform)?p.platform:'Sentinel-2',resolution:10,assetKind:'gee_tiles',dataType:'actual',coversAOI:true,sourceUrl:'https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED',visual:null};
}

/** Search one fixed collection. Browser input cannot supply EE code, assets or URLs. */
export async function searchGEEImagery(env,input,options={}) {
  const opts=contextOptions(options),search=checkedSearch(input,opts.now),scope=await scopeFor(env),key=JSON.stringify(search),cached=scope.searches.get(key);
  if(cached&&cached.until>opts.now())return {...structuredClone(cached.result),cache:true};
  return structuredClone(await once(scope,'search:'+key,4,async()=>{
    const data=await jsonCall(env,'projects/'+env.GEE_PROJECT_ID+'/value:compute',{expression:searchExpression(search),workloadTag:'xedo-sentinel-search'},opts);
    if(!Array.isArray(data?.result)||data.result.length>MAX_CANDIDATES)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid satellite search response.',502);
    const scenes=[],ids=new Set();
    for(const feature of data.result){const scene=sceneFrom(feature,search.geometry);if(scene&&scene.cloudCover<=search.maxCloud&&scene.acquiredAt.slice(0,10)>=search.start&&scene.acquiredAt.slice(0,10)<=search.end&&!ids.has(scene.id)){ids.add(scene.id);scenes.push(scene);}}
    scenes.sort((a,b)=>b.acquiredAt.localeCompare(a.acquiredAt));
    const result={provider:'gee',collection:COLLECTION,scenes:scenes.slice(0,MAX_SCENES),fetchedAt:new Date(opts.now()).toISOString(),start:search.start,end:search.end,maxCloud:search.maxCloud,truncated:data.result.length===MAX_CANDIDATES||scenes.length>MAX_SCENES,cache:false};
    for(const scene of result.scenes)scope.scenes.set(scene.id+'\0'+JSON.stringify(search.geometry),{scene,until:opts.now()+SESSION_MS});trim(scope.scenes,128);
    scope.searches.set(key,{result,until:opts.now()+SEARCH_MS});trim(scope.searches,16);
    return result;
  }));
}

function checkedMapName(name,project) {
  if(typeof name!=='string'||!/^projects\/[A-Za-z0-9_-]+\/maps\/[A-Za-z0-9_-]{1,256}$/.test(name)||!['projects/'+project+'/maps/','projects/earthengine-legacy/maps/'].some(prefix=>name.startsWith(prefix)))throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery map.',502);
  return name;
}

function rgbRequest(sceneId,bbox) {
  return {expression:{result:'image',values:{image:f('Image.clip',{input:f('Image.load',{id:c(canonicalScene(sceneId))}),geometry:polygon(rectangle(bbox))})}},fileFormat:'PNG',bandIds:['B4','B3','B2'],visualizationOptions:{ranges:[{min:0,max:3000}],gamma:1.2}};
}


function basemapExpression({geometry,start,end}) {
  const filters=[f('Filter.greaterThanOrEquals',{leftField:c('system:time_start'),rightValue:c(Date.parse(start))}),f('Filter.lessThan',{leftField:c('system:time_start'),rightValue:c(Date.parse(end)+DAY)}),f('Filter.lessThanOrEquals',{leftField:c('CLOUDY_PIXEL_PERCENTAGE'),rightValue:c(80)}),f('Filter.intersects',{leftField:c('.all'),rightValue:f('Feature',{geometry:polygon(geometry)})})];
  const selected=f('Collection.limit',{collection:f('Collection.filter',{collection:f('ImageCollection.load',{id:c(COLLECTION)}),filter:f('Filter.and',{filters:list(filters)})}),limit:c(MAX_CANDIDATES),key:c('system:time_start'),ascending:c(false)});
  const metadata=f('Feature',{geometry:c(null),metadata:{dictionaryValue:{values:{id:f('Image.id',{element:a('image')}),acquiredMs:f('Element.get',{object:a('image'),property:c('system:time_start')}),cloudCover:f('Element.get',{object:a('image'),property:c('CLOUDY_PIXEL_PERCENTAGE')})}}}});
  return {result:'result',values:{metadata,result:f('Collection.toList',{collection:f('Collection.map',{collection:selected,baseAlgorithm:{functionDefinitionValue:{argumentNames:['image'],body:'metadata'}}}),count:c(MAX_CANDIDATES)})}};
}

/** Recent bounded viewport background; never a surveyed scene or readiness proof. */
export async function createGEEBasemap(env,input,options={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>key!=='geometry'))throw failure('GEE_INPUT_INVALID','Supply only the viewport geometry.');
  const geometry=checkedGeometry(input.geometry),opts=contextOptions(options),scope=await scopeFor(env),end=new Date(opts.now()).toISOString().slice(0,10),start=new Date(Date.parse(end)-29*DAY).toISOString().slice(0,10),key=JSON.stringify({geometry,start,end}),cached=scope.basemaps.get(key);
  if(cached&&cached.until>opts.now())return structuredClone(cached.result);
  return structuredClone(await once(scope,'basemap:'+key,4,async()=>{
    const data=await jsonCall(env,'projects/'+env.GEE_PROJECT_ID+'/value:compute',{expression:basemapExpression({geometry,start,end}),workloadTag:'xedo-basemap-search'},opts);
    if(!Array.isArray(data?.result)||data.result.length>MAX_CANDIDATES)throw failure('GEE_RESPONSE_INVALID','GEE returned invalid basemap metadata.',502);
    const selected=[],ids=new Set();
    for(const feature of data.result){
      const p=feature?.properties;
      if(feature?.type!=='Feature'||!p||typeof p.id!=='string'||!Number.isFinite(p.acquiredMs)||p.acquiredMs<Date.parse(start)||p.acquiredMs>=Date.parse(end)+DAY||!Number.isFinite(p.cloudCover)||p.cloudCover<0||p.cloudCover>80)throw failure('GEE_RESPONSE_INVALID','GEE returned invalid basemap metadata.',502);
      const full=p.id.startsWith(COLLECTION+'/')?p.id:COLLECTION+'/'+p.id;
      try{canonicalScene('gee:'+full);}catch{throw failure('GEE_RESPONSE_INVALID','GEE returned invalid basemap metadata.',502);}
      if(!ids.has(full)){ids.add(full);selected.push({index:full.slice(COLLECTION.length+1),time:p.acquiredMs});}
    }
    if(!selected.length)throw failure('GEE_BASEMAP_EMPTY','No recent Sentinel-2 images cover this viewport. Move closer to the coast or retry later.',404);
    // Mosaic prioritizes the last image: pin oldest first, newest on top.
    selected.sort((a,b)=>a.time-b.time||a.index.localeCompare(b.index));
    const expires=opts.now()+SESSION_MS,sessionId=await encodeSession(scope,{v:1,purpose:'basemap',mode:'pixels',assets:selected.map(image=>image.index),bbox:bounds(geometry),expires});
    const result={kind:'gee_basemap',provider:'gee',collection:COLLECTION,sessionId,tileUrl:'/api/v1/gee/imagery/tiles/'+sessionId+'/{z}/{x}/{y}',expiresAt:new Date(expires).toISOString(),geometry,start,end,imageCount:selected.length,acquiredFrom:new Date(selected[0].time).toISOString(),acquiredTo:new Date(selected.at(-1).time).toISOString(),renderMode:'pixels'};
    scope.basemaps.set(key,{result,until:opts.now()+SEARCH_MS});trim(scope.basemaps,16);
    return result;
  }));
}

function basemapRGBRequest(session) {
  const images=list(session.assets.map(index=>f('Image.load',{id:c(COLLECTION+'/'+index)})));
  const mosaic=f('ImageCollection.mosaic',{collection:f('ImageCollection.fromImages',{images})});
  return {expression:{result:'image',values:{image:f('Image.clip',{input:mosaic,geometry:polygon(rectangle(session.bbox))})}},fileFormat:'PNG',bandIds:['B4','B3','B2'],visualizationOptions:{ranges:[{min:0,max:3000}],gamma:1.2}};
}

async function mapFor(env,scope,sceneId,bbox,opts,force=false) {
  const key=sceneId+'\0'+JSON.stringify(bbox),cached=scope.maps.get(key);
  if(!force&&cached&&cached.until>opts.now())return cached.name;
  return once(scope,'map:'+key,8,async()=>{
    const data=await jsonCall(env,'projects/'+env.GEE_PROJECT_ID+'/maps',rgbRequest(sceneId,bbox),opts);
    const name=checkedMapName(data?.name,env.GEE_PROJECT_ID);scope.maps.set(key,{name,until:opts.now()+SESSION_MS});trim(scope.maps,32);return name;
  });
}

async function encodeSession(scope,payload) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:textEncoder.encode('xedo-gee-imagery/1')},scope.key,textEncoder.encode(JSON.stringify(payload))));
  const bytes=new Uint8Array(iv.length+encrypted.length);bytes.set(iv);bytes.set(encrypted,iv.length);return base64(bytes);
}

async function decodeSession(scope,sessionId,project,now) {
  if(typeof sessionId!=='string'||sessionId.length<80||sessionId.length>4096||!/^[A-Za-z0-9_-]+$/.test(sessionId))throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);
  let payload;
  try {const bytes=unbase64(sessionId);if(base64(bytes)!==sessionId)throw new Error();const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(0,12),additionalData:textEncoder.encode('xedo-gee-imagery/1')},scope.key,bytes.subarray(12));payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch {throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);}
  if(payload?.v!==1||!Number.isFinite(payload.expires)||payload.expires<=now()||payload.expires>now()+SESSION_MS+1000)throw failure('GEE_SESSION_EXPIRED','The satellite image session expired. Select the image again.',410);
  if(payload.purpose==='basemap'){
    if(payload.mode!=='pixels'||payload.sceneId!==undefined||payload.mapName!==undefined||!Array.isArray(payload.assets)||!payload.assets.length||payload.assets.length>MAX_CANDIDATES||new Set(payload.assets).size!==payload.assets.length)throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);
    for(const index of payload.assets)canonicalScene('gee:'+COLLECTION+'/'+index);
  }else{
    if(payload.purpose!==undefined&&payload.purpose!=='scene')throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);
    canonicalScene(payload.sceneId);
  }
  if(!['map','pixels'].includes(payload.mode))throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);
  if(payload.mode==='map')checkedMapName(payload.mapName,project);
  else if(payload.mapName!==undefined)throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);
  if(!Array.isArray(payload.bbox)||payload.bbox.length!==4||!payload.bbox.every(Number.isFinite))throw failure('GEE_SESSION_INVALID','The satellite image session is invalid. Select the image again.',400);
  // The authenticated scene display box can be slightly larger than a valid
  // 100 km inspection box. Validate its bounded rectangle independently of the
  // inspection-area cap; it is never sent to the planner or area calculator.
  if(payload.purpose==='basemap')checkedGeometry(rectangle(payload.bbox));
  else{
    const [west,south,east,north]=payload.bbox,mid=(south+north)/2;
    if(west< -180||east>180||south< -80||north>80||west>=east||south>=north||east-west>180||(east-west)*111320*Math.cos(mid*Math.PI/180)>104000||(north-south)*111320>104000)throw failure('GEE_SESSION_INVALID','The satellite image display bounds are invalid. Select the image again.',400);
  }
  return payload;
}

/** Revalidates a saved canonical scene after a restart; no browser metadata is trusted. */
export async function createGEEImageryMap(env,input,options={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['sceneId','geometry'].includes(k)))throw failure('GEE_INPUT_INVALID','Invalid satellite map fields.');
  canonicalScene(input.sceneId);const geometry=checkedGeometry(input.geometry),opts=contextOptions(options),scope=await scopeFor(env),key=input.sceneId+'\0'+JSON.stringify(geometry);
  return structuredClone(await once(scope,'session:'+key,8,async()=>{
    let scene=scope.scenes.get(key);scene=scene?.until>opts.now()?scene.scene:null;
    if(!scene){const data=await jsonCall(env,'projects/'+env.GEE_PROJECT_ID+'/value:compute',{expression:{result:'result',values:{result:metadataFeature(f('Image.load',{id:c(canonicalScene(input.sceneId))}),geometry)}},workloadTag:'xedo-sentinel-scene'},opts);scene=sceneFrom(data?.result,geometry);if(!scene||scene.id!==input.sceneId)throw failure('GEE_SCENE_COVERAGE','The selected satellite image does not cover the whole inspection area.');scope.scenes.set(key,{scene,until:opts.now()+SESSION_MS});trim(scope.scenes,128);}
    const displayGeometry=satelliteDisplayContext(geometry),bbox=bounds(displayGeometry),expires=opts.now()+SESSION_MS;let mode='map',mapName;
    if(scope.pixelModeUntil>opts.now())mode='pixels';
    else try{mapName=await mapFor(env,scope,scene.id,bbox,opts);}catch(error){if(problems.has(error)&&error.code==='GEE_ACCESS_DENIED'&&error.status===403){mode='pixels';scope.pixelModeUntil=expires;}else throw error;}
    return {sessionId:await encodeSession(scope,{v:1,purpose:'scene',mode,...(mapName?{mapName}:{}),sceneId:scene.id,bbox,expires}),expiresAt:new Date(expires).toISOString(),scene,geometry:structuredClone(geometry),displayGeometry,contextBufferM:SATELLITE_CONTEXT_BUFFER_M,renderMode:mode};
  }));
}

function pngResponse(bytes,cache='miss') {
  return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'private,max-age=300','X-Content-Type-Options':'nosniff','X-XEDO-Cache':cache}});
}
const transparent=()=>pngResponse(unbase64('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAABPO1TCQAAAABJRU5ErkJggg'),'outside-aoi');

async function readPNG(response) {
  if(!response.ok)throw upstreamError(response.status);
  if(!/^image\/png(?:;|$)/i.test(response.headers.get('Content-Type')||''))throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery tile.',502);
  const bytes=await limitedBytes(response,MAX_PNG);
  if(bytes.length<33||bytes.subarray(0,8).join(',')!=='137,80,78,71,13,10,26,10'||new TextDecoder().decode(bytes.subarray(12,16))!=='IHDR'||new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16)!==256||new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(20)!==256)throw failure('GEE_RESPONSE_INVALID','GEE returned an invalid imagery tile.',502);
  return bytes;
}

function computeTile(env,session,z,x,y,opts) {
  const scale=40075016.68557849/(2**z*256),origin=20037508.342789244;
  const body={...(session.purpose==='basemap'?basemapRGBRequest(session):rgbRequest(session.sceneId,session.bbox)),grid:{dimensions:{width:256,height:256},affineTransform:{scaleX:scale,shearX:0,translateX:-origin+x*256*scale,shearY:0,scaleY:-scale,translateY:origin-y*256*scale},crsCode:'EPSG:3857'},workloadTag:session.purpose==='basemap'?'xedo-basemap-tile':'xedo-sentinel-tile'};
  return authenticated(env,'projects/'+env.GEE_PROJECT_ID+'/image:computePixels',body,opts,readPNG);
}

/** Authenticated stateless sessions also work on a fresh serverless instance. */
export async function getGEEImageryTile(env,input,options={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['sessionId','z','x','y'].includes(k)))throw failure('GEE_INPUT_INVALID','Invalid satellite tile fields.');
  const {z,x,y}=input;if(!Number.isInteger(z)||z<0||z>18||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=2**z||y>=2**z)throw failure('GEE_TILE_INVALID','Invalid satellite tile coordinates.');
  const opts=contextOptions(options),scope=await scopeFor(env),session=await decodeSession(scope,input.sessionId,env.GEE_PROJECT_ID,opts.now),n=2**z,lat=y=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI,tile=[x/n*360-180,lat(y+1),(x+1)/n*360-180,lat(y)];
  if(tile[2]<session.bbox[0]||tile[0]>session.bbox[2]||tile[3]<session.bbox[1]||tile[1]>session.bbox[3])return transparent();
  const key=input.sessionId+'/'+z+'/'+x+'/'+y,cached=scope.tiles.get(key);
  if(cached&&cached.until>opts.now())return pngResponse(cached.bytes,'hit');
  const bytes=await once(scope,'tile:'+key,24,async()=>{
    const mapKey=session.sceneId+'\0'+JSON.stringify(session.bbox),current=scope.maps.get(mapKey),name=current?.until>opts.now()?current.name:session.mapName;
    const fetchTile=mapName=>authenticated(env,mapName+'/tiles/'+z+'/'+x+'/'+y,undefined,opts,async response=>{
      if(response.status===404||response.status===410)return null;
      return readPNG(response);
    });
    let bytes;
    if(session.mode==='pixels'||scope.pixelModeUntil>opts.now())bytes=await computeTile(env,session,z,x,y,opts);
    else {bytes=await fetchTile(name);if(!bytes)try{bytes=await fetchTile(await mapFor(env,scope,session.sceneId,session.bbox,opts,true));}catch(error){if(problems.has(error)&&error.code==='GEE_ACCESS_DENIED'&&error.status===403){scope.pixelModeUntil=session.expires;bytes=await computeTile(env,session,z,x,y,opts);}else throw error;}}
    if(!bytes)throw failure('GEE_SESSION_EXPIRED','The satellite image session expired. Select the image again.',410);
    if(scope.tiles.has(key))scope.tileBytes-=scope.tiles.get(key).bytes.length;
    scope.tiles.set(key,{bytes,until:Math.min(session.expires,opts.now()+SEARCH_MS)});scope.tileBytes+=bytes.length;
    while(scope.tiles.size>128||scope.tileBytes>16*1024*1024){const first=scope.tiles.keys().next().value;scope.tileBytes-=scope.tiles.get(first).bytes.length;scope.tiles.delete(first);}
    return bytes;
  });
  return pngResponse(bytes);
}
