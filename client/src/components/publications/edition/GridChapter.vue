<template>
  <div class="_gridChapter">
    <div class="_gridItems">
      <GridItem
        v-for="area in sorted_grid_areas"
        :key="area.id"
        :area="area"
        :area_text_meta="getAreaTextMeta(area)"
        :publication="publication"
        @createText="createText"
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
    async createText(areaId) {
      const chapter_name = this.chapter.$path.split("/").pop();
      const filename = `${chapter_name}-${areaId}_text.md`;

      const { meta_filename } = await this.$api.uploadText({
        path: this.publication.$path,
        filename,
        content: "",
        additional_meta: {
          content_type: "markdown",
          grid_area_id: areaId,
        },
      });

      // Update grid area with the new file
      const new_grid_areas = this.chapter.grid_areas.map((area) => {
        if (area.id === areaId) {
          return {
            ...area,
            main_text_meta: meta_filename,
          };
        }
        return area;
      });

      this.$api.updateMeta({
        path: this.chapter.$path,
        new_meta: {
          grid_areas: new_grid_areas,
        },
      });
    },
    getAreaTextMeta(area) {
      if (area.main_text_meta) {
        return this.publication.$files.find((f) =>
          f.$path.endsWith("/" + area.main_text_meta)
        );
      }
      return this.publication.$files.find((f) => f.grid_area_id === area.id);
    },
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
