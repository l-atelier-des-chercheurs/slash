/** Round coordinate to 1 decimal (0.1px precision). */
function roundCoord(v) {
  const round_to_digits = 1;
  return Math.round(v * 10 ** round_to_digits) / 10 ** round_to_digits;
}

/** Get x from point (supports [x,y] or {x,y}). */
function px(p) {
  return Array.isArray(p) ? p[0] : p.x;
}

/** Get y from point (supports [x,y] or {x,y}). */
function py(p) {
  return Array.isArray(p) ? p[1] : p.y;
}

/**
 * Round shape points for storage. Returns [[x,y],[x,y],...] (compact format).
 */
export function roundShapePoints(points) {
  if (!points || points.length === 0) return points;
  return points.map((p) => [roundCoord(px(p)), roundCoord(py(p))]);
}

/**
 * Convert points to SVG path d attribute (quadratic bezier).
 * Accepts [[x,y],[x,y],...] or [{x,y},{x,y},...].
 */
export function pointsToSvgPath(points) {
  if (!points || points.length === 0) return "";

  const [first_point, ...rest_points] = points;
  let d = `M ${px(first_point).toFixed(1)} ${py(first_point).toFixed(1)}`;

  if (rest_points.length === 0) return d;
  if (rest_points.length === 1) {
    const [last_point] = rest_points;
    d += ` L ${px(last_point).toFixed(1)} ${py(last_point).toFixed(1)}`;
    return d;
  }

  for (let i = 1; i < points.length - 1; i += 1) {
    const control_point = points[i];
    const next_point = points[i + 1];
    const mid_x = (px(control_point) + px(next_point)) / 2;
    const mid_y = (py(control_point) + py(next_point)) / 2;
    d += ` Q ${px(control_point).toFixed(1)} ${py(control_point).toFixed(
      1
    )} ${mid_x.toFixed(1)} ${mid_y.toFixed(1)}`;
  }

  const last_point = points[points.length - 1];
  d += ` Q ${px(last_point).toFixed(1)} ${py(last_point).toFixed(1)} ${px(
    last_point
  ).toFixed(1)} ${py(last_point).toFixed(1)}`;
  return d;
}

const bounds_cache = new WeakMap();

function computePointsBounds(points) {
  if (!points || points.length === 0)
    return { min_x: 0, min_y: 0, width: 1, height: 1 };
  let min_x = Infinity,
    min_y = Infinity,
    max_x = -Infinity,
    max_y = -Infinity;
  for (const p of points) {
    const x = px(p);
    const y = py(p);
    if (x < min_x) min_x = x;
    if (y < min_y) min_y = y;
    if (x > max_x) max_x = x;
    if (y > max_y) max_y = y;
  }
  const width = Math.max(max_x - min_x, 0.1);
  const height = Math.max(max_y - min_y, 0.1);
  return { min_x, min_y, width, height };
}

/** Get bounding box of points: { min_x, min_y, width, height }. Cached by array reference. */
export function getPointsBounds(points) {
  if (!points || points.length === 0)
    return { min_x: 0, min_y: 0, width: 1, height: 1 };
  let cached = bounds_cache.get(points);
  if (!cached) {
    cached = computePointsBounds(points);
    bounds_cache.set(points, cached);
  }
  return cached;
}

export const SHAPE_HIT_STROKE_WIDTH = 20;

export function getShapeStrokePadding(
  stroke_width,
  hit_stroke_width = SHAPE_HIT_STROKE_WIDTH
) {
  return Math.max(stroke_width / 2, hit_stroke_width / 2);
}

/**
 * Build canvas_shape metadata from raw canvas points.
 * Expands bounds by half the visible stroke so saved geometry matches the preview.
 */
export function buildShapeMetadata(points, stroke_width) {
  if (!points || points.length === 0) {
    return null;
  }

  let min_x = Infinity;
  let max_x = -Infinity;
  let min_y = Infinity;
  let max_y = -Infinity;

  for (const point of points) {
    const x = px(point);
    const y = py(point);
    min_x = Math.min(min_x, x);
    max_x = Math.max(max_x, x);
    min_y = Math.min(min_y, y);
    max_y = Math.max(max_y, y);
  }

  if (!isFinite(min_x) || !isFinite(min_y)) {
    return null;
  }

  const pad = stroke_width / 2;
  const origin_x = min_x - pad;
  const origin_y = min_y - pad;
  const width = Math.max(max_x - min_x + pad * 2, 1);
  const height = Math.max(max_y - min_y + pad * 2, 1);

  return {
    x: Math.round(origin_x),
    y: Math.round(origin_y),
    width: Math.round(width),
    height: Math.round(height),
    shape_points: roundShapePoints(
      points.map((point) => [px(point) - origin_x, py(point) - origin_y])
    ),
  };
}

/**
 * Build full SVG string for a canvas shape from shape_points.
 * Height is derived from the path's bounding box aspect ratio when not provided.
 */
export function shapePointsToSvg(
  shape_points,
  width,
  stroke_width = 4,
  height
) {
  if (!shape_points || shape_points.length < 2) return "";
  const h = height != null ? height : width;
  const path_d = pointsToSvgPath(shape_points);
  const hit_stroke_width = SHAPE_HIT_STROKE_WIDTH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" preserveAspectRatio="xMinYMin meet"><path d="${path_d}" fill="none" stroke="black" stroke-width="${stroke_width}" stroke-linecap="round" stroke-linejoin="round" /><path class="path-hitbox" d="${path_d}" fill="none" stroke="transparent" stroke-width="${hit_stroke_width}" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}
