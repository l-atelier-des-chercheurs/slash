<template>
  <div
    class="_mediaListPrintLayouts"
    :class="{ 'is--dragOver': drag_over }"
    :style="grid_style"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div
      v-for="slot in layout_slots"
      :key="`slot-${slot.index}`"
      class="_mediaListPrintLayouts--slot"
      :style="slot_style(slot)"
    >
      <div
        v-if="slot.media"
        class="_mediaListPrintLayouts--media"
        draggable="true"
        @dragstart="onMediaDragStart($event, slot.media)"
      >
        <MediaContent
          :file="slot.media"
          context="preview"
          :resolution="320"
        />
      </div>
    </div>
  </div>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import {
  MEDIA_LIST_DRAG_MIME,
  MEDIA_LIST_PRINT_SLOT_MIME,
} from "@/utils/mediaListUtils.js";
import {
  layoutSlotsWithMedias,
  printPageGridStyle,
  printPageSlotStyle,
  resolvePrintPageLayout,
} from "@/utils/mediaListPrintPageEngine.js";

export default {
  components: {
    MediaContent,
  },
  props: {
    page_index: {
      type: Number,
      required: true,
    },
    template: {
      type: String,
      default: "auto",
    },
    slot_medias: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      drag_over: false,
      drag_enter_count: 0,
    };
  },
  computed: {
    page_layout() {
      const count = Math.max(1, this.slot_medias.length);
      return resolvePrintPageLayout({ template: this.template }, count);
    },
    layout_slots() {
      return layoutSlotsWithMedias(this.page_layout, this.slot_medias);
    },
    grid_style() {
      return printPageGridStyle(this.page_layout);
    },
  },
  methods: {
    slot_style(slot) {
      return printPageSlotStyle(slot);
    },
    onMediaDragStart(event, file) {
      if (!file?.$path) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        MEDIA_LIST_PRINT_SLOT_MIME,
        JSON.stringify({
          page_index: this.page_index,
          file_path: file.$path,
        })
      );
      event.dataTransfer.setData(MEDIA_LIST_DRAG_MIME, file.$path);
      event.dataTransfer.setData("text/plain", file.$path);
    },
    onDragEnter() {
      this.drag_enter_count += 1;
      this.drag_over = true;
    },
    onDragOver(event) {
      event.dataTransfer.dropEffect = "move";
    },
    onDragLeave() {
      this.drag_enter_count -= 1;
      if (this.drag_enter_count <= 0) {
        this.drag_enter_count = 0;
        this.drag_over = false;
      }
    },
    resetDragOver() {
      this.drag_enter_count = 0;
      this.drag_over = false;
    },
    readDraggedPayload(event) {
      const slot_raw = event.dataTransfer.getData(MEDIA_LIST_PRINT_SLOT_MIME);
      if (!slot_raw) return null;
      try {
        const payload = JSON.parse(slot_raw);
        if (
          typeof payload?.page_index !== "number" ||
          !payload?.file_path
        ) {
          return null;
        }
        return payload;
      } catch {
        return null;
      }
    },
    onDrop(event) {
      this.resetDragOver();
      const payload = this.readDraggedPayload(event);
      if (!payload) return;
      if (payload.page_index === this.page_index) return;
      this.$emit("moveMedia", {
        from_page_index: payload.page_index,
        to_page_index: this.page_index,
        media_path: payload.file_path,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListPrintLayouts {
  width: 250px;
  aspect-ratio: 210 / 297;
  display: grid;
  gap: 2px;
  padding: calc(var(--spacing) / 3);
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: outline-color 0.15s, box-shadow 0.15s;

  &.is--dragOver {
    outline: 2px solid var(--c-bleuvert, #2a9d8f);
    box-shadow: 0 0 0 4px rgba(42, 157, 143, 0.12);
  }
}

._mediaListPrintLayouts--slot {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-gris_clair, #f5f5f5);
}

._mediaListPrintLayouts--media {
  width: 100%;
  height: 100%;
  cursor: grab;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(0.95);
  }

  &:active {
    cursor: grabbing;
  }

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ::v-deep img,
  ::v-deep video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
