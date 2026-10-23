import test from 'node:test';
import assert from 'node:assert/strict';
import {basemapMinZoom,basemapViewport,basemapContains,bindGEEBasemap} from '../src/planning-basemap-view.js';

test('Basemap sizing covers the entire padded screen within the server area at desktop and phone sizes',()=>{
  for(const size of [[1024,620],[340,440],[2000,1000]]){
    const resolution=40075016.68557849/(256*2**basemapMinZoom(size));
    const extent=[-size[0]*resolution/2,-size[1]*resolution/2,size[0]*resolution/2,size[1]*resolution/2],before=structuredClone(extent);
    const {geometry,bbox}=basemapViewport(extent);
    assert.deepEqual(extent,before);assert.equal(geometry.coordinates[0].length,5);
    assert.ok((bbox[2]-bbox[0])*111320<90101);assert.ok((bbox[3]-bbox[1])*111320<90101);
    const visible=basemapViewport(extent,{padding:1});assert.equal(basemapContains(bbox,visible.bbox),true);
    assert.equal(basemapContains(visible.bbox,bbox),false);
  }
});

test('Basemap requests reject oversized, nonfinite, date-line and polar viewports before a request',()=>{
  for(const extent of [[0,0,100000,100000],[0,0,NaN,10],[10,0,0,10],[20030000,0,20040000,1000],[0,19000000,1000,19001000]])assert.throws(()=>basemapViewport(extent));
  for(const size of [null,[0,440],[-1,440],[Infinity,440]])assert.throws(()=>basemapMinZoom(size));
  assert.equal(basemapContains([0,0,1,1],[0,0,1,1]),true);
  assert.equal(basemapContains([0,0,1,1],[0,0,2,1]),false);
  assert.equal(basemapContains([0,0,1,1],null),false);
});

const now=Date.parse('2026-10-23T00:00:00Z');
const geometry=basemapViewport([11200000,1400000,11240000,1430000]).geometry;
const manifest=()=>({kind:'gee_basemap',provider:'gee',collection:'COPERNICUS/S2_SR_HARMONIZED',renderMode:'pixels',geometry:structuredClone(geometry),sessionId:'server_issued_session_123456',tileUrl:'/api/v1/gee/imagery/tiles/server_issued_session_123456/{z}/{x}/{y}',expiresAt:'2026-10-23T00:30:00Z',start:'2026-09-24',end:'2026-10-23',imageCount:12,acquiredFrom:'2026-09-25T03:00:00Z',acquiredTo:'2026-10-22T03:00:00Z'});

test('A background composite binds only its exact display area, server session, and honest acquisition range',()=>{
  const input=manifest(),before=structuredClone(input),result=bindGEEBasemap(input,geometry,{now});
  assert.deepEqual(input,before);assert.deepEqual(result,input);
  result.geometry.coordinates[0][0][0]=0;assert.deepEqual(input,before);
  for(const change of [
    m=>m.kind='scene',m=>m.provider='other',m=>m.renderMode='map',m=>m.collection='other',m=>m.geometry.coordinates[0][0][0]=0,
    m=>m.sessionId='../outside',m=>m.tileUrl='https://untrusted.invalid/{z}/{x}/{y}',m=>m.tileUrl+='?key=private',m=>m.expiresAt='2026-10-22T23:00:00Z',m=>m.expiresAt='2026-10-23T02:00:00Z',
    m=>m.imageCount=0,m=>m.imageCount=32,m=>m.acquiredFrom='2026-10-25T00:00:00Z',m=>m.acquiredTo='2026-10-24T00:00:00Z',m=>m.acquiredFrom='unknown',m=>m.start='2026-02-31',m=>m.start='2026-01-01',
  ]){const invalid=manifest();change(invalid);assert.throws(()=>bindGEEBasemap(invalid,geometry,{now}));}
});
