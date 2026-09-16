<template>
  <div class="_mediaGridView">
    <ViewEmptyMessage v-if="!files.length" />
    <div class="_mediaGridView--grid">
      <CanvasItem
        v-for="file in files"
        :key="file.$path"
        :file="file"
        mode="grid"
        :show_media_list_sidebar="show_media_list_sidebar"
        :media_list_paths="media_list_paths"
        :is_selected="selected_files.includes(file.$path)"
        class="_mediaGridView--item"
        :data-file-path="file.$path"
        @select="onSelect"
      />
    </div>
  </div>
</template>
<script>
import CanvasItem from "@/components/slash/CanvasItem.vue";
import ViewEmptyMessage from "@/components/slash/ViewEmptyMessage.vue";

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
    show_media_list_sidebar: {
      type: Boolean,
      default: false,
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
    selected_files: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    CanvasItem,
    ViewEmptyMessage,
  },
  methods: {
    onSelect(file_path, mode) {
      this.$emit("select", file_path, mode);
    },
  },
};
</script>
<style lang="scss" scoped>
._mediaGridView {
  position: absolute;
  inset: 0;
  overflow: auto;
  padding: calc(var(--spacing, 1rem) * 2);
  padding-top: calc(var(--spacing, 1rem) * 7); /* under the top bar */
  background: var(--c-slash-blue, var(--c-bleuvert));
}

._mediaGridView--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing, 1rem);
  max-width: 1400px;
  margin: 0 auto;
}

._mediaGridView--item {
  aspect-ratio: 4 / 3;
  border-radius: 0;
  overflow: hidden;
  background: var(--c-slash-mint, #e5ffdb);
  border: 2px solid var(--c-slash-mint, #e5ffdb);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    border-color 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--c-slash-burgundy, var(--c-rouge));
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  }

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: block;
  }
  ::v-deep ._mediaContent--image,
  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}
</style>
