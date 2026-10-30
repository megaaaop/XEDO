import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createInspectorDatabase} from './helpers/inspector-db.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('Local CPU queue/results database contracts',async t=>{
 const {db,actors,rpc}=await createInspectorDatabase();
 const evidence={checks:[],liveDatabase:false,modelInference:false};
 const check=async(name,fn)=>t.test(name,async()=>{await fn();evidence.checks.push(name);});
 try{
 await db.exec(await read('db/inspector-ai.sql'));
 const prepared=JSON.parse(await read('db/prepared-sar.json'));
 await db.query('insert into xedo_private.prepared_analysis_catalog(result_id,payload) values($1,$2)',[prepared.resultId,prepared]);
 await db.exec(await read('db/inspector-local-jobs.sql'));
 await db.exec(await read('db/inspector-local-jobs-status.sql'));
 await db.exec(await read('db/inspector-risk-performance.sql'));
 await check('atomic migration reapplies as a no-op without wrapping twice',async()=>{const before=(await db.query("select pg_get_functiondef('xedo_private.inspector_request(text,jsonb)'::regprocedure) definition")).rows[0].definition;await db.exec(await read('db/inspector-local-jobs.sql'));assert.equal((await db.query("select pg_get_functiondef('xedo_private.inspector_request(text,jsonb)'::regprocedure) definition")).rows[0].definition,before);await db.exec(await read('db/inspector-local-jobs-status.sql'));assert.equal((await db.query('select count(*)::integer n from xedo_private.local_cpu_schema_versions')).rows[0].n,2);});
 const makeMachine=async(owner)=>{const a={id:randomUUID(),sid:randomUUID()};await db.query('insert into auth.users values($1)',[a.id]);await db.query("insert into auth.sessions values($1,$2,now()+interval '1 hour')",[a.sid,a.id]);await db.query('insert into xedo_private.local_worker_registry(worker_id,owner_id) values($1,$2)',[a.id,owner.id]);return a;};
 const machine=await makeMachine(actors.alice),machineB=await makeMachine(actors.bob);
 const worker=async(actor,action,payload={},claims={})=>db.transaction(async tx=>{
  await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor?.id,session_id:actor?.sid,exp:Math.floor(Date.now()/1000)+3600,...claims})]);
  return (await tx.query('select public.xedo_local_worker($1,$2::jsonb) data',[action,JSON.stringify(payload)])).rows[0].data;
 });
 // Real local CPU baseline geometry/counts; no model inference or network in this suite.
 const analysis=JSON.parse(await read('tests/fixtures/local-analysis.json'));
 delete analysis.searchGeometry.geodesic;
 let document=JSON.parse(await read('contracts/examples/inspector-save-draft.json')).document;
 document.searchGeometry=analysis.searchGeometry;document.analysisRef=null;document.riskDraft=null;
 document.imageSelection={provider:'gee',sceneId:'fixture-context-image',acquiredAt:'2026-10-28T00:00:00Z',selectionGeometry:analysis.searchGeometry};
 let saved=await rpc(actors.alice,'save',{schemaVersion:'xedo-inspector-save/1',intent:'save_draft',missionId:null,expectedRevision:0,mutationId:randomUUID(),document});
 const submit=()=>({missionId:saved.missionId,expectedRevision:saved.revision,mutationId:randomUUID(),start:'2026-10-01',end:'2026-10-30'});
 let request=submit(),job,claim,published,owned;
 await check('offline detection and machine/Inspector role separation',async()=>{await assert.rejects(rpc(actors.alice,'create_job',request),{code:'PT503'});await assert.rejects(worker(actors.alice,'presence'),{code:'PT403'});await assert.rejects(rpc(machine,'session'),{code:'PT403'});assert.equal((await rpc(actors.alice,'worker_status')).online,false);await worker(machine,'presence');assert.equal((await rpc(actors.alice,'worker_status')).online,true);});
 await check('saved revision freezes owned input; duplicate submit and changed mutation guarded',async()=>{job=await rpc(actors.alice,'create_job',request);assert.deepEqual(job.geometry,document.searchGeometry);assert.equal(job.inputRevision,saved.revision);assert.deepEqual(await rpc(actors.alice,'create_job',request),job);await assert.rejects(rpc(actors.alice,'create_job',{...request,end:'2026-10-29'}),{code:'PT409'});await assert.rejects(rpc(actors.alice,'create_job',{...submit(),ownerId:actors.bob.id}),{code:'PT422'});await assert.rejects(rpc(actors.alice,'create_job',{...submit(),expectedRevision:123}),{code:'PT409'});});
 await check('owner-only status/list and bounded pending queue',async()=>{await assert.rejects(rpc(actors.bob,'job',{jobId:job.jobId}),{code:'PT404'});assert.equal((await rpc(actors.bob,'jobs')).jobs.length,0);const second=await rpc(actors.alice,'create_job',submit());await assert.rejects(rpc(actors.alice,'create_job',submit()),{code:'PT429'});assert.equal((await rpc(actors.alice,'cancel_job',{jobId:second.jobId})).status,'cancelled');});
 await check('atomic global claim and current lease/fence authority',async()=>{claim=await worker(machine,'claim');assert.equal(claim.jobId,job.jobId);assert.equal(claim.job.jobId,job.jobId);assert.deepEqual(claim.job.geometry,job.geometry);assert.equal(await worker(machineB,'claim'),null);const body={jobId:job.jobId,attemptId:claim.attemptId,fence:claim.fence};assert.equal((await worker(machine,'heartbeat',body)).cancelRequested,false);await assert.rejects(worker(machine,'heartbeat',{...body,fence:claim.fence+1}),{code:'PT409'});await assert.rejects(worker(machineB,'heartbeat',body),{code:'PT404'});});
 const bind=()=>({jobId:job.jobId,attemptId:claim.attemptId,fence:claim.fence});
 await check('progress uses real bounded monotonic counters',async()=>{await worker(machine,'progress',{...bind(),stage:'loading_model'});await assert.rejects(worker(machine,'progress',{...bind(),stage:'downloading'}),{code:'PT422'});await worker(machine,'progress',{...bind(),stage:'inferencing',processedTiles:3,totalTiles:9});await assert.rejects(worker(machine,'progress',{...bind(),stage:'inferencing',processedTiles:2,totalTiles:9}),{code:'PT422'});await assert.rejects(worker(machine,'progress',{...bind(),stage:'inferencing',processedTiles:10,totalTiles:9}),{code:'PT422'});});
 await check('direct publish rejects model/source/grid/candidate/owner contract tampering',async()=>{
  const changes=[a=>a.localOnly=false,a=>a.ownerId=actors.bob.id,a=>a.analysisRef=prepared.analysisRef,a=>a.model.checkpointSha256='0'.repeat(64),a=>a.searchGeometry=prepared.candidates.features[0].geometry,a=>delete a.grid.crs,a=>delete a.source.assetId,a=>a.grid.width=4097,a=>a.source.acquiredAt='2025-01-01T00:00:00Z',a=>delete a.candidates.features[0].properties.pixelCount,a=>a.candidates.features[0].geometry.coordinates[0][1]=a.candidates.features[0].geometry.coordinates[0][0],a=>a.coverage.features[0].properties.role='bad'];
  for(const change of changes){const a=structuredClone(analysis);change(a);await assert.rejects(worker(machine,'publish',{...bind(),mutationId:randomUUID(),analysis:a}),{code:'PT422'});}
  await assert.rejects(worker(machine,'publish',{...bind(),mutationId:randomUUID(),ownerId:actors.bob.id,analysis}),{code:'PT422'});
 });
 let publication;
 await check('input area, payload and full raw-result bounds reject oversized work',async()=>{
  const large={type:'Polygon',coordinates:[[[101,12],[101.5,12],[101.5,12.5],[101,12.5],[101,12]]]};
  const largeDoc={...document,searchGeometry:large,imageSelection:{...document.imageSelection,selectionGeometry:large}};
  const mission=await rpc(actors.alice,'save',{schemaVersion:'xedo-inspector-save/1',intent:'save_draft',missionId:null,expectedRevision:0,mutationId:randomUUID(),document:largeDoc});
  await assert.rejects(rpc(actors.alice,'create_job',{...submit(),missionId:mission.missionId,expectedRevision:mission.revision}),{code:'PT422',message:'JOB_AREA_INVALID'});
  await assert.rejects(rpc(actors.alice,'jobs',{padding:'x'.repeat(17000)}),{code:'PT422'});
  await assert.rejects(worker(machine,'presence',{padding:'x'.repeat(600001)}),{code:'PT422'});
  const largeAnalysis={...analysis,padding:'x'.repeat(524288)};
  await assert.rejects(worker(machine,'publish',{...bind(),mutationId:randomUUID(),analysis:largeAnalysis}),{code:'PT422'});
  const many=structuredClone(analysis);many.candidates.features=Array.from({length:257},(_,i)=>({...many.candidates.features[0],id:'bound_'+i,properties:{...many.candidates.features[0].properties,candidateId:'bound_'+i}}));
  await assert.rejects(worker(machine,'publish',{...bind(),mutationId:randomUUID(),analysis:many}),{code:'PT422'});
 });
 await check('publish derives owned immutable IDs and canonical hashes atomically',async()=>{publication={...bind(),mutationId:randomUUID(),analysis:{...analysis,serverRegistered:true,accuracyValidatedOnGEE:true,reviewStatus:'confirmed',limitations:[]}};published=await worker(machine,'publish',publication);assert.equal(published.status,'succeeded');assert.notEqual(published.resultId,analysis.resultId);owned=await rpc(actors.alice,'analysis',{resultId:published.resultId});assert.deepEqual(owned.analysisRef,published.analysisRef);assert.equal(owned.manifest.sealVersion,'xedo-jsonb-seal/1');assert.equal(owned.serverRegistered,true);assert.equal(owned.accuracyValidatedOnGEE,false);assert.equal(owned.reviewStatus,'unreviewed');assert.ok(owned.limitations.length>0);assert.equal(owned.manifest.accuracyValidatedOnGEE,false);assert.equal(owned.manifest.producerRunId,analysis.resultId);assert.equal(owned.candidates.features[0].properties.resultId,published.resultId);assert.equal((await rpc(actors.alice,'job',{jobId:job.jobId})).status,'succeeded');});
 await check('publish receipt reconciles after lease ended but changed body fails',async()=>{assert.deepEqual(await worker(machine,'publish',publication),published);await assert.rejects(worker(machine,'publish',{...publication,analysis:{...analysis,title:'changed'}}),{code:'PT409'});await db.query('update xedo_private.local_worker_registry set enabled=false where worker_id=$1',[machine.id]);await assert.rejects(worker(machine,'publish',publication),{code:'PT403'});await db.query('update xedo_private.local_worker_registry set enabled=true where worker_id=$1',[machine.id]);});
 await check('owned resolver protects list/detail/save while prepared catalog remains compatible',async()=>{assert.equal((await rpc(actors.alice,'analyses')).length,2);assert.equal((await rpc(actors.bob,'analyses')).length,1);assert.deepEqual(await rpc(actors.alice,'analysis',{resultId:prepared.resultId}),prepared);await assert.rejects(rpc(actors.bob,'analysis',{resultId:published.resultId}),{code:'PT404'});const forged={...document,analysisRef:published.analysisRef};await assert.rejects(rpc(actors.bob,'save',{schemaVersion:'xedo-inspector-save/1',intent:'save_draft',missionId:null,expectedRevision:0,mutationId:randomUUID(),document:forged}),{code:'PT422'});});
 await check('owned result feeds existing Inspector confirmation/save/history',async()=>{const candidate=owned.candidates.features[0];const area=randomUUID();document={...document,analysisRef:owned.analysisRef,riskDraft:{baseReviewRevision:null,decisions:[{candidateId:candidate.id,action:'accept',areaId:area}],areas:[{id:area,origin:'candidate',sourceCandidateIds:[candidate.id],rings:candidate.geometry.coordinates}],selectedAreaId:area},planningInputs:{...document.planningInputs,geometry:candidate.geometry}};delete document.planningInputs.surveyId;saved=await rpc(actors.alice,'save',{schemaVersion:'xedo-inspector-save/1',intent:'confirm_risk',missionId:saved.missionId,expectedRevision:saved.revision,mutationId:randomUUID(),document,confirmation:{baseReviewRevision:null,target:{origin:'candidate',areaId:area,sourceCandidateIds:[candidate.id],geometry:candidate.geometry}}});assert.equal(saved.confirmedReview.analysisRef.resultId,owned.resultId);const got=await rpc(actors.alice,'get',{missionId:saved.missionId});assert.equal(got.document.analysisRef.resultId,owned.resultId);assert.equal((await rpc(actors.alice,'history',{missionId:saved.missionId}))[0].revision,saved.revision);});
 await check('expired lease reclaims with new fence and blocks old writer',async()=>{const next=await rpc(actors.alice,'create_job',submit());const first=await worker(machine,'claim');assert.equal(first.jobId,next.jobId);await db.query("update xedo_private.analysis_jobs set lease_expires_at=now()-interval '1 second' where id=$1",[next.jobId]);const again=await worker(machine,'claim');assert.equal(again.fence,first.fence+1);await assert.rejects(worker(machine,'heartbeat',{jobId:next.jobId,attemptId:first.attemptId,fence:first.fence}),{code:'PT409'});await rpc(actors.alice,'cancel_job',{jobId:next.jobId});assert.equal((await worker(machine,'heartbeat',{jobId:next.jobId,attemptId:again.attemptId,fence:again.fence})).cancelRequested,true);await assert.rejects(worker(machine,'publish',{jobId:next.jobId,attemptId:again.attemptId,fence:again.fence,mutationId:randomUUID(),analysis}),{code:'PT409'});const failed=await worker(machine,'fail',{jobId:next.jobId,attemptId:again.attemptId,fence:again.fence,errorCode:'worker_cancelled'});assert.equal(failed.status,'cancelled');});
 await check('expired/revoked sessions, helpers and direct tables cannot bypass guards',async()=>{await assert.rejects(worker(machine,'presence',{}, {exp:1}),{code:'PT401'});await db.query('insert into xedo_private.revoked_sessions(session_id,user_id) values($1,$2)',[machineB.sid,machineB.id]);await assert.rejects(worker(machineB,'presence'),{code:'PT401'});for(const sql of ['select * from xedo_private.analysis_jobs','select xedo_private.local_ring_valid(null)','select xedo_private.resolve_analysis(null,null)'])await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.exec(sql);}),{code:'42501'});});
 await check('Inspector polling ends owned deadline-expired jobs while PC is offline',async()=>{
  await worker(machine,'presence');const current=await rpc(actors.alice,'create_job',submit());const currentClaim=await worker(machine,'claim');
  await db.query("update xedo_private.local_worker_registry set last_seen_at=now()-interval '181 seconds' where worker_id=$1",[machine.id]);
  await db.query("update xedo_private.analysis_jobs set deadline_at=now()-interval '1 second' where id=$1",[current.jobId]);
  await rpc(actors.bob,'jobs');assert.equal((await db.query('select status from xedo_private.analysis_jobs where id=$1',[current.jobId])).rows[0].status,'running');
  const got=await rpc(actors.alice,'job',{jobId:current.jobId});assert.equal(got.status,'failed');assert.equal(got.stage,'failed');assert.equal(got.errorCode,'worker_timeout');assert.equal(got.workerOnline,false);assert.ok(got.workerLastSeenAt);assert.ok(got.deadlineAt);assert.equal(got.leaseExpiresAt,null);
  const attempt=(await db.query('select finished_at,outcome from xedo_private.analysis_attempts where id=$1',[currentClaim.attemptId])).rows[0];assert.ok(attempt.finished_at);assert.equal(attempt.outcome,'failed');
  await assert.rejects(worker(machine,'publish',{jobId:current.jobId,attemptId:currentClaim.attemptId,fence:currentClaim.fence,mutationId:randomUUID(),analysis}),{code:'PT409',message:'LEASE_LOST'});
  await worker(machine,'presence');const queued=await rpc(actors.alice,'create_job',submit());await db.query("update xedo_private.analysis_jobs set deadline_at=now()-interval '1 second' where id=$1",[queued.jobId]);
  assert.equal((await rpc(actors.alice,'jobs')).jobs.find(j=>j.jobId===queued.jobId).status,'failed');
 });
 await check('owner reads leave recoverable expired lease for fencing; cancellation can finish offline',async()=>{
  await worker(machine,'presence');const current=await rpc(actors.alice,'create_job',submit());const first=await worker(machine,'claim');
  await db.query("update xedo_private.analysis_jobs set lease_expires_at=now()-interval '1 second' where id=$1",[current.jobId]);
  const pending=await rpc(actors.alice,'job',{jobId:current.jobId});assert.equal(pending.status,'running');assert.ok(pending.leaseExpiresAt);
  const again=await worker(machine,'claim');assert.equal(again.jobId,current.jobId);assert.equal(again.fence,first.fence+1);
  await assert.rejects(worker(machine,'heartbeat',{jobId:current.jobId,attemptId:first.attemptId,fence:first.fence}),{code:'PT409',message:'LEASE_LOST'});
  await rpc(actors.alice,'cancel_job',{jobId:current.jobId});await db.query("update xedo_private.analysis_jobs set lease_expires_at=now()-interval '1 second' where id=$1",[current.jobId]);
  await db.query("update xedo_private.local_worker_registry set last_seen_at=now()-interval '181 seconds' where worker_id=$1",[machine.id]);
  const cancelled=(await rpc(actors.alice,'jobs')).jobs.find(j=>j.jobId===current.jobId);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.workerOnline,false);
  assert.equal((await db.query('select outcome from xedo_private.analysis_attempts where id=$1',[again.attemptId])).rows[0].outcome,'cancelled');
 });
 await check('monthly logical job cap is independent of attempts',async()=>{await worker(machine,'presence');await db.query("insert into xedo_private.analysis_jobs(owner_id,mission_id,input_revision,mutation_id,request_hash,spec,status) select $1,$2,$3,gen_random_uuid(),'fixture','{}','cancelled' from generate_series(1,100)",[actors.alice.id,saved.missionId,saved.revision]);await assert.rejects(rpc(actors.alice,'create_job',submit()),{code:'PT429'});});
 assert.ok(evidence.checks.length>=14);
 }finally{await db.close();}
});
