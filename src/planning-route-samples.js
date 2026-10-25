const MAX_SAMPLES = 24;

function validPosition(waypoint) {
  const position = Array.isArray(waypoint) ? waypoint : waypoint?.position;
  if (!Array.isArray(position) || position.length < 2) return null;
  const [longitude, latitude] = position;
  if (typeof longitude !== 'number' || typeof latitude !== 'number' || !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
      longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  return [longitude, latitude];
}

function routesFrom(flight) {
  const sorties = Array.isArray(flight?.battery?.sorties) ? flight.battery.sorties : [];
  const routes = sorties.map(sortie => Array.isArray(sortie?.waypoints) ? sortie.waypoints.map(validPosition).filter(Boolean) : []).filter(route => route.length);
  if (routes.length) return routes;
  if (flight?.plan?.status !== 'generated' || !Array.isArray(flight.plan.waypoints)) return [];
  const route = flight.plan.waypoints.map(validPosition).filter(Boolean);
  return route.length ? [route] : [];
}

/**
 * Sparse model samples from existing WGS84 route vertices, never interpolated.
 * These samples describe the route; they do not establish terrain clearance.
 */
export function planningRouteSamples(flight, { limit = MAX_SAMPLES } = {}) {
  if (!Number.isInteger(limit) || limit < 0) throw new TypeError('Route sample limit must be a nonnegative integer.');
  const capacity = Math.min(limit, MAX_SAMPLES);
  if (!capacity) return [];
  const routes = routesFrom(flight);
  const positions = [];
  const indexByPosition = new Map();
  const endpoints = new Set();
  for (const route of routes) {
    for (let i = 0; i < route.length; i++) {
      const position = route[i];
      const key = `${position[0]},${position[1]}`;
      if (!indexByPosition.has(key)) {
        indexByPosition.set(key, positions.length);
        positions.push(position);
      }
      if (i === 0 || i === route.length - 1) endpoints.add(indexByPosition.get(key));
    }
  }
  if (positions.length <= capacity) return positions;

  // Preserve Home/return and sortie endpoints before filling the intervening route.
  endpoints.add(0);
  endpoints.add(positions.length - 1);
  const candidates = [...endpoints].sort((a, b) => a - b);
  let selected;
  if (candidates.length > capacity) {
    selected = new Set(Array.from({ length: capacity }, (_, index) => candidates[capacity === 1 ? 0 : Math.round(index * (candidates.length - 1) / (capacity - 1))]));
  } else {
    selected = new Set(candidates);
  }
  // Bisect the largest unsampled span. Selection is deterministic even on ties.
  while (selected.size < capacity) {
    const ordered = [...selected].sort((a, b) => a - b);
    let gap = 0;
    let next = null;
    for (let i = 1; i < ordered.length; i++) {
      const width = ordered[i] - ordered[i - 1];
      if (width > gap && width > 1) {
        gap = width;
        next = Math.floor((ordered[i] + ordered[i - 1]) / 2);
      }
    }
    if (next === null) break;
    selected.add(next);
  }
  return [...selected].sort((a, b) => a - b).map(index => [...positions[index]]);
}
