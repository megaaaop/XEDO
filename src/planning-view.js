// Keep periodic status checks from rewriting the same DOM during page scrolling.
// These helpers compare live values, so user-edited controls are still reconciled
// against the controller rather than an out-of-date render cache.
export function setViewProperty(node, name, value) {
  if (!node || node[name] === value) return false;
  node[name] = value;
  return true;
}

export function setViewAttribute(node, name, value) {
  if (!node) return false;
  const next = String(value);
  if (node.getAttribute(name) === next) return false;
  node.setAttribute(name, next);
  return true;
}
