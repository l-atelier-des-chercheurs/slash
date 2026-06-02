import {
  clonePrintPageData,
  createPrintPageData,
  DEFAULT_PRINT_PAGE_TEMPLATE,
} from "@/utils/mediaListPrintPageEngine.js";

const MEDIA_LIST_TYPES = new Set([
  "image",
  "video",
  "audio",
  "text",
  "pdf",
  "url",
  "stl",
  "obj",
]);

export function isMediaListFile(file) {
  if (!file?.$type) return false;
  if (file.$type.startsWith("canvas_")) return false;
  return MEDIA_LIST_TYPES.has(file.$type);
}

export function getMediaListStorageKey(folder_path) {
  return `slash_media_list_${folder_path}`;
}

export function loadMediaListPaths(folder_path) {
  if (!folder_path) return [];
  try {
    const raw = localStorage.getItem(getMediaListStorageKey(folder_path));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMediaListPaths(folder_path, paths) {
  if (!folder_path) return;
  localStorage.setItem(
    getMediaListStorageKey(folder_path),
    JSON.stringify(paths)
  );
}

export const MEDIA_LIST_DRAG_MIME = "application/x-slash-media-path";
export const MEDIA_LIST_PRINT_SLOT_MIME =
  "application/x-slash-print-slot";

export function buildPrintPagesFromPaths(file_paths) {
  if (!Array.isArray(file_paths)) return [];
  return file_paths
    .filter(Boolean)
    .map((path) => createPrintPageData([path]));
}

export function pruneEmptyPrintPages(pages) {
  if (!Array.isArray(pages)) return [];
  return pages.filter((page) => page.medias_filepaths?.length > 0);
}

export function movePrintMediaBetweenPages(
  pages,
  from_page_index,
  to_page_index,
  media_path
) {
  if (
    from_page_index === to_page_index ||
    !media_path ||
    !Array.isArray(pages)
  ) {
    return pages;
  }

  const next = pages.map((page) => clonePrintPageData(page));

  const from_paths = next[from_page_index]?.medias_filepaths;
  const to_paths = next[to_page_index]?.medias_filepaths;
  if (!from_paths || !to_paths) return pages;

  const path_index = from_paths.indexOf(media_path);
  if (path_index < 0) return pages;

  from_paths.splice(path_index, 1);
  if (!to_paths.includes(media_path)) {
    to_paths.push(media_path);
  }

  return pruneEmptyPrintPages(next);
}

export function swapPrintMediaOnPage(
  pages,
  page_index,
  media_path_a,
  media_path_b
) {
  if (
    !media_path_a ||
    !media_path_b ||
    media_path_a === media_path_b ||
    !Array.isArray(pages)
  ) {
    return pages;
  }

  const next = pages.map((page) => clonePrintPageData(page));

  const paths = next[page_index]?.medias_filepaths;
  if (!paths) return pages;

  const index_a = paths.indexOf(media_path_a);
  const index_b = paths.indexOf(media_path_b);
  if (index_a < 0 || index_b < 0) return pages;

  [paths[index_a], paths[index_b]] = [paths[index_b], paths[index_a]];
  return next;
}

export function insertPrintMediaOnNewPage(
  pages,
  insert_at_index,
  from_page_index,
  media_path
) {
  if (!media_path || !Array.isArray(pages)) return pages;

  const next = pages.map((page) => clonePrintPageData(page));

  const from_paths = next[from_page_index]?.medias_filepaths;
  if (!from_paths) return pages;

  const path_index = from_paths.indexOf(media_path);
  if (path_index < 0) return pages;

  from_paths.splice(path_index, 1);

  let insert_at = Math.max(0, Math.min(insert_at_index, next.length));
  if (!from_paths.length) {
    next.splice(from_page_index, 1);
    if (from_page_index < insert_at) {
      insert_at -= 1;
    }
  }

  next.splice(insert_at, 0, createPrintPageData([media_path]));
  return next;
}
