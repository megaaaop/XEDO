import {loadSatelliteGround} from './planning-3d-satellite.js';

/** One display-only ground texture. Mission evidence and readiness never enter this lifecycle. */
export function createGroundController({load=loadSatelliteGround,onState=()=>{},onTexture=()=>{},now=Date.now}={}){
  let mode='diagram',active=false,available=true,geometry=null,key=null,record=null,pending=null,generation=0,disposed=false,failed=false,publishedTexture=null,failureCode='';
  const release=value=>value?.dispose?.();
  const failureMessage=()=>({GROUND_EMPTY:'No satellite pixels cover this ground. Use Diagram or retry later.',GROUND_PARTIAL:'Satellite imagery does not cover the complete ground. Use Diagram or retry later.',GROUND_TIMEOUT:'Satellite ground timed out. Check the connection and retry.',GROUND_INPUT:'This ground is outside the satellite display limits. Use Diagram.',GROUND_GEOMETRY:'Satellite ground does not match this floor. Retry the image.'}[failureCode]||'Satellite ground could not load. Retry the image or use Diagram.');
  function publishTexture(value){
    if(value===publishedTexture)return true;
    const accepted=onTexture(value);publishedTexture=value;
    return accepted!==false||!value;
  }
  function stop(){generation++;pending?.controller.abort();pending=null;}
  function show(){
    if(disposed)return;
    publishTexture(mode==='satellite'&&record?record:null);
    if(mode==='diagram')onState({status:'diagram',message:'Diagram ground',mode});
    else if(!available)onState({status:'unavailable',message:'Satellite ground needs the online website.',mode});
    else if(record)onState({status:'ready',texture:record,mode});
    else if(failed)onState({status:'error',mode,message:failureMessage()});
  }
  async function run(){
    if(disposed||!active||mode!=='satellite'||!available||!geometry||failed)return;
    if(record&&Date.parse(record.expiresAt)>now()){show();return;}
    if(pending)return;
    if(record){publishTexture(null);release(record);record=null;}
    const token=++generation,controller=new AbortController();pending={controller};
    onState({status:'loading',stage:'map',mode,message:'Preparing satellite ground…'});
    try{
      const texture=await load(structuredClone(geometry),{signal:controller.signal,onProgress:progress=>{
        if(token===generation&&!disposed&&active&&mode==='satellite')onState({status:'loading',mode,...progress});
      }});
      if(disposed||token!==generation||controller.signal.aborted||!active||mode!=='satellite'){release(texture);return;}
      if(!publishTexture(texture)){release(texture);throw Object.assign(Error('Ground extent mismatch'),{code:'GROUND_GEOMETRY'});}
      record=texture;show();
    }catch(error){
      if(token!==generation||disposed||controller.signal.aborted)return;
      failed=true;failureCode=error?.code||'GROUND_UNAVAILABLE';publishTexture(null);onState({status:'error',mode,message:globalThis.navigator?.onLine===false?'You are offline. Reconnect and retry satellite ground.':failureMessage(),reason:failureCode});
    }finally{if(token===generation)pending=null;}
  }
  return {
    update({geometry:value,available:allowed=true}={}){
      if(disposed)return;
      const nextKey=JSON.stringify(value);
      if(nextKey!==key){stop();publishTexture(null);release(record);record=null;failed=false;key=nextKey;geometry=value?structuredClone(value):null;}
      available=allowed;active=true;show();void run();
    },
    setMode(value){
      if(disposed||!['diagram','satellite'].includes(value))return;
      if(mode!==value){stop();mode=value;}show();void run();
    },
    suspend(){if(disposed)return;active=false;stop();},
    retry(){if(disposed)return;stop();publishTexture(null);release(record);record=null;failed=false;void run();},
    clear(){if(disposed)return;stop();publishTexture(null);release(record);record=null;failed=false;geometry=null;key=null;active=false;show();},
    dispose(){if(disposed)return;stop();publishTexture(null);release(record);record=null;geometry=null;active=false;disposed=true;}
  };
}
