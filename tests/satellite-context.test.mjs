import test from 'node:test';
import assert from 'node:assert/strict';
import {satelliteDisplayContext,SATELLITE_CONTEXT_BUFFER_M} from '../src/satellite-context.js';

const geometry={type:'Polygon',coordinates:[[[101.19,12.59],[101.2,12.59],[101.2,12.6],[101.195,12.595],[101.19,12.6],[101.19,12.59]]]};
const R=6371008.8,rad=Math.PI/180;
const distance=(a,b)=>{const dy=(b[1]-a[1])*rad,dx=(b[0]-a[0])*rad,q=Math.sin(dy/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dx/2)**2;return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));};

test('Display context pads each side of a Thailand inspection box by approximately 1 km without changing its polygon',()=>{
  const before=structuredClone(geometry),context=satelliteDisplayContext(geometry),ring=context.coordinates[0];
  assert.equal(SATELLITE_CONTEXT_BUFFER_M,1000);assert.deepEqual(geometry,before);assert.equal(ring.length,5);assert.deepEqual(ring[0],ring[4]);
  const [west,south]=ring[0],[east,north]=ring[2];
  for(const value of [distance([101.19,12.595],[west,12.595]),distance([101.2,12.595],[east,12.595]),distance([101.195,12.59],[101.195,south]),distance([101.195,12.6],[101.195,north])])assert.ok(value>=999.9&&value<1001,`Expected about 1000 m, got ${value}`);
  assert.notDeepEqual(context,geometry,'Display bounds do not replace a concave inspection boundary');
});

test('Display context clamps global service boundaries without wrapping around the date line',()=>{
  const edge={type:'Polygon',coordinates:[[[179.999,79.999],[180,79.999],[180,80],[179.999,80],[179.999,79.999]]]};
  const context=satelliteDisplayContext(edge),ring=context.coordinates[0];
  assert.equal(ring[2][0],180);assert.equal(ring[2][1],80);assert.ok(ring.every(([lon,lat])=>lon>=-180&&lon<=180&&lat>=-80&&lat<=80));
  assert.throws(()=>satelliteDisplayContext({type:'Polygon',coordinates:[[[179,12],[-179,12],[-179,12.0001],[179,12.0001],[179,12]]]}),/date line/);
  assert.throws(()=>satelliteDisplayContext({type:'Point',coordinates:[101,12]}),/Polygon/);
});
