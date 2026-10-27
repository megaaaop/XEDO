const MAX_RESPONSE_BYTES=524288;
const RETRYABLE_STATUS=new Set([429,500,502,503,504]);
const DEFINITIONS=Object.freeze({
  OFFLINE:['Your browser is offline. Reconnect to the internet, then refresh GEE data.',false],
  NETWORK:['The browser could not reach the planning-data service. Check the connection and refresh. The cause may be a network or browser connection failure.',true],
  TIMEOUT:['GEE planning data did not respond within 30 seconds. Refresh to try again.',false],
  SERVER_TIMEOUT:['The planning-data server or its GEE request timed out. Refresh to try again.',true],
  BUSY:['The planning-data service is busy. Wait a moment and refresh GEE data.',true],
  INPUT:['The mission request was rejected. Check the area, Home position, selected image and start/end times.',false],
  ACCESS:['The planning-data request was denied. Reload this XEDO website and try again.',false],
  ENDPOINT:['The planning-data endpoint could not be found. Reload the website to use the current version.',false],
  UPSTREAM:['The planning-data service could not complete this request. Refresh to try again.',true],
  RESPONSE_TYPE:['The server returned a page instead of planning-data JSON. Reload the website or retry the service.',false],
  RESPONSE_JSON:['The planning-data response could not be read as JSON. Refresh to request it again.',false],
  RESPONSE_SIZE:['The planning-data response exceeded its size limit. Use a smaller inspection area.',false],
  RESPONSE_INVALID:['The planning-data response failed its format or consistency checks. Refresh to request current data.',false],
  RESPONSE_MISMATCH:['The response does not match the current area, Home, image or time. Refresh GEE data for this mission.',false],
  RESPONSE_EXPIRED:['The planning-data response is expired or its timestamp could not be verified. Refresh GEE data.',false],
  CANCELLED:['The planning-data request was cancelled.',false]
});

export function planningContextError(code,{httpStatus=null,requestId=null,retryAfterMs=0}={}){
  const definition=DEFINITIONS[code]||DEFINITIONS.UPSTREAM;
  return Object.assign(new Error(definition[0]),{name:'PlanningContextError',code:DEFINITIONS[code]?code:'UPSTREAM',retryable:definition[1],httpStatus:Number.isInteger(httpStatus)?httpStatus:null,requestId:typeof requestId==='string'&&/^[a-zA-Z0-9:_.-]{1,160}$/.test(requestId)?requestId:null,retryAfterMs:Math.max(0,Math.min(5000,Number(retryAfterMs)||0))});
}

export function classifyPlanningContextError(error,{offline=false,timedOut=false}={}){
  if(timedOut)return planningContextError('TIMEOUT');
  if(offline)return planningContextError('OFFLINE');
  if(error?.name==='PlanningContextError')return error;
  if(error?.name==='AbortError')return planningContextError('CANCELLED');
  if(error instanceof TypeError)return planningContextError('NETWORK');
  // Never expose an arbitrary exception or upstream body in the interface.
  return planningContextError('UPSTREAM');
}

function httpError(reply,data){
  const status=reply.status,code=data?.code;
  const category=status===429?'BUSY':status===408||status===504?'SERVER_TIMEOUT':status===401||status===403?'ACCESS':status===404?'ENDPOINT':status>=400&&status<500?'INPUT':'UPSTREAM';
  const error=planningContextError(category,{httpStatus:status,requestId:reply.headers.get('x-request-id')||reply.headers.get('x-vercel-id'),retryAfterMs:Number(reply.headers.get('retry-after'))*1000});
  if(category==='INPUT'&&code==='GEE_CONTEXT_INPUT_INVALID'&&typeof data.message==='string'){
    const hints=[
      [/^GEE context supports at most 120 vertices and 100 km²\.$/,'AREA_LIMIT','Use an inspection area of at most 100 km² with no more than 120 boundary points.'],
      [/^GEE context is limited to the Thailand region/,'REGION','Choose an inspection area within the supported Thailand region.'],
      [/^GEE context must fit within a 100 km extent\.$/,'AREA_EXTENT','Use an inspection area less than 100 km across.'],
      [/^Home must be a valid coordinate within 100 km/,'HOME','Choose a valid Home position within 100 km of the inspection area.'],
      [/^Use at most 24 Thailand route coordinates/,'ROUTE','The route sample coordinates exceed the supported number or area. Recalculate the route.'],
      [/^Select a canonical Sentinel-2 scene returned by XEDO\.$/,'SCENE','Select a Sentinel-2 image returned by this website, then refresh the mission.'],
      [/^Supply both mission start and end, or leave both unknown\.$/,'TIME_PAIR','The mission start and end must both be available before requesting forecast data.'],
      [/^Use an ordered mission window of at most 24 hours/,'TIME_WINDOW','Use an end after the start, with a mission window of at most 24 hours within the supported forecast dates.'],
      [/^Mission (?:start|end) (?:must be an ISO timestamp|is not a valid date or clock time)/,'TIME_FORMAT','Check the mission date, clock time and timezone.']
    ];
    const hint=hints.find(([pattern])=>pattern.test(data.message.slice(0,300)));
    if(hint){error.inputReason=hint[1];error.message='The mission request was rejected. '+hint[2];}
  }
  if(!RETRYABLE_STATUS.has(status)||typeof code==='string'&&/(?:NOT_CONFIGURED|CONFIG_INVALID|ACCESS_DENIED|ORIGIN_DENIED|INPUT_INVALID|REQUEST_INVALID)/.test(code))error.retryable=false;
  return error;
}

function retryDelay(ms,signal,timers){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(planningContextError('CANCELLED'));return;}
    const cancel=()=>{timers.clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(planningContextError('CANCELLED'));};
    const timer=timers.setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},ms);
    signal?.addEventListener('abort',cancel,{once:true});
  });
}

/** Percent is completed client request stages, never estimated GEE compute progress. */
export async function requestPlanningContext(payload,{signal,fetchImpl=globalThis.fetch,validate=value=>value,onProgress=()=>{},timers=globalThis,retryDelayMs=500}={}){
  const body=JSON.stringify(payload),maxAttempts=2;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const progress=(stage,completed,extra={})=>onProgress({stage,completed,total:3,percent:Math.round(completed/3*100),attempt,maxAttempts,...extra});
    if(signal?.aborted)throw planningContextError('CANCELLED');
    progress('waiting',1);
    try{
      const reply=await fetchImpl('/api/v1/gee/planning-context',{method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'same-origin',redirect:'error',cache:'no-store',signal});
      if(signal?.aborted)throw planningContextError('CANCELLED');
      progress('reading',2);
      const isJSON=reply.headers.get('content-type')?.includes('application/json');
      if(!reply.ok){
        let data;
        if(isJSON)try{data=await reply.json();}catch{}else await reply.body?.cancel();
        throw httpError(reply,data);
      }
      if(!isJSON){await reply.body?.cancel();throw planningContextError('RESPONSE_TYPE');}
      const length=reply.headers.get('content-length');
      if(length&&Number(length)>MAX_RESPONSE_BYTES){await reply.body?.cancel();throw planningContextError('RESPONSE_SIZE');}
      let data;
      try{data=await reply.json();}catch(error){if(signal?.aborted)throw planningContextError('CANCELLED');throw planningContextError('RESPONSE_JSON');}
      if(signal?.aborted)throw planningContextError('CANCELLED');
      let result;
      try{result=validate(data);}catch(error){throw error?.name==='PlanningContextError'?error:planningContextError('RESPONSE_INVALID');}
      if(signal?.aborted)throw planningContextError('CANCELLED');
      progress('complete',3);
      return result;
    }catch(error){
      const failure=classifyPlanningContextError(error,{offline:globalThis.navigator?.onLine===false});
      if(signal?.aborted||!failure.retryable||attempt===maxAttempts)throw failure;
      progress('retrying',1,{errorCode:failure.code,retryAfterMs:failure.retryAfterMs||retryDelayMs});
      await retryDelay(failure.retryAfterMs||retryDelayMs,signal,timers);
    }
  }
}
