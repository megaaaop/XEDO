import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import {createMapCache,tileDescriptor,validCachePNG,cacheHash} from '../src/gee-map-cache.js';

function png(){
  const chunk=(name,data)=>{const body=Buffer.concat([Buffer.from(name),data]);let crc=0xffffffff;for(const n of body){crc^=n;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;};
  const hdr=Buffer.alloc(13);hdr.writeUInt32BE(256);hdr.writeUInt32BE(256,4);hdr[8]=8;hdr[9]=2;
  const raw=Buffer.alloc(256*769);for(let y=0;y<256;y++)for(let x=0;x<256;x++){raw[y*769+1+x*3]=10;raw[y*769+2+x*3]=100;raw[y*769+3+x*3]=140;}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const bytes=png(),env={GEE_CACHE_ENABLED:'1',GEE_CACHE_URL:'https://tstmjnlhwidwtzetqxbu.supabase.co',GEE_CACHE_SERVER_KEY:'test-server-key'};
const session={purpose:'basemap',assets:['20261010T034539_20261010T035153_T47PQQ','20261019T034539_20261019T035153_T47PQQ'],bbox:[101.05,12.48,101.42,12.76]};
const descriptor=()=>tileDescriptor(session,{z:11,x:1599,y:951},'pixels','fixture-project');
async function fixture(t){
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  await db.exec(await readFile(new URL('../db/gee-map-cache.sql',import.meta.url),'utf8'));
  const rpc=(op,payload={},role='service_role')=>db.transaction(async tx=>{await tx.exec('set local role '+role);return (await tx.query('select public.xedo_cache_v1($1,$2::jsonb) data',[op,JSON.stringify(payload)])).rows[0].data;});
  const objects=new Map(),tasks=[],calls={rpc:0,upload:0,download:0,delete:0},fault={};
  const fetchImpl=async(url,options)=>{
    assert.equal(new URL(url).origin,env.GEE_CACHE_URL);assert.equal(options.redirect,'error');assert.equal(options.headers.apikey,env.GEE_CACHE_SERVER_KEY);
    if(url.includes('/rpc/')){calls.rpc++;if(fault.rpc)throw new Error('private');const p=JSON.parse(options.body),r=await rpc(p.op,p.payload);if(p.op==='begin_write')fault.afterBegin?.();return Response.json(r);}
    if(options.method==='POST'){calls.upload++;const path=url.split('xedo-gee-map-cache-v1/')[1];if(fault.upload504)return new Response(null,{status:504});objects.set(path,new Uint8Array(options.body));if(fault.uploadUnknown)throw new Error('unknown PUT');return Response.json({Key:path});}
    if(options.method==='DELETE'){calls.delete++;for(const p of JSON.parse(options.body).prefixes)objects.delete(p);return Response.json([]);}
    calls.download++;const b=objects.get(url.split('xedo-gee-map-cache-v1/')[1]);return b?new Response(b,{headers:{'Content-Type':'image/png'}}):new Response(null,{status:404});
  };
  const cache=(options={})=>createMapCache(env,{fetchImpl,defer:p=>tasks.push(p),deadline:()=>Date.now()+60000,...options});
  return {db,rpc,objects,tasks,calls,fault,cache,fetchImpl};
}

test('pixel keys ignore session nonce but distinguish assets, order, clip, pipeline, epoch and grid',async()=>{
  const tile={z:11,x:1599,y:951},at=Date.parse('2026-10-30T12:00:00Z'),first=await tileDescriptor(session,tile,'pixels','fixture',at);
  assert.equal(first.key,(await tileDescriptor({...session,expires:1,nonce:'changed'},tile,'pixels','fixture',at)).key);
  for(const [s,g,p,n] of [[{...session,assets:[...session.assets].reverse()},tile,'pixels',at],[{...session,bbox:[101,12,102,13]},tile,'pixels',at],[session,{...tile,x:1600},'pixels',at],[session,tile,'map',at],[session,tile,'pixels',at+86400000]])assert.notEqual(first.key,(await tileDescriptor(s,g,p,'fixture',n)).key);
  assert.equal(await validCachePNG(bytes),true);const corrupt=Buffer.from(bytes);corrupt[50]^=1;assert.equal(await validCachePNG(corrupt),false);
});

test('SQL enforces private grants, fencing, exact reservations and unknown-upload retention',async t=>{
  const f=await fixture(t),d=await descriptor(),generation=randomUUID();
  for(const role of ['anon','authenticated'])await assert.rejects(f.rpc('status',{},role),{code:'42501'});
  const c=await f.rpc('claim',{...d,generation});assert.equal(c.state,'leader');
  assert.equal((await f.rpc('claim',{...d,generation:randomUUID()})).state,'follower');
  assert.equal((await f.rpc('begin_write',{key:d.key,generation:randomUUID(),bytes:100,hash:'a'.repeat(64)})).state,'stale');
  await assert.rejects(f.rpc('begin_write',{key:d.key,generation,bytes:1048577,hash:'a'.repeat(64)}));
  await f.rpc('begin_write',{key:d.key,generation,bytes:100,hash:'a'.repeat(64)});
  assert.equal((await f.rpc('status')).charged,100);
  await f.db.query("update xedo_map_cache.entries set lease_until=now()-interval '1 day' where key=$1",[d.key]);
  assert.equal((await f.rpc('claim',{...d,generation:randomUUID()})).state,'bypass');
  assert.equal((await f.rpc('release_build',{key:d.key,generation})).state,'retained');
  assert.equal((await f.rpc('cleanup')).state,'none');assert.equal((await f.rpc('status')).charged,100);
  await f.rpc('uncertain',{key:d.key,generation,settled:true});
  const del=await f.rpc('cleanup');assert.equal(del.state,'deleting');
  assert.equal((await f.rpc('status')).charged,100);
  await f.rpc('deleted',{key:d.key,generation});assert.equal((await f.rpc('status')).charged,0);
});

test('allocator rejects overbooking across different keys and releases only fenced building claims',async t=>{
  const f=await fixture(t),claims=[];
  for(let i=0;i<192;i++){
    const key=i.toString(16).padStart(64,'0'),generation=randomUUID(),r=await f.rpc('claim',{key,generation,recipe:{test:i}});
    if(r.state==='leader')claims.push({key,generation});else assert.equal(r.state,'bypass');
  }
  const state=await f.rpc('status');assert.equal(claims.length,190);assert.equal(state.charged,190*1048576);assert.ok(state.charged<=200000000);
  for(const c of claims)await f.rpc('release_build',c);
  assert.equal((await f.rpc('status')).charged,0);
});

test('cache miss writes verified immutable PNG; a fresh adapter hits without recomputing pixels',async t=>{
  const f=await fixture(t),d=await descriptor();let computations=0;
  const produce=async()=>{computations++;return bytes;};
  assert.equal((await f.cache().tile(d,produce)).status,'miss');await Promise.all(f.tasks);
  assert.equal((await f.rpc('status')).charged,bytes.length);assert.equal(f.calls.upload,1);
  const hit=await f.cache().tile(d,produce);assert.equal(hit.status,'hit');assert.deepEqual(Buffer.from(hit.bytes),bytes);assert.equal(computations,1);
  const entry=(await f.db.query('select * from xedo_map_cache.entries')).rows[0];assert.equal(entry.content_hash,await cacheHash(bytes));
});

test('unknown PUT remains charged; corrupted hit falls back and failed producer does not strand building charge',async t=>{
  const f=await fixture(t),d=await descriptor();f.fault.uploadUnknown=true;
  await f.cache().tile(d,async()=>bytes);await Promise.all(f.tasks);
  const state=await f.rpc('status');assert.equal(state.states.uncertain,1);assert.equal(state.charged,bytes.length);
  assert.equal((await f.rpc('cleanup')).state,'none');
  const other=await tileDescriptor(session,{z:11,x:1600,y:951},'pixels','fixture-project');
  await assert.rejects(f.cache().tile(other,async()=>{throw new Error('GEE failed');}));
  assert.equal((await f.rpc('status')).charged,bytes.length);
  f.fault.rpc=true;assert.equal((await f.cache().tile(other,async()=>bytes)).status,'bypass');
});

test('HTTP504 cannot release a PUT that may commit later; global sweep only reclaims expired pre-write claims',async t=>{
  const f=await fixture(t),d=await descriptor();f.fault.upload504=true;
  await f.cache().tile(d,async()=>bytes);await Promise.all(f.tasks);
  assert.equal((await f.rpc('status')).charged,bytes.length);assert.equal((await f.rpc('cleanup')).state,'none');
  const entry=(await f.db.query('select * from xedo_map_cache.entries')).rows[0];assert.equal(entry.write_settled,false);
  f.objects.set(entry.object_path,new Uint8Array(bytes)); // delayed remote commit
  assert.equal((await f.rpc('status')).charged,bytes.length);
  const old={key:'b'.repeat(64),generation:randomUUID(),recipe:{test:'orphan'}};
  await f.rpc('claim',old);await f.db.exec("update xedo_map_cache.entries set lease_until=now()-interval '1 day' where state='building'");
  assert.equal((await f.rpc('cleanup')).state,'released_building');
  assert.equal((await f.rpc('begin_write',{...old,bytes:20,hash:'a'.repeat(64)})).state,'stale');
  assert.equal((await f.rpc('status')).charged,bytes.length);
});

test('slow begin-write loses headroom without starting PUT; no-lifecycle failure is not recomputed',async t=>{
  const f=await fixture(t),d=await descriptor();let clock=Date.now();const limit=clock+7000;
  f.fault.afterBegin=()=>{clock+=3000;};
  await f.cache({now:()=>clock,deadline:()=>limit}).tile(d,async()=>bytes);await Promise.all(f.tasks);
  assert.equal(f.calls.upload,0);assert.equal((await f.rpc('status')).charged,0);
  let calls=0;const error=new Error('original producer failure');
  await assert.rejects(f.cache({defer:undefined,deadline:()=>0}).tile(d,async()=>{calls++;throw error;}),e=>e===error);assert.equal(calls,1);
});

test('independent adapters wait for one normal leader and damaged hit recovers through bounded GEE fallback',async t=>{
  const f=await fixture(t),d=await descriptor();let release,start;const gate=new Promise(r=>release=r),begun=new Promise(r=>start=r);let computes=0;
  const a=f.cache().tile(d,async()=>{computes++;start();await gate;return bytes;});await begun;
  const b=f.cache().tile(d,async()=>{computes++;return bytes;});release();await a;await Promise.all(f.tasks);
  assert.equal((await b).status,'hit');assert.equal(computes,1);
  const path=[...f.objects.keys()][0],corrupt=Buffer.from(bytes);corrupt[50]^=1;f.objects.set(path,corrupt);
  const fallback=await f.cache().tile(d,async()=>{computes++;return bytes;});assert.deepEqual(Buffer.from(fallback.bytes),bytes);await Promise.all(f.tasks);
  assert.equal(computes,2);assert.equal(f.objects.size,0);assert.equal((await f.rpc('status')).charged,0);
});

test('malformed follower hit cannot return a different logical image',async()=>{
  const d=await descriptor(),tasks=[];let claims=0,reads=0,computes=0;
  const fetchImpl=async(url,options)=>{
    if(!url.includes('/rpc/')){reads++;throw new Error('Wrong image must never be downloaded');}
    const p=JSON.parse(options.body);if(p.op!=='claim')return Response.json({state:'none'});
    claims++;return Response.json(claims===1?{state:'follower'}:{state:'hit',path:'v1/'+'a'.repeat(64)+'/'+randomUUID()+'.png',generation:randomUUID(),bytes:bytes.length,hash:await cacheHash(bytes)});
  };
  const cache=createMapCache(env,{fetchImpl,defer:p=>tasks.push(p),deadline:()=>Date.now()+60000});
  const result=await cache.tile(d,async()=>{computes++;return bytes;});assert.deepEqual(Buffer.from(result.bytes),bytes);assert.equal(reads,0);assert.equal(computes,1);await Promise.all(tasks);
});
