// LOCAL QA ONLY. Simulated password Auth and local PostgreSQL; never deploy.
// The only real provider called is the existing read-only GEE/environment stack.
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(process.env.XEDO_QA_ROOT||fileURLToPath(new URL('../',import.meta.url)));
const dataDir=path.resolve(process.env.XEDO_LOCAL_QA_DATA||path.join(root,'local-data/local-ai-web-qa'));
const schema=path.resolve(process.env.XEDO_LOCAL_QA_SCHEMA||path.join(root,'db/inspector-local-jobs.sql'));
const port=5193,origin='http://127.0.0.1:'+port;
const resultDelay=Math.min(10000,Math.max(0,Number(process.env.XEDO_LOCAL_QA_RESULT_DELAY_MS)||0));
try{process.loadEnvFile(path.join(root,'.env'));}catch(error){if(error.code!=='ENOENT')throw error;}
const fromRoot=relative=>import(pathToFileURL(path.join(root,relative)));
const {PGlite}=createRequire(path.join(root,'package.json'))('@electric-sql/pglite');
const [{handleInspector},{handleHostedGEE},{handleHostedPlanningContext},{handleHostedEnvironment},{runtimeConfig}]=await Promise.all([
  fromRoot('api/inspector.mjs'),fromRoot('api/gee.mjs'),fromRoot('api/planning-context.mjs'),fromRoot('api/environment.mjs'),fromRoot('scripts/runtime-config.mjs')
]);
const geeEnv=await runtimeConfig(process.env,{root});
await mkdir(dataDir,{recursive:true});
const stateFile=path.join(dataDir,'fixture-auth.json');
let state;
try{state=JSON.parse(await readFile(stateFile,'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;state={version:1,simulatedAuth:true,actors:{},tokens:{},refresh:{}};for(const name of ['alice','bob','unapproved','machine'])state.actors[name]={id:randomUUID(),email:(name==='machine'?'worker-local-qa':'inspector-'+name)+'@example.test'};}
if(state.version!==1||state.simulatedAuth!==true)throw Error('Invalid local fixture Auth state');
const persist=()=>writeFile(stateFile,JSON.stringify(state,null,2));
const db=new PGlite(path.join(dataDir,'postgres'));
if(!(await db.query("select to_regclass('auth.users') present")).rows[0].present){
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;`);
  await db.exec(await readFile(path.join(root,'db/inspector-foundation.sql'),'utf8'));
  await db.exec(await readFile(path.join(root,'db/inspector-ai.sql'),'utf8'));
  const prepared=JSON.parse(await readFile(path.join(root,'db/prepared-sar.json'),'utf8'));
  await db.query('insert into xedo_private.prepared_analysis_catalog(result_id,payload) values($1,$2)',[prepared.resultId,prepared]);
}
await db.exec(await readFile(schema,'utf8'));
await db.exec(await readFile(path.join(root,'db/inspector-local-jobs-status.sql'),'utf8'));
for(const [name,actor] of Object.entries(state.actors)){
  await db.query('insert into auth.users(id) values($1) on conflict do nothing',[actor.id]);
  if(['alice','bob'].includes(name))await db.query('insert into xedo_private.inspector_accounts(user_id) values($1) on conflict do nothing',[actor.id]);
}
await db.query('insert into xedo_private.local_worker_registry(worker_id,owner_id) values($1,$2) on conflict(worker_id) do nothing',[state.actors.machine.id,state.actors.alice.id]);
await persist();

const rpc=async(actor,fn,action,payload={})=>db.transaction(async tx=>{
  await tx.exec('set local role authenticated');
  await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor.id,session_id:actor.sid,exp:actor.expiresAt})]);
  const allowed={inspector:'public.xedo_inspector',worker:'public.xedo_local_worker'};
  return (await tx.query('select '+allowed[fn]+'($1,$2::jsonb) data',[action,JSON.stringify(payload)])).rows[0].data;
});
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function issue(account,sid= randomUUID()){
  const actor={...account,sid,expiresAt:Math.floor(Date.now()/1000)+3600};
  const access=randomUUID()+'.local.fixture',refresh=randomUUID()+'.local.refresh';
  state.tokens[access]=actor;state.refresh[refresh]=actor;
  await db.query("insert into auth.sessions values($1,$2,now()+interval '1 hour') on conflict(id) do update set not_after=excluded.not_after",[sid,actor.id]);
  await persist();
  return json({access_token:access,refresh_token:refresh,expires_in:3600,token_type:'bearer',user:{id:actor.id,email:actor.email}});
}
async function mockUpstream(url,options={}){
  const parsed=new URL(url),body=options.body?JSON.parse(options.body):{},token=new Headers(options.headers).get('Authorization')?.slice(7),actor=state.tokens[token];
  if(parsed.pathname==='/auth/v1/token'){
    if(parsed.searchParams.get('grant_type')==='password'){
      const account=Object.values(state.actors).find(a=>a.email===body.email);
      if(!account||body.password!=='local-test-only')return json({message:'Invalid credentials'},400);
      return issue(account);
    }
    if(parsed.searchParams.get('grant_type')==='refresh_token'){
      const previous=state.refresh[body.refresh_token];
      if(!previous)return json({message:'Invalid refresh session'},401);
      const live=(await db.query('select id from auth.sessions where id=$1',[previous.sid])).rows.length;
      if(!live)return json({message:'Invalid refresh session'},401);
      delete state.refresh[body.refresh_token];return issue(previous,previous.sid);
    }
    return json({message:'Unsupported fixture grant'},400);
  }
  if(!actor||actor.expiresAt<=Date.now()/1000)return json({message:'Invalid session'},401);
  if(parsed.pathname==='/auth/v1/user')return json({id:actor.id,email:actor.email});
  if(parsed.pathname==='/auth/v1/logout'){
    for(const [k,v]of Object.entries(state.tokens))if(v.sid===actor.sid)delete state.tokens[k];
    for(const [k,v]of Object.entries(state.refresh))if(v.sid===actor.sid)delete state.refresh[k];
    await db.query('delete from auth.sessions where id=$1',[actor.sid]);await persist();return new Response(null,{status:204});
  }
  const fn=parsed.pathname==='/rest/v1/rpc/xedo_inspector'?'inspector':parsed.pathname==='/rest/v1/rpc/xedo_local_worker'?'worker':null;
  if(!fn)return json({message:'Fixture endpoint not found'},404);
  if(fn==='inspector'&&body.p_action==='analysis'&&resultDelay)await new Promise(resolve=>setTimeout(resolve,resultDelay));
  try{return json(await rpc(actor,fn,body.p_action,body.p_payload));}
  catch(error){return json({code:error.code||'LOCAL_RPC_ERROR',message:error.message},/^PT\d{3}$/.test(error.code)?Number(error.code.slice(2)):500);}
}
async function requestBody(req){
  let total=0;const chunks=[];
  for await(const chunk of req){total+=chunk.length;if(total>1100000)throw Object.assign(Error('Local request too large'),{status:413});chunks.push(chunk);}
  return Buffer.concat(chunks).toString('utf8');
}
async function reply(res,response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const siteRoot=path.join(root,'dist');
const receipt={schemaVersion:'xedo-local-ai-qa/1',origin,simulatedAuth:true,localPostgreSQL:true,persistentQueue:true,realGEEConfigured:geeEnv.GEE_CONFIGURATION?.state==='configured',liveSupabaseChanged:false,actors:state.actors};
await writeFile(path.join(dataDir,'qa-receipt.json'),JSON.stringify(receipt,null,2));
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!=='127.0.0.1:'+port){res.writeHead(403).end();return;}
    const parsed=new URL(req.url,origin);
    if(req.url.startsWith('/api/v1/inspector/')||parsed.pathname==='/api/inspector')return await handleInspector(req,res,{fetchImpl:mockUpstream,env:{}});
    if(parsed.pathname.startsWith('/auth/v1/')||parsed.pathname==='/rest/v1/rpc/xedo_local_worker'){
      if(req.method!=='POST'||req.headers.origin&&req.headers.origin!==origin){res.writeHead(403).end();return;}
      return await reply(res,await mockUpstream(origin+req.url,{headers:req.headers,body:await requestBody(req)}));
    }
    if(['/api/v1/gee/planning-context','/api/planning-context'].includes(parsed.pathname))return await handleHostedPlanningContext(req,res,{env:geeEnv});
    if(['/api/v1/environment','/api/environment'].includes(parsed.pathname))return await handleHostedEnvironment(req,res);
    if(parsed.pathname.startsWith('/api/'))return await handleHostedGEE(req,res,{env:geeEnv});
    if(parsed.pathname==='/qa/receipt')return await reply(res,json(receipt));
    let pathname;try{pathname=decodeURIComponent(parsed.pathname);}catch{res.writeHead(400).end();return;}
    const filename=path.resolve(siteRoot,'.'+(pathname==='/'?'/index.html':pathname));
    if(!filename.startsWith(siteRoot+path.sep)){res.writeHead(403).end();return;}
    let bytes;try{bytes=await readFile(filename);}catch{res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch(error){if(!res.headersSent)res.writeHead(error.status||500,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Local QA request failed.'}));}
});
server.listen(port,'127.0.0.1',()=>console.log('XEDO LOCAL AI QA ready: '+origin+' — simulated Auth, persistent local PostgreSQL, existing GEE. Never deploy.'));
async function stop(){server.close();await persist();await db.close();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
