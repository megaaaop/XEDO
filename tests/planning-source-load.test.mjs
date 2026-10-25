import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateGeometry} from '../src/domain.js';
import {createPlanningSchedule} from '../src/planning-schedule.js';
import {createEstimatedDemoInputs,ESTIMATED_DEMO_PROFILE} from '../src/planning-estimated-demo.js';

const client=await readFile(new URL('../src/planning-trial-client.js',import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const boundary=(longitude=101.22)=>({type:'Polygon',coordinates:[[[longitude,12.62],[longitude+.002,12.62],[longitude+.002,12.621],[longitude,12.621],[longitude,12.62]]]});
function production(from,to){
  const start=client.indexOf(from),end=client.indexOf(to,start);
  assert.ok(start>=0&&end>start,'Production section must resolve: '+from);
  return client.slice(start,end);
}

// Execute the production import transaction and geometry setter. Only the
// network, DOM and rendering boundaries are replaced; no import logic is copied.
function harness(){
  const nodes=new Map(),requests=[],timers=new Map(),calls={stop:0,reset:0,invalidate:0,notices:[],errors:[]};
  let nextTimer=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',href:''});return nodes.get(id);};
  const schedule=createPlanningSchedule({now:()=>Date.parse('2026-10-26T00:00:00Z')});
  schedule.begin();schedule.complete({plan:{status:'generated',estimates:{durationS:400}},battery:{totalDurationS:400,sorties:[{}]}});
  const context=vm.createContext({
    AbortController,structuredClone,JSON,validateGeometry,createPlanningSchedule,ESTIMATED_DEMO_PROFILE,
    geometry:boundary(),surveyId:'SURV_OLD',review:{ready:true,scene:{id:'SCENE_OLD'}},
    result:{inputHash:'previous-result',exportCheck:{pass:true}},currentStep:3,revision:4,
    draw:{id:'unfinished-polygon'},routePoints:[[101.22,12.62]],schedule,
    example:true,estimatedDemo:true,missionBackup:{id:'original-mission'},fileMode:false,
    $:selector=>node(selector.slice(1)),
    async api(path,options={}){
      return new Promise((resolve,reject)=>{
        const request={path,signal:options.signal,resolve,reject};requests.push(request);
        const aborted=()=>reject(Object.assign(new Error('Request aborted'),{name:'AbortError'}));
        if(options.signal?.aborted)aborted();else options.signal?.addEventListener('abort',aborted,{once:true});
      });
    },
    setTimeout(callback,delay){const id=++nextTimer;timers.set(id,{callback,delay});return id;},
    clearTimeout(id){timers.delete(id);},
    stopDraw(){calls.stop++;context.draw=null;},
    resetSurvey(){calls.reset++;context.review=null;context.currentStep=1;},
    resetReview(){},
    invalidate(){calls.invalidate++;context.revision++;context.result=null;},
    environmentUI:{changed(){}},geospatialUI:{changed(){},revokeHomeEstimate(){}},
    notice(){},refreshFlow(){},fit(){},drawMap(){},
    announce(message){calls.notices.push(message);},error(message=''){calls.errors.push(message);},
    compatibleInputs:inputs=>structuredClone(inputs),
    restoreInputs(){throw Error('Failed source lookup must not restore inputs.');},
    captureMission(){throw Error('Failed source lookup must not replace the mission backup.');},
    clearGeometry(){throw Error('Failed source lookup must not clear geometry.');},
  });
  node('trial-back').href='/mission.html?incident=INC_OLD&survey=SURV_OLD';
  node('trial-source').textContent='Current reviewed mission';
  node('trial-geometry').value=JSON.stringify(context.geometry);node('trial-survey').value='SURV_OLD';
  vm.runInContext(production('function setGeometry(','$(\'#trial-run\').onclick=')+
    production("$('#trial-restore').onchange=",'function changed(event)'),context);
  function state(){return plain({
    geometry:context.geometry,surveyId:context.surveyId,review:context.review,result:context.result,
    currentStep:context.currentStep,draw:context.draw,routePoints:context.routePoints,
    schedule:schedule.getState(),example:context.example,estimatedDemo:context.estimatedDemo,
    missionBackup:context.missionBackup,back:node('trial-back').href,source:node('trial-source').textContent,
    geometryText:node('trial-geometry').value,surveyText:node('trial-survey').value,
  });}
  return {context,node,requests,timers,calls,state,load:id=>context.loadSurvey(id),
    response:(id='SURV_NEW',geometry=boundary(101.24))=>({surveyId:id,incidentId:'INC_NEW',geometry}),
    useProductionStopDraw(){
      Object.assign(context,{sketchListener:null,sketch:null,vertexCount:0,working:false,
        unByKey(){},map:{removeInteraction(){}},setWorking(){}});
      vm.runInContext(production('function stopDraw()',"$('#trial-draw').onclick="),context);
    },
    async restore(snapshot){
      const target={value:'snapshot.json',files:[{size:1000,text:async()=>JSON.stringify(snapshot)}]};
      await node('trial-restore').onchange({target});return target;
    },
  };
}

test('Failed saved-boundary lookup retains the complete reviewed mission and unfinished drawing',async()=>{
  const h=harness(),before=h.state(),pending=h.load('SURV_MISSING');
  assert.deepEqual(h.state(),before,'Starting a lookup must not mutate the current mission.');
  h.requests[0].reject(new Error('Saved survey not found.'));
  await assert.rejects(pending,/not found/);
  assert.deepEqual(h.state(),before);assert.equal(h.calls.stop,0);assert.equal(h.calls.reset,0);assert.equal(h.calls.invalidate,0);
  assert.equal(h.timers.size,0,'Failed lookups must release their deadline timer.');
});

test('Invalid geometry and mismatched survey responses never replace the current mission',async t=>{
  const invalid=[
    ['mismatched survey',h=>h.response('SURV_OTHER')],
    ['missing incident',h=>({...h.response(),incidentId:''})],
    ['open polygon',h=>h.response('SURV_NEW',{type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.6],[101.21,12.61],[101.2,12.61]]]})],
    ['self-intersection',h=>h.response('SURV_NEW',{type:'Polygon',coordinates:[[[101.2,12.6],[101.21,12.61],[101.2,12.61],[101.21,12.6],[101.2,12.6]]]})],
  ];
  for(const [name,response]of invalid)await t.test(name,async()=>{
    const h=harness(),before=h.state(),pending=h.load('SURV_NEW');h.requests[0].resolve(response(h));
    await assert.rejects(pending);assert.deepEqual(h.state(),before);
    assert.equal(h.calls.stop,0);assert.equal(h.calls.reset,0);assert.equal(h.calls.invalidate,0);
  });
});

test('A verified response commits its saved boundary only after the request succeeds',async()=>{
  const h=harness(),before=h.state(),response=h.response(),pending=h.load('  SURV_NEW  ');
  assert.equal(h.requests[0].path,'/source?survey=SURV_NEW');assert.deepEqual(h.state(),before);
  h.requests[0].resolve(response);assert.equal(await pending,true);
  assert.deepEqual(plain(h.context.geometry),response.geometry);assert.equal(h.context.surveyId,'SURV_NEW');
  assert.equal(h.context.review,null);assert.equal(h.context.result,null);assert.equal(h.context.draw,null);
  assert.equal(h.context.currentStep,1);assert.equal(h.context.schedule.getState().mode,'idle');
  assert.match(h.node('trial-back').href,/incident=INC_NEW&survey=SURV_NEW/);
  assert.equal(h.calls.stop,1);assert.equal(h.calls.reset,1);assert.equal(h.calls.invalidate,1);assert.equal(h.timers.size,0);
});

test('A user change during a lookup prevents its late response from replacing newer state',async()=>{
  const h=harness(),pending=h.load('SURV_NEW');
  h.context.revision++;h.context.geometry=boundary(101.26);h.context.result={inputHash:'new-user-work'};
  const newer=h.state();h.requests[0].resolve(h.response());assert.equal(await pending,false);
  assert.deepEqual(h.state(),newer);assert.equal(h.calls.stop,0);assert.equal(h.calls.invalidate,0);
});

test('Starting a new drawing supersedes a pending source lookup before any geometry revision changes',async()=>{
  const h=harness();h.useProductionStopDraw();h.context.draw=null;
  const revision=h.context.revision,pending=h.load('SURV_NEW');
  // The draw-button handler first calls this actual production function, then
  // creates a new OpenLayers sketch. No polygon has completed yet, so revision
  // is still unchanged and the newer intent must be guarded independently.
  h.context.stopDraw();
  h.context.draw={id:'new-incomplete-sketch',abortDrawing(){throw Error('A late lookup must not cancel the newer sketch.');}};
  h.context.sketch={id:'three-corners-not-finished'};h.context.vertexCount=3;
  assert.equal(h.context.revision,revision);const newer=h.state();
  h.requests[0].resolve(h.response());assert.equal(await pending,false);
  assert.deepEqual(h.state(),newer);assert.equal(h.context.sketch.id,'three-corners-not-finished');
  assert.equal(h.context.vertexCount,3);assert.equal(h.calls.reset,0);assert.equal(h.calls.invalidate,0);
  assert.deepEqual(h.calls.notices,[]);
});

test('A second lookup supersedes the first even before either has changed the mission revision',async()=>{
  const h=harness(),before=h.state(),first=h.load('SURV_FIRST'),second=h.load('SURV_SECOND');
  h.requests[0].resolve(h.response('SURV_FIRST'));assert.equal(await first,false);
  assert.deepEqual(h.state(),before,'A superseded first response must not mutate state while the second is pending.');
  const latest=h.response('SURV_SECOND',boundary(101.28));h.requests[1].resolve(latest);assert.equal(await second,true);
  assert.equal(h.context.surveyId,'SURV_SECOND');assert.deepEqual(plain(h.context.geometry),latest.geometry);
  assert.equal(h.calls.invalidate,1);assert.equal(h.calls.stop,1);
});

test('An obsolete lookup failure cannot report failure over a successful newer lookup',async()=>{
  const h=harness(),first=h.load('SURV_FIRST'),second=h.load('SURV_SECOND');
  h.requests[1].resolve(h.response('SURV_SECOND'));assert.equal(await second,true);const current=h.state();
  h.requests[0].reject(new Error('Old request failed.'));assert.equal(await first,false);
  assert.deepEqual(h.state(),current);assert.equal(h.calls.notices.length,1);
});

test('Lookup timeout aborts its request and retains the current mission',async()=>{
  const h=harness(),before=h.state(),pending=h.load('SURV_NEW');
  const timer=[...h.timers.values()][0];assert.equal(timer.delay,25000);timer.callback();
  await assert.rejects(pending,/timed out.*mission has been kept/i);
  assert.equal(h.requests[0].signal.aborted,true);assert.deepEqual(h.state(),before);
  assert.equal(h.calls.stop,0);assert.equal(h.timers.size,0);
});

test('Saved-source snapshot lookup failure preserves demo identity, backup and unfinished drawing',async()=>{
  const h=harness(),before=h.state(),inputs=createEstimatedDemoInputs();delete inputs.geometry;inputs.surveyId='SURV_MISSING';
  const pending=h.restore({schema_version:'xedo-planning-trial/1',inputs,exampleData:false});
  for(let n=0;n<12&&!h.requests.length;n++)await Promise.resolve();
  assert.equal(h.requests.length,1,'The snapshot must reach the production saved-source lookup.');
  assert.deepEqual(h.state(),before,'Reading a snapshot must not stop an existing drawing before source validation.');
  h.requests[0].reject(new Error('Saved survey not found.'));const target=await pending;
  assert.equal(target.value,'');assert.match(h.calls.errors.at(-1),/not found/);
  assert.deepEqual(h.state(),before);assert.equal(h.calls.stop,0);assert.equal(h.calls.invalidate,0);
});
