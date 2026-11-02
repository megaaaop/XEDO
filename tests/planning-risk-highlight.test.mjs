import test from 'node:test';
import assert from 'node:assert/strict';
import {riskImageCoverage,clipOutsideImage} from '../src/planning-risk-highlight.js';

const box=(a,b,c,d)=>({type:'Polygon',coordinates:[[[a,b],[c,b],[c,d],[a,d],[a,b]]]});
const image=box(101,12,101.01,12.01),ready={imageReady:true,imageGeometry:image};

test('Highlight feedback distinguishes missing review, invalid draft, exact contact and overflow without mutating inputs',()=>{
  const inside=box(101.001,12.001,101.009,12.009),overflow=box(101.001,12.001,101.01005,12.009);
  const before=JSON.stringify({ready,inside,overflow});
  assert.equal(riskImageCoverage(ready,null).state,'empty');
  assert.equal(riskImageCoverage({imageReady:false,imageGeometry:image},inside).state,'waiting');
  assert.equal(riskImageCoverage({imageReady:true},inside).state,'waiting');
  assert.equal(riskImageCoverage(ready,{type:'Polygon',coordinates:[[[101,12],[101,12],[101,12],[101,12]]]}).state,'invalid');
  assert.equal(riskImageCoverage(ready,inside).state,'covered');
  assert.equal(riskImageCoverage(ready,image).state,'covered');
  assert.equal(riskImageCoverage(ready,overflow).state,'outside');
  assert.equal(riskImageCoverage(ready,overflow).error,true);
  assert.match(riskImageCoverage(ready,overflow).message,/red highlight/);
  assert.equal(JSON.stringify({ready,inside,overflow}),before);
});

test('Overflow responds to replacement/expiry of the reviewed image rather than SAR coverage or map extent',()=>{
  const target=box(101.009,12.001,101.011,12.009);
  assert.equal(riskImageCoverage({...ready,coverage:box(100,11,102,13)},target).state,'outside');
  assert.equal(riskImageCoverage({imageReady:true,imageGeometry:box(101,12,101.02,12.02)},target).state,'covered');
  assert.equal(riskImageCoverage({...ready,imageReady:false},target).state,'waiting');
});

test('Canvas overflow mask keeps holes and transforms every boundary into render pixels',()=>{
  const calls=[],context={canvas:{width:1200,height:800}};
  for(const name of ['beginPath','rect','moveTo','lineTo','closePath','clip'])context[name]=(...args)=>calls.push([name,...args]);
  const rings=[box(0,0,10,10).coordinates[0],box(3,3,4,4).coordinates[0]],before=JSON.stringify(rings);
  assert.equal(clipOutsideImage(context,rings,([x,y])=>[2*x+20,2*y+40]),true);
  assert.deepEqual(calls[1],['rect',0,0,1200,800]);
  assert.deepEqual(calls.filter(c=>c[0]==='moveTo'),[['moveTo',20,40],['moveTo',26,46]]);
  assert.equal(calls.filter(c=>c[0]==='closePath').length,2);
  assert.deepEqual(calls.at(-1),['clip','evenodd']);
  assert.equal(JSON.stringify(rings),before);
  calls.length=0;
  assert.equal(clipOutsideImage(context,rings,()=>null),false);
  assert.equal(calls.length,0,'An unavailable map transform must not leave a partial canvas mask');
});
