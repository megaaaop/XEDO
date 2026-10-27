import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import {inspectorFetch,handleInspector} from '../api/inspector.mjs';
import {validateInspectorSave} from '../src/inspector-validation.js';
import {createInspectorState} from '../src/inspector-state.js';
const origin='https://xedo.test',cookie='__Host-xedo_inspector=a.b.c';
const req=(route,{body,method=body?'POST':'GET',headers={}}={})=>new Request(origin+'/api/v1/inspector/'+route,{method,headers:{origin,'x-xedo-inspector':user.id,...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const ok=data=>Response.json(data),user={id:'65c039f9-cb8c-42fa-a1ed-5c2fb6fa698e',email:'inspector@example.test'};
const draft=JSON.parse(await readFile(new URL('../contracts/examples/inspector-save-draft.json',import.meta.url),'utf8'));

test('Inspector authentication returns metadata only and sets an HttpOnly Secure host cookie',async()=>{
  let calls=[];const response=await inspectorFetch(req('login',{body:{email:user.email,password:'test-only'}}),{fetchImpl:async(url,options)=>{calls.push([url,options]);return url.includes('/token?')?ok({user,access_token:'a.b.c',refresh_token:'never-returned',expires_in:3600}):ok({id:user.id,role:'Inspector'});}});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('set-cookie'),/__Host-xedo_inspector=a.b.c; Path=\/; HttpOnly; SameSite=Lax; Max-Age=3600; Secure/);
  const body=await response.text();assert.doesNotMatch(body,/access_token|refresh_token|a\.b\.c|test-only/);assert.equal(calls.length,2);assert.equal(calls[1][1].headers.Authorization,'Bearer a.b.c');
});
test('Inspector endpoints reject CSRF, unknown paths, duplicate cookies and oversized bodies without provider calls',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw Error('should not call');};
  for(const [request,status] of [[req('login',{body:{},headers:{origin:'https://evil.test'}}),403],[req('login',{body:{},headers:{origin:''}}),403],[req('session',{headers:{'sec-fetch-site':'cross-site'}}),403],[req('session?url=https://evil.test'),404],[req('missions',{headers:{cookie:cookie+'; '+cookie}}),401],[req('login',{body:'x'.repeat(8193)}),413],[req('login',{body:'{}',headers:{'content-type':'text/plain'}}),415],[req('login',{body:'{'}),400]])assert.equal((await inspectorFetch(request,{fetchImpl})).status,status);
  assert.equal(calls,0);assert.deepEqual(await (await inspectorFetch(req('session'),{fetchImpl})).json(),{user:null});
});
test('Only safe provider errors are returned; unapproved accounts receive no cookie',async()=>{
  for(const [providerStatus,expected] of [[400,401],[429,429],[500,503]]){
    const response=await inspectorFetch(req('login',{body:{email:user.email,password:'test-only'}}),{fetchImpl:async()=>Response.json({message:'secret provider body'},{status:providerStatus})});assert.equal(response.status,expected);assert.doesNotMatch(await response.text(),/secret provider body/);
  }
  let calls=0;const response=await inspectorFetch(req('login',{body:{email:user.email,password:'test-only'}}),{fetchImpl:async url=>{calls++;if(url.includes('/token?'))return ok({user,access_token:'a.b.c',expires_in:3600});if(url.includes('/logout?'))return new Response(null,{status:204});return Response.json({message:'private allowlist detail'},{status:403});}});
  assert.equal(response.status,403);assert.equal(response.headers.get('set-cookie'),null);assert.equal(calls,3);
});
test('Private save validates the full schema, blocks confirmation and never supplies client ownership to RPC',async()=>{
  let saves=0;const fetchImpl=async(url,options)=>{if(url.endsWith('/user'))return ok(user);const body=JSON.parse(options.body);assert.equal(body.p_action,'save');assert.equal(body.p_payload.document.title,draft.document.title);saves++;return ok({missionId:user.id,revision:1});};
  assert.equal((await inspectorFetch(req('missions',{body:draft,headers:{cookie}}),{fetchImpl})).status,200);
  for(const input of [{...draft,owner_id:user.id},{...draft,document:{...draft.document,owner:user.id}},{...draft,intent:'confirm_risk'},{...draft,document:{...draft.document,title:''}}])assert.equal((await inspectorFetch(req('missions',{body:input,headers:{cookie}}),{fetchImpl})).status,422);
  assert.equal(saves,1);assert.throws(()=>validateInspectorSave({...draft,document:{...draft.document,planningInputs:{oil:{padding:'x'.repeat(65536)}}}}));
});
test('Logout attempts both revocations and clears the cookie even when server revocation fails',async()=>{
  for(const success of [true,false]){const urls=[];const response=await inspectorFetch(req('logout',{body:{},headers:{cookie}}),{fetchImpl:async url=>{urls.push(url);if(url.endsWith('/user'))return ok(user);if(success&&url.includes('/logout?'))return new Response(null,{status:204});return Response.json({}, {status:503});}});assert.equal(response.status,success?200:503);assert.equal(urls.length,3);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);}
});
test('A cookie switched to another account cannot read, save or sign out using the previous tab actor',async()=>{
  let rpcCalls=0;const fetchImpl=async url=>{if(url.endsWith('/user'))return ok({...user,id:'fdbbd65d-2952-4b5e-a911-314869ebc1d9'});rpcCalls++;return ok({});};
  for(const request of [req('missions',{headers:{cookie}}),req('missions',{body:draft,headers:{cookie}}),req('logout',{body:{},headers:{cookie}}),req('session',{headers:{cookie}})]){const response=await inspectorFetch(request,{fetchImpl});assert.equal(response.status,409);assert.equal((await response.json()).code,'ACCOUNT_CHANGED');assert.equal(response.headers.get('set-cookie'),null);}
  assert.equal(rpcCalls,0);
});
test('Account epochs reject stale open/save responses; late save acknowledgment preserves newer edits',()=>{
  const s=createInspectorState();s.account(user);const opening=s.capture();s.changed();assert.equal(s.opened({missionId:'old',revision:1},opening),false);
  const save=s.capture();s.changed();assert.equal(s.saved({missionId:'a',revision:1},save),true);assert.equal(s.dirty,true);
  const second=s.capture();s.account({...user,id:'another'});assert.equal(s.saved({missionId:'a',revision:2},second),false);assert.equal(s.missionId,null);
  const old=s.capture();s.newMission();assert.equal(s.opened({missionId:'a',revision:1},old),false);
  const startup=createInspectorState();startup.changed();startup.reauthenticate(user);assert.equal(startup.dirty,true,'Initial session metadata cannot erase edits made while the request waited');
});
test('The Node bridge preserves Set-Cookie and does not accept a foreign project configuration',async()=>{
  const response=Object.assign(new EventEmitter(),{headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}});
  await handleInspector({url:'/api/v1/inspector/logout',method:'POST',headers:{host:'localhost:5189',origin:'http://localhost:5189','content-type':'application/json'},body:{}},response);
  assert.equal(response.statusCode,200);assert.equal(response.headers['Set-Cookie'].length,1);assert.match(response.headers['Set-Cookie'][0],/^xedo_inspector_dev=/);
  assert.equal((await inspectorFetch(req('session'),{env:{SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co'}})).status,503);
});
