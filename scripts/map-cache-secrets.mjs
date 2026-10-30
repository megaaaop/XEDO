import {execFile} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

function dpapi(value, decrypt=false) {
  if(process.platform!=='win32')throw new Error('LOCAL_KEY_UNAVAILABLE');
  const script=decrypt
    ? '$v=[Console]::In.ReadToEnd();[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($v),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))'
    : '$v=[Console]::In.ReadToEnd();[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($v),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))';
  return new Promise((resolve,reject)=>{
    const child=execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command','Add-Type -AssemblyName System.Security;'+script],{windowsHide:true,maxBuffer:32768},(error,stdout)=>error?reject(new Error('LOCAL_KEY_UNAVAILABLE')):resolve(stdout.trim()));
    child.stdin.end(value);
  });
}
export async function saveCacheKey(filename,key) {
  const protectedValue=await dpapi(key);await mkdir(dirname(filename),{recursive:true});await writeFile(filename,protectedValue,{mode:0o600});
}
export async function readCacheKey(filename) {return dpapi(await readFile(filename,'utf8'),true);}
