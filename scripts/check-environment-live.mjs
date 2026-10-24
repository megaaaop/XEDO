// Opt-in live, read-only integration check through the loopback preview server.
import {mkdir,writeFile} from 'node:fs/promises';
const endpoint='http://127.0.0.1:5180/api/v1/environment';
const sites=[['Rayong coast',101.23,12.62],['Krabi coast',98.78,8.01],['Bang Pakong estuary region',101.0,13.49],['Bang Pu mangrove region',100.67,13.54],['Chiang Mai inland control',98.98,18.8]];
const startAt=new Date(Date.now()+15*60000).toISOString(),endAt=new Date(Date.now()+75*60000).toISOString();
const results=[];
for(const [name,lon,lat] of sites){
 const geometry={type:'Polygon',coordinates:[[[lon-.001,lat-.001],[lon+.001,lat-.001],[lon+.001,lat+.001],[lon-.001,lat+.001],[lon-.001,lat-.001]]]};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry,startAt,endAt,altitudeM:50}),signal:AbortSignal.timeout(55000)});
 const data=await response.json();if(!response.ok)throw Error(name+': '+(data.message||response.status));
 const summary={name,status:response.status,state:data.state,points:data.request.points.length,fetchedAt:data.fetchedAt,expiresAt:data.expiresAt,series:Object.fromEntries(Object.entries(data.series).map(([key,value])=>[key,{status:value.status,model:value.model,modelRunAt:value.modelRunAt,freshness:value.freshness.state,known:value.samples.filter(row=>Number.isFinite(row.eastMps)&&Number.isFinite(row.northMps)).length,total:value.samples.length,resolutionM:value.resolutionM}]))};
 results.push(summary);console.log(JSON.stringify(summary));
}
await mkdir('output/environment-live',{recursive:true});await writeFile('output/environment-live/results.json',JSON.stringify({checkedAt:new Date().toISOString(),startAt,endAt,results},null,2));
if(!results.some(row=>row.series.wind10m.known>0)||!results.some(row=>row.series.currentSurface.known>0))throw Error('Live checks did not obtain both weather and current model values.');
console.log('Live environmental API returned verified-shaped responses. Regional values do not validate local channel currents.');
