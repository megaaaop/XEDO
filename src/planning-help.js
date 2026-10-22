import {planningHelpTopics} from './planning-help-content.js';

const instances = new WeakMap();

// Help only changes its own presentation. It never dispatches form events or
// calls the mission, calculation, source or device APIs.
export function initializePlanningHelp(root = document) {
  if (instances.has(root)) return instances.get(root);
  const dialog = root.querySelector('#trial-info-dialog');
  const title = root.querySelector('#trial-info-title');
  const content = dialog?.querySelector('[data-help-content]');
  if (!dialog || !title || !content) throw new Error('Planning information panel is missing.');
  const views = new Map();
  let current = null;

  function render(topic, heading, body) {
    heading.textContent = topic.title;
    body.replaceChildren();
    for (const text of topic.paragraphs) {
      const p = root.createElement('p');
      p.textContent = text;
      body.append(p);
    }
    if (topic.bullets.length) {
      const list = root.createElement('ul');
      for (const text of topic.bullets) {
        const item = root.createElement('li');
        item.textContent = text;
        list.append(item);
      }
      body.append(list);
    }
    for (const text of topic.formulas) {
      const p = root.createElement('p');
      p.className = 'trial-help-formula';
      p.textContent = text;
      body.append(p);
    }
  }

  function focusBack(trigger, fallback) {
    const target = trigger?.isConnected ? trigger : fallback;
    target?.focus({preventScroll: true});
  }

  function restoreParent(restoreFocus = true) {
    if (current?.kind !== 'parent') return;
    const {parent, view, trigger, scrollTop, labelledBy} = current;
    current = null;
    view.panel.hidden = true;
    view.original.hidden = false;
    if (labelledBy === null) parent.removeAttribute('aria-labelledby');
    else parent.setAttribute('aria-labelledby', labelledBy);
    parent.scrollTop = scrollTop;
    if (restoreFocus && parent.open) focusBack(trigger, view.original.querySelector('.dialog-top button'));
  }

  function finishMain() {
    if (current?.kind !== 'main') return;
    const {trigger} = current;
    current = null;
    focusBack(trigger, root.querySelector('#trial-config-open'));
  }

  function closeInformation() {
    if (current?.kind === 'parent') restoreParent();
    else if (current?.kind === 'main') {
      dialog.close();
      finishMain();
    }
  }

  function parentView(parent) {
    if (views.has(parent)) return views.get(parent);
    const original = root.createElement('div');
    original.className = 'trial-help-original';
    original.append(...Array.from(parent.childNodes));
    const panel = root.createElement('section');
    panel.className = 'trial-help-panel';
    panel.hidden = true;
    const top = root.createElement('div');
    top.className = 'dialog-top trial-help-navigation';
    const back = root.createElement('button');
    back.type = 'button';
    back.className = 'button quiet';
    back.setAttribute('data-help-back', '');
    back.textContent = parent.id === 'trial-settings-dialog' ? '← Back to settings' : '← Back to calculations';
    const close = root.createElement('button');
    close.type = 'button';
    close.className = 'icon-button';
    close.setAttribute('data-help-close-parent', '');
    close.setAttribute('aria-label', parent.id === 'trial-settings-dialog' ? 'Close mission settings' : 'Close calculation details');
    close.textContent = '×';
    top.append(back, close);
    const body = root.createElement('div');
    body.className = 'trial-information-content';
    const heading = root.createElement('h2');
    heading.id = parent.id + '-help-title';
    heading.tabIndex = -1;
    const text = root.createElement('div');
    body.append(heading, text);
    panel.append(top, body);
    parent.append(original, panel);
    const view = {original, panel, heading, text};
    views.set(parent, view);
    return view;
  }

  function open(key, trigger = root.activeElement) {
    const topic = Object.hasOwn(planningHelpTopics, key) ? planningHelpTopics[key] : null;
    if (!topic) return false;
    const parent = trigger?.closest('dialog');
    if (parent?.open && parent !== dialog) {
      if (current?.kind === 'parent') restoreParent(false);
      const view = parentView(parent);
      current = {kind: 'parent', parent, dialog: parent, view, trigger, scrollTop: parent.scrollTop, labelledBy: parent.getAttribute('aria-labelledby')};
      render(topic, view.heading, view.text);
      view.original.hidden = true;
      view.panel.hidden = false;
      parent.setAttribute('aria-labelledby', view.heading.id);
      parent.scrollTop = 0;
      view.heading.focus({preventScroll: true});
    } else {
      if (current?.kind === 'parent') restoreParent(false);
      current = {kind: 'main', dialog, trigger};
      render(topic, title, content);
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      title.focus({preventScroll: true});
    }
    return true;
  }

  function click(event) {
    const target = event.target?.closest?.('[data-help], [data-help-back], [data-help-dismiss], [data-help-close-parent]');
    if (!target) return;
    event.preventDefault();
    if (target.hasAttribute('data-help')) open(target.getAttribute('data-help'), target);
    else if (target.hasAttribute('data-help-close-parent') && current?.kind === 'parent') {
      const parent = current.parent;
      restoreParent(false);
      parent.close();
    } else closeInformation();
  }

  function keydown(event) {
    if (event.key !== 'Escape' || !current?.dialog.open) return;
    event.preventDefault();
    event.stopPropagation();
    closeInformation();
  }

  function cancel(event) {
    if (!current || event.target !== current.dialog) return;
    event.preventDefault();
    closeInformation();
  }

  function parentClosed(event) {
    if (current?.kind === 'parent' && event.target === current.parent) restoreParent(false);
  }

  root.addEventListener('click', click);
  root.addEventListener('keydown', keydown, true);
  dialog.addEventListener('close', finishMain);
  dialog.addEventListener('cancel', cancel);
  const parents = ['#trial-settings-dialog', '#trial-results-dialog'].map(id => root.querySelector(id)).filter(Boolean);
  for (const parent of parents) {
    parent.addEventListener('cancel', cancel);
    parent.addEventListener('close', parentClosed);
  }
  const controller = {open, close: closeInformation, isOpen: () => !!current?.dialog.open};
  instances.set(root, controller);
  return controller;
}
