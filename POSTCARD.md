# Postcard & root publications

## Architecture

Publications live at content-tree **level 0**: `publications/{slug}`.

They can reference medias from **any** documentation space (`folders/…`) via `source_medias` entries that store a full media `$path`:

```js
{ path: "folders/atelier/photo.jpg.meta.txt", meta_filename_in_project: "photo.jpg.meta.txt" }
```

| Template | Entry | Editor |
| --- | --- | --- |
| `postcard` | Home → Create a postcard | `/postcard/:publication_slug` → [`PostcardView.vue`](client/src/views/PostcardView.vue) |
| `postcard` (view) | Home tile / Share URL | `/postcard/:publication_slug/view` — centered card; edit button if user can edit |
| `a5_booklet` | Home → Create a booklet | `/publications/:publication_slug` → [`RootPublicationView.vue`](client/src/views/RootPublicationView.vue) |

Helpers: [`client/src/utils/folderPublications.js`](client/src/utils/folderPublications.js) (`ROOT_PUBLICATIONS_PATH`, `buildPublicationCreateMeta({ at_root: true })`).

## Home ([`FoldersSidebar.vue`](client/src/components/slash/FoldersSidebar.vue))

1. **Slash/** + Living archive  
2. **Publication** — dashed create tiles + existing pubs (cover with title overlay)  
3. **Documentation spaces** — folder grid (New folder + folders)

## Postcard editor (v1)

- Two steps: form → generate card → export PNG / share URL / modifier  
- On generate: rasterize postcard PNG and upload as publication `$cover` (2000×1420)  
- Share URL opens `/postcard/:slug/view` (static, centered card only; no general password via `$public` + `getPublicFolder`)  
- Stamp with audio: click play on QR → audio from start; stamp swaps to square stop  
- Image + audio: upload into the publication folder **or** pick from any folder  
- Text stored as publication `message`  
- QR via `qr-code-styling` with embedded play icon when audio is present; encodes the share URL; simplified QR at 0.5 opacity without audio  

## Folder publications sidebar

[`PublicationsSidebar.vue`](client/src/components/slash/PublicationsSidebar.vue) lists/creates under root `publications/` as well. Opening a postcard navigates to `/postcard/:slug`.

## Non-goals (still)

- Automatic migration of old `folders/…/publications/` nested pubs  
- Public QR → hosted audio playback URL  
