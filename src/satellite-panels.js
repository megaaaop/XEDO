export function initSatellitePanels() {
  const dialog = document.querySelector('#satellite-dialog');
  const title = document.querySelector('#satellite-dialog-title');
  const feedback = document.querySelector('#satellite-dialog-feedback');
  const buttons = [...document.querySelectorAll('[data-satellite-dialog]')];
  const sections = {scenes:document.querySelector('#satellite-scenes'), details:document.querySelector('#satellite-details')};
  function open(mode) {
    if (!sections[mode]) return;
    title.textContent = mode === 'scenes' ? 'Search results' : 'Image details';
    for (const [name, section] of Object.entries(sections)) section.hidden = name !== mode;
    feedback.hidden = true;
    buttons.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.satelliteDialog === mode)));
    document.body.classList.remove('menu-open');
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-satellite-dialog]');
    if (trigger) open(trigger.dataset.satelliteDialog);
  });
  document.querySelector('#satellite-dialog-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => buttons.forEach(button => button.setAttribute('aria-expanded', 'false')));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  return {open, close:() => dialog.close(), feedback(message) {feedback.textContent = message;feedback.hidden = false;}};
}
