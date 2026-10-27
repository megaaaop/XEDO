import {validateGeometry} from './domain.js';
import {requestGEEBasemap} from './planning-basemap.js';
import {bindGEEBasemap} from './planning-basemap-view.js';

const HALF_WORLD = Math.PI * 6378137;
const WORLD = HALF_WORLD * 2;
const TILE_SIZE = 256;
const MAX_TILE_BYTES = 1024 * 1024;
const PNG_SIGNATURE = [137,80,78,71,13,10,26,10];
const knownErrors = new WeakSet();
const aborted = () => new DOMException('Satellite ground loading cancelled.', 'AbortError');
function failure(code, message) {
  const error = Object.assign(new Error(message), {code});
  knownErrors.add(error);
  return error;
}
const invalid = () => failure('GROUND_INPUT', 'The 3D satellite ground area is invalid or too large. Use Diagram mode or choose a smaller area.');
const mercator = ([longitude,latitude]) => [longitude / 180 * HALF_WORLD, Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360)) * 6378137];

/** Native-resolution display tiles, with fixed memory/request budgets independent of zoom. */
export function satelliteGroundGrid(geometry) {
  try { validateGeometry(geometry); } catch { throw invalid(); }
  const ring = geometry.coordinates[0];
  if (ring.length > 121 || ring.some(point => Math.abs(point[1]) > 80)) throw invalid();
  const longitudes = ring.map(point => point[0]), latitudes = ring.map(point => point[1]);
  const midpointLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const cosine = Math.cos(midpointLatitude * Math.PI / 180);
  const projected = ring.map(mercator);
  const bounds = [Math.min(...projected.map(point => point[0])),Math.min(...projected.map(point => point[1])),Math.max(...projected.map(point => point[0])),Math.max(...projected.map(point => point[1]))];
  if (Math.max(...longitudes) - Math.min(...longitudes) > 180 || (bounds[2] - bounds[0]) * cosine > 100000 || (Math.max(...latitudes) - Math.min(...latitudes)) * 111320 > 100000) throw invalid();
  // A zoom chosen from source resolution, never from screen/device pixel density.
  // The small resampling difference around 10 m does not add source detail.
  let zoom = Math.min(18, Math.max(0, Math.ceil(Math.log2(WORLD * cosine / (TILE_SIZE * 10)))));
  let grid;
  for (; zoom >= 0; zoom--) {
    const tileSpan = WORLD / 2 ** zoom;
    const maximum = 2 ** zoom - 1;
    const x0 = Math.max(0, Math.min(maximum, Math.floor((bounds[0] + HALF_WORLD) / tileSpan)));
    const x1 = Math.max(0, Math.min(maximum, Math.ceil((bounds[2] + HALF_WORLD) / tileSpan) - 1));
    const y0 = Math.max(0, Math.min(maximum, Math.floor((HALF_WORLD - bounds[3]) / tileSpan)));
    const y1 = Math.max(0, Math.min(maximum, Math.ceil((HALF_WORLD - bounds[1]) / tileSpan) - 1));
    const columns = Math.max(1,x1 - x0 + 1), rows = Math.max(1,y1 - y0 + 1);
    if (columns > 8 || rows > 8 || columns * rows > 64) continue;
    const extent = [x0 * tileSpan - HALF_WORLD,HALF_WORLD - (y1 + 1) * tileSpan,(x1 + 1) * tileSpan - HALF_WORLD,HALF_WORLD - y0 * tileSpan];
    grid = {zoom,x0,y0,columns,rows,width:columns*TILE_SIZE,height:rows*TILE_SIZE,extent,pixelSizeM:tileSpan/TILE_SIZE*cosine};
    break;
  }
  if (!grid) throw invalid();
  grid.tiles = Array.from({length:grid.columns*grid.rows}, (_,index) => ({z:grid.zoom,x:grid.x0+index%grid.columns,y:grid.y0+Math.floor(index/grid.columns),left:(index%grid.columns)*TILE_SIZE,top:Math.floor(index/grid.columns)*TILE_SIZE}));
  grid.pixelRing = projected.map(([x,y]) => [(x-grid.extent[0])/(grid.extent[2]-grid.extent[0])*grid.width,(grid.extent[3]-y)/(grid.extent[3]-grid.extent[1])*grid.height]);
  return grid;
}

/** Count only requested-ground pixels, excluding transparent atlas padding. */
export function satelliteGroundCoverage(data, width, height, ring) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || data?.length !== width*height*4 || !Array.isArray(ring) || ring.length < 4 || ring.some(point=>!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))) throw invalid();
  let total = 0, visible = 0;
  const minY = Math.max(0,Math.ceil(Math.min(...ring.map(point=>point[1]))-.5));
  const maxY = Math.min(height-1,Math.ceil(Math.max(...ring.map(point=>point[1]))-.5)-1);
  // Scanline intersections keep this linear in pixel count, even on a 2048² atlas.
  for (let row=minY;row<=maxY;row++) {
    const scan=row+.5, crossings=[];
    for (let i=0;i<ring.length-1;i++) {
      const a=ring[i],b=ring[i+1];
      if ((a[1]>scan)!==(b[1]>scan)) crossings.push(a[0]+(scan-a[1])/(b[1]-a[1])*(b[0]-a[0]));
    }
    crossings.sort((a,b)=>a-b);
    for (let i=0;i+1<crossings.length;i+=2) {
      const left=Math.max(0,Math.ceil(crossings[i]-.5)),right=Math.min(width-1,Math.ceil(crossings[i+1]-.5)-1);
      for (let col=left;col<=right;col++) { total++;if(data[(row*width+col)*4+3]>0)visible++; }
    }
  }
  // Subpixel grounds still need a decoded pixel at their location.
  if (!total) {
    const points=ring.slice(0,-1),x=Math.max(0,Math.min(width-1,Math.floor(points.reduce((sum,point)=>sum+point[0],0)/points.length))),y=Math.max(0,Math.min(height-1,Math.floor(points.reduce((sum,point)=>sum+point[1],0)/points.length)));
    total=1;visible=data[(y*width+x)*4+3]>0?1:0;
  }
  return {total,visible,fraction:visible/total};
}

async function tileBlob(response, check, signal) {
  if (!response.ok) {
    await response.body?.cancel();
    throw failure('GROUND_TILES', `Satellite ground tiles could not load (HTTP ${response.status}). Retry satellite.`);
  }
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('image/png') || Number(response.headers.get('content-length'))>MAX_TILE_BYTES) {
    await response.body?.cancel();
    throw failure('GROUND_TILE_INVALID','Satellite ground returned an invalid image tile. Retry satellite.');
  }
  const reader=response.body?.getReader();
  if(!reader)throw failure('GROUND_TILE_INVALID','Satellite ground returned an unreadable image tile. Retry satellite.');
  const chunks=[];let length=0;
  const cancel=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',cancel,{once:true});
  try {
    while(true) {
      const next=await reader.read();check();if(next.done)break;
      length+=next.value.byteLength;
      if(length>MAX_TILE_BYTES)throw failure('GROUND_TILE_INVALID','Satellite ground returned an oversized image tile. Retry satellite.');
      chunks.push(next.value);
    }
  } finally { signal.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  if(PNG_SIGNATURE.some((value,index)=>bytes[index]!==value))throw failure('GROUND_TILE_INVALID','Satellite ground returned an invalid PNG image. Retry satellite.');
  return new Blob([bytes],{type:'image/png'});
}

/** Real, georeferenced recent Sentinel-2 pixels for display only, never review evidence. */
export async function loadSatelliteGround(geometry, {
  signal,onProgress=()=>{},fetchImpl=globalThis.fetch,timeoutMs=60000,now=Date.now,
  requestMap=requestGEEBasemap,decodeImage=blob=>createImageBitmap(blob),
  createCanvas=(width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
}={}) {
  const requested=structuredClone(geometry),grid=satelliteGroundGrid(requested);
  if(signal?.aborted)throw aborted();
  const controller=new AbortController();let finished=false,canvas=null,timer,cancel,timedOut=false;
  const check=()=>{if(finished||signal?.aborted||controller.signal.aborted)throw aborted();};
  const cancellation=new Promise((_,reject)=>{
    cancel=()=>{controller.abort();reject(aborted());};
    signal?.addEventListener('abort',cancel,{once:true});
    timer=setTimeout(()=>{timedOut=true;controller.abort();reject(failure('GROUND_TIMEOUT','Satellite ground loading timed out. Check the connection and retry satellite.'));},Math.max(1,Math.min(120000,timeoutMs)));
  });
  const task=(async()=>{
    check();onProgress({stage:'map',completedTiles:0,totalTiles:grid.tiles.length});
    const received=await requestMap(requested,{signal:controller.signal,fetchImpl,now,onRetry:()=>{check();onProgress({stage:'map',retrying:true,completedTiles:0,totalTiles:grid.tiles.length});}});
    check();
    // The production requestMap validates this already. Keep the rendering boundary
    // strict as well, so a test seam or future transport cannot introduce a remote URL.
    let manifest;
    try { manifest=bindGEEBasemap(received,requested,{now:now()}); }
    catch { throw failure('GROUND_RESPONSE','Satellite ground returned an invalid map session. Retry satellite.'); }
    canvas=createCanvas(grid.width,grid.height);
    const context=canvas?.getContext?.('2d',{willReadFrequently:true});
    if(!context)throw failure('GROUND_CANVAS','This browser could not create the satellite ground image. Use Diagram mode.');
    let cursor=0,completed=0;
    onProgress({stage:'tiles',completedTiles:0,totalTiles:grid.tiles.length});
    async function worker() {
      while(cursor<grid.tiles.length) {
        check();const tile=grid.tiles[cursor++];
        const url=manifest.tileUrl.replace('{z}',tile.z).replace('{x}',tile.x).replace('{y}',tile.y);
        const response=await fetchImpl(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal});
        try { check(); } catch(error) { await response.body?.cancel();throw error; }
        const blob=await tileBlob(response,check,controller.signal);check();
        const bitmap=await decodeImage(blob);
        try {
          check();
          if(bitmap?.width!==TILE_SIZE||bitmap?.height!==TILE_SIZE)throw failure('GROUND_TILE_INVALID','Satellite ground returned an invalid image size. Retry satellite.');
          context.drawImage(bitmap,tile.left,tile.top);completed++;
          onProgress({stage:'tiles',completedTiles:completed,totalTiles:grid.tiles.length});
        } finally { bitmap?.close?.(); }
      }
    }
    await Promise.all(Array.from({length:Math.min(4,grid.tiles.length)},worker));check();
    const coverage=satelliteGroundCoverage(context.getImageData(0,0,grid.width,grid.height).data,grid.width,grid.height,grid.pixelRing);
    if(!coverage.visible)throw failure('GROUND_EMPTY','No visible satellite pixels cover this 3D ground. Use Diagram mode or retry later.');
    if(coverage.fraction<.995)throw failure('GROUND_PARTIAL','Satellite imagery does not cover the complete 3D ground. Use Diagram mode or retry later.');
    check();onProgress({stage:'ready',completedTiles:completed,totalTiles:grid.tiles.length});
    let disposed=false;
    return {image:canvas,extent:[...grid.extent],acquiredFrom:manifest.acquiredFrom,acquiredTo:manifest.acquiredTo,imageCount:manifest.imageCount,sourceResolutionM:10,pixelSizeM:grid.pixelSizeM,expiresAt:manifest.expiresAt,coverageFraction:coverage.fraction,
      dispose(){if(disposed)return;disposed=true;canvas.width=1;canvas.height=1;}};
  })();
  try { return await Promise.race([task,cancellation]); }
  catch(error) {
    controller.abort();
    if(canvas){canvas.width=1;canvas.height=1;}
    if(signal?.aborted)throw aborted();
    if(timedOut)throw failure('GROUND_TIMEOUT','Satellite ground loading timed out. Check the connection and retry satellite.');
    if(knownErrors.has(error))throw error;
    throw failure('GROUND_UNAVAILABLE','Satellite ground could not load. Check the connection and retry satellite.');
  } finally { finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel); }
}
