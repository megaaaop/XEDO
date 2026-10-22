import proj4 from 'proj4';
import {validateGeometry} from './domain.js';

const MAX_SECONDS=24*60*60,MAX_METRES=100000;
const absent=value=>value===undefined||value===null;
const defaults={alpha:0.03,alphaMin:0.025,alphaMax:0.04,marginM:0};
const warnings=[
  'Trial scenario only. This is not a validated oil-spill forecast or a probability/confidence region.',
  'The supplied boundary is a scenario starting area. This calculation does not confirm oil, establish its actual extent or infer thickness.',
  'Constant supplied surface-current and 10 m wind vectors are assumed over the whole area and time interval. Their freshness and accuracy have not been verified.',
  'The envelope is a conservative axis-aligned box in a local UTM grid, not the physical union or measured extent of oil.',
  'Diffusion, waves, shoreline stranding, refloating and weathering are not modelled. Spatial coverage alone does not prove that a moving slick will be photographed.',
  'No flight or material-release command is generated.'
];

function number(value,name,min=-Infinity,max=Infinity){
  if(absent(value))return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be a finite number between ${min} and ${max}.`);
  return value;
}
function timestamp(value,name){
  if(absent(value))return null;
  if(typeof value!=='string')throw new Error(`${name} must be an ISO 8601 timestamp with a timezone.`);
  const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!parts)throw new Error(`${name} must be an ISO 8601 timestamp with a timezone.`);
  const [,year,month,day,hour,minute,second='0']=parts,date=new Date(0);
  date.setUTCFullYear(Number(year),Number(month)-1,Number(day));
  if(date.getUTCFullYear()!==Number(year)||date.getUTCMonth()!==Number(month)-1||date.getUTCDate()!==Number(day)||Number(hour)>23||Number(minute)>59||Number(second)>59||!Number.isFinite(Date.parse(value)))throw new Error(`${name} is not a valid timestamp.`);
  return new Date(value).toISOString();
}
function requireValue(value,label,missing){if(value===null)missing.push(label);}
function extent(ring){return [Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];}
function boundedExtent(bounds,label){if(bounds[2]-bounds[0]>MAX_METRES||bounds[3]-bounds[1]>MAX_METRES)throw new Error(`${label} exceeds the 100 km extent limit. Split the trial area or shorten the time window.`);}
function feature(geometry,role,properties={}){return {type:'Feature',geometry:structuredClone(geometry),properties:{role,valueKind:'assumed',...properties}};}

/** Pure, bounded constant-vector trial calculation. No data fetching or control. */
export function calculateDrift(geometry,settings={}){
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw new Error('Drift settings must be an object.');
  const input={};
  for(const key of ['observedAt','arriveAt','endAt'])input[key]=timestamp(settings[key],key);
  for(const key of ['currentEastMps','currentNorthMps'])input[key]=number(settings[key],key);
  input.windSpeedMps=number(settings.windSpeedMps,'Wind speed (m/s)',0);
  input.windFromDeg=number(settings.windFromDeg,'Wind FROM direction (degrees true)',0,360);
  for(const key of ['alpha','alphaMin','alphaMax'])input[key]=number(settings[key]===undefined?defaults[key]:settings[key],key,0,1);
  input.marginM=number(settings.marginM===undefined?defaults.marginM:settings.marginM,'Margin (m)',0,MAX_METRES);
  if(input.alphaMin!==null&&input.alphaMax!==null&&input.alphaMin>input.alphaMax)throw new Error('alphaMin must not exceed alphaMax.');
  if(input.alpha!==null&&((input.alphaMin!==null&&input.alpha<input.alphaMin)||(input.alphaMax!==null&&input.alpha>input.alphaMax)))throw new Error('Nominal alpha must lie within alphaMin and alphaMax.');
  const times=Object.fromEntries(['observedAt','arriveAt','endAt'].map(key=>[key,input[key]===null?null:Date.parse(input[key])]));
  if(times.observedAt!==null&&times.arriveAt!==null&&times.arriveAt<times.observedAt)throw new Error('Arrival must not precede the observation.');
  if(times.arriveAt!==null&&times.endAt!==null&&times.endAt<times.arriveAt)throw new Error('Survey end must not precede arrival.');
  if(times.observedAt!==null&&times.endAt!==null){if(times.endAt<times.observedAt)throw new Error('Survey end must not precede the observation.');if((times.endAt-times.observedAt)/1000>MAX_SECONDS)throw new Error('The trial drift horizon must not exceed 24 hours from observation.');}
  if(times.observedAt!==null&&times.arriveAt!==null&&(times.arriveAt-times.observedAt)/1000>MAX_SECONDS)throw new Error('The trial drift horizon must not exceed 24 hours from observation.');

  let originalGeometry=null,projection=null,ring=null,converter=null;
  if(!absent(geometry)){
    validateGeometry(geometry);originalGeometry=structuredClone(geometry);
    const bounds=extent(geometry.coordinates[0]),centre=[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];
    if(bounds[1]<-80||bounds[3]>80||bounds[2]-bounds[0]>180)throw new Error('Trial drift requires latitudes within ±80° and no date-line crossing.');
    const zone=Math.max(1,Math.min(60,Math.floor((centre[0]+180)/6)+1)),south=centre[1]<0;
    const definition=`+proj=utm +zone=${zone} ${south?'+south ':''}+datum=WGS84 +units=m +no_defs`;
    converter=proj4('EPSG:4326',definition);ring=geometry.coordinates[0].map(p=>converter.forward(p));boundedExtent(extent(ring),'Source area');
    // Rotate geographic east/north to the local UTM axes at the area centre.
    const origin=converter.forward(centre),step=centre[0]>179.999?-0.00001:0.00001,adjacent=converter.forward([centre[0]+step,centre[1]]);
    const angle=Math.atan2((adjacent[1]-origin[1])*Math.sign(step),(adjacent[0]-origin[0])*Math.sign(step));
    projection={calculationCrs:`EPSG:${(south?32700:32600)+zone}`,definition,units:'metres',centre,eastAxis:[Math.cos(angle),Math.sin(angle)],northAxis:[-Math.sin(angle),Math.cos(angle)]};
  }
  const missing=[];
  if(!originalGeometry)missing.push('Observed slick polygon');
  const labels={observedAt:'Observation time',arriveAt:'Arrival time',endAt:'Survey end time',currentEastMps:'Surface current east (m/s)',currentNorthMps:'Surface current north (m/s)',windSpeedMps:'10 m wind speed (m/s)',windFromDeg:'Wind FROM direction (degrees true)',alpha:'Nominal windage',alphaMin:'Minimum windage',alphaMax:'Maximum windage',marginM:'Margin (m)'};
  for(const [key,label]of Object.entries(labels))requireValue(input[key],label,missing);
  const assumptions={kind:'project_assumptions',windReferenceHeightM:10,windDirectionConvention:'FROM degrees clockwise from true north',currentConvention:'east/north, direction TO',windage:{nominal:input.alpha,min:input.alphaMin,max:input.alphaMax,calibrated:false},marginM:input.marginM,environmentVerified:false,model:'constant-vector translation in a local UTM grid; projection scale distortion is not corrected',envelope:'axis-aligned swept bounding box for arriveAt through endAt',sourceNote:'Project trial settings; not a NOAA-validated site profile.'};
  const formulas={windEastMps:'-windSpeedMps * sin(windFromDeg * pi / 180)',windNorthMps:'-windSpeedMps * cos(windFromDeg * pi / 180)',eastM:'(currentEastMps + alpha * windEastMps) * secondsSinceObservation',northM:'(currentNorthMps + alpha * windNorthMps) * secondsSinceObservation',envelope:'UTM min/max of source vertices shifted at arrival/end and alphaMin/alpha/alphaMax, expanded by marginM on each axis'};
  const base={schema_version:'xedo-trial-drift/1',state:missing.length?'incomplete':'assumption_based',missing,inputs:input,originalGeometry,geometry:null,nominalGeometry:null,nominalArriveGeometry:null,features:{type:'FeatureCollection',features:[]},displacement:null,arrivalDisplacement:null,scenarios:[],projection,validFrom:input.observedAt,validTo:input.endAt,envelopeWindow:{from:input.arriveAt,to:input.endAt},formulas,assumptions,warnings:[...warnings],hardwareControl:false,releaseControl:false};
  if(missing.length)return base;
  const direction=input.windFromDeg*Math.PI/180,windEast=-input.windSpeedMps*Math.sin(direction),windNorth=-input.windSpeedMps*Math.cos(direction);
  const shift=(at,alpha)=>{
    const seconds=(Date.parse(at)-times.observedAt)/1000,rawEast=seconds===0?0:(input.currentEastMps+alpha*windEast)*seconds,rawNorth=seconds===0?0:(input.currentNorthMps+alpha*windNorth)*seconds;
    const eastM=rawEast===0?0:rawEast,northM=rawNorth===0?0:rawNorth,distanceM=Math.hypot(eastM,northM);
    if(!Number.isFinite(distanceM)||distanceM>MAX_METRES)throw new Error('A scenario shift exceeds the 100 km displacement limit. Shorten the trial time window.');
    const offset=[eastM*projection.eastAxis[0]+northM*projection.northAxis[0],eastM*projection.eastAxis[1]+northM*projection.northAxis[1]],shiftedRing=ring.map(p=>[p[0]+offset[0],p[1]+offset[1]]);
    const shiftedGeometry=distanceM===0?structuredClone(originalGeometry):{type:'Polygon',coordinates:[shiftedRing.map(p=>converter.inverse(p))]};
    const bounds=extent(shiftedGeometry.coordinates[0]);
    if(bounds[1]<-80||bounds[3]>80||bounds[0]<-180||bounds[2]>180||bounds[2]-bounds[0]>180||shiftedGeometry.coordinates[0].some((p,index)=>Math.abs(p[0]-originalGeometry.coordinates[0][index][0])>180))throw new Error('A shifted polygon leaves the supported latitude or date-line bounds.');
    return {at,alpha,eastM,northM,distanceM,geometry:shiftedGeometry,localRing:shiftedRing};
  };
  const arrive=shift(input.arriveAt,input.alpha),end=shift(input.endAt,input.alpha),scenarios=[];
  for(const [phase,at] of [['arrive',input.arriveAt],['end',input.endAt]])for(const [windage,alpha] of [['low',input.alphaMin],['nominal',input.alpha],['high',input.alphaMax]]){
    scenarios.push({phase,windage,...shift(at,alpha)});
  }
  const bounds=extent(scenarios.flatMap(s=>s.localRing));
  bounds[0]-=input.marginM;bounds[1]-=input.marginM;bounds[2]+=input.marginM;bounds[3]+=input.marginM;boundedExtent(bounds,'Swept envelope');
  const [west,south,east,north]=bounds,envelope={type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]].map(p=>converter.inverse(p))]};
  const envelopeBounds=extent(envelope.coordinates[0]);
  if(envelopeBounds[1]<-80||envelopeBounds[3]>80||envelopeBounds[0]<-180||envelopeBounds[2]>180||envelopeBounds[2]-envelopeBounds[0]>180)throw new Error('The envelope leaves the supported latitude or date-line bounds.');
  const publicScenarios=scenarios.map(({localRing,...scenario})=>scenario),displacement=entry=>({eastM:entry.eastM,northM:entry.northM,distanceM:entry.distanceM});
  return {...base,geometry:envelope,nominalGeometry:end.geometry,nominalArriveGeometry:arrive.geometry,displacement:displacement(end),arrivalDisplacement:displacement(arrive),scenarios:publicScenarios,features:{type:'FeatureCollection',features:[feature(originalGeometry,'observation'),feature(arrive.geometry,'nominal_arrive',{at:input.arriveAt}),feature(end.geometry,'nominal_end',{at:input.endAt}),...publicScenarios.map(s=>feature(s.geometry,'scenario',{phase:s.phase,windage:s.windage,at:s.at,alpha:s.alpha})),feature(envelope,'envelope',{from:input.arriveAt,to:input.endAt,marginM:input.marginM})]}};
}
