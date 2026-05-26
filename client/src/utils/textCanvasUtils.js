export const TEXT_CANVAS_MAX_LINES = 10;
export const TEXT_CANVAS_MIN_WIDTH = 50;
export const TEXT_CANVAS_MAX_WIDTH = 1000;
export const TEXT_CANVAS_DEFAULT_WIDTH = 320;

let measure_node = null;

function getSpacingPx() {
  if (typeof document === "undefined") return 16;
  const spacing = getComputedStyle(document.documentElement)
    .getPropertyValue("--spacing")
    .trim();
  if (!spacing) return 16;
  if (spacing.endsWith("rem")) {
    const root_font =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(spacing) * root_font;
  }
  return parseFloat(spacing) || 16;
}

function getMeasureNode() {
  if (typeof document === "undefined") return null;
  if (measure_node) return measure_node;

  measure_node = document.createElement("div");
  measure_node.setAttribute("aria-hidden", "true");
  measure_node.style.cssText = [
    "position:fixed",
    "left:-9999px",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    "box-sizing:border-box",
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "word-break:break-word",
    "font-size:100%",
    "line-height:1.5",
    "font-family:inherit",
  ].join(";");
  document.body.appendChild(measure_node);
  return measure_node;
}

export function clampTextCanvasWidth(width) {
  const parsed = Number(width);
  if (!Number.isFinite(parsed)) return TEXT_CANVAS_DEFAULT_WIDTH;
  return Math.min(
    TEXT_CANVAS_MAX_WIDTH,
    Math.max(TEXT_CANVAS_MIN_WIDTH, Math.ceil(parsed))
  );
}

export function measureTextCanvasHeight(content, width) {
  const bounded_width = clampTextCanvasWidth(width);
  const node = getMeasureNode();
  const padding = getSpacingPx();

  if (!node) {
    const fallback_line = 24;
    return padding * 2 + fallback_line * TEXT_CANVAS_MAX_LINES;
  }

  node.style.width = `${bounded_width}px`;
  node.style.padding = `${padding}px`;
  node.textContent = String(content ?? "").length ? content : " ";

  const styles = getComputedStyle(node);
  const line_height = parseFloat(styles.lineHeight) || 24;
  const min_height = padding * 2 + line_height;
  const max_height = padding * 2 + line_height * TEXT_CANVAS_MAX_LINES;

  return Math.min(Math.max(Math.ceil(node.scrollHeight), min_height), max_height);
}

export function getTextCanvasDimensions(content, width) {
  const bounded_width = clampTextCanvasWidth(
    width != null ? width : TEXT_CANVAS_DEFAULT_WIDTH
  );
  return {
    width: bounded_width,
    height: measureTextCanvasHeight(content, bounded_width),
  };
}
