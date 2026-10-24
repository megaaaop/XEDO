import {validateGeometry,pointWithin} from './domain.js';
import {accessToken,invalidateGEEToken,publicGEEError} from './gee-connection.js';

const HOUR=3600000,DAY=24*HOUR,TTL=600000,MAX_JSON=512*1024;
const MAX_SAMPLES=80,MAX_AREA=100000000,MAX_PIXELS=1500000;
const scopesByFetch=new WeakMap(),slotsByFetch=new WeakMap();
const diagnosticProblems=new WeakMap(),MAX_ERROR_JSON=8192;
function diagnosticProblem(httpStatus,reason){const error=Error('GEE request unavailable.');diagnosticProblems.set(error,{httpStatus,reason});return error;}
function technicalReason(value){
 if(typeof value!=='string'||!/^(?:Invalid JSON payload|Unrecognized function|Unknown function|Unable to perform this geometry|Image\.|ImageCollection\.|Collection\.|Parameter\b|Projection\b|Geometry\b|Dictionary\b|No algorithm\b|Invalid argument\b)/.test(value))return 'UPSTREAM_HTTP_ERROR';
 if(/private[ _-]?key|client_email|access_token|authorization|credential|password|secret|-----BEGIN/i.test(value))return 'UPSTREAM_HTTP_ERROR_REDACTED';
 return value.replace(/Bearer\s+[^\s,;]+/gi,'Bearer [REDACTED]').replace(/https?:\/\/[^\s"'<>]+/gi,'[URL]').replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+/g,'[EMAIL]').replace(/[A-Za-z0-9_+/=-]{40,}/g,'[TOKEN]').replace(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi,'[NUMBER]').replace(/[\u0000-\u001f\u007f]+/g,' ').slice(0,240);
}
async function upstreamReason(response){
 if(Number(response.headers.get('content-length'))>MAX_ERROR_JSON)return 'UPSTREAM_ERROR_BODY_TOO_LARGE';
 const reader=response.body?.getReader();if(!reader)return 'UPSTREAM_ERROR_BODY_UNAVAILABLE';
 let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_ERROR_JSON)return 'UPSTREAM_ERROR_BODY_TOO_LARGE';chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return 'UPSTREAM_ERROR_BODY_INVALID';}
  return technicalReason(value?.error?.message);
 }catch{return 'UPSTREAM_ERROR_BODY_UNAVAILABLE';}finally{await reader.cancel().catch(()=>{});}
}
const c=constantValue=>({constantValue});
const f=(functionName,args={})=>({functionInvocationValue:{functionName,arguments:args}});
const ref=valueReference=>({valueReference});
const dictionary=values=>({dictionaryValue:{values}});
const array=values=>({arrayValue:{values}});
const constant=value=>f('Image.constant',{value:c(value)});
const select=(input,bands)=>f('Image.select',{input,bandSelectors:c(bands)});
const rename=(input,name)=>f('Image.rename',{input,names:c([name])});
const binary=(name,image1,value)=>f('Image.'+name,{image1,image2:typeof value==='number'?constant(value):value});
const mask=image=>f('Image.mask',{image});
const unmask=input=>f('Image.unmask',{input,value:constant(0),sameFootprint:c(false)});
const and=(a,b)=>binary('and',a,b),or=(a,b)=>binary('or',a,b);
const areaImage=indicator=>binary('multiply',f('Image.pixelArea'),indicator);
const mosaic=(id,geometry,home=null)=>{
 const intersects=g=>f('Filter.intersects',{leftField:c('.all'),rightValue:f('Feature',{geometry:g})});
 const filters=[intersects(polygon(geometry)),...(home?[intersects(point(home))]:[])];
 const filter=filters.length===1?filters[0]:f('Filter.or',{filters:array(filters)});
 return f('ImageCollection.mosaic',{collection:f('Collection.filter',{collection:f('ImageCollection.load',{id:c(id)}),filter})});
};
const polygon=geometry=>f('GeometryConstructors.Polygon',{coordinates:c(geometry.coordinates),geodesic:c(false)});
const point=coordinates=>f('GeometryConstructors.Point',{coordinates:c(coordinates)});
// Use the CRS accepted by the existing live GEE adapters. Image.pixelArea
// supplies actual square metres; the geographic grid is not treated as m².
const reduction=(image,geometry,scale)=>f('Image.reduceRegion',{image,reducer:f('Reducer.sum'),geometry:polygon(geometry),scale:c(scale),crs:f('Projection',{crs:c('EPSG:4326')}),bestEffort:c(false),maxPixels:c(MAX_PIXELS),tileScale:c(2)});
const bands=images=>images.slice(1).reduce((dstImg,srcImg)=>f('Image.addBands',{dstImg,srcImg}),images[0]);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const source=id=>'https://developers.google.com/earth-engine/datasets/catalog/'+id.replaceAll('/','_');

export const GEE_MISSION_DATASETS=Object.freeze({
 terrain:Object.freeze({id:'COPERNICUS/DEM/GLO30_2024_1',label:'Copernicus DEM GLO-30 2024_1',resolutionM:30,verticalDatum:'EGM2008',period:'2010–2020',sourceUrl:source('COPERNICUS/DEM/GLO30_2024_1')}),
 landcover:Object.freeze({id:'ESA/WorldCover/v200',label:'ESA WorldCover 2021',resolutionM:10,year:2021,sourceUrl:source('ESA/WorldCover/v200')}),
 quality:Object.freeze({id:'COPERNICUS/S2_CLOUD_PROBABILITY',label:'Sentinel-2 AOI cloud quality',resolutionM:10,thresholdPct:65,sourceUrl:source('COPERNICUS/S2_CLOUD_PROBABILITY')}),
 forecast:Object.freeze({id:'NOAA/GFS0P25',label:'GFS takeoff reference',resolutionM:27830,referenceHeightM:10,sourceUrl:source('NOAA/GFS0P25')})
});
function distance(a,b){const rad=Math.PI/180,dy=(b[1]-a[1])*rad,dx=(b[0]-a[0])*rad,q=Math.sin(dy/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dx/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));}
function timestamp(value,label){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error(label+' must be an ISO timestamp with a timezone.');
 const m=/T(\d\d):(\d\d)(?::(\d\d))?(?:\.\d+)?(?:Z|([+-])(\d\d):(\d\d))$/.exec(value);
 if(!m||+m[1]>23||+m[2]>59||+(m[3]||0)>59||+(m[5]||0)>23||+(m[6]||0)>59||new Date(value.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==value.slice(0,10))throw Error(label+' is not a valid date or clock time.');
 return new Date(value).toISOString();
}
function normalizedInput(input,{now=Date.now()}={}){
 if(!record(input)||Object.keys(input).some(key=>!['geometry','home','sceneId','startAt','endAt'].includes(key)))throw Error('Use only an inspection polygon, home, selected scene and mission window.');
 const area=validateGeometry(input.geometry),ring=input.geometry.coordinates[0];
 if(ring.length>121||area>MAX_AREA)throw Error('GEE context supports at most 120 vertices and 100 km².');
 if(ring.some(([x,y])=>x<97||x>106||y<5||y>21))throw Error('GEE context is limited to the Thailand region (97–106° E, 5–21° N).');
 const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),low=[Math.min(...xs),Math.min(...ys)],high=[Math.max(...xs),Math.max(...ys)];
 if(distance(low,[high[0],low[1]])>100000||distance(low,[low[0],high[1]])>100000)throw Error('GEE context must fit within a 100 km extent.');
 const home=input.home??null;
 if(home!==null&&(!Array.isArray(home)||home.length!==2||!home.every(finite)||Math.abs(home[0])>180||Math.abs(home[1])>85||distance(home,[(low[0]+high[0])/2,(low[1]+high[1])/2])>100000))throw Error('Home must be a valid coordinate within 100 km of the inspection area.');
 const sceneId=input.sceneId??null;
 if(sceneId!==null&&(typeof sceneId!=='string'||!/^gee:COPERNICUS\/S2_SR_HARMONIZED\/\d{8}T\d{6}_\d{8}T\d{6}_T[A-Z0-9]{5}$/.test(sceneId)))throw Error('Select a canonical Sentinel-2 scene returned by XEDO.');
 const startAt=input.startAt==null||input.startAt===''?null:timestamp(input.startAt,'Mission start'),endAt=input.endAt==null||input.endAt===''?null:timestamp(input.endAt,'Mission end');
 const at=typeof now==='function'?now():now;
 if(!finite(at))throw Error('The context clock is invalid.');
 if((startAt===null)!==(endAt===null))throw Error('Supply both mission start and end, or leave both unknown.');
 if(startAt!==null&&(Date.parse(endAt)<Date.parse(startAt)||Date.parse(endAt)-Date.parse(startAt)>DAY||Date.parse(startAt)<at-5*DAY||Date.parse(endAt)>at+7*DAY))throw Error('Use an ordered mission window of at most 24 hours, within five days back and seven days ahead.');
 return {geometry:structuredClone(input.geometry),home:home?[...home]:null,sceneId,startAt,endAt};
}
export function validateMissionContextRequest(input,options={}){try{return normalizedInput(input,options);}catch(error){throw Object.assign(new Error(error.message),{code:'GEE_CONTEXT_INPUT_INVALID',status:422});}}

export function missionContextSamplePoints(request){
 const geometry=request.geometry,ring=geometry.coordinates[0].slice(0,-1),points=[];
 const add=(coordinates,home=false)=>{if(!home&&!pointWithin(coordinates,geometry))return;const existing=points.find(p=>distance(p.coordinates,coordinates)<.01);if(existing){if(home)existing.home=true;return;}if(points.length<MAX_SAMPLES)points.push({coordinates:[...coordinates],home});};
 if(request.home)add(request.home,true);
 const count=Math.min(24,ring.length);for(let i=0;i<count;i++)add(ring[Math.floor(i*ring.length/count)]);
 const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
 for(let y=0;y<7;y++)for(let x=0;x<7;x++)add([bounds[0]+(x+.5)/7*(bounds[2]-bounds[0]),bounds[1]+(y+.5)/7*(bounds[3]-bounds[1])]);
 return points;
}
function terrainExpression(request){
 const points=missionContextSamplePoints(request);
 return {result:'result',values:{
  image:rename(select(mosaic(GEE_MISSION_DATASETS.terrain.id,request.geometry,request.home),['DEM']),'elevation'),
  points:f('Collection',{features:array(points.map((p,i)=>f('Feature',{geometry:point(p.coordinates),metadata:c({sample_index:i})})))}),
  result:f('Image.reduceRegions',{image:ref('image'),collection:ref('points'),reducer:f('Reducer.setOutputs',{reducer:f('Reducer.first'),outputs:c(['elevation'])}),scale:c(30),crs:f('Projection',{crs:c('EPSG:4326')}),maxPixelsPerRegion:c(4)})
 }};
}
function landcoverExpression(request){
 const land=unmask(select(mosaic(GEE_MISSION_DATASETS.landcover.id,request.geometry),['Map']));
 const known=[10,20,30,40,50,60,70,80,90,95,100].map(value=>binary('eq',ref('land'),value)).reduce(or);
 return {result:'result',values:{land,known,
  areas:bands([rename(f('Image.pixelArea'),'total_m2'),rename(areaImage(ref('known')),'mapped_m2'),rename(areaImage(binary('eq',ref('land'),80)),'water_m2'),rename(areaImage(binary('eq',ref('land'),95)),'mangrove_m2'),rename(areaImage(and(ref('known'),and(binary('neq',ref('land'),80),binary('neq',ref('land'),95)))),'land_m2')]),
  result:reduction(ref('areas'),request.geometry,10)
 }};
}
function qualityExpression(request){
 const id=request.sceneId.slice(4),index=id.slice(id.lastIndexOf('/')+1),image=f('Image.load',{id:c(id)});
 const clouds=f('Collection.filter',{collection:f('ImageCollection.load',{id:c(GEE_MISSION_DATASETS.quality.id)}),filter:f('Filter.equals',{leftField:c('system:index'),rightValue:c(index)})});
 const hasProbability=f('Number.gt',{left:f('Collection.size',{collection:ref('clouds')}),right:c(0)});
 const choose=(yes,no)=>f('If',{condition:ref('hasProbability'),trueCase:yes,falseCase:no});
 const probability=select(f('ImageCollection.mosaic',{collection:ref('clouds')}),['probability']);
 const scl=select(ref('image'),['SCL']),rgb=select(ref('image'),['B4','B3','B2']);
 const rgbValid=binary('gt',unmask(f('Image.reduce',{image:mask(rgb),reducer:f('Reducer.min')})),0);
 const probabilityKnown=binary('gt',unmask(mask(ref('probability'))),0),sclKnown=and(and(binary('gte',ref('scl'),2),binary('lte',ref('scl'),11)),binary('neq',ref('scl'),7));
 const probabilityCloud=binary('gte',unmask(ref('probability')),65),sclCloud=[3,8,9,10,11].map(value=>binary('eq',ref('scl'),value)).reduce(or);
 return {result:'result',values:{image,clouds,hasProbability,probability,scl,rgbValid,
  classified:and(ref('rgbValid'),choose(probabilityKnown,unmask(sclKnown))),
  cloudy:and(ref('classified'),choose(probabilityCloud,unmask(sclCloud))),
  areas:bands([rename(f('Image.pixelArea'),'total_m2'),rename(areaImage(ref('rgbValid')),'image_m2'),rename(areaImage(ref('classified')),'classified_m2'),rename(areaImage(ref('cloudy')),'cloud_m2'),rename(areaImage(and(ref('classified'),binary('eq',ref('cloudy'),0))),'clear_m2')]),
  result:dictionary({sceneId:f('Image.id',{element:ref('image')}),acquiredMs:f('Element.get',{object:ref('image'),property:c('system:time_start')}),sceneCloudPct:f('Element.get',{object:ref('image'),property:c('CLOUDY_PIXEL_PERCENTAGE')}),coversAOI:f('Geometry.contains',{left:f('Image.geometry',{feature:ref('image')}),right:polygon(request.geometry),maxError:f('ErrorMargin',{value:c(1)})}),hasProbability:ref('hasProbability'),stats:reduction(ref('areas'),request.geometry,20)})
 }};
}
function forecastExpression(request,now){
 const start=Date.parse(request.startAt),end=Math.min(Date.parse(request.endAt),start+3*HOUR),anchor=missionContextSamplePoints({...request,home:null}).find(p=>pointWithin(p.coordinates,request.geometry)).coordinates;
 const filters=[f('Filter.greaterThanOrEquals',{leftField:c('creation_time'),rightValue:c(now-DAY)}),f('Filter.lessThanOrEquals',{leftField:c('creation_time'),rightValue:c(now)}),f('Filter.greaterThanOrEquals',{leftField:c('forecast_time'),rightValue:c(start)}),f('Filter.lessThanOrEquals',{leftField:c('forecast_time'),rightValue:c(end)})];
 const candidates=f('Collection.filter',{collection:f('ImageCollection.load',{id:c(GEE_MISSION_DATASETS.forecast.id)}),filter:f('Filter.and',{filters:array(filters)})});
 const newest=f('AggregateFeatureCollection.max',{collection:ref('candidates'),property:c('creation_time')});
 const latest=f('Collection.filter',{collection:ref('candidates'),filter:f('Filter.equals',{leftField:c('creation_time'),rightValue:ref('newest')})});
 const selected=f('Collection.first',{collection:f('Collection.limit',{collection:ref('latest'),limit:c(1),key:c('forecast_time'),ascending:c(true)})});
 return {result:'result',values:{candidates,newest,latest,image:selected,
  result:f('If',{condition:f('Number.gt',{left:f('Collection.size',{collection:ref('candidates')}),right:c(0)}),trueCase:dictionary({available:c(true),modelRunMs:f('Element.get',{object:ref('image'),property:c('creation_time')}),validMs:f('Element.get',{object:ref('image'),property:c('forecast_time')}),values:f('Image.reduceRegion',{image:select(ref('image'),['u_component_of_wind_10m_above_ground','v_component_of_wind_10m_above_ground','gust']),reducer:f('Reducer.first'),geometry:point(anchor),scale:c(27830),crs:f('Projection',{crs:c('EPSG:4326')}),bestEffort:c(false),maxPixels:c(4)})}),falseCase:dictionary({available:c(false)})})
 }};
}
/** Fixed expressions are exported for schema tests; HTTP callers cannot provide expressions. */
export function missionContextExpressions(request,{now=Date.now()}={}){return {terrain:terrainExpression(request),landcover:landcoverExpression(request),quality:request.sceneId?qualityExpression(request):null,forecast:request.startAt?forecastExpression(request,typeof now==='function'?now():now):null};}

const emptyTerrain=()=>({state:'unavailable',datasetId:GEE_MISSION_DATASETS.terrain.id,verticalDatum:'EGM2008',resolutionM:30,sourceUrl:GEE_MISSION_DATASETS.terrain.sourceUrl,period:GEE_MISSION_DATASETS.terrain.period,samples:[],homeElevationM:null,minElevationM:null,maxElevationM:null,warnings:['Historical 30 m surface-model estimates are not verified launch altitude or obstacle-clearance data.']});
const emptyLand=()=>({state:'unavailable',datasetId:GEE_MISSION_DATASETS.landcover.id,year:2021,resolutionM:10,sourceUrl:GEE_MISSION_DATASETS.landcover.sourceUrl,areaM2:null,coveragePct:null,waterPct:null,mangrovePct:null,landPct:null,unknownPct:null,waterAreaM2:null,mangroveAreaM2:null,warnings:['WorldCover is a historical 2021 classification; it does not establish today’s shoreline, channel flow or legal flight restrictions.']});
const emptyQuality=request=>({state:request.sceneId?'unavailable':'not_requested',sceneId:request.sceneId,acquiredAt:null,method:null,resolutionM:null,sourceUrl:GEE_MISSION_DATASETS.quality.sourceUrl,coveragePct:null,imageCoveragePct:null,cloudPct:null,clearPct:null,unknownPct:null,warnings:[]});
const emptyForecast=request=>({state:request.startAt?'unavailable':'not_requested',datasetId:GEE_MISSION_DATASETS.forecast.id,scope:'takeoff_reference_only',referenceHeightM:10,resolutionM:27830,sourceUrl:GEE_MISSION_DATASETS.forecast.sourceUrl,modelRunAt:null,validAt:null,windEastMps:null,windNorthMps:null,windSpeedMps:null,windFromDeg:null,gustMps:null,warnings:['GFS is a regional 10 m takeoff-time reference, not measured 50 m flight wind or full-mission weather coverage.']});
const parsedNumber=(value,min,max)=>value==null?null:finite(value)&&value>=min&&value<=max?value:(()=>{throw Error('Invalid numerical GEE result.');})();
function terrainResult(result,request){
 const out=emptyTerrain(),points=missionContextSamplePoints(request),features=result?.features;
 if(result?.type!=='FeatureCollection'||!Array.isArray(features)||features.length!==points.length)throw Error('Invalid terrain samples.');
 const rows=new Map();for(const feature of features){const i=feature?.properties?.sample_index;if(feature?.type!=='Feature'||!Number.isInteger(i)||i<0||i>=points.length||rows.has(i))throw Error('Invalid terrain identifiers.');rows.set(i,parsedNumber(feature.properties.elevation,-12000,10000));}
 out.samples=points.map((p,i)=>({longitude:p.coordinates[0],latitude:p.coordinates[1],elevationM:rows.get(i),role:p.home?'home':'area'}));
 const elevations=out.samples.filter(p=>pointWithin([p.longitude,p.latitude],request.geometry)).map(p=>p.elevationM).filter(finite);
 if(out.samples.some(p=>finite(p.elevationM)))out.state='ready';
 if(elevations.length){out.minElevationM=Math.min(...elevations);out.maxElevationM=Math.max(...elevations);}
 if(request.home){const home=out.samples.find(p=>p.role==='home');out.homeElevationM=home?.elevationM??null;}
 if(out.samples.some(p=>p.elevationM===null))out.warnings.push('Some terrain samples are masked or unavailable; missing elevation is not zero.');
 return out;
}
function areaStats(result,names){
 if(!record(result))throw Error('Invalid GEE area result.');
 const total=parsedNumber(result.total_m2,0,MAX_AREA*1.05);if(total===null||total<=0)throw Error('GEE area coverage is unavailable.');
 const values={};for(const name of names){const value=parsedNumber(result[name],0,total*1.001);if(value===null)throw Error('GEE area coverage is incomplete.');values[name]=Math.min(value,total);}
 return {total,...values};
}
function landResult(result){
 const out=emptyLand(),s=areaStats(result,['mapped_m2','water_m2','mangrove_m2','land_m2']);
 if(Math.abs(s.water_m2+s.mangrove_m2+s.land_m2-s.mapped_m2)>Math.max(1,s.total*.001))throw Error('Invalid land-cover area partition.');
 out.areaM2=s.total;out.coveragePct=s.mapped_m2/s.total*100;out.unknownPct=100-out.coveragePct;
 if(s.mapped_m2<=0){out.warnings.push('No mapped land-cover pixels cover this area.');return out;}
 Object.assign(out,{state:'ready',waterPct:s.water_m2/s.total*100,mangrovePct:s.mangrove_m2/s.total*100,landPct:s.land_m2/s.total*100,waterAreaM2:s.water_m2,mangroveAreaM2:s.mangrove_m2});
 return out;
}
function qualityResult(result,request,now){
 const out=emptyQuality(request);
 const expectedId=request.sceneId.slice(4),shortId=expectedId.slice(expectedId.lastIndexOf('/')+1);
 const sourceId=result?.sceneId===shortId?'COPERNICUS/S2_SR_HARMONIZED/'+shortId:result?.sceneId;
 if(!record(result)||sourceId!==expectedId||result.coversAOI!==true||typeof result.hasProbability!=='boolean')throw Error('Selected image identity or coverage is invalid.');
 const acquired=parsedNumber(result.acquiredMs,Date.UTC(2017,2,28),now+5*60000),cloud=parsedNumber(result.sceneCloudPct,0,100);
 if(acquired===null||cloud===null)throw Error('Selected image metadata is unavailable.');
 // The product index timestamp is not the granule's system:time_start. Retain
 // that source metadata exactly; the client binds it to the reviewed scene.
 const s=areaStats(result.stats,['image_m2','classified_m2','cloud_m2','clear_m2']);
 if(s.classified_m2>s.image_m2+Math.max(1,s.total*.001)||Math.abs(s.cloud_m2+s.clear_m2-s.classified_m2)>Math.max(1,s.total*.001))throw Error('Invalid image-quality area partition.');
 Object.assign(out,{acquiredAt:new Date(acquired).toISOString(),sceneCloudPct:cloud,method:result.hasProbability?'S2_cloud_probability_threshold_65':'S2_SCL_cloud_shadow_snow_fallback',resolutionM:20,coveragePct:s.classified_m2/s.total*100,imageCoveragePct:s.image_m2/s.total*100,cloudPct:s.cloud_m2/s.total*100,clearPct:s.clear_m2/s.total*100,unknownPct:100-s.classified_m2/s.total*100});
 if(s.classified_m2>0)out.state='ready';
 out.warnings.push('AOI quality uses a 20 m analysis grid. Cloud probability is a thresholded model estimate; unknown pixels are not counted as clear.');
 if(!result.hasProbability)out.warnings.push('Cloud-probability matching data is unavailable; SCL cloud, shadow and snow classes are used at their native 20 m resolution; unclassified pixels remain Unknown.');
 return out;
}
function forecastResult(result,request,now){
 const out=emptyForecast(request);if(result?.available===false){out.warnings.push('No fresh GFS run covers a takeoff reference within the requested window.');return out;}
 if(result?.available!==true||!record(result.values))throw Error('Invalid GFS reference.');
 const run=parsedNumber(result.modelRunMs,Date.UTC(2015,6,1),now),valid=parsedNumber(result.validMs,Date.parse(request.startAt),Math.min(Date.parse(request.endAt),Date.parse(request.startAt)+3*HOUR));
 if(run===null||valid===null||now-run>=DAY||run>valid)throw Error('GFS run is stale or outside the mission window.');
 const u=parsedNumber(result.values.u_component_of_wind_10m_above_ground,-100,100),v=parsedNumber(result.values.v_component_of_wind_10m_above_ground,-100,100),gust=parsedNumber(result.values.gust,0,150);
 out.modelRunAt=new Date(run).toISOString();out.validAt=new Date(valid).toISOString();
 if(u===null||v===null){out.warnings.push('The GFS reference vector is masked or unavailable.');return out;}
 const speed=Math.hypot(u,v);if(speed>100)throw Error('Invalid GFS speed.');
 Object.assign(out,{state:'ready',windEastMps:u,windNorthMps:v,windSpeedMps:speed,windFromDeg:speed<1e-12?0:(Math.atan2(-u,-v)*180/Math.PI+360)%360,gustMps:gust});
 if(gust===null)out.warnings.push('The GFS gust is unavailable; calm gusts are not assumed.');
 return out;
}
async function slot(fetchImpl,signal){
 let s=slotsByFetch.get(fetchImpl);if(!s){s={active:0,queue:[]};slotsByFetch.set(fetchImpl,s);}
 if(signal.aborted)throw Error('Context request cancelled.');
 if(s.active>=2){if(s.queue.length>=16)throw Error('Context queue busy.');await new Promise((resolve,reject)=>{const entry={resolve:()=>{signal.removeEventListener('abort',abort);resolve();}},abort=()=>{const i=s.queue.indexOf(entry);if(i>=0)s.queue.splice(i,1);reject(Error('Context request cancelled.'));};s.queue.push(entry);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}else s.active++;
 return ()=>{const next=s.queue.shift();if(next)next.resolve();else s.active--;};
}
async function readJSON(response){
 if(!response.ok){if(response.status===401)invalidateGEEToken();throw diagnosticProblem(response.status,await upstreamReason(response));}
 if(Number(response.headers.get('content-length'))>MAX_JSON)throw diagnosticProblem(response.status,'RESPONSE_BODY_TOO_LARGE');
 const reader=response.body?.getReader();if(!reader)throw diagnosticProblem(response.status,'RESPONSE_BODY_UNAVAILABLE');const chunks=[];let count=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>MAX_JSON)throw diagnosticProblem(response.status,'RESPONSE_BODY_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(count);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw diagnosticProblem(response.status,'RESPONSE_JSON_INVALID');}
 if(!record(value)||!Object.hasOwn(value,'result'))throw diagnosticProblem(response.status,'RESPONSE_RESULT_MISSING');return value.result;
}
async function compute(env,kind,expression,fetchImpl,signal){
 const release=await slot(fetchImpl,signal);let abort;
 const cancelled=new Promise((_,reject)=>{abort=()=>reject(Error('Context request cancelled.'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
 const run=async()=>{const token=await accessToken(env.GEE_SERVICE_ACCOUNT_JSON,fetchImpl,signal);if(signal.aborted)throw Error('Context request cancelled.');const response=await fetchImpl('https://earthengine.googleapis.com/v1/projects/'+env.GEE_PROJECT_ID+'/value:compute',{method:'POST',cache:'no-store',redirect:'error',signal,headers:{Authorization:'Bearer '+token,'X-Goog-User-Project':env.GEE_PROJECT_ID,'Content-Type':'application/json'},body:JSON.stringify({expression,workloadTag:'xedo-context-'+kind})});return readJSON(response);};
 try{return await Promise.race([run(),cancelled]);}finally{signal.removeEventListener('abort',abort);release();}
}
function initial(request,now){return {schema_version:'xedo-gee-mission-context/1',state:'unavailable',fetchedAt:new Date(now).toISOString(),expiresAt:new Date(now+TTL).toISOString(),request,terrain:emptyTerrain(),landcover:emptyLand(),quality:emptyQuality(request),forecast:emptyForecast(request),warnings:['GEE context is advisory. No terrain-following route, launch-altitude confirmation, legal no-go area or aircraft specification is generated.'],hardwareControl:false,releaseControl:false};}
/** Read-only, bounded GEE context. Each independent source can remain Unknown. */
export async function fetchGEEMissionContext(env,input,{fetchImpl=fetch,signal,now=Date.now(),timeoutMs=25000,useCache=true}={}){
 const nowMs=typeof now==='function'?now():now,request=validateMissionContextRequest(input,{now:nowMs}),base=initial(request,nowMs);
 if(signal?.aborted)throw new DOMException('The context lookup was cancelled.','AbortError');
 if(!env?.GEE_PROJECT_ID||!env.GEE_SERVICE_ACCOUNT_JSON)return {...base,state:'not_configured',warnings:[...base.warnings,'GEE server credentials are not configured. Context values remain Unknown.']};
 if(typeof env.GEE_PROJECT_ID!=='string'||!/^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]|[0-9]{6,20})$/.test(env.GEE_PROJECT_ID)||typeof env.GEE_SERVICE_ACCOUNT_JSON!=='string')return {...base,state:'error',warnings:[...base.warnings,'GEE server configuration is invalid.']};
 let cache=scopesByFetch.get(fetchImpl);if(!cache){cache=new Map();scopesByFetch.set(fetchImpl,cache);}
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.GEE_PROJECT_ID+'\0'+env.GEE_SERVICE_ACCOUNT_JSON))),x=>x.toString(16).padStart(2,'0')).join('');
 if(signal?.aborted)throw new DOMException('The context lookup was cancelled.','AbortError');
 const key=digest+'\0'+JSON.stringify(request),cached=useCache&&cache.get(key);if(cached&&Date.parse(cached.expiresAt)>nowMs)return {...structuredClone(cached),cached:true};
 const controller=new AbortController(),cancel=()=>controller.abort(),timeout=setTimeout(cancel,Math.max(1,Math.min(25000,finite(timeoutMs)?timeoutMs:25000)));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 const expressions=missionContextExpressions(request,{now:nowMs}),parsers={terrain:terrainResult,landcover:landResult,quality:qualityResult,forecast:forecastResult};
 try{
  await Promise.all(Object.entries(expressions).filter(([,expression])=>expression).map(async([kind,expression])=>{
   const staticKey=kind==='terrain'||kind==='landcover'?digest+'\0static:'+kind+'\0'+JSON.stringify({geometry:request.geometry,...(kind==='terrain'?{home:request.home}:{})}):null;
   const prior=useCache&&staticKey&&cache.get(staticKey);
   if(prior&&Date.parse(prior.expiresAt)>nowMs){base[kind]=structuredClone(prior.data);return;}
   let phase='compute';
   try{
    const result=await compute(env,kind,expression,fetchImpl,controller.signal);phase='parse';base[kind]=parsers[kind](result,request,nowMs);
    if(useCache&&staticKey&&base[kind].state==='ready'){cache.set(staticKey,{data:structuredClone(base[kind]),expiresAt:new Date(nowMs+TTL).toISOString()});while(cache.size>16)cache.delete(cache.keys().next().value);}
   }catch(error){const detail=diagnosticProblems.get(error);console.warn({event:'XEDO_GEE_CONTEXT_FAILURE',kind,httpStatus:detail?.httpStatus??null,reason:detail?.reason??(phase==='parse'?'RESULT_PARSE_FAILED':controller.signal.aborted?'COMPUTE_CANCELLED':'COMPUTE_FAILED')});const publicError=publicGEEError(error);base[kind].warnings.push(publicError?.message||'GEE '+kind+' lookup is unavailable; values remain Unknown.');}
  }));
  if(signal?.aborted)throw new DOMException('The context lookup was cancelled.','AbortError');
  if(controller.signal.aborted)base.warnings.push('The GEE context lookup deadline elapsed. Completed parts are retained; incomplete parts remain Unknown.');
  const requested=Object.keys(expressions).filter(key=>expressions[key]),ready=requested.filter(key=>base[key].state==='ready');
  base.state=ready.length===0?'unavailable':ready.length===requested.length&&base.terrain.samples.every(p=>p.elevationM!==null)&&base.landcover.coveragePct>=99&&(!request.sceneId||base.quality.coveragePct>=99)?'complete':'partial';
  if(base.forecast.state==='ready')base.expiresAt=new Date(Math.min(Date.parse(base.expiresAt),Date.parse(base.forecast.modelRunAt)+DAY)).toISOString();
  if(useCache&&ready.length===requested.length){cache.set(key,structuredClone(base));while(cache.size>16)cache.delete(cache.keys().next().value);}
  return structuredClone(base);
 }finally{clearTimeout(timeout);controller.abort();signal?.removeEventListener('abort',cancel);}
}
