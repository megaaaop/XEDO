// Presentation ownership only. Network/session/revision controllers keep authority.
export function createActionFeedback(onChange = () => {}) {
  let sequence = 0, current = null;
  const publish = () => onChange(current && {...current});
  return {
    get current() { return current && {...current}; },
    begin(action, label, target = null) {
      const token = ++sequence;
      current = {token, action, label, target}; publish(); return token;
    },
    owns(token) { return current?.token === token; },
    update(token, label) {
      if (current?.token !== token) return false;
      current = {...current, label}; publish(); return true;
    },
    end(token) {
      if (current?.token !== token) return false;
      current = null; publish(); return true;
    }
  };
}

export function paintActionButton(button, busy, label, idleLabel) {
  if (!button) return;
  const text = busy ? label : idleLabel;
  if (button.textContent !== text) button.textContent = text;
  const value = String(Boolean(busy));
  if (button.dataset.actionBusy !== value) button.dataset.actionBusy = value;
  if (button.getAttribute('aria-busy') !== value) button.setAttribute('aria-busy', value);
}
