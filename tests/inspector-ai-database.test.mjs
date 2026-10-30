import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createInspectorDatabase} from './helpers/inspector-db.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
test('Prepared AI database: authoritative catalog/reviews and private revision lineage',async t=>{
const {db,actors,rpc}=await createInspectorDatabase();
const check=(name,fn)=>t.test(name,fn);
try{
 await db.exec(await readFile(root+'/db/inspector-ai.sql','utf8'));
 await db.exec(await readFile(root+'/db/inspector-risk-performance.sql','utf8'));
 const catalog=JSON.parse(await readFile(root+'/db/prepared-sar.json','utf8'));
 await db.query('insert into xedo_private.prepared_analysis_catalog(result_id,payload) values($1,$2::jsonb)',[catalog.resultId,JSON.stringify(catalog)]);
 const doc=JSON.parse(await readFile(root+'/contracts/examples/inspector-save-draft.json','utf8')).document;
 doc.searchGeometry=catalog.searchGeometry;
 doc.imageSelection={provider:'gee',sceneId:'fixture-image',acquiredAt:'2026-10-28T00:00:00Z',selectionGeometry:catalog.searchGeometry};
 doc.analysisRef=catalog.analysisRef;
 const make=(document=structuredClone(doc),mid=null,revision=0,base=null)=>({schemaVersion:'xedo-inspector-save/1',missionId:mid,expectedRevision:revision,mutationId:randomUUID(),intent:'confirm_risk',document,confirmation:{baseReviewRevision:base,target:{origin:document.riskDraft.areas[0].origin,areaId:document.riskDraft.selectedAreaId,sourceCandidateIds:document.riskDraft.areas[0].sourceCandidateIds,geometry:structuredClone(document.planningInputs.geometry)}}});
 let request=make();let saved;
 await check('authenticated catalog read and anonymous denial',async()=>{assert.equal((await rpc(actors.alice,'analyses')).length,1);assert.deepEqual(await rpc(actors.alice,'analysis',{resultId:catalog.resultId}),catalog);await assert.rejects(rpc(null,'analyses'),{code:'PT401'});});
 await check('first confirmation creates mission with server actor/time/hash',async()=>{saved=await rpc(actors.alice,'save',request);assert.equal(saved.revision,1);assert.equal(saved.confirmedReview.reviewerId,actors.alice.id);assert.equal(saved.confirmedReview.reviewRevision,1);assert.equal(saved.confirmedReview.target.geometry.type,'Polygon');assert.equal(saved.confirmedReview.coverageState,'complete');});
 await check('idempotent confirm receipt survives repeat and foreign owner denied',async()=>{assert.deepEqual(await rpc(actors.alice,'save',request),saved);await assert.rejects(rpc(actors.bob,'get',{missionId:saved.missionId}),{code:'PT404'});await assert.rejects(rpc(actors.bob,'save',{...make(),missionId:saved.missionId,expectedRevision:1}),{code:'PT404'});});
 await check('get and history expose server-owned review separately',async()=>{const got=await rpc(actors.alice,'get',{missionId:saved.missionId});assert.equal(got.confirmedReview.reviewRevision,1);assert.equal(got.latestReviewRevision,1);assert.equal(got.document.riskDraft.baseReviewRevision,null);assert.equal((await rpc(actors.alice,'history',{missionId:saved.missionId}))[0].reviewRevision,1);});
 await check('normal save preserves unchanged confirmed target without minting reviewer',async()=>{const d=structuredClone(doc);d.riskDraft.baseReviewRevision=1;d.title='After confirmation';const r=await rpc(actors.alice,'save',{schemaVersion:'xedo-inspector-save/1',missionId:saved.missionId,expectedRevision:1,mutationId:randomUUID(),intent:'save_draft',document:d});assert.deepEqual(r.confirmedReview,saved.confirmedReview);assert.equal((await rpc(actors.alice,'get',{missionId:saved.missionId})).latestReviewRevision,1);});
 await check('changing other candidate decisions revokes seal even when selected geometry is unchanged',async()=>{const d=structuredClone(doc);d.riskDraft.baseReviewRevision=1;d.riskDraft.decisions.push({candidateId:'candidate-00002',action:'reject',areaId:null});const r=await rpc(actors.alice,'save',{schemaVersion:'xedo-inspector-save/1',missionId:saved.missionId,expectedRevision:2,mutationId:randomUUID(),intent:'save_draft',document:d});assert.equal(r.confirmedReview,null);assert.equal(r.latestReviewRevision,1);const reopened=await rpc(actors.alice,'get',{missionId:saved.missionId});assert.equal(reopened.confirmedReview,null);assert.equal(reopened.latestReviewRevision,1);});
 await check('direct RPC rejects forged hash/candidate/origin/reviewer/target/base',async()=>{
  const modifications=[p=>p.document.analysisRef.manifestSha256='0'.repeat(64),p=>p.confirmation.target.sourceCandidateIds=['forged'],p=>p.confirmation.reviewerId=actors.bob.id,p=>p.confirmation.target.origin='manual',p=>p.confirmation.baseReviewRevision=22,p=>p.document.planningInputs.geometry=catalog.searchGeometry,p=>p.confirmation.target.geometry={type:'Polygon',coordinates:[[[101.2,12.5],[101.201,12.501],[101.2,12.501],[101.201,12.5],[101.2,12.5]]]}];
  for(const change of modifications){const p=make();change(p);await assert.rejects(rpc(actors.alice,'save',p),e=>e.code==='PT422'||e.code==='PT409');}
 });
 await check('stale CAS/review revisions cannot confirm',async()=>{await assert.rejects(rpc(actors.alice,'save',make(structuredClone(doc),saved.missionId,1,null)),{code:'PT409'});const d=structuredClone(doc);await assert.rejects(rpc(actors.alice,'save',make(d,saved.missionId,2,null)),{code:'PT409'});});
 await check('direct RPC rejects inconsistent decisions and incomplete image identities',async()=>{
  const cases=[
   p=>p.document.riskDraft.decisions.push({candidateId:'candidate-00002',action:'accept',areaId:p.document.riskDraft.selectedAreaId}),
   p=>{p.document.riskDraft.areas[0].origin='manual';p.document.riskDraft.areas[0].sourceCandidateIds=[];p.confirmation.target.origin='manual';p.confirmation.target.sourceCandidateIds=[];},
   p=>{p.document.imageSelection={selectionGeometry:catalog.searchGeometry};},
   p=>p.document.imageSelection.acquiredAt='2026-99-55T00:00:00Z',
   p=>p.document.riskDraft.decisions.push({candidateId:'candidate-00002',action:'reject',areaId:p.document.riskDraft.selectedAreaId}),
   p=>p.document.riskDraft.areas[0].owner=actors.bob.id
  ];for(const mutate of cases){const p=make();mutate(p);await assert.rejects(rpc(actors.alice,'save',p),{code:'PT422'});}
  const g=structuredClone(doc.planningInputs.geometry);delete g.type;assert.equal((await db.query('select xedo_private.risk_valid_target($1) v',[g])).rows[0].v,false);
 });
 await check('manual target on NoData records partial/unavailable coverage truthfully',async()=>{
  const fixtures=JSON.parse(await readFile(root+'/tests/fixtures/risk-edit.geojson','utf8'));
  const geometry=fixtures.features.find(f=>f.id==='manual-nodata-only').geometry;
  const d=structuredClone(doc);d.riskDraft.decisions=[];d.riskDraft.areas[0].origin='manual';d.riskDraft.areas[0].sourceCandidateIds=[];d.riskDraft.areas[0].rings=geometry.coordinates;d.planningInputs.geometry=geometry;
  const r=await rpc(actors.alice,'save',make(d));assert.equal(r.confirmedReview.coverageState,'partial_or_unavailable');assert.equal(r.confirmedReview.target.origin,'manual');
 });
 await check('whole-edge coverage rejects concave notch though target vertices are inside',async()=>{
  const poly=r=>({type:'Polygon',coordinates:[r.map(([x,y])=>[101+x*.001,12+y*.001])]});
  const g=poly([[0,0],[4,0],[4,4],[3,4],[3,1],[1,1],[1,4],[0,4],[0,0]]);
  const t=poly([[.5,.5],[3.5,.5],[3.5,3.5],[.5,3.5],[.5,.5]]);
  assert.equal((await db.query('select xedo_private.risk_geometry_covers($1,$2) v',[g,t])).rows[0].v,false);
 });
 await check('coverage holes cannot be covered, including target identical to the hole boundary',async()=>{
  const outer=[[101,12],[101.01,12],[101.01,12.01],[101,12.01],[101,12]];
  const hole=[[101.003,12.003],[101.007,12.003],[101.007,12.007],[101.003,12.007],[101.003,12.003]];
  const g={type:'Polygon',coordinates:[outer,hole]};
  for(const ring of [outer,hole])assert.equal((await db.query('select xedo_private.risk_geometry_covers($1,$2) v',[g,{type:'Polygon',coordinates:[ring]}])).rows[0].v,false);
 });
 await check('invalid/holes/121vertices/large378 targets rejected while raw preserved',async()=>{
  const big=catalog.candidates.features.find(f=>f.geometry.coordinates[0].length>121).geometry;
  const cases=[big,{type:'Polygon',coordinates:[doc.planningInputs.geometry.coordinates[0],doc.planningInputs.geometry.coordinates[0]]},{type:'MultiPolygon',coordinates:[doc.planningInputs.geometry.coordinates]}];
  for(const g of cases)assert.equal((await db.query('select xedo_private.risk_valid_target($1) v',[g])).rows[0].v,false);
  assert.equal((await rpc(actors.alice,'analysis',{resultId:catalog.resultId})).candidates.features.find(f=>f.geometry.coordinates[0].length>121).geometry.coordinates[0].length,big.coordinates[0].length);
 });
 await check('direct catalog writes and helper execution remain unavailable',async()=>{await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.exec("update xedo_private.prepared_analysis_catalog set payload='{}'");}),{code:'42501'});await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query('select xedo_private.risk_valid_target($1)',[doc.planningInputs.geometry]);}),{code:'42501'});});
}finally{await db.close();}


});
