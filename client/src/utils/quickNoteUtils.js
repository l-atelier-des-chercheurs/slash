export const QUICK_NOTE_MAX_LENGTH = 99;
export const QUICK_NOTE_MAX_WIDTH = 1220;
export const QUICK_NOTE_HEIGHT = 52;

let measure_node = null;

function getMeasureNode() {
  if (typeof document === "undefined") return null;
  if (measure_node) return measure_node;

  measure_node = document.createElement("span");
  measure_node.setAttribute("aria-hidden", "true");
  measure_node.style.cssText = [
    "position:fixed",
    "left:-9999px",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    "display:inline-flex",
    "align-items:center",
    "box-sizing:border-box",
    "white-space:nowrap",
    "font-size:150%",
    "line-height:1.2",
    "padding:0 var(--spacing, 1rem)",
    "font-family:inherit",
  ].join(";");
  document.body.appendChild(measure_node);
  return measure_node;
}

export function normalizeQuickNoteText(raw) {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, QUICK_NOTE_MAX_LENGTH);
}

export function measureQuickNoteWidth(text) {
  const normalized = normalizeQuickNoteText(text);
  const node = getMeasureNode();
  if (!node) return QUICK_NOTE_MAX_WIDTH;

  node.textContent = normalized || " ";
  const width = node.getBoundingClientRect().width;

  return Math.min(QUICK_NOTE_MAX_WIDTH, Math.max(Math.ceil(width), 1));
}
