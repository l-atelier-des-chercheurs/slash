<template>
  <div class="_mediaGridView">
    <div class="_mediaGridView--grid">
      <CanvasItem
        v-for="file in files"
        :key="file.$path"
        :file="file"
        mode="grid"
        class="_mediaGridView--item"
      />
    </div>
  </div>
</template>
<script>
import CanvasItem from "@/components/slash/CanvasItem.vue";

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    CanvasItem,
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
  border-radius: var(--border-radius, 6px);
  overflow: hidden;
  background: var(--c-gris_clair, #f0f0f0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

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
