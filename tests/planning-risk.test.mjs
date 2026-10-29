import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateRiskTarget,geometryEquals,coversGeometry,classifyCoverage,validateRiskCoverage} from '../src/planning-risk-geometry.js';
import {createRiskState} from '../src/planning-risk-state.js';

const catalog=JSON.parse(await readFile(new URL('../db/prepared-sar.json',import.meta.url),'utf8'));
const raw=catalog.candidates,coverage=catalog.coverage,fixtures=JSON.parse(await readFile(new URL('fixtures/risk-edit.geojson',import.meta.url),'utf8'));
const fixture=id=>fixtures.features.find(f=>f.id===id||f.properties.fixtureId===id).geometry;
const polygon=points=>({type:'Polygon',coordinates:[[...points,points[0]]]});
const box=(a,b,c,d)=>polygon([[a,b],[c,b],[c,d],[a,d]]);
const collection=(...geometries)=>({type:'FeatureCollection',features:geometries.map(geometry=>({type:'Feature',properties:{role:'valid_data'},geometry}))});
const idFactory=()=>{let n=0;return ()=>`00000000-0000-4000-8000-${(++n).toString(16).padStart(12,'0')}`;};
const make=()=>createRiskState({analysis:{resultId:'historical-fixture',candidates:raw},idFactory:idFactory()});

test('Coverage tests entire polygon interior, holes and concavity, including boundary contact',()=>{
  const outer=box(0,0,10,10),inner=box(2,2,8,8);
  assert.ok(coversGeometry(outer,outer));assert.ok(coversGeometry(outer,inner));
  const withHole={type:'Polygon',coordinates:[outer.coordinates[0],box(4,4,6,6).coordinates[0]]};
  assert.equal(coversGeometry(withHole,inner),false);assert.equal(classifyCoverage(inner,collection(withHole)),'partial');
  assert.equal(classifyCoverage(box(4.1,4.1,5.9,5.9),collection(withHole)),'none');
  const concave=polygon([[0,0],[4,0],[4,4],[3,4],[3,1],[1,1],[1,4],[0,4]]),crossing=box(.5,2,3.5,3);
  assert.equal(coversGeometry(concave,crossing),false);assert.equal(classifyCoverage(crossing,collection(concave)),'partial');
  assert.equal(coversGeometry(concave,box(0,0,1,3)),true);
});

test('Coverage supports disjoint and joined MultiPolygons and ignores NoData features',()=>{
  const separated={type:'MultiPolygon',coordinates:[box(0,0,1,1).coordinates,box(2,0,3,1).coordinates]};
  assert.equal(coversGeometry(separated,box(.5,.2,2.5,.8)),false);
  const joined={type:'MultiPolygon',coordinates:[box(0,0,1,1).coordinates,box(1,0,2,1).coordinates]};
  assert.equal(coversGeometry(joined,box(.5,.2,1.5,.8)),true);
  const c=collection(box(0,0,1,1));c.features.push({type:'Feature',properties:{role:'nodata_within_output_grid'},geometry:box(1,0,2,1)});
  assert.equal(classifyCoverage(box(1.1,.2,1.9,.8),c),'none');
  assert.equal(classifyCoverage(box(.5,.2,1.5,.8),c),'partial');
});

test('Real raster-derived WGS84 coverage never promotes NoData or outside-footprint fixtures to covered',()=>{
  for(const id of ['candidate-small-original','candidate-small-vertex-edit','manual-valid-outside-candidates','large-explicit-redraw-draft'])assert.equal(classifyCoverage(fixture(id),coverage),'covered',id);
  assert.equal(classifyCoverage(fixture('manual-valid-nodata-crossing'),coverage),'partial');
  // This source-grid NoData-only rectangle has a ~1.74e-7 overlap fraction from
  // independently serialized straight WGS84 projection chords. Conservatively
  // retain partial rather than inventing full valid coverage or a percentage.
  assert.equal(classifyCoverage(fixture('manual-nodata-only'),coverage),'partial');
  // This fixture deliberately crosses the footprint: it is not wholly outside.
  assert.equal(classifyCoverage(fixture('manual-outside-footprint'),coverage),'partial');
});

test('Planning confirmation geometry preserves limits and rejects invalid sketches',()=>{
  for(const id of ['candidate-small-original','target-3-vertices','target-120-vertices'])assert.ok(validateRiskTarget(fixture(id))>0,id);
  for(const id of ['target-121-vertices','candidate-large-raw-378','target-with-hole','target-multipolygon','invalid-self-intersection','invalid-duplicate-degenerate','invalid-zero-area'])assert.throws(()=>validateRiskTarget(fixture(id)),undefined,id);
  assert.throws(()=>validateRiskCoverage(box(0,0,.001,.001),{searchGeometry:box(.0001,.0001,.0009,.0009)}),/leaves the current search/);
  assert.throws(()=>validateRiskCoverage(box(0,0,.001,.001),{imageGeometry:box(.0001,.0001,.0009,.0009)}),/reviewed satellite image/);
});

test('Geometry identity accepts ring rotation/reversal without changing source coordinates',()=>{
  const a=fixture('candidate-small-original'),copy=structuredClone(a),r=copy.coordinates[0];
  r.pop();r.reverse();r.push([...r[0]]);assert.ok(geometryEquals(a,copy));
  const moved=structuredClone(a);moved.coordinates[0][0][0]+=.001;assert.equal(geometryEquals(a,moved),false);
});

test('Risk draft accept/edit/undo/redo/reject preserves immutable AI and exact decision lineage',()=>{
  const s=make(),rawBefore=JSON.stringify(s.getAnalysis());
  s.accept('candidate-00001');const area=s.getSelected();assert.equal(area.origin,'candidate');
  s.update(area.id,fixture('candidate-small-vertex-edit'));assert.equal(s.getSelected().origin,'edited_candidate');
  assert.deepEqual(s.getDraft().decisions,[{candidateId:'candidate-00001',action:'edit',areaId:area.id}]);
  s.undo();assert.equal(s.getSelected().origin,'candidate');s.redo();assert.equal(s.getSelected().origin,'edited_candidate');
  s.reject('candidate-00001');assert.equal(s.getSelected(),null);assert.equal(s.getDraft().areas.length,0);assert.deepEqual(s.getDraft().decisions,[{candidateId:'candidate-00001',action:'reject',areaId:null}]);
  assert.equal(JSON.stringify(s.getAnalysis()),rawBefore);assert.throws(()=>s.getAnalysis().candidates.features.pop(),TypeError);
  s.undo();assert.equal(s.getSelected().origin,'edited_candidate');
});

test('Edit transaction Cancel restores the exact draft; Commit creates one Undo item',()=>{
  const s=make();s.accept('candidate-00001');const before=s.getDraft(),id=before.selectedAreaId;
  s.begin();s.update(id,fixture('candidate-small-vertex-edit'));s.update(id,fixture('candidate-small-moved'));assert.equal(s.snapshot().editing,true);assert.throws(()=>s.undo(),/Finish or cancel/);s.cancel();assert.deepEqual(s.getDraft(),before);
  s.begin();s.update(id,fixture('candidate-small-vertex-edit'));s.update(id,fixture('candidate-small-moved'));s.commit();const after=s.getDraft();s.undo();assert.deepEqual(s.getDraft(),before);s.redo();assert.deepEqual(s.getDraft(),after);
});

test('Manual and temporarily invalid drafts save and restore without becoming confirmed targets',()=>{
  const s=make();s.add(fixture('manual-valid-outside-candidates'));assert.equal(s.getSelected().origin,'manual');assert.deepEqual(s.getSelected().sourceCandidateIds,[]);
  const id=s.getSelected().id;s.update(id,{type:'Polygon',coordinates:[[[101.2,12.5],[101.201,12.5]]]});assert.throws(()=>validateRiskTarget(s.getSelected().geometry));
  const draft=s.getDraft(),second=make();second.restore(draft);assert.deepEqual(second.getDraft(),draft);assert.equal(second.snapshot().canUndo,false);
  const corrupted=structuredClone(draft);corrupted.areas[0].owner='forged';assert.throws(()=>second.restore(corrupted));assert.deepEqual(second.getDraft(),draft);
});

test('Detailed raw 378-vertex candidate remains a draft and requires explicit redraw before target validation',()=>{
  const s=make();s.accept('candidate-00012');assert.equal(s.getSelected().rings[0].length-1,378);assert.throws(()=>validateRiskTarget(s.getSelected().geometry),/120/);
  s.add(fixture('large-explicit-redraw-draft'));assert.ok(validateRiskTarget(s.getSelected().geometry)>0);assert.equal(s.getSelected().origin,'manual');
  assert.equal(s.getAnalysis().candidates.features.find(f=>f.id==='candidate-00012').geometry.coordinates[0].length-1,378);
});

test('Reject-all retains fourteen source candidates and no target; reset and limit failures are atomic',()=>{
  const s=make();for(const feature of raw.features)s.reject(feature.id);assert.equal(s.getDraft().decisions.length,14);assert.equal(s.getDraft().areas.length,0);assert.equal(s.getSelected(),null);assert.equal(s.getAnalysis().candidates.features.length,14);
  s.setBaseReviewRevision(3);s.reset();assert.equal(s.getDraft().baseReviewRevision,3);assert.equal(s.getDraft().decisions.length,0);s.undo();assert.equal(s.getDraft().decisions.length,14);assert.equal(s.getDraft().baseReviewRevision,3);s.undo();assert.equal(s.getDraft().baseReviewRevision,3);
  const many=make(),geometry=fixture('manual-valid-outside-candidates');for(let i=0;i<128;i++)many.add(geometry);const before=many.getDraft();assert.throws(()=>many.add(geometry),/128/);assert.deepEqual(many.getDraft(),before);assert.throws(()=>many.accept('foreign-candidate'));assert.deepEqual(many.getDraft(),before);
});
