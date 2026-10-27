import test from 'node:test';
import assert from 'node:assert/strict';
import proj4 from 'proj4';
import {groundGeometry, groundTextureMesh, drawGroundTexture} from '../src/deployment-ground.js';
import {createDeployment3D} from '../src/deployment-3d.js';
import {buildDeploymentPreview} from '../src/deployment-plan.js';
import {validateGeometry} from '../src/domain.js';

const box = {type:'Polygon', coordinates:[[[101.2,12.6],[101.204,12.6],[101.204,12.604],[101.2,12.604],[101.2,12.6]]]};
const geographic = local => [101.2 + local[0] / 110000, 12.6 + local[1] / 111000];
function extentFor(geometry) {
  const points = geometry.coordinates[0].map(point => proj4('EPSG:4326','EPSG:3857',point));
  return [Math.min(...points.map(p=>p[0]))-10, Math.min(...points.map(p=>p[1]))-10, Math.max(...points.map(p=>p[0]))+10, Math.max(...points.map(p=>p[1]))+10];
}
function harness() {
  const calls = [], attributes = new Map(), listeners = new Map();
  const context = new Proxy({}, {
    get(target,key) {
      if(key==='createLinearGradient') return ()=>({addColorStop(){}});
      if(key==='measureText') return text=>({width:text.length*6});
      if(key in target) return target[key];
      return (...args)=>calls.push([key,...args]);
    },
    set(target,key,value){ target[key]=value; return true; }
  });
  const canvas = {
    style:{touchAction:'pan-y',cursor:'auto'},width:0,height:0,
    getContext:()=>context, getBoundingClientRect:()=>({width:900,height:500}),
    getAttribute:key=>attributes.get(key)??null, setAttribute:(key,value)=>attributes.set(key,String(value)), removeAttribute:key=>attributes.delete(key),
    addEventListener:(key,listener)=>listeners.set(key,listener),removeEventListener:key=>listeners.delete(key),focus(){},
  };
  const renderer=createDeployment3D(canvas);
  const plan=buildDeploymentPreview({geometry:structuredClone(box)});
  renderer.setData({plan});
  return {calls,attributes,listeners,canvas,renderer,plan,context};
}
const lastRoute = calls => {
  // Flight paths are identical regardless of floor mode: collect all two-point strokes.
  let path=[];const strokes=[];
  for(const [name,...args] of calls) {
    if(name==='beginPath') path=[];
    if(name==='moveTo'||name==='lineTo') path.push([name,...args]);
    if(name==='stroke'&&path.length===2) strokes.push(path);
  }
  return strokes;
};

test('Ground geometry samples each projected edge and keeps the existing rounded local floor',()=>{
  const geometry=groundGeometry([-200,-100,400,500], geographic);
  assert.equal(geometry.coordinates[0].length,65);
  assert(validateGeometry(geometry)>0);
  assert.deepEqual(geometry.coordinates[0][0],geographic([-200,-100]));
  assert.deepEqual(geometry.coordinates[0][16],geographic([400,-100]));
  assert.deepEqual(geometry.coordinates[0][32],geographic([400,500]));
  assert.deepEqual(geometry.coordinates[0][48],geographic([-200,500]));
  assert.deepEqual(geometry.coordinates[0][64],geometry.coordinates[0][0]);
  assert.equal(groundGeometry([0,0,0,100],geographic),null);
  assert.equal(groundGeometry([0,0,100,100],()=>[181,0]),null);
});

test('Texture mesh retains geographic alignment and north-to-south image rows with a bounded vertex budget',()=>{
  const bounds=[-200,-100,400,500],extent=extentFor(groundGeometry(bounds,geographic));
  let transforms=0;
  const mesh=groundTextureMesh(bounds,p=>{transforms++;return geographic(p);},extent,1024,1024);
  assert.equal(mesh.vertices.length,17*17);assert.equal(mesh.triangles.length,16*16*2);assert.equal(transforms,17*17);
  const sw=mesh.vertices[0],se=mesh.vertices[16],nw=mesh.vertices[16*17];
  assert(sw.source[0]<se.source[0],'east moves right in the texture');
  assert(sw.source[1]>nw.source[1],'north moves up in the texture');
  const p=proj4('EPSG:4326','EPSG:3857',geographic(sw.local));
  assert(Math.abs(sw.source[0]-(p[0]-extent[0])/(extent[2]-extent[0])*1024)<1e-9);
  assert.equal(groundTextureMesh(bounds,geographic,[0,0,1,1],1024,1024),null,'a tiny AOI texture cannot be stretched over another ground');
  const limited=groundTextureMesh(bounds,geographic,extent,1024,1024,10000);assert.equal(limited.triangles.length,24*24*2);
});

test('Triangle drawing maps texture source points to the perspective points without a map projection per draw',()=>{
  const calls=[];const context={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(...m){calls.push(m);},drawImage(){}};
  const mesh={vertices:[{local:[0,0],source:[0,0]},{local:[10,0],source:[100,0]},{local:[0,20],source:[0,200]}],triangles:[[0,1,2]]};
  assert.equal(drawGroundTexture(context,{width:256,height:256},mesh,(x,y)=>[x*2+30,y*3+40,0]),true);
  const [a,b,c,d,e,f]=calls[0];
  assert.equal(a,.2);assert.equal(b,0);assert.equal(c,0);assert.equal(d,.3);assert.equal(e,30);assert.equal(f,40);
  assert.equal(drawGroundTexture(context,null,mesh,()=>[0,0]),false);
});

test('Renderer inverts the original UTM projection, preserves route camera across modes and keeps canvas size',()=>{
  const h=harness();
  try {
    const geometry=h.renderer.getGroundGeometry();assert(validateGeometry(geometry)>0);
    const local=geometry.coordinates[0].map(p=>{const projected=proj4('EPSG:4326',h.plan.projection.definition,p);return [projected[0]-h.plan.projection.origin[0],projected[1]-h.plan.projection.origin[1]];});
    const rounded=value=>Math.round(value*1e5)/1e5;
    assert(local[0].every(value=>Math.abs(value/100-Math.round(value/100))<1e-7),'floor retains the existing100m rounded grid');
    assert(rounded(local[16][0])>rounded(local[0][0]));assert(rounded(local[32][1])>rounded(local[16][1]));
    const texture={image:{width:1024,height:1024},extent:extentFor(geometry)};
    assert.equal(h.renderer.setGroundTexture(texture),true);
    h.calls.length=0;h.renderer.setGroundMode('diagram');const diagramRoute=lastRoute(h.calls).slice(-h.plan.waypoints.length-7);
    const originalSize=[h.canvas.width,h.canvas.height];
    h.calls.length=0;h.renderer.setGroundMode('satellite');const satelliteRoute=lastRoute(h.calls).slice(-h.plan.waypoints.length-7);
    assert.deepEqual(satelliteRoute,diagramRoute,'floor mode does not move route or camera');
    assert.deepEqual([h.canvas.width,h.canvas.height],originalSize);assert.equal(h.calls.filter(([name])=>name==='drawImage').length,512);
    assert.match(h.attributes.get('aria-label'),/georeferenced satellite imagery on a flat plane/);
    h.listeners.get('keydown')({key:'ArrowRight',preventDefault(){}});
    h.calls.length=0;h.renderer.setGroundMode('diagram');const rotated=lastRoute(h.calls).slice(-h.plan.waypoints.length-7);
    assert.notDeepEqual(rotated,diagramRoute);
    h.calls.length=0;h.renderer.setGroundMode('satellite');assert.deepEqual(lastRoute(h.calls).slice(-h.plan.waypoints.length-7),rotated,'switching does not reset orbit');
  } finally {h.renderer.destroy();}
});

test('Renderer rejects invalid texture/modes, falls back for missing coverage and restores the canvas on disposal',()=>{
  const h=harness();
  assert.throws(()=>h.renderer.setGroundMode('unknown'),/diagram or satellite/);
  assert.throws(()=>h.renderer.setGroundTexture({image:{width:0,height:1},extent:[0,0,1,1]}),/georeferenced/);
  assert.equal(h.renderer.setGroundTexture({image:{width:1024,height:1024},extent:[0,0,1,1]}),false);
  h.renderer.setGroundMode('satellite');assert.match(h.attributes.get('aria-label'),/diagram grid/);
  assert.equal(h.renderer.setGroundTexture(null),false);
  h.renderer.setData({});assert.equal(h.renderer.getGroundGeometry(),null);
  h.renderer.destroy();assert.equal(h.listeners.size,0);assert.deepEqual(h.canvas.style,{touchAction:'pan-y',cursor:'auto'});
  assert.equal(h.renderer.setGroundTexture(null),false);assert.equal(h.renderer.getGroundGeometry(),null);
});

test('Renderer fallback projection uses the same longitude scale as the original local coordinates',()=>{
  const h=harness();
  try {
    const origin=[101.2,12.6],scale=Math.cos(origin[1]*Math.PI/180)*111319.490793;
    const plan={target:box,localTarget:{type:'Polygon',coordinates:[[[0,0],[100,0],[100,100],[0,100],[0,0]]]},waypoints:[{position:origin,altitudeM:50}],localWaypoints:[[0,0]]};
    h.renderer.setData({plan});const ring=h.renderer.getGroundGeometry().coordinates[0];
    assert(Math.abs(ring[16][0]-(origin[0]+100/scale))<1e-12);assert(Math.abs(ring[32][1]-(origin[1]+100/111319.490793))<1e-12);
  } finally {h.renderer.destroy();}
});
