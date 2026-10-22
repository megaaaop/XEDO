import proj4 from 'proj4';
import {validateGeometry,polygonArea} from './domain.js';

export const PLANNER_VERSION='convex-survey/1.0';
export const SIMULATOR_VERSION='waypoint-replay/1.0';
export const contractVersion='1.0';
export function invalid(code,message,status=422,details={}){throw Object.assign(new Error(message),{code,status,details});}
export function utc(v){if(typeof v!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))invalid('INVALID_TIME','Timestamps must specify UTC or timezone');return new Date(v).toISOString();}
export function bounded(v,name,min,max,nullable=false){if(nullable&&v==null)return null;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)invalid('INVALID_UNITS',`${name} must be between ${min}–${max}`);return v;}
export function position(p,nullable=false){if(nullable&&p==null)return null;if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>85)invalid('INVALID_POSITION','Coordinates must use [longitude, latitude] WGS84');return p;}
export function profileInput(p){
  if(!['simulated','unverified','measured'].includes(p.sourceMode))invalid('INVALID_PROFILE','Specify the source of profile');
  if(!p.source?.trim()||!p.name?.trim())invalid('INVALID_PROFILE','Specify the name and source of profile');
  if(!['AGL','MSL'].includes(p.altitudeReference))invalid('INVALID_PROFILE','Specify the altitude reference AGL/MSL');
  return {name:p.name.slice(0,120),source:p.source.slice(0,1000),sourceMode:p.sourceMode,
    speedMps:bounded(p.speedMps,'Speed m/s',0.1,30),altitudeM:bounded(p.altitudeM,'Altitude m',5,500),altitudeReference:p.altitudeReference,
    swathM:bounded(p.swathM,'Survey swath width m',1,500),enduranceS:bounded(p.enduranceS,'Endurance s',1,18000,true),reserveFraction:bounded(p.reserveFraction,'Reserve fraction',0,0.5),
    turnS:bounded(p.turnS,'Turn time s',0,120,true),takeoffS:bounded(p.takeoffS,'Take-off time s',0,300,true),landingS:bounded(p.landingS,'Landing time s',0,300,true),capacityKg:bounded(p.capacityKg,'Capacity kg',0,100,true),
    origin:'user_annotation',valueKind:p.sourceMode==='measured'?'measured':'estimated',verificationState:p.sourceMode==='measured'?'unreviewed':'inconclusive'};
}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function convex(ring){let sign=0;for(let i=0;i<ring.length-1;i++){const n=cross(ring[i],ring[(i+1)%(ring.length-1)],ring[(i+2)%(ring.length-1)]);if(Math.abs(n)>1e-7){if(sign&&Math.sign(n)!==sign)return false;sign=Math.sign(n);}}return sign!==0;}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function inside(p,r){let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if(Math.abs(cross(a,b,p))<1e-7&&p[0]>=Math.min(a[0],b[0])-1e-7&&p[0]<=Math.max(a[0],b[0])+1e-7&&p[1]>=Math.min(a[1],b[1])-1e-7&&p[1]<=Math.max(a[1],b[1])+1e-7)return true;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function intersects(a,b,c,d){const z=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-7&&p[0]>=Math.min(a[0],b[0])-1e-7&&p[0]<=Math.max(a[0],b[0])+1e-7&&p[1]>=Math.min(a[1],b[1])-1e-7&&p[1]<=Math.max(a[1],b[1])+1e-7;return (z[0]*z[1]<0&&z[2]*z[3]<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
export function buildPlan(input){
  const {geometry,profile,home,spacingM,purpose='survey',noGo=[]}=input;
  const base={schema_version:'1.0',plannerVersion:PLANNER_VERSION,purpose,target:structuredClone(geometry),profile:structuredClone(profile),home:structuredClone(home),parameters:{spacingM,angleDeg:input.angleDeg??null,noGo:structuredClone(noGo)},crs:'EPSG:4326',waypoints:[],segments:[],estimates:null,warnings:[],sourceMode:profile?.sourceMode==='simulated'?'simulated':'live',origin:'user_annotation',valueKind:'estimated',verificationState:'unreviewed'};
  const unavailable=(status,code,reason)=>({...base,status,code,reason});
  if(purpose!=='survey')return unavailable('unsupported','UNSUPPORTED_PURPOSE','This version generates survey plans only. It does not calculate dose or generate material dispensing plans');
  if(geometry?.type==='MultiPolygon'||geometry?.type==='Polygon'&&geometry.coordinates?.length>1)return unavailable('unsupported','UNSUPPORTED_GEOMETRY','Only one convex Polygon without holes is supported.');
  try{validateGeometry(geometry);}catch(e){invalid('INVALID_GEOMETRY',e.message);}
  profileInput(profile);position(home);bounded(spacingM,'Track spacing m',1,500);if(input.angleDeg!=null)bounded(input.angleDeg,'Survey track angle °',0,179.999);
  if(!Array.isArray(noGo)||noGo.length>20)invalid('INVALID_GEOMETRY','Maximum number of no-go areas: 20 Polygon');for(const g of noGo)try{validateGeometry(g);}catch(e){invalid('INVALID_GEOMETRY','No-go areas: '+e.message);}
  const r=geometry.coordinates[0],c=[r.slice(0,-1).reduce((s,p)=>s+p[0],0)/(r.length-1),r.slice(0,-1).reduce((s,p)=>s+p[1],0)/(r.length-1)];
  const zone=Math.max(1,Math.min(60,Math.floor((c[0]+180)/6)+1)),epsg=(c[1]>=0?32600:32700)+zone;
  const projection=`+proj=utm +zone=${zone} ${c[1]<0?'+south ':''}+datum=WGS84 +units=m +no_defs`;
  const convert=p=>proj4('EPSG:4326',projection,p),back=p=>proj4(projection,'EPSG:4326',p),ring=r.map(convert),h=convert(home);
  base.calculationCrs='EPSG:'+epsg;base.areaM2=polygonArea(geometry);base.areaMethod='spherical-WGS84-mean-radius';
  if(!convex(ring))return unavailable('unsupported','UNSUPPORTED_GEOMETRY','Concave polygons are not supported by the basic planner. A reviewer must split it into convex areas.');
  if(ring.some(p=>distance(p,ring[0])>50000)||distance(h,ring[0])>50000)return unavailable('unsupported','AREA_TOO_LARGE','The basic planner requires the target and home position to be within 50 km');
  let angle=input.angleDeg==null?null:input.angleDeg*Math.PI/180;
  if(angle==null){let width=Infinity;for(let i=0;i<ring.length-1;i++){const a=Math.atan2(ring[i+1][1]-ring[i][1],ring[i+1][0]-ring[i][0]),ys=ring.map(p=>-Math.sin(a)*p[0]+Math.cos(a)*p[1]),w=Math.max(...ys)-Math.min(...ys);if(w<width){width=w;angle=a;}}}
  const rot=p=>[Math.cos(angle)*p[0]+Math.sin(angle)*p[1],-Math.sin(angle)*p[0]+Math.cos(angle)*p[1]],unrot=p=>[Math.cos(angle)*p[0]-Math.sin(angle)*p[1],Math.sin(angle)*p[0]+Math.cos(angle)*p[1]];
  const rr=ring.map(rot),min=Math.min(...rr.map(p=>p[1])),max=Math.max(...rr.map(p=>p[1])),n=Math.ceil((max-min)/spacingM);
  if(n>450)return unavailable('blocked','PLAN_OVER_BUDGET','Survey tracks exceed 450 tracks. Split the target or increase track spacing.');
  const work=[];for(let i=0;i<n;i++){const y=min+(i+0.5)*(max-min)/n,xs=[];for(let j=0;j<rr.length-1;j++){const a=rr[j],b=rr[j+1];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}if(xs.length<2)continue;const pair=[unrot([Math.min(...xs),y]),unrot([Math.max(...xs),y])];work.push(i%2?pair.reverse():pair);}
  if(!work.length)return unavailable('blocked','PLAN_TOO_SMALL','Survey tracks cannot be generated for this area.');
  if(distance(h,work[0][1])<distance(h,work[0][0]))for(const pair of work)pair.reverse();
  const projected=[h];const purposes=['base'];for(const [a,b] of work){projected.push(a,b);purposes.push('transit','survey');}projected.push(h);purposes.push('return');
  const forbidden=noGo.map(g=>g.coordinates[0].map(convert));
  for(let i=1;i<projected.length;i++)if(forbidden.some(r=>inside(projected[i-1],r)||inside(projected[i],r)||r.slice(0,-1).some((p,j)=>intersects(projected[i-1],projected[i],p,r[j+1]))))return unavailable('blocked','PLAN_BLOCKED','The route crosses a no-go area. Obstacle-avoidance routing is unavailable, so this plan cannot be exported.');
  base.parameters.angleDeg=((angle*180/Math.PI)%180+180)%180;base.parameters.actualSpacingM=(max-min)/n;
  base.waypoints=projected.map((p,i)=>({sequence:i,position:back(p),altitudeM:profile.altitudeM,altitudeReference:profile.altitudeReference,purpose:purposes[i],dispenser:'off',action:purposes[i]==='survey'?'survey_segment':'none'}));
  base.segments=projected.slice(1).map((p,i)=>({from:i,to:i+1,purpose:purposes[i+1],distanceM:distance(projected[i],p),dispenser:'off'}));
  const distanceM=base.segments.reduce((s,x)=>s+x.distanceM,0),movementTimeS=distanceM/profile.speedMps,completeTime=[profile.turnS,profile.takeoffS,profile.landingS].every(v=>v!=null),durationS=completeTime?movementTimeS+Math.max(0,work.length-1)*profile.turnS+profile.takeoffS+profile.landingS:null;
  base.estimates={distanceM,workingDistanceM:base.segments.filter(x=>x.purpose==='survey').reduce((s,x)=>s+x.distanceM,0),movementTimeS,durationS,targetAreaM2:base.areaM2,coveragePercent:null,materialKg:null,sorties:1,valueKind:'estimated',model:'UTM straight segments + speed + per-row turn + takeoff/landing; no wind/terrain'};
  base.warnings=['Two-dimensional route estimate. Wind, obstacles, and flight safety have not been assessed.','Coverage and material mass are not calculated because footprint union is unavailable.'];
  if(profile.sourceMode!=='measured')base.warnings.push('Profile values are intended for simulation. Device calibration results are not available.');
  if(spacingM>profile.swathM)base.warnings.push('Track spacing exceeds the survey swath width. Coverage gaps may occur.');
  if(durationS==null||profile.enduranceS==null)base.warnings.push('Turn time/take-off/landing or endurance is incomplete. The flight time budget cannot be estimated yet.');
  if(durationS!=null&&profile.enduranceS!=null&&durationS>profile.enduranceS*(1-profile.reserveFraction))return {...unavailable('blocked','PLAN_OVER_BUDGET','Planned duration exceeds the endurance budget after deducting the reserve. Automatic mission splitting is not available in this version.'),estimates:base.estimates};
  return {...base,status:'generated',reason:'Parallel survey tracks within a convex polygon.'};
}
export function planGeoJSON(plan){return {type:'FeatureCollection',metadata:{schema_version:'1.0',crs:'EPSG:4326',plan},features:[{type:'Feature',geometry:plan.target,properties:{purpose:'target',observation_id:plan.observationId,target_revision:plan.targetRevision}},...plan.segments.map(s=>({type:'Feature',geometry:{type:'LineString',coordinates:[plan.waypoints[s.from].position,plan.waypoints[s.to].position]},properties:{...s,plan_id:plan.id,version:plan.version,value_kind:'estimated',source_mode:plan.sourceMode,dispenser:'off'}}))]};}
export function planCSV(plan){return '\uFEFFschema_version,plan_id,plan_version,observation_id,target_revision,profile_id,profile_version,sequence,longitude,latitude,altitude_m,altitude_reference,purpose,dispenser,value_kind\r\n'+plan.waypoints.map(p=>['1.0',plan.id,plan.version,plan.observationId,plan.targetRevision,plan.profileId,plan.profileVersion,p.sequence,...p.position,p.altitudeM,p.altitudeReference,p.purpose,'off','estimated'].join(',')).join('\r\n');}
export function simulate(plan,{scenario='success',seed=42,startedAt='2026-10-04T03:00:00Z',runId='SIM_run'}={}){
  if(plan.status!=='generated'||!plan.waypoints.length)invalid('PLAN_BLOCKED','Generate a valid survey plan before starting a simulation.');if(!['success','signal_loss','dispenser_fault'].includes(scenario))invalid('INVALID_SCENARIO','Unknown simulation scenario');bounded(seed,'seed',0,4294967295);utc(startedAt);
  const total=plan.estimates.distanceM,step=Math.max(total/300,plan.profile.speedMps),events=[];let travelled=0,sequence=0,elapsed=plan.profile.takeoffS||0,rng=seed>>>0;
  const next=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296;};
  const faultAt=0.4+next()*0.15;let stopped=false,workCount=0;const totalWork=plan.segments.filter(s=>s.purpose==='survey').length;
  for(const s of plan.segments){const a=plan.waypoints[s.from].position,b=plan.waypoints[s.to].position,n=Math.max(1,Math.ceil(s.distanceM/step));for(let k=1;k<=n;k++){travelled+=s.distanceM/n;elapsed+=s.distanceM/n/plan.profile.speedMps;const progress=total?Math.min(1,travelled/total):1;const fault=scenario!=='success'&&progress>=faultAt;
    events.push({schema_version:'1.0',event_id:`${runId}_${sequence}`,device_id:'sim-pi-001',boot_id:runId,sequence:sequence++,observed_at:new Date(Date.parse(startedAt)+elapsed*1000).toISOString(),clock_quality:'simulation_clock',mission_id:plan.id,source_mode:'simulated',position:{longitude:a[0]+(b[0]-a[0])*k/n,latitude:a[1]+(b[1]-a[1])*k/n,valid:true,altitude_m:plan.profile.altitudeM,altitude_reference:plan.profile.altitudeReference},battery:null,dispenser:{state:fault&&scenario==='dispenser_fault'?'fault':'idle',requested_setting:null,measured_rate_kg_s:null,measured_remaining_kg:null,measured_released_kg:null,driver_version:'simulation-only',fault_code:fault&&scenario==='dispenser_fault'?'SIM_JAM':null},health:{agent:fault&&scenario==='signal_loss'?'disconnected':'online',fault_code:fault?(scenario==='signal_loss'?'SIM_SIGNAL_LOSS':'SIM_JAM'):null},route_progress:progress*100});if(fault){stopped=true;break;}}
    if(stopped)break;if(s.purpose==='survey'&&++workCount<totalWork)elapsed+=plan.profile.turnS||0;
  }
  if(!stopped&&events.length)events.at(-1).route_progress=100;
  return {schema_version:'1.0',simulatorVersion:SIMULATOR_VERSION,scenario,seed,startedAt:utc(startedAt),sourceMode:'simulated',origin:'model_output',valueKind:'estimated',verificationState:'unreviewed',status:stopped?'failed':'completed',events,summary:{progressPercent:events.at(-1)?.route_progress??0,durationS:elapsed+(stopped?0:plan.profile.landingS||0),distanceM:travelled,measuredMaterialKg:null,batteryPercent:null,reason:stopped?(scenario==='signal_loss'?'Simulated signal loss. The mission has partial results.':'Dispenser fault simulated; mission has partial results'):'Route simulation completed. Physical flight has not been verified.'}};
}
