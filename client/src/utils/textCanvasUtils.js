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

export function measureTextCanvasHeight(content, width, { max_lines = null } = {}) {
  const bounded_width = clampTextCanvasWidth(width);
  const line_cap = max_lines;
  const node = getMeasureNode();
  const padding = getSpacingPx();

  if (!node) {
    const fallback_line = 24;
    const cap = line_cap ?? 200;
    return padding * 2 + fallback_line * cap;
  }

  node.style.width = `${bounded_width}px`;
  node.style.padding = `${padding}px`;
  node.textContent = String(content ?? "").length ? content : " ";

  const styles = getComputedStyle(node);
  const line_height = parseFloat(styles.lineHeight) || 24;
  const min_height = padding * 2 + line_height;
  const scroll_height = Math.ceil(node.scrollHeight);
  const content_height = Math.max(scroll_height, min_height);

  if (line_cap == null) {
    return content_height;
  }

  const max_height = padding * 2 + line_height * line_cap;
  return Math.min(content_height, max_height);
}

/** Hauteur du contenu à cette largeur (toutes les lignes, sans plafond). */
export function getTextCanvasNeededHeight(content, width) {
  return measureTextCanvasHeight(content, clampTextCanvasWidth(width));
}

/** Hauteur affichée : hauteur enregistrée, ou hauteur du contenu. */
export function getTextCanvasDisplayHeight(content, width, stored_height) {
  const bounded_width = clampTextCanvasWidth(width);
  const parsed_height = Number(stored_height);
  if (Number.isFinite(parsed_height) && parsed_height > 0) {
    return Math.round(parsed_height);
  }
  return getTextCanvasNeededHeight(content, bounded_width);
}

/**
 * Après un changement de largeur : réduire si trop haut, ne jamais agrandir.
 * @param {number|null|undefined} stored_height - meta file.height
 * @param {number} baseline_height - hauteur affichée au début du resize largeur
 */
export function resolveTextCanvasHeightForWidthChange(
  content,
  width,
  { stored_height, baseline_height }
) {
  const needed = getTextCanvasNeededHeight(content, width);
  const has_stored =
    stored_height != null &&
    Number.isFinite(Number(stored_height)) &&
    Number(stored_height) > 0;
  const current = has_stored
    ? Math.round(Number(stored_height))
    : Math.round(baseline_height);

  if (current > needed) {
    return {
      height: needed,
      persist_height: has_stored,
    };
  }
  if (current < needed) {
    return {
      height: current,
      persist_height: true,
    };
  }
  return {
    height: needed,
    persist_height: false,
  };
}

/** Hauteur minimale pour le redimensionnement vertical manuel (1 ligne). */
export function getTextCanvasMinHeight(content, width) {
  return measureTextCanvasHeight(content, clampTextCanvasWidth(width), {
    max_lines: 1,
  });
}

/** Hauteur maximale : contenu complet (pas de vide sous le texte). */
export function getTextCanvasMaxHeight(content, width) {
  return getTextCanvasNeededHeight(content, width);
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
