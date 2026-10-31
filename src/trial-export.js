import proj4 from 'proj4';
import {validateGeometry} from './domain.js';
import {missionWindowProblem} from './planning-time-window.js';
import {EXPORT_PLANNING_PROFILE} from './planning-export-defaults.js';

const VERSION='xedo-qgc-trial/1';
const MAX_SORTIES=40,MAX_WAYPOINTS=500,MAX_TOTAL_WAYPOINTS=5000,MAX_NO_GO=32,MAX_NO_GO_VERTICES=2000;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const position=value=>Array.isArray(value)&&value.length===2&&value.every(finite)&&Math.abs(value[0])<=180&&Math.abs(value[1])<=80;
const text=value=>typeof value==='string'&&value.trim().length>0;
const inputLabels={windLimitMps:'Aircraft wind limit (m/s)',maxAirspeedMps:'Aircraft maximum airspeed (m/s)',usableWh:'Starting usable energy (Wh)',reserveWh:'Final landing reserve (Wh)',powerW:'Assumed power (W)',takeoffS:'Takeoff allowance (s)',landingS:'Landing allowance (s)',turnS:'Turn allowance (s)',windEastMps:'Flight wind east (m/s)',windNorthMps:'Flight wind north (m/s)'};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const isoTime=value=>typeof value==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;

function pointSegmentDistance(point,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;
  const fraction=length2?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length2)):0;
  return distance(point,[a[0]+fraction*dx,a[1]+fraction*dy]);
}
function segmentsTouch(a,b,c,d){
  const tolerance=1e-7;
  const on=(p,x,y)=>pointSegmentDistance(p,x,y)<=tolerance;
  if(on(a,c,d)||on(b,c,d)||on(c,a,b)||on(d,a,b))return true;
  return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
}
function segmentDistance(a,b,c,d){
  return segmentsTouch(a,b,c,d)?0:Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
function inside(point,ring){
  let result=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i];
    if(pointSegmentDistance(point,a,b)<=1e-7)return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
function noGoPolygons(value){
  let polygons;
  if(Array.isArray(value))polygons=value;
  else if(value?.type==='FeatureCollection'&&Array.isArray(value.features))polygons=value.features.map(feature=>{
    if(feature?.type!=='Feature'||!feature.geometry)throw new Error('Every no-go feature must contain a Polygon geometry.');
    return feature.geometry;
  });
  else throw new Error('Supply no-go data as a Polygon array or FeatureCollection; use an explicit empty collection only after review.');
  if(polygons.length>MAX_NO_GO)throw new Error('The trial supports at most 32 no-go polygons.');
  let vertices=0;
  for(const polygon of polygons){
    if(polygon?.type!=='Polygon'||!Array.isArray(polygon.coordinates)||polygon.coordinates.length!==1)throw new Error('The trial supports no-go Polygons with one ring and no holes; other geometry is unsupported.');
    validateGeometry(polygon);
    const ring=polygon.coordinates[0],longitudes=ring.map(point=>point[0]);
    if(ring.some(point=>Math.abs(point[1])>80)||Math.max(...longitudes)-Math.min(...longitudes)>180)throw new Error('No-go polygons must stay between 80° south/north and not cross the date line.');
    vertices+=ring.length-1;
    if(vertices>MAX_NO_GO_VERTICES)throw new Error('The trial supports at most 2000 total no-go vertices.');
  }
  return polygons;
}

/** Checks a user-attested trial export only. It neither contacts an authority nor controls equipment. */
export function checkTrialExport(flight,settings={},nowMs=Date.now()){
  return checkExport(flight,settings,nowMs,false);
}
/** Reference files retain physical review results separately from file checks. */
export function checkPlanningReference(flight,settings={},nowMs=Date.now()){
  return checkExport(flight,settings,nowMs,true);
}
function checkExport(flight,settings={},nowMs=Date.now(),reference=false){
  settings||={};
  const checks=[],missing=[],errors=[];
  const add=(id,state,message)=>{checks.push({id,state,message});if(state==='incomplete')missing.push(message);if(state==='blocked')errors.push(message);};
  const number=(key,label,min,max)=>{
    const value=settings[key];
    if(value==null||value===''){add(key,'incomplete',`Specify ${label}.`);return null;}
    if(!finite(value)||value<min||value>max){add(key,'blocked',`${label} must be a finite number between ${min} and ${max}.`);return null;}
    add(key,'pass',`${label} supplied.`);return value;
  };
  const confirmation=(key,message)=>add(key,settings[key]===true?'pass':'incomplete',settings[key]===true?message:`Confirm ${message.charAt(0).toLowerCase()+message.slice(1)}`);
  const assessment=(id,value,label)=>{
    if(value?.state==='pass')add(id,'pass',`${label} trial calculation is complete.`);
    else if(['blocked','fail'].includes(value?.state))add(id,'blocked',`${label} trial calculation failed${text(value.reason)?': '+value.reason:'.'}`);
    else add(id,'incomplete',`${label} trial calculation is incomplete.`);
  };
  if(flight?.state==='generated'&&flight.plan?.status==='generated')add('plan','pass','Trial route geometry generated.');
  else add('plan',flight?.state==='blocked'||flight?.plan?.status==='blocked'?'blocked':'incomplete','Generate an unblocked trial route first.');
  if(flight?.state==='blocked'&&text(flight.message))add('flight-route','blocked',flight.message);
  for(const error of Array.isArray(flight?.errors)?flight.errors:[]){
    if(!text(error))continue;
    const key=Object.keys(inputLabels).find(key=>error.startsWith(key+' '));
    add('flight-input-validation','blocked',key?inputLabels[key]+error.slice(key.length):error);
  }
  if(Array.isArray(flight?.missing)&&flight.missing.length)add('flight-inputs','incomplete','Complete the missing flight inputs: '+flight.missing.filter(text).map(key=>inputLabels[key]||key).join('; '));
  assessment('camera',flight?.camera,'Camera');assessment('wind',flight?.wind,'Wind');assessment('battery',flight?.battery,'Battery');
  const groundSpeedMps=flight?.settings?.groundSpeedMps??flight?.settings?.speedMps??flight?.plan?.parameters?.speedMps;
  if(groundSpeedMps==null)add('ground-speed','incomplete','Specify the assessed route ground speed.');
  else add('ground-speed',finite(groundSpeedMps)&&groundSpeedMps>=.1&&groundSpeedMps<=30?'pass':'blocked',finite(groundSpeedMps)&&groundSpeedMps>=.1&&groundSpeedMps<=30?'Assessed route ground speed is supplied.':'The assessed route ground speed must be between 0.1 and 30 m/s.');
  const cameraFields=['footprintAcrossM','footprintAlongM','lineSpacingM','photoSpacingM','triggerIntervalS'];
  if(flight?.camera?.state==='pass'&&cameraFields.some(key=>!finite(flight.camera[key])||flight.camera[key]<=0))add('camera-values','blocked','The completed camera assessment has missing or invalid footprint/spacing/trigger values.');
  let home=null;
  if(settings.home==null)add('home','incomplete','Specify the manual takeoff and landing home position.');
  else if(!position(settings.home))add('home','blocked','Home must be a valid [longitude, latitude] position between 80° south/north.');
  else{home=[...settings.home];add('home','pass','Explicit takeoff/landing position supplied.');}
  confirmation('homeConfirmed','The home position has been checked for this trial.');
  if(!reference||settings.terrainMode!=='automatic')confirmation('flatSurfaceConfirmed','The surveyed surface is level with the home/takeoff surface; AGL can be illustrated as height above home.');
  if(reference)confirmation('planningReviewed','The planning assumptions, route, return and terrain findings have been reviewed.');
  else confirmation('airspaceReviewed','The manually supplied constraints have been reviewed for the planned time and area.');
  const homeAmslM=number('homeAmslM','home altitude AMSL (m)',-1000,10000);
  const relativeHeightM=number('relativeHeightM','relative-home height (m)',5,500);
  const ceilingM=number('ceilingM','manual relative-home ceiling (m)',0,10000);
  const corridorM=number('corridorM','requested lateral corridor margin (m)',0,1000);
  if(settings.limitReference!=='relative_home')add('limit-reference',settings.limitReference==null||settings.limitReference===''?'incomplete':'blocked','The trial supports only explicitly declared relative_home ceiling reference.');
  else add('limit-reference','pass','Ceiling is explicitly relative to home.');
  if(relativeHeightM!==null&&ceilingM!==null)add('ceiling',relativeHeightM<=ceilingM?'pass':'blocked',relativeHeightM<=ceilingM?'Requested route height does not exceed the manual ceiling.':'Requested route height exceeds the manual ceiling.');
  const firmware=settings.firmware;
  if(firmware==null||firmware==='')add('firmware','incomplete','Select the intended PX4 or ArduPilot firmware profile.');
  else add('firmware',['PX4','ArduPilot'].includes(firmware)?'pass':'blocked',['PX4','ArduPilot'].includes(firmware)?'Firmware target selected; installed hardware firmware is not proven by this check.':'The trial supports only PX4 or ArduPilot targets, not DJI WPML.');
  const qgcVersion=settings.qgcVersion;
  if(!text(qgcVersion))add('qgc-version','incomplete','Specify the target QGroundControl version.');
  else add('qgc-version',/^v?5\.1(?:\.\d+)?$/.test(qgcVersion)?'pass':'blocked',/^v?5\.1(?:\.\d+)?$/.test(qgcVersion)?'QGroundControl 5.1.x format selected; native import testing remains required.':'This trial adapter targets QGroundControl 5.1.x only.');
  if(!text(settings.source))add('constraint-source','incomplete','Record the source of the manual constraint review.');
  else if(settings.source.length>1000)add('constraint-source','blocked','Constraint source must stay within 1000 characters.');
  else {
    const profile=settings.planningDefaults,source=profile?.fields?.source;
    const planningSource=profile?.version===1&&profile.profileId===EXPORT_PLANNING_PROFILE.id&&source?.mode==='automatic'&&source.value===settings.source&&settings.source===EXPORT_PLANNING_PROFILE.source;
    add('constraint-source','pass',planningSource?'XEDO planning assumptions recorded. Current route and airspace restrictions still require Inspector review.':'Manual source recorded. It is user-attested, not an authoritative provider lookup.');
  }
  const plannedTakeoffMs=isoTime(settings.plannedTakeoffAt),validUntilMs=isoTime(settings.validUntil);
  if(settings.plannedTakeoffAt==null||settings.plannedTakeoffAt==='')add('takeoff-time','incomplete','Specify the planned takeoff time with a UTC offset.');
  else if(plannedTakeoffMs===null)add('takeoff-time','blocked','Planned takeoff time must be a valid ISO timestamp with a UTC offset.');
  else add('takeoff-time',plannedTakeoffMs>=nowMs-60000?'pass':'blocked',plannedTakeoffMs>=nowMs-60000?'Planned takeoff time supplied.':'Planned takeoff time is in the past; regenerate the checks.');
  if(settings.validUntil==null||settings.validUntil==='')add('constraint-validity','incomplete','Specify when the manual constraint review expires.');
  else if(validUntilMs===null)add('constraint-validity','blocked','Constraint validity must be a valid ISO timestamp with a UTC offset.');
  else add('constraint-validity',validUntilMs>nowMs?'pass':'blocked',validUntilMs>nowMs?'Manual review is not yet expired.':'The manual constraint review has expired.');
  let polygons=null;
  if(settings.noGo==null)add('no-go-data',reference?'review':'incomplete',reference?'No-go data is not assessed. No reviewed empty collection or airspace clearance is inferred.':'Supply reviewed no-go polygons, or an explicit empty collection if the review found none.');
  else try{polygons=noGoPolygons(settings.noGo);add('no-go-data','pass',`${polygons.length} manual no-go polygons supplied; these are not an automatically verified airspace database.`);}catch(error){add('no-go-data','blocked',error.message);}
  let targetValid=false;
  try{validateGeometry(flight?.plan?.target);targetValid=true;}catch{add('target','incomplete','A valid exact target polygon is required.');}
  let project=null;
  if(home){
    const zone=Math.max(1,Math.min(60,Math.floor((home[0]+180)/6)+1));
    const converter=proj4('EPSG:4326',`+proj=utm +zone=${zone} ${home[1]<0?'+south ':''}+datum=WGS84 +units=m +no_defs`),origin=converter.forward(home);
    project=point=>{const xy=converter.forward(point),result=[xy[0]-origin[0],xy[1]-origin[1]];if(!result.every(finite))throw new Error('A position cannot be projected into the trial local reference.');return result;};
  }
  const sorties=flight?.battery?.sorties;
  let routeValid=Array.isArray(sorties)&&sorties.length>0&&sorties.length<=MAX_SORTIES,totalWaypoints=0,totalDurationS=0;
  const localRoutes=[];
  if(!Array.isArray(sorties)||!sorties.length)add('sorties','incomplete','Generate battery-assessed sorties with explicit outbound and return paths.');
  else if(sorties.length>MAX_SORTIES)add('sorties','blocked','The trial supports at most 40 sorties.');
  else{
    const ids=new Set();
    for(let index=0;index<sorties.length;index++){
      const sortie=sorties[index],points=sortie?.waypoints,label=`Sortie ${index+1}`;
      if(!Number.isInteger(sortie?.index)||sortie.index<1||ids.has(sortie.index)){add('sortie-index','blocked',`${label} has an invalid or duplicate index.`);routeValid=false;}else ids.add(sortie.index);
      if(!finite(sortie?.durationS)||sortie.durationS<=0||!finite(sortie.distanceM)||sortie.distanceM<=0||!finite(sortie.energyWh)||sortie.energyWh<=0){add('sortie-estimates','blocked',`${label} requires finite positive duration, distance and energy estimates.`);routeValid=false;}else totalDurationS+=sortie.durationS;
      if(!Array.isArray(points)||points.length<2||points.length>MAX_WAYPOINTS){add('sortie-route','blocked',`${label} must have 2–500 waypoints.`);routeValid=false;continue;}
      totalWaypoints+=points.length;
      const invalidPoint=points.some(point=>!position(point?.position)||!finite(point.altitudeM)||point.altitudeReference!=='AGL'||point.dispenser!=='off'||!['transit','survey','return'].includes(point.purpose));
      if(invalidPoint){add('sortie-waypoints','blocked',`${label} contains invalid positions, heights, reference, purpose or material controls.`);routeValid=false;continue;}
      if(!points.some(point=>point.purpose==='survey')){add('sortie-survey','blocked',`${label} contains no assessed survey segment.`);routeValid=false;}
      if(relativeHeightM!==null&&points.some(point=>Math.abs(point.altitudeM-relativeHeightM)>.001)){add('sortie-height','blocked',`${label} heights differ from the confirmed relative-home export height; regenerate the flight plan.`);routeValid=false;}
      if(project)try{
        const local=points.map(point=>project(point.position));
        if(local.some(point=>Math.hypot(...point)>100000))throw new Error(`${label} exceeds the 100 km trial distance from home.`);
        if(distance(local[0],[0,0])>.5||distance(local.at(-1),[0,0])>.5)throw new Error(`${label} must start and end at the confirmed manual home.`);
        if(!position(flight?.home?.position)||flight.home.assumed!==false||distance(project(flight.home.position),[0,0])>.5)throw new Error('Flight home is assumed or differs from the confirmed export home; regenerate the flight plan.');
        localRoutes.push(local);
      }catch(error){add('sortie-home','blocked',error.message);routeValid=false;}
    }
    if(totalWaypoints>MAX_TOTAL_WAYPOINTS){add('route-budget','blocked','The trial supports at most 5000 total sortie waypoints.');routeValid=false;}
    if(routeValid)add('sorties','pass',`${sorties.length} battery-assessed sorties retain explicit outbound and return paths.`);
  }
  let plannedEndMs=null;
  if(plannedTakeoffMs!==null&&routeValid){
    plannedEndMs=Math.max(nowMs,plannedTakeoffMs)+totalDurationS*1000;
    if(settings.plannedEndAt!=null&&settings.plannedEndAt!==''){
      const explicitEnd=isoTime(settings.plannedEndAt);
      if(explicitEnd===null||explicitEnd<plannedTakeoffMs)add('planned-end','blocked','Planned end must be a valid timestamp at or after takeoff.');
      else plannedEndMs=Math.max(plannedEndMs,explicitEnd);
    }
    const windowProblem=missionWindowProblem(new Date(plannedTakeoffMs).toISOString(),new Date(plannedEndMs).toISOString(),{now:nowMs,checkForecastDates:false});
    if(windowProblem)add('mission-window','blocked',windowProblem.message);
    if(validUntilMs!==null)add('time-coverage',validUntilMs>=plannedEndMs?'pass':'blocked',validUntilMs>=plannedEndMs?'Manual constraint validity covers the summed sortie durations and declared end time.':'Manual constraint validity does not cover all planned sorties.');
  }
  if(project&&polygons&&corridorM!==null&&routeValid&&targetValid)try{
    const rings=polygons.map(polygon=>polygon.coordinates[0].map(project));
    let conflict=null;
    for(let sortie=0;sortie<localRoutes.length&&!conflict;sortie++)for(let waypoint=1;waypoint<localRoutes[sortie].length&&!conflict;waypoint++){
      const a=localRoutes[sortie][waypoint-1],b=localRoutes[sortie][waypoint];
      for(let polygon=0;polygon<rings.length&&!conflict;polygon++){
        const ring=rings[polygon];
        if(inside(a,ring)||inside(b,ring)||ring.slice(1).some((point,index)=>segmentDistance(a,b,ring[index],point)<=corridorM+1e-7))conflict={sortie:sortie+1,segment:waypoint,polygon:polygon+1};
      }
    }
    add('no-go-route',conflict?'blocked':'pass',conflict?`Sortie ${conflict.sortie}, segment ${conflict.segment} intersects or touches manual no-go polygon ${conflict.polygon} within the requested ${corridorM} m corridor.`:'All sortie segments, including outbound and return, avoid the supplied no-go polygons and requested corridor.');
  }catch(error){add('no-go-route','blocked',error.message);}
  const state=errors.length?'blocked':missing.length?'incomplete':'pass';
  return {schema_version:VERSION,purpose:reference?'planning_reference':'strict_trial',state,pass:state==='pass',canExport:state==='pass',checks,missing,errors,warnings:[
    ...(reference?['Planning reference: editable aircraft/energy assumptions and relative-Home heights. Terrain review and strict checks remain separate. Airspace is not automatically verified.']:[]),
    'Manual trial checks only. Source, surface and airspace declarations are user-attested; no authority lookup or physical aircraft validation was performed.',
    reference?'Exported heights are relative to Home. They are not constant AGL or terrain-following heights over an uneven surface.':'AGL is mapped to height above home only under the confirmed assumption that the survey surface and takeoff surface share the same level. This is not a terrain-following export.',
    'The corridor is a requested lateral margin, not a verified autopilot turn, navigation-error or obstacle-clearance model.',
    'Manual no-go polygons and the ceiling are checked before export; this file does not configure an onboard geofence or flight-controller ceiling.',
    'The scheduled end sums airborne sortie durations. Additional battery-change or ground delays must be included explicitly in plannedEndAt.',
    'Native QGroundControl import, firmware compatibility and isolated simulator acceptance still require testing. Successful file generation is not flight approval.',
    'The file contains no arm, mission-start, servo or material-release commands. Camera capture/trigger integration is not included.'
  ],hardwareControl:false,releaseControl:false,notFlightApproval:true,selfAttested:true,checkedAt:new Date(nowMs).toISOString(),plannedTakeoffAt:plannedTakeoffMs===null?null:new Date(plannedTakeoffMs).toISOString(),plannedEndAt:plannedEndMs===null?null:new Date(plannedEndMs).toISOString(),validUntil:validUntilMs===null?null:new Date(validUntilMs).toISOString(),source:text(settings.source)?settings.source.trim():null,home,homeAmslM,relativeHeightM,ceilingM,corridorM,groundSpeedMps:finite(groundSpeedMps)?groundSpeedMps:null,firmware:firmware||null,qgcVersion:text(qgcVersion)?qgcVersion:null,sortieCount:Array.isArray(sorties)?sorties.length:0};
}

/** Compile a local .plan download; never upload, arm, start, or release. */
export function buildQGCPlan(flight,settings={},sortieIndex=0){
  const report=checkTrialExport(flight,settings);
  if(!report.pass)throw Object.assign(new Error([...report.errors,...report.missing].join(' ')||'Trial export checks are incomplete.'),{code:'TRIAL_EXPORT_BLOCKED',status:422,report});
  return serializeQGCPlan(flight,report,sortieIndex);
}
/** Internal serializer: exported builders must supply their own validated report. */
export function serializeQGCPlan(flight,report,sortieIndex=0){
  if(report?.pass!==true)throw Object.assign(new Error('A validated export report is required.'),{status:422,code:'TRIAL_EXPORT_BLOCKED'});
  if(!Number.isInteger(sortieIndex)||sortieIndex<0||sortieIndex>=flight.battery.sorties.length)throw Object.assign(new Error('Select a valid zero-based sortie index.'),{code:'INVALID_SORTIE_INDEX',status:422,report});
  const sortie=flight.battery.sorties[sortieIndex],home=report.home,height=report.relativeHeightM;
  const speed=report.groundSpeedMps;
  const items=[];
  const navigation=(command,point,altitude)=>items.push({AMSLAltAboveTerrain:null,Altitude:altitude,AltitudeMode:1,autoContinue:true,command,doJumpId:items.length+1,frame:3,params:[0,0,0,null,point[1],point[0],altitude],type:'SimpleItem'});
  navigation(22,home,height);
  // hoverSpeed is a planning default. This explicit command carries the assessed groundspeed.
  items.push({autoContinue:true,command:178,doJumpId:items.length+1,frame:2,params:[1,speed,-1,0,0,0,0],type:'SimpleItem'});
  for(const waypoint of sortie.waypoints.slice(1))navigation(16,waypoint.position,height);
  navigation(21,home,0);
  const plan={fileType:'Plan',geoFence:{circles:[],polygons:[],version:2},groundStation:'QGroundControl',mission:{cruiseSpeed:speed,firmwareType:report.firmware==='PX4'?12:3,globalPlanAltitudeMode:1,hoverSpeed:speed,items,plannedHomePosition:[home[1],home[0],report.homeAmslM],vehicleType:2,version:2},rallyPoints:{points:[],version:2},version:1};
  return {filename:`XEDO-${report.purpose==='planning_reference'?'planning':'trial'}-sortie-${String(sortieIndex+1).padStart(2,'0')}.plan`,mime:'application/json',text:JSON.stringify(plan,null,2),report:{...report,sortieIndex,adapterVersion:VERSION,itemCount:items.length}};
}
