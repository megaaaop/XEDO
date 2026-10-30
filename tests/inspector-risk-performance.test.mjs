import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

// Portable after copying to tests/; output-only draft can use the active root.
const adjacent=new URL('../',import.meta.url);
const root=process.env.XEDO_QA_ROOT||(existsSync(new URL('db/inspector-ai.sql',adjacent))?fileURLToPath(adjacent):'C:/mega/codex/iENA/github-publish/XEDO-hardware-release');
const {createInspectorDatabase}=await import(pathToFileURL(path.join(root,'tests/helpers/inspector-db.mjs')));
const {coversGeometry}=await import(pathToFileURL(path.join(root,'src/planning-risk-geometry.js')));
const candidatePath=process.env.XEDO_RISK_PERFORMANCE_SQL||path.join(root,'db/inspector-risk-performance.sql');
const candidateSQL=await readFile(candidatePath,'utf8');
const polygon=points=>({type:'Polygon',coordinates:[[...points,points[0]]]});
const xy=(x,y)=>[101+x*.001,12+y*.001];
const box=(a,b,c,d)=>polygon([xy(a,b),xy(c,b),xy(c,d),xy(a,d)]);
const outer=box(0,0,10,10),hole=box(4,4,6,6),withHole={type:'Polygon',coordinates:[outer.coordinates[0],hole.coordinates[0]]};
const concave=polygon([[0,0],[4,0],[4,4],[3,4],[3,1],[1,1],[1,4],[0,4]].map(([x,y])=>xy(x,y)));
const coversCases=[
  ['same outer boundary',outer,outer,true],['contained target',outer,box(2,2,8,8),true],['outside target',outer,box(11,1,12,2),false],
  ['shared outer edge',outer,box(0,2,5,8),true],['hole wholly enclosed',withHole,box(2,2,8,8),false],
  ['target coincides hole boundary',withHole,hole,false],['target strictly inside hole',withHole,box(4.2,4.2,5.8,5.8),false],
  ['hole boundary contact without entering hole',withHole,box(2,4,4,6),true],['disjoint hole bbox',withHole,box(.2,.2,1.5,1.5),true],
  ['concave bridge leaves source interior',concave,box(.5,2,3.5,3),false],['concave source arm',concave,box(0,0,1,3),true],
  ['joined MultiPolygon seam',{type:'MultiPolygon',coordinates:[box(0,0,5,10).coordinates,box(5,0,10,10).coordinates]},box(2,2,8,8),true],
  ['disjoint MultiPolygon gap',{type:'MultiPolygon',coordinates:[box(0,0,4,10).coordinates,box(6,0,10,10).coordinates]},box(2,2,8,8),false],
  ['contained in second disjoint polygon',{type:'MultiPolygon',coordinates:[box(0,0,4,10).coordinates,box(6,0,10,10).coordinates]},box(7,2,8,3),true],
  // This preserves the existing conservative rule, not general polygon-union semantics.
  ['overlapping component does not erase source-hole conservative gate',{type:'MultiPolygon',coordinates:[withHole.coordinates,hole.coordinates]},box(2,2,8,8),false],
  ['null source',null,box(2,2,8,8),false],['self-crossing target rejected',outer,polygon([[2,2],[8,8],[8,2],[2,8]].map(([x,y])=>xy(x,y))),false],
  ['target with hole rejected by planning target contract',outer,withHole,false]
];

test('Private risk predicate repair preserves geometry semantics and bounds real coverage cost',async t=>{
  const {db}=await createInspectorDatabase();
  const evidence={scope:'Local PostgreSQL/PGlite, no network or real Auth; performance is observation, not a CI threshold',sourceSha256:createHash('sha256').update(candidateSQL).digest('hex'),pointComparisons:0,coverageComparisons:0,invalidPointComparisons:0,realCoverage:[]};
  const oldName=name=>'xedo_private.risk_baseline_'+name;
  try{
    await db.exec(await readFile(path.join(root,'db/inspector-ai.sql'),'utf8'));
    // Freeze the complete old call graph, not just the top predicate. Otherwise
    // an old function would silently call a newly optimized dependency.
    for(const signature of ['cross(jsonb,jsonb,jsonb)','on_segment(jsonb,jsonb,jsonb)','point_ring(jsonb,jsonb,boolean)','point_geometry(jsonb,jsonb)','valid_target(jsonb)','geometry_covers(jsonb,jsonb)']){
      const [name]=signature.split('(');
      const definition=(await db.query('select pg_get_functiondef($1::regprocedure) definition',['xedo_private.risk_'+signature])).rows[0].definition;
      await db.exec(definition.replaceAll('xedo_private.risk_','xedo_private.risk_baseline_'));
      await db.exec('revoke all on function '+oldName(signature)+' from public,anon,authenticated');
      assert.ok(name);
    }
    await db.exec(candidateSQL);
    await t.test('Real 80-point candidate and small move retain valid coverage; no expensive old full-coverage call',async()=>{
      const local=JSON.parse(await readFile(path.join(root,'tests/fixtures/local-analysis.json'),'utf8'));
      const source=local.coverage.features.find(f=>f.properties.role==='valid_data').geometry;
      const raw=local.candidates.features.find(f=>(f.id||f.properties.candidateId)==='candidate-00002').geometry;
      assert.equal(raw.coordinates[0].length-1,80);
      const move=(dx,dy)=>({type:'Polygon',coordinates:raw.coordinates.map(r=>r.map(([x,y])=>[x+dx,y+dy]))});
      for(const [name,target,expected]of [['original',raw,true],['small offset 1e-5 degrees',move(.00001,.00001),true],['outside valid source',move(.1,0),false]]){
        // Independent JS scanline implementation tests full interiors/holes;
        // it does not call or duplicate the SQL edge-midpoint algorithm.
        assert.equal(coversGeometry(source,target),expected,name+' independent scanline oracle');
        const started=performance.now();const row=(await db.query('select xedo_private.risk_valid_target($2::jsonb) valid,xedo_private.risk_geometry_covers($1::jsonb,$2::jsonb) covered',[JSON.stringify(source),JSON.stringify(target)])).rows[0];
        const elapsedMs=performance.now()-started;
        assert.equal(row.valid,true,name+' valid planning target');assert.equal(row.covered,expected,name+' optimized SQL');
        evidence.realCoverage.push({name,expected,covered:row.covered,targetPoints:80,sourcePoints:source.coordinates[0].length-1,elapsedMs,within8SecondBudgetInThisLocalObservation:elapsedMs<8000,oldFullComplexCoverageExecuted:false});
      }
    });
    await t.test('Old/new point-in-ring values agree for boundaries, both winding orders and deterministic grids',async()=>{
      const points=[
        ['inside',xy(5,5),true],['outside',xy(-1,5),false],['left edge',xy(0,5),'boundary'],['bottom edge',xy(5,0),'boundary'],['vertex',xy(0,0),'boundary'],['opposite vertex',xy(10,10),'boundary'],
        ['near eps outside',[101.005,12-5e-12],undefined],['beyond eps outside',[101.005,12-2e-11],undefined],['near endpoint eps',[101-5e-12,12],undefined],['beyond endpoint eps',[101-2e-11,12],undefined]
      ];
      for(let x=-1;x<=11;x+=2)for(let y=-1;y<=11;y+=2)points.push(['grid '+x+','+y,xy(x,y),undefined]);
      let seed=0x69ad31;for(let i=0;i<100;i++){seed=(1664525*seed+1013904223)>>>0;const x=seed/2**32*14-2;seed=(1664525*seed+1013904223)>>>0;const y=seed/2**32*14-2;points.push(['random '+i,xy(x,y),undefined]);}
      const list=[];
      for(const [winding,ring]of [['forward',outer.coordinates[0]],['reverse',[...outer.coordinates[0]].reverse()]])for(const boundary of [true,false,null])for(const [name,point,expected]of points)list.push({id:name+'/'+winding+'/'+boundary,point,ring,boundary,expected:expected==='boundary'?boundary:expected});
      const rows=(await db.query('select c.id,xedo_private.risk_baseline_point_ring(c.point,c.ring,c.boundary) legacy,xedo_private.risk_point_ring(c.point,c.ring,c.boundary) current from jsonb_to_recordset($1::jsonb) c(id text,point jsonb,ring jsonb,boundary boolean)',[JSON.stringify(list)])).rows;
      const byId=new Map(rows.map(r=>[r.id,r]));assert.equal(rows.length,list.length);
      for(const item of list){const r=byId.get(item.id);assert.equal(r.current,r.legacy,item.id+' exact old/new');if(item.expected!==undefined)assert.equal(r.current,item.expected,item.id+' independently known value');}
      evidence.pointComparisons+=rows.length;
      const probes=[['valid interior',xy(2,2),true],['hole interior',xy(5,5),false],['hole boundary',xy(4,5),true],['outer boundary',xy(0,5),true],['outside',xy(11,5),false]];
      for(const [name,p,expected]of probes){const r=(await db.query('select xedo_private.risk_baseline_point_geometry($1::jsonb,$2::jsonb) legacy,xedo_private.risk_point_geometry($1::jsonb,$2::jsonb) current',[JSON.stringify(p),JSON.stringify(withHole)])).rows[0];assert.equal(r.current,r.legacy,name);assert.equal(r.current,expected,name);evidence.pointComparisons++;}
    });
    await t.test('Old/new whole-coverage gates agree with independent concavity/hole/multipart expectations',async()=>{
      for(const [name,source,target,expected]of coversCases){
        const row=(await db.query('select xedo_private.risk_baseline_geometry_covers($1::jsonb,$2::jsonb) legacy,xedo_private.risk_geometry_covers($1::jsonb,$2::jsonb) current',[source===null?null:JSON.stringify(source),JSON.stringify(target)])).rows[0];
        assert.equal(row.current,row.legacy,name+' baseline equivalence');assert.equal(row.current,expected,name+' independent expected');evidence.coverageComparisons++;
      }
    });
    await t.test('Empty/malformed/unclosed point inputs retain old result or SQLSTATE',async()=>{
      const r=outer.coordinates[0],cases=[['JSON null ring',xy(0,0),null],['object ring',xy(0,0),{}],['empty ring',xy(0,0),[]],['one point ring',xy(0,0),[xy(0,0)]],['null point',null,r],['bad numeric point',['bad',12],r],['null vertex',xy(5,5),[xy(0,0),null,xy(10,10),xy(0,0)]],['unclosed ring',xy(2,5),r.slice(0,-1)]];
      const call=async(name,p,ring)=>{try{return {value:(await db.query('select '+name+'($1::jsonb,$2::jsonb,false) v',[JSON.stringify(p),JSON.stringify(ring)])).rows[0].v};}catch(error){return {sqlstate:error.code};}};
      for(const [name,p,ring]of cases){const legacy=await call('xedo_private.risk_baseline_point_ring',p,ring),current=await call('xedo_private.risk_point_ring',p,ring);assert.deepEqual(current,legacy,name);evidence.invalidPointComparisons++;}
    });
    if(process.env.XEDO_GEOMETRY_EVIDENCE){await mkdir(path.dirname(process.env.XEDO_GEOMETRY_EVIDENCE),{recursive:true});await writeFile(process.env.XEDO_GEOMETRY_EVIDENCE,JSON.stringify({...evidence,status:'passed'},null,2));}
    t.diagnostic(JSON.stringify(evidence));
  }finally{await db.close();}
});
