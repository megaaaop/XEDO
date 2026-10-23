import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';
import TileState from 'ol/TileState.js';
import {unByKey} from 'ol/Observable.js';
import {basemapMinZoom,basemapViewport,basemapContains,bindGEEBasemap} from './planning-basemap-view.js';
import {hasVisibleSatellitePixels} from './planning-satellite.js';

const tileKey=tile=>tile.getTileCoord().join('/');
const date=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
const label=m=>'Google Earth Engine · Sentinel-2 · '+date(m.acquiredFrom)+'–'+date(m.acquiredTo)+' UTC · '+m.imageCount+' images';
const aborted=()=>new DOMException('Background map cancelled.','AbortError');
function imageBlob(tile,blob){
  const image=tile.getImage(),url=URL.createObjectURL(blob);
  const clean=()=>{URL.revokeObjectURL(url);image.removeEventListener('load',clean);image.removeEventListener('error',clean);};
  image.addEventListener('load',clean,{once:true});image.addEventListener('error',clean,{once:true});image.src=url;
}
async function visiblePixels(blob){
  const bitmap=await createImageBitmap(blob);
  try{
    if(bitmap.width!==256||bitmap.height!==256)throw Error('The background image tile has invalid dimensions.');
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(bitmap,0,0);
    return hasVisibleSatellitePixels(context.getImageData(0,0,256,256).data);
  }finally{bitmap.close();}
}

/** Navigation imagery never creates an inspection or grants mission readiness. */
export function createGEEBasemap({map,onState}){
  let active=true,disposed=false,generation=0,debounce=null,current=null,pending=null,expiry=null,requestController=null;
  const emit=(status,message='',manifest=current?.manifest)=>onState({status,message,label:manifest?label(manifest):'Google Earth Engine · Sentinel-2',retry:status==='error'});
  function constrain(){
    const size=map.getSize();if(!size?.every(n=>n>0))return;
    const minimum=basemapMinZoom(size),view=map.getView();
    if(Math.abs(view.getMinZoom()-minimum)>.00001)view.setMinZoom(minimum);
  }
  function stop(){
    generation++;requestController?.abort();requestController=null;clearTimeout(debounce);clearTimeout(expiry);debounce=null;
    if(pending){pending.controller.abort();for(const tile of pending.pending)tile.setState(TileState.EMPTY);pending.queue.length=0;clearTimeout(pending.timer);map.removeLayer(pending.layer);pending=null;}
    if(current&&!current.frozen){current.controller.abort();for(const tile of current.pending)tile.setState(TileState.EMPTY);current.queue.length=0;current.frozen=true;}
    if(!active&&current)map.removeLayer(current.layer);
  }
  function schedule(delay=600){if(!active||disposed)return;clearTimeout(debounce);debounce=setTimeout(()=>run(),delay);}
  async function run(force=false){
    if(!active||disposed)return;stop();constrain();
    const token=generation,controller=new AbortController();requestController=controller;let record;
    try{
      const extent=map.getView().calculateExtent(map.getSize()),visible=basemapViewport(extent,{padding:1}),request=basemapViewport(extent);
      emit('loading','Loading Earth Engine background imagery…');
      let manifest;
      if(!force&&current&&Date.parse(current.manifest.expiresAt)>Date.now()+60000&&basemapContains(current.bbox,visible.bbox))manifest=current.manifest;
      else{
        const timeout=setTimeout(()=>controller.abort(),30000);let response;
        try{for(let attempt=0;attempt<2;attempt++){response=await fetch('/api/v1/gee/imagery/basemap',{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({geometry:request.geometry})});if(response.ok||![429,502,503,504].includes(response.status)||attempt)break;await response.body?.cancel();if(controller.signal.aborted)throw aborted();}}finally{clearTimeout(timeout);}
        if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Earth Engine background imagery returned an invalid response.');
        const data=await response.json();if(!response.ok)throw Error(data.message||'Earth Engine background imagery is unavailable.');
        manifest=bindGEEBasemap(data,request.geometry);
      }
      if(disposed||!active||token!==generation||controller.signal.aborted)throw aborted();
      const points=manifest.geometry.coordinates[0],bbox=[points[0][0],points[0][1],points[2][0],points[2][1]];
      record={controller,manifest,bbox,cache:new Map(current?.manifest.sessionId===manifest.sessionId?current.cache:[]),bytes:current?.manifest.sessionId===manifest.sessionId?current.bytes:0,zoom:0,frozen:false,pending:new Set(),seen:false,visible:false,running:0,queue:[]};
      const valid=()=>!disposed&&active&&token===generation&&!controller.signal.aborted;
      function fail(error){
        if(!valid())return;controller.abort();for(const tile of record.pending)tile.setState(TileState.EMPTY);record.queue.length=0;clearTimeout(record.timer);if(pending===record)pending=null;
        map.removeLayer(record.layer);emit('error',error.message||'Earth Engine background imagery could not load. Retry the map.');
      }
      function completed(){
        if(!valid()||record.ready||!record.seen||record.pending.size)return;
        if(!record.visible)return fail(Error('No visible Sentinel-2 background pixels cover this view. Move to a coastal area and retry.'));
        record.ready=true;clearTimeout(record.timer);if(current&&current!==record)map.removeLayer(current.layer);current=record;pending=null;
        emit('ready','Draw an inspection area directly on the satellite map.',manifest);
        expiry=setTimeout(()=>{if(active)run(true);},Math.max(1,Date.parse(manifest.expiresAt)-Date.now()));
      }
      async function load(tile,url){
        try{
          if(!valid())throw aborted();let blob=record.cache.get(tileKey(tile));
          if(!blob){
            let response;
            for(let attempt=0;attempt<2;attempt++){
              response=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal});
              if(response.ok||![429,502,503,504].includes(response.status)||attempt)break;
              await response.body?.cancel();
              await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{controller.signal.removeEventListener('abort',cancel);resolve();},500);const cancel=()=>{clearTimeout(timer);reject(aborted());};controller.signal.addEventListener('abort',cancel,{once:true});});
            }
            if(!response.ok||!response.headers.get('content-type')?.startsWith('image/png'))throw Error('Earth Engine background image tiles could not load. Retry the map.');
            blob=await response.blob();if(!valid())throw aborted();
            record.cache.set(tileKey(tile),blob);record.bytes+=blob.size;
            while(record.cache.size>128||record.bytes>8*1024*1024){const key=record.cache.keys().next().value;record.bytes-=record.cache.get(key).size;record.cache.delete(key);}
          }
          if(await visiblePixels(blob))record.visible=true;
          if(!valid())throw aborted();record.zoom=Math.max(record.zoom,tile.getTileCoord()[0]);imageBlob(tile,blob);
        }catch(error){tile.setState(TileState.EMPTY);if(valid())fail(error);}
      }
      function pump(){while(valid()&&record.running<4&&record.queue.length){const task=record.queue.shift();record.running++;load(...task).finally(()=>{record.running--;pump();});}}
      const source=new XYZ({url:manifest.tileUrl,maxZoom:18,wrapX:false,transition:0,attributions:'Contains modified Copernicus Sentinel data '+new Date(manifest.acquiredTo).getUTCFullYear()+'.',tileLoadFunction(tile,url){if(!valid()){record.pending.delete(tile);tile.setState(TileState.EMPTY);return;}record.queue.push([tile,url]);pump();}});
      record.layer=new TileLayer({source,zIndex:0});pending=record;
      source.on('tileloadstart',event=>record.pending.add(event.tile));
      source.on('tileloadend',event=>{record.pending.delete(event.tile);record.seen=true;queueMicrotask(completed);});
      source.on('tileloaderror',()=>fail(Error('Earth Engine background image tiles could not load. Retry the map.')));
      record.timer=setTimeout(()=>fail(Error('Earth Engine background imagery is taking too long. Retry the map.')),60000);
      emit('loading','Loading Earth Engine background pixels…',manifest);map.getLayers().insertAt(0,record.layer);
    }catch(error){
      if(token!==generation||!active||disposed)return;
      if(record){clearTimeout(record.timer);map.removeLayer(record.layer);}controller.abort();pending=null;
      emit('error',error.name==='AbortError'?'Earth Engine background imagery timed out. Retry the map.':error.message);
    }
  }
  const listeners=[map.on('moveend',()=>schedule()),map.on('change:size',()=>{constrain();schedule();})];
  constrain();schedule(0);
  return {
    setActive(value){if(active===value||disposed)return;active=value;stop();if(active)schedule(0);else emit('paused','Background imagery paused while you review a single acquisition.');},
    retry(){if(active&&!disposed)run(true);},
    dispose(){if(disposed)return;disposed=true;stop();unByKey(listeners);if(current)map.removeLayer(current.layer);current=null;}
  };
}
