import {record} from './storage.js';
import {pointWithin} from './domain.js';
import {selectionMetrics} from './mission-flow.js';
import {buildDeploymentPreview} from './deployment-plan.js';
import {samplePlanningContext,unavailablePlanningContext} from './gee-planning.js';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}});
const fail=(message,status=422)=>{throw Object.assign(new Error(message),{status});};

export function deploymentSamplePoints(plan,geometry) {
  const route=plan.waypoints||[],points=[],seen=new Set();
  const add=p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||!pointWithin(p,geometry))return;const key=p.map(n=>n.toFixed(7)).join(',');if(!seen.has(key)){seen.add(key);points.push([...p]);}};
  const count=Math.min(55,route.length);
  for(let i=0;i<count;i++)add(route[count===1?0:Math.round(i*(route.length-1)/(count-1))].position);
  const {bbox}=selectionMetrics(geometry);
  for(let y=0;y<5;y++)for(let x=0;x<5;x++)add([bbox[0]+(x+.5)/5*(bbox[2]-bbox[0]),bbox[1]+(y+.5)/5*(bbox[3]-bbox[1])]);
  if(!points.length)add(geometry.coordinates[0][0]);
  return points;
}

export async function deploymentPreviewAPI(req,env,db,url,{fetchImpl=fetch}={}) {
  if(url.pathname!=='/api/v1/deployment-preview')return null;
  if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
  const origin=req.headers.get('origin');if((origin&&origin!==url.origin)||req.headers.get('sec-fetch-site')==='cross-site')fail('Requests from other websites are not permitted.',403);
  if(!req.headers.get('content-type')?.includes('application/json'))fail('Use a JSON request body.',415);
  const raw=await req.text();if(raw.length>4096)fail('Deployment preview request exceeds the size limit.',413);
  let body;try{body=JSON.parse(raw);}catch{fail('Deployment preview request must be valid JSON.',400);}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!['surveyId','altitudeM','spacingM','speedMps','useGEE'].includes(k)))fail('Invalid deployment preview request.');
  if(typeof body.surveyId!=='string'||!/^[a-zA-Z0-9_-]{5,80}$/.test(body.surveyId))fail('Select a saved survey request.');
  if(body.useGEE!==undefined&&typeof body.useGEE!=='boolean')fail('useGEE must be true or false.');
  const request=await record(db,body.surveyId);if(request?.kind!=='survey')fail('Saved survey request not found.',404);
  const incident=await record(db,request.incidentId);if(incident?.kind!=='incident')fail('The survey incident could not be restored.',404);
  const expectedObservation='OBS_'+incident.id.replace(/^INC_/,'');
  const frozenFeatures=request.boundarySnapshot?.features;
  const features=Array.isArray(frozenFeatures)?frozenFeatures.filter(f=>f?.properties?.observation_id===expectedObservation&&f.properties?.incident_id===incident.id):[];
  if(features.length!==1||typeof features[0].properties.scene_id!=='string'||!features[0].properties.scene_id)fail('This request has no original Quick mission boundary snapshot. Open Advanced workspace to review it.');
  const feature=features[0],target=structuredClone(feature.geometry),parameters={geometry:target};
  for(const key of ['altitudeM','spacingM','speedMps'])if(body[key]!==undefined)parameters[key]=body[key];
  let base;try{base=buildDeploymentPreview(parameters);}catch(error){fail(error.message);}
  const points=deploymentSamplePoints(base,target);
  const context=base.status==='blocked'?unavailablePlanningContext('disabled',points,'The geometric preview is blocked. GEE was not contacted.'):body.useGEE===false?unavailablePlanningContext('disabled',points,'Local geometric preview selected. GEE was not contacted; elevation and historical water occurrence are unknown.'):await samplePlanningContext(env,points,{fetchImpl});
  const plan=buildDeploymentPreview({...parameters,context}),p=feature.properties;
  const scene={id:p.scene_id,productId:p.product_id,provider:p.provider,collection:p.collection,acquiredAt:p.acquired_at,sourceUrl:p.source_url,assetKind:p.display_asset_kind,displayGrid:p.display_grid};
  return json({schema_version:'xedo-deployment-preview/1',surveyId:request.id,scene,target,plan,context,hardwareControl:false});
}
