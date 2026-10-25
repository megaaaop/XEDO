import test from 'node:test';
import assert from 'node:assert/strict';
import {initializePlanningReadiness} from '../src/planning-readiness.js';

function harness({missing = []} = {}) {
  const nodes = [], actions = [];
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = new Map(); this.listeners = new Map(); this.textContent = ''; this.className = ''; this.hidden = false; this.disabled = false; this.checked = false; nodes.push(this); }
    append(...items) { items.forEach(item => { item.parentElement = this; this.children.push(item); }); }
    replaceChildren(...items) { this.children = []; this.append(...items); }
    remove() { this.parentElement.children = this.parentElement.children.filter(item => item !== this); }
    get lastElementChild() { return this.children.at(-1); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name); }
    addEventListener(type, fn) { const listeners = this.listeners.get(type) || new Set(); listeners.add(fn); this.listeners.set(type, listeners); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    emit(type) { for (const fn of this.listeners.get(type) || []) fn({target: this}); }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
    focus() { this.focused = true; }
  }
  for (const id of ['trial-readiness-open', 'trial-readiness-dialog', 'trial-readiness-dialog-close', 'trial-readiness-dialog-list', 'trial-readiness-inline', 'trial-download-reasons']) {
    if (!missing.includes(id)) Object.assign(new Element('div'), {id});
  }
  const node = id => nodes.find(item => item.id === id);
  let state = {rows: [
    {id:'home', title:'Launch / return point', state:'ready', detail:'101.20, 12.60', actionLabel:'Move point'},
    {id:'schedule', title:'Takeoff schedule', state:'ready', detail:'One hour after analysis', actionLabel:'Replan'},
    {id:'terrain', title:'GEE terrain assessment', state:'unknown', detail:'No model samples', actionLabel:'Get terrain'},
    {id:'airspace', title:'Airspace review', state:'review', detail:'Review restrictions'},
  ], canExport:false, blockingReasons:['Check terrain', 'Review airspace', 'Check terrain'], working:false};
  const root = {createElement: tag => new Element(tag), querySelector: selector => node(selector.slice(1))};
  const ui = initializePlanningReadiness({root, getState:() => state, onAction:(...args) => actions.push(args)});
  const row = (id, container='trial-readiness-inline') => node(container).children.find(item => item.dataset.readinessRow === id);
  return {ui, root, node, row, actions, get state() { return state; }, set state(value) { state = value; }};
}

test('Header and four persistent rows show readiness without approving missing data', () => {
  const h = harness();
  assert.equal(h.node('trial-readiness-open').children[2].textContent, '2/4');
  assert.equal(h.node('trial-readiness-open').dataset.readiness, 'review');
  assert.equal(h.row('terrain').children[0].children[1].textContent, 'Unknown');
  assert.equal(h.row('airspace').children[2].children[0].checked, false);
  assert.equal(h.node('trial-download-reasons').children[1].children.length, 2);
  const existing = h.row('home');
  h.state.rows[0].detail = '<script>untrusted</script>';
  h.ui.render();
  assert.equal(h.row('home'), existing);
  assert.equal(existing.children[1].textContent, '<script>untrusted</script>');
  assert.deepEqual(h.actions, []);
  h.ui.dispose();
});

test('Header opens the dialog, close restores trigger focus, and Escape/native close updates state', () => {
  const h = harness();
  h.node('trial-readiness-open').emit('click');
  assert.equal(h.node('trial-readiness-dialog').open, true);
  assert.equal(h.node('trial-readiness-open').getAttribute('aria-expanded'), 'true');
  h.node('trial-readiness-dialog-close').emit('click');
  assert.equal(h.node('trial-readiness-dialog').open, false);
  assert.equal(h.node('trial-readiness-open').focused, true);
  assert.equal(h.node('trial-readiness-open').getAttribute('aria-expanded'), 'false');
  h.node('trial-readiness-open').emit('click');
  h.node('trial-readiness-dialog').close();
  assert.equal(h.node('trial-readiness-open').getAttribute('aria-expanded'), 'false');
  h.ui.dispose();
});

test('Actions emit controller requests and airspace approval comes only from explicit checkbox change', () => {
  const h = harness();
  h.row('home').children[2].emit('click');
  const check = h.row('airspace', 'trial-readiness-dialog-list').children[2].children[0];
  check.checked = true;
  check.emit('change');
  assert.deepEqual(h.actions, [['home'], ['airspace-toggle', true]]);
  h.ui.render();
  assert.equal(check.checked, false, 'Controller state remains the authority until it accepts the review');
  assert.equal(h.row('home').children[2].type, 'button');
  h.state.working = true;
  h.ui.render();
  assert.equal(check.disabled, true);
  assert.equal(h.row('home').children[2].disabled, true);
  assert.equal(h.node('trial-readiness-open').disabled, false);
  h.ui.dispose();
});

test('Closing readiness after an action does not steal focus from the map or a settings field', () => {
  const h = harness();
  const map = {id:'trial-map'}, field = {id:'f-export-plannedTakeoffAt'};
  for (const target of [map, field]) {
    h.node('trial-readiness-open').focused = false;
    h.node('trial-readiness-open').emit('click');
    h.root.activeElement = target;
    h.node('trial-readiness-dialog').close();
    assert.equal(h.node('trial-readiness-open').focused, false);
    assert.equal(h.root.activeElement, target);
    assert.equal(h.node('trial-readiness-open').getAttribute('aria-expanded'), 'false');
  }
  h.ui.dispose();
});

test('Blocked state is red-labelled, successful export is green, and stale reasons are removed', () => {
  const h = harness();
  h.state.rows[1].state = 'blocked';
  h.ui.render();
  assert.equal(h.node('trial-readiness-open').dataset.readiness, 'blocked');
  assert.match(h.node('trial-readiness-open').getAttribute('aria-label'), /Blocked/);
  h.state.rows.forEach(row => { row.state = 'ready'; });
  h.state.canExport = true;
  h.state.blockingReasons = [];
  h.ui.render();
  assert.equal(h.node('trial-readiness-open').dataset.readiness, 'ready');
  assert.equal(h.node('trial-readiness-open').children[2].textContent, '4/4');
  assert.equal(h.node('trial-download-reasons').hidden, true);
  assert.equal(h.node('trial-download-reasons').children[1].children.length, 0);
  h.state.canExport = false;
  h.state.blockingReasons = ['Missing export setting'];
  h.ui.render();
  assert.equal(h.node('trial-readiness-open').dataset.readiness, 'blocked');
  assert.equal(h.node('trial-download-reasons').hidden, false);
  h.ui.dispose();
});

test('Partial/missing markup is safe and dispose removes action handlers', () => {
  const h = harness({missing:['trial-readiness-dialog','trial-readiness-dialog-close','trial-readiness-dialog-list','trial-download-reasons']});
  h.node('trial-readiness-open').emit('click');
  h.ui.dispose();
  h.ui.dispose();
  h.row('home').children[2].emit('click');
  assert.deepEqual(h.actions, []);
  assert.doesNotThrow(() => initializePlanningReadiness({root:null}).render());
});
