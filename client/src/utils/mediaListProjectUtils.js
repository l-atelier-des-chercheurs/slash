import { computeAutoPrintLayout } from "@/utils/mediaListPrintPageEngine.js";

export const PUBLICATIONS_ROOT = "publications";
export const PUBLICATION_TYPE_WEB = "web";
export const PUBLICATION_TYPE_PRINT = "print";
export function getSlashFolderSlug(folder_path) {
  return folder_path?.split("/").pop() || "";
}

export function getCreatorTokenPath(api) {
  return api?.tokenpath?.token_path || "";
}

export function getPublicationSlug(
  slash_folder_path,
  publication_type,
  creator_token_path = ""
) {
  const folder_slug = getSlashFolderSlug(slash_folder_path);
  const creator_slug = getSlashFolderSlug(creator_token_path);
  const base = `${folder_slug}-${publication_type}`;
  return creator_slug ? `${base}-${creator_slug}` : base;
}

export function getWebPublicationPath(
  slash_folder_path,
  creator_token_path = ""
) {
  return `${PUBLICATIONS_ROOT}/${getPublicationSlug(slash_folder_path, PUBLICATION_TYPE_WEB, creator_token_path)}`;
}

export function getPrintPublicationPath(
  slash_folder_path,
  creator_token_path = ""
) {
  return `${PUBLICATIONS_ROOT}/${getPublicationSlug(slash_folder_path, PUBLICATION_TYPE_PRINT, creator_token_path)}`;
}

function getPublicationPath(api, slash_folder_path, publication_type) {
  return `${PUBLICATIONS_ROOT}/${getPublicationSlug(
    slash_folder_path,
    publication_type,
    getCreatorTokenPath(api)
  )}`;
}

export function layoutIdFromMediaCount(count) {
  const n = Math.max(0, count);
  if (n <= 1) return "one";
  if (n === 2) return "two";
  if (n === 3) return "three";
  return `grid-${n}`;
}

export function computePrintGridLayout(media_count) {
  const { cols, rows, slots } = computeAutoPrintLayout(media_count);
  return { cols, rows, slots };
}

export function filePathToSourceMedia(file_path) {
  if (!file_path) return null;
  const meta_filename = file_path.split("/").pop();
  return { meta_filename_in_project: meta_filename };
}

export function filePathFromSourceMedia(source_media, slash_folder_path) {
  if (!source_media?.meta_filename_in_project || !slash_folder_path) return null;
  return `${slash_folder_path}/${source_media.meta_filename_in_project}`;
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

export function isPrintPageFile(file) {
  if (!file?.$path) return false;
  const name = file.$path.split("/").pop() || "";
  return name.startsWith("page-") && name.endsWith(".meta.txt");
}

function isApiError(err, code) {
  return err?.code === code;
}

function isPublicationOwnedByCreator(publication, creator_token_path) {
  if (!publication || !creator_token_path) return false;
  const { $admins, $contributors } = publication;
  return (
    (Array.isArray($admins) && $admins.includes(creator_token_path)) ||
    (Array.isArray($contributors) && $contributors.includes(creator_token_path))
  );
}

function getNewPublicationAccessMeta(api, slash_folder_path) {
  const creator_token_path = getCreatorTokenPath(api);
  if (!creator_token_path) {
    const err = new Error("login_required");
    err.code = "login_required";
    throw err;
  }
  return {
    slash_folder_path,
    $status: "private",
    $admins: [creator_token_path],
    $contributors: [creator_token_path],
  };
}

async function getFolder(api, publication_path, options = {}) {
  return api.getFolder({ path: publication_path, ...options });
}

async function folderExists(api, path) {
  try {
    await getFolder(api, path);
    return true;
  } catch (err) {
    if (
      isApiError(err, "not_found") ||
      isApiError(err, "folder_is_missing")
    ) {
      return false;
    }
    throw err;
  }
}

async function findPublicationBySlashFolder(
  api,
  slash_folder_path,
  publication_type
) {
  const creator_token_path = getCreatorTokenPath(api);
  const list = await api.getFolders({ path: PUBLICATIONS_ROOT }).catch(() => []);
  if (!Array.isArray(list)) return null;
  return (
    list.find(
      (item) =>
        item.slash_folder_path === slash_folder_path &&
        item.publication_type === publication_type &&
        isPublicationOwnedByCreator(item, creator_token_path)
    ) || null
  );
}

async function createPublicationForSlashFolder(
  api,
  slash_folder_path,
  publication_type,
  additional_meta = {}
) {
  const creator_token_path = getCreatorTokenPath(api);
  const slug = getPublicationSlug(
    slash_folder_path,
    publication_type,
    creator_token_path
  );
  const access_meta = getNewPublicationAccessMeta(api, slash_folder_path);
  const slug_created = await api.createFolder({
    path: PUBLICATIONS_ROOT,
    additional_meta: {
      requested_slug: slug,
      title: additional_meta.title || slug,
      slash_folder_path,
      publication_type,
      ...access_meta,
      ...additional_meta,
    },
  });
  await api.updateStore(PUBLICATIONS_ROOT);
  return `${PUBLICATIONS_ROOT}/${slug_created || slug}`;
}

async function ensurePublication(
  api,
  slash_folder_path,
  publication_type,
  create_meta = {}
) {
  const expected_path = getPublicationPath(
    api,
    slash_folder_path,
    publication_type
  );

  const existing = await findPublicationBySlashFolder(
    api,
    slash_folder_path,
    publication_type
  );
  const existing_path = existing?.$path;
  if (existing_path && (await folderExists(api, existing_path))) {
    return getFolder(api, existing_path);
  }

  if (await folderExists(api, expected_path)) {
    return getFolder(api, expected_path);
  }

  const created_path = await createPublicationForSlashFolder(
    api,
    slash_folder_path,
    publication_type,
    create_meta
  );
  return getFolder(api, created_path);
}

export async function ensureWebPublication(api, folder_path, seed_paths = []) {
  const web_folder = await ensurePublication(
    api,
    folder_path,
    PUBLICATION_TYPE_WEB,
    {
      title: "Web",
      source_medias: seed_paths.map(filePathToSourceMedia).filter(Boolean),
    }
  );

  if (!web_folder.source_medias?.length && seed_paths.length) {
    const source_medias = seed_paths.map(filePathToSourceMedia).filter(Boolean);
    await saveWebSourceMedias(api, folder_path, source_medias);
    return getFolder(api, getPublicationPath(api, folder_path, PUBLICATION_TYPE_WEB));
  }

  return web_folder;
}

export async function ensurePrintPublication(api, folder_path) {
  return ensurePublication(api, folder_path, PUBLICATION_TYPE_PRINT, {
    title: "Print",
    source_medias: [],
  });
}

export async function loadPrintPages(api, slash_folder_path) {
  const print_path = getPublicationPath(api, slash_folder_path, PUBLICATION_TYPE_PRINT);
  await api.updateStore(print_path);
  const folder = await getFolder(api, print_path, { no_files: false });
  const files = folder?.$files || api.store[print_path]?.$files || [];
  return files
    .filter(isPrintPageFile)
    .sort((a, b) => {
      const ta = a.$date_created || "";
      const tb = b.$date_created || "";
      return ta.localeCompare(tb);
    });
}

export async function createPrintPage(api, slash_folder_path, page_index) {
  const print_path = getPublicationPath(api, slash_folder_path, PUBLICATION_TYPE_PRINT);
  const filename = `page-${String(page_index).padStart(3, "0")}.meta.txt`;
  const { meta_filename } = await api.uploadFile({
    path: print_path,
    filename,
    additional_meta: {
      title: `Page ${page_index}`,
      layout_id: "one",
      source_medias: [],
    },
  });
  await api.updateStore(print_path);
  const page_path = `${print_path}/${meta_filename || filename}`;
  return api.getFile({ path: page_path });
}

export async function deletePrintPage(api, slash_folder_path, page_file) {
  const print_path = getPublicationPath(api, slash_folder_path, PUBLICATION_TYPE_PRINT);
  const meta_filename = page_file.$path.split("/").pop();
  await api.deleteItems({ path: print_path, meta_filenames: [meta_filename] });
  await api.updateStore(print_path);
}

export async function updatePrintPageMedias(api, page_file, source_medias) {
  const pruned = Array.isArray(source_medias) ? source_medias : [];
  const layout_id = layoutIdFromMediaCount(pruned.length);
  await api.updateMeta({
    path: page_file.$path,
    new_meta: {
      source_medias: pruned,
      layout_id,
    },
  });
  return { source_medias: pruned, layout_id };
}

export async function ensureOneMediaPerPageSetup(
  api,
  slash_folder_path,
  seed_paths = []
) {
  await ensurePrintPublication(api, slash_folder_path);
  let pages = await loadPrintPages(api, slash_folder_path);

  const valid_meta_names = new Set(
    seed_paths.map((p) => p.split("/").pop()).filter(Boolean)
  );
  const seed = seed_paths.map(filePathToSourceMedia).filter(Boolean);
  const assigned_meta_names = new Set();

  for (const page of pages) {
    const pruned = pruneSourceMedias(page.source_medias || [], seed_paths);

    if (!pruned.length) {
      await deletePrintPage(api, slash_folder_path, page);
      continue;
    }

    if (pruned.length !== (page.source_medias || []).length) {
      await updatePrintPageMedias(api, page, pruned);
    }

    for (const sm of pruned) {
      assigned_meta_names.add(sm.meta_filename_in_project);
    }
  }

  pages = await loadPrintPages(api, slash_folder_path);

  let page_index = pages.length;
  for (const sm of seed) {
    const meta = sm.meta_filename_in_project;
    if (!valid_meta_names.has(meta) || assigned_meta_names.has(meta)) continue;

    page_index += 1;
    const page = await createPrintPage(api, slash_folder_path, page_index);
    await updatePrintPageMedias(api, page, [sm]);
  }

  return loadPrintPages(api, slash_folder_path);
}

export async function saveWebSourceMedias(api, slash_folder_path, source_medias) {
  const web_path = getPublicationPath(api, slash_folder_path, PUBLICATION_TYPE_WEB);
  await api.updateMeta({
    path: web_path,
    new_meta: { source_medias },
  });
  await api.updateStore(web_path);
}
