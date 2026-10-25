import {pointWithin,validateGeometry} from './domain.js';

const DEM='COPERNICUS/DEM/GLO30_2024_1',TTL=600000;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const elevation=value=>finite(value)&&value>=-12000&&value<=10000;
const pair=value=>Array.isArray(value)&&value.length===2&&value.every(finite)&&Math.abs(value[0])<=180&&Math.abs(value[1])<=85;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const samePoint=(a,b)=>pair(a)&&pair(b)&&a.every((value,index)=>Math.abs(value-b[index])<1e-7);
const clone=value=>value==null?value:structuredClone(value);

/** A sampled DSM model check, never a surveyed launch level or flight clearance. */
export function assessPlanningTerrain(report,{geometry=null,home=null,toleranceM=2,now=Date.now()}={}){
 const time=typeof now==='function'?now():now,terrain=report?.terrain,request=report?.request;
 const routePoints=request?.routePoints===undefined?[]:request.routePoints;
 const result={mode:'gee_model',state:'unknown',label:'GEE model assessment unknown',reasons:[],coverage:{known:0,total:0,fraction:0},terrainRangeM:null,homeOffsetM:null,homeElevationM:null,minElevationM:null,maxElevationM:null,toleranceM:finite(toleranceM)&&toleranceM>0?toleranceM:null,toleranceVerified:false,geometry:clone(geometry),home:clone(home),routePoints:clone(routePoints),source:{datasetId:terrain?.datasetId??null,resolutionM:terrain?.resolutionM??null,verticalDatum:terrain?.verticalDatum??null},verticalDatum:terrain?.verticalDatum??null,fetchedAt:report?.fetchedAt??null,expiresAt:report?.expiresAt??null};
 const unknown=reason=>{result.reasons.push(reason);return result;};
 if(!result.toleranceM)return unknown('Set a positive model tolerance; the default 2 m threshold has not been field verified.');
 if(!geometry||!pair(home))return unknown('Select an inspection area and Home position.');
 try{validateGeometry(geometry);}catch{return unknown('The inspection boundary is invalid.');}
 if(!Array.isArray(routePoints)||routePoints.length>24||routePoints.some(point=>!pair(point)))return unknown('The requested terrain route coordinates are invalid.');
 if(!request||!same(request.geometry,geometry)||!samePoint(request.home,home))return unknown('GEE terrain does not match the current inspection area and Home.');
 const fetched=Date.parse(report.fetchedAt),expires=Date.parse(report.expiresAt);
 if(!finite(time)||!Number.isFinite(fetched)||fetched>time+60000||time-fetched>TTL||!Number.isFinite(expires)||expires<=time||expires>fetched+TTL)return unknown('Fresh, time-bounded GEE terrain is required.');
 if(terrain?.state!=='ready'||terrain.datasetId!==DEM||terrain.verticalDatum!=='EGM2008'||terrain.resolutionM!==30||!Array.isArray(terrain.samples)||terrain.samples.length>80)return unknown('The supported 30 m Copernicus surface model and EGM2008 reference are unavailable.');
 const samples=terrain.samples.filter(sample=>pair([sample.longitude,sample.latitude]));
 const coordinate=sample=>[sample.longitude,sample.latitude];
 const isRoute=sample=>routePoints.some(point=>samePoint(point,coordinate(sample)));
 const area=samples.filter(sample=>pointWithin(coordinate(sample),geometry));
 const relevant=samples.filter(sample=>pointWithin(coordinate(sample),geometry)||isRoute(sample)||samePoint(coordinate(sample),home));
 result.coverage={known:relevant.filter(sample=>elevation(sample.elevationM)).length,total:relevant.length,fraction:relevant.length?relevant.filter(sample=>elevation(sample.elevationM)).length/relevant.length:0};
 if(!area.length)return unknown('No terrain samples cover the inspection polygon.');
 if(routePoints.some(point=>!pair(point)||!samples.some(sample=>samePoint(point,coordinate(sample)))))return unknown('Terrain samples for the current route are incomplete.');
 if(relevant.some(sample=>!elevation(sample.elevationM)))return unknown('Some inspection, route or Home samples are unknown; missing elevation is not zero.');
 const homeSample=samples.find(sample=>samePoint(coordinate(sample),home));
 if(!elevation(terrain.homeElevationM)||!homeSample||homeSample.elevationM!==terrain.homeElevationM)return unknown('A matching Home elevation sample is unavailable.');
 const routeAndArea=relevant.filter(sample=>pointWithin(coordinate(sample),geometry)||isRoute(sample)).map(sample=>sample.elevationM);
 result.minElevationM=Math.min(...routeAndArea);result.maxElevationM=Math.max(...routeAndArea);
 result.terrainRangeM=result.maxElevationM-result.minElevationM;result.homeElevationM=terrain.homeElevationM;
 result.homeOffsetM=Math.max(...routeAndArea.map(value=>Math.abs(value-terrain.homeElevationM)));
 if(result.terrainRangeM>toleranceM)result.reasons.push('The sampled surface range exceeds the '+toleranceM+' m model tolerance.');
 if(result.homeOffsetM>toleranceM)result.reasons.push('The sampled route or inspection surface differs from Home by more than '+toleranceM+' m.');
 result.state=result.reasons.length?'review':'ready';result.label=result.state==='ready'?'GEE model within tolerance':'GEE model needs review';
 if(result.state==='ready')result.reasons.push('All requested samples are known and within the '+toleranceM+' m model tolerance.');
 result.reasons.push('The tolerance is unverified. Sparse historical DSM samples do not verify actual ground, vegetation, obstacles or flight clearance.');
 return result;
}
