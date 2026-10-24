import {record} from './storage.js';
import {applyEnvironmentExportGate} from './planning-environment-gate.js';
import {applyGeospatialExportGate} from './planning-geospatial-gate.js';
import {validateGeometry} from './domain.js';
import {calculateDrift} from './trial-drift.js';
import {calculateOil} from './trial-oil.js';
import {buildTrialFlight} from './trial-flight.js';
import {checkTrialExport,buildQGCPlan} from './trial-export.js';

const fail=(message,status=422)=>{throw Object.assign(new Error(message),{status});};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
async function input(req){
  if(!req.headers.get('content-type')?.includes('application/json'))fail('Use an application/json request body.',415);
  const reader=req.body?.getReader();if(!reader)fail('A JSON request body is required.',400);
  let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();fail('Trial inputs exceed 64 KiB.',413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('Trial inputs must be valid JSON.',400);}
  if(!data||Array.isArray(data)||typeof data!=='object')fail('Trial inputs must be a JSON object.');
  const allowed=['surveyId','geometry','driftEnabled','drift','flight','export','oil','sortieIndex'];
  if(Object.keys(data).some(k=>!allowed.includes(k)))fail('Unknown trial input field.');
  for(const key of ['drift','flight','export','oil'])if(data[key]!=null&&(typeof data[key]!=='object'||Array.isArray(data[key])))fail(key+' settings must be an object.');
  if(data.driftEnabled!=null&&typeof data.driftEnabled!=='boolean')fail('driftEnabled must be true or false.');
  return data;
}
async function source(db,surveyId,geometry){
  if(surveyId!=null){
    if(typeof surveyId!=='string'||!/^[A-Za-z0-9_-]{5,80}$/.test(surveyId))fail('Select a valid saved survey.');
    if(geometry!=null)fail('A saved survey supplies its own frozen geometry.');
    const survey=await record(db,surveyId);if(survey?.kind!=='survey')fail('Saved survey not found.',404);
    const incident=await record(db,survey.incidentId);if(incident?.kind!=='incident')fail('Survey incident not found.',404);
    const observationId='OBS_'+incident.id.replace(/^INC_/,'');
    const features=survey.boundarySnapshot?.features?.filter(f=>f.properties?.observation_id===observationId&&f.properties?.incident_id===incident.id);
    if(features?.length!==1)fail('This survey has no original Quick mission boundary.');
    geometry=structuredClone(features[0].geometry);
    return {geometry,surveyId,incidentId:incident.id,sceneId:features[0].properties.scene_id,acquiredAt:features[0].properties.acquired_at,kind:'frozen_survey_snapshot'};
  }
  return {geometry:structuredClone(geometry??null),surveyId:null,kind:'user_trial_boundary'};
}
function checkedGeometry(geometry){
  if(geometry==null)return;
  if(geometry.type!=='Polygon'||!Array.isArray(geometry.coordinates)||geometry.coordinates.length!==1||!Array.isArray(geometry.coordinates[0])||geometry.coordinates[0].length>121)fail('Choose a simple polygon with 3–120 vertices and no holes.');
  validateGeometry(geometry);
}
export async function calculatePlanningTrial(db,body){
  const original=await source(db,body.surveyId,body.geometry);checkedGeometry(original.geometry);
  const attempt=(calculate,fallback)=>{try{return calculate();}catch(error){return {...fallback,state:'blocked',errors:[error.message],warnings:[...(fallback.warnings||[]),error.message],hardwareControl:false};}};
  const driftEmpty={state:body.driftEnabled?'incomplete':'disabled',missing:body.driftEnabled?['Inspection boundary']:[],geometry:null,features:{type:'FeatureCollection',features:[]},warnings:['Drift is a manually configured constant-vector scenario, not a live forecast.']};
  const drift=original.geometry&&body.driftEnabled?attempt(()=>calculateDrift(original.geometry,body.drift||{}),driftEmpty):driftEmpty;
  if(body.drift?.environment?.mode==='automatic'){
    drift.warnings=drift.warnings.filter(message=>!message.startsWith('Drift is a manually configured')&&!message.startsWith('Constant supplied surface-current')&&!message.startsWith('The envelope is a conservative')&&!message.startsWith('Diffusion, waves,'));
    drift.warnings.push('Automatic regional model data is reduced to equivalent constant vectors. Model-run metadata is checked separately; local current accuracy and intermediate slick motion remain unverified.','The axis-aligned scenario envelope covers its declared constant-vector scenarios, not all paths under varying wind/current.','Tidal and Stokes components are already included in the supplied SMOC current. Diffusion, additional wave processes, shoreline interaction and weathering are not simulated.');
  }
  const target=body.driftEnabled?drift.geometry:original.geometry;
  const flightEmpty={state:'incomplete',missing:[],plan:null,camera:{state:'blocked'},wind:{state:'incomplete'},battery:{state:'incomplete',sorties:[]},warnings:[]};
  const flight=target?attempt(()=>buildTrialFlight(target,body.flight||{}),flightEmpty):{...flightEmpty,missing:[body.driftEnabled?'Complete the drift inputs before planning the expanded area.':'Inspection boundary'],camera:{state:'incomplete'}};
  const exportSettings={...body.export,home:body.flight?.home};
  const exportCheck=attempt(()=>checkTrialExport(flight,exportSettings),{pass:false,canExport:false,checks:[],missing:[],warnings:[]});
  if(body.driftEnabled&&drift.state==='assumption_based'&&flight.battery?.sorties?.length){
    const start=Date.parse(exportSettings.plannedTakeoffAt),end=Date.parse(exportCheck.plannedEndAt);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.parse(body.drift?.arriveAt)||end>Date.parse(body.drift?.endAt)){
      const message='The drift arrival/end envelope must cover the complete scheduled flight window, including takeoff and declared ground delays. Transit timing is not inferred.';
      exportCheck.pass=false;exportCheck.canExport=false;exportCheck.state=exportCheck.errors?.length?'blocked':'incomplete';exportCheck.missing.push(message);exportCheck.checks.push({id:'drift-window',state:'incomplete',message});
    }
  }
  applyEnvironmentExportGate(exportCheck,{...body,geometry:original.geometry});
  applyGeospatialExportGate(exportCheck,body);
  const oil=attempt(()=>calculateOil(body.oil||{}),{missing:[],areaM2:null,volumeLowL:null,volumeHighL:null,oilMassLowKg:null,oilMassHighKg:null,capsulesLowKg:null,capsulesHighKg:null,warnings:[]});
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical({source:original,...body})))),x=>x.toString(16).padStart(2,'0')).join('');
  return {schema_version:'xedo-planning-trial/1',purpose:'planning_trial_only',generatedAt:new Date().toISOString(),inputHash:hash,source:original,inputs:structuredClone(body),target,drift,flight,exportCheck,oil,hardwareControl:false,releaseControl:false};
}
export async function planningTrialAPI(req,env,db,url){
  if(!url.pathname.startsWith('/api/v2/planning-trial'))return null;
  if(url.pathname==='/api/v2/planning-trial/source'){
    if(req.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
    if(!url.searchParams.get('survey'))fail('A saved survey ID is required.');
    const value=await source(db,url.searchParams.get('survey'));checkedGeometry(value.geometry);return json(value);
  }
  if(!['/api/v2/planning-trial','/api/v2/planning-trial/export'].includes(url.pathname))fail('Trial route not found.',404);
  if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
  const origin=req.headers.get('origin');if((origin&&origin!==url.origin)||req.headers.get('sec-fetch-site')==='cross-site')fail('Cross-site trial requests are not permitted.',403);
  const body=await input(req);let result;
  try{result=await calculatePlanningTrial(db,body);}catch(error){if(error.status)throw error;fail(error.message||'Check the trial inputs.');}
  if(url.pathname.endsWith('/export')){
    if(!result.exportCheck.pass)return json({code:'TRIAL_CHECKS_INCOMPLETE',message:'Complete all export checks before downloading a flight file.',details:result.exportCheck,retryable:false,request_id:crypto.randomUUID()},422);
    const index=body.sortieIndex??0;if(!Number.isInteger(index)||index<0)fail('Select a valid sortie.');
    const file=buildQGCPlan(result.flight,{...body.export,home:body.flight?.home},index);return json({...file,inputHash:result.inputHash,hardwareControl:false,releaseControl:false});
  }
  return json(result);
}
