// Local frontend / real XEDO backend qualification. NEVER deploy this server.
// No mock Auth, PGlite, privileged key, Auth creation or automatic migrations.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

if(process.env.XEDO_LIVE_QA_AUTHORIZED!=='1')throw Error('Set XEDO_LIVE_QA_AUTHORIZED=1 only for an authorized real Supabase qualification run.');
const root=path.resolve(process.env.XEDO_QA_ROOT||fileURLToPath(new URL('../',import.meta.url)));
const port=5193,origin='http://127.0.0.1:'+port;
try{process.loadEnvFile(path.join(root,'.env'));}catch(error){if(error.code!=='ENOENT')throw Error('The local environment file could not be read.');}
const fromRoot=relative=>import(pathToFileURL(path.join(root,relative)));
const [{handleInspector,inspectorFetch},{handleHostedGEE},{handleHostedPlanningContext},{handleHostedEnvironment},{runtimeConfig},{INSPECTOR_PROJECT_URL,INSPECTOR_PUBLISHABLE_KEY}]=await Promise.all([
  fromRoot('api/inspector.mjs'),fromRoot('api/gee.mjs'),fromRoot('api/planning-context.mjs'),fromRoot('api/environment.mjs'),fromRoot('scripts/runtime-config.mjs'),fromRoot('src/inspector-project.js')
]);
if(INSPECTOR_PROJECT_URL!=='https://tstmjnlhwidwtzetqxbu.supabase.co'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(INSPECTOR_PUBLISHABLE_KEY))throw Error('The fixed public XEDO project configuration is invalid.');
const inspectorEnv={SUPABASE_URL:INSPECTOR_PROJECT_URL,SUPABASE_PUBLISHABLE_KEY:INSPECTOR_PUBLISHABLE_KEY};
const geeEnv=await runtimeConfig(process.env,{root});
const siteRoot=path.join(root,'dist');
await readFile(path.join(siteRoot,'index.html'));
const receipt={schemaVersion:'xedo-live-ai-qa/1',origin,projectRef:'tstmjnlhwidwtzetqxbu',simulatedAuth:false,localPostgreSQL:false,realSupabase:true,realBFF:true,workerEndpoint:'existing fixed Supabase URL; not proxied by this server',realGEEConfigured:geeEnv.GEE_CONFIGURATION?.state==='configured',serverAppliesMigrations:false,serverCreatesAccounts:false,serverDeploysWebsite:false,createdAt:new Date().toISOString()};
const localData=path.resolve(process.env.XEDO_LIVE_QA_DATA||path.join(root,'local-data/live-ai-qualification'));
if(!localData.startsWith(path.join(root,'local-data')+path.sep))throw Error('Keep real qualification sessions inside the ignored local-data directory.');
await mkdir(localData,{recursive:true});
await writeFile(path.join(localData,'server-receipt.json'),JSON.stringify(receipt,null,2));
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
function fail(res,status,message){res.writeHead(status,{...noStore,'Content-Type':'application/json'});res.end(JSON.stringify({message}));}
const roles=['primary','secondary','machine'];
let identity;
try{
 const bytes=await readFile(path.join(localData,'account-identities.json'));if(bytes.length>4096)throw Error();
 identity=JSON.parse(bytes);
 if(!identity||typeof identity!=='object'||Array.isArray(identity)||Object.keys(identity).sort().join(',')!=='primaryEmail,primaryUserId'
 ||typeof identity.primaryUserId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identity.primaryUserId)
 ||typeof identity.primaryEmail!=='string'||identity.primaryEmail.length>254||!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(identity.primaryEmail))throw Error();
}catch{throw Error('Create valid ignored local-data/live-ai-qualification/account-identities.json before starting this local QA server.');}
const primaryUserId=identity.primaryUserId.toLowerCase(),primaryEmail=identity.primaryEmail.toLowerCase();
identity=null;
const safeAccount=value=>value&&roles.includes(value.role)&&/^[0-9a-f-]{36}$/i.test(value.userId)&&typeof value.email==='string'?Object.fromEntries(['role','userId','email','connectedAt','sessionExpiresAt','protectedBy'].map(k=>[k,value[k]])):null;
async function accountMetadata(){const accounts=[];for(const role of roles){try{const bytes=await readFile(path.join(localData,role+'.account.json'));if(bytes.length<=4096){const value=safeAccount(JSON.parse(bytes));if(value&&value.role===role)accounts.push(value);}}catch{}}return accounts;}
const setupPage=`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>XEDO — เชื่อมบัญชีทดสอบ</title><style>body{margin:0;background:#101820;color:#edf4fb;font:16px/1.6 system-ui,sans-serif}main{max-width:980px;margin:36px auto;padding:0 20px}h1{line-height:1.3}p{color:#b8c8d8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:18px}.card{padding:22px;border:1px solid #425364;border-radius:14px;background:#1c2732}h2{font-size:20px;margin:0 0 12px}label{display:block;margin-top:16px}input{box-sizing:border-box;width:100%;margin-top:6px;padding:12px;border:1px solid #586a79;border-radius:8px;background:#111b24;color:#fff;font:inherit}button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:8px;background:#8cd4d0;color:#102024;font:600 16px system-ui;cursor:pointer}button:disabled{opacity:.6;cursor:wait}.status{min-height:56px;overflow-wrap:anywhere;font-size:14px;margin-bottom:0}.error{color:#ffb1b1}.spinner{display:inline-block;width:14px;height:14px;margin-right:8px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}a{color:#96dedc}.note{padding:16px;border-left:3px solid #8cd4d0;background:#192731}</style><main><h1>เชื่อมบัญชีสำหรับทดสอบ XEDO</h1><p>หน้านี้อยู่ในเครื่องและเชื่อมกับ Supabase ของ XEDO จริง รหัสผ่านส่งให้บริการเข้าสู่ระบบโดยตรงผ่านโปรแกรมในเครื่อง ไม่มีการสร้างบัญชีหรือสมัครบริการจากหน้านี้</p><div class="note">ใช้บัญชี Inspector เดิมของคุณในช่องแรก ส่วนอีกสองช่องให้ทีมสร้างบัญชีผ่าน Supabase Authentication ก่อน: บัญชี Inspector สำหรับทดสอบการแยกงาน และบัญชีเฉพาะโปรแกรม CPU<br>กรอกรหัสผ่านที่หน้านี้ได้เลย ไม่ต้องส่งในแชท โปรแกรมจะไม่บันทึกรหัสผ่าน และจะเข้ารหัส session ด้วย Windows ของผู้ใช้ปัจจุบัน</div><div class="grid">${roles.map((role,i)=>`<form class="card" data-role="${role}"><h2>${['1. Inspector ของคุณ','2. Inspector สำหรับทดสอบ','3. โปรแกรม CPU'][i]}</h2><label>อีเมล<input name="email" type="email" autocomplete="username" required maxlength="254" ${i===0?'value="'+primaryEmail+'" readonly':''}></label><label>รหัสผ่าน<input name="password" type="password" autocomplete="current-password" required maxlength="512"></label><button type="submit">เชื่อมบัญชี</button><p class="status" role="status" aria-live="polite">ยังไม่ได้เชื่อมบัญชี</p></form>`).join('')}</div><p>การเชื่อมบัญชีที่นี่ใช้ตรวจตัวตนและเก็บ session สำหรับทดสอบเท่านั้น ยังไม่เพิ่มสิทธิ์ Inspector หรือผูกโปรแกรม CPU โดยอัตโนมัติ แชทหลักจะตรวจข้อมูลบัญชีและเชื่อมสิทธิ์ในขั้นตอนถัดไป</p><p><a href="/">เปิดเว็บ XEDO ในเครื่อง</a> · <a href="https://supabase.com/dashboard/project/tstmjnlhwidwtzetqxbu/auth/users" target="_blank" rel="noreferrer">เปิด Supabase Authentication</a></p><script>const messages={LOGIN_FAILED:'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชียังไม่ยืนยันอีเมล',RATE_LIMITED:'เข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',ACCOUNT_ROLE_MISMATCH:'ต้องใช้คนละบัญชีสำหรับแต่ละช่อง และช่องแรกต้องเป็น Inspector เดิมของคุณ',INPUT_INVALID:'ตรวจอีเมลและรหัสผ่านอีกครั้ง',AUTH_UNAVAILABLE:'เชื่อมต่อบริการเข้าสู่ระบบไม่ได้ กรุณาลองใหม่',ACCOUNT_VERIFY_FAILED:'ตรวจตัวตนบัญชีไม่สำเร็จ กรุณาลองใหม่',CONNECT_BUSY:'กำลังเชื่อมบัญชีอีกช่อง กรุณารอให้เสร็จก่อน'};function show(form,account){form.querySelector('.status').classList.remove('error');form.querySelector('.status').textContent='เชื่อมแล้ว: '+account.email+' · UID '+account.userId;}async function refresh(){try{const r=await fetch('/qa/accounts',{cache:'no-store',credentials:'same-origin'}),v=await r.json();for(const a of v.accounts||[]){const f=document.querySelector('form[data-role="'+a.role+'"]');if(f){show(f,a);if(a.role!=='primary')f.elements.email.value=a.email;}}}catch{}}let connectChain=Promise.resolve();for(const form of document.forms)form.addEventListener('submit',e=>{e.preventDefault();if(form.dataset.pending==='true')return;const b=form.querySelector('button'),status=form.querySelector('.status'),email=form.elements.email.value.trim();let password=form.elements.password.value;form.elements.password.value='';form.dataset.pending='true';b.disabled=true;b.innerHTML='<span class="spinner" aria-hidden="true"></span>รอเชื่อมบัญชี…';form.setAttribute('aria-busy','true');status.classList.remove('error');status.textContent='อยู่ในคิวเชื่อมบัญชี ระบบจะตรวจทีละบัญชี';const execute=async()=>{b.innerHTML='<span class="spinner" aria-hidden="true"></span>กำลังเชื่อมบัญชี…';status.textContent='กำลังตรวจตัวตนกับ Supabase และเก็บ session ที่เข้ารหัส…';try{const r=await fetch('/qa/connect',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:form.dataset.role,email,password}),signal:AbortSignal.timeout(75000)}),v=await r.json();if(!r.ok||!v.ok)throw Object.assign(Error(),{code:v.code});show(form,v.account);}catch(err){status.classList.add('error');status.textContent=messages[err.code]||'เชื่อมบัญชีไม่สำเร็จ กรุณาลองใหม่ ไม่ต้องส่งรหัสผ่านในแชท';}finally{password=null;b.disabled=false;b.textContent='เชื่อมบัญชี';delete form.dataset.pending;form.removeAttribute('aria-busy');}};connectChain=connectChain.then(execute,execute);});refresh();</script></main></html>`;
const browserSessionPage=`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>XEDO — เปิด session ที่เชื่อมไว้</title><style>body{background:#101820;color:#edf4fb;font:18px/1.7 system-ui;max-width:700px;margin:60px auto;padding:20px}button{padding:16px;background:#8cd4d0;border:0;border-radius:8px;font:inherit;cursor:pointer}a{color:#8cd4d0}</style><h1>เปิดเว็บด้วย Inspector ที่เชื่อมไว้</h1><p>ใช้ session เดิมที่คุณเชื่อมในเครื่อง ไม่ต้องกรอกรหัสผ่านซ้ำ ระบบจะตรวจตัวตนกับ Supabase อีกครั้งก่อนเปิดภารกิจของคุณ</p><button id="resume">เปิดเว็บด้วยบัญชีที่เชื่อมไว้</button><p id="status" role="status" aria-live="polite"></p><p><a href="/qa/setup">กลับไปหน้าสถานะบัญชี</a></p><script>const button=document.querySelector('#resume'),status=document.querySelector('#status');button.onclick=async()=>{button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='กำลังตรวจตัวตนและเปิด session…';try{const response=await fetch('/qa/browser-session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(75000)});const value=await response.json();if(!response.ok||value.browserSignedIn!==true)throw Error();location.assign('/');}catch{status.textContent='ยังเปิด session ไม่สำเร็จ โปรดแจ้งแชทหลักเพื่อตรวจ ไม่ต้องส่งรหัสผ่าน';button.disabled=false;button.removeAttribute('aria-busy');}};</script></html>`;
async function useConnectedBrowserSession(req,res){
  if(req.method!=='POST')return fail(res,405,'Use POST.');
  if(req.headers.origin!==origin||![undefined,'none','same-origin'].includes(req.headers['sec-fetch-site']))return fail(res,403,'Use this local setup page.');
  if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json')return fail(res,415,'Use JSON.');
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>1024)return fail(res,413,'The request is too large.');chunks.push(chunk);}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return fail(res,422,'Use an empty JSON object.');}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length)return fail(res,422,'Use an empty JSON object.');
  const python=process.env.XEDO_LOCAL_AI_PYTHON||path.resolve(root,'../../tmp/local-ai-worker-venv/Scripts/python.exe');
  // Private child IPC only. Never log this output or send it to browser JS.
  let secret=await new Promise(resolve=>{
    const child=spawn(python,['-B',fileURLToPath(new URL('./local-ai-browser-session.py',import.meta.url))],{windowsHide:true,stdio:['pipe','pipe','ignore'],env:{...process.env,XEDO_QA_ROOT:root,XEDO_LIVE_QA_DATA:localData,XEDO_BROWSER_SESSION_IPC:'1',PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}});
    let output='',done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);output='';resolve(value);};
    const timer=setTimeout(()=>{child.kill();finish({ok:false});},60000);
    child.stdout.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>20000){child.kill();finish({ok:false});}});
    child.on('error',()=>finish({ok:false}));child.on('close',()=>{try{const value=JSON.parse(output);finish(value);}catch{finish({ok:false});}});
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({publishableKey:INSPECTOR_PUBLISHABLE_KEY}));
  });
  try{
    if(secret.ok!==true||secret.userId!==primaryUserId||secret.email!==primaryEmail||typeof secret.accessToken!=='string'||!/^[A-Za-z0-9_.-]{1,9999}$/.test(secret.accessToken)||!Number.isFinite(secret.expiresAt))return fail(res,503,'The connected primary session is not available.');
    const maxAge=Math.min(3600,Math.floor((secret.expiresAt-Date.now())/1000));if(maxAge<1)return fail(res,401,'Connect the primary account again.');
    const checked=await inspectorFetch(new Request(origin+'/api/v1/inspector/session',{headers:{origin,'X-XEDO-Inspector':secret.userId,cookie:'xedo_inspector_dev='+encodeURIComponent(secret.accessToken)}}),{env:inspectorEnv});
    const value=await checked.json();if(!checked.ok||value.user?.id!==secret.userId||value.user?.role!=='Inspector')return fail(res,401,'The primary Inspector session could not be verified.');
    res.writeHead(200,{...noStore,'Content-Type':'application/json','Set-Cookie':'xedo_inspector_dev='+encodeURIComponent(secret.accessToken)+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+maxAge});
    return res.end(JSON.stringify({browserSignedIn:true,user:value.user,expiresAt:Date.now()+maxAge*1000}));
  }finally{secret=null;}
}
let connecting=false;
const connectMessages={LOGIN_FAILED:'The account could not be verified.',RATE_LIMITED:'Try again shortly.',ACCOUNT_ROLE_MISMATCH:'Use distinct accounts for these roles.',INPUT_INVALID:'Check the account input.',AUTH_UNAVAILABLE:'The account service could not be reached.',ACCOUNT_VERIFY_FAILED:'The account identity could not be verified.',HELPER_UNAVAILABLE:'The protected local session helper is unavailable.',LOCAL_PATH_INVALID:'Use the ignored local qualification folder.',AUTH_RESPONSE_INVALID:'The account service returned an invalid response.'};
async function connectAccount(req,res){
  if(req.method!=='POST')return fail(res,405,'Use POST.');
  if(req.headers.origin!==origin||![undefined,'none','same-origin'].includes(req.headers['sec-fetch-site']))return fail(res,403,'Use this local setup page.');
  if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json')return fail(res,415,'Use JSON.');
  if(connecting){res.writeHead(409,{...noStore,'Content-Type':'application/json'});return res.end(JSON.stringify({ok:false,code:'CONNECT_BUSY'}));}
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8192)return fail(res,413,'The account request is too large.');chunks.push(chunk);}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return fail(res,422,'Check the account input.');}chunks=[];
  if(!value||typeof value!=='object'||Object.keys(value).some(k=>!['role','email','password'].includes(k))||!roles.includes(value.role)||typeof value.email!=='string'||value.email.length>254||!/^\S+@\S+\.\S+$/.test(value.email)||typeof value.password!=='string'||!value.password||value.password.length>512||(value.role==='primary'&&value.email.toLowerCase()!==primaryEmail))return fail(res,422,'Check the account input.');
  connecting=true;
  let primaryLoginBody=value.role==='primary'?JSON.stringify({email:value.email,password:value.password}):null;
  try{
    const python=process.env.XEDO_LOCAL_AI_PYTHON||path.resolve(root,'../../tmp/local-ai-worker-venv/Scripts/python.exe');
    const helper=fileURLToPath(new URL('./local-ai-account-connect.py',import.meta.url));
    const result=await new Promise(resolve=>{
      const child=spawn(python,['-B',helper],{windowsHide:true,stdio:['pipe','pipe','ignore'],env:{...process.env,XEDO_QA_ROOT:root,XEDO_LIVE_QA_DATA:localData,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}});
      let output='',done=false;const finish=result=>{if(done)return;done=true;clearTimeout(timer);resolve(result);};
      const timer=setTimeout(()=>{child.kill();finish({ok:false,code:'HELPER_UNAVAILABLE',status:503});},70000);
      child.stdout.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>8192){child.kill();finish({ok:false,code:'HELPER_UNAVAILABLE',status:503});}});
      child.on('error',()=>finish({ok:false,code:'HELPER_UNAVAILABLE',status:503}));
      child.on('close',()=>{try{finish(JSON.parse(output));}catch{finish({ok:false,code:'HELPER_UNAVAILABLE',status:503});}});
      child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({...value,publishableKey:INSPECTOR_PUBLISHABLE_KEY}));value.password=null;
    });
    const account=safeAccount(result.account);
    if(result.ok===true&&account&&account.role===value.role&&account.email.toLowerCase()===value.email.toLowerCase()){
      // The user enters the primary password once. Sign in through the actual
      // BFF too, retaining its HttpOnly cookie; never return a token to page JS.
      let cookie=null;
      if(primaryLoginBody){const signed=await inspectorFetch(new Request(origin+'/api/v1/inspector/login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:primaryLoginBody}),{env:inspectorEnv});if(signed.ok)cookie=signed.headers.get('set-cookie');}
      res.writeHead(200,{...noStore,'Content-Type':'application/json',...(cookie?{'Set-Cookie':cookie}:{})});return res.end(JSON.stringify({ok:true,account,browserSignedIn:!!cookie}));
    }
    const code=Object.hasOwn(connectMessages,result.code)?result.code:'HELPER_UNAVAILABLE',status=[401,422,429,503].includes(result.status)?result.status:503;
    res.writeHead(status,{...noStore,'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,code,message:connectMessages[code]}));
  }finally{primaryLoginBody=null;connecting=false;}
}
const server=http.createServer(async(req,res)=>{
  try{
    // Fixed Host also prevents browser DNS rebinding into this local harness.
    if(req.headers.host!=='127.0.0.1:'+port||req.headers['x-forwarded-proto']||req.headers['x-forwarded-host'])return fail(res,403,'Use the fixed local qualification origin.');
    const parsed=new URL(req.url,origin);
    if(parsed.pathname==='/qa/browser-session')return await useConnectedBrowserSession(req,res);
    if(parsed.pathname==='/qa/session'){
      if(!['GET','HEAD'].includes(req.method))return fail(res,405,'Use GET.');
      res.writeHead(200,{...noStore,'Content-Type':'text/html;charset=utf-8','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});return res.end(req.method==='HEAD'?undefined:browserSessionPage);
    }
    if(parsed.pathname==='/qa/connect')return await connectAccount(req,res);
    if(parsed.pathname==='/qa/setup'){
      if(!['GET','HEAD'].includes(req.method))return fail(res,405,'Use GET.');
      res.writeHead(200,{...noStore,'Content-Type':'text/html;charset=utf-8','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});return res.end(req.method==='HEAD'?undefined:setupPage);
    }
    if(parsed.pathname==='/qa/accounts'){
      if(!['GET','HEAD'].includes(req.method))return fail(res,405,'Use GET.');
      if(req.headers.origin&&req.headers.origin!==origin||![undefined,'none','same-origin'].includes(req.headers['sec-fetch-site']))return fail(res,403,'Use this local setup page.');
      res.writeHead(200,{...noStore,'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:JSON.stringify({accounts:await accountMetadata()}));
    }
    if(req.url.startsWith('/api/v1/inspector/')||parsed.pathname==='/api/inspector')return await handleInspector(req,res,{env:inspectorEnv});
    if(['/api/v1/gee/planning-context','/api/planning-context'].includes(parsed.pathname))return await handleHostedPlanningContext(req,res,{env:geeEnv});
    if(['/api/v1/environment','/api/environment'].includes(parsed.pathname))return await handleHostedEnvironment(req,res);
    if(parsed.pathname.startsWith('/api/'))return await handleHostedGEE(req,res,{env:geeEnv});
    if(!['GET','HEAD'].includes(req.method))return fail(res,405,'Use GET for local assets.');
    if(parsed.pathname==='/qa/receipt'){
      res.writeHead(200,{...noStore,'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:JSON.stringify(receipt));
    }
    let pathname;try{pathname=decodeURIComponent(parsed.pathname);}catch{return fail(res,400,'Invalid asset path.');}
    // Only the generated frontend may be served. Never .env, source files,
    // local-data, credentials, worker checkpoints or artifacts on disk.
    const filename=path.resolve(siteRoot,'.'+(pathname==='/'?'/index.html':pathname));
    if(!filename.startsWith(siteRoot+path.sep))return fail(res,403,'Invalid asset path.');
    let bytes;try{bytes=await readFile(filename);}catch{return fail(res,404,'Asset not found.');}
    res.writeHead(200,{...noStore,'Content-Type':types[path.extname(filename)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{
    // Auth/GEE exceptions can contain provider data, URLs or credentials.
    // Do not log a request body, Cookie, Authorization or raw exception.
    if(!res.headersSent)return fail(res,503,'The local qualification request could not complete.');
    res.end();
  }
});
server.on('error',error=>{console.error('The local qualification server could not start or continue: '+(['EACCES','EADDRINUSE'].includes(error.code)?error.code:'SERVER_UNAVAILABLE'));process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('XEDO real-backend qualification ready: '+origin+' — real Supabase/GEE; no website deployment.'));
let stopping=false;
function stop(){if(stopping)return;stopping=true;server.close(()=>process.exit(0));setTimeout(()=>{server.closeAllConnections();process.exit(0);},3000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
