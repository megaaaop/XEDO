import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {runPlannerBoot} from '../src/planner-boot.js';
import {buildHosted,projectRoot} from '../scripts/hosted-build.mjs';
import {hostedCacheControl,immutableAssetPath} from '../scripts/static-cache.mjs';

const parent=resolve(projectRoot,'output');await mkdir(parent,{recursive:true});
const scratch=await mkdtemp(join(parent,'hosted-build-test-'));
const report=await buildHosted({output:scratch});
const read=url=>readFile(join(scratch,url.slice(1)));
const html=await readFile(join(scratch,'index.html'),'utf8');
after(async()=>{assert.ok(scratch.startsWith(parent+sep+'hosted-build-test-'));await rm(scratch,{recursive:true,force:true});});

test('Hosted shell has no embedded artwork or application bundle and keeps planner hooks',()=>{
  assert.ok(report.html.bytes<50000);assert.ok(report.html.gzipBytes<12000);
  assert.doesNotMatch(html,/data:image\//);
  assert.match(html,new RegExp('data-entry="'+report.entry.replaceAll('.','\\.')+'"'));
  for(const id of ['trial-info-dialog','trial-readiness-dialog','drift-result','flight-result','export-result','oil-result'])assert.ok(html.includes('id="'+id+'"'));
  for(const step of ['Select an area','Satellite survey','Drone deployment'])assert.ok(html.includes(step));
  assert.match(html,/Loading planner/);assert.match(html,/Planner could not load/);
  assert.doesNotMatch(html,/src="\/trial\.js|href="\/trial\.css/);
});

test('Hosted logos reuse one small asset; favicon and evidence preserve their intended grids',async()=>{
  const logo=report.copiedAssets.find(x=>x.source.endsWith('-web.png'));
  assert.equal(html.split('src="'+logo.url+'"').length-1,2);assert.ok(logo.bytes<100000);
  for(const [source,width,height]of [['public/assets/xedo-brand-mangrove-web.png',384,384],['public/favicon-xedo-planning.png',96,96]]){
    const file=report.copiedAssets.find(x=>x.source===source),bytes=await read(file.url);
    assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
    assert.ok(file.url.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  }
  const preview=report.copiedAssets.find(x=>x.source.endsWith('sentinel-proof.png'));
  assert.deepEqual(await read(preview.url),await readFile(resolve(projectRoot,preview.source)));
  assert.ok(!html.includes(preview.url));
});

test('Initial module preloads cover only static imports; 3D, COG and calculator stay deferred',()=>{
  const preload=[...html.matchAll(/rel="modulepreload" href="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(new Set(preload),new Set(report.initialModules));
  for(const entryPoint of ['src/deployment-3d.js','src/raster-cog.js','src/planning-file-api.js']){
    const file=report.emitted.find(x=>x.entryPoint===entryPoint);assert.ok(file,entryPoint);
    assert.equal(file.initial,false);assert.ok(!preload.includes(file.url));
  }
  assert.ok(report.initialJsBytes<900000);
});

test('Every hosted dependency is emitted locally and versioned without mutable asset URLs',async()=>{
  const all=new Set([...report.emitted,...report.copiedAssets].map(x=>x.url));
  for(const file of [...report.emitted,...report.copiedAssets]){
    assert.ok(immutableAssetPath(file.url),file.url);assert.ok((await read(file.url)).byteLength>0);
    for(const dep of file.imports||[]){assert.equal(dep.external,undefined);assert.ok(all.has(dep.path),dep.path);}
  }
  const css=await read(report.stylesheet);assert.ok(css.byteLength<100000);
  assert.doesNotMatch(css.toString(),/data:image\//);
});

test('Split browser calculator still computes all four results without a workspace API',async()=>{
  const file=report.emitted.find(x=>x.entryPoint==='src/planning-file-api.js');
  const module=await import(pathToFileURL(join(scratch,file.url.slice(1))).href);
  const result=await module.fileTrialAPI('',{method:'POST',body:JSON.stringify({oil:{areaM2:1000,thicknessLowUm:10,thicknessHighUm:30,densityGml:.86,capacityGg:3.42,allowance:1.5}})});
  for(const name of ['drift','flight','exportCheck','oil'])assert.ok(result[name]);
  assert.equal(result.oil.volumeLowL,10);assert.equal(result.hardwareControl,false);
});

test('Only content-versioned assets get immutable caching; HTML and APIs revalidate',async()=>{
  assert.match(hostedCacheControl(report.entry),/immutable/);
  for(const path of ['/','/index.html','/assets/logo.png','/api/v1/inspector/me','/assets/../../index.html'])assert.equal(hostedCacheControl(path),'no-cache');
  const config=JSON.parse(await readFile(resolve(projectRoot,'vercel.json'),'utf8'));
  assert.equal(config.headers.find(x=>x.source==='/').headers[0].value,'no-cache');
  assert.equal(config.headers.find(x=>x.source==='/index.html').headers[0].value,'no-cache');
  const assetRule=config.headers.find(x=>x.source.startsWith('/assets/'));
  assert.equal(assetRule.headers[0].value,hostedCacheControl(report.entry));
  const productionMatcher=new RegExp('^'+assetRule.source.replace(':file','')+'$');
  for(const path of [report.entry,report.stylesheet,...report.copiedAssets.map(x=>x.url),'/assets/logo.png','/assets/test-ABCD1234.txt','/assets/nested/image-ABCD1234.png','/api/inspector','/index.html'])assert.equal(productionMatcher.test(path),immutableAssetPath(path),path);
  assert.ok(!config.headers.some(x=>x.source.startsWith('/api')));
});

test('Startup stays locked through partial initialization and unlocks only after module evaluation',async()=>{
  assert.match(html,/<script id="planner-boot" type="module" data-entry=/);
  function scenario(){
    const label={textContent:''},button={hidden:true},shell={inert:true,removeAttribute(){this.inert=false;}};
    const status={removed:false,querySelector:key=>key==='span'?label:button,setAttribute(){},remove(){this.removed=true;}};
    let reloads=0,finish,fail;
    const pending=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
    const doc={querySelectorAll:()=>[shell],getElementById:id=>id==='planner-boot'?{dataset:{entry:report.entry}}:status};
    const task=runPlannerBoot(doc,()=>pending,()=>{reloads++;});
    return {status,label,button,shell,finish,fail,task,reloadCount:()=>reloads};
  }
  const failure=scenario();assert.equal(failure.shell.inert,true);assert.equal(failure.status.removed,false);
  failure.fail(Error('exception after partial initialization'));await failure.task;
  assert.equal(failure.button.hidden,false);assert.match(failure.label.textContent,/could not load/);assert.equal(failure.shell.inert,true);failure.button.onclick();assert.equal(failure.reloadCount(),1);
  const success=scenario();assert.equal(success.shell.inert,true);success.finish();await success.task;assert.equal(success.status.removed,true);assert.equal(success.shell.inert,false);
});
