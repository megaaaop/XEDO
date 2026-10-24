import test from 'node:test';
import assert from 'node:assert/strict';
import {fileTrialAPI} from '../src/planning-file-api.js';
import {applyFixedPlanningSettings} from '../src/planning-fixed-settings.js';
const geometry=()=>({type:'Polygon',coordinates:[[[101.22,12.62],[101.222,12.62],[101.222,12.621],[101.22,12.621],[101.22,12.62]]]});
function fixture(){const now=Date.now(),iso=offset=>new Date(now+offset*60000).toISOString(),area=geometry();return applyFixedPlanningSettings({geometry:area,driftEnabled:false,flight:{home:[101.22,12.62],windEastMps:0,windNorthMps:0,windLimitMps:8,maxAirspeedMps:12,usableWh:100,reserveWh:20,powerW:180,takeoffS:20,landingS:20,turnS:3,environment:{mode:'automatic',ready:true,fetchedAt:iso(0),expiresAt:iso(10),startAt:iso(15),endAt:iso(135),geometry:area,sources:{flightWind:{freshness:'fresh'}}}},export:{firmware:'PX4',homeAmslM:0,ceilingM:60,corridorM:5,plannedTakeoffAt:iso(15),plannedEndAt:iso(135),validUntil:iso(180),source:'Synthetic reviewed test constraints only',noGo:{type:'FeatureCollection',features:[]},homeConfirmed:true,flatSurfaceConfirmed:true,airspaceReviewed:true},oil:{areaM2:1000,thicknessLowUm:10,thicknessHighUm:30}});}
const calculate=input=>fileTrialAPI('',{method:'POST',body:JSON.stringify(input)});
test('Fresh automatic evidence can accompany all four calculators and the checked file adapter',async()=>{const input=fixture(),before=structuredClone(input),result=await calculate(input);assert.equal(result.exportCheck.pass,true);assert.equal(result.flight.wind.state,'pass');assert.ok(result.oil.capsulesLowKg>0);assert.deepEqual(input,before);const file=await fileTrialAPI('/export',{method:'POST',body:JSON.stringify(input)});assert.equal(file.report.pass,true);assert.equal(file.hardwareControl,false);});
test('Automatic input expiry, incomplete freshness, mismatched area and uncovered times block file export while preserving oil output',async()=>{
 const variants=[input=>{input.flight.environment.expiresAt=new Date(Date.now()-1).toISOString();},input=>{input.flight.environment.fetchedAt=new Date(Date.now()-11*60000).toISOString();},input=>{input.flight.environment.ready=false;},input=>{input.flight.environment.sources.flightWind.freshness='unknown';},input=>{input.flight.environment.geometry={type:'Polygon',coordinates:[]};},input=>{input.flight.environment.endAt=input.export.plannedTakeoffAt;}];
 for(const modify of variants){const input=fixture();modify(input);const result=await calculate(input);assert.equal(result.exportCheck.pass,false);assert.ok(result.exportCheck.checks.some(row=>row.id==='environment'));assert.equal(result.oil.volumeLowL,10);await assert.rejects(fileTrialAPI('/export',{method:'POST',body:JSON.stringify(input)}),error=>error.code==='TRIAL_CHECKS_INCOMPLETE');}
});

test('Automatic drift report identifies the reduced model without claiming its forcing was manually supplied',async()=>{
 const input=fixture();input.drift={environment:{mode:'automatic',ready:false}};
 const result=await calculate(input);
 assert.ok(result.drift.warnings.some(text=>text.includes('equivalent constant vectors')));
 assert.equal(result.drift.warnings.some(text=>text.includes('manually configured')),false);
 assert.equal(result.drift.warnings.some(text=>text.includes('freshness and accuracy have not been verified')),false);
});