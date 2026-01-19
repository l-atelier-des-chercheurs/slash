<template>
  <div class="_gridItem">
    <div class="_gridItem--header">
      <span class="_gridItem--label">
        {{ area.id }}
      </span>

      <!-- <select class="_gridItem--select" size="small">
        <option value="1">texte (markdown)</option>
        <option value="2">titre</option>
        <option value="3">sous-titre</option>
        <option value="4">média (image, video, audio)</option>
      </select> -->
    </div>
    <div class="_gridItem--content">
      <button
        v-if="!area_text_meta"
        type="button"
        class="u-button u-button_bleuvert"
        @click="createText"
      >
        {{ $t("add_text") }}
      </button>
      <div v-else>
        <MainText
          :text_file="area_text_meta"
          :medias_holder="area_text_meta"
          :publication_path="publication.$path"
          :show_label="false"
        />
      </div>
    </div>
  </div>
</template>

<script>
import MainText from "@/components/publications/edition/MainText.vue";

export default {
  props: {
    area: {
      type: Object,
      required: true,
    },
    chapter: {
      type: Object,
      required: true,
    },
    publication: Object,
  },
  components: {
    MainText,
  },
  data() {
    return {};
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {
    area_text_meta() {
      const content_meta = this.area.content_meta || this.area.main_text_meta;
      if (content_meta) {
        return this.publication.$files.find((f) =>
          f.$path.endsWith("/" + content_meta)
        );
      }
      return this.publication.$files.find((f) => f.grid_area_id === this.area.id);
    },
  },
  methods: {
    async createText() {
      const areaId = this.area.id;
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
            content_meta: meta_filename,
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
  },
};
</script>

<style lang="scss" scoped>
._gridItem {
  border: 1px solid var(--c-gris);
  padding: calc(var(--spacing) / 4) calc(var(--spacing) / 2);
  border-radius: var(--input-border-radius);
}

._gridItem--header {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--spacing) / 2);
  margin-bottom: calc(var(--spacing) * 1);
}

._gridItem--content {
}

._gridItem--label {
  font-weight: bold;
}
._gridItem--select {
  width: 25ch;
}
</style>
