import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {searchGEEImagery,createGEEImageryMap,getGEEImageryTile} from '../src/gee-imagery.js';

const privateKey=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
const geometry={type:'Polygon',coordinates:[[[101.19,12.59],[101.2,12.59],[101.2,12.6],[101.19,12.6],[101.19,12.59]]]};
const footprint={type:'Polygon',coordinates:[[[100,12],[102,12],[102,14],[100,14],[100,12]]]};
const id='gee:COPERNICUS/S2_SR_HARMONIZED/20261010T034539_20261010T035153_T47PQQ';
const search={geometry,start:'2026-10-01',end:'2026-10-23',maxCloud:80};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAABPO1TCQAAAABJRU5ErkJggg','base64url');
const pointTile=()=>{const z=12,n=2**z;return {z,x:Math.floor((101.195+180)/360*n),y:Math.floor((1-Math.asinh(Math.tan(12.595*Math.PI/180))/Math.PI)/2*n)};};
let fixtureIndex=0;
function fixture(){
  const project='xedo-imagery-test-'+(++fixtureIndex),env={GEE_PROJECT_ID:project,GEE_SERVICE_ACCOUNT_JSON:JSON.stringify({type:'service_account',client_email:'fixture@'+project+'.iam.gserviceaccount.com',private_key:privateKey})};
  const calls={auth:0,compute:0,map:0,tile:0,pixels:0,bodies:[]};
  const state={features:[{type:'Feature',geometry:footprint,properties:{id:id.slice(4),acquiredMs:Date.parse('2026-10-10T03:45:39Z'),cloudCover:12.5,platform:'Sentinel-2A',coversAOI:true}}],mode:'ok',expiredOnce:false};
  const secret='never-return-private-upstream-content';
  const fetchImpl=async(url,options)=>{
    assert.equal(options.redirect,'error');
    if(url==='https://oauth2.googleapis.com/token'){calls.auth++;return Response.json({access_token:secret,token_type:'Bearer',expires_in:3600});}
    assert.equal(options.headers.Authorization,'Bearer '+secret);
    assert.equal(options.headers['X-Goog-User-Project'],project);
    assert.ok(url.startsWith('https://earthengine.googleapis.com/v1/projects/'));
    if(state.mode==='network')throw Object.assign(new Error(secret),{code:'GEE_ACCESS_DENIED'});
    if(state.mode==='denied')return Response.json({error:{message:secret}},{status:403});
    if(state.mode==='timeout')return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error(secret)),{once:true}));
    if(url.endsWith('/value:compute')){
      calls.compute++;const body=JSON.parse(options.body);calls.bodies.push(body);
      if(state.mode==='invalid-json')return new Response(secret,{headers:{'Content-Type':'application/json'}});
      if(state.mode==='too-large')return new Response(secret,{headers:{'Content-Type':'application/json','Content-Length':String(1024*1024+1)}});
      const isSearch=body.expression.values.result.functionInvocationValue.functionName==='Collection.toList';
      return Response.json({result:isSearch?state.features:state.features[0]});
    }
    if(url.endsWith('/maps')){calls.map++;calls.bodies.push(JSON.parse(options.body));if(state.mapDenied)return Response.json({error:{message:secret}},{status:403});return Response.json({name:state.mode==='foreign-map'?'projects/another-project/maps/private-map':'projects/'+project+'/maps/test-map-'+calls.map});}
    if(url.endsWith('/image:computePixels')){
      calls.pixels++;calls.bodies.push(JSON.parse(options.body));
      if(state.mode==='html-tile')return new Response('<html>'+secret+'</html>',{headers:{'Content-Type':'text/html'}});
      if(state.mode==='invalid-png')return new Response(secret,{headers:{'Content-Type':'image/png'}});
      return new Response(png,{headers:{'Content-Type':'image/png'}});
    }
    if(url.includes('/tiles/')){
      calls.tile++;
      if(state.expiredOnce&&calls.tile===1)return new Response(null,{status:404});
      if(state.mode==='html-tile')return new Response('<html>'+secret+'</html>',{headers:{'Content-Type':'text/html'}});
      if(state.mode==='invalid-png')return new Response(secret,{headers:{'Content-Type':'image/png'}});
      return new Response(png,{headers:{'Content-Type':'image/png'}});
    }
    throw new Error('Unexpected test endpoint');
  };
  return {env,calls,state,secret,fetchImpl};
}
const safeFailure=(error,code,secret)=>{assert.equal(error.code,code);assert.ok(!JSON.stringify({message:error.message,code:error.code,...error}).includes(secret));return true;};

test('satellite search rejects arbitrary assets, invalid geometry/dates and credentials before an upstream request',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw new Error('Unexpected');};
  for(const input of [{...search,url:'https://evil.example'},{...search,geometry:null},{...search,end:'invalid'},{...search,end:'2026-02-30'},{...search,start:'2026-01-01',end:'2026-10-01'},{...search,maxCloud:'80'},{...search,geometry:{type:'Polygon',coordinates:[[[100,10],[102,10],[102,12],[100,12],[100,10]]]}}])await assert.rejects(()=>searchGEEImagery({},input,{fetchImpl}),e=>e.status===422);
  await assert.rejects(()=>searchGEEImagery({},search,{fetchImpl}),e=>e.code==='GEE_NOT_CONFIGURED');
  assert.equal(calls,0);
});

test('fixed Sentinel-2 metadata search filters full AOI coverage, preserves provenance and reuses isolated cache',async()=>{
  const v=fixture();v.state.features.push({...structuredClone(v.state.features[0]),properties:{...v.state.features[0].properties,id:id.slice(4).replace('20261010T034539','20261009T034539'),coversAOI:false}});
  const first=await searchGEEImagery(v.env,search,{fetchImpl:v.fetchImpl});
  assert.equal(first.scenes.length,1);assert.equal(first.scenes[0].id,id);assert.equal(first.scenes[0].assetKind,'gee_tiles');assert.equal(first.scenes[0].coversAOI,true);assert.equal(first.scenes[0].resolution,10);
  const serialized=JSON.stringify(v.calls.bodies[0]);
  assert.match(serialized,/COPERNICUS\/S2_SR_HARMONIZED/);assert.match(serialized,/Geometry.contains/);assert.match(serialized,/CLOUDY_PIXEL_PERCENTAGE/);assert.match(serialized,/Collection.map/);assert.ok(!serialized.includes(privateKey));
  first.scenes[0].id='caller-mutated';
  const cached=await searchGEEImagery(v.env,search,{fetchImpl:v.fetchImpl});assert.equal(cached.cache,true);assert.equal(cached.scenes[0].id,id);assert.equal(v.calls.compute,1);
  const other=fixture();await searchGEEImagery(other.env,search,{fetchImpl:other.fetchImpl});assert.equal(other.calls.compute,1);
});

test('map creation validates canonical scene metadata after restart and renders fixed RGB with an encrypted session',async()=>{
  const v=fixture();
  const map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});
  assert.equal(map.scene.id,id);assert.match(map.sessionId,/^[A-Za-z0-9_-]{80,4096}$/);assert.ok(!map.sessionId.includes(v.secret));assert.ok(!Buffer.from(map.sessionId,'base64url').toString().includes('projects/'));
  assert.equal(v.calls.compute,1);assert.equal(v.calls.map,1);
  const body=v.calls.bodies.at(-1);assert.deepEqual(body.bandIds,['B4','B3','B2']);assert.equal(body.fileFormat,'PNG');assert.deepEqual(body.visualizationOptions,{ranges:[{min:0,max:3000}],gamma:1.2});assert.match(JSON.stringify(body.expression),/Image.clip/);
  await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});assert.equal(v.calls.map,1);assert.equal(v.calls.compute,1);
  await assert.rejects(()=>createGEEImageryMap(v.env,{sceneId:'gee:users/private/image',geometry},{fetchImpl:v.fetchImpl}),e=>e.code==='GEE_SCENE_INVALID');
});

test('server-created scenes and map responses must cover the whole AOI and remain within the configured project',async()=>{
  const v=fixture();v.state.features[0].properties.coversAOI=false;
  await assert.rejects(()=>createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl}),e=>e.code==='GEE_SCENE_COVERAGE');assert.equal(v.calls.map,0);
  const wrong=fixture();wrong.state.mode='foreign-map';await assert.rejects(()=>createGEEImageryMap(wrong.env,{sceneId:id,geometry},{fetchImpl:wrong.fetchImpl}),e=>e.code==='GEE_RESPONSE_INVALID');
});

test('PNG tiles load on a fresh module instance, cache privately, and do not expose upstream authorization',async()=>{
  const v=fixture(),map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});
  const fresh=await import('../src/gee-imagery.js?stateless='+crypto.randomUUID());
  const tile=await fresh.getGEEImageryTile(v.env,{sessionId:map.sessionId,...pointTile()},{fetchImpl:v.fetchImpl});
  assert.equal(tile.status,200);assert.equal(tile.headers.get('Content-Type'),'image/png');assert.match(tile.headers.get('Cache-Control'),/^private/);assert.deepEqual(Buffer.from(await tile.arrayBuffer()),png);assert.ok(!JSON.stringify([...tile.headers]).includes(v.secret));
  const again=await fresh.getGEEImageryTile(v.env,{sessionId:map.sessionId,...pointTile()},{fetchImpl:v.fetchImpl});assert.equal(again.headers.get('X-XEDO-Cache'),'hit');assert.equal(v.calls.tile,1);
});

test('read-only credentials fall back to a stateless computePixels session with a fixed Web Mercator RGB grid',async()=>{
  const v=fixture();v.state.mapDenied=true;
  const map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});
  assert.equal(map.renderMode,'pixels');assert.equal(v.calls.map,1);
  const second=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});assert.equal(second.renderMode,'pixels');assert.equal(v.calls.map,1);
  const fresh=await import('../src/gee-imagery.js?pixels='+crypto.randomUUID()),coordinates=pointTile();
  const tile=await fresh.getGEEImageryTile(v.env,{sessionId:map.sessionId,...coordinates},{fetchImpl:v.fetchImpl});
  assert.deepEqual(Buffer.from(await tile.arrayBuffer()),png);assert.equal(v.calls.tile,0);assert.equal(v.calls.pixels,1);assert.equal(v.calls.map,1);
  const body=v.calls.bodies.at(-1),scale=40075016.68557849/(2**coordinates.z*256);
  assert.deepEqual(body.grid.dimensions,{width:256,height:256});assert.equal(body.grid.crsCode,'EPSG:3857');
  assert.deepEqual(body.grid.affineTransform,{scaleX:scale,shearX:0,translateX:-20037508.342789244+coordinates.x*256*scale,shearY:0,scaleY:-scale,translateY:20037508.342789244-coordinates.y*256*scale});
  assert.deepEqual(body.bandIds,['B4','B3','B2']);assert.deepEqual(body.visualizationOptions,{ranges:[{min:0,max:3000}],gamma:1.2});assert.equal(body.fileFormat,'PNG');assert.ok(!JSON.stringify(body).includes(privateKey));
});

test('session tampering, expiry, different credentials and invalid tile coordinates are rejected before tile fetch',async()=>{
  const v=fixture();let clock=Date.parse('2026-10-23T00:00:00Z');
  const map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl,now:()=>clock});
  const replaced=(map.sessionId[0]==='A'?'B':'A')+map.sessionId.slice(1);
  await assert.rejects(()=>getGEEImageryTile(v.env,{sessionId:replaced,...pointTile()},{fetchImpl:v.fetchImpl,now:()=>clock}),e=>e.code==='GEE_SESSION_INVALID');
  const other=fixture();await assert.rejects(()=>getGEEImageryTile(other.env,{sessionId:map.sessionId,...pointTile()},{fetchImpl:other.fetchImpl,now:()=>clock}),e=>e.code==='GEE_SESSION_INVALID');
  for(const point of [{z:19,x:0,y:0},{z:1,x:2,y:0},{z:1,x:0,y:-1},{z:1.5,x:0,y:0}])await assert.rejects(()=>getGEEImageryTile(v.env,{sessionId:map.sessionId,...point},{fetchImpl:v.fetchImpl}),e=>e.code==='GEE_TILE_INVALID');
  clock+=30*60*1000+1;
  await assert.rejects(()=>getGEEImageryTile(v.env,{sessionId:map.sessionId,...pointTile()},{fetchImpl:v.fetchImpl,now:()=>clock}),e=>e.code==='GEE_SESSION_EXPIRED');assert.equal(v.calls.tile,0);
});

test('tiles outside the approved AOI are transparent and consume no upstream requests',async()=>{
  const v=fixture(),map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});
  const tile=await getGEEImageryTile(v.env,{sessionId:map.sessionId,z:12,x:0,y:0},{fetchImpl:v.fetchImpl});
  assert.equal(tile.status,200);assert.equal(tile.headers.get('X-XEDO-Cache'),'outside-aoi');assert.equal(v.calls.tile,0);
  const data=Buffer.from(await tile.arrayBuffer());assert.equal(data.readUInt32BE(16),256);assert.equal(data.readUInt32BE(20),256);
  const compressed=[];for(let offset=8;offset<data.length;){const size=data.readUInt32BE(offset);if(data.toString('ascii',offset+4,offset+8)==='IDAT')compressed.push(data.subarray(offset+8,offset+8+size));offset+=12+size;}
  assert.ok(inflateSync(Buffer.concat(compressed)).every(byte=>byte===0));
});

test('expired upstream maps renew once and concurrent tile requests share work',async()=>{
  const v=fixture(),map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});v.state.expiredOnce=true;
  const tiles=await Promise.all(Array.from({length:3},()=>getGEEImageryTile(v.env,{sessionId:map.sessionId,...pointTile()},{fetchImpl:v.fetchImpl})));
  assert.equal(v.calls.map,2);assert.equal(v.calls.tile,2);for(const tile of tiles)assert.deepEqual(Buffer.from(await tile.arrayBuffer()),png);
});

test('upstream denied, malformed, oversized and timed-out responses retain sanitized errors',async()=>{
  for(const [mode,code] of [['network','GEE_UNAVAILABLE'],['denied','GEE_ACCESS_DENIED'],['invalid-json','GEE_RESPONSE_INVALID'],['too-large','GEE_RESPONSE_INVALID'],['timeout','GEE_TIMEOUT']]){
    const v=fixture();v.state.mode=mode;
    await assert.rejects(()=>searchGEEImagery(v.env,search,{fetchImpl:v.fetchImpl,timeoutMs:mode==='timeout'?5:1000}),e=>safeFailure(e,code,v.secret));
  }
  for(const mode of ['html-tile','invalid-png']){const v=fixture(),map=await createGEEImageryMap(v.env,{sceneId:id,geometry},{fetchImpl:v.fetchImpl});v.state.mode=mode;await assert.rejects(()=>getGEEImageryTile(v.env,{sessionId:map.sessionId,...pointTile()},{fetchImpl:v.fetchImpl}),e=>safeFailure(e,'GEE_RESPONSE_INVALID',v.secret));}
});
