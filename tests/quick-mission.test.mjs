import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from '../src/worker.js';
import {localEnvironment} from '../scripts/local-storage.mjs';
import {inspectionZone,inspectionRectangle,selectionMetrics,coveringScenes,recentDates,QuickMission} from '../src/mission-flow.js';

const concaveArea=()=>({type:'Polygon',coordinates:[[[101.19,12.595],[101.215,12.595],[101.215,12.6],[101.2,12.6],[101.2,12.61],[101.19,12.61],[101.19,12.595]]]});

test('Dragged rectangles preserve their dimensions in every direction and reject invalid extents',()=>{
  const extent=[101.19,12.595,101.215,12.605],geometry=inspectionRectangle(extent);
  for(const e of [extent,[extent[2],extent[3],extent[0],extent[1]],[extent[2],extent[1],extent[0],extent[3]],[extent[0],extent[3],extent[2],extent[1]]])assert.deepEqual(inspectionRectangle(e),geometry);
  const metrics=selectionMetrics(geometry);
  assert.deepEqual(metrics.bbox,extent);assert.ok(Math.abs(metrics.point[0]-101.2025)<1e-12);assert.ok(Math.abs(metrics.point[1]-12.6)<1e-12);
  assert.ok(metrics.widthM>2700&&metrics.widthM<2720);assert.ok(metrics.heightM>1110&&metrics.heightM<1115);assert.ok(metrics.areaM2>3e6&&metrics.areaM2<3.1e6);
  for(const e of [null,[],[1,2,3],[101,12,101,13],[101,12,102,12],[101,12,NaN,13],[101,12,Infinity,13],[181,12,182,13],[101,80,101.01,81],[179,12,-179,12.01],[0,0,2,2],[101,12,101.00000001,12.00000001]])assert.throws(()=>inspectionRectangle(e));
});

test('Selecting an exact area clones it, keeps invalid changes atomic, and resets the previous draft',()=>{
  const flow=new QuickMission(()=>{throw new Error('Selecting an area must not call the API');});
  const input=inspectionRectangle([101.19,12.595,101.215,12.605]),original=structuredClone(input);
  flow.selectArea(input);input.coordinates[0][0][0]=100;
  assert.deepEqual(flow.geometry,original);assert.deepEqual(flow.bbox,[101.19,12.595,101.215,12.605]);
  flow.scene={id:'previous-image'};flow.imageReady=true;flow.preparationStarted=true;flow.saved={incidentId:'old',surveyId:'old-survey'};flow.area={id:'old-area'};
  const prior=structuredClone({...flow,api:null});
  const crossed={type:'Polygon',coordinates:[[[101.19,12.595],[101.215,12.605],[101.215,12.595],[101.19,12.605],[101.19,12.595]]]};
  assert.throws(()=>flow.selectArea(crossed),/intersects itself/);assert.deepEqual({...flow,api:null},prior);
  assert.throws(()=>flow.selectArea({type:'Polygon',coordinates:[[[101,80],[101.01,80],[101.01,80.01],[101,80.01],[101,80]]]}),/80°/);assert.deepEqual({...flow,api:null},prior);
  flow.busy=true;assert.throws(()=>flow.selectArea(original),/Wait/);flow.busy=false;
  const previousIds=flow.ids;flow.selectArea(inspectionRectangle([101.195,12.595,101.22,12.605]));
  for(const key of ['area','incident','observation','survey'])assert.notEqual(flow.ids[key],previousIds[key]);
  assert.equal(flow.scene,null);assert.equal(flow.imageReady,false);assert.equal(flow.saved,null);assert.equal(flow.area,null);assert.equal(flow.preparationStarted,false);
});

test('Triangles and concave polygons retain every vertex in either winding order',()=>{
  const triangle={type:'Polygon',coordinates:[[[101.19,12.595],[101.215,12.595],[101.2,12.61],[101.19,12.595]]]};
  const smallTriangle={type:'Polygon',coordinates:[[[101.2,12.6],[101.200015,12.6],[101.2,12.600015],[101.2,12.6]]]};
  const flow=new QuickMission(()=>{throw new Error('Selecting a polygon must not call the API');});
  for(const original of [triangle,smallTriangle,concaveArea()]) {
    const reversed={type:'Polygon',coordinates:[[...original.coordinates[0]].reverse()]};
    for(const geometry of [original,reversed]) {
      flow.selectArea(geometry);assert.deepEqual(flow.geometry,geometry);
      assert.equal(flow.geometry.coordinates[0].length,original.coordinates[0].length);
      assert.ok(Math.abs(selectionMetrics(geometry).areaM2-selectionMetrics(original).areaM2)<0.001);
    }
  }
  const metrics=selectionMetrics(concaveArea());
  assert.deepEqual(metrics.bbox,[101.19,12.595,101.215,12.61]);
  assert.ok(metrics.areaM2<selectionMetrics(inspectionRectangle(metrics.bbox)).areaM2);
});

test('Invalid polygon replacements leave the selected shape, image, IDs and partial save intact',()=>{
  const flow=new QuickMission(()=>{throw new Error('Invalid polygon changes must not call the API');});
  flow.selectArea(concaveArea());flow.scene={id:'selected-image'};flow.imageReady=true;flow.preparationStarted=true;flow.area={id:flow.ids.area};
  const prior=structuredClone({...flow,api:null}),ring=concaveArea().coordinates[0];
  const invalid=[
    ['unclosed ring',{type:'Polygon',coordinates:[ring.slice(0,-1)]}],
    ['duplicate vertex',{type:'Polygon',coordinates:[[ring[0],ring[1],ring[1],...ring.slice(2)]]}],
    ['self intersection',{type:'Polygon',coordinates:[[[101.19,12.595],[101.215,12.61],[101.215,12.595],[101.19,12.61],[101.19,12.595]]]}],
    ['unsupported hole',{type:'Polygon',coordinates:[ring,inspectionRectangle([101.191,12.596,101.195,12.599]).coordinates[0]]}],
    ['unsupported MultiPolygon',{type:'MultiPolygon',coordinates:[[ring]]}],
    ['collinear diagonal',{type:'Polygon',coordinates:[[[101.19,12.595],[101.2,12.6],[101.21,12.605],[101.19,12.595]]]}]
  ];
  for(const [name,geometry] of invalid){assert.throws(()=>flow.selectArea(geometry),name);assert.deepEqual({...flow,api:null},prior,name);}
});

test('Scene coverage excludes gaps, holes and concave edge crossings even when every corner is inside',()=>{
  const geometry=inspectionRectangle([101,12.5,101.02,12.52]);
  const box=(w,s,e,n)=>inspectionRectangle([w,s,e,n]);
  const outer=box(100.99,12.49,101.03,12.53),hole=box(101.008,12.508,101.012,12.512);
  const disconnected={type:'MultiPolygon',coordinates:[box(100.99,12.49,101.005,12.53).coordinates,box(101.015,12.49,101.03,12.53).coordinates]};
  const concave={type:'Polygon',coordinates:[[[100.99,12.49],[101.03,12.49],[101.03,12.53],[101.012,12.53],[101.012,12.51],[101.008,12.51],[101.008,12.53],[100.99,12.53],[100.99,12.49]]]};
  const scene=(id,footprint)=>({id,visual:'https://example.invalid/image',acquiredAt:'2026-10-21T00:00:00Z',footprint});
  const scenes=[scene('covered',outer),scene('gaps',disconnected),scene('hole',{type:'Polygon',coordinates:[outer.coordinates[0],hole.coordinates[0]]}),scene('concave',concave),{...scene('preview',outer),localPreview:'/preview.png',previewFootprint:disconnected},{...scene('original-gap',disconnected),localPreview:'/preview.png',previewFootprint:outer}];
  assert.deepEqual(coveringScenes(scenes,geometry).map(s=>s.id),['covered']);
  const exact=scene('exact',geometry),multi=scene('multi',{type:'MultiPolygon',coordinates:[outer.coordinates,box(102,13,102.01,13.01).coordinates]});
  assert.deepEqual(coveringScenes([exact,multi],geometry).map(s=>s.id),['exact','multi']);
});

test('Concave coverage uses the polygon rather than rejecting a scene hole outside it but inside its bounds',()=>{
  const geometry=concaveArea(),outer=inspectionRectangle([101.18,12.59,101.22,12.615]);
  const outsideHole=inspectionRectangle([101.205,12.603,101.21,12.607]),insideHole=inspectionRectangle([101.192,12.602,101.196,12.606]);
  const scene=(id,hole)=>({id,visual:'https://example.invalid/image',acquiredAt:'2026-10-21T00:00:00Z',footprint:{type:'Polygon',coordinates:[outer.coordinates[0],hole.coordinates[0]]}});
  const outside=scene('hole-outside-polygon',outsideHole),inside=scene('hole-inside-polygon',insideHole);
  assert.deepEqual(coveringScenes([outside,inside],geometry).map(s=>s.id),['hole-outside-polygon']);
  assert.deepEqual(coveringScenes([outside],inspectionRectangle(selectionMetrics(geometry).bbox)),[]);
  const reversed={type:'Polygon',coordinates:[[...geometry.coordinates[0]].reverse()]};
  assert.deepEqual(coveringScenes([outside,inside],reversed).map(s=>s.id),['hole-outside-polygon']);
});

test('A marked point yields a bounded zone; image selection respects its displayed footprint',()=>{
  assert.throws(()=>inspectionZone([180,12]));assert.throws(()=>inspectionZone([101,NaN]));assert.throws(()=>inspectionZone([101,81]));assert.throws(()=>inspectionZone([101,12],800));
  const geometry=inspectionZone([101.2,12.6]);assert.equal(geometry.coordinates[0].length,5);
  const scene={id:'scene',visual:'https://example.invalid/image',footprint:inspectionZone([101.2,12.6],1000),acquiredAt:'2026-10-01T00:00:00Z'};
  const recent={...scene,id:'recent',acquiredAt:'2026-10-02T00:00:00Z'};
  const clipped={...recent,id:'clipped',localPreview:'/image.png',previewFootprint:inspectionZone([101.2,12.6],250)};
  assert.deepEqual(coveringScenes([clipped,scene,recent,{...recent,id:'missing',visual:null}],geometry).map(s=>s.id),['recent','scene']);
  assert.deepEqual(recentDates(new Date('2026-10-21T12:30:00Z')),{start:'2026-09-21',end:'2026-10-21'});
});

for(const [shape,selection] of [['non-square rectangle',()=>inspectionRectangle([101.19,12.595,101.215,12.605])],['concave polygon',concaveArea]]) {
test('A '+shape+' saves and restores its exact snapshot; interrupted saves resume without duplicate records',async()=>{
  const env=await localEnvironment(await mkdtemp(path.join(tmpdir(),'xedo-quick-')));let failObservation=false;
  const api=async(route,options={})=>{
    if(failObservation&&options.body&&JSON.parse(options.body).kind==='observation'){failObservation=false;throw new Error('test network interruption');}
    const response=await worker.fetch(new Request('http://localhost/api/'+route,options),env,{waitUntil:p=>p.catch(()=>{})});
    const value=await response.json();if(!response.ok)throw new Error(value.message||value.error);return value;
  };
  try{
    const state=await api('state'),scene=state.scenes.find(s=>s.localPreview),flow=new QuickMission(api);
    const selected=selection();flow.selectArea(selected);await assert.rejects(()=>flow.prepare(),/image is ready/);
    await flow.survey({archivedScene:scene});await assert.rejects(()=>flow.prepare(),/image is ready/);flow.imageReady=true;
    failObservation=true;await assert.rejects(()=>flow.prepare('test operator'),/network interruption/);assert.equal(flow.busy,false);
    await assert.rejects(()=>flow.survey({archivedScene:scene}),/Resume saving/);
    assert.equal(flow.scene.id,scene.id);
    const saved=await flow.prepare('test operator');assert.deepEqual(await flow.prepare(),saved);
    const after=await api('state');assert.equal(after.records.filter(r=>r.kind==='incident').length,1);assert.equal(after.records.filter(r=>r.kind==='observation').length,1);assert.equal(after.records.filter(r=>r.kind==='survey').length,1);
    const incident=after.records.find(r=>r.id===saved.incidentId),observation=after.records.find(r=>r.id===flow.ids.observation);
    assert.deepEqual(after.records.find(r=>r.id===incident.areaId).geometry,selected);assert.deepEqual(observation.geometry,selected);
    assert.equal(incident.status,'suspicious');assert.equal(observation.status,'draft');assert.match(observation.note,/Not a detected or confirmed oil boundary/);
    const exportFile=await worker.fetch(new Request('http://localhost/api/survey-export/'+saved.surveyId),env,{}),exported=await exportFile.json();assert.deepEqual(exported.features[0].geometry,flow.geometry);assert.equal(exported.features[0].properties.scene_id,scene.id);
    const original=structuredClone(flow.geometry),ring=original.coordinates[0];
    const edited={type:'Polygon',coordinates:[[ring[0],ring[1],ring[2],ring[0]]]};
    await api('records/'+observation.id,{method:'PATCH',body:JSON.stringify({revision:observation.revision,geometry:edited,reviewer:'test operator',reason:'Advanced revision after the original survey was saved'})});
    await api('records',{method:'POST',body:JSON.stringify({id:'SUR_later_revision',kind:'survey',incidentId:incident.id,title:'Later survey',note:'Separate request from the edited observation'})});
    const changed=await api('state'),restored=new QuickMission(()=>{throw new Error('Restore must not call the catalogue or write records');});
    restored.restore(saved.incidentId,changed);
    assert.deepEqual(restored.geometry,original);assert.deepEqual(restored.point,selectionMetrics(selected).point);assert.deepEqual(selectionMetrics(restored.geometry),selectionMetrics(selected));
    assert.equal(restored.scene.id,scene.id);assert.equal(restored.saved.surveyId,saved.surveyId);assert.equal(restored.ids.observation,observation.id);
    await assert.rejects(()=>restored.survey(),/saved/);
    const tampered=structuredClone(changed);tampered.records.find(r=>r.kind==='observation'&&r.id===observation.id).sceneId='unrelated-new-scene';
    restored.restore(saved.incidentId,tampered,saved.surveyId);assert.equal(restored.scene.id,scene.id);
    assert.throws(()=>restored.restore(saved.incidentId,changed,'SUR_does_not_exist'),/snapshot could not be restored/);
    assert.deepEqual((await api('survey-export/'+saved.surveyId)).features[0].geometry,original);
    const health=await api('v1/health');assert.equal(health.releaseControl,false);assert.equal((await api('state')).records.filter(r=>r.kind==='plan').length,0);
    const old=flow.ids.incident;flow.mark([101.21,12.6]);assert.notEqual(flow.ids.incident,old);assert.equal(flow.saved,null);assert.equal(flow.imageReady,false);
    await assert.rejects(()=>flow.survey({archivedScene:{...scene,previewFootprint:inspectionZone([100,10])}}),/does not cover/);assert.equal(flow.scene,null);assert.equal(flow.imageReady,false);
  }finally{env.close();}
});
}

test('Legacy point missions restore their original square without changing its geometry',()=>{
  const geometry=inspectionZone([101.2,12.6]),scene={id:'legacy-scene',localPreview:'/stored-image.png'};
  const state={records:[{kind:'incident',id:'INC_legacy',areaId:'AREA_legacy'},{kind:'survey',id:'SUR_legacy',incidentId:'INC_legacy',boundarySnapshot:{features:[{geometry,properties:{observation_id:'OBS_legacy',scene_id:scene.id,display_asset_kind:'cached_preview'}}]}}],scenes:[scene]};
  const flow=new QuickMission(()=>{throw new Error('Restore must not call the API');});
  flow.restore('INC_legacy',state);assert.deepEqual(flow.geometry,geometry);assert.deepEqual(flow.point,[101.2,12.6]);assert.equal(flow.halfWidth,500);assert.equal(flow.scene.localPreview,scene.localPreview);
  geometry.coordinates[0][0][0]=100;assert.notEqual(flow.geometry.coordinates[0][0][0],100);
});

test('A failed catalogue request clears the old image and cannot prepare a request',async()=>{
  const scene={id:'test-scene',visual:'https://example.invalid/image',footprint:inspectionZone([101.2,12.6],1000),acquiredAt:'2026-10-19T03:55:00Z'};
  let offline=false;
  const flow=new QuickMission(async(route,options)=>{
    if(route==='records')return JSON.parse(options.body);
    if(offline)throw new Error('catalogue unavailable');
    return {scenes:[scene]};
  });
  flow.mark([101.2,12.6]);await flow.survey();flow.imageReady=true;
  offline=true;await assert.rejects(()=>flow.survey(),/catalogue unavailable/);
  assert.equal(flow.scene,null);assert.equal(flow.imageReady,false);assert.equal(flow.busy,false);
  await assert.rejects(()=>flow.prepare(),/image is ready/);
});
