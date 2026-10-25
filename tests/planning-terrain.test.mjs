import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPlanningTerrain} from '../src/planning-terrain.js';
const NOW=Date.parse('2026-10-25T00:00:00Z'),iso=value=>new Date(value).toISOString();
const geometry={type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.61],[101.2,12.61],[101.2,12.6]]]},home=[101.19,12.59],route=[101.195,12.595];
function fixture(){return {fetchedAt:iso(NOW),expiresAt:iso(NOW+600000),request:{geometry:structuredClone(geometry),home:[...home],routePoints:[[...route]]},terrain:{state:'ready',datasetId:'COPERNICUS/DEM/GLO30_2024_1',verticalDatum:'EGM2008',resolutionM:30,homeElevationM:0,samples:[{longitude:home[0],latitude:home[1],elevationM:0,role:'home'},{longitude:101.205,latitude:12.605,elevationM:1,role:'area'},{longitude:route[0],latitude:route[1],elevationM:2,role:'route'}]}};}
const assess=(data=fixture(),options={})=>assessPlanningTerrain(data,{geometry,home,now:NOW,...options});

test('The pure GEE assessment accepts a known zero Home and exact 2 m threshold as a model estimate',()=>{
 const data=fixture(),before=structuredClone(data),result=assess(data);
 assert.deepEqual(data,before);assert.equal(result.state,'ready');assert.equal(result.mode,'gee_model');assert.equal(result.homeElevationM,0);assert.equal(result.terrainRangeM,1);assert.equal(result.homeOffsetM,2);assert.deepEqual(result.coverage,{known:3,total:3,fraction:1});assert.equal(result.source.verticalDatum,'EGM2008');assert.equal(result.toleranceVerified,false);assert.ok(result.reasons.some(reason=>reason.includes('Sparse historical DSM')));
 result.home[0]=0;assert.deepEqual(data.request.home,home);
});
test('Masked area, route and Home samples remain unknown and never become zero',()=>{
 for(const index of [0,1,2]){const data=fixture();data.terrain.samples[index].elevationM=null;const result=assess(data);assert.equal(result.state,'unknown');assert.equal(result.coverage.fraction,2/3);assert.equal(result.terrainRangeM,null);assert.ok(result.reasons.some(reason=>reason.includes('not zero')));}
});
test('A missing explicit route sample prevents ready status even outside the inspection polygon',()=>{
 const data=fixture();data.terrain.samples.pop();const result=assess(data);assert.equal(result.state,'unknown');assert.match(result.reasons[0],/route.*incomplete/);
});
test('A Home-only report cannot establish area coverage',()=>{
 const data=fixture();data.terrain.samples=data.terrain.samples.slice(0,1);assert.equal(assess(data).state,'unknown');assert.match(assess(data).reasons[0],/inspection polygon/);
});
test('The assessment uses polygon membership instead of a concave polygon bounding box',()=>{
 const shape={type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.603],[101.203,12.603],[101.203,12.61],[101.2,12.61],[101.2,12.6]]]};
 const data=fixture();data.request.geometry=shape;data.terrain.samples[1]={longitude:101.201,latitude:12.601,elevationM:1};data.terrain.samples.push({longitude:101.208,latitude:12.608,elevationM:null});assert.equal(assess(data,{geometry:shape}).state,'ready');assert.equal(assess(data,{geometry:shape}).coverage.total,3);
});
test('Range or offset beyond the configurable tolerance requires review',()=>{
 const data=fixture();data.terrain.samples[2].elevationM=3;const result=assess(data);assert.equal(result.state,'review');assert.equal(result.homeOffsetM,3);assert.ok(result.reasons.some(reason=>reason.includes('Home')));
 assert.equal(assess(data,{toleranceM:4}).state,'ready');data.terrain.samples[1].elevationM=-1;assert.equal(assess(data).state,'review');assert.equal(assess(data).terrainRangeM,4);
});
test('Invalid or unbound references, timestamps and Home cannot pass the model assessment',()=>{
 for(const edit of [d=>{d.terrain.homeElevationM=1;},d=>{d.terrain.verticalDatum='WGS84';},d=>{d.terrain.datasetId='untrusted';},d=>{d.terrain.resolutionM=90;},d=>{d.request.home=[101.18,12.59];},d=>{d.request.geometry.coordinates[0][0][0]+=.001;},d=>{d.request.routePoints={};},d=>{d.expiresAt=iso(NOW);},d=>{d.fetchedAt=iso(NOW-600001);},d=>{d.fetchedAt=iso(NOW+60001);},d=>{d.expiresAt=iso(NOW+600001);}]){const data=fixture();edit(data);assert.equal(assess(data).state,'unknown');}
 for(const value of [null,0,-1,Infinity,'2'])assert.equal(assess(fixture(),{toleranceM:value}).state,'unknown');
 assert.equal(assess(null).state,'unknown');assert.equal(assess(fixture(),{home:null}).state,'unknown');assert.equal(assess(fixture(),{geometry:{type:'Polygon',coordinates:[]}}).state,'unknown');
});
