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
      const sorted_areas = this.chapter.grid_areas?.sort((a, b) =>
        a.id.localeCompare(b.id)
      );
      if (!sorted_areas) return [];
      // dont show areas that are more than one character long
      const filtered_areas = sorted_areas.filter((area) => area.id.length <= 1);
      return filtered_areas;
    },
  },
  methods: {},
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
