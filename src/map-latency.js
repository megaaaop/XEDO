import './map-latency.css';
import {connectionQuality} from './connection-quality.js';

// Shared sampler. Only a successful GEE probe can supply a displayed number.
export function initMapLatency() {
  const panels = [...document.querySelectorAll('[data-map-latency]')];
  const wifi = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 8.5a16 16 0 0 1 20 0M5.5 12a10.5 10.5 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></svg>';
  let activePage = false, timer = null, pending = null;
  let latest = null, measuredAt = null, state = 'waiting';
  let description = 'Checking the GEE connection', intervalMs = 30000;
  for (const panel of panels) {
    panel.className = 'map-latency';
    panel.setAttribute('role', 'img');
    panel.innerHTML = `${wifi}<span><strong data-latency-current>—</strong> ms</span>`;
  }
  const visible = () => activePage && document.visibilityState === 'visible';
  function render() {
    const stale = measuredAt && Date.now() - measuredAt > 90000;
    const offline = !navigator.onLine;
    const value = offline || stale || state !== 'connected' ? null : Math.round(latest);
    const failed = offline || state === 'error';
    const quality = connectionQuality(value, failed);
    const label = failed ? 'Connection failed' : value == null ? 'No measurement available' : quality === 'good' ? 'Good' : quality === 'moderate' ? 'Moderate' : 'Slow';
    const detail = offline ? 'Offline' : stale ? 'The latest reading has expired. Waiting for a new measurement.' : description;
    for (const panel of panels) {
      panel.dataset.quality = quality;
      panel.querySelector('[data-latency-current]').textContent = value == null ? '—' : Math.round(value);
      panel.title = `GEE · ${label} · ${detail}`;
      panel.setAttribute('aria-label', `GEE connection: ${value == null ? 'No ping reading available' : Math.round(value) + ' milliseconds'} · ${label} · ${detail}`);
    }
  }
  function schedule() {
    clearTimeout(timer);
    if (visible() && navigator.onLine && !pending) timer = setTimeout(measure, intervalMs);
  }
  function suspend() {
    clearTimeout(timer);
    pending?.abort();
    pending = null;
    render();
  }
  async function measure() {
    if (!visible() || pending || !navigator.onLine) return;
    clearTimeout(timer);
    const controller = new AbortController();
    pending = controller;
    const deadline = setTimeout(() => controller.abort(), 8000);
    try {
      const nonce = crypto.randomUUID();
      const started = performance.now();
      const response = await fetch('/api/v1/gee/ping?nonce=' + encodeURIComponent(nonce), {
        cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('invalid response');
      const data = await response.json();
      const elapsed = performance.now() - started;
      if (data.service !== 'gee' || data.nonce !== nonce || !['connected', 'not_configured', 'error'].includes(data.state)) throw new Error('invalid probe');
      if (pending !== controller) return;
      state = data.state;
      latest = null;
      measuredAt = Date.now();
      intervalMs = data.state === 'not_configured' ? 60000 : 30000;
      if (data.state === 'connected') {
        if (!Number.isFinite(data.upstream_ms) || data.upstream_ms < 0 || data.measurement !== 'http_round_trip_via_xedo') throw new Error('invalid measurement');
        latest = elapsed;
        description = 'HTTP round trip from the browser through XEDO to GEE and back, including API response time. Image loading time is measured separately.';
      } else description = data.state === 'not_configured' ? 'GEE not connected' : (data.message || 'GEE measurement failed');
    } catch {
      if (pending !== controller) return;
      latest = null;
      state = 'error';
      description = 'GEE measurement failed or did not respond within 8 seconds';
    } finally {
      clearTimeout(deadline);
      if (pending === controller) {
        pending = null;
        render();
        schedule();
      }
    }
  }
  function resume() {
    render();
    if (visible() && navigator.onLine) measure();
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' ? resume() : suspend());
  window.addEventListener('offline', suspend);
  window.addEventListener('online', resume);
  window.addEventListener('pagehide', suspend);
  render();
  return {
    page(page) {
      const wasActive = activePage;
      activePage = ['satellite', 'planner', 'monitor', 'mission'].includes(page);
      if (!activePage) suspend();
      else if (!wasActive) resume();
      else render();
    },
  };
}
