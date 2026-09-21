<template>
  <div class="_rootPub">
    <header class="_rootPub--header">
      <button type="button" class="u-button" @click="goHome">
        <b-icon icon="arrow-left" />
        {{ $t("back") }}
      </button>
      <h1 class="_rootPub--title">{{ publication_title }}</h1>
      <span class="_rootPub--template">{{ template_label }}</span>
    </header>

    <div v-if="is_loading" class="_rootPub--loading">{{ $t("loading") }}</div>
    <div v-else-if="load_error" class="u-errorMsg">{{ load_error }}</div>

    <div v-else class="_rootPub--body">
      <p v-if="!resolved_items.length" class="_rootPub--hint">
        {{ $t("publication_add_medias_hint") }}
      </p>

      <ol v-else class="_rootPub--mediaList">
        <li
          v-for="(item, index) in resolved_items"
          :key="item.path"
          class="_rootPub--mediaRow"
        >
          <span class="_rootPub--order">{{ index + 1 }}</span>
          <div class="_rootPub--thumb">
            <MediaContent
              v-if="item.file"
              :file="item.file"
              context="preview"
              :resolution="320"
            />
          </div>
          <span class="_rootPub--mediaTitle">{{ item.label }}</span>
          <button
            v-if="can_edit"
            type="button"
            class="u-button u-button_icon"
            :title="$t('remove')"
            @click="removeMediaAt(index)"
          >
            <b-icon icon="x" />
          </button>
        </li>
      </ol>

      <div v-if="can_edit" class="_rootPub--picker">
        <DLabel :str="$t('add_medias')" />
        <div class="_rootPub--folderPick">
          <select v-model="picker_folder_path" @change="loadPickerFiles">
            <option value="">— folder —</option>
            <option
              v-for="folder in accessible_folders"
              :key="folder.$path"
              :value="folder.$path"
            >
              {{ folder.title || folder.$path.split("/").pop() }}
            </option>
          </select>
        </div>
        <ul v-if="picker_files.length" class="_rootPub--pickerList">
          <li v-for="file in available_picker_files" :key="file.$path">
            <button
              type="button"
              class="_rootPub--pickerItem"
              @click="addMedia(file.$path)"
            >
              <MediaContent
                :file="file"
                context="preview"
                :resolution="50"
              />
              <span>{{ getItemLabel(file) }}</span>
              <b-icon icon="plus" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import { isMediaListFile } from "@/utils/mediaListUtils.js";
import {
  getRootPublicationPath,
  getTemplateConfig,
  filePathToSourceMedia,
  sourceMediasToPaths,
} from "@/utils/folderPublications.js";

export default {
  name: "RootPublicationView",
  components: { MediaContent },
  data() {
    return {
      publication: null,
      is_loading: true,
      load_error: "",
      folders: [],
      picker_folder_path: "",
      picker_files: [],
      files_cache: {},
      is_saving: false,
    };
  },
  computed: {
    publication_slug() {
      return this.$route.params.publication_slug || "";
    },
    publication_path() {
      return getRootPublicationPath(this.publication_slug);
    },
    publication_title() {
      return (
        this.publication?.title ||
        this.publication_slug ||
        this.$t("publications")
      );
    },
    template_label() {
      const config = getTemplateConfig(this.publication?.template);
      return config ? this.$t(config.label_key) : this.publication?.template || "";
    },
    can_edit() {
      if (!this.publication) return false;
      return this.canEditFolder({ folder: this.publication });
    },
    accessible_folders() {
      return (this.folders || []).filter((folder) =>
        this.canLoggedinSeeFolder({ folder })
      );
    },
    media_paths() {
      return sourceMediasToPaths(this.publication?.source_medias, "");
    },
    resolved_items() {
      return this.media_paths.map((path) => {
        const file = this.files_cache[path] || null;
        return {
          path,
          file,
          label: file ? this.getItemLabel(file) : path.split("/").pop(),
        };
      });
    },
    available_picker_files() {
      const used = new Set(this.media_paths);
      return this.picker_files.filter(
        (file) => isMediaListFile(file) && !used.has(file.$path)
      );
    },
  },
  async created() {
    await this.bootstrap();
  },
  beforeDestroy() {
    if (this.publication_path && this.isRoomJoined(this.publication_path)) {
      this.$api.leave({ room: this.publication_path });
    }
  },
  methods: {
    isRoomJoined(room) {
      return Array.isArray(this.$api.rooms_joined)
        ? this.$api.rooms_joined.includes(room)
        : false;
    },
    goHome() {
      this.$router.push({ name: "Accueil" });
    },
    getItemLabel(file) {
      const caption = (file.caption || "").replace(/<[^>]+>/g, "").trim();
      if (caption) return caption;
      const filename = file.$path?.split("/").pop() || "Untitled";
      return filename.replace(/\.meta\.txt$/, "");
    },
    async bootstrap() {
      this.is_loading = true;
      this.load_error = "";
      try {
        this.folders = await this.$api.getFolders({ path: "folders" });
        this.publication = await this.$api.getFolder({
          path: this.publication_path,
        });
        if (!this.isRoomJoined(this.publication_path)) {
          this.$api.join({ room: this.publication_path });
        }
        await this.hydrateMediaCache();
      } catch (err) {
        console.error(err);
        this.load_error = err?.message || this.$t("page_failed_to_load");
      } finally {
        this.is_loading = false;
      }
    },
    async hydrateMediaCache() {
      for (const path of this.media_paths) {
        if (this.files_cache[path]) continue;
        try {
          const file = await this.$api.getFolder({ path });
          this.$set(this.files_cache, path, file);
        } catch (err) {
          console.warn("Missing media", path, err);
        }
      }
    },
    async loadPickerFiles() {
      this.picker_files = [];
      if (!this.picker_folder_path) return;
      try {
        const folder = await this.$api.getFolder({
          path: this.picker_folder_path,
        });
        this.picker_files = Array.isArray(folder?.$files) ? folder.$files : [];
      } catch (err) {
        console.error(err);
        this.picker_files = [];
      }
    },
    async persistSourceMedias(source_medias) {
      if (!this.can_edit || !this.publication?.$path) return;
      this.is_saving = true;
      try {
        await this.$api.updateMeta({
          path: this.publication.$path,
          new_meta: { source_medias },
        });
        this.$set(this.publication, "source_medias", source_medias);
        await this.hydrateMediaCache();
      } catch (err) {
        console.error(err);
        this.$alertify?.error?.(this.$t("failed_to_save"));
      } finally {
        this.is_saving = false;
      }
    },
    async addMedia(file_path) {
      const current = Array.isArray(this.publication?.source_medias)
        ? [...this.publication.source_medias]
        : [];
      if (current.some((sm) => sm?.path === file_path)) return;
      const source = filePathToSourceMedia(file_path);
      if (!source) return;
      await this.persistSourceMedias([...current, source]);
    },
    async removeMediaAt(index) {
      const current = Array.isArray(this.publication?.source_medias)
        ? [...this.publication.source_medias]
        : [];
      current.splice(index, 1);
      await this.persistSourceMedias(current);
    },
  },
};
</script>

<style lang="scss" scoped>
._rootPub {
  max-width: 40rem;
  margin: 0 auto;
  padding: calc(var(--spacing) * 1.5);
}

._rootPub--header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--spacing) / 2);
  margin-bottom: calc(var(--spacing) * 1.5);
}

._rootPub--title {
  margin: 0;
  flex: 1 1 auto;
  font-size: var(--sl-font-size-x-large);
}

._rootPub--template {
  color: var(--c-gris_fonce);
  font-size: var(--sl-font-size-small);
}

._rootPub--hint {
  color: var(--c-gris_fonce);
}

._rootPub--mediaList {
  list-style: none;
  margin: 0 0 calc(var(--spacing)) ;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
}

._rootPub--mediaRow {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 2);
  padding: calc(var(--spacing) / 2);
  background: var(--c-gris_clair);
  border-radius: var(--border-radius);
}

._rootPub--order {
  font-weight: 700;
  width: 1.5rem;
}

._rootPub--thumb {
  width: 3.5rem;
  height: 3.5rem;
  overflow: hidden;
  border-radius: 4px;
  flex-shrink: 0;
}

._rootPub--mediaTitle {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

._rootPub--picker {
  margin-top: calc(var(--spacing));
}

._rootPub--folderPick {
  margin-bottom: calc(var(--spacing) / 2);

  select {
    width: 100%;
    max-width: 24rem;
  }
}

._rootPub--pickerList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

._rootPub--pickerItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  text-align: left;
  background: white;
  border: 1px solid var(--c-gris);
  border-radius: var(--border-radius);
  cursor: pointer;

  ::v-deep img,
  ::v-deep video {
    width: 2rem;
    height: 2rem;
    object-fit: cover;
  }
}
</style>
