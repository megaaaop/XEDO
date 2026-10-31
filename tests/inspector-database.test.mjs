import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createInspectorDatabase} from './helpers/inspector-db.mjs';
import {createPlanningFlightProfile} from '../src/planning-flight-profile.js';
import {validateInspectorSave} from '../src/inspector-validation.js';

test('Inspector SQL executes locally: owner isolation, history, idempotency, CAS and live-session enforcement',async t=>{
  const {db,actors,rpc}=await createInspectorDatabase();t.after(()=>db.close());
  const draft=JSON.parse(await readFile(new URL('../contracts/examples/inspector-save-draft.json',import.meta.url),'utf8'));
  draft.mutationId=randomUUID();const a=actors.alice,b=actors.bob;
  const saved=await rpc(a,'save',draft);assert.equal(saved.revision,1);
  await t.test('Owner reopens its document and foreign missions are indistinguishable from missing missions',async()=>{
    const opened=await rpc(a,'get',{missionId:saved.missionId});assert.deepEqual(opened.document,draft.document);
    assert.equal((await rpc(a,'list')).length,1);assert.deepEqual(await rpc(b,'list'),[]);
    for(const id of [saved.missionId,randomUUID()])for(const action of ['get','history'])await assert.rejects(rpc(b,action,{missionId:id}),{code:'PT404'});
    await assert.rejects(rpc(b,'save',{...draft,missionId:saved.missionId,expectedRevision:1,mutationId:randomUUID()}),{code:'PT404'});
  });
  await t.test('Same request returns original receipt even after head advances; changed request and stale revisions conflict',async()=>{
    assert.deepEqual(await rpc(a,'save',draft),saved);
    const update={...draft,missionId:saved.missionId,expectedRevision:1,mutationId:randomUUID(),document:{...draft.document,title:'Changed title'}};
    const second=await rpc(a,'save',update);assert.equal(second.revision,2);
    assert.deepEqual(await rpc(a,'save',draft),saved);
    await assert.rejects(rpc(a,'save',{...draft,document:{...draft.document,title:'Different request'}}),{code:'PT409'});
    await assert.rejects(rpc(a,'save',{...update,mutationId:randomUUID()}),{code:'PT409'});
    const history=await rpc(a,'history',{missionId:saved.missionId});assert.deepEqual(history.map(x=>x.revision),[2,1]);
    assert.equal((await rpc(a,'get',{missionId:saved.missionId,revision:1})).document.title,draft.document.title);
    assert.equal((await rpc(a,'list'))[0].title,'Changed title');
  });
  await t.test('P17 planning purpose and field ownership survive SQL Save v3/v4, history, reopen and account isolation',async()=>{
    const document=structuredClone(draft.document),profile=createPlanningFlightProfile();
    document.planningInputs.flight={...document.planningInputs.flight,...profile.reconcile({}),turnS:0,powerW:500};profile.edited('turnS');profile.edited('powerW');
    document.planningInputs.flight.planningProfile=profile.metadata(document.planningInputs.flight);
    document.planningInputs.export={...document.planningInputs.export,purpose:'planning_reference',planningReviewed:false,noGo:null};
    const update={...draft,missionId:saved.missionId,expectedRevision:2,mutationId:randomUUID(),document};validateInspectorSave(update);
    const third=await rpc(a,'save',update);assert.equal(third.revision,3);
    const opened=await rpc(a,'get',{missionId:saved.missionId});assert.deepEqual(opened.document.planningInputs,document.planningInputs);
    const fourth=structuredClone(update);fourth.expectedRevision=3;fourth.mutationId=randomUUID();fourth.document.planningInputs.flight.powerW=null;fourth.document.planningInputs.flight.planningProfile.fields.powerW.value=null;
    await rpc(a,'save',fourth);const older=await rpc(a,'get',{missionId:saved.missionId,revision:3});assert.equal(older.document.planningInputs.flight.powerW,500);
    const current=await rpc(a,'get',{missionId:saved.missionId});assert.equal(current.document.planningInputs.flight.powerW,null);assert.equal(current.document.planningInputs.flight.planningProfile.fields.powerW.mode,'manual');assert.equal(current.document.planningInputs.export.noGo,null);
    await assert.rejects(rpc(b,'get',{missionId:saved.missionId}),{code:'PT404'});
  });
  await t.test('Malformed/direct-RPC actions cannot create authoritative reviews or owner fields',async()=>{
    for(const payload of [{...draft,intent:'confirm_risk'},{...draft,owner_id:b.id},{...draft,document:{...draft.document,inputMode:'admin'}},{...draft,document:{title:'Incomplete'}},{...draft,document:{...draft.document,planningInputs:{padding:'x'.repeat(65536)}}}])await assert.rejects(rpc(a,'save',payload),{code:'PT422'});
    await assert.rejects(rpc(a,null,{...draft,mutationId:randomUUID()}),{code:'PT422'});
  });
  await t.test('Anonymous, expired, unapproved and mismatched sessions are denied',async()=>{
    await assert.rejects(rpc(null,'list'),{code:'PT401'});
    await assert.rejects(rpc(a,'list',{}, {exp:1}),{code:'PT401'});
    await assert.rejects(rpc(a,'list',{}, {session_id:b.sid}),{code:'PT401'});
    await assert.rejects(rpc(actors.unapproved,'list'),{code:'PT403'});
  });
  await t.test('No direct table access or anonymous RPC execution; RLS is enabled on every private table',async()=>{
    await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query('select * from xedo_private.mission_heads');}),{code:'42501'});
    await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query("select public.xedo_inspector('list','{}')");}),{code:'42501'});
    const tables=(await db.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='xedo_private' and relkind='r'")).rows;
    assert.equal(tables.length,5);assert.ok(tables.every(x=>x.relrowsecurity));
  });
  await t.test('Disabled users can revoke their session; revoked and deleted sessions reject still-unexpired claims',async()=>{
    await db.query('update xedo_private.inspector_accounts set enabled=false where user_id=$1',[b.id]);
    await assert.rejects(rpc(b,'session'),{code:'PT403'});await rpc(b,'logout');
    await assert.rejects(rpc(b,'list'),{code:'PT401'});
    await db.query('delete from auth.sessions where id=$1',[a.sid]);await assert.rejects(rpc(a,'list'),{code:'PT401'});
  });
});
