export const PUBLICATIONS_TYPE = "publications";
export const ROOT_PUBLICATIONS_PATH = "publications";

export const TEMPLATE_REGISTRY = {
  a5_booklet: {
    key: "a5_booklet",
    label_key: "template_a5_booklet",
    layout_mode: "print",
    page_width: 148,
    page_height: 210,
    icon: "printer",
  },
  postcard: {
    key: "postcard",
    label_key: "template_postcard",
    layout_mode: "print",
    page_width: 148,
    page_height: 105,
    icon: "printer",
  },
  carousel: {
    key: "carousel",
    label_key: "template_carousel",
    layout_mode: "screen",
    icon: "globe",
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATE_REGISTRY);

export function getRootPublicationsPath() {
  return ROOT_PUBLICATIONS_PATH;
}

export function getRootPublicationPath(publication_slug) {
  if (!publication_slug) return "";
  return `${ROOT_PUBLICATIONS_PATH}/${publication_slug}`;
}

export function getFolderPublicationsPath(folder_path) {
  if (!folder_path) return "";
  return `${folder_path}/${PUBLICATIONS_TYPE}`;
}

export function getPublicationPath(folder_path, publication_slug) {
  if (!folder_path || !publication_slug) return "";
  return `${getFolderPublicationsPath(folder_path)}/${publication_slug}`;
}

export function getTemplateConfig(template_key) {
  return TEMPLATE_REGISTRY[template_key] || null;
}

/** Display title from postcard body text: max 15 chars, ellipsis if longer. */
export function titleFromPostcardText(text, { fallback = "Postcard" } = {}) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= 15) return cleaned;
  return `${cleaned.slice(0, 15)}…`;
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.template_key
 * @param {boolean} [opts.is_private]
 * @param {boolean} [opts.at_root] — root publications/ (level 0)
 * @param {string} [opts.admin_path] — author $path required when at_root
 * @param {string} [opts.requested_slug] — optional folder slug override
 */
export function buildPublicationCreateMeta({
  title,
  template_key,
  is_private = false,
  at_root = false,
  admin_path = null,
  requested_slug = null,
}) {
  const config = getTemplateConfig(template_key);
  if (!config) {
    throw new Error(`Unknown publication template: ${template_key}`);
  }

  const additional_meta = {
    title,
    template: config.key,
    layout_mode: config.layout_mode,
    requested_slug: requested_slug || title,
    source_medias: [],
    message: "",
    $status: is_private === true ? "private" : "public",
  };

  // Shareable postcard URLs must bypass instance general password
  if (config.key === "postcard") {
    additional_meta.$public = true;
  }

  if (at_root) {
    if (!admin_path) {
      const err = new Error("login_required");
      err.code = "login_required";
      throw err;
    }
    additional_meta.$admins = [admin_path];
    additional_meta.$contributors = [admin_path];
  } else {
    additional_meta.$admins = "parent_contributors";
  }

  if (typeof config.page_width === "number") {
    additional_meta.page_width = config.page_width;
  }
  if (typeof config.page_height === "number") {
    additional_meta.page_height = config.page_height;
  }

  return additional_meta;
}

/** Prefer full media $path so publications can reference any folder. */
export function filePathToSourceMedia(file_path) {
  if (!file_path) return null;
  const meta_filename = file_path.split("/").pop();
  if (!meta_filename) return null;
  return {
    path: file_path,
    meta_filename_in_project: meta_filename,
  };
}

export function filePathFromSourceMedia(source_media, folder_path) {
  if (source_media?.path) return source_media.path;
  if (!source_media?.meta_filename_in_project || !folder_path) return null;
  return `${folder_path}/${source_media.meta_filename_in_project}`;
}

export function pruneSourceMedias(source_medias, valid_file_paths) {
  if (!Array.isArray(source_medias)) return [];
  const valid_paths = new Set(valid_file_paths);
  const valid_meta_names = new Set(
    valid_file_paths.map((p) => p.split("/").pop())
  );
  return source_medias.filter((sm) => {
    if (sm?.path) return valid_paths.has(sm.path);
    return valid_meta_names.has(sm?.meta_filename_in_project);
  });
}

export function sourceMediasToPaths(source_medias, folder_path) {
  if (!Array.isArray(source_medias)) return [];
  return source_medias
    .map((sm) => filePathFromSourceMedia(sm, folder_path))
    .filter(Boolean);
}

export function publicationSlugFromPath(publication_path) {
  if (!publication_path) return "";
  return publication_path.split("/").pop() || "";
}
