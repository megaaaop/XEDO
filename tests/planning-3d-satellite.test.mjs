import test from 'node:test';
import assert from 'node:assert/strict';
import {satelliteGroundGrid,satelliteGroundCoverage,loadSatelliteGround} from '../src/planning-3d-satellite.js';

const rectangle=(west,south,east,north)=>({type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]});
const geometry=rectangle(101.22,12.62,101.24,12.64);
const now=Date.parse('2026-10-27T00:00:00Z');
const manifest=area=>({kind:'gee_basemap',provider:'gee',collection:'COPERNICUS/S2_SR_HARMONIZED',renderMode:'pixels',geometry:structuredClone(area),sessionId:'ground_session_1234567890',tileUrl:'/api/v1/gee/imagery/tiles/ground_session_1234567890/{z}/{x}/{y}',expiresAt:new Date(now+30*60*1000).toISOString(),start:'2026-09-28',end:'2026-10-27',imageCount:12,acquiredFrom:'2026-09-29T03:00:00Z',acquiredTo:'2026-10-22T03:00:00Z'});
const png=()=>new Response(new Uint8Array([137,80,78,71,13,10,26,10,0]),{headers:{'content-type':'image/png'}});
function canvasFactory(record) {
  return (width,height)=>{
    const data=new Uint8ClampedArray(width*height*4);
    const canvas={width,height,getContext(){return{
      drawImage(bitmap,left,top){record.draws.push([left,top]);for(let y=top;y<top+256;y++)for(let x=left;x<left+256;x++)data[(y*width+x)*4+3]=bitmap.alpha??255;},
      getImageData(){return{data};}
    };}};
    record.canvas=canvas;return canvas;
  };
}
function fixture(overrides={}) {
  const record={draws:[],closes:0,progress:[],requests:[]};
  return {record,options:{now:()=>now,requestMap:async area=>manifest(area),fetchImpl:async(url,options)=>{record.requests.push({url,options});return png();},decodeImage:async()=>({width:256,height:256,close(){record.closes++;}}),createCanvas:canvasFactory(record),onProgress:progress=>record.progress.push(progress),...overrides}};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('Ground grid uses native Sentinel-2 scale, correct north-to-south axes and bounded tile/canvas budgets',()=>{
  const before=structuredClone(geometry),grid=satelliteGroundGrid(geometry);
  assert.deepEqual(geometry,before);assert.equal(grid.zoom,14);assert.ok(grid.pixelSizeM>9&&grid.pixelSizeM<10);
  assert.ok(grid.pixelRing[0][1]>grid.pixelRing[2][1]);assert.ok(grid.pixelRing[0][0]<grid.pixelRing[2][0]);
  for(const point of grid.pixelRing)assert.ok(point[0]>=0&&point[0]<=grid.width&&point[1]>=0&&point[1]<=grid.height);
  for(const area of [geometry,rectangle(100,12,100.8,12.8),rectangle(10,70,11,70.4),rectangle(-180,-.02,-179.98,0),rectangle(179.98,-.02,180,0)]){
    const bounded=satelliteGroundGrid(area);
    assert.ok(bounded.width<=2048&&bounded.height<=2048);assert.ok(bounded.tiles.length<=64);
    assert.equal(bounded.tiles.length,bounded.columns*bounded.rows);
    assert.ok(bounded.tiles.every(tile=>tile.z===bounded.zoom&&tile.x>=0&&tile.y>=0&&tile.x<2**tile.z&&tile.y<2**tile.z));
  }
});

test('Ground grid rejects unsafe area/date-line/polar requests before fetching',async()=>{
  let requests=0;
  for(const area of [null,rectangle(101,12,103,13),rectangle(-179,0,179,1),rectangle(0,80,1,81),rectangle(1,1,1,1)]){
    assert.throws(()=>satelliteGroundGrid(area),/ground area is invalid/);
    await assert.rejects(loadSatelliteGround(area,{fetchImpl:()=>requests++}),/ground area is invalid/);
  }
  assert.equal(requests,0);
});

test('Ground pixel evidence ignores atlas padding and accepts opaque black as actual imagery',()=>{
  const data=new Uint8ClampedArray(4*4*4),ring=[[1,1],[3,1],[3,3],[1,3],[1,1]];
  for(const [x,y] of [[1,1],[2,1],[1,2],[2,2]])data[(y*4+x)*4+3]=255;
  assert.deepEqual(satelliteGroundCoverage(data,4,4,ring),{total:4,visible:4,fraction:1});
  data[(2*4+2)*4+3]=0;
  assert.deepEqual(satelliteGroundCoverage(data,4,4,ring),{total:4,visible:3,fraction:.75});
  const tiny=[[1.1,1.1],[1.2,1.1],[1.2,1.2],[1.1,1.2],[1.1,1.1]];
  assert.equal(satelliteGroundCoverage(data,4,4,tiny).fraction,1);
});

test('Ground loader assembles same-origin original tiles and emits real completion counts; dispose releases atlas',async()=>{
  const {record,options}=fixture(),before=structuredClone(geometry),result=await loadSatelliteGround(geometry,options),grid=satelliteGroundGrid(geometry);
  assert.deepEqual(geometry,before);assert.deepEqual(result.extent,grid.extent);assert.equal(result.sourceResolutionM,10);assert.equal(result.coverageFraction,1);
  assert.equal(result.image.width,grid.width);assert.equal(result.image.height,grid.height);assert.equal(record.requests.length,grid.tiles.length);assert.equal(record.closes,grid.tiles.length);
  assert.deepEqual(record.draws.sort(),grid.tiles.map(tile=>[tile.left,tile.top]).sort());
  assert.ok(record.requests.every(request=>/^\/api\/v1\/gee\/imagery\/tiles\/ground_session_1234567890\/14\/\d+\/\d+$/.test(request.url)&&request.options.redirect==='error'&&request.options.credentials==='same-origin'));
  assert.equal(record.progress[0].stage,'map');assert.equal(record.progress.at(-1).stage,'ready');
  assert.deepEqual(record.progress.filter(progress=>progress.stage==='tiles').map(progress=>progress.completedTiles),Array.from({length:grid.tiles.length+1},(_,index)=>index));
  result.dispose();result.dispose();assert.equal(result.image.width,1);assert.equal(result.image.height,1);
});

test('Ground loader limits concurrent downloads to four',async()=>{
  let active=0,maximum=0;
  const {options}=fixture({fetchImpl:async()=>{active++;maximum=Math.max(maximum,active);await tick();active--;return png();}});
  const result=await loadSatelliteGround(rectangle(101.2,12.6,101.3,12.7),options);
  assert.ok(maximum<=4);assert.equal(maximum,4);result.dispose();
});

test('Ground loader rejects mismatched/remote/expired manifests before loading image tiles',async()=>{
  for(const mutate of [m=>m.geometry=rectangle(1,1,2,2),m=>m.tileUrl='https://untrusted.invalid/tile.png',m=>m.expiresAt=new Date(now-1).toISOString(),m=>m.acquiredTo='invalid']){
    const {record,options}=fixture({requestMap:async area=>{const value=manifest(area);mutate(value);return value;}});
    await assert.rejects(loadSatelliteGround(geometry,options),error=>error.code==='GROUND_RESPONSE');
    assert.equal(record.requests.length,0);
  }
});

test('Ground loader rejects failed, non-PNG, oversized, malformed and wrongly sized image tiles without claiming ready',async()=>{
  const cases=[
    {fetchImpl:async()=>new Response('busy',{status:503})},
    {fetchImpl:async()=>new Response('<html>secret server error</html>',{headers:{'content-type':'text/html'}})},
    {fetchImpl:async()=>new Response(new Uint8Array(1024*1024+1),{headers:{'content-type':'image/png'}})},
    {fetchImpl:async()=>new Response('not png',{headers:{'content-type':'image/png'}})},
    {decodeImage:async()=>({width:128,height:256,close(){}})},
  ];
  for(const change of cases){
    const {record,options}=fixture(change);
    await assert.rejects(loadSatelliteGround(geometry,options),error=>/^GROUND_(TILES|TILE_INVALID)$/.test(error.code)&&!error.message.includes('secret'));
    assert.ok(record.progress.every(progress=>progress.stage!=='ready'));assert.equal(record.canvas.width,1);
  }
});

test('Ground loader rejects empty or missing floor coverage even when every tile request succeeded',async()=>{
  for(const alpha of [0]){
    const {record,options}=fixture({decodeImage:async()=>({width:256,height:256,alpha,close(){}})});
    await assert.rejects(loadSatelliteGround(geometry,options),error=>error.code==='GROUND_EMPTY');
    assert.ok(record.progress.every(progress=>progress.stage!=='ready'));
  }
  let index=0;
  const {record,options}=fixture({decodeImage:async()=>({width:256,height:256,alpha:index++===0?255:0,close(){}})});
  await assert.rejects(loadSatelliteGround(geometry,options),error=>error.code==='GROUND_PARTIAL');
  assert.ok(record.progress.every(progress=>progress.stage!=='ready'));
});

test('Aborting an ignored map response prevents late tile requests and ready progress',async()=>{
  const controller=new AbortController();let resolveMap;
  const {record,options}=fixture({signal:controller.signal,requestMap:()=>new Promise(resolve=>{resolveMap=resolve;})});
  const pending=loadSatelliteGround(geometry,options);controller.abort();
  await assert.rejects(pending,error=>error.name==='AbortError');resolveMap(manifest(geometry));await tick();
  assert.equal(record.requests.length,0);assert.equal(record.progress.length,1);
});

test('Deadline covers body reading and cancels a stalled tile stream',async()=>{
  let cancelled=0;
  const {record,options}=fixture({timeoutMs:10,fetchImpl:async()=>new Response(new ReadableStream({cancel(){cancelled++;}}),{headers:{'content-type':'image/png'}})});
  await assert.rejects(loadSatelliteGround(geometry,options),error=>error.code==='GROUND_TIMEOUT');await tick();
  assert.ok(cancelled>0);assert.ok(record.progress.every(progress=>progress.stage!=='ready'));assert.equal(record.canvas.width,1);
});

test('A decoded image arriving after cancellation is closed without drawing or finishing progress',async()=>{
  const controller=new AbortController();let resolveDecode,closes=0;
  const {record,options}=fixture({signal:controller.signal,decodeImage:()=>new Promise(resolve=>{resolveDecode=resolve;})});
  const pending=loadSatelliteGround(rectangle(101.22,12.62,101.2201,12.6201),options);
  while(!resolveDecode)await tick();controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');
  resolveDecode({width:256,height:256,close(){closes++;}});await tick();
  assert.equal(closes,1);assert.equal(record.draws.length,0);assert.ok(record.progress.every(progress=>progress.stage!=='ready'));
});
