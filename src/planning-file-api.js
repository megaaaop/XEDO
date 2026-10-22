import {calculatePlanningTrial} from './trial-api.js';
import {buildQGCPlan} from './trial-export.js';

const MAX_BYTES=65536;
const topFields=new Set(['surveyId','geometry','driftEnabled','drift','flight','export','oil','sortieIndex']);
const fail=(message,status=422,details={})=>{throw Object.assign(new Error(message),{status,code:'VALIDATION_ERROR',retryable:false,...details});};
function checkAbort(signal){
  if(signal?.aborted)throw new DOMException('The local trial was cancelled.','AbortError');
}
function parse(body){
  if(typeof body!=='string'||body.length===0)fail('A JSON request body is required.',400);
  if(new TextEncoder().encode(body).byteLength>MAX_BYTES)fail('Trial inputs exceed 64 KiB.',413);
  let value;try{value=JSON.parse(body);}catch{fail('Trial inputs must be valid JSON.',400);}
  if(!value||Array.isArray(value)||typeof value!=='object')fail('Trial inputs must be a JSON object.');
  if(Object.keys(value).some(key=>!topFields.has(key)))fail('Unknown trial input field. Hardware commands and credentials are unsupported.');
  for(const group of ['drift','flight','export','oil']){
    const settings=value[group];
    if(settings==null)continue;
    if(typeof settings!=='object'||Array.isArray(settings))fail(group+' settings must be an object.');
  }
  if(value.driftEnabled!=null&&typeof value.driftEnabled!=='boolean')fail('driftEnabled must be true or false.');
  if(value.surveyId!=null)fail('The standalone file cannot read saved surveys by ID. Import a trial snapshot containing its source geometry, or draw/import a boundary.',409,{code:'LOCAL_SOURCE_UNAVAILABLE'});
  if(value.sortieIndex!=null&&(!Number.isInteger(value.sortieIndex)||value.sortieIndex<0))fail('Select a valid sortie.',422,{code:'INVALID_SORTIE_INDEX'});
  return value;
}

/** In-browser trial adapter. It has no database, HTTP or device transport. */
export async function fileTrialAPI(path,options={}){
  checkAbort(options.signal);
  if(typeof path==='string'&&path.split('?')[0]==='/source')fail('Saved survey lookup needs the server database. In this standalone file, import a trial snapshot containing its source geometry or draw/import a boundary.',409,{code:'LOCAL_SOURCE_UNAVAILABLE'});
  if(path!==''&&path!=='/export')fail('Local trial route not found.',404,{code:'NOT_FOUND'});
  if(options.method!=null&&options.method!=='POST')fail('Local trial calculations require POST inputs.',405,{code:'METHOD_NOT_ALLOWED'});
  const body=parse(options.body);
  let result;
  try{result=await calculatePlanningTrial(null,body);}catch(error){if(error.status)throw error;fail(error.message||'Check the trial inputs.');}
  checkAbort(options.signal);
  if(path==='')return result;
  if(!result.exportCheck.pass)fail('Complete all export checks before downloading a flight file.',422,{code:'TRIAL_CHECKS_INCOMPLETE',details:result.exportCheck});
  let file;
  try{file=buildQGCPlan(result.flight,{...body.export,home:body.flight?.home},body.sortieIndex??0);}catch(error){fail(error.message||'Select a valid sortie.',422,{code:error.code||'TRIAL_EXPORT_BLOCKED',...(error.report?{details:error.report}:{})});}
  checkAbort(options.signal);
  return {...file,inputHash:result.inputHash,hardwareControl:false,releaseControl:false};
}
