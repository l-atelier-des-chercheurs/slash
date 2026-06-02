import { PRINT_PAGE_ASPECT_RATIO } from "@/utils/mediaListPrintPageEngine.js";

export const PRINT_A4_WIDTH_MM = 210;
export const PRINT_A4_HEIGHT_MM = 297;
export const PRINT_PREVIEW_PAGE_WIDTH_PX = 250;
export const PRINT_PREVIEW_SLOT_GAP_PX = 2;
export const PRINT_EXPORT_DPI = 150;
export const PRINT_EXPORT_PAGE_PADDING_MM = 5;
export const PRINT_EXPORT_SLOT_GAP_MM = 1;

/** Typography scales with slot width — tuned to the former 8px / ~238px full-page slot. */
export const PRINT_TEXT_FONT_SIZE_RATIO = 8 / 238;
export const PRINT_TEXT_PADDING_RATIO = 4 / 238;
export const PRINT_TEXT_LINE_HEIGHT = 1.35;
export const PRINT_TEXT_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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

export function mmToPrintPx(mm) {
  return Math.round((mm * PRINT_EXPORT_DPI) / 25.4);
}

export function getPrintPreviewPagePaddingPx() {
  return getSpacingPx() / 3;
}

export function getPrintPreviewPageHeightPx() {
  return PRINT_PREVIEW_PAGE_WIDTH_PX / PRINT_PAGE_ASPECT_RATIO;
}

export function getPrintPageCanvasMetrics(mode = "preview") {
  if (mode === "export") {
    return {
      page_width: mmToPrintPx(PRINT_A4_WIDTH_MM),
      page_height: mmToPrintPx(PRINT_A4_HEIGHT_MM),
      padding: mmToPrintPx(PRINT_EXPORT_PAGE_PADDING_MM),
      gap: mmToPrintPx(PRINT_EXPORT_SLOT_GAP_MM),
    };
  }

  return {
    page_width: PRINT_PREVIEW_PAGE_WIDTH_PX,
    page_height: getPrintPreviewPageHeightPx(),
    padding: getPrintPreviewPagePaddingPx(),
    gap: PRINT_PREVIEW_SLOT_GAP_PX,
  };
}

export function computePrintSlotRects(layout, inner_width, inner_height, gap) {
  const { cols, rows, slots } = layout;
  const col_width = (inner_width - gap * (cols - 1)) / cols;
  const row_height = (inner_height - gap * (rows - 1)) / rows;

  return slots.map((slot) => {
    const x = (slot.col - 1) * (col_width + gap);
    const y = (slot.row - 1) * (row_height + gap);
    const width = slot.col_span * col_width + (slot.col_span - 1) * gap;
    const height = slot.row_span * row_height + (slot.row_span - 1) * gap;
    return { ...slot, x, y, width, height };
  });
}

export function getPrintSlotRectsForLayout(layout, mode = "preview") {
  const metrics = getPrintPageCanvasMetrics(mode);
  const inner_width = metrics.page_width - metrics.padding * 2;
  const inner_height = metrics.page_height - metrics.padding * 2;
  return computePrintSlotRects(
    layout,
    inner_width,
    inner_height,
    metrics.gap
  );
}

export function getPrintSlotRectForIndex(layout, slot_index, mode = "preview") {
  const rects = getPrintSlotRectsForLayout(layout, mode);
  return rects.find((rect) => rect.index === slot_index) || null;
}

export function printTextStyleForSlotWidth(slot_width_px) {
  const width = Math.max(1, slot_width_px);
  const font_size = Math.max(
    6,
    Math.round(width * PRINT_TEXT_FONT_SIZE_RATIO)
  );
  const padding = Math.max(3, Math.round(width * PRINT_TEXT_PADDING_RATIO));

  return {
    font_size,
    line_height: Math.round(font_size * PRINT_TEXT_LINE_HEIGHT),
    padding,
    font_family: PRINT_TEXT_FONT_FAMILY,
  };
}

export function printTextCssStyleForSlot(layout, slot_index) {
  const slot_rect = getPrintSlotRectForIndex(layout, slot_index, "preview");
  if (!slot_rect) return {};

  const style = printTextStyleForSlotWidth(slot_rect.width);
  return {
    fontSize: `${style.font_size}px`,
    lineHeight: `${style.line_height}px`,
    padding: `${style.padding}px`,
    fontFamily: style.font_family,
  };
}
