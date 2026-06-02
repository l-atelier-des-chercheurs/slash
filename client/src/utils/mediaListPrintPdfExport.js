import { jsPDF } from "jspdf";
import {
  layoutSlotsWithMedias,
  resolvePrintPageLayout,
} from "@/utils/mediaListPrintPageEngine.js";
import { plainTextFromMediaFile } from "@/utils/mediaListUtils.js";
import {
  getPrintPageCanvasMetrics,
  getPrintSlotRectsForLayout,
  printTextStyleForSlotWidth,
  PRINT_A4_HEIGHT_MM,
  PRINT_A4_WIDTH_MM,
  PRINT_TEXT_FONT_FAMILY,
} from "@/utils/mediaListPrintTypography.js";

function toAbsoluteUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return new URL(url, window.location.href).href;
}

function isSameOriginUrl(url) {
  try {
    return new URL(url).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function loadImage(url) {
  const absolute_url = toAbsoluteUrl(url);
  if (!absolute_url || absolute_url.includes("/undefined")) {
    throw new Error("missing_image_url");
  }

  if (isSameOriginUrl(absolute_url)) {
    const response = await fetch(absolute_url, { credentials: "same-origin" });
    if (!response.ok) throw new Error("image_fetch_failed");
    const blob = await response.blob();
    const blob_url = URL.createObjectURL(blob);
    try {
      return await loadImageElement(blob_url);
    } finally {
      URL.revokeObjectURL(blob_url);
    }
  }

  return loadImageElement(absolute_url, "anonymous");
}

function loadImageElement(src, cross_origin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cross_origin) img.crossOrigin = cross_origin;
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error("image_empty"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

function drawImageContain(ctx, img, x, y, width, height) {
  const scale = Math.min(width / img.width, height / img.height);
  const draw_width = img.width * scale;
  const draw_height = img.height * scale;
  const draw_x = x + (width - draw_width) / 2;
  const draw_y = y + (height - draw_height) / 2;
  ctx.drawImage(img, draw_x, draw_y, draw_width, draw_height);
}

function drawPlaceholder(ctx, x, y, width, height) {
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(x, y, width, height);
}

function wrapTextLines(ctx, text, max_width) {
  const paragraphs = String(text).split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const next_line = `${line} ${words[i]}`;
      if (ctx.measureText(next_line).width <= max_width) {
        line = next_line;
      } else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
  }

  return lines;
}

function drawTextBlock(ctx, text, x, y, width, height) {
  const { font_size, line_height, padding } = printTextStyleForSlotWidth(width);
  const inner_width = width - padding * 2;
  const inner_height = height - padding * 2;

  if (!text || inner_width <= 0 || inner_height <= 0) return false;

  ctx.save();
  ctx.fillStyle = "#111111";
  ctx.font = `${font_size}px ${PRINT_TEXT_FONT_FAMILY}`;
  ctx.textBaseline = "top";

  const lines = wrapTextLines(ctx, text, inner_width);
  let cursor_y = y + padding;

  for (const line of lines) {
    if (cursor_y + line_height > y + padding + inner_height) break;
    ctx.fillText(line, x + padding, cursor_y);
    cursor_y += line_height;
  }

  ctx.restore();
  return true;
}

async function renderPrintPageCanvas({ page, slot_medias, getMediaUrl, getMediaUrls }) {
  const metrics = getPrintPageCanvasMetrics("export");
  const { page_width, page_height, padding } = metrics;

  const canvas = document.createElement("canvas");
  canvas.width = page_width;
  canvas.height = page_height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, page_width, page_height);

  const media_count = Math.max(1, slot_medias.length);
  const layout = resolvePrintPageLayout(page, media_count);
  const slots = layoutSlotsWithMedias(layout, slot_medias);
  const slot_rects = getPrintSlotRectsForLayout(layout, "export");

  for (const slot_rect of slot_rects) {
    const slot = slots.find((s) => s.index === slot_rect.index);
    const media = slot?.media;
    const x = padding + slot_rect.x;
    const y = padding + slot_rect.y;
    const { width, height } = slot_rect;

    if (!media) continue;

    if (media.$type === "text") {
      const text = plainTextFromMediaFile(media);
      if (text && drawTextBlock(ctx, text, x, y, width, height)) {
        continue;
      }
      drawPlaceholder(ctx, x, y, width, height);
      continue;
    }

    const media_urls = getMediaUrls
      ? getMediaUrls(media)
      : [getMediaUrl(media)].filter(Boolean);

    if (!media_urls.length) {
      drawPlaceholder(ctx, x, y, width, height);
      continue;
    }

    let drew_media = false;
    for (const media_url of media_urls) {
      try {
        const img = await loadImage(media_url);
        drawImageContain(ctx, img, x, y, width, height);
        drew_media = true;
        break;
      } catch {
        // try next candidate
      }
    }

    if (!drew_media) {
      drawPlaceholder(ctx, x, y, width, height);
    }
  }

  return canvas;
}

export async function exportPrintPagesToPdf({
  pages,
  getSlotMediasForPage,
  getMediaUrl,
  getMediaUrls,
  filename = "media-list-print.pdf",
}) {
  if (!pages?.length) return;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let page_index = 0; page_index < pages.length; page_index++) {
    const page = pages[page_index];
    const slot_medias = getSlotMediasForPage(page);
    const canvas = await renderPrintPageCanvas({
      page,
      slot_medias,
      getMediaUrl,
      getMediaUrls,
    });

    if (page_index > 0) {
      pdf.addPage("a4", "portrait");
    }

    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      PRINT_A4_WIDTH_MM,
      PRINT_A4_HEIGHT_MM
    );
  }

  pdf.save(filename);
}
