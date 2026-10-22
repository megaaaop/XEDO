import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {summarizeTrack, trackSegments, positionStatus} from '../src/drone-track.js';
import worker from '../src/worker.js';
import {localEnvironment} from '../scripts/local-storage.mjs';

const now=Date.now();
const event=(sequence, extra={})=>({schema_version:'1.0',event_id:'TRACK_event_'+sequence,
  device_id:'pi-001',boot_id:'TRACK_boot_01',sequence,observed_at:new Date(now-(5-sequence)*1000).toISOString(),
  source_mode:'live',clock_quality:'synced',position:{latitude:12.6,longitude:101.2+sequence*.00001,valid:true,altitude_m:50,altitude_reference:'MSL'},
  battery:null,dispenser:null,health:{agent:'online'},...extra});

test('GPS freshness uses observation time, not a recent upload or heartbeat',()=>{
  const fix=event(5), state={latest:fix,connection:'online'};
  assert.equal(positionStatus(state,fix,now),'current');
  assert.equal(positionStatus(state,fix,now+6000),'stale');
  assert.equal(positionStatus(state,fix,now+16000),'disconnected');
  assert.equal(positionStatus({...state,connection:'disconnected'},fix,now),'disconnected');
  assert.equal(positionStatus({...state,latest:event(5,{position:null})},fix,now),'invalid');
  assert.equal(positionStatus(state,{...fix,clock_quality:'unsynced'},now),'clock_unknown');
  assert.equal(positionStatus(state,{...fix,observed_at:new Date(now+30000).toISOString()},now),'clock_unknown');
  assert.equal(positionStatus({},null,now),'waiting');
});

test('Track lines and speed do not bridge GPS loss, time gaps, or device reboots',()=>{
  const first=event(0), second=event(1), invalid=event(2,{position:null}), after=event(3);
  const segments=trackSegments([first,second,invalid,after]);
  assert.deepEqual(segments.map(s=>s.length),[2,1]);
  assert.equal(trackSegments([first,second,event(4,{observed_at:new Date(now+30000).toISOString()})]).length,2);
  assert.equal(trackSegments([first,second,event(2,{boot_id:'TRACK_boot_02'})]).length,2);
  const s=summarizeTrack({latest:after,connection:'online'},[first,second,invalid,after],now);
  assert.ok(s.distance_m>1 && s.distance_m<1.2);
  assert.equal(s.speed_m_s,null);
  assert.ok(summarizeTrack({latest:second,connection:'online'},[first,second],now).speed_m_s>1);
});

test('Track API isolates live/replay and boots, orders out-of-order uploads, and bounds history',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'xedo-tracking-'));const env=await localEnvironment(dir);
  env.XEDO_PI_TOKEN='tracking-test-fixture-only';
  const call=async(method,route,body)=>{
    const response=await worker.fetch(new Request('http://localhost/api/v1/'+route,{method,headers:{'x-xedo-device-token':env.XEDO_PI_TOKEN},...(body?{body:JSON.stringify(body)}:{})}),env,{waitUntil:p=>p.catch(()=>{})});
    return {status:response.status,data:await response.json()};
  };
  const send=async(events, mode='live')=>call('POST','telemetry/batches',{device_id:'pi-001',source_mode:mode,events});
  try {
    const bootstrap=await worker.fetch(new Request('http://localhost/api/state'),env,{waitUntil:p=>p.catch(()=>{})});
    assert.equal(bootstrap.status,200);
    const empty=await call('GET','devices/pi-001/track?mode=live');
    assert.equal(empty.status,200);assert.equal(empty.data.position_status,'waiting');assert.deepEqual(empty.data.events,[]);
    assert.equal((await call('POST','devices/pi-001/track?mode=live',{})).status,405);
    assert.equal((await call('GET','devices/pi-001/track?mode=simulated')).status,422);
    assert.equal((await send([event(2),event(0),event(1)])).status,202);
    let track=(await call('GET','devices/pi-001/track')).data;
    assert.deepEqual(track.events.map(e=>e.sequence),[0,1,2]);assert.equal(track.fix.sequence,2);
    assert.equal(track.position_status,'current');assert.equal(track.source_mode,'live');assert.ok(track.server_time);
    const replay=event(0,{event_id:'TRACK_replay_00',boot_id:'TRACK_replay_boot',source_mode:'replay'});
    assert.equal((await send([replay],'replay')).status,202);
    assert.equal((await call('GET','devices/pi-001/track?mode=live')).data.events.length,3);
    assert.equal((await call('GET','devices/pi-001/track?mode=replay')).data.events.length,1);
    const reboot=event(0,{event_id:'TRACK_new_boot_0',boot_id:'TRACK_boot_02',observed_at:new Date(now).toISOString()});
    assert.equal((await send([reboot])).status,202);
    assert.equal((await send([event(4)])).status,202);
    track=(await call('GET','devices/pi-001/track')).data;
    assert.deepEqual(track.events.map(e=>e.boot_id),['TRACK_boot_02']);
    for(let start=1;start<=301;start+=100){
      const batch=Array.from({length:Math.min(100,302-start)},(_,i)=>event(start+i,{boot_id:'TRACK_boot_02',event_id:'TRACK_limit_'+(start+i),observed_at:new Date(now+(start+i)*1000).toISOString()}));
      assert.equal((await send(batch)).status,202);
    }
    track=(await call('GET','devices/pi-001/track')).data;
    assert.equal(track.events.length,300);assert.equal(track.truncated,true);
    assert.equal(track.events[0].sequence,2);assert.equal(track.events.at(-1).sequence,301);
    assert.equal(track.position_status,'clock_unknown');
  } finally {env.close();await rm(dir,{recursive:true,force:true});}
});
