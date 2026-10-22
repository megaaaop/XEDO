import test from 'node:test';
import assert from 'node:assert/strict';
import proj4 from 'proj4';
import {calculateDrift} from '../src/trial-drift.js';
import {calculateOil} from '../src/trial-oil.js';

const polygon=()=>({type:'Polygon',coordinates:[[[101.2,12.6],[101.204,12.6],[101.204,12.604],[101.202,12.602],[101.2,12.604],[101.2,12.6]]]});
const environment=()=>({observedAt:'2026-10-22T00:00:00Z',arriveAt:'2026-10-22T00:10:00Z',endAt:'2026-10-22T00:20:00Z',currentEastMps:0.2,currentNorthMps:0,windSpeedMps:5,windFromDeg:0,marginM:10});
const oil=()=>({areaM2:1000,thicknessLowUm:10,thicknessHighUm:10});
const near=(actual,expected,tolerance=1e-9)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);

test('Oil units reproduce the supplied 10 L and 3.77193 kg fixture without an AOI',()=>{
  const settings=oil(),before=structuredClone(settings),result=calculateOil(settings);
  assert.deepEqual(settings,before);assert.equal(result.state,'assumption_based');assert.deepEqual(result.missing,[]);
  assert.equal(result.areaM2,1000);assert.equal(result.volumeLowL,10);assert.equal(result.volumeHighL,10);
  assert.equal(result.oilMassLowKg,8.6);near(result.capsulesLowKg,3.7719298245614032);near(result.capsulesHighKg,result.capsulesLowKg);
  assert.equal(result.inputs.capacityGg,3.42);assert.equal(result.inputs.allowance,1.5);assert.equal(result.assumptions.calibrated,false);
  assert.match(result.formulas.units,/g oil\/g dry whole capsules/);assert.match(result.warnings.join(' '),/Default project inputs.*not verified/);
  assert.equal(result.hardwareControl,false);assert.equal(result.releaseControl,false);
  const fromAOI=calculateOil({geometry:polygon(),thicknessLowUm:10});assert.equal(fromAOI.areaM2,null);assert.equal(fromAOI.volumeLowL,null);
});

test('Pixel area uses metres per pixel and independent X/Y scale without centimetre inference',()=>{
  const square=calculateOil({pixelCount:2500000,gsdM:0.02,thicknessLowUm:10,thicknessHighUm:30});
  assert.equal(square.areaM2,1000);assert.equal(square.volumeLowL,10);assert.equal(square.volumeHighL,30);assert.equal(square.inputs.gsdYM,0.02);
  const unequal=calculateOil({pixelCount:1000,gsdM:0.02,gsdYM:0.03,thicknessLowUm:100});
  near(unequal.areaM2,0.6);near(unequal.volumeLowL,0.06);assert.equal(unequal.volumeHighL,null);
  const wrongName=calculateOil({pixelCount:1000,gsdCm:2,thicknessLowUm:100});assert.equal(wrongName.areaM2,null);assert(wrongName.missing.includes('GSD X (m/pixel)'));
  assert.throws(()=>calculateOil({pixelCount:1000,gsdM:2,gsdUnit:'cm',thicknessLowUm:100}),/m\/pixel/);
  assert.throws(()=>calculateOil({...oil(),pixelCount:10,gsdM:0.01}),/either manual oil area or oil pixel count/);
});

test('Unknown upper thickness and missing calibration propagate nulls while retaining measured area/volume',()=>{
  const unknown=calculateOil({...oil(),thicknessHighUm:null});
  assert.equal(unknown.state,'assumption_based');assert.equal(unknown.upperUnknown,true);assert.equal(unknown.volumeLowL,10);
  assert.equal(unknown.volumeHighL,null);assert.equal(unknown.oilMassHighKg,null);assert.equal(unknown.capsulesHighKg,null);
  const noDensity=calculateOil({...oil(),densityGml:null});
  assert.equal(noDensity.state,'incomplete');assert.equal(noDensity.volumeLowL,10);assert.equal(noDensity.oilMassLowKg,null);assert.equal(noDensity.capsulesLowKg,null);
  const noCapacity=calculateOil({...oil(),capacityGg:null});
  assert.equal(noCapacity.oilMassLowKg,8.6);assert.equal(noCapacity.capsulesLowKg,null);assert(noCapacity.missing.some(x=>x.startsWith('Capacity')));
  const empty=calculateOil();assert.equal(empty.state,'incomplete');assert.equal(empty.areaM2,null);assert.equal(empty.volumeLowL,null);assert.equal(empty.capsulesLowKg,null);
  const noLower=calculateOil({areaM2:1000,thicknessHighUm:20});assert.equal(noLower.volumeLowL,null);assert.equal(noLower.volumeHighL,20);assert.equal(noLower.state,'incomplete');
});

test('Emulsion needs its own oil fraction and valid zero is distinct from a missing measurement',()=>{
  const unknown=calculateOil({...oil(),emulsion:true});
  assert.equal(unknown.areaM2,1000);assert.equal(unknown.inputs.oilFraction,null);assert.equal(unknown.volumeLowL,null);assert.equal(unknown.capsulesLowKg,null);
  assert(unknown.missing.some(x=>/oil fraction of emulsion/.test(x)));
  const emulsion=calculateOil({...oil(),emulsion:true,oilFraction:0.25});assert.equal(emulsion.volumeLowL,2.5);near(emulsion.oilMassLowKg,2.15);near(emulsion.capsulesLowKg,3.7719298245614032/4);
  for(const settings of [{...oil(),areaM2:0},{...oil(),thicknessLowUm:0,thicknessHighUm:0},{...oil(),targetFraction:0}]){
    const result=calculateOil(settings);assert.equal(result.state,'assumption_based');assert.equal(result.capsulesLowKg,0);
  }
  assert.equal(calculateOil({...oil(),oilFraction:0}).volumeLowL,0);
});

test('Present invalid oil values fail rather than becoming defaults, zero, or a clamped estimate',()=>{
  for(const [key,values] of Object.entries({pixelCount:[-1,1.5,Number.MAX_SAFE_INTEGER+1],gsdM:[0,-0.01,'2',Infinity],gsdYM:[0,-1],areaM2:[-1],thicknessLowUm:[-1,'10'],thicknessHighUm:[-1,9],densityGml:[0,-1],capacityGg:[0,-1],allowance:[0,0.5],targetFraction:[-0.1,1.1],oilFraction:[-0.1,1.1]})){
    for(const value of values){const settings={...oil(),[key]:value};if(key==='pixelCount')delete settings.areaM2;assert.throws(()=>calculateOil(settings),undefined,`${key}=${value}`);}
  }
  for(const value of [NaN,Infinity,'',false])assert.throws(()=>calculateOil({...oil(),thicknessLowUm:value}));
  assert.throws(()=>calculateOil({...oil(),emulsion:null}),/true or false/);
  assert.throws(()=>calculateOil({...oil(),areaM2:Number.MAX_VALUE,thicknessLowUm:Number.MAX_VALUE,thicknessHighUm:null}),/numeric range/);
  assert.throws(()=>calculateOil(null),/object/);
});

test('Drift respects wind FROM, true east/north, nominal arrival/end, and immutable irregular geometry',()=>{
  const geometry=polygon(),settings=environment(),original=structuredClone(geometry),before=structuredClone(settings),result=calculateDrift(geometry,settings);
  assert.equal(result.state,'assumption_based');assert.deepEqual(result.missing,[]);assert.deepEqual(geometry,original);assert.deepEqual(settings,before);
  near(result.arrivalDisplacement.eastM,120);near(result.arrivalDisplacement.northM,-90);near(result.displacement.eastM,240);near(result.displacement.northM,-180);near(result.displacement.distanceM,300);
  assert.equal(result.scenarios.length,6);assert.equal(result.features.type,'FeatureCollection');assert.equal(result.features.features.length,10);
  assert.equal(result.nominalGeometry.coordinates[0].length,geometry.coordinates[0].length);assert.equal(result.nominalArriveGeometry.coordinates[0].length,geometry.coordinates[0].length);
  assert.deepEqual(result.originalGeometry,original);assert.notStrictEqual(result.originalGeometry,geometry);
  assert.equal(result.validFrom,'2026-10-22T00:00:00.000Z');assert.equal(result.envelopeWindow.from,'2026-10-22T00:10:00.000Z');
  assert.equal(result.validTo,'2026-10-22T00:20:00.000Z');assert.match(result.projection.calculationCrs,/EPSG:32647/);
  assert.equal(result.assumptions.windage.calibrated,false);assert.equal(result.hardwareControl,false);assert.equal(result.releaseControl,false);
  const westWind=calculateDrift(geometry,{...settings,currentEastMps:0,currentNorthMps:0,windFromDeg:270});
  near(westWind.displacement.eastM,180);near(westWind.displacement.northM,0,1e-10);
  const project=proj4('EPSG:4326',result.projection.definition),a=project.forward(geometry.coordinates[0][0]),b=project.forward(result.nominalGeometry.coordinates[0][0]);
  near(Math.hypot(b[0]-a[0],b[1]-a[1]),300,0.001);
});

test('Swept axis-aligned envelope covers every scenario vertex and its declared margin in metres',()=>{
  const result=calculateDrift(polygon(),environment()),project=proj4('EPSG:4326',result.projection.definition),ring=result.geometry.coordinates[0].map(p=>project.forward(p));
  const lowX=Math.min(...ring.map(p=>p[0])),highX=Math.max(...ring.map(p=>p[0])),lowY=Math.min(...ring.map(p=>p[1])),highY=Math.max(...ring.map(p=>p[1]));
  const vertices=result.scenarios.flatMap(s=>s.geometry.coordinates[0].map(p=>project.forward(p)));
  near(Math.min(...vertices.map(p=>p[0]))-lowX,10,0.001);near(highX-Math.max(...vertices.map(p=>p[0])),10,0.001);
  near(Math.min(...vertices.map(p=>p[1]))-lowY,10,0.001);near(highY-Math.max(...vertices.map(p=>p[1])),10,0.001);
  const low=result.scenarios.find(s=>s.phase==='end'&&s.windage==='low'),high=result.scenarios.find(s=>s.phase==='end'&&s.windage==='high');
  near(low.northM,-150);near(high.northM,-240);assert.equal(low.alpha,0.025);assert.equal(high.alpha,0.04);
  assert.match(result.warnings.join(' '),/not the physical union/);assert.match(result.warnings.join(' '),/not a validated/);
});

test('Missing drift inputs never become calm wind/current, and zero elapsed time preserves the exact polygon',()=>{
  const missing=calculateDrift(polygon(),{observedAt:environment().observedAt});
  assert.equal(missing.state,'incomplete');assert.equal(missing.geometry,null);assert.equal(missing.displacement,null);assert.equal(missing.inputs.currentEastMps,null);assert.equal(missing.inputs.windSpeedMps,null);assert.deepEqual(missing.scenarios,[]);
  const noGeometry=calculateDrift(null,environment());assert(noGeometry.missing.includes('Observed slick polygon'));assert.equal(noGeometry.geometry,null);
  const same=calculateDrift(polygon(),{...environment(),arriveAt:environment().observedAt,endAt:environment().observedAt});
  assert.deepEqual(same.nominalGeometry,polygon());assert.deepEqual(same.nominalArriveGeometry,polygon());assert.deepEqual(same.displacement,{eastM:0,northM:0,distanceM:0});
  const calm=calculateDrift(polygon(),{...environment(),currentEastMps:0,currentNorthMps:0,windSpeedMps:0});assert.equal(calm.state,'assumption_based');assert.deepEqual(calm.nominalGeometry,polygon());
});

test('Drift times are timezone-aware, ordered, calendar-valid and bounded to 24 hours',()=>{
  const settings=environment(),offset=calculateDrift(polygon(),{...settings,observedAt:'2026-10-22T07:00:00+07:00'});
  assert.equal(offset.inputs.observedAt,'2026-10-22T00:00:00.000Z');near(offset.displacement.eastM,240);
  for(const changed of [{observedAt:'2026-10-22T00:00:00'},{observedAt:'2026-02-30T00:00:00Z'},{observedAt:'bad'},{observedAt:0},{arriveAt:'2026-10-21T23:59:59Z'},{endAt:'2026-10-22T00:09:59Z'},{endAt:'2026-10-23T00:00:01Z'},{arriveAt:'2026-10-23T00:00:01Z',endAt:null}])assert.throws(()=>calculateDrift(polygon(),{...settings,...changed}));
  const maximum=calculateDrift(polygon(),{...settings,arriveAt:'2026-10-23T00:00:00Z',endAt:'2026-10-23T00:00:00Z',currentEastMps:0,windSpeedMps:0});assert.equal(maximum.state,'assumption_based');
});

test('Drift rejects invalid present settings and bounds source, shift and swept-envelope extent',()=>{
  for(const changed of [{currentEastMps:'0.2'},{currentNorthMps:NaN},{windSpeedMps:-1},{windFromDeg:361},{alpha:0.05},{alphaMin:0.05,alphaMax:0.04},{alphaMin:-1},{marginM:-1},{currentEastMps:100},{marginM:50000}])assert.throws(()=>calculateDrift(polygon(),{...environment(),...changed}));
  const large={type:'Polygon',coordinates:[[[100,12],[101,12],[101,12.01],[100,12.01],[100,12]]]};assert.throws(()=>calculateDrift(large,environment()),/100 km extent/);
  const polar={type:'Polygon',coordinates:[[[101,81],[101.01,81],[101.01,81.01],[101,81.01],[101,81]]]};assert.throws(()=>calculateDrift(polar,environment()),/80°/);
  const dateline={type:'Polygon',coordinates:[[[179.999,0],[-179.999,0],[-179.999,0.00001],[179.999,0.00001],[179.999,0]]]};assert.throws(()=>calculateDrift(dateline,environment()),/date-line/);
  const nearDateLine={type:'Polygon',coordinates:[[[179.99,0],[179.991,0],[179.991,0.001],[179.99,0.001],[179.99,0]]]};
  assert.throws(()=>calculateDrift(nearDateLine,{...environment(),currentEastMps:10,windSpeedMps:0}),/date-line/);
  assert.throws(()=>calculateDrift(polygon(),null),/object/);
  const bad={type:'Polygon',coordinates:[[[101,12],[101.002,12.002],[101.002,12],[101,12.002],[101,12]]]};assert.throws(()=>calculateDrift(bad,{}),/intersects/);
});
