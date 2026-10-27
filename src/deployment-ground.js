import proj4 from 'proj4';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validBounds = bounds => Array.isArray(bounds) && bounds.length === 4 && bounds.every(finite) && bounds[0] < bounds[2] && bounds[1] < bounds[3];
const validPosition = point => Array.isArray(point) && point.length >= 2 && point.every(finite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 85;
const segments = value => Math.max(2, Math.min(24, Math.floor(finite(value) ? value : 16)));

/** Sample the existing local floor, including the curved geographic edges of a projected grid. */
export function groundGeometry(bounds, toGeographic) {
  if (!validBounds(bounds) || typeof toGeographic !== 'function') return null;
  const [west, south, east, north] = bounds;
  const corners = [[west, south], [east, south], [east, north], [west, north]];
  const ring = [];
  try {
    for (let edge = 0; edge < 4; edge++) {
      const from = corners[edge], to = corners[(edge + 1) % 4];
      for (let index = 0; index < 16; index++) {
        const ratio = index / 16;
        const point = toGeographic([from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio]);
        if (!validPosition(point)) return null;
        ring.push(point.slice(0, 2));
      }
    }
    ring.push([...ring[0]]);
    return {type: 'Polygon', coordinates: [ring]};
  } catch { return null; }
}

/** Build world/UV coordinates once. Camera movement performs no map projection or requests. */
export function groundTextureMesh(bounds, toGeographic, extent, imageWidth, imageHeight, divisions = 16) {
  if (!validBounds(bounds) || !validBounds(extent) || typeof toGeographic !== 'function' || !finite(imageWidth) || !finite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) return null;
  const count = segments(divisions), vertices = [], triangles = [];
  try {
    for (let row = 0; row <= count; row++) {
      for (let column = 0; column <= count; column++) {
        const local = [bounds[0] + (bounds[2] - bounds[0]) * column / count, bounds[1] + (bounds[3] - bounds[1]) * row / count];
        const position = toGeographic(local);
        if (!validPosition(position)) return null;
        const mercator = proj4('EPSG:4326', 'EPSG:3857', position);
        const source = [(mercator[0] - extent[0]) / (extent[2] - extent[0]) * imageWidth, (extent[3] - mercator[1]) / (extent[3] - extent[1]) * imageHeight];
        if (!source.every(finite)) return null;
        // The atlas must cover the floor. Do not stretch a smaller AOI image over the surrounding ground.
        if (source[0] < -.5 || source[1] < -.5 || source[0] > imageWidth + .5 || source[1] > imageHeight + .5) return null;
        vertices.push({local, source});
      }
    }
    for (let row = 0; row < count; row++) for (let column = 0; column < count; column++) {
      const a = row * (count + 1) + column, b = a + 1, c = a + count + 1, d = c + 1;
      triangles.push([a, b, d], [a, d, c]);
    }
    return {vertices, triangles};
  } catch { return null; }
}

/** Affine triangles approximate the perspective plane; no image is resized to an unrelated boundary. */
export function drawGroundTexture(context, image, mesh, project) {
  if (!mesh || !image) return false;
  const screen = mesh.vertices.map(vertex => project(...vertex.local));
  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  for (const triangle of mesh.triangles) {
    const source = triangle.map(index => mesh.vertices[index].source), target = triangle.map(index => screen[index]);
    const [s0, s1, s2] = source, [p0, p1, p2] = target;
    const sx1 = s1[0] - s0[0], sy1 = s1[1] - s0[1], sx2 = s2[0] - s0[0], sy2 = s2[1] - s0[1];
    const determinant = sx1 * sy2 - sx2 * sy1;
    if (Math.abs(determinant) < 1e-10 || target.flat().some(value => !finite(value))) continue;
    const dx1 = p1[0] - p0[0], dy1 = p1[1] - p0[1], dx2 = p2[0] - p0[0], dy2 = p2[1] - p0[1];
    const a = (dx1 * sy2 - dx2 * sy1) / determinant, c = (dx2 * sx1 - dx1 * sx2) / determinant;
    const b = (dy1 * sy2 - dy2 * sy1) / determinant, d = (dy2 * sx1 - dy1 * sx2) / determinant;
    const e = p0[0] - a * s0[0] - c * s0[1], f = p0[1] - b * s0[0] - d * s0[1];
    const centre = [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3];
    context.save(); context.beginPath();
    // A subpixel overlap hides antialias seams between adjacent pieces of the same image.
    target.forEach((point, index) => {
      const length = Math.hypot(point[0] - centre[0], point[1] - centre[1]);
      const padding = length ? .35 / length : 0;
      const x = point[0] + (point[0] - centre[0]) * padding, y = point[1] + (point[1] - centre[1]) * padding;
      if (index) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.closePath(); context.clip(); context.transform(a, b, c, d, e, f); context.drawImage(image, 0, 0); context.restore();
  }
  context.restore();
  return true;
}
