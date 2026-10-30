import {INSPECTOR_PROJECT_URL,INSPECTOR_PUBLISHABLE_KEY} from '../src/inspector-project.js';
import {validateInspectorSave,validateInspectorDocument} from '../src/inspector-validation.js';

const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const json=(data,status=200,cookie)=>Response.json(data,{status,headers:{...headers,...(cookie?{'Set-Cookie':cookie}:{})}});
const fail=(status,code,message)=>Object.assign(Error(message),{status,code});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messages={401:'Sign in again to access your missions.',403:'Your Inspector account has not been enabled by the team.',404:'Mission not found.',409:'This mission changed, or the save request was reused. Open the latest version or save a new copy.',422:'Check the mission data before saving.',429:'Too many requests. Try again shortly.'};
// Only these database labels may cross the BFF. Arbitrary provider/SQL text is
// still suppressed; the browser receives a useful next action for queue errors.
const jobErrors={
  WORKER_OFFLINE:[503,'Local processor offline. Open the AI worker on your computer, then try again.'],
  QUEUE_FULL:[429,'The analysis queue is full. Wait for a job to finish or cancel a queued job.'],
  MONTHLY_JOB_LIMIT:[429,'The monthly limit of 100 analyses has been reached. Existing results remain available.'],
  MISSION_REVISION_CHANGED:[409,'This mission changed. Save or reopen the latest version before analyzing.'],
  JOB_NOT_FOUND:[404,'Analysis job not found in your account.'],
  JOB_AREA_INVALID:[422,'Draw a valid inspection area between 80°S and 84°N before analyzing.'],
  JOB_DATES_INVALID:[422,'Choose a past SAR search period of at most 90 days.'],
  MUTATION_REUSED:[409,'This request changed after submission. Refresh your analyses before trying again.']
};

function selectedRoute(url){
  const prefix='/api/v1/inspector/',routes=url.searchParams.getAll('route'),captures=url.searchParams.getAll('path');
  if([...url.searchParams.keys()].some(k=>!['route','path','offset','revision'].includes(k)||url.searchParams.getAll(k).length>1))return null;
  const publicRoute=url.pathname.startsWith(prefix)?url.pathname.slice(prefix.length):null;
  const route=url.pathname==='/api/inspector'?routes[0]||'session':publicRoute;
  // Vercel carries the :path* rewrite capture into the function query. It is
  // accepted only when it identifies the same endpoint as the request path.
  if(!route||!(/^(?:\w+(?:\/[A-Za-z0-9_-]+)*|analysis-jobs(?:\/[A-Za-z0-9_-]+(?:\/cancel)?)?|analysis-worker)$/.test(route))||(publicRoute!==null&&routes.length&&routes[0]!==publicRoute)||(captures.length&&captures[0]!==route))return null;
  return route;
}

function cookieSettings(url){
  const local=url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(url.protocol!=='https:'&&!local)throw fail(400,'HTTPS_REQUIRED','Use HTTPS to sign in.');
  const name=local?'xedo_inspector_dev':'__Host-xedo_inspector';
  return {name,format:(value,age)=>name+'='+encodeURIComponent(value)+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+age+(local?'':'; Secure')};
}
function accessCookie(request,name){
  const found=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
  if(found.length!==1)return null;
  try{const token=decodeURIComponent(found[0].slice(name.length+1));return token.length<10000&&/^[A-Za-z0-9_.-]+$/.test(token)?token:null;}catch{return null;}
}
async function readJSON(request,limit){
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw fail(415,'JSON_REQUIRED','Send JSON.');
  if(Number(request.headers.get('content-length')||0)>limit)throw fail(413,'BODY_TOO_LARGE','The request is too large.');
  if(!request.body)throw fail(400,'JSON_INVALID','Send a valid request.');
  const reader=request.body.getReader();let chunks=[],size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw fail(413,'BODY_TOO_LARGE','The request is too large.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail(400,'JSON_INVALID','Send a valid JSON request.');}
}

/** Same-origin BFF. The browser never receives Supabase tokens or an admin key.
 * Access-token-only sessions intentionally require re-login at expiry; no refresh
 * cookie is retained, so late background refresh cannot resurrect a signed-out session.
 */
export async function inspectorFetch(request,{env=process.env,fetchImpl=fetch}={}){
  const url=new URL(request.url);let cookies,token;
  try{
    cookies=cookieSettings(url);
    if(![null,'none','same-origin'].includes(request.headers.get('sec-fetch-site')))throw fail(403,'ORIGIN_DENIED','Use your XEDO website.');
    const origin=request.headers.get('origin');
    if((origin&&origin!==url.origin)||(!['GET','HEAD'].includes(request.method)&&origin!==url.origin))throw fail(403,'ORIGIN_DENIED','Use your XEDO website.');
    const route=selectedRoute(url);
    if(!route)throw fail(404,'NOT_FOUND','Endpoint not found.');
    const base=env.SUPABASE_URL||INSPECTOR_PROJECT_URL,key=env.SUPABASE_PUBLISHABLE_KEY||INSPECTOR_PUBLISHABLE_KEY;
    if(base!==INSPECTOR_PROJECT_URL||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw fail(503,'AUTH_UNCONFIGURED','Inspector sign-in is not configured for the XEDO project.');
    const upstream=async(path,{body,access}={})=>{
      let response;
      try{response=await fetchImpl(base+path,{method:body===undefined?'GET':'POST',redirect:'error',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(12000)]),headers:{apikey:key,...(access?{Authorization:'Bearer '+access}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
      catch{throw fail(503,'AUTH_UNAVAILABLE','The account service is unavailable. Try again.');}
      if(response.status===204)return null;
      let data;try{data=await response.json();}catch{throw fail(503,'AUTH_RESPONSE_INVALID','The account service returned an invalid response.');}
      if(!response.ok){const known=path==='/rest/v1/rpc/xedo_inspector'&&jobErrors[data?.message];if(known&&known[0]===response.status)throw fail(known[0],data.message,known[1]);const status=[400,401,403,404,409,422,429].includes(response.status)?response.status:503;throw fail(status,'INSPECTOR_'+status,messages[status]||'The account service could not complete this request.');}
      return data;
    };
    const rpc=(action,payload={},access=token)=>upstream('/rest/v1/rpc/xedo_inspector',{access,body:{p_action:action,p_payload:payload}});
    const sameActor=user=>{const expected=request.headers.get('x-xedo-inspector');if(!expected||!uuid.test(expected)||expected!==user?.id)throw fail(409,'ACCOUNT_CHANGED','The signed-in account changed in another tab. Sign in again before using this draft.');};
    if(route==='login'&&request.method==='POST'){
      const input=await readJSON(request,8192);
      if(!input||Object.keys(input).some(k=>!['email','password'].includes(k))||typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email)||typeof input.password!=='string'||!input.password||input.password.length>512)throw fail(422,'LOGIN_INVALID','Enter your email and password.');
      let auth;
      try{auth=await upstream('/auth/v1/token?grant_type=password',{body:{email:input.email,password:input.password}});}catch(e){if(e.status===400||e.status===401)throw fail(401,'LOGIN_FAILED','The email or password could not be verified.');throw e;}
      if(!auth?.user?.id||typeof auth.access_token!=='string'||!Number.isFinite(auth.expires_in))throw fail(503,'AUTH_RESPONSE_INVALID','The account service returned an invalid session.');
      token=auth.access_token;
      try{await rpc('session');}catch(e){await upstream('/auth/v1/logout?scope=local',{access:token,body:{}}).catch(()=>{});throw e;}
      const maxAge=Math.max(1,Math.min(3600,Math.floor(auth.expires_in)));
      return json({user:{id:auth.user.id,email:auth.user.email,role:'Inspector'},expiresAt:Date.now()+maxAge*1000},200,cookies.format(token,maxAge));
    }
    token=accessCookie(request,cookies.name);
    if(route==='logout'&&request.method==='POST'){
      const input=await readJSON(request,1024);if(!input||Object.keys(input).length)throw fail(422,'LOGOUT_INVALID','Invalid sign-out request.');
      if(token){
        try{sameActor(await upstream('/auth/v1/user',{access:token}));}catch(e){if(e.status!==401)throw e;return json({signedOut:true},200,cookies.format('',0));}
        let revoked=false;
        try{await rpc('logout');revoked=true;}catch(e){if(e.status===401)revoked=true;}
        try{await upstream('/auth/v1/logout?scope=local',{access:token,body:{}});revoked=true;}catch{}
        if(!revoked)return json({code:'LOGOUT_INCOMPLETE',message:'This browser was signed out. Server revocation could not be confirmed.'},503,cookies.format('',0));
      }
      return json({signedOut:true},200,cookies.format('',0));
    }
    if(!token){if(route==='session'&&request.method==='GET')return json({user:null});throw fail(401,'SESSION_REQUIRED',messages[401]);}
    const user=await upstream('/auth/v1/user',{access:token});
    if(!user?.id)throw fail(401,'SESSION_REQUIRED',messages[401]);
    if(route==='session'&&request.method==='GET'){if(request.headers.has('x-xedo-inspector'))sameActor(user);await rpc('session');return json({user:{id:user.id,email:user.email,role:'Inspector'}});}
    sameActor(user);
    if(route==='analyses'&&request.method==='GET')return json({analyses:await rpc('analyses')});
    if(route==='analysis-worker'&&request.method==='GET')return json(await rpc('worker_status'));
    if(route==='analysis-jobs'&&request.method==='GET')return json(await rpc('jobs'));
    if(route==='analysis-jobs'&&request.method==='POST'){
      const input=await readJSON(request,8192);
      if(!input||Object.keys(input).some(k=>!['missionId','expectedRevision','mutationId','start','end'].includes(k))||!uuid.test(input.missionId||'')||!uuid.test(input.mutationId||'')||!Number.isInteger(input.expectedRevision)||input.expectedRevision<1||['start','end'].some(k=>input[k]!==undefined&&(typeof input[k]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input[k]))))throw fail(422,'ANALYSIS_JOB_INVALID','Save the current area before starting analysis.');
      return json(await rpc('create_job',input),202);
    }
    const job=/^analysis-jobs\/([0-9a-f-]{36})(\/cancel)?$/i.exec(route);
    if(job&&uuid.test(job[1])){
      if(!job[2]&&request.method==='GET')return json(await rpc('job',{jobId:job[1]}));
      if(job[2]&&request.method==='POST'){
        const input=await readJSON(request,1024);if(!input||Object.keys(input).length)throw fail(422,'ANALYSIS_JOB_INVALID','Invalid cancellation request.');
        return json(await rpc('cancel_job',{jobId:job[1]}));
      }
    }
    const analysis=/^analyses\/([A-Za-z0-9_-]{1,160})$/.exec(route);
    if(analysis&&request.method==='GET')return json(await rpc('analysis',{resultId:analysis[1]}));
    if(route==='missions'&&request.method==='POST')return json(await rpc('save',validateInspectorSave(await readJSON(request,1100000))));
    const offsetText=url.searchParams.get('offset')||'0';
    if(!/^\d{1,6}$/.test(offsetText)||Number(offsetText)>100000)throw fail(422,'OFFSET_INVALID','Invalid page.');
    if(route==='missions'&&request.method==='GET')return json({missions:await rpc('list',{offset:Number(offsetText)})});
    const match=/^missions\/([^/]+)(\/history)?$/.exec(route);
    if(match&&uuid.test(match[1])&&request.method==='GET'){
      const payload={missionId:match[1]};
      if(match[2])return json({revisions:await rpc('history',{...payload,offset:Number(offsetText)})});
      if(url.searchParams.has('revision')){const n=url.searchParams.get('revision');if(!/^[1-9]\d{0,8}$/.test(n))throw fail(422,'REVISION_INVALID','Invalid mission version.');payload.revision=Number(n);}
      const data=await rpc('get',payload);validateInspectorDocument(data.document);return json(data);
    }
    throw fail(404,'NOT_FOUND','Endpoint not found.');
  }catch(e){const status=Number.isInteger(e.status)?e.status:503;return json({code:e.code||'INSPECTOR_UNAVAILABLE',message:e.code?e.message:'The account service is unavailable. Try again.'},status,status===401&&cookies?cookies.format('',0):undefined);}
}

export async function handleInspector(req,res,options){
  const host=req.headers.host,protocol=req.headers['x-forwarded-proto']||(req.socket?.encrypted?'https':'http');
  if(typeof host!=='string'||/[\s/@\\?#]/.test(host)||!['http','https'].includes(protocol)){res.statusCode=400;res.end();return;}
  const copied=new Headers();for(const name of ['cookie','content-type','content-length','origin','sec-fetch-site','x-xedo-inspector'])if(typeof req.headers[name]==='string')copied.set(name,req.headers[name]);
  const method=req.method||'GET',init={method,headers:copied};
  if(!['GET','HEAD'].includes(method)){if(req.body!==undefined)init.body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);else{init.body=req;init.duplex='half';}}
  const response=await inspectorFetch(new Request(protocol+'://'+host+req.url,init),options);
  res.statusCode=response.status;for(const [name,value]of response.headers)if(name!=='set-cookie')res.setHeader(name,value);
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
export default {fetch:inspectorFetch};
