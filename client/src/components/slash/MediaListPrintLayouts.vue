<template>
  <div
    class="_mediaListPrintLayouts"
    :class="`is--layout-${layout_id}`"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <div
      v-for="(slot, index) in slots"
      :key="`slot-${index}`"
      class="_mediaListPrintLayouts--slot"
      :class="{ 'is--filled': !!slot.media }"
      @dragover.prevent
      @drop.prevent="onDropSlot($event, index)"
    >
      <template v-if="slot.media">
        <MediaContent
          :file="slot.media"
          context="preview"
          :resolution="480"
        />
        <button
          type="button"
          class="u-button u-button_icon _mediaListPrintLayouts--remove"
          title="Remove"
          @click="$emit('removeAt', index)"
        >
          <b-icon icon="x" />
        </button>
      </template>
      <span v-else class="_mediaListPrintLayouts--placeholder">
        Drop media {{ index + 1 }}
      </span>
    </div>
    <p class="_mediaListPrintLayouts--layoutLabel">Layout: {{ layout_label }}</p>
  </div>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import { MEDIA_LIST_DRAG_MIME } from "@/utils/mediaListUtils.js";
import {
  MAX_MEDIAS_PER_PRINT_PAGE,
  filePathToSourceMedia,
} from "@/utils/mediaListProjectUtils.js";

export default {
  components: {
    MediaContent,
  },
  props: {
    layout_id: {
      type: String,
      default: "one",
    },
    slot_medias: {
      type: Array,
      default: () => [],
    },
    files_by_path: {
      type: Map,
      default: () => new Map(),
    },
  },
  computed: {
    slots() {
      const layout_count =
        this.layout_id === "three"
          ? 3
          : this.layout_id === "two"
          ? 2
          : 1;
      const count = Math.min(
        MAX_MEDIAS_PER_PRINT_PAGE,
        Math.max(layout_count, this.slot_medias.length || 1)
      );
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push({ media: this.slot_medias[i] || null });
      }
      return items;
    },
    layout_label() {
      if (this.layout_id === "two") return "2 items";
      if (this.layout_id === "three") return "3 items";
      return "1 item";
    },
  },
  methods: {
    onDragOver() {},
    onDrop(event) {
      this.onDropSlot(event, this.slot_medias.length);
    },
    onDropSlot(event, index) {
      if (index >= MAX_MEDIAS_PER_PRINT_PAGE) return;
      const path = this.readDraggedPath(event);
      if (!path) return;
      const file = this.files_by_path.get(path);
      if (!file) return;
      const source_media = filePathToSourceMedia(path);
      this.$emit("addAt", { index, source_media, file });
    },
    readDraggedPath(event) {
      const path =
        event.dataTransfer.getData(MEDIA_LIST_DRAG_MIME) ||
        event.dataTransfer.getData("text/plain");
      return path || null;
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListPrintLayouts {
  position: relative;
  width: 100%;
  max-width: 520px;
  aspect-ratio: 210 / 297;
  margin: 0 auto;
  display: grid;
  gap: calc(var(--spacing) / 3);
  padding: calc(var(--spacing) / 2);
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

._mediaListPrintLayouts.is--layout-one {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

._mediaListPrintLayouts.is--layout-two {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
}

._mediaListPrintLayouts.is--layout-three {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;

  ._mediaListPrintLayouts--slot:first-child {
    grid-column: 1 / -1;
  }
}

._mediaListPrintLayouts--slot {
  position: relative;
  min-height: 0;
  border: 2px dashed var(--c-gris, #ccc);
  border-radius: calc(var(--border-radius) - 2px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-gris_clair, #f5f5f5);

  &.is--filled {
    border-style: solid;
    border-color: transparent;
  }

  ::v-deep ._mediaContent,
  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

._mediaListPrintLayouts--placeholder {
  font-size: var(--sl-font-size-x-small);
  color: var(--c-gris_fonce, #666);
  text-align: center;
  padding: calc(var(--spacing) / 2);
}

._mediaListPrintLayouts--remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
}

._mediaListPrintLayouts--layoutLabel {
  position: absolute;
  left: calc(var(--spacing) / 2);
  bottom: calc(var(--spacing) / 4);
  margin: 0;
  font-size: var(--sl-font-size-x-small);
  color: var(--c-gris_fonce, #888);
}
</style>
