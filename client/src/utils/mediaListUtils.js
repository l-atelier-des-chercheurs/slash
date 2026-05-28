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
