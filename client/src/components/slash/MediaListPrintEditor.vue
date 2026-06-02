<template>
  <div class="_mediaListPrintEditor">
    <transition-group
      v-if="pages.length"
      tag="div"
      name="printPageList"
      class="_mediaListPrintEditor--grid"
      :class="{ 'is--dragging': !!drag_payload }"
    >
      <div
        v-for="item in grid_items"
        :key="item.key"
        class="_mediaListPrintEditor--gridItem"
        :class="{
          'is--insert': item.type === 'insert',
          'is--page': item.type === 'page',
        }"
      >
        <MediaListPrintInsertZone
          v-if="item.type === 'insert'"
          :insert_at_index="item.insert_at"
          :drag_active="!!drag_payload"
          @insertMedia="onInsertMedia"
        />
        <div v-else class="_mediaListPrintEditor--tile">
          <p class="_mediaListPrintEditor--pageTitle">
            Page {{ item.page_index + 1 }}
          </p>
          <MediaListPrintLayouts
            :page_index="item.page_index"
            :template="item.page.template"
            :slot_medias="slotMediasForPage(item.page)"
            @dragStart="onPrintDragStart"
            @dragEnd="onPrintDragEnd"
            @moveMedia="onMoveMedia"
            @swapMedia="onSwapMedia"
          />
        </div>
      </div>
    </transition-group>
    <p v-else class="_mediaListPrintEditor--empty">
      No pages — add medias to the list first.
    </p>
  </div>
</template>

<script>
import MediaListPrintInsertZone from "@/components/slash/MediaListPrintInsertZone.vue";
import MediaListPrintLayouts from "@/components/slash/MediaListPrintLayouts.vue";
import {
  buildPrintPagesFromPaths,
  insertPrintMediaOnNewPage,
  movePrintMediaBetweenPages,
  pruneEmptyPrintPages,
  swapPrintMediaOnPage,
} from "@/utils/mediaListUtils.js";
import {
  clonePrintPageData,
  createPrintPageData,
  DEFAULT_PRINT_PAGE_TEMPLATE,
} from "@/utils/mediaListPrintPageEngine.js";

export default {
  components: {
    MediaListPrintInsertZone,
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
      drag_payload: null,
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
      return this.valid_paths.length ? this.valid_paths : this.media_list_paths;
    },
    grid_items() {
      const items = [];
      this.pages.forEach((page, index) => {
        items.push({
          type: "insert",
          insert_at: index,
          key: `insert-before-${page.page_id}`,
        });
        items.push({
          type: "page",
          page,
          page_index: index,
          key: page.page_id,
        });
      });
      items.push({
        type: "insert",
        insert_at: this.pages.length,
        key: "insert-end",
      });
      return items;
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
    slotMediasForPage(page) {
      return (page.medias_filepaths || [])
        .map((path) => this.files_by_path.get(path))
        .filter(Boolean);
    },
    onPrintDragStart(payload) {
      this.drag_payload = payload;
    },
    onPrintDragEnd() {
      this.drag_payload = null;
    },
    syncPagesFromPaths() {
      const valid_set = new Set(
        this.valid_paths.length ? this.valid_paths : []
      );
      let pages = this.pages.map((page) =>
        clonePrintPageData({
          ...page,
          medias_filepaths: (page.medias_filepaths || []).filter(
            (path) => !valid_set.size || valid_set.has(path)
          ),
        })
      );
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
    onSwapMedia({ page_index, media_path_a, media_path_b }) {
      this.pages = swapPrintMediaOnPage(
        this.pages,
        page_index,
        media_path_a,
        media_path_b
      );
    },
    onInsertMedia({ insert_at_index, from_page_index, media_path }) {
      this.pages = insertPrintMediaOnNewPage(
        this.pages,
        insert_at_index,
        from_page_index,
        media_path
      );
      this.onPrintDragEnd();
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
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: calc(var(--spacing) / 2) 0;
  padding: calc(var(--spacing) * 1);
  align-content: start;
}

._mediaListPrintEditor--gridItem {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;

  &.is--page {
    padding-bottom: calc(var(--spacing) / 2);
  }
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

.printPageList-move {
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.printPageList-enter-active,
.printPageList-leave-active {
  transition: opacity 0.28s cubic-bezier(0.19, 1, 0.22, 1),
    transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.printPageList-enter,
.printPageList-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

.printPageList-leave-active {
  position: absolute;
  z-index: 0;
}
</style>
