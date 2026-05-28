<template>
  <div class="_mediaListWebEditor">
    <div
      ref="scroller"
      class="_mediaListWebEditor--scroller"
      @scroll="onScrollerScroll"
    >
      <section
        v-for="(slide, index) in slides"
        :key="slide.key"
        :ref="`slide-${index}`"
        class="_mediaListWebEditor--slide"
      >
        <div class="_mediaListWebEditor--media" v-if="slide.file">
          <MediaContent
            :file="slide.file"
            context="full"
            :resolution="1280"
          />
        </div>
        <div v-else class="_mediaListWebEditor--missing">Media unavailable</div>
        <p
          v-if="slide.caption"
          class="_mediaListWebEditor--caption"
          v-text="slide.caption"
        />
      </section>
    </div>
    <p v-if="!slides.length" class="_mediaListWebEditor--empty">
      No slides — add medias to the list first.
    </p>
  </div>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import {
  ensureWebPublication,
  getWebPublicationPath,
  pruneSourceMedias,
  saveWebSourceMedias,
  filePathFromSourceMedia,
} from "@/utils/mediaListProjectUtils.js";

export default {
  components: {
    MediaContent,
  },
  props: {
    folder_path: {
      type: String,
      required: true,
    },
    resolved_items: {
      type: Array,
      default: () => [],
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
    active_path: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      source_medias: [],
      save_timeout: null,
      is_loading: true,
    };
  },
  computed: {
    files_by_path() {
      const map = new Map();
      for (const item of this.resolved_items) {
        map.set(item.file.$path, item.file);
      }
      return map;
    },
    valid_paths() {
      return this.resolved_items.map((item) => item.file.$path);
    },
    publication_path() {
      return getWebPublicationPath(
        this.folder_path,
        this.$api.tokenpath?.token_path
      );
    },
    slides() {
      return this.source_medias.map((sm, index) => {
        const file_path = filePathFromSourceMedia(sm, this.folder_path);
        const file = file_path ? this.files_by_path.get(file_path) : null;
        const caption = file ? this.getCaption(file) : "";
        return {
          key: `${file_path || index}-${index}`,
          file,
          caption,
        };
      });
    },
  },
  watch: {
    active_path(path) {
      if (!path) return;
      this.scrollToPath(path);
    },
    media_list_paths() {
      this.scheduleSave();
    },
  },
  async mounted() {
    await this.loadWebPublication();
  },
  beforeDestroy() {
    if (this.save_timeout) clearTimeout(this.save_timeout);
  },
  methods: {
    getCaption(file) {
      const raw = (file.caption || "").replace(/<[^>]+>/g, "").trim();
      return raw;
    },
    async loadWebPublication() {
      this.is_loading = true;
      try {
        const web_folder = await ensureWebPublication(
          this.$api,
          this.folder_path,
          this.media_list_paths
        );
        let source_medias = web_folder?.source_medias || [];
        source_medias = pruneSourceMedias(source_medias, this.valid_paths);
        if (!source_medias.length && this.media_list_paths.length) {
          source_medias = this.media_list_paths.map((p) => ({
            meta_filename_in_project: p.split("/").pop(),
          }));
          await saveWebSourceMedias(
            this.$api,
            this.folder_path,
            source_medias
          );
        }
        this.source_medias = source_medias;
      } finally {
        this.is_loading = false;
      }
    },
    scrollToPath(path) {
      const index = this.slides.findIndex(
        (s) => s.file && s.file.$path === path
      );
      if (index < 0) return;
      const el = this.$refs[`slide-${index}`];
      const target = Array.isArray(el) ? el[0] : el;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    onScrollerScroll() {},
    scheduleSave() {
      if (this.save_timeout) clearTimeout(this.save_timeout);
      this.save_timeout = setTimeout(() => this.persistSourceMedias(), 600);
    },
    async persistSourceMedias() {
      const pruned = pruneSourceMedias(this.source_medias, this.valid_paths);
      this.source_medias = pruned;
      await saveWebSourceMedias(this.$api, this.folder_path, pruned);
    },
    async reorderToMatchListOrder() {
      const order_map = new Map(
        this.media_list_paths.map((p, i) => [p.split("/").pop(), i])
      );
      const sorted = [...this.source_medias].sort((a, b) => {
        const ia = order_map.get(a.meta_filename_in_project) ?? 999;
        const ib = order_map.get(b.meta_filename_in_project) ?? 999;
        return ia - ib;
      });
      this.source_medias = sorted;
      await this.persistSourceMedias();
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListWebEditor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111;
}

._mediaListWebEditor--scroller {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
}

._mediaListWebEditor--slide {
  position: relative;
  flex-shrink: 0;
  min-height: calc(100vh - 140px);
  scroll-snap-align: start;
  scroll-snap-stop: always;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

._mediaListWebEditor--media {
  width: 100%;
  height: 100%;

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ::v-deep img,
  ::v-deep video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

._mediaListWebEditor--missing {
  color: #888;
  font-size: var(--sl-font-size-small);
}

._mediaListWebEditor--caption {
  position: absolute;
  left: 50%;
  bottom: calc(var(--spacing) * 2);
  transform: translateX(-50%);
  max-width: min(90%, 640px);
  margin: 0;
  padding: calc(var(--spacing) / 2) calc(var(--spacing) / 1);
  border-radius: var(--border-radius);
  background: rgba(0, 0, 0, 0.55);
  color: white;
  text-align: center;
  font-size: var(--sl-font-size-small);
  line-height: 1.4;
  pointer-events: none;
}

._mediaListWebEditor--empty {
  margin: auto;
  padding: calc(var(--spacing) * 2);
  color: #aaa;
  text-align: center;
}
</style>
