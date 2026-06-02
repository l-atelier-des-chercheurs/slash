<template>
  <div class="_mediaListPrintEditor">
    <div v-if="pages.length" class="_mediaListPrintEditor--grid">
      <div
        v-for="(page, index) in pages"
        :key="pageKey(page, index)"
        class="_mediaListPrintEditor--tile"
      >
        <p class="_mediaListPrintEditor--pageTitle">Page {{ index + 1 }}</p>
        <MediaListPrintLayouts
          :page_index="index"
          :template="page.template"
          :slot_medias="slotMediasForPage(page)"
          @moveMedia="onMoveMedia"
        />
      </div>
    </div>
    <p v-else class="_mediaListPrintEditor--empty">
      No pages — add medias to the list first.
    </p>
  </div>
</template>

<script>
import MediaListPrintLayouts from "@/components/slash/MediaListPrintLayouts.vue";
import {
  buildPrintPagesFromPaths,
  movePrintMediaBetweenPages,
  pruneEmptyPrintPages,
} from "@/utils/mediaListUtils.js";
import {
  createPrintPageData,
  DEFAULT_PRINT_PAGE_TEMPLATE,
} from "@/utils/mediaListPrintPageEngine.js";

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
    media_list_paths: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      pages: [],
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
    seed_paths() {
      return this.valid_paths.length
        ? this.valid_paths
        : this.media_list_paths;
    },
  },
  watch: {
    seed_paths: {
      handler() {
        this.syncPagesFromPaths();
      },
      immediate: true,
    },
  },
  methods: {
    pageKey(page, index) {
      const paths = (page.medias_filepaths || []).join("|");
      return `${index}-${paths}`;
    },
    slotMediasForPage(page) {
      return (page.medias_filepaths || [])
        .map((path) => this.files_by_path.get(path))
        .filter(Boolean);
    },
    syncPagesFromPaths() {
      const valid_set = new Set(this.valid_paths.length ? this.valid_paths : []);
      let pages = this.pages.map((page) => ({
        medias_filepaths: (page.medias_filepaths || []).filter(
          (path) => !valid_set.size || valid_set.has(path)
        ),
        template: page.template || DEFAULT_PRINT_PAGE_TEMPLATE,
      }));
      pages = pruneEmptyPrintPages(pages);

      const assigned = new Set(pages.flatMap((page) => page.medias_filepaths));
      for (const path of this.seed_paths) {
        if (!path || assigned.has(path)) continue;
        if (valid_set.size && !valid_set.has(path)) continue;
        pages.push(createPrintPageData([path]));
        assigned.add(path);
      }

      if (!pages.length && this.seed_paths.length) {
        pages = buildPrintPagesFromPaths(this.seed_paths);
      }

      this.pages = pages;
    },
    onMoveMedia({ from_page_index, to_page_index, media_path }) {
      this.pages = movePrintMediaBetweenPages(
        this.pages,
        from_page_index,
        to_page_index,
        media_path
      );
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListPrintEditor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--c-gris_clair, #f5f5f5);
}

._mediaListPrintEditor--grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: calc(var(--spacing) * 1);
  padding: calc(var(--spacing) * 1);
  align-content: start;
}

._mediaListPrintEditor--tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  min-width: 0;
}

._mediaListPrintEditor--pageTitle {
  margin: 0;
  width: 250px;
  font-size: var(--sl-font-size-x-small);
  font-weight: 600;
  color: var(--c-gris_fonce, #666);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
