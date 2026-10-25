// Opt-in, read-only checks through the loopback preview. No credentials in output.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {assessPlanningTerrain} from '../src/planning-terrain.js';
import {aggregatePlanningEnvironment} from '../src/planning-environment-inputs.js';

const base=new URL(process.env.XEDO_PREVIEW_URL||'http://127.0.0.1:5182');
if(base.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw Error('Use a loopback preview URL.');
const geometry={type:'Polygon',coordinates:[[[101.22,12.62],[101.222,12.62],[101.222,12.621],[101.22,12.621],[101.22,12.62]]]};
const home=[101.2198,12.61994],routePoints=[[101.22,12.62],[101.222,12.621]];
const startAt=new Date(Date.now()+3600000).toISOString(),endAt=new Date(Date.now()+5400000).toISOString();
async function request(path,input){
 const reply=await fetch(new URL(path,base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(65000)});
 assert.equal(reply.headers.get('content-type')?.includes('application/json'),true,'API must return JSON.');
 const data=await reply.json();
 assert.equal(reply.ok,true,'Read-only API request failed: '+(data.code||reply.status));
 return data;
}
const environment=await request('/api/v1/environment',{geometry,startAt,endAt,altitudeM:50});
const context=await request('/api/v1/gee/planning-context',{geometry,home,routePoints,startAt,endAt,sceneId:null});
const assessment=assessPlanningTerrain(context,{geometry,home});
const summary={checkedAt:new Date().toISOString(),startAt,endAt,
 environment:{state:environment.state,fetchedAt:environment.fetchedAt,expiresAt:environment.expiresAt,series:Object.fromEntries(Object.entries(environment.series||{}).map(([key,value])=>[key,{status:value.status,model:value.model,freshness:value.freshness?.state,known:value.samples?.filter(row=>Number.isFinite(row.eastMps)&&Number.isFinite(row.northMps)).length,total:value.samples?.length,resolutionM:value.resolutionM}]))},
 context:{state:context.state,fetchedAt:context.fetchedAt,expiresAt:context.expiresAt,parts:Object.fromEntries(['terrain','landcover','quality','forecast'].map(key=>[key,{state:context[key]?.state,code:context[key]?.code,datasetId:context[key]?.datasetId}])),terrain:{state:assessment.state,known:assessment.coverage.known,total:assessment.coverage.total,reasons:assessment.reasons}},
};
const derived=aggregatePlanningEnvironment(environment,{now:Date.now()});
summary.usableConditions={ready:derived.ready,reasons:derived.reasons};
await mkdir('output/planning-live',{recursive:true});
await writeFile('output/planning-live/results.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
assert.ok(summary.environment.series.wind10m?.known>0,'Live wind must contain known samples.');
assert.ok(summary.environment.series.currentSurface?.known>0,'Live regional currents must contain known samples.');
assert.equal(derived.ready.flight,true,'Flight vectors must pass freshness and full-window coverage checks.');
assert.equal(derived.ready.drift,true,'Regional wind/current vectors must pass freshness and full-window coverage checks.');
assert.equal(context.terrain.state,'ready','Live GEE terrain must be available.');
assert.equal(context.landcover.state,'ready','Live GEE land cover must be available.');
assert.equal(assessment.state,'ready','Matching live Home/AOI/route samples must pass this flat-water model fixture.');
console.log('Live preview APIs verified for the public test area; this is not aircraft or local-channel validation.');
