<template>
  <aside class="_publicationsSidebar">
    <div class="_publicationsSidebar--header">
      <div class="_publicationsSidebar--headerLeft">
        <button
          v-if="pane === 'create'"
          type="button"
          class="u-button u-button_icon"
          :title="$t('back_to_publications')"
          @click="goToList"
        >
          <b-icon icon="arrow-left" />
        </button>
        <strong>{{ header_title }}</strong>
      </div>
      <button
        type="button"
        class="u-button u-button_icon"
        :title="$t('close')"
        @click="$emit('close')"
      >
        <b-icon icon="x-lg" />
      </button>
    </div>

    <div class="_publicationsSidebar--body">
      <!-- LIST -->
      <template v-if="pane === 'list'">
        <button
          type="button"
          class="_publicationsSidebar--createRow"
          :class="{ 'is--disabled': !can_edit }"
          :aria-disabled="!can_edit ? 'true' : 'false'"
          @click="openCreate"
        >
          <b-icon icon="plus-lg" />
          <span>{{ $t("create_a_publication") }}</span>
        </button>

        <p v-if="!publications.length" class="_publicationsSidebar--empty">
          {{ $t("no_publications") }}
        </p>

        <ul v-else class="_publicationsSidebar--list">
          <li v-for="pub in publications" :key="pub.$path">
            <button
              type="button"
              class="_publicationsSidebar--pubRow"
              @click="openPublication(pub)"
            >
              <span class="_publicationsSidebar--pubTitle">{{
                pub.title || pub.$path.split("/").pop()
              }}</span>
              <span class="_publicationsSidebar--pubMeta">
                <b-icon
                  :icon="templateIcon(pub.template)"
                  class="_publicationsSidebar--pubIcon"
                />
                <span>{{ templateLabel(pub.template) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </template>

      <!-- CREATE -->
      <template v-else-if="pane === 'create'">
        <div v-if="!selected_template" class="_publicationsSidebar--formats">
          <button
            v-for="template in template_options"
            :key="template.key"
            type="button"
            class="_publicationsSidebar--formatSquare"
            @click="selectTemplate(template.key)"
          >
            <b-icon
              :icon="template.icon"
              class="_publicationsSidebar--formatCorner"
            />
            <span class="_publicationsSidebar--formatLabel">{{
              $t(template.label_key)
            }}</span>
          </button>
        </div>

        <form
          v-else
          class="_publicationsSidebar--titleForm"
          @submit.prevent="createPublication"
        >
          <p class="_publicationsSidebar--selectedFormat">
            <b-icon :icon="selected_template_config.icon" />
            {{ $t(selected_template_config.label_key) }}
          </p>
          <DLabel :str="$t('title')" />
          <TextInput
            :content.sync="new_publication_title"
            :maxlength="60"
            :required="true"
            :autofocus="true"
            ref="titleInput"
            @toggleValidity="($event) => (allow_save = $event)"
          />
          <div class="_publicationsSidebar--formActions">
            <button
              type="button"
              class="u-button"
              @click="selected_template = null"
            >
              {{ $t("back") }}
            </button>
            <button
              type="submit"
              class="u-button u-button_bleuvert"
              :disabled="!allow_save || is_creating"
            >
              {{ $t("create") }}
            </button>
          </div>
          <div v-if="create_error" class="u-errorMsg" v-text="create_error" />
        </form>
      </template>
    </div>

    <BaseModal2
      v-if="publication"
      size="x-large"
      :nopadding="true"
      :title="publication_modal_title"
      @close="closePublicationModal"
    >
      <div class="_publicationModal">
        <div class="_publicationModal--meta">
          <span class="_publicationsSidebar--openTemplate">
            <b-icon :icon="templateIcon(publication.template)" />
            {{ templateLabel(publication.template) }}
          </span>
        </div>

        <p
          v-if="!resolved_items.length"
          class="_publicationsSidebar--emptyHint"
        >
          {{ $t("publication_add_medias_hint") }}
        </p>

        <ol v-else class="_publicationsSidebar--mediaList">
          <li
            v-for="(item, index) in resolved_items"
            :key="item.file.$path"
            class="_publicationsSidebar--mediaRow"
          >
            <span class="_publicationsSidebar--order">{{ index + 1 }}</span>
            <div class="_publicationsSidebar--thumb">
              <MediaContent
                :file="item.file"
                context="preview"
                :resolution="320"
              />
            </div>
            <div class="_publicationsSidebar--mediaMeta">
              <span class="_publicationsSidebar--mediaTitle">{{
                item.label
              }}</span>
              <span class="_publicationsSidebar--mediaType">{{
                item.file.$type
              }}</span>
            </div>
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

        <div
          v-if="can_edit && available_folder_files.length"
          class="_publicationsSidebar--picker"
        >
          <DLabel :str="$t('add_medias')" />
          <ul class="_publicationsSidebar--pickerList">
            <li v-for="file in available_folder_files" :key="file.$path">
              <button
                type="button"
                class="_publicationsSidebar--pickerItem"
                @click="addMedia(file.$path)"
              >
                <div class="_publicationsSidebar--thumb is--small">
                  <MediaContent
                    :file="file"
                    context="preview"
                    :resolution="50"
                  />
                </div>
                <span>{{ getItemLabel(file) }}</span>
                <b-icon icon="plus" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="u-button _publicationsSidebar--exportBtn"
          disabled
          :title="$t('export_coming_soon')"
        >
          <b-icon icon="box-arrow-up" />
          <span>{{ $t("export") }}</span>
        </button>
      </template>
    </BaseModal2>
  </aside>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import { isMediaListFile } from "@/utils/mediaListUtils.js";
import {
  TEMPLATE_KEYS,
  TEMPLATE_REGISTRY,
  getRootPublicationsPath,
  getRootPublicationPath,
  getTemplateConfig,
  buildPublicationCreateMeta,
  filePathToSourceMedia,
  pruneSourceMedias,
  sourceMediasToPaths,
} from "@/utils/folderPublications.js";

export default {
  components: {
    MediaContent,
  },
  props: {
    folder_path: {
      type: String,
      required: true,
    },
    files: {
      type: Array,
      default: () => [],
    },
    can_edit: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      pane: "list",
      publications: [],
      publications_path: "",
      selected_template: null,
      new_publication_title: "",
      allow_save: false,
      is_creating: false,
      create_error: "",
      publication: null,
      publication_slug: null,
      is_saving_medias: false,
    };
  },
  computed: {
    template_options() {
      return TEMPLATE_KEYS.map((key) => TEMPLATE_REGISTRY[key]);
    },
    selected_template_config() {
      return getTemplateConfig(this.selected_template);
    },
    header_title() {
      if (this.pane === "create") return this.$t("create_a_publication");
      return this.$t("publications");
    },
    publication_modal_title() {
      return (
        this.publication?.title ||
        this.publication_slug ||
        this.$t("publications")
      );
    },
    files_by_path() {
      const map = new Map();
      for (const file of this.files) {
        map.set(file.$path, file);
      }
      return map;
    },
    media_paths() {
      return sourceMediasToPaths(
        this.publication?.source_medias,
        this.folder_path
      );
    },
    resolved_items() {
      return this.media_paths
        .map((path) => {
          const file = this.files_by_path.get(path);
          if (!file) return null;
          return { file, label: this.getItemLabel(file) };
        })
        .filter(Boolean);
    },
    available_folder_files() {
      const used = new Set(this.media_paths);
      return this.files.filter(
        (file) => isMediaListFile(file) && !used.has(file.$path)
      );
    },
  },
  watch: {
    folder_path: {
      immediate: true,
      handler() {
        this.resetToList();
        this.loadPublicationsList();
      },
    },
    files() {
      this.pruneOpenedSourceMedias();
    },
    media_paths: {
      handler(paths) {
        this.$emit("update:media_list_paths", paths);
      },
      immediate: true,
    },
  },
  mounted() {
    this.$eventHub.$on("mediaList.addFile", this.onAddFileFromCanvas);
  },
  beforeDestroy() {
    this.$eventHub.$off("mediaList.addFile", this.onAddFileFromCanvas);
    this.leavePublicationsListRoom();
    this.leaveOpenedPublicationRoom();
  },
  methods: {
    isRoomJoined(room) {
      return Array.isArray(this.$api.rooms_joined)
        ? this.$api.rooms_joined.includes(room)
        : false;
    },
    templateIcon(template_key) {
      return getTemplateConfig(template_key)?.icon || "file-earmark";
    },
    templateLabel(template_key) {
      const config = getTemplateConfig(template_key);
      return config ? this.$t(config.label_key) : template_key || "";
    },
    getItemLabel(file) {
      const caption = (file.caption || "").replace(/<[^>]+>/g, "").trim();
      if (caption) return caption;
      const filename = file.$path?.split("/").pop() || "Untitled";
      return filename.replace(/\.meta\.txt$/, "");
    },
    async loadPublicationsList() {
      this.leavePublicationsListRoom();
      this.publications_path = getRootPublicationsPath();
      try {
        this.publications = await this.$api.getFolders({
          path: this.publications_path,
        });
        if (!this.isRoomJoined(this.publications_path)) {
          this.$api.join({ room: this.publications_path });
        }
      } catch (err) {
        this.publications = [];
        console.error("Failed to load publications", err);
      }
    },
    leavePublicationsListRoom() {
      if (this.publications_path && this.isRoomJoined(this.publications_path)) {
        this.$api.leave({ room: this.publications_path });
      }
    },
    leaveOpenedPublicationRoom() {
      if (
        this.publication?.$path &&
        this.isRoomJoined(this.publication.$path)
      ) {
        this.$api.leave({ room: this.publication.$path });
      }
    },
    resetToList() {
      this.leaveOpenedPublicationRoom();
      this.pane = "list";
      this.selected_template = null;
      this.new_publication_title = "";
      this.allow_save = false;
      this.create_error = "";
      this.publication = null;
      this.publication_slug = null;
      this.$emit("update:media_list_paths", []);
    },
    goToList() {
      this.selected_template = null;
      this.new_publication_title = "";
      this.create_error = "";
      this.pane = "list";
    },
    closePublicationModal() {
      this.leaveOpenedPublicationRoom();
      this.publication = null;
      this.publication_slug = null;
      this.pane = "list";
      this.$emit("update:media_list_paths", []);
      this.loadPublicationsList(this.folder_path);
    },
    openCreate() {
      if (!this.can_edit) {
        this.alertCreateDisabledReason();
        return;
      }
      this.selected_template = null;
      this.new_publication_title = "";
      this.create_error = "";
      this.pane = "create";
    },
    alertCreateDisabledReason() {
      const message = !this.connected_as
        ? this.$t("you_must_login_to_contribute")
        : this.$t("not_allowed_to_contribute_contact_referent");
      this.$alertify?.delay(4000)?.error(message);
    },
    selectTemplate(template_key) {
      this.selected_template = template_key;
      this.new_publication_title = "";
      this.allow_save = false;
      this.create_error = "";
      this.$nextTick(() => {
        this.$refs.titleInput?.$el?.querySelector?.("input")?.focus?.();
      });
    },
    async createPublication() {
      if (!this.allow_save || this.is_creating || !this.selected_template) {
        return;
      }
      this.is_creating = true;
      this.create_error = "";
      const title = this.cleanUpString(this.new_publication_title);
      try {
        const additional_meta = buildPublicationCreateMeta({
          title,
          template_key: this.selected_template,
          at_root: true,
          admin_path: this.connected_as?.$path,
        });
        const new_folder_slug = await this.$api.createFolder({
          path: getRootPublicationsPath(),
          additional_meta,
        });
        const created_template = this.selected_template;
        await this.loadPublicationsList();
        this.pane = "list";
        this.selected_template = null;
        this.new_publication_title = "";
        const pub = this.publications.find((p) =>
          p.$path?.endsWith(`/${new_folder_slug}`)
        );
        if (created_template === "postcard" || pub?.template === "postcard") {
          this.$router.push({
            name: "Postcard",
            params: { publication_slug: new_folder_slug },
          });
          return;
        }
        this.$router.push({
          name: "RootPublication",
          params: { publication_slug: new_folder_slug },
        });
        return;
      } catch (err) {
        if (err?.code === "unique_field_taken") {
          this.create_error = this.$t("title_taken");
          this.$refs.titleInput?.$el?.querySelector?.("input")?.select?.();
        } else {
          this.create_error =
            err?.message || this.$t("failed_to_create_publication");
        }
      } finally {
        this.is_creating = false;
      }
    },
    async openPublication(pub) {
      if (!pub?.$path) return;
      const slug = pub.$path.split("/").pop();
      if (pub.template === "postcard") {
        this.$router.push({
          name: "PostcardShare",
          params: { publication_slug: slug },
        });
        return;
      }
      if (pub.template === "a5_booklet" || pub.template === "carousel") {
        this.$router.push({
          name: "RootPublication",
          params: { publication_slug: slug },
        });
        return;
      }
      await this.openPublicationBySlug(slug);
    },
    async openPublicationBySlug(slug) {
      this.leaveOpenedPublicationRoom();
      this.publication_slug = slug;
      const path = getRootPublicationPath(slug);
      try {
        this.publication = await this.$api.getFolder({ path });
        if (!this.isRoomJoined(path)) {
          this.$api.join({ room: path });
        }
        await this.pruneOpenedSourceMedias();
        this.pane = "list";
      } catch (err) {
        console.error("Failed to open publication", err);
        this.publication = null;
        this.publication_slug = null;
        this.pane = "list";
      }
    },
    async pruneOpenedSourceMedias() {
      if (!this.publication?.$path || this.is_saving_medias) return;
      // Root pubs may reference medias outside this folder — only prune
      // entries that use legacy meta_filename and are clearly missing here.
      const valid_paths = this.files.map((f) => f.$path);
      const current = Array.isArray(this.publication.source_medias)
        ? this.publication.source_medias
        : [];
      const has_only_legacy = current.every((sm) => !sm?.path);
      if (!has_only_legacy) return;
      const pruned = pruneSourceMedias(current, valid_paths);
      if (pruned.length === current.length) return;
      await this.persistSourceMedias(pruned);
    },
    async persistSourceMedias(source_medias) {
      if (!this.publication?.$path || !this.can_edit) return;
      this.is_saving_medias = true;
      try {
        await this.$api.updateMeta({
          path: this.publication.$path,
          new_meta: { source_medias },
        });
        this.$set(this.publication, "source_medias", source_medias);
      } catch (err) {
        console.error("Failed to update publication medias", err);
        this.$alertify?.error?.(this.$t("failed_to_save"));
      } finally {
        this.is_saving_medias = false;
      }
    },
    async addMedia(file_path) {
      if (!this.can_edit || !file_path) return;
      const current = Array.isArray(this.publication?.source_medias)
        ? [...this.publication.source_medias]
        : [];
      if (
        current.some(
          (sm) =>
            sm?.path === file_path ||
            sm?.meta_filename_in_project === file_path.split("/").pop()
        )
      ) {
        return;
      }
      const source = filePathToSourceMedia(file_path);
      if (!source) return;
      await this.persistSourceMedias([...current, source]);
    },
    async removeMediaAt(index) {
      if (!this.can_edit) return;
      const current = Array.isArray(this.publication?.source_medias)
        ? [...this.publication.source_medias]
        : [];
      current.splice(index, 1);
      await this.persistSourceMedias(current);
    },
    onAddFileFromCanvas({ file }) {
      if (!this.publication) return;
      if (!file?.$path || !isMediaListFile(file)) return;
      this.addMedia(file.$path);
    },
  },
};
</script>

<style lang="scss" scoped>
._publicationsSidebar {
  --pub-bg: var(--c-slash-blue, var(--c-bleuvert));
  --pub-fg: var(--c-slash-mint, #e5ffdb);
  --pub-accent: var(--c-slash-burgundy, var(--c-rouge));

  flex: 0 0 min(320px, 40vw);
  width: min(320px, 40vw);
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--pub-bg);
  color: var(--pub-fg);
  border-left: 1px solid color-mix(in srgb, var(--pub-fg) 30%, transparent);
  padding: calc(var(--spacing) / 1);
  gap: calc(var(--spacing) / 2);
  overflow: hidden;
}

._publicationsSidebar--header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: calc(var(--spacing) / 3);
  color: var(--pub-fg);

  .u-button {
    color: var(--pub-fg);
  }
}

._publicationsSidebar--headerLeft {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  min-width: 0;

  strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--pub-fg);
  }
}

._publicationsSidebar--body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
  overflow: auto;
}

._publicationsSidebar--createRow {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 3);
  width: 100%;
  padding: calc(var(--spacing) / 2);
  border: 2px dashed var(--pub-fg);
  border-radius: calc(var(--border-radius) * 1.25);
  background: transparent;
  color: var(--pub-fg);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    border-color 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &:disabled,
  &.is--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):not(.is--disabled):hover {
    border-color: var(--pub-fg);
    background: color-mix(in srgb, var(--pub-fg) 12%, transparent);
  }
}

._publicationsSidebar--empty,
._publicationsSidebar--emptyHint {
  margin: 0;
  padding: calc(var(--spacing) / 2);
  font-size: var(--sl-font-size-small);
  color: color-mix(in srgb, var(--pub-fg) 80%, transparent);
  text-align: center;
}

._publicationsSidebar--list,
._publicationsSidebar--mediaList,
._publicationsSidebar--pickerList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 3);
}

._publicationsSidebar--pubRow {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--spacing) / 4);
  padding: calc(var(--spacing) / 2);
  border: 2px solid var(--pub-fg);
  border-radius: calc(var(--border-radius) * 1.25);
  background: var(--pub-fg);
  color: var(--pub-accent);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    border-color 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--pub-accent);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
  }
}

._publicationsSidebar--pubTitle {
  font-weight: 700;
  font-size: var(--sl-font-size-small);
  color: var(--pub-accent);
}

._publicationsSidebar--pubMeta {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  font-size: var(--sl-font-size-x-small);
  color: color-mix(in srgb, var(--pub-accent) 70%, transparent);
}

._publicationsSidebar--formats {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
}

._publicationsSidebar--formatSquare {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  border: 2px solid var(--pub-fg);
  border-radius: calc(var(--border-radius) * 1.25);
  background: var(--pub-fg);
  color: var(--pub-accent);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--spacing) / 2);
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    border-color 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--pub-accent);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
  }
}

._publicationsSidebar--formatCorner {
  position: absolute;
  top: calc(var(--spacing) / 3);
  right: calc(var(--spacing) / 3);
  font-size: 0.85rem;
  opacity: 0.85;
}

._publicationsSidebar--formatLabel {
  font-weight: 700;
  font-size: var(--sl-font-size-small);
  text-align: center;
}

._publicationsSidebar--titleForm {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
  color: var(--pub-fg);

  ::v-deep .u-label,
  ::v-deep ._dLabel {
    color: var(--pub-fg);
  }
}

._publicationsSidebar--selectedFormat {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 3);
  margin: 0;
  font-weight: 600;
  color: var(--pub-fg);
}

._publicationsSidebar--formActions {
  display: flex;
  gap: calc(var(--spacing) / 3);
  justify-content: flex-end;

  .u-button:not(.u-button_bleuvert) {
    color: var(--pub-fg);
  }
}

._publicationsSidebar--openTemplate {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  font-size: var(--sl-font-size-x-small);
  color: var(--c-gris_fonce, #666);
}

._publicationModal {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: calc(var(--spacing) / 1);
}

._publicationModal--meta {
  flex-shrink: 0;
}

._publicationsSidebar--mediaRow,
._publicationsSidebar--pickerItem {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 3);
  width: 100%;
  padding: calc(var(--spacing) / 3);
  border-radius: var(--border-radius);
  background: white;
  border: 1px solid transparent;
}

._publicationsSidebar--pickerItem {
  cursor: pointer;
  text-align: left;
  border-color: var(--c-gris, #ccc);

  &:hover {
    border-color: var(--active-color);
  }
}

._publicationsSidebar--order {
  flex-shrink: 0;
  width: 1.25rem;
  text-align: center;
  font-size: var(--sl-font-size-x-small);
  font-weight: 700;
}

._publicationsSidebar--thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: calc(var(--border-radius) - 2px);
  overflow: hidden;
  background: var(--c-gris, #ddd);

  &.is--small {
    width: 36px;
    height: 36px;
  }

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

._publicationsSidebar--mediaMeta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

._publicationsSidebar--mediaTitle {
  font-size: var(--sl-font-size-small);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

._publicationsSidebar--mediaType {
  font-size: var(--sl-font-size-x-small);
  color: var(--c-gris_fonce, #666);
  text-transform: capitalize;
}

._publicationsSidebar--picker {
  margin-top: calc(var(--spacing) / 2);
  padding-top: calc(var(--spacing) / 2);
  border-top: 1px solid var(--c-gris, #ccc);
}

._publicationsSidebar--exportBtn {
  min-height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) / 3);
  font-weight: 700;
}
</style>
