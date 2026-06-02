<template>
  <div
    class="_mediaListPrintInsertZone"
    :class="{
      'is--dragActive': drag_active,
      'is--dragOver': drag_over,
    }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <b-icon icon="plus-lg" class="_mediaListPrintInsertZone--icon" />
  </div>
</template>

<script>
import { MEDIA_LIST_PRINT_SLOT_MIME } from "@/utils/mediaListUtils.js";

export default {
  props: {
    insert_at_index: {
      type: Number,
      required: true,
    },
    drag_active: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      drag_over: false,
      drag_enter_count: 0,
    };
  },
  methods: {
    onDragEnter() {
      if (!this.drag_active) return;
      this.drag_enter_count += 1;
      this.drag_over = true;
    },
    onDragOver(event) {
      if (!this.drag_active) return;
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
        if (typeof payload?.page_index !== "number" || !payload?.file_path) {
          return null;
        }
        return payload;
      } catch {
        return null;
      }
    },
    onDrop(event) {
      if (!this.drag_active) return;
      this.resetDragOver();
      const payload = this.readDraggedPayload(event);
      if (!payload) return;
      this.$emit("insertMedia", {
        insert_at_index: this.insert_at_index,
        from_page_index: payload.page_index,
        media_path: payload.file_path,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListPrintInsertZone {
  min-height: 380px;
  flex-shrink: 0;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  border: 1px dashed transparent;
  background: transparent;
  pointer-events: none;
  transition: background 0.15s ease, border-color 0.15s ease;

  &.is--dragActive {
    pointer-events: auto;
    background: rgba(42, 157, 143, 0.06);
    border-color: rgba(42, 157, 143, 0.35);

    ._mediaListPrintInsertZone--icon {
      opacity: 0.55;
      transform: scale(0.85);
    }
  }

  &.is--dragOver {
    background: rgba(42, 157, 143, 0.12);
    border-color: var(--c-bleuvert, #2a9d8f);

    ._mediaListPrintInsertZone--icon {
      opacity: 1;
      transform: scale(1);
    }
  }
}

._mediaListPrintInsertZone--icon {
  opacity: 0;
  transform: scale(0.6);
  font-size: 1.25rem;
  color: var(--c-bleuvert, #2a9d8f);
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
</style>
