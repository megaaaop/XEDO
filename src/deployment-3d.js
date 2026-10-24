import proj4 from 'proj4';

const TAU = Math.PI * 2;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const pair = value => Array.isArray(value) && value.length >= 2 && finite(value[0]) && finite(value[1]);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const colours = {
  background: '#091923', grid: '#23404e', ink: '#e0f1f5', muted: '#94aeba',
  boundary: '#57c8be', flight: '#eec879', measured: '#66b6e3', ground: '#66b7a4'
};
const distanceLabel = value => value >= 1000 ? `${+(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;

function niceStep(value) {
  const exponent = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  const fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
}

function modelData(plan, context = {}) {
  context ||= {};
  const connected = context.state === 'connected';
  const target = plan?.target?.geometry || plan?.target;
  const geographicRings = target?.type === 'Polygon' ? target.coordinates : [];
  const positions = geographicRings.flat().filter(pair);
  const originPosition = pair(plan?.projection?.originPosition) ? plan.projection.originPosition : positions[0] || [0, 0];
  const longitudeScale = Math.cos(originPosition[1] * Math.PI / 180) * 111319.490793;
  const toLocal = position => {
    if (plan?.projection?.definition && pair(plan.projection.origin)) {
      const projected = proj4('EPSG:4326', plan.projection.definition, position);
      return [projected[0] - plan.projection.origin[0], projected[1] - plan.projection.origin[1]];
    }
    const longitudeDifference = ((position[0] - originPosition[0] + 540) % 360) - 180;
    return [longitudeDifference * longitudeScale, (position[1] - originPosition[1]) * 111319.490793];
  };
  const rings = plan?.localTarget?.type === 'Polygon' ? plan.localTarget.coordinates.map(ring => ring.filter(pair)) : geographicRings.map(ring => ring.filter(pair).map(toLocal));
  const waypoints = (plan?.waypoints || []).map((waypoint, index) => {
    const local = pair(plan?.localWaypoints?.[index]) ? plan.localWaypoints[index] : pair(waypoint.position) ? toLocal(waypoint.position) : null;
    return local ? { ...waypoint, local,
      groundElevationM: connected ? waypoint.groundElevationM : null,
      estimatedAltitudeMSLM: connected ? waypoint.estimatedAltitudeMSLM : null
    } : null;
  }).filter(Boolean);
  const samples = (connected && Array.isArray(context.samples) ? context.samples : []).filter(sample => finite(sample.elevationM) && sample.elevationM >= -12000 && sample.elevationM <= 10000 && (pair(sample.position) || (finite(sample.longitude) && finite(sample.latitude) && Math.abs(sample.longitude) <= 180 && Math.abs(sample.latitude) <= 85))).map(sample => ({
    ...sample, local: toLocal(pair(sample.position) ? sample.position : [sample.longitude, sample.latitude])
  }));
  const groundElevations = [...samples.map(sample => sample.elevationM), ...waypoints.map(waypoint => waypoint.groundElevationM).filter(finite)];
  const terrainAvailable = groundElevations.length > 0;
  const groundReferenceM = terrainAvailable ? Math.min(...groundElevations) : null;
  const completeFlightElevations = groundReferenceM !== null && waypoints.length > 0 && waypoints.every(waypoint => finite(waypoint.estimatedAltitudeMSLM));
  const heightReference = completeFlightElevations ? 'MSL' : 'AGL';
  for (const waypoint of waypoints) waypoint.height = completeFlightElevations
    ? waypoint.estimatedAltitudeMSLM - (groundReferenceM ?? 0)
    : finite(waypoint.altitudeM) ? waypoint.altitudeM : 0;
  for (const sample of samples) sample.height = sample.elevationM - groundReferenceM;
  const points = [...rings.flat(), ...waypoints.map(waypoint => waypoint.local), ...samples.map(sample => sample.local)];
  if (!points.length) return null;
  const minX = Math.min(...points.map(point => point[0]));
  const maxX = Math.max(...points.map(point => point[0]));
  const minY = Math.min(...points.map(point => point[1]));
  const maxY = Math.max(...points.map(point => point[1]));
  const span = Math.max(maxX - minX, maxY - minY, 10);
  const maxHeight = Math.max(1, ...waypoints.map(waypoint => waypoint.height), ...samples.map(sample => sample.height));
  const verticalExaggeration = clamp(Math.round(span * .18 / maxHeight * 10) / 10, 1, 12);
  const description = `Interactive three-dimensional planning preview. ${rings[0]?.length ? rings[0].length - 1 : 0} boundary vertices; ${waypoints.length} route waypoints. ${samples.length} terrain model elevation samples. ${completeFlightElevations ? 'Flight heights use estimated MSL values from sampled ground elevation.' : 'Flight heights illustrate AGL above a flat local reference; terrain clearance is not verified.'} Vertical display scale ${verticalExaggeration} times horizontal scale. Drag to orbit, scroll to zoom, use arrow keys to rotate, plus or minus to zoom, and Home to reset. This is a planning preview; material release is off.`;
  const displayNote = completeFlightElevations
    ? `${samples.length} GEE elevation samples · Estimated MSL heights · Clearance unverified.`
    : `${terrainAvailable ? `${samples.length} GEE elevation samples` : 'No GEE terrain data'} · Flat AGL illustration · Clearance unverified.`;
  return { plan, rings, waypoints, samples, minX, maxX, minY, maxY, centreX: (minX + maxX) / 2, centreY: (minY + maxY) / 2, span, maxHeight, verticalExaggeration, terrainAvailable, groundReferenceM, heightReference, description, displayNote };
}

/** Render-only perspective view. It neither requests data nor sends device commands. */
export function createDeployment3D(canvas) {
  if (!canvas?.getContext) throw new TypeError('A canvas element is required for the 3D planning preview.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser does not support the 3D planning canvas.');
  const previousTouchAction = canvas.style.touchAction;
  const previousCursor = canvas.style.cursor;
  const previousTabIndex = canvas.getAttribute('tabindex');
  const previousRole = canvas.getAttribute('role');
  const previousLabel = canvas.getAttribute('aria-label');
  const previousShortcuts = canvas.getAttribute('aria-keyshortcuts');
  let model = null;
  let width = 0;
  let height = 0;
  let destroyed = false;
  let yaw = -.62;
  let pitch = .72;
  let zoom = 1;
  let pointer = null;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'grab';
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - Home R');

  function projectRaw(x, y, z = 0) {
    const horizontalScale = 2 / model.span;
    const px = (x - model.centreX) * horizontalScale;
    const py = (y - model.centreY) * horizontalScale;
    const pz = (z - model.maxHeight * .22) * horizontalScale * model.verticalExaggeration;
    const east = px * Math.cos(yaw) - py * Math.sin(yaw);
    const north = px * Math.sin(yaw) + py * Math.cos(yaw);
    const depth = north * Math.cos(pitch) - pz * Math.sin(pitch);
    const perspective = 4 / Math.max(1, 4 + depth);
    return [east * perspective, (-north * Math.sin(pitch) - pz * Math.cos(pitch)) * perspective, depth];
  }

  function draw() {
    if (destroyed || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#112b38');
    background.addColorStop(1, colours.background);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    if (!model) {
      ctx.fillStyle = colours.muted;
      ctx.textAlign = 'center';
      ctx.fillText('Create a route to preview it in 3D.', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }
    const frame = [
      ...model.rings.flat().map(point => projectRaw(...point)),
      ...model.waypoints.map(waypoint => projectRaw(...waypoint.local, waypoint.height)),
      ...model.samples.map(sample => projectRaw(...sample.local, sample.height))
    ];
    const minU = Math.min(...frame.map(point => point[0]));
    const maxU = Math.max(...frame.map(point => point[0]));
    const minV = Math.min(...frame.map(point => point[1]));
    const maxV = Math.max(...frame.map(point => point[1]));
    const unit = Math.min((width - 88) / Math.max(.5, maxU - minU), (height - 164) / Math.max(.5, maxV - minV)) * .87 * zoom;
    const originX = width / 2 - (minU + maxU) / 2 * unit;
    const originY = (height + 12) / 2 - (minV + maxV) / 2 * unit;
    const project = (x, y, z = 0) => {
      const [u, v, depth] = projectRaw(x, y, z);
      return [originX + u * unit, originY + v * unit, depth];
    };
    const line = (a, b, colour, lineWidth = 1, dash = []) => {
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.strokeStyle = colour; ctx.lineWidth = lineWidth; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    };
    const step = niceStep(model.span / 5);
    const floorMinX = Math.floor(model.minX / step) * step;
    const floorMaxX = Math.ceil(model.maxX / step) * step;
    const floorMinY = Math.floor(model.minY / step) * step;
    const floorMaxY = Math.ceil(model.maxY / step) * step;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 72, width, Math.max(1, height - 124)); ctx.clip();
    for (let x = floorMinX; x <= floorMaxX + step / 10; x += step) line(project(x, floorMinY), project(x, floorMaxY), colours.grid);
    for (let y = floorMinY; y <= floorMaxY + step / 10; y += step) line(project(floorMinX, y), project(floorMaxX, y), colours.grid);
    ctx.beginPath();
    for (const ring of model.rings) {
      ring.forEach((point, index) => { const p = project(...point); index ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
      ctx.closePath();
    }
    ctx.fillStyle = '#245e5b66'; ctx.fill('evenodd'); ctx.strokeStyle = colours.boundary; ctx.lineWidth = 2; ctx.stroke();
    for (const sample of [...model.samples].sort((a, b) => project(...b.local, b.height)[2] - project(...a.local, a.height)[2])) {
      const p = project(...sample.local, sample.height);
      const floor = project(...sample.local);
      if (sample.height > .1) line(floor, p, '#66b7a43d', 1);
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.7, 0, TAU); ctx.fillStyle = colours.ground; ctx.fill();
    }
    const guideCount = Math.min(5, model.waypoints.length);
    for (let n = 0; n < guideCount; n++) {
      const waypoint = model.waypoints[Math.round(n * (model.waypoints.length - 1) / Math.max(1, guideCount - 1))];
      line(project(...waypoint.local), project(...waypoint.local, waypoint.height), '#eec87940', 1, [3, 5]);
    }
    for (let index = 1; index < model.waypoints.length; index++) {
      const start = model.waypoints[index - 1];
      const end = model.waypoints[index];
      const transit = /transit|return|home/i.test(`${end.purpose || ''}`);
      line(project(...start.local, start.height), project(...end.local, end.height), transit ? colours.measured : colours.flight, 2.5, model.heightReference === 'AGL' || transit ? [6, 4] : []);
    }
    for (let index = 0; index < model.waypoints.length; index++) {
      if (model.waypoints.length > 60 && index !== 0 && index !== model.waypoints.length - 1) continue;
      const waypoint = model.waypoints[index];
      const p = project(...waypoint.local, waypoint.height);
      ctx.beginPath(); ctx.arc(p[0], p[1], index === 0 ? 5 : 2.4, 0, TAU); ctx.fillStyle = index === 0 ? colours.boundary : colours.flight; ctx.fill();
      if (index === 0) { ctx.fillStyle = colours.ink; ctx.fillText('Start', p[0] + 9, p[1] - 6); }
    }
    const axisOrigin = project(floorMinX, floorMinY);
    const east = project(floorMinX + step, floorMinY);
    const north = project(floorMinX, floorMinY + step);
    line(axisOrigin, east, colours.muted, 2);
    line(axisOrigin, north, colours.muted, 2);
    ctx.fillStyle = colours.muted; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('E', east[0] + 4, east[1]); ctx.fillText('N', north[0] + 4, north[1]);
    const altitudeGuide = Math.max(1, ...model.waypoints.map(waypoint => waypoint.height));
    const top = project(floorMinX, floorMinY, altitudeGuide);
    line(axisOrigin, top, '#eec87999', 1, [3, 3]);
    const altitudeLabel = model.heightReference === 'MSL'
      ? `${Math.round(altitudeGuide + model.groundReferenceM)} m MSL`
      : `${Math.round(altitudeGuide)} m AGL*`;
    ctx.fillStyle = colours.flight; ctx.fillText(altitudeLabel, top[0] + 6, top[1] - 5);
    ctx.restore();

    ctx.fillStyle = '#0b1d28e8'; ctx.fillRect(0, 0, width, 68); ctx.fillRect(0, height - 53, width, 53);
    ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = colours.ink;
    ctx.fillText('3D ROUTE PREVIEW', 16, 14);
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = colours.muted;
    const scaleLabel = model.verticalExaggeration > 1 ? `Height display ×${model.verticalExaggeration}` : 'Height display ×1';
    ctx.textAlign = 'right'; ctx.fillText(scaleLabel, width - 16, 15); ctx.textAlign = 'left';
    const legendY = 43;
    let legendX = 16;
    for (const [label, colour] of [['Area', colours.boundary], ['Flight route', colours.flight], ['Elevation sample', colours.ground]]) {
      ctx.fillStyle = colour; ctx.fillRect(legendX, legendY + 2, 8, 8);
      ctx.fillStyle = colours.muted; ctx.fillText(label, legendX + 13, legendY);
      legendX += ctx.measureText(label).width + 32;
    }
    const bottom = height - 42;
    ctx.fillStyle = colours.muted; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`Grid ${distanceLabel(step)} · Drag to orbit · Scroll to zoom`, 16, bottom);
    ctx.fillStyle = model.heightReference === 'MSL' ? colours.ground : colours.flight;
    const reference = model.heightReference === 'MSL'
      ? `${width < 430 ? 'Ground' : 'Sampled ground reference:'} ${model.groundReferenceM.toFixed(1)} m MSL · Clearance unverified`
      : width < 430 ? '*AGL illustration · Clearance unverified' : '*Flat local AGL illustration · Ground clearance unverified';
    ctx.fillText(reference, 16, bottom + 18);
  }

  function resize() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(0, rect.width);
    height = Math.max(0, rect.height);
    if (!width || !height) return;
    const ratio = clamp(globalThis.devicePixelRatio || 1, 1, 3);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function reset() { if (!destroyed) { yaw = -.62; pitch = .72; zoom = 1; draw(); } }
  const down = event => {
    if (pointer || (event.button !== 0 && event.pointerType !== 'touch')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
    canvas.focus({ preventScroll: true });
  };
  const move = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    yaw += (event.clientX - pointer.x) * .008;
    pitch = clamp(pitch + (event.clientY - pointer.y) * .006, .14, 1.43);
    pointer.x = event.clientX; pointer.y = event.clientY;
    draw();
  };
  const up = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const id = pointer.id; pointer = null;
    if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    canvas.style.cursor = 'grab';
  };
  const wheel = event => { if (model) { event.preventDefault(); zoom = clamp(zoom * Math.exp(-clamp(event.deltaY, -200, 200) * .002), .45, 3.5); draw(); } };
  const key = event => {
    if (event.key === 'ArrowLeft') yaw -= .12;
    else if (event.key === 'ArrowRight') yaw += .12;
    else if (event.key === 'ArrowUp') pitch = clamp(pitch - .1, .14, 1.43);
    else if (event.key === 'ArrowDown') pitch = clamp(pitch + .1, .14, 1.43);
    else if (event.key === '+' || event.key === '=') zoom = clamp(zoom * 1.12, .45, 3.5);
    else if (event.key === '-') zoom = clamp(zoom / 1.12, .45, 3.5);
    else if (event.key === 'Home' || event.key.toLowerCase() === 'r') { event.preventDefault(); reset(); return; }
    else return;
    event.preventDefault(); draw();
  };
  const listeners = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['lostpointercapture', up], ['wheel', wheel, { passive: false }], ['keydown', key]];
  for (const args of listeners) canvas.addEventListener(...args);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  globalThis.addEventListener?.('resize', resize);
  canvas.setAttribute('aria-label', 'Interactive three-dimensional planning preview. Create a route to begin.');
  resize();

  return {
    setData({ plan, context } = {}) {
      if (destroyed) return null;
      model = modelData(plan, context);
      canvas.setAttribute('aria-label', model?.description || 'Interactive three-dimensional planning preview. Create a route to begin.');
      resize();
      return model ? {
        terrainAvailable: model.terrainAvailable, terrainSampleCount: model.samples.length,
        verticalExaggeration: model.verticalExaggeration, groundReferenceM: model.groundReferenceM,
        heightReference: model.heightReference, description: model.description, displayNote: model.displayNote
      } : null;
    },
    getDescription: () => model?.description || 'Create a route to preview it in 3D.',
    resize, reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      globalThis.removeEventListener?.('resize', resize);
      for (const args of listeners) canvas.removeEventListener(...args);
      if (pointer && canvas.hasPointerCapture?.(pointer.id)) canvas.releasePointerCapture(pointer.id);
      pointer = null; model = null;
      canvas.style.touchAction = previousTouchAction;
      canvas.style.cursor = previousCursor;
      for (const [name, value] of [['tabindex', previousTabIndex], ['role', previousRole], ['aria-label', previousLabel], ['aria-keyshortcuts', previousShortcuts]]) value === null ? canvas.removeAttribute(name) : canvas.setAttribute(name, value);
      ctx.clearRect(0, 0, width, height);
    }
  };
}
