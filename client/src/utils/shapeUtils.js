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

/**
 * Build full SVG string for a canvas shape from shape_points.
 */
export function shapePointsToSvg(
  shape_points,
  width,
  height,
  stroke_width = 4
) {
  if (!shape_points || shape_points.length < 2) return "";
  const path_d = pointsToSvgPath(shape_points);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${path_d}" fill="none" stroke="black" stroke-width="${stroke_width}" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}
