<template>
  <div class="_mediaListThumbsStrip">
    <button
      v-for="(item, index) in resolved_items"
      :key="item.file.$path"
      type="button"
      class="_mediaListThumbsStrip--thumb"
      :class="{ 'is--active': active_path === item.file.$path }"
      :draggable="draggable"
      @click="$emit('select', item.file.$path)"
      @dragstart="onDragStart($event, item.file)"
    >
      <span class="_mediaListThumbsStrip--order">{{ index + 1 }}</span>
      <MediaContent :file="item.file" context="preview" :resolution="320" />
    </button>
  </div>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import { MEDIA_LIST_DRAG_MIME } from "@/utils/mediaListUtils.js";

export default {
  components: {
    MediaContent,
  },
  props: {
    resolved_items: {
      type: Array,
      default: () => [],
    },
    active_path: {
      type: String,
      default: "",
    },
    draggable: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    onDragStart(event, file) {
      if (!file?.$path) return;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(MEDIA_LIST_DRAG_MIME, file.$path);
      event.dataTransfer.setData("text/plain", file.$path);
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListThumbsStrip {
  flex-shrink: 0;
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) / 3);
  padding: calc(var(--spacing) / 2) calc(var(--spacing) / 1);
  overflow-x: auto;
  border-bottom: 1px solid var(--c-gris, #ccc);
  background: var(--c-gris_clair);
}

._mediaListThumbsStrip--thumb {
  position: relative;
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--border-radius);
  overflow: hidden;
  background: white;
  cursor: grab;

  &.is--active {
    border-color: var(--c-bleuvert, #2a9d8f);
  }

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: block;
  }

  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

._mediaListThumbsStrip--order {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 2;
  min-width: 1.1rem;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.3;
}
</style>
