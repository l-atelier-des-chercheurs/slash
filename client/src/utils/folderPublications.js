export const PUBLICATIONS_TYPE = "publications";

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

export function buildPublicationCreateMeta({
  title,
  template_key,
  is_private = false,
}) {
  const config = getTemplateConfig(template_key);
  if (!config) {
    throw new Error(`Unknown publication template: ${template_key}`);
  }

  const additional_meta = {
    title,
    template: config.key,
    layout_mode: config.layout_mode,
    requested_slug: title,
    source_medias: [],
    $status: is_private === true ? "private" : "public",
    $admins: "parent_contributors",
  };

  if (typeof config.page_width === "number") {
    additional_meta.page_width = config.page_width;
  }
  if (typeof config.page_height === "number") {
    additional_meta.page_height = config.page_height;
  }

  return additional_meta;
}

export function filePathToSourceMedia(file_path) {
  if (!file_path) return null;
  const meta_filename = file_path.split("/").pop();
  if (!meta_filename) return null;
  return { meta_filename_in_project: meta_filename };
}

export function filePathFromSourceMedia(source_media, folder_path) {
  if (!source_media?.meta_filename_in_project || !folder_path) return null;
  return `${folder_path}/${source_media.meta_filename_in_project}`;
}

export function pruneSourceMedias(source_medias, valid_file_paths) {
  if (!Array.isArray(source_medias)) return [];
  const valid_meta_names = new Set(
    valid_file_paths.map((p) => p.split("/").pop())
  );
  return source_medias.filter((sm) =>
    valid_meta_names.has(sm?.meta_filename_in_project)
  );
}

export function sourceMediasToPaths(source_medias, folder_path) {
  if (!Array.isArray(source_medias) || !folder_path) return [];
  return source_medias
    .map((sm) => filePathFromSourceMedia(sm, folder_path))
    .filter(Boolean);
}
