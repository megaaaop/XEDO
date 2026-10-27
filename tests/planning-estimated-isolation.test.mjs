import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ESTIMATED_DEMO_PROFILE} from '../src/planning-estimated-demo.js';
import {createPlanningSchedule} from '../src/planning-schedule.js';

const plain=value=>JSON.parse(JSON.stringify(value));
// VM callers and imported modules have separate Object prototypes. JSON is the
// real transport boundary for saved inputs and preserves all tested metadata.
function scheduleFactory(options){
  const helper=createPlanningSchedule(options);
  return {...helper,restore:(metadata,fields)=>helper.restore(metadata==null?metadata:plain(metadata),fields==null?fields:plain(fields)),setManual:fields=>helper.setManual(plain(fields))};
}

const source = await readFile(new URL('../src/planning-trial-client.js', import.meta.url), 'utf8');
function production(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production controller extraction must resolve');
  return source.slice(from, to);
}
const methods = [
  production('function api(', '\nfunction drawMap('),
  production('function resetSurvey(', '\nasync function workspaceAPI('),
  production('async function surveySatellite(', '\nasync function prepareMission('),
  production('async function prepareMission(', '\nfunction openSettings(')
].join('\n');

test('Demo rejects direct live image search/load actions, including stale retry handlers', async () => {
  const context=vm.createContext({geeHosted:true,example:true});
  vm.runInContext(production('async function searchSatellite(', '\nasync function loadGEEScene(')+production('async function loadGEEScene(', '\nasync function surveySatellite('),context);
  // No UI, transport or workspace adapter is available to these demo actions.
  await context.searchSatellite({autoLoad:true});
  await context.loadGEEScene();
});

// Execute the production controller methods with transport/renderer spies.
// These checks need no browser, credentials, real satellite or database access.
function harness(overrides = {}) {
  const events = [], nodes = new Map(), timers = new Set();
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      value: '', textContent: '', innerHTML: '', href: '',
      click() { events.push(['click', selector]); }
    });
    return nodes.get(selector);
  }
  const preview = {
    image: {kind: 'preview'}, scene: {id: 'stored-proof'},
    geometry: {type: 'Polygon', coordinates: [[[101.22, 12.62], [101.222, 12.62], [101.222, 12.621], [101.22, 12.62]]]}
  };
  const context = vm.createContext({
    AbortController, DOMException, Date, JSON, encodeURIComponent,
    example: true, geeHosted: true, fileMode: false, runtime: {standalone: false, localFile: false, label: 'Trial'},
    geometry: structuredClone(preview.geometry), surveyId: null, review: null, webMission: null,
    draw: null, working: false, satelliteBusy: false, currentStep: 1,
    satelliteToken: 0, satelliteAbort: null, satelliteTimer: null, satelliteExpiryTimer: null,
    satelliteRaster: null, satelliteScenes: [], satelliteSearchGeometry: null,
    lastSurveyArchived: false, lastSatelliteAction: 'search', selectHome: false,
    schedule: scheduleFactory(), routePoints: [], environmentUI: null, geospatialUI: null,
    groundController: {clear(){events.push(['clear-3d-ground']);}},
    syncScheduleFields(patch) { events.push(['schedule', patch]); return true; },
    $: node,
    setTimeout(fn, ms) { const timer = {fn, ms}; timers.add(timer); return timer; },
    clearTimeout(timer) { timers.delete(timer); },
    map: {removeLayer(layer) { events.push(['remove-layer', layer]); }},
    stopDraw() { events.push(['stop-draw']); },
    error(message = '') { events.push(['error', message]); },
    invalidate() { events.push(['invalidate']); },
    refreshFlow() { events.push(['refresh']); },
    announce(message) { events.push(['announce', message]); },
    setWorking(value) { context.working = value; events.push(['working', value]); },
    queueCalculations() { events.push(['calculate']); },
    requestPlanningTrial(runtime, path, options) { events.push(['trial-api', runtime, path, options]); return Promise.resolve({ok: true}); },
    searchSatellite(options) { events.push(['gee-search', options]); return Promise.resolve('searched'); },
    selectArchivedSatellite(geometry) { events.push(['stored-selection', geometry]); return structuredClone(preview); },
    selectSavedSatellite() { throw Error('Unexpected saved survey lookup in isolated demo'); },
    selectSceneSatellite() { throw Error('Unexpected workspace source in isolated demo'); },
    workspaceAPI() { throw Error('Unexpected workspace API in isolated demo'); },
    QuickMission: class { constructor() { throw Error('Unexpected database-backed mission in isolated demo'); } },
    renewGEEMap() { throw Error('Unexpected live GEE map in isolated demo'); },
    async reviewSatellite(selection, token, signal) {
      events.push(['review', selection, token, signal]);
      context.review = {...selection, ready: true};
    },
    ...overrides
  });
  vm.runInContext(methods, context);
  return {context, events, nodes, timers, preview};
}

test('Estimated demo routes calculations and exports to local adapters without changing real runtime', async () => {
  const {context, events} = harness();
  const original = {...context.runtime};
  await context.api('', {method: 'POST', body: '{}'});
  await context.api('/export', {method: 'POST', body: '{}'});
  const demoCalls = events.filter(event => event[0] === 'trial-api');
  assert.equal(demoCalls.length, 2);
  assert.ok(demoCalls.every(event => event[1].standalone === true));
  assert.deepEqual({...context.runtime}, original);
  context.example = false;
  await context.api('', {method: 'POST', body: '{}'});
  assert.equal(events.at(-1)[1], context.runtime);
  assert.equal(events.at(-1)[1].standalone, false);
});

test('Explicit saved-source lookup keeps the original adapter so snapshot import can verify its source', async () => {
  const {context, events} = harness();
  await context.api('/source?survey=SUR_example');
  assert.equal(events.at(-1)[1], context.runtime);
  assert.equal(events.at(-1)[2], '/source?survey=SUR_example');
});

test('Hosted demo reviews stored imagery and prepares step three without live imagery or workspace mutations', async () => {
  const {context, events, timers} = harness();
  await context.surveySatellite();
  assert.equal(context.currentStep, 2);
  assert.equal(context.review.ready, true);
  assert.equal(context.review.image.kind, 'preview');
  assert.equal(context.webMission, null);
  assert.equal(context.surveyId, null);
  assert.equal(context.satelliteBusy, false);
  assert.equal(timers.size, 0);
  assert.equal(events.filter(event => event[0] === 'stored-selection').length, 1);
  assert.equal(events.filter(event => event[0] === 'gee-search').length, 0);
  // Even a stale object must not let demo preparation persist a real mission.
  context.webMission = {async prepare() { throw Error('Demo must not persist a real mission'); }};
  await context.prepareMission();
  assert.equal(context.currentStep, 3);
  assert.equal(context.surveyId, null);
  assert.equal(context.satelliteBusy, false);
  assert.equal(events.filter(event => event[0] === 'calculate').length, 1);
  const scheduling=events.filter(event=>event[0]==='schedule');
  assert.equal(scheduling.length,1);
  assert.equal(scheduling[0][1].schedule.mode,'automatic');
  assert.equal(scheduling[0][1].schedule.pending,true);
  assert.equal(Date.parse(scheduling[0][1].plannedEndAt)-Date.parse(scheduling[0][1].plannedTakeoffAt),1800000);
});

test('Non-demo hosted satellite survey still delegates to the existing GEE search', async () => {
  const {context, events} = harness({example: false});
  assert.equal(await context.surveySatellite(), 'searched');
  const calls = events.filter(event => event[0] === 'gee-search');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].autoLoad, true);
  assert.equal(events.filter(event => event[0] === 'stored-selection').length, 0);
  assert.equal(context.currentStep, 1);
});

test('Non-demo mission preparation still freezes the reviewed workspace mission', async () => {
  let persisted = 0;
  const {context, events, nodes, preview} = harness({example: false});
  context.review = {...preview, ready: true};
  context.webMission = {async prepare() { persisted++; return {surveyId: 'SUR_real', incidentId: 'INC_real'}; }};
  await context.prepareMission();
  assert.equal(persisted, 1);
  assert.equal(context.surveyId, 'SUR_real');
  assert.equal(context.currentStep, 3);
  assert.equal(nodes.get('#trial-survey').value, 'SUR_real');
  assert.match(nodes.get('#trial-back').href, /survey=SUR_real/);
  assert.equal(events.filter(event => event[0] === 'calculate').length, 1);
});

test('Changing area or leaving demo cancels pending imagery and prevents a late review from reviving step two', async () => {
  const {context, timers} = harness();
  let finish, imageSignal;
  context.reviewSatellite = async (_selection, _token, signal) => {
    imageSignal = signal;
    await new Promise(resolve => { finish = resolve; });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    throw Error('A cancelled image must not complete');
  };
  const pending = context.surveySatellite();
  assert.equal(context.currentStep, 2);
  assert.equal(context.satelliteBusy, true);
  assert.equal(imageSignal.aborted, false);
  context.resetSurvey();
  context.example = false;
  finish();
  await pending;
  assert.equal(imageSignal.aborted, true);
  assert.equal(context.review, null);
  assert.equal(context.currentStep, 1);
  assert.equal(context.satelliteBusy, false);
  assert.equal(context.satelliteAbort, null);
  assert.equal(timers.size, 0);
});

test('Failed real-source snapshot lookup keeps the current demo mode and original mission backup', async () => {
  const backup = {controls: [{id: 'f-flight-powerW', value: '400'}]}, errors = [];
  const target = {value: 'saved.json', files: [{size: 1000, async text() {
    return JSON.stringify({schema_version: 'xedo-planning-trial/1', inputs: {surveyId: 'SUR_missing'}});
  }}]};
  const restoreControl = {};
  const context = vm.createContext({
    ESTIMATED_DEMO_PROFILE, JSON, createPlanningSchedule:scheduleFactory, revision: 0, fileMode: false,
    estimatedDemo: true, example: true, missionBackup: backup,
    $: () => restoreControl,
    compatibleInputs: value => value,
    stopDraw() {},
    async loadSurvey() { throw Error('Saved survey not found'); },
    error(message) { errors.push(message); },
    // Any following state-changing action is unexpected after the lookup fails.
    captureMission() { throw Error('Unexpected backup replacement'); },
    restoreInputs() { throw Error('Unexpected input replacement'); }
  });
  vm.runInContext(production("$('#trial-restore').onchange=", '\nfunction changed('), context);
  await restoreControl.onchange({target});
  assert.deepEqual(errors, ['Saved survey not found']);
  assert.equal(context.example, true);
  assert.equal(context.estimatedDemo, true);
  assert.equal(context.missionBackup, backup);
  assert.equal(target.value, '');
});
