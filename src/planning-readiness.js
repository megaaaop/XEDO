import {setViewProperty, setViewAttribute} from './planning-view.js';

const ROWS = [
  ['home', 'Launch / return point'],
  ['schedule', 'Takeoff schedule'],
  ['terrain', 'GEE terrain assessment'],
  ['airspace', 'Airspace review'],
];

const STATE_LABELS = {
  ready: 'Ready', review: 'Review needed', unknown: 'Unknown',
  waiting: 'Waiting', blocked: 'Blocked', estimated: 'Estimated',
};

// This view never approves a mission. Its only write is an explicit user action
// sent to the controller; all displayed status comes back from getState().
export function initializePlanningReadiness({root = globalThis.document, getState = () => ({}), onAction = () => {}} = {}) {
  const doc = root?.ownerDocument || root;
  if (!doc?.createElement || !root?.querySelector) return {render() {}, dispose() {}};
  const find = id => root.querySelector(`#${id}`);
  const open = find('trial-readiness-open');
  const dialog = find('trial-readiness-dialog');
  const close = find('trial-readiness-dialog-close');
  const inline = find('trial-readiness-inline');
  const dialogList = find('trial-readiness-dialog-list');
  const reasons = find('trial-download-reasons');
  const listeners = [], views = [];
  let disposed = false;

  function element(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function listen(node, name, handler) {
    if (!node) return;
    node.addEventListener(name, handler);
    listeners.push(() => node.removeEventListener(name, handler));
  }
  const setAttribute = setViewAttribute;

  function makeRow(id, title) {
    const node = element('div', 'trial-readiness-row');
    node.dataset.readinessRow = id;
    node.setAttribute('role', 'listitem');
    const heading = element('div', 'trial-readiness-row-heading');
    const label = element('strong', 'trial-readiness-title', title);
    const status = element('span', 'trial-readiness-state');
    const detail = element('p', 'trial-readiness-detail');
    heading.append(label, status);
    node.append(heading, detail);
    let action = null, checkbox = null, checkText=null;
    if (id === 'airspace') {
      const checkLabel = element('label', 'trial-readiness-check');
      checkbox = element('input');
      checkbox.type = 'checkbox';
      const text = element('span', '', 'I have reviewed the route and airspace restrictions');
      checkText=text;
      checkLabel.append(checkbox, text);
      node.append(checkLabel);
      listen(checkbox, 'change', () => onAction('airspace-toggle', checkbox.checked));
    } else {
      action = element('button', 'trial-readiness-action');
      action.type = 'button';
      listen(action, 'click', () => onAction(id));
      node.append(action);
    }
    return {node, label, status, detail, action, checkbox,checkText};
  }

  for (const container of [inline, dialogList]) {
    if (!container) continue;
    container.setAttribute('role', 'list');
    const rows = new Map();
    for (const [id, title] of ROWS) {
      const view = makeRow(id, title);
      rows.set(id, view);
      container.append(view.node);
    }
    views.push(rows);
  }

  let headerIcon, headerText, headerCount, reasonsTitle, reasonsList;
  if (open) {
    open.type = 'button';
    open.className += ' trial-readiness-open';
    headerIcon = element('span', 'trial-readiness-icon', '!');
    headerIcon.setAttribute('aria-hidden', 'true');
    headerText = element('span', '', 'Flight readiness');
    headerCount = element('span', 'trial-readiness-count', '0/4');
    open.replaceChildren(headerIcon, headerText, headerCount);
    setAttribute(open, 'aria-haspopup', 'dialog');
    setAttribute(open, 'aria-expanded', 'false');
    if (dialog?.id) setAttribute(open, 'aria-controls', dialog.id);
  }
  if (reasons) {
    reasonsTitle = element('strong', '', 'Before download');
    reasonsList = element('ul', 'trial-readiness-reasons');
    reasons.append(reasonsTitle, reasonsList);
    // The controller decides when to announce a changed calculation. This text
    // remains available to a screen reader without repeatedly interrupting it.
    reasons.setAttribute('role', 'note');
    const allChecks=element('button','button quiet','View all checks');allChecks.type='button';
    listen(allChecks,'click',()=>onAction('checks'));reasons.append(allChecks);
  }

  function finishDialog() {
    setAttribute(open, 'aria-expanded', 'false');
    // An action may already have focused the map or opened Mission settings.
    // Do not pull that focus back to the header when the close event arrives.
    if (!doc.activeElement || doc.activeElement === doc.body || dialog?.contains?.(doc.activeElement)) open?.focus?.({preventScroll: true});
  }
  listen(open, 'click', () => {
    render();
    if (!dialog || dialog.open) return;
    dialog.showModal?.();
    setAttribute(open, 'aria-expanded', String(Boolean(dialog.open)));
  });
  listen(close, 'click', () => { dialog?.close?.(); finishDialog(); });
  listen(dialog, 'close', finishDialog);

  function render(suppliedValue) {
    if (disposed) return;
    const value = suppliedValue || getState() || {};
    const supplied = new Map((Array.isArray(value.rows) ? value.rows : []).map(row => [row.id, row]));
    const rows = ROWS.map(([id, title]) => {
      const row = supplied.get(id) || {};
      return {id, title: row.title || title, state: Object.hasOwn(STATE_LABELS, row.state) ? row.state : 'waiting', detail: row.detail || '', actionLabel: row.actionLabel || ''};
    });
    const count = rows.filter(row => row.state === 'ready').length;
    const reference=value.purpose==='planning_reference';
    const blocked = rows.some(row => row.state === 'blocked');
    const complete = (reference||count === ROWS.length) && value.canExport === true;
    const state = blocked || (count === ROWS.length && !complete) ? 'blocked' : complete ? 'ready' : 'review';
    if (open) {
      setViewProperty(open.dataset, 'readiness', state);
      setViewProperty(headerIcon, 'textContent', state === 'ready' ? '✓' : state === 'blocked' ? '×' : '!');
      setViewProperty(headerCount, 'textContent', `${count}/${ROWS.length}`);
      setViewProperty(headerText,'textContent',reference?'Plan readiness':'Flight readiness');
      if(reference)setViewProperty(headerCount,'textContent',complete?'File ready':'Check inputs');
      setAttribute(open, 'aria-label', reference?`Plan readiness: ${STATE_LABELS[state]}. Surface model: ${STATE_LABELS[rows.find(row=>row.id==='terrain').state]}.`:`Flight readiness: ${count} of ${ROWS.length} ready. ${STATE_LABELS[state]}.`);
    }
    for (const group of views) {
      for (const row of rows) {
        const view = group.get(row.id);
        setViewProperty(view.node.dataset, 'state', row.state);
        setViewProperty(view.label, 'textContent', row.title);
        setViewProperty(view.status, 'textContent', STATE_LABELS[row.state]);
        setViewProperty(view.detail, 'textContent', row.detail);
        setViewProperty(view.detail, 'hidden', !row.detail);
        if (view.checkbox) {
          setViewProperty(view.checkText,'textContent',reference?'I reviewed the planning assumptions, route and terrain findings':'I have reviewed the route and airspace restrictions');
          setViewProperty(view.checkbox, 'checked', row.state === 'ready');
          setViewProperty(view.checkbox, 'disabled', Boolean(value.working));
        }
        if (view.action) {
          setViewProperty(view.action, 'textContent', row.actionLabel);
          setViewProperty(view.action, 'hidden', !row.actionLabel);
          setViewProperty(view.action, 'disabled', Boolean(value.working));
          setAttribute(view.action, 'aria-label', `${row.actionLabel}: ${row.title}`);
        }
      }
    }
    if (reasons) {
      const items = Array.isArray(value.blockingReasons)
        ? [...new Set(value.blockingReasons.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))]
        : [];
      setViewProperty(reasons, 'hidden', value.canExport === true || items.length === 0);
      while (reasonsList.children.length > items.length) reasonsList.lastElementChild.remove();
      items.forEach((text, index) => {
        let item = reasonsList.children[index];
        if (!item) { item = element('li'); reasonsList.append(item); }
        setViewProperty(item, 'textContent', text);
      });
    }
  }

  render();
  return {
    render,
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.forEach(remove => remove());
    },
  };
}
