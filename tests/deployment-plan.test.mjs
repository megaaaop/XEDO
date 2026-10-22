import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDeploymentPreview} from '../src/deployment-plan.js';

const polygon=ring=>({type:'Polygon',coordinates:[ring]});
const box=()=>polygon([[101.2,12.6],[101.204,12.6],[101.204,12.604],[101.2,12.604],[101.2,12.6]]);
const notch=()=>polygon([[101.2,12.6],[101.206,12.6],[101.206,12.603],[101.204,12.603],[101.204,12.601],[101.202,12.601],[101.202,12.603],[101.2,12.603],[101.2,12.6]]);
// Independent sample check of the complete drawn route, including connectors.
function inside(point,ring){
  let crossings=0;
  for(let i=0;i<ring.length-1;i++){
    const a=ring[i],b=ring[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const projected=((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length);
    if(projected>=-1e-8&&projected<=1+1e-8&&Math.abs(dx*(point[1]-a[1])-dy*(point[0]-a[0]))/length<1e-4)return true;
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<a[0]+(point[1]-a[1])*dx/dy)crossings++;
  }
  return crossings%2===1;
}
function assertInterior(plan){
  assert.equal(plan.status,'generated',plan.message);
  for(const segment of plan.segments){
    const a=plan.localWaypoints[segment.from],b=plan.localWaypoints[segment.to];
    for(let step=0;step<=80;step++){const t=step/80;assert(inside([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],plan.localTarget.coordinates[0]),'Segment crosses the exterior: '+JSON.stringify(segment));}
  }
}

test('Preview is deterministic, retains the exact target and labels its assumed home and estimates',()=>{
  const geometry=box(),before=structuredClone(geometry),plan=buildDeploymentPreview({geometry});
  assert.deepEqual(plan,buildDeploymentPreview({geometry}));assert.deepEqual(geometry,before);assert.deepEqual(plan.target,before);
  assert.equal(plan.schema,'xedo-deployment-preview/1');assertInterior(plan);
  assert.deepEqual(plan.home.position,geometry.coordinates[0][0]);assert.match(plan.home.assumption,/preview only/);
  assert.deepEqual(plan.waypoints[0].position,plan.home.position);assert.deepEqual(plan.waypoints.at(-1).position,plan.home.position);
  assert.deepEqual(plan.localWaypoints[0],[0,0]);assert.match(plan.projection.calculationCrs,/EPSG:32647/);
  assert.equal(plan.localTarget.coordinates[0].length,geometry.coordinates[0].length);
  assert(plan.waypoints.every(p=>p.dispenser==='off'&&p.altitudeReference==='AGL'));
  assert.equal(plan.hardwareControl,false);assert.equal(plan.releaseControl,false);
  assert.equal(plan.estimates.durationS,plan.estimates.distanceM/5);assert(plan.estimates.areaM2>0);
  assert.match(plan.warnings.join(' '),/battery limits.*have not been assessed/);
});

test('Concave notch connectors go around the exterior gap and preserve both winding orders',()=>{
  for(const geometry of [notch(),polygon(notch().coordinates[0].toReversed()),polygon([[101.2,12.6],[101.206,12.6],[101.206,12.602],[101.202,12.602],[101.202,12.606],[101.2,12.606],[101.2,12.6]])]){
    const plan=buildDeploymentPreview({geometry,spacingM:40});assertInterior(plan);assert.deepEqual(plan.target,geometry);
    assert(plan.segments.some(s=>s.purpose==='survey'));assert(plan.segments.some(s=>s.purpose==='transit'));assert(plan.segments.some(s=>s.purpose==='return'));
  }
  const plan=buildDeploymentPreview({geometry:notch(),spacingM:40}),reflex=notch().coordinates[0].slice(4,6);
  assert(plan.waypoints.some(p=>p.purpose==='transit'&&reflex.some(vertex=>JSON.stringify(vertex)===JSON.stringify(p.position))),'Notch traversal must visit an interior boundary corner rather than bridge the gap.');
});

test('Preview rejects invalid units and safely blocks route/geometry budgets',()=>{
  for(const [name,values] of [['altitudeM',[null,NaN,Infinity,4,501]],['spacingM',[null,NaN,Infinity,4,1001]],['speedMps',[null,NaN,Infinity,0,31]]])for(const value of values)assert.throws(()=>buildDeploymentPreview({geometry:box(),[name]:value}),/finite number/);
  assert.throws(()=>buildDeploymentPreview({geometry:polygon([[101,12],[101.001,12.001],[101.002,12.002],[101,12]])}));
  const large=polygon([[101,12],[101.1,12],[101.1,12.1],[101,12.1],[101,12]]);
  const tracks=buildDeploymentPreview({geometry:large,spacingM:5});assert.equal(tracks.status,'blocked');assert.equal(tracks.code,'TOO_MANY_TRACKS');assert.match(tracks.message,/Increase spacing or split/);assert.deepEqual(tracks.waypoints,[]);
  const manySegments=polygon([[101.2,12.6],[101.22,12.6],[101.22,12.608],[101.214,12.608],[101.214,12.602],[101.206,12.602],[101.206,12.608],[101.2,12.608],[101.2,12.6]]);
  const points=buildDeploymentPreview({geometry:manySegments,spacingM:5});assert.equal(points.status,'blocked');assert.equal(points.code,'TOO_MANY_WAYPOINTS');assert.deepEqual(points.segments,[]);
  const ring=Array.from({length:121},(_,i)=>{const angle=i/121*Math.PI*2;return [101.2+0.002*Math.cos(angle),12.6+0.002*Math.sin(angle)];});ring.push([...ring[0]]);
  const complex=buildDeploymentPreview({geometry:polygon(ring)});assert.equal(complex.status,'blocked');assert.equal(complex.code,'AREA_TOO_COMPLEX');
});

test('MSL estimates use only matching connected dataset samples; unknown terrain never becomes zero',()=>{
  const geometry=box(),base=buildDeploymentPreview({geometry,altitudeM:75}),[longitude,latitude]=base.waypoints[1].position;
  assert(base.waypoints.every(p=>p.groundElevationM===null&&p.estimatedAltitudeMSLM===null));assert.equal(base.terrain.mode,'relative');assert.match(base.warnings.at(-1),/relative height.*MSL altitude is unknown/);
  const samples=[{longitude,latitude,elevationM:12.5,waterOccurrencePct:30},{longitude:101,latitude:12,elevationM:900},{longitude:base.waypoints[2].position[0],latitude:base.waypoints[2].position[1],elevationM:null}];
  const context={state:'connected',provider:'Google Earth Engine',samples},plan=buildDeploymentPreview({geometry,altitudeM:75,context});
  assert.equal(plan.waypoints[1].groundElevationM,12.5);assert.equal(plan.waypoints[1].estimatedAltitudeMSLM,87.5);assert.equal(plan.waypoints[2].groundElevationM,null);assert.equal(plan.waypoints[2].estimatedAltitudeMSLM,null);
  assert.equal(plan.terrain.mode,'gee_sampled');assert(plan.waypoints.some(p=>p.groundElevationM===null));assert.deepEqual(plan.localWaypoints,base.localWaypoints);
  for(const state of ['not_configured','disabled','error'])assert(buildDeploymentPreview({geometry,context:{...context,state}}).waypoints.every(p=>p.groundElevationM===null));
  const realZero=buildDeploymentPreview({geometry,context:{state:'connected',samples:[{longitude,latitude,elevationM:0}]}});assert.equal(realZero.waypoints[1].groundElevationM,0);assert.equal(realZero.waypoints[1].estimatedAltitudeMSLM,50);
});
