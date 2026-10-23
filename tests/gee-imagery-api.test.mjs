import test from 'node:test';
import assert from 'node:assert/strict';
import {geeImageryAPI} from '../src/gee-imagery-api.js';

const origin='https://xedo.example';
const geometry={type:'Polygon',coordinates:[[[101.2,12.6],[101.202,12.6],[101.202,12.602],[101.2,12.602],[101.2,12.6]]]};
const scene={id:'gee:COPERNICUS/S2_SR_HARMONIZED/20261020T034531_20261020T035958_T47PQP',provider:'gee',assetKind:'gee_tiles',acquiredAt:'2026-10-20T03:45:31Z',footprint:geometry};
const request=(route,body,extra={})=>new Request(origin+'/api/v1/gee/imagery/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...extra.headers},body:typeof body==='string'?body:JSON.stringify(body),...Object.fromEntries(Object.entries(extra).filter(([key])=>key!=='headers'))});
const unexpected=()=>assert.fail('Invalid request must not reach GEE');

test('GEE imagery API rejects cross-site, methods, routes and invalid JSON before upstream work',async()=>{
  const services={searchGEEImagery:unexpected,createGEEImageryMap:unexpected,getGEEImageryTile:unexpected};
  for(const [req,status] of [
    [request('search',{geometry},{headers:{Origin:'https://other.example'}}),403],
    [request('search',{geometry},{headers:{'Sec-Fetch-Site':'cross-site'}}),403],
    [new Request(origin+'/api/v1/gee/imagery/search'),405],
    [request('unknown',{}),404],
    [request('search','{'),400],
    [request('search',{geometry,expression:{}}),422],
    [request('map',{sceneId:scene.id,url:'https://other.example'}),422],
    [request('search',{geometry},{headers:{'Content-Type':'text/plain'}}),415],
    [request('search',JSON.stringify({geometry,extra:'x'.repeat(66000)})),413],
  ])assert.equal((await geeImageryAPI(req,{}, {services})).status,status);
  assert.equal(await geeImageryAPI(new Request(origin+'/api/v1/health'),{}, {services}),null);
});

test('Map response persists only verified server scene and returns a same-origin tile template',async()=>{
  const saved=[];
  const services={createGEEImageryMap:async(env,input)=>{assert.deepEqual(input,{sceneId:scene.id,geometry});return {sessionId:'a'.repeat(40),expiresAt:'2026-10-23T05:00:00Z',scene};}};
  const response=await geeImageryAPI(request('map',{sceneId:scene.id,geometry}),{}, {services,persistScene:async value=>saved.push(value)});
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  const result=await response.json();
  assert.equal(result.tileUrl,'/api/v1/gee/imagery/tiles/'+'a'.repeat(40)+'/{z}/{x}/{y}');
  assert.deepEqual(result.geometry,geometry);assert.deepEqual(saved,[scene]);
});

test('Search is read-only and binary tile transport preserves the verified PNG',async()=>{
  let persisted=0;
  const services={searchGEEImagery:async()=>({provider:'gee',scenes:[scene]}),getGEEImageryTile:async(env,input)=>{assert.deepEqual(input,{sessionId:'a'.repeat(40),z:10,x:800,y:475});return new Response(Uint8Array.from([137,80,78,71]),{headers:{'Content-Type':'image/png'}});}};
  const search=await geeImageryAPI(request('search',{geometry,start:'2026-10-01',end:'2026-10-23',maxCloud:80}),{}, {services,persistScene:async()=>persisted++});
  assert.deepEqual((await search.json()).scenes,[scene]);assert.equal(persisted,0);
  const tile=await geeImageryAPI(new Request(origin+'/api/v1/gee/imagery/tiles/'+'a'.repeat(40)+'/10/800/475'),{}, {services});
  assert.equal(tile.headers.get('Content-Type'),'image/png');assert.deepEqual([...new Uint8Array(await tile.arrayBuffer())],[137,80,78,71]);
});

test('Untrusted persistence/network errors never leak credentials to the browser',async()=>{
  const secret='private-upstream-service-account-content';
  const services={createGEEImageryMap:async()=>({sessionId:'a'.repeat(40),scene})};
  const response=await geeImageryAPI(request('map',{sceneId:scene.id,geometry}),{}, {services,persistScene:async()=>{throw new Error(secret);}});
  assert.equal(response.status,502);assert.doesNotMatch(await response.text(),new RegExp(secret));
});


test('basemap is a geometry-only read endpoint with no mission persistence side effect',async()=>{
  const geometry={type:'Polygon',coordinates:[[[101.1,12.5],[101.2,12.5],[101.2,12.6],[101.1,12.6],[101.1,12.5]]]};let calls=0;
  const options={persistScene:()=>assert.fail('Background is never persisted as a surveyed scene'),services:{createGEEBasemap:async(_env,input)=>{calls++;assert.deepEqual(input,{geometry});return {kind:'gee_basemap',imageCount:2};}}};
  const make=body=>new Request('https://xedo.example/api/v1/gee/imagery/basemap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await geeImageryAPI(make({geometry}),{},options);assert.equal(response.status,200);assert.deepEqual(await response.json(),{kind:'gee_basemap',imageCount:2});
  const rejected=await geeImageryAPI(make({geometry,sceneId:'untrusted'}),{},options);assert.equal(rejected.status,422);assert.equal(calls,1);
});
