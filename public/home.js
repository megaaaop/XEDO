// Preserve shared dashboard links when arriving at the new Home page.
const dashboardPages = new Set(['satellite', 'incidents', 'surveys', 'planner', 'tracking', 'monitor', 'results', 'settings', 'ai']);
function openLegacyDashboardLink() {
  if (dashboardPages.has(location.hash.slice(1))) location.replace('/dashboard.html' + location.search + location.hash);
}
openLegacyDashboardLink();
window.addEventListener('hashchange', openLegacyDashboardLink);

// Explicit navigation also works inside the embedded presentation browser.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  location.assign(link.href);
});
