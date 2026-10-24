import proj4 from 'proj4';
import {validateGeometry} from './domain.js';
import {buildDeploymentPreview} from './deployment-plan.js';

const EPS=1e-6,MAX_WAYPOINTS=500,MAX_SORTIES=200,MAX_CANDIDATES=2000;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const delta=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const absent=value=>value==null||(typeof value==='string'&&!value.trim());

function number(value,name,min,max,fallback){
  if(value===undefined&&fallback!==undefined)return fallback;
  if(absent(value))return null;
  if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be a finite number between ${min} and ${max}.`);
  return value;
}
function normalize(settings){
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error('Trial settings must be an object.');
  const bounds={sensorWidthMm:[0.01,1000],sensorHeightMm:[0.01,1000],focalLengthMm:[0.01,10000],imageWidthPx:[1,100000],imageHeightPx:[1,100000],sideOverlap:[0,1,0.7],frontOverlap:[0,1,0.8],altitudeM:[5,500,50],speedMps:[0.1,30,5],minTriggerIntervalS:[0.001,3600],windEastMps:[-100,100],windNorthMps:[-100,100],windLimitMps:[0,100],maxAirspeedMps:[0.1,100],usableWh:[0.001,1000000],reserveWh:[0,1000000],powerW:[0.001,1000000],takeoffS:[0,3600],landingS:[0,3600],turnS:[0,600]};
  const out=Object.fromEntries(Object.entries(bounds).map(([name,range])=>[name,number(settings[name],name,...range)]));
  for(const name of ['imageWidthPx','imageHeightPx'])if(out[name]!=null&&!Number.isInteger(out[name]))throw new Error(`${name} must be an integer pixel count.`);
  for(const name of ['sideOverlap','frontOverlap'])if(out[name]===1)throw new Error(`${name} must be in [0, 1).`);
  const home=settings.home;
  if(absent(home))out.home=null;
  else{
    if(!Array.isArray(home)||home.length!==2||!home.every(Number.isFinite)||Math.abs(home[0])>180||Math.abs(home[1])>80)throw new Error('home must be WGS84 [longitude, latitude] between 80 degrees south and north.');
    out.home=[...home];
  }
  if(Object.hasOwn(settings,'windGustMps'))out.windGustMps=number(settings.windGustMps,'windGustMps',0,150);
  if(Object.hasOwn(settings,'windSamples')&&settings.windSamples===null)out.windSamples=null;
  else if(Object.hasOwn(settings,'windSamples')){
    if(!Array.isArray(settings.windSamples)||settings.windSamples.length<1||settings.windSamples.length>150)throw new Error('windSamples must contain 1–150 east/north vectors.');
    out.windSamples=settings.windSamples.map(sample=>{
      if(!sample||typeof sample!=='object'||Array.isArray(sample))throw new Error('Each wind sample must be an object.');
      const eastMps=number(sample.eastMps,'Sample east wind m/s',-100,100),northMps=number(sample.northMps,'Sample north wind m/s',-100,100);
      if(eastMps===null||northMps===null)throw new Error('Each wind sample requires finite east/north vectors.');
      const gustMps=sample.gustMps==null?null:number(sample.gustMps,'Sample gust m/s',0,150);
      return {eastMps,northMps,...(gustMps===null?{}:{gustMps})};
    });
  }
  return out;
}

function contains(point,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i],edge=delta(b,a),offset=delta(point,a);
    if(Math.abs(cross(edge,offset))<=EPS*Math.max(1,distance(a,b))&&point[0]>=Math.min(a[0],b[0])-EPS&&point[0]<=Math.max(a[0],b[0])+EPS&&point[1]>=Math.min(a[1],b[1])-EPS&&point[1]<=Math.max(a[1],b[1])+EPS)return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
function segmentInside(a,b,ring){
  if(!contains(a,ring)||!contains(b,ring))return false;
  const direction=delta(b,a),length2=direction[0]**2+direction[1]**2;
  if(length2<=EPS**2)return true;
  const cuts=[0,1];
  for(let i=0;i<ring.length-1;i++){
    const c=ring[i],edge=delta(ring[i+1],c),offset=delta(c,a),denominator=cross(direction,edge);
    if(Math.abs(denominator)>EPS){
      const t=cross(offset,edge)/denominator,u=cross(offset,direction)/denominator;
      if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
    }else if(Math.abs(cross(offset,direction))<=EPS*Math.sqrt(length2)){
      for(const p of [c,ring[i+1]]){const d=delta(p,a),t=(d[0]*direction[0]+d[1]*direction[1])/length2;if(t>0&&t<1)cuts.push(t);}
    }
  }
  cuts.sort((x,y)=>x-y);
  for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>1e-12){const t=(cuts[i]+cuts[i-1])/2;if(!contains([a[0]+direction[0]*t,a[1]+direction[1]*t],ring))return false;}
  return true;
}

// The same visibility principle as the geometric preview, with a cache for the
// repeated outbound/return connectors considered during sortie partitioning.
function connectors(ring){
  const vertices=ring.slice(0,-1),cache=new Map();let graph=null;
  return (start,end)=>{
    const key=JSON.stringify([start,end]);if(cache.has(key))return cache.get(key);
    let result;
    if(segmentInside(start,end,ring))result=[end];
    else{
      if(!graph){
        graph=vertices.map(()=>[]);
        for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)if(segmentInside(vertices[i],vertices[j],ring)){const d=distance(vertices[i],vertices[j]);graph[i].push([j,d]);graph[j].push([i,d]);}
      }
      const cost=vertices.map(v=>segmentInside(start,v,ring)?distance(start,v):Infinity),previous=vertices.map(()=>-1),visited=vertices.map(()=>false),endVisible=vertices.map(v=>segmentInside(v,end,ring));
      let best=Infinity,last=-1;
      for(let step=0;step<vertices.length;step++){
        let current=-1;for(let i=0;i<vertices.length;i++)if(!visited[i]&&(current<0||cost[i]<cost[current]))current=i;
        if(current<0||!Number.isFinite(cost[current])||cost[current]>best)break;
        visited[current]=true;
        if(endVisible[current]&&cost[current]+distance(vertices[current],end)<best){best=cost[current]+distance(vertices[current],end);last=current;}
        for(const [next,d] of graph[current])if(!visited[next]&&cost[current]+d<cost[next]){cost[next]=cost[current]+d;previous[next]=current;}
      }
      if(last<0)throw new Error('No interior trial connector could be resolved. Split the area.');
      result=[];for(let i=last;i>=0;i=previous[i])result.push(vertices[i]);result.reverse();result.push(end);
    }
    cache.set(key,result);return result;
  };
}

/** Camera and uniform-power trial calculation. No aircraft or flight readiness claim. */
export function buildTrialFlight(geometry,settings={}){
  validateGeometry(geometry);
  const input=normalize(settings),missing=[],need=names=>{const absentNames=names.filter(name=>input[name]===null);for(const name of absentNames)if(!missing.includes(name))missing.push(name);return absentNames.length===0;};
  const camera={state:'incomplete',footprintAcrossM:null,footprintAlongM:null,gsdXM:null,gsdYM:null,lineSpacingM:null,photoSpacingM:null,triggerIntervalS:null};
  const wind={state:'incomplete',speedMps:null,requiredMaxAirspeedMps:null,windLimitMps:input.windLimitMps,maxAirspeedMps:input.maxAirspeedMps,directionReference:'True east/north, transformed to the local route grid at each leg start/middle/end'};
  const battery={state:'incomplete',model:'uniform-power-fixed-ground-speed',usableWh:input.usableWh,reserveWh:input.reserveWh,budgetWh:null,sorties:[],totalEnergyWh:null,totalDurationS:null,totalDistanceM:null};
  const warnings=['Trial calculation only. Sharp polyline turns are not validated aircraft manoeuvres; obstacles, airspace, terrain and clearance are unassessed.','Camera geometry assumes a nadir camera over a planar surface, with image width across track and image height along track. Actual optics, crop, focus and mounting require verification.','Uniform power at fixed target ground speed is an explicit trial assumption, not a calibrated wind-dependent aircraft power model.'];
  const home={position:input.home?[...input.home]:[...geometry.coordinates[0][0]],assumed:!input.home};
  if(home.assumed)warnings.push('Home is assumed at the first boundary vertex for the diagram. Enter the actual launch/landing home before a battery assessment or export.');
  const result={schema:'xedo-trial-flight/1',state:'incomplete',missing,camera,plan:null,wind,battery,home,settings:input,warnings,hardwareControl:false,releaseControl:false};
  const block=(code,message)=>{result.state='blocked';result.code=code;result.message=message;warnings.push(message);return result;};
  const cameraGeometryReady=need(['sensorWidthMm','sensorHeightMm','focalLengthMm','imageWidthPx','imageHeightPx','sideOverlap','frontOverlap','altitudeM','speedMps']);
  const intervalReady=need(['minTriggerIntervalS']);
  const vectorReady=need(['windEastMps','windNorthMps','windLimitMps','maxAirspeedMps']);
  const sampleMode=Array.isArray(input.windSamples),gustReady=!sampleMode||(input.windGustMps!=null&&input.windSamples.every(sample=>sample.gustMps!=null));
  if(!gustReady)missing.push('windGustMps');
  const windReady=vectorReady&&gustReady;
  const windVectors=[...(sampleMode?input.windSamples:[]),...(input.windEastMps!==null&&input.windNorthMps!==null?[{eastMps:input.windEastMps,northMps:input.windNorthMps}]:[])];
  const maximumWind=windVectors.length?Math.max(...windVectors.map(sample=>Math.hypot(sample.eastMps,sample.northMps))):null;
  const gustValues=[input.windGustMps,...(input.windSamples??[]).map(sample=>sample.gustMps)].filter(value=>typeof value==='number'&&Number.isFinite(value));
  const maximumGust=gustValues.length?Math.max(...gustValues):null;
  const limitingWind=maximumWind===null?null:Math.max(maximumWind,maximumGust??0);
  if(sampleMode){wind.sampleCount=input.windSamples.length;wind.maximumSampleSpeedMps=maximumWind;wind.gustMps=maximumGust;wind.gustReferenceHeightM=10;warnings.push('All supplied model wind vectors are assessed on every route leg. Gust speed is a conservative 10 m proxy; actual flight-height gusts remain unmeasured.');if(!gustReady)warnings.push('Automatic gust coverage is incomplete. Wind and battery assessment remain incomplete.');}

  const batteryReady=need(['usableWh','reserveWh','powerW','takeoffS','landingS','turnS','home']);
  if(input.windEastMps!==null&&input.windNorthMps!==null)wind.speedMps=Math.hypot(input.windEastMps,input.windNorthMps);
  if(!cameraGeometryReady)return result;
  Object.assign(camera,{footprintAcrossM:input.altitudeM*input.sensorWidthMm/input.focalLengthMm,footprintAlongM:input.altitudeM*input.sensorHeightMm/input.focalLengthMm});
  camera.gsdXM=camera.footprintAcrossM/input.imageWidthPx;camera.gsdYM=camera.footprintAlongM/input.imageHeightPx;
  camera.lineSpacingM=camera.footprintAcrossM*(1-input.sideOverlap);camera.photoSpacingM=camera.footprintAlongM*(1-input.frontOverlap);camera.triggerIntervalS=camera.photoSpacingM/input.speedMps;
  camera.maximumGroundSpeedMps=intervalReady?camera.photoSpacingM/input.minTriggerIntervalS:null;
  camera.state=intervalReady?'pass':'incomplete';
  if(camera.lineSpacingM<5||camera.lineSpacingM>1000){camera.state='blocked';return block('CAMERA_SPACING_UNSUPPORTED','Camera-derived line spacing is outside the tested 5–1000 m preview range. Change the explicit camera/overlap/height settings or split the area; spacing was not clamped.');}
  if(intervalReady&&camera.triggerIntervalS+1e-12<input.minTriggerIntervalS){camera.state='blocked';return block('CAMERA_INTERVAL_INFEASIBLE','The camera cannot capture at the required interval. Reduce ground speed or explicitly revise the camera/overlap/height settings.');}
  const plan=buildDeploymentPreview({geometry,altitudeM:input.altitudeM,spacingM:camera.lineSpacingM,speedMps:input.speedMps});result.plan=plan;
  if(plan.status!=='generated')return block(plan.code,plan.message);
  result.state='generated';
  const projection=proj4('EPSG:4326',plan.projection.definition),origin=plan.projection.origin,project=position=>delta(projection.forward(position),origin),ring=plan.localTarget.coordinates[0],homePoint=project(home.position),insideHome=contains(homePoint,ring),findConnector=connectors(ring);
  if(!homePoint.every(Number.isFinite)||distance(homePoint,ring[0])>100000)return block('HOME_TOO_DISTANT','The trial is limited to home within 100 km of the first boundary vertex.');
  if(!insideHome)warnings.push('Home is outside the selected survey area. The direct home-to-boundary transit is unassessed for obstacles and airspace.');
  const work=plan.segments.filter(segment=>segment.purpose==='survey');
  const windLegCache=new Map();
  const airspeed=(a,b,length)=>{
    if(wind.speedMps===null)return null;
    const key=JSON.stringify([a,b]);if(windLegCache.has(key))return windLegCache.get(key);
    const direction=delta(b,a);let required=limitingWind??wind.speedMps;
    if(maximumGust!==null)required=Math.max(required,input.speedMps+maximumGust);
    // UTM grid north is not true north. Project the supplied east/north wind
    // into the local grid rather than silently rotating the wind with the map.
    for(const t of [0,0.5,1]){
      const xy=[a[0]+direction[0]*t+origin[0],a[1]+direction[1]*t+origin[1]],position=projection.inverse(xy),east=delta(projection.forward([position[0]+1e-5,position[1]]),xy),north=delta(projection.forward([position[0],position[1]+1e-5]),xy),eastLength=Math.hypot(...east),northLength=Math.hypot(...north);
      for(const sample of windVectors){
        const wx=sample.eastMps*east[0]/eastLength+sample.northMps*north[0]/northLength,wy=sample.eastMps*east[1]/eastLength+sample.northMps*north[1]/northLength;
        required=Math.max(required,Math.hypot(input.speedMps*direction[0]/length-wx,input.speedMps*direction[1]/length-wy));
      }
    }
    windLegCache.set(key,required);return required;
  };
  const route=(first,last)=>{
    const entries=[{point:homePoint,position:[...home.position],purpose:'transit'}];
    const append=(point,purpose,position)=>{if(distance(entries.at(-1).point,point)>EPS)entries.push({point,position:position?[...position]:projection.inverse([point[0]+origin[0],point[1]+origin[1]]),purpose});};
    const start=plan.localWaypoints[work[first].from];
    if(!insideHome)append(ring[0],'transit',geometry.coordinates[0][0]);
    findConnector(insideHome?homePoint:ring[0],start).forEach(p=>append(p,'transit'));
    for(let i=work[first].from+1;i<=work[last].to;i++)append(plan.localWaypoints[i],plan.waypoints[i].purpose,plan.waypoints[i].position);
    findConnector(entries.at(-1).point,insideHome?homePoint:ring[0]).forEach(p=>append(p,'return'));
    if(!insideHome)append(homePoint,'return',home.position);
    // Preserve the explicitly entered home value without projection round-off.
    entries.at(-1).position=[...home.position];
    let distanceM=0,required=wind.speedMps??0,turnCount=0;
    for(let i=1;i<entries.length;i++){
      const d=distance(entries[i-1].point,entries[i].point),direction=delta(entries[i].point,entries[i-1].point);distanceM+=d;
      if(wind.speedMps!==null)required=Math.max(required,airspeed(entries[i-1].point,entries[i].point,d));
      if(i<entries.length-1){const next=delta(entries[i+1].point,entries[i].point),nextLength=Math.hypot(...next),cosine=(direction[0]*next[0]+direction[1]*next[1])/(d*nextLength);if(cosine<1-1e-10)turnCount++;}
    }
    const travelS=distanceM/input.speedMps,turnDurationS=input.turnS===null?null:turnCount*input.turnS,durationS=input.takeoffS===null||input.landingS===null||turnDurationS===null?null:travelS+input.takeoffS+input.landingS+turnDurationS;
    return {waypoints:entries.map(entry=>({position:entry.position,altitudeM:input.altitudeM,altitudeReference:'AGL',purpose:entry.purpose,dispenser:'off'})),distanceM,durationS,energyWh:durationS===null||input.powerW===null?null:input.powerW*durationS/3600,requiredMaxAirspeedMps:wind.speedMps===null?null:required,phases:{takeoffS:input.takeoffS,landingS:input.landingS,turnCount,turnS:input.turnS,turnDurationS,travelS}};
  };
  const full=route(0,work.length-1);
  const windPass=trip=>windReady&&limitingWind<=input.windLimitMps+1e-9&&trip.requiredMaxAirspeedMps<=input.maxAirspeedMps+1e-9;
  wind.requiredMaxAirspeedMps=full.requiredMaxAirspeedMps;
  wind.state=windReady?(windPass(full)?'pass':'blocked'):'incomplete';
  if(!batteryReady||!windReady){
    if(!windReady)warnings.push('Battery energy is unassessed because wind or aircraft airspeed-limit inputs are missing; calm wind was not assumed.');
    if(wind.state==='blocked')return block('WIND_INFEASIBLE','The trial exceeds the supplied wind limit or required airspeed limit.');
    return result;
  }
  battery.budgetWh=input.usableWh-input.reserveWh;
  if(battery.budgetWh<=0){battery.state='blocked';return block('BATTERY_RESERVE_INFEASIBLE','Usable starting energy must exceed the energy reserved after landing.');}
  if(limitingWind>input.windLimitMps+1e-9){battery.state='incomplete';return block('WIND_INFEASIBLE','The supplied wind exceeds the environmental wind limit.');}
  const sorties=[];let first=0,candidates=0,totalWaypoints=0;
  while(first<work.length){
    let best=null,end=-1;
    for(let last=first;last<work.length;last++){
      if(++candidates>MAX_CANDIDATES){battery.state='blocked';return block('TRIAL_SOLVER_LIMIT','The bounded trial partition solver exceeded its work budget. Split the area.');}
      const candidate=route(first,last);
      if(candidate.energyWh<=battery.budgetWh+1e-9&&windPass(candidate)){best=candidate;end=last;}
    }
    if(!best){battery.state='blocked';return block('SORTIE_INFEASIBLE','No remaining survey segment fits the energy/return/landing reserve and wind limits. Split the area or revise the explicit profile.');}
    totalWaypoints+=best.waypoints.length;
    if(sorties.length>=MAX_SORTIES||totalWaypoints>MAX_WAYPOINTS){battery.state='blocked';return block('TRIAL_ROUTE_LIMIT','Trial sorties exceed 200 sorties or 500 total waypoints including outbound and return. Split the area.');}
    sorties.push({index:sorties.length+1,...best});first=end+1;
  }
  battery.state='pass';battery.sorties=sorties;battery.totalEnergyWh=sorties.reduce((sum,s)=>sum+s.energyWh,0);battery.totalDurationS=sorties.reduce((sum,s)=>sum+s.durationS,0);battery.totalDistanceM=sorties.reduce((sum,s)=>sum+s.distanceM,0);
  wind.requiredMaxAirspeedMps=Math.max(...sorties.map(s=>s.requiredMaxAirspeedMps));wind.state='pass';
  warnings.push('Each sortie starts with a fresh usable-energy budget. Reserve is retained after landing; takeoff, travel, turn time and landing are charged once per sortie.');
  return result;
}
