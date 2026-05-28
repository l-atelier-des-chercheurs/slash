<template>
  <div class="_mediaListPrintEditor">
    <aside class="_mediaListPrintEditor--pages">
      <button
        type="button"
        class="u-button u-button_bleuvert _mediaListPrintEditor--addPage"
        @click="addPage"
      >
        <b-icon icon="plus-lg" />
        Add page
      </button>
      <button
        v-for="(page, index) in pages"
        :key="page.$path"
        type="button"
        class="_mediaListPrintEditor--pageBtn"
        :class="{ 'is--active': selected_page_path === page.$path }"
        @click="selectPage(page)"
      >
        {{ page.title || `Page ${index + 1}` }}
      </button>
    </aside>
    <div class="_mediaListPrintEditor--canvas" v-if="selected_page">
      <MediaListPrintLayouts
        :layout_id="selected_layout_id"
        :slot_medias="selected_slot_medias"
        :files_by_path="files_by_path"
        @addAt="onAddMediaAt"
        @removeAt="onRemoveMediaAt"
      />
    </div>
    <p v-else class="_mediaListPrintEditor--empty">
      Add a page, then drag medias from the strip above.
    </p>
  </div>
</template>

<script>
import MediaListPrintLayouts from "@/components/slash/MediaListPrintLayouts.vue";
import {
  ensurePrintPublication,
  loadPrintPages,
  createPrintPage,
  updatePrintPageMedias,
  getPrintPublicationPath,
  pruneSourceMedias,
  filePathFromSourceMedia,
  MAX_MEDIAS_PER_PRINT_PAGE,
} from "@/utils/mediaListProjectUtils.js";

export default {
  components: {
    MediaListPrintLayouts,
  },
  props: {
    folder_path: {
      type: String,
      required: true,
    },
    resolved_items: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      pages: [],
      selected_page_path: "",
      is_loading: false,
    };
  },
  computed: {
    files_by_path() {
      const map = new Map();
      for (const item of this.resolved_items) {
        map.set(item.file.$path, item.file);
      }
      return map;
    },
    valid_paths() {
      return this.resolved_items.map((item) => item.file.$path);
    },
    publication_path() {
      return getPrintPublicationPath(
        this.folder_path,
        this.$api.tokenpath?.token_path
      );
    },
    selected_page() {
      return this.pages.find((p) => p.$path === this.selected_page_path);
    },
    selected_source_medias() {
      const raw = this.selected_page?.source_medias || [];
      return pruneSourceMedias(raw, this.valid_paths);
    },
    selected_layout_id() {
      return this.selected_page?.layout_id || "one";
    },
    selected_slot_medias() {
      return this.selected_source_medias
        .map((sm) => {
          const path = filePathFromSourceMedia(sm, this.folder_path);
          return path ? this.files_by_path.get(path) : null;
        })
        .filter(Boolean);
    },
  },
  async mounted() {
    await this.refreshPages();
  },
  methods: {
    async refreshPages() {
      this.is_loading = true;
      try {
        await ensurePrintPublication(this.$api, this.folder_path);
        this.pages = await loadPrintPages(this.$api, this.folder_path);
        if (
          this.selected_page_path &&
          !this.pages.some((p) => p.$path === this.selected_page_path)
        ) {
          this.selected_page_path = "";
        }
        if (!this.selected_page_path && this.pages.length) {
          this.selected_page_path = this.pages[0].$path;
        }
      } finally {
        this.is_loading = false;
      }
    },
    selectPage(page) {
      this.selected_page_path = page.$path;
    },
    async addPage() {
      const index = this.pages.length + 1;
      const page = await createPrintPage(
        this.$api,
        this.folder_path,
        index
      );
      await this.refreshPages();
      this.selected_page_path = page.$path;
    },
    async onAddMediaAt({ index, source_media }) {
      if (!this.selected_page) return;
      const current = this.selected_source_medias.slice();
      if (current.length >= MAX_MEDIAS_PER_PRINT_PAGE) return;
      const meta_name = source_media.meta_filename_in_project;
      if (
        current.some((sm) => sm.meta_filename_in_project === meta_name)
      ) {
        return;
      }
      current.splice(index, 0, source_media);
      await updatePrintPageMedias(this.$api, this.selected_page, current);
      await this.refreshPages();
    },
    async onRemoveMediaAt(index) {
      if (!this.selected_page) return;
      const current = this.selected_source_medias.slice();
      current.splice(index, 1);
      await updatePrintPageMedias(this.$api, this.selected_page, current);
      await this.refreshPages();
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListPrintEditor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) / 1);
  padding: calc(var(--spacing) / 1);
  overflow: hidden;
}

._mediaListPrintEditor--pages {
  flex: 0 0 140px;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 4);
  overflow-y: auto;
}

._mediaListPrintEditor--addPage {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) / 4);
}

._mediaListPrintEditor--pageBtn {
  text-align: left;
  padding: calc(var(--spacing) / 3) calc(var(--spacing) / 2);
  border: 1px solid var(--c-gris, #ccc);
  border-radius: var(--border-radius);
  background: white;
  cursor: pointer;
  font-size: var(--sl-font-size-small);

  &.is--active {
    border-color: var(--c-bleuvert, #2a9d8f);
    background: rgba(42, 157, 143, 0.1);
  }
}

._mediaListPrintEditor--canvas {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

._mediaListPrintEditor--empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: var(--c-gris_fonce, #666);
}
</style>
