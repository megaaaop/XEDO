import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializePlanningHelp} from '../src/planning-help.js';
import {planningHelpTopics} from '../src/planning-help-content.js';

// A deliberately small DOM double: it models node moves, connection, event
// propagation, hidden ancestors and native dialog cancellation. No browser,
// HTTP server or external package is required for these controller checks.
class Element {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toLowerCase();
    this.ownerDocument = ownerDocument;
    this.parentElement = null;
    this.childNodes = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.open = false;
    this.scrollTop = 0;
    this.value = '';
    this.checked = false;
    this._text = '';
    this.showCount = 0;
    this.closeCount = 0;
  }
  set id(value) { this.setAttribute('id', value); }
  get id() { return this.getAttribute('id') || ''; }
  set className(value) { this.setAttribute('class', value); }
  get className() { return this.getAttribute('class') || ''; }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  get textContent() { return this._text + this.childNodes.map(node => node.textContent).join(''); }
  get isConnected() {
    let node = this;
    while (node.parentElement) node = node.parentElement;
    return node === this.ownerDocument;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parentElement) node.parentElement.childNodes.splice(node.parentElement.childNodes.indexOf(node), 1);
      node.parentElement = this;
      this.childNodes.push(node);
    }
  }
  replaceChildren(...nodes) {
    for (const child of this.childNodes) child.parentElement = null;
    this.childNodes = [];
    this._text = '';
    this.append(...nodes);
  }
  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith('[')) return this.hasAttribute(selector.slice(1, -1));
    return this.tagName === selector.toLowerCase();
  }
  closest(selector) {
    const selectors = selector.split(',').map(part => part.trim());
    for (let node = this; node; node = node.parentElement) {
      if (selectors.some(part => node.matches(part))) return node;
    }
    return null;
  }
  querySelector(selector) {
    const parts = selector.trim().split(/\s+/);
    for (const child of this.childNodes) {
      if (child.matches(parts.at(-1))) {
        let parent = child.parentElement, index = parts.length - 2;
        while (parent && index >= 0) {
          if (parent.matches(parts[index])) index--;
          parent = parent.parentElement;
        }
        if (index < 0) return child;
      }
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
  addEventListener(type, handler, capture = false) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({handler, capture: capture === true});
  }
  emit(type, options = {}) {
    const event = {
      type, target: this, key: options.key, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.stopped = true; }
    };
    const path = [];
    for (let node = this; node; node = node.parentElement) path.push(node);
    const deliver = (node, capture) => {
      for (const entry of node.listeners.get(type) || []) {
        if (entry.capture === capture) entry.handler(event);
      }
    };
    for (const node of [...path].reverse()) {
      deliver(node, true);
      if (event.stopped) return event;
    }
    for (const node of path) {
      deliver(node, false);
      if (event.stopped || options.bubbles === false) return event;
    }
    return event;
  }
  focus() {
    if (!this.isConnected) return;
    for (let node = this; node; node = node.parentElement) if (node.hidden) return;
    this.ownerDocument.activeElement = this;
  }
  showModal() { this.open = true; this.showCount++; }
  close() { this.open = false; this.closeCount++; this.emit('close', {bubbles: false}); }
  nativeCancel() {
    const event = this.emit('cancel', {bubbles: false});
    if (!event.defaultPrevented) this.close();
    return event;
  }
}

class Document extends Element {
  constructor() { super('#document', null); this.ownerDocument = this; this.activeElement = this; }
  createElement(tag) { return new Element(tag, this); }
}

function fixture() {
  const document = new Document();
  const element = (tag, attributes = {}, parent = document) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  };
  const trigger = (key, parent = document) => {
    const button = element('button', {'data-help': key, type: 'button'}, parent);
    element('span', {}, button).textContent = 'i';
    return button;
  };
  const config = element('button', {id: 'trial-config-open', type: 'button'});
  const area = trigger('area');
  const info = element('dialog', {id: 'trial-info-dialog', 'aria-labelledby': 'trial-info-title'});
  const infoTop = element('div', {class: 'dialog-top'}, info);
  const title = element('h2', {id: 'trial-info-title', tabindex: '-1'}, infoTop);
  const dismiss = element('button', {'data-help-dismiss': '', type: 'button'}, infoTop);
  const content = element('div', {'data-help-content': ''}, info);
  const parent = (name, key) => {
    const dialog = element('dialog', {id: `trial-${name}-dialog`, 'aria-labelledby': `trial-${name}-title`});
    const top = element('div', {class: 'dialog-top'}, dialog);
    element('h2', {id: `trial-${name}-title`}, top);
    const close = element('button', {type: 'button'}, top);
    const body = element('div', {class: 'trial-dialog-body'}, dialog);
    const form = element('form', {}, body);
    const input = element('input', {name: 'flight.altitudeM'}, form);
    input.value = '57.5';
    const checkbox = element('input', {type: 'checkbox'}, form);
    checkbox.checked = true;
    const help = trigger(key, form);
    const output = element('div', {}, body);
    output.textContent = 'Existing result: 1.43 km';
    return {dialog, body, form, input, checkbox, help, output, close};
  };
  const settings = parent('settings', 'flight');
  const results = parent('results', 'oil');
  return {document, element, trigger, config, area, info, title, content, dismiss, settings, results};
}

test('Main information opens through a nested icon click and closes with focus returned to the trigger', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document);
  f.area.focus();
  const event = f.area.childNodes[0].emit('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.info.open, true);
  assert.equal(f.info.showCount, 1);
  assert.equal(controller.isOpen(), true);
  assert.equal(f.title.textContent, planningHelpTopics.area.title);
  assert.match(f.content.textContent, /3–120/);
  assert.equal(f.document.activeElement, f.title);
  f.dismiss.emit('click');
  assert.equal(controller.isOpen(), false);
  assert.equal(f.info.open, false);
  assert.equal(f.document.activeElement, f.area);
});

test('Main native cancellation closes only information and a removed opener falls back to Mission settings', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document);
  controller.open('map', f.area);
  const cancel = f.info.nativeCancel();
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(f.info.closeCount, 1);
  assert.equal(controller.isOpen(), false);
  assert.equal(f.document.activeElement, f.area);
  const temporary = f.trigger('trial');
  controller.open('trial', temporary);
  f.document.childNodes.splice(f.document.childNodes.indexOf(temporary), 1);
  temporary.parentElement = null;
  controller.close();
  assert.equal(f.document.activeElement, f.config);
});

test('Settings information preserves the input subtree, values, parent dialog and scroll; Back restores its title and focus', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document), s = f.settings;
  s.dialog.showModal(); s.dialog.scrollTop = 123; s.help.focus();
  controller.open('flight', s.help);
  const original = s.dialog.querySelector('.trial-help-original'), panel = s.dialog.querySelector('.trial-help-panel');
  assert.equal(s.dialog.open, true);
  assert.equal(s.dialog.showCount, 1);
  assert.equal(f.info.open, false);
  assert.equal(original.hidden, true);
  assert.equal(panel.hidden, false);
  assert.equal(s.dialog.getAttribute('aria-labelledby'), 'trial-settings-dialog-help-title');
  assert.equal(s.dialog.scrollTop, 0);
  assert.equal(s.form.isConnected, true);
  assert.equal(s.input.value, '57.5');
  assert.equal(s.checkbox.checked, true);
  panel.querySelector('[data-help-back]').emit('click');
  assert.equal(s.dialog.open, true);
  assert.equal(original.hidden, false);
  assert.equal(panel.hidden, true);
  assert.equal(s.dialog.getAttribute('aria-labelledby'), 'trial-settings-title');
  assert.equal(s.dialog.scrollTop, 123);
  assert.equal(f.document.activeElement, s.help);
  assert.equal(s.form.childNodes[0], s.input);
  assert.equal(s.input.value, '57.5');
  assert.equal(s.checkbox.checked, true);
  assert.equal(controller.isOpen(), false);
});

test('Escape and native dialog cancellation leave settings open and consume only its information subview', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document), s = f.settings;
  s.dialog.showModal();
  controller.open('drift', s.help);
  let escapesAtWindow = 0;
  f.document.addEventListener('keydown', () => escapesAtWindow++);
  const escape = s.dialog.querySelector('.trial-help-panel h2').emit('keydown', {key: 'Escape'});
  assert.equal(escape.defaultPrevented, true);
  assert.equal(escape.stopped, true);
  assert.equal(escapesAtWindow, 0);
  assert.equal(s.dialog.open, true);
  assert.equal(controller.isOpen(), false);
  assert.equal(f.document.activeElement, s.help);
  controller.open('export', s.help);
  const cancel = s.dialog.nativeCancel();
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(s.dialog.open, true);
  assert.equal(s.dialog.closeCount, 0);
  assert.equal(controller.isOpen(), false);
  assert.equal(f.document.activeElement, s.help);
});

test('A changed result remains intact and a removed trigger returns focus to the stable calculations close button', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document), r = f.results;
  r.dialog.showModal();
  const dynamic = f.trigger('oil', r.output);
  dynamic.emit('click');
  r.output.replaceChildren();
  r.output.textContent = 'Updated result: ~3.8–11.3 kg';
  assert.equal(dynamic.isConnected, false);
  r.dialog.querySelector('[data-help-back]').emit('click');
  assert.equal(r.dialog.open, true);
  assert.equal(r.output.textContent, 'Updated result: ~3.8–11.3 kg');
  assert.equal(f.document.activeElement, r.close);
  const replacement = f.trigger('oil', r.output);
  replacement.emit('click');
  assert.equal(controller.isOpen(), true);
  assert.match(r.dialog.querySelector('.trial-help-panel').textContent, /Oil & capsule model/);
  controller.close();
  assert.equal(f.document.activeElement, replacement);
});

test('Unknown topics are harmless, initialization is idempotent and help never emits form events or contacts a service', t => {
  const f = fixture(), first = initializePlanningHelp(f.document), listenerCounts = new Map([...f.document.listeners].map(([key, value]) => [key, value.length]));
  const second = initializePlanningHelp(f.document);
  assert.equal(first, second);
  for (const [key, count] of listenerCounts) assert.equal(f.document.listeners.get(key).length, count);
  let requests = 0, formEvents = 0;
  t.mock.method(globalThis, 'fetch', () => { requests++; throw Error('Help cannot request a service.'); });
  for (const event of ['input', 'change', 'submit']) f.document.addEventListener(event, () => formEvents++);
  assert.equal(first.open('not-a-topic', f.area), false);
  assert.equal(first.open('__proto__', f.area), false);
  assert.equal(first.isOpen(), false);
  f.settings.dialog.showModal();
  for (const key of ['drift', 'flight', 'export', 'oil', 'snapshots']) {
    assert.equal(first.open(key, f.settings.help), true);
    first.close();
  }
  assert.equal(requests, 0);
  assert.equal(formEvents, 0);
  assert.equal(f.settings.input.value, '57.5');
  assert.equal(f.settings.checkbox.checked, true);
  assert.equal(f.settings.dialog.open, true);
});

test('Closing the parent while information is open restores its original view for the next opening', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document), s = f.settings;
  s.dialog.showModal();
  controller.open('snapshots', s.help);
  s.dialog.close();
  assert.equal(controller.isOpen(), false);
  assert.equal(s.dialog.querySelector('.trial-help-original').hidden, false);
  assert.equal(s.dialog.querySelector('.trial-help-panel').hidden, true);
  assert.equal(s.dialog.getAttribute('aria-labelledby'), 'trial-settings-title');
  s.dialog.showModal();
  assert.equal(s.input.value, '57.5');
});

test('The information close-parent action closes settings and leaves its form ready for reopening', () => {
  const f = fixture(), controller = initializePlanningHelp(f.document), s = f.settings;
  s.dialog.showModal();
  controller.open('export', s.help);
  s.dialog.querySelector('[data-help-close-parent]').emit('click');
  assert.equal(s.dialog.open, false);
  assert.equal(s.dialog.closeCount, 1);
  assert.equal(controller.isOpen(), false);
  assert.equal(s.dialog.querySelector('.trial-help-original').hidden, false);
  assert.equal(s.dialog.querySelector('.trial-help-panel').hidden, true);
  assert.equal(s.dialog.getAttribute('aria-labelledby'), 'trial-settings-title');
  assert.equal(s.input.value, '57.5');
});

test('Planner markup keeps working stage/calculation targets and every information action has a known topic and button type', async () => {
  const html = await readFile(new URL('../public/planning.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Markup IDs must remain unique for querySelector bindings.');
  for (const id of ['trial-step-1', 'trial-step-2', 'trial-step-3', 'trial-image-status', 'trial-image-date', 'trial-image-kind', 'trial-engine-status', 'trial-live', 'trial-error', 'trial-config-close', 'trial-results-close']) assert(ids.includes(id), id);
  assert.equal(ids.filter(id => /^trial-step-\d+$/.test(id)).length, 3);
  for (const name of ['drift', 'flight', 'export', 'oil']) {
    assert(ids.includes(`trial-${name}-panel`), `${name} settings must remain available`);
    assert(ids.includes(`${name}-result`), `${name} calculation results must remain available`);
  }
  const buttons = [...html.matchAll(/<button\b[^>]*\bdata-help="([^"]+)"[^>]*>/g)];
  assert(buttons.length >= 9);
  for (const [markup, key] of buttons) {
    assert(Object.hasOwn(planningHelpTopics, key), key);
    assert.match(markup, /\btype="button"/);
  }
});
