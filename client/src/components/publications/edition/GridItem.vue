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
      <div v-if="!area_current_file" class="_gridItem--actions">
        <button
          type="button"
          class="u-button u-button_bleuvert"
          @click="createText"
        >
          {{ $t("add_text") }}
        </button>
        <button
          type="button"
          class="u-button u-button_bleuvert"
          @click="show_media_picker = true"
        >
          {{ $t("add_medias") }}
        </button>
      </div>

      <div v-else-if="area_is_text">
        <MainText
          :text_file="area_current_file"
          :medias_holder="area_current_file"
          :publication_path="publication.$path"
          :show_label="false"
        />
      </div>

      <div
        v-else
        class="_gridItem--media"
        :style="{
          '--object-fit': area_objectFit,
          '--object-position': area_objectPosition,
        }"
      >
        <MediaContent :file="area_current_file" :resolution="1600" />
        <div class="_gridItem--mediaActions">
          <button
            type="button"
            class="u-button u-button_bleuvert u-button_small"
            :title="
              area_objectFit === 'contain'
                ? $t('object_fit_contain')
                : $t('object_fit_cover')
            "
            @click.stop="toggleObjectFit"
          >
            <b-icon
              :icon="
                area_objectFit === 'contain' ? 'aspect-ratio' : 'aspect-ratio-fill'
              "
            />
            {{ $t("object_fit") }}
          </button>
          <button
            type="button"
            class="u-button u-button_bleuvert u-button_small"
            @click="show_media_picker = true"
          >
            {{ $t("change") }}
          </button>
          <button
            type="button"
            class="u-button u-button_red u-button_small"
            @click="removeAreaMedia"
          >
            {{ $t("remove") }}
          </button>
        </div>
      </div>
    </div>

    <MediaPicker
      v-if="show_media_picker"
      :publication_path="publication.$path"
      :select_mode="'single'"
      :pick_from_types="['image']"
      @pickMedias="pickMediaForArea"
      @close="show_media_picker = false"
    />
  </div>
</template>

<script>
import MainText from "@/components/publications/edition/MainText.vue";
import MediaPicker from "@/components/publications/MediaPicker.vue";

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
    MediaPicker,
  },
  data() {
    return {
      show_media_picker: false,
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {
    area_source_media() {
      return this.area?.source_medias?.[0];
    },
    area_file_from_source_medias() {
      if (!this.area_source_media) return;
      return this.getSourceMedia({
        source_media: this.area_source_media,
        folder_path: this.publication.$path,
      });
    },
    area_file_from_content_meta() {
      const content_meta = this.area.content_meta || this.area.main_text_meta;
      if (!content_meta) return;
      return this.publication.$files.find((f) =>
        f.$path.endsWith("/" + content_meta)
      );
    },
    area_file_from_grid_area_id() {
      return this.publication.$files.find((f) => f.grid_area_id === this.area.id);
    },
    area_current_file() {
      return (
        this.area_file_from_source_medias ||
        this.area_file_from_content_meta ||
        this.area_file_from_grid_area_id
      );
    },
    area_is_text() {
      return (
        this.area_current_file?.$type === "text" ||
        this.area_current_file?.content_type === "markdown"
      );
    },
    area_objectFit() {
      return this.area?.objectFit || "cover";
    },
    area_objectPosition() {
      return this.area?.objectPosition || "center";
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
            // ensure media isn't also set for this area
            source_medias: [],
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

    async pickMediaForArea(medias) {
      const media = medias?.[0];
      if (!media) return;

      const areaId = this.area.id;
      const import_mode = this.$root.publication_include_mode;
      const new_entry = await this.prepareMediaForPublication({
        path_to_source_media_meta: media.$path,
        publication_path: this.publication.$path,
        import_mode,
      });

      const new_grid_areas = this.chapter.grid_areas.map((area) => {
        if (area.id === areaId) {
          return {
            ...area,
            source_medias: [new_entry],
            // default fit options for medias in grid areas
            objectFit: "cover",
            objectPosition: "center",
            // clear text-specific references so the area has one source of truth
            content_meta: null,
            main_text_meta: null,
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

      this.show_media_picker = false;
    },

    removeAreaMedia() {
      const areaId = this.area.id;

      const new_grid_areas = this.chapter.grid_areas.map((area) => {
        if (area.id === areaId) {
          return {
            ...area,
            source_medias: [],
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

    toggleObjectFit() {
      const areaId = this.area.id;
      const nextFit = this.area_objectFit === "contain" ? "cover" : "contain";

      const new_grid_areas = this.chapter.grid_areas.map((area) => {
        if (area.id === areaId) {
          return {
            ...area,
            objectFit: nextFit,
            objectPosition: "center",
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

._gridItem--actions {
  display: flex;
  flex-flow: row wrap;
  gap: calc(var(--spacing) / 2);
}

._gridItem--media {
  position: relative;
  background-color: var(--c-gris_clair);
  border-radius: var(--border-radius);
  overflow: hidden;

  ::v-deep {
    ._mediaContent,
    img {
      width: 100%;
      height: auto;
      height: 120px;
      
      object-fit: scale-down;
    }

    ._mediaContent--image,
    .plyr--video,
    .plyr__poster,
    ._mediaContent--iframe,
    ._iframeStylePreview {
      position: absolute;
      height: 100%;
      width: 100%;
      object-fit: var(--object-fit, cover);
      object-position: var(--object-position, center);
      background-size: var(--object-fit, cover);
      background-position: var(--object-position, center);
    }
  }
}

._gridItem--mediaActions {
  position: absolute;
  bottom: 0;
  right: 0;
  display: flex;
  flex-flow: row wrap;
  gap: calc(var(--spacing) / 2);
  margin: calc(var(--spacing) / 2);
}
</style>
