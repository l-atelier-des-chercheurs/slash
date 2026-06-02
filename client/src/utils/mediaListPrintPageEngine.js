export const PRINT_PAGE_ASPECT_RATIO = 210 / 297;
export const PRINT_PAGE_TEMPLATE_AUTO = "auto";
export const DEFAULT_PRINT_PAGE_TEMPLATE = PRINT_PAGE_TEMPLATE_AUTO;

/**
 * Automatic A4 layout: 1 = full page, 2 = vertical halves, 3 = top row split + bottom full, etc.
 */
export function computeAutoPrintLayout(media_count) {
  const count = Math.max(0, media_count);
  if (count === 0) {
    return {
      template: PRINT_PAGE_TEMPLATE_AUTO,
      cols: 1,
      rows: 1,
      slots: [],
    };
  }
  if (count === 1) {
    return {
      template: PRINT_PAGE_TEMPLATE_AUTO,
      cols: 1,
      rows: 1,
      slots: [{ index: 0, col: 1, row: 1, col_span: 1, row_span: 1 }],
    };
  }
  if (count === 2) {
    return {
      template: PRINT_PAGE_TEMPLATE_AUTO,
      cols: 1,
      rows: 2,
      slots: [
        { index: 0, col: 1, row: 1, col_span: 1, row_span: 1 },
        { index: 1, col: 1, row: 2, col_span: 1, row_span: 1 },
      ],
    };
  }
  if (count === 3) {
    return {
      template: PRINT_PAGE_TEMPLATE_AUTO,
      cols: 2,
      rows: 2,
      slots: [
        { index: 0, col: 1, row: 1, col_span: 1, row_span: 1 },
        { index: 1, col: 2, row: 1, col_span: 1, row_span: 1 },
        { index: 2, col: 1, row: 2, col_span: 2, row_span: 1 },
      ],
    };
  }

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const slots = [];

  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / cols) + 1;
    const col = (index % cols) + 1;
    const is_last_row = row === rows;
    const items_in_row = is_last_row ? count - (rows - 1) * cols : cols;
    const col_span =
      is_last_row && items_in_row === 1 && cols > 1 ? cols : 1;

    slots.push({
      index,
      col: col_span === cols ? 1 : col,
      row,
      col_span,
      row_span: 1,
    });
  }

  return { template: PRINT_PAGE_TEMPLATE_AUTO, cols, rows, slots };
}

const TEMPLATE_RESOLVERS = {
  [PRINT_PAGE_TEMPLATE_AUTO]: computeAutoPrintLayout,
};

export function resolvePrintPageLayout(page, media_count) {
  const template = page?.template || DEFAULT_PRINT_PAGE_TEMPLATE;
  const resolver =
    TEMPLATE_RESOLVERS[template] || TEMPLATE_RESOLVERS[PRINT_PAGE_TEMPLATE_AUTO];
  return resolver(media_count);
}

export function createPrintPageId() {
  return `print-page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPrintPageData(
  medias_filepaths = [],
  template = DEFAULT_PRINT_PAGE_TEMPLATE
) {
  return {
    page_id: createPrintPageId(),
    medias_filepaths: [...medias_filepaths],
    template,
  };
}

export function clonePrintPageData(page) {
  return {
    page_id: page?.page_id || createPrintPageId(),
    medias_filepaths: [...(page?.medias_filepaths || [])],
    template: page?.template || DEFAULT_PRINT_PAGE_TEMPLATE,
  };
}

export function printPageGridStyle(layout) {
  const { cols, rows } = layout;
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  };
}

export function printPageSlotStyle(slot) {
  const styles = {};
  if (slot.row_span > 1) {
    styles.gridRow = `${slot.row} / span ${slot.row_span}`;
  } else {
    styles.gridRow = `${slot.row}`;
  }
  if (slot.col_span > 1) {
    styles.gridColumn = `${slot.col} / span ${slot.col_span}`;
  } else {
    styles.gridColumn = `${slot.col}`;
  }
  return styles;
}

export function layoutSlotsWithMedias(layout, slot_medias) {
  return layout.slots.map((slot) => ({
    ...slot,
    media: slot_medias[slot.index] || null,
  }));
}
