<template>
  <div class="_gridChapter">
    <div class="_gridItems">
      <GridItem
        v-for="area in sorted_grid_areas"
        :key="area.id"
        :area="area"
        :chapter="chapter"
        :publication="publication"
      />
    </div>
  </div>
</template>

<script>
import GridItem from "./GridItem.vue";

export default {
  props: {
    chapter: Object,
    publication: Object,
  },
  components: {
    GridItem,
  },
  data() {
    return {};
  },
  computed: {
    sorted_grid_areas() {
      return this.chapter.grid_areas?.sort((a, b) => a.id.localeCompare(b.id));
    },
  },
  methods: {

  },
};
</script>

<style lang="scss" scoped>
._gridChapter {
  padding-bottom: calc(var(--spacing) * 1);
}

._gridItems {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) * 1);
}
</style>
