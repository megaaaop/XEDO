import {open} from 'node:fs/promises';
import {createPrivateKey} from 'node:crypto';
import path from 'node:path';

const MAX_CREDENTIAL_BYTES=64*1024;
const fileProblem=(state,code,message)=>({state,source:'file',code,message});

function validServiceAccount(raw) {
  try {
    const account=JSON.parse(raw);
    if(account?.type!=='service_account'||typeof account.client_email!=='string'||!/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(account.client_email)||typeof account.private_key!=='string'||!account.private_key.startsWith('-----BEGIN PRIVATE KEY-----'))return false;
    return createPrivateKey({key:account.private_key,format:'pem',type:'pkcs8'}).asymmetricKeyType==='rsa';
  } catch {return false;}
}

/** Resolve private local credentials without returning file paths or error details. */
async function geeRuntimeConfig(source=process.env,{root=process.cwd()}={}) {
  const config={GEE_PROJECT_ID:source.GEE_PROJECT_ID,GEE_SERVICE_ACCOUNT_JSON:source.GEE_SERVICE_ACCOUNT_JSON,GEE_PROBE_ASSET:source.GEE_PROBE_ASSET};
  // Preserve the existing inline-secret flow and its probe validation exactly.
  if(config.GEE_SERVICE_ACCOUNT_JSON)return {...config,GEE_CONFIGURATION:{state:'configured',source:'inline'}};
  const filename=source.GEE_SERVICE_ACCOUNT_FILE;
  if(typeof filename!=='string'||!filename.trim())return {...config,GEE_CONFIGURATION:{state:'not_configured',source:null,code:'GEE_CREDENTIALS_MISSING',message:'GEE server credentials are not configured.'}};
  let handle;
  try {
    handle=await open(path.resolve(root,filename),'r');
    const info=await handle.stat();
    if(!info.isFile())return {...config,GEE_CONFIGURATION:fileProblem('error','GEE_CREDENTIAL_FILE_INVALID','The GEE credential file is not a valid service-account JSON file.')};
    if(info.size>MAX_CREDENTIAL_BYTES)return {...config,GEE_CONFIGURATION:fileProblem('error','GEE_CREDENTIAL_FILE_TOO_LARGE','The GEE credential file exceeds 64 KiB.')};
    // Bound the read as well as the initial size check if the file changes.
    const bytes=Buffer.alloc(MAX_CREDENTIAL_BYTES+1);
    let length=0;
    while(length<bytes.length){const chunk=await handle.read(bytes,length,bytes.length-length,length);if(!chunk.bytesRead)break;length+=chunk.bytesRead;}
    if(length>MAX_CREDENTIAL_BYTES)return {...config,GEE_CONFIGURATION:fileProblem('error','GEE_CREDENTIAL_FILE_TOO_LARGE','The GEE credential file exceeds 64 KiB.')};
    let raw;
    try {raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,length));}catch{return {...config,GEE_CONFIGURATION:fileProblem('error','GEE_CREDENTIAL_FILE_INVALID','The GEE credential file is not a valid service-account JSON file.')};}
    if(!validServiceAccount(raw))return {...config,GEE_CONFIGURATION:fileProblem('error','GEE_CREDENTIAL_FILE_INVALID','The GEE credential file is not a valid service-account JSON file.')};
    return {...config,GEE_SERVICE_ACCOUNT_JSON:raw,GEE_CONFIGURATION:{state:'configured',source:'file'}};
  } catch(error) {
    return {...config,GEE_CONFIGURATION:error?.code==='ENOENT'?fileProblem('not_configured','GEE_CREDENTIAL_FILE_MISSING','The configured GEE credential file is missing.'):fileProblem('error','GEE_CREDENTIAL_FILE_UNREADABLE','The GEE credential file could not be read.')};
  } finally {if(handle)await handle.close().catch(()=>{});}
}

export async function runtimeConfig(source=process.env,options={}) {
  const result=await geeRuntimeConfig(source,options);
  if(source.GEE_CACHE_ENABLED!=='1')return result;
  let key=source.GEE_CACHE_SERVER_KEY;
  if(!key&&process.platform==='win32')try{
    const {readCacheKey}=await import('./map-cache-secrets.mjs');
    key=await readCacheKey(path.resolve(options.root||process.cwd(),'data/gee-cache-server.dpapi'));
  }catch{}
  return {...result,GEE_CACHE_ENABLED:'1',GEE_CACHE_URL:'https://tstmjnlhwidwtzetqxbu.supabase.co',...(key?{GEE_CACHE_SERVER_KEY:key}:{})};
}
