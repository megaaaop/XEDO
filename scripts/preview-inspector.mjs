// Local acceptance harness only: in-memory PostgreSQL and simulated Auth.
// Never deploy this server. It has no access to the real Supabase project.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {handleInspector} from '../api/inspector.mjs';
import {createInspectorDatabase} from '../tests/helpers/inspector-db.mjs';
const {db,actors,rpc}=await createInspectorDatabase(),tokens=new Map();
const fetchImpl=async(url,options)=>{
  const body=options.body?JSON.parse(options.body):{},token=options.headers.Authorization?.slice(7),actor=tokens.get(token);
  if(url.includes('/auth/v1/token?')){
    const account=Object.values(actors).find(a=>a.email===body.email);
    if(!account||body.password!=='local-test-only')return Response.json({message:'Invalid credentials'},{status:400});
    const session={...account,sid:randomUUID()},access=randomUUID()+'.local.fixture';tokens.set(access,session);
    await db.query("insert into auth.sessions values($1,$2,now()+interval '1 hour')",[session.sid,session.id]);
    return Response.json({user:{id:session.id,email:session.email},access_token:access,expires_in:3600});
  }
  if(!actor)return Response.json({message:'Invalid session'},{status:401});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:actor.id,email:actor.email});
  if(url.includes('/auth/v1/logout?')){tokens.delete(token);await db.query('delete from auth.sessions where id=$1',[actor.sid]);return new Response(null,{status:204});}
  try{return Response.json(await rpc(actor,body.p_action,body.p_payload));}catch(e){return Response.json({message:e.message},{status:/^PT\d{3}$/.test(e.code)?Number(e.code.slice(2)):500});}
};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url.startsWith('/api/v1/inspector/'))return await handleInspector(req,res,{fetchImpl,env:{}});
    if(req.url.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Imagery providers are outside this local account test.'}));return;}
    if(req.url.split('?')[0]!=='/'){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(new URL('../dist/index.html',import.meta.url)));
  }catch{res.writeHead(500).end('Local Inspector test failed.');}
});
server.listen(5191,'127.0.0.1',()=>console.log('Inspector LOCAL QA only: http://127.0.0.1:5191 — simulated Auth / in-memory PostgreSQL. No production changes.'));
process.on('SIGINT',async()=>{server.close();await db.close();process.exit(0);});
