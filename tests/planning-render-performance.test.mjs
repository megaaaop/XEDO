import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanningMapOverlay} from '../src/planning-map-overlay.js';
import {createInspectionTileReadiness,expectedInspectionTileKeys} from '../src/planning-image-readiness.js';
import {createXYZ} from 'ol/tilegrid.js';

const geometry = {type:'Polygon', coordinates:[[[101.22,12.62],[101.222,12.62],[101.222,12.621],[101.22,12.62]]]};
const plan = {status:'generated', waypoints:[{position:[101.22,12.62]},{position:[101.221,12.62]},{position:[101.222,12.621]}], segments:[{from:0,to:1},{from:1,to:2}]};

test('Unchanged mission renders retain vector features and reuse the role style', () => {
  const overlay = createPlanningMapOverlay();
  assert.equal(overlay.update({geometry,plan,home:[101.219,12.62]}),true);
  const initial = overlay.source.getFeatures(), revision = overlay.source.getRevision();
  for (let count=0;count<30;count++) assert.equal(overlay.update(structuredClone({geometry,plan,home:[101.219,12.62]})),false);
  assert.equal(overlay.source.getRevision(),revision);
  assert.deepEqual(overlay.source.getFeatures(),initial);
  const style = overlay.layer.getStyleFunction();
  for (const feature of initial) assert.equal(style(feature),style(feature),'Map renders reuse a style object instead of allocating one per feature/frame');
  const route = initial.find(feature=>feature.get('role')==='route');
  assert.equal(route.getGeometry().getType(),'MultiLineString');
  assert.equal(route.getGeometry().getCoordinates().length,2,'Disjoint route segments remain separate lines');
  overlay.update({geometry,plan,home:[101.218,12.62]});
  assert.ok(overlay.source.getRevision()>revision,'A changed launch point still updates the overlay');
});

test('Route display uses assessed sortie lines and never changes the inspection polygon', () => {
  const input = structuredClone({geometry,plan,sorties:[{waypoints:[{position:[101.219,12.62]},{position:[101.22,12.62]}]},{waypoints:[{position:[101.221,12.62]},{position:[101.219,12.62]}]}]});
  const original=structuredClone(input),overlay=createPlanningMapOverlay();
  overlay.update(input);
  const route=overlay.source.getFeatures().find(feature=>feature.get('role')==='route');
  assert.equal(route.getGeometry().getCoordinates().length,2);
  assert.deepEqual(input,original);
  overlay.update({});
  assert.equal(overlay.source.getFeatures().length,0,'Clearing a mission removes the old visible route');
});

test('Slow or failed context tiles do not block a valid loaded inspection image', () => {
  const tiles=createInspectionTileReadiness(),inspection={},context={};
  tiles.expect([inspection]);
  tiles.start(inspection,true);tiles.start(context,false);
  tiles.complete(context,false,true);
  assert.equal(tiles.getState().ready,false,'Visible context alone never approves the AOI');
  tiles.complete(inspection,true,true);
  assert.equal(tiles.getState().ready,true);
  assert.equal(tiles.fail(context,false),false);
  assert.equal(tiles.getState().ready,true,'Context failure remains non-blocking');
  assert.equal(tiles.fail(inspection,true),true);
  assert.equal(tiles.getState().ready,false,'Inspection failure revokes readiness');
});

test('Transparent or incomplete inspection tiles cannot be replaced by surrounding pixels', () => {
  const tiles=createInspectionTileReadiness(),first={},second={},context={};
  tiles.expect([first,second]);
  tiles.start(first,true);tiles.start(second,true);
  tiles.complete(first,true,true);tiles.complete(context,false,true);
  assert.equal(tiles.getState().ready,false,'Pending AOI data must complete');
  tiles.complete(second,true,false);
  assert.equal(tiles.getState().ready,true,'Visible AOI pixels are retained after all started AOI tiles complete');
  const transparent=createInspectionTileReadiness();
  transparent.expect([first]);
  transparent.start(first,true);transparent.complete(first,true,false);transparent.complete(context,false,true);
  assert.equal(transparent.getState().ready,false);
  assert.equal(transparent.getState().loaded,1);
});

test('Queued inspection tiles block approval before their tileloadstart events', () => {
  const tiles=createInspectionTileReadiness();
  tiles.expect(['2/0/0','2/1/0']);
  tiles.start('2/0/0',true);tiles.complete('2/0/0',true,true);
  assert.equal(tiles.getState().pending,1,'The not-yet-started tile remains required');
  assert.equal(tiles.getState().ready,false,'A loaded first tile cannot approve while another is queued');
  tiles.complete('2/9/9',false,true);
  assert.equal(tiles.getState().ready,false,'A context tile cannot satisfy the missing tile');
  tiles.start('2/1/0',true);tiles.complete('2/1/0',true,false);
  assert.equal(tiles.getState().ready,true);
  tiles.expect(['3/1/1','3/2/1']);
  assert.equal(tiles.getState().ready,false,'A changed zoom/view requires its own tile range');
  tiles.start('3/1/1',true);tiles.complete('3/1/1',true,true);
  assert.equal(tiles.getState().ready,false);
  tiles.fail('3/2/1',true);
  assert.equal(tiles.getState().ready,false,'Failure of a queued AOI tile can never briefly approve');
});

test('Expected AOI tiles are calculated from the visible grid, including rotated views', () => {
  const tileGrid=createXYZ({extent:[0,0,1024,1024],maxZoom:2,tileSize:256});
  const inputs={tileGrid,inspectionExtent:[0,0,1024,1024],viewExtent:[150,150,874,874],resolution:1,center:[512,512],size:[512,512]};
  const unrotated=expectedInspectionTileKeys(inputs),rotated=expectedInspectionTileKeys({...inputs,rotation:Math.PI/4});
  assert.equal(unrotated.length,16);
  assert.ok(rotated.length<unrotated.length,'Unrequested corners of a rotated viewport must not block review');
  assert.ok(!rotated.includes('2/0/0'));
  assert.ok(rotated.includes('2/1/1'));
  assert.deepEqual(expectedInspectionTileKeys({...inputs,inspectionExtent:[2000,2000,2100,2100]}),[]);
  assert.throws(()=>expectedInspectionTileKeys({...inputs,maxTiles:2}),/too many tiles/);
});
