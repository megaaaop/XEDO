import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlanningExportDefaults,EXPORT_PLANNING_PROFILE} from '../src/planning-export-defaults.js';

const end='2026-11-01T03:12:25.270Z',later='2026-11-01T04:20:00.000Z';
const apply=(controller,settings)=>({...settings,...controller.reconcile(settings)});

test('Planning defaults fill only four export assumptions without claiming Home, firmware or reviews',()=>{
 const c=createPlanningExportDefaults(),input={homeAmslM:0,firmware:'ArduPilot',airspaceReviewed:false};
 const next=apply(c,input);
 assert.equal(next.ceilingM,60);assert.equal(next.corridorM,5);assert.equal(next.source,EXPORT_PLANNING_PROFILE.source);
 assert.equal(next.validUntil,undefined,'No deadline is invented before a mission end exists.');
 assert.deepEqual(input,{homeAmslM:0,firmware:'ArduPilot',airspaceReviewed:false});
 assert.match(next.source,/planning assumptions/);
 assert.equal(next.airspaceReviewed,false);assert.equal(next.homeAmslM,0);assert.equal(next.firmware,'ArduPilot');
});

test('Automatic validity follows the mission end in UTC and clears when the schedule is reset',()=>{
 const c=createPlanningExportDefaults();let s=apply(c,{plannedEndAt:end});
 assert.equal(s.validUntil,end);
 s=apply(c,{...s,plannedEndAt:later});assert.equal(s.validUntil,later);
 s=apply(c,{...s,plannedEndAt:null});assert.equal(s.validUntil,null);
 assert.equal(c.reconcile(s).validUntil,undefined);
 s=apply(c,{...s,plannedEndAt:'invalid'});assert.equal(s.validUntil,null);
 s=apply(c,{...s,plannedEndAt:'2026-11-01T11:20:00+07:00'});assert.equal(s.validUntil,later);
});

test('Manual zero, text, expiry and deliberate blanks remain owned by the Inspector',()=>{
 const c=createPlanningExportDefaults();let s=apply(c,{plannedEndAt:end});
 for(const [key,value] of Object.entries({ceilingM:0,corridorM:0,source:'Independent field review',validUntil:''})){
  c.edited(key);s[key]=value;
 }
 s=apply(c,{...s,plannedEndAt:later});
 assert.equal(s.ceilingM,0);assert.equal(s.corridorM,0);assert.equal(s.source,'Independent field review');assert.equal(s.validUntil,'');
 for(const item of Object.values(c.metadata(s).fields))assert.equal(item.mode,'manual');
});

test('Unannounced supplied values are preserved instead of being overwritten as automatic',()=>{
 const c=createPlanningExportDefaults();let s=apply(c,{plannedEndAt:end});
 s={...s,ceilingM:45,validUntil:later};s=apply(c,{...s,plannedEndAt:end});
 assert.equal(s.ceilingM,45);assert.equal(s.validUntil,later);
 assert.equal(c.metadata(s).fields.ceilingM.mode,'manual');
});

test('Saved automatic ownership survives restore while manual fields and cleared values stay manual',()=>{
 const c=createPlanningExportDefaults();let s=apply(c,{plannedEndAt:end});
 c.edited('corridorM');s.corridorM=0;c.edited('source');s.source='';
 s.planningDefaults=c.metadata(s);
 const restored=createPlanningExportDefaults();restored.restore(structuredClone(s));
 const next=apply(restored,{...s,plannedEndAt:later});
 assert.equal(next.validUntil,later);assert.equal(next.corridorM,0);assert.equal(next.source,'');
 assert.equal(restored.metadata(next).fields.source.mode,'manual');
});

test('Older snapshots keep supplied values and allow defaults only for missing fields',()=>{
 const c=createPlanningExportDefaults(),s={ceilingM:80,validUntil:end,source:'Saved review',corridorM:null,plannedEndAt:later};
 c.restore(s);const next=apply(c,s);
 assert.equal(next.ceilingM,80);assert.equal(next.validUntil,end);assert.equal(next.source,'Saved review');assert.equal(next.corridorM,5);
});

test('Invalid ownership metadata cannot authorize replacing restored values',()=>{
 for(const planningDefaults of [{version:9}, {version:1,profileId:'different'}, {version:1,profileId:EXPORT_PLANNING_PROFILE.id,fields:{validUntil:{mode:'automatic',value:later}}}]){
  const c=createPlanningExportDefaults(),s={ceilingM:70,corridorM:0,source:'',validUntil:end,planningDefaults};
  c.restore(s);assert.deepEqual(c.reconcile({...s,plannedEndAt:later}),{});
 }
});

test('Explicit reset restores the four planning defaults and leaves review decisions to the caller',()=>{
 const c=createPlanningExportDefaults(),s={ceilingM:90,corridorM:0,source:'Manual',validUntil:end,plannedEndAt:later,homeAmslM:10.79,firmware:'ArduPilot',airspaceReviewed:false};
 c.restore(s);c.reset(s);const next=apply(c,s);
 assert.equal(next.ceilingM,60);assert.equal(next.corridorM,5);assert.equal(next.validUntil,later);assert.equal(next.source,EXPORT_PLANNING_PROFILE.source);
 assert.equal(next.homeAmslM,s.homeAmslM);assert.equal(next.firmware,s.firmware);assert.equal(next.airspaceReviewed,false);
});
