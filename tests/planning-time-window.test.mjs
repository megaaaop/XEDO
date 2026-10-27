import test from 'node:test';
import assert from 'node:assert/strict';
import {missionWindowProblem,MISSION_WINDOW_LIMITS} from '../src/planning-time-window.js';
const now=Date.parse('2026-10-27T19:24:05.270Z'),iso=ms=>new Date(ms).toISOString();
test('Shared mission limits distinguish exact24h, over24h and unsupported dates',()=>{
  const start=now+3600000;
  assert.equal(missionWindowProblem(iso(start),iso(start+MISSION_WINDOW_LIMITS.durationMs),{now}),null);
  assert.equal(missionWindowProblem(iso(start),iso(start+MISSION_WINDOW_LIMITS.durationMs+1),{now}).code,'TIME_DURATION');
  assert.equal(missionWindowProblem(iso(now-6*86400000),iso(now-6*86400000+3600000),{now}).code,'TIME_PAST');
  assert.equal(missionWindowProblem(iso(now+7*86400000),iso(now+7*86400000+3600000),{now}).code,'TIME_FUTURE');
  assert.equal(missionWindowProblem(iso(start),iso(start-1),{now}).code,'TIME_ORDER');
  assert.equal(missionWindowProblem(iso(start),null,{now}).code,'TIME_PAIR');
  assert.equal(missionWindowProblem('not-a-date',iso(start),{now}).code,'TIME_FORMAT');
  assert.equal(missionWindowProblem(null,null,{now}),null);
});
test('The reported52h automatic window has an actionable actual-duration reason',()=>{
  const issue=missionWindowProblem('2026-10-27T20:24:05.270Z','2026-10-30T01:15:37.015Z',{now});
  assert.equal(issue.code,'TIME_DURATION');assert.equal(issue.durationMs,190291745);assert.match(issue.message,/52 h 51 min 32 s.*24 hours.*split/);
});
