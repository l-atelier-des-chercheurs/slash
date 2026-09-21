<template>
  <BaseModal2
    :title="modal_title"
    size="large"
    @close="$emit('close')"
  >
    <div class="_pickMediaFromFolder">
      <p class="_pickMediaFromFolder--filterHint">
        {{ $t("filtered_by_type", { type: type_label }) }}
      </p>

      <label class="_pickMediaFromFolder--folderField">
        <span class="_pickMediaFromFolder--folderLabel">{{
          $t("select_a_folder")
        }}</span>
        <select
          class="_pickMediaFromFolder--select"
          v-model="folder_path"
          @change="loadFiles"
        >
          <option value="">—</option>
          <option
            v-for="folder in folders"
            :key="folder.$path"
            :value="folder.$path"
          >
            {{ folder.title || folder.$path.split("/").pop() }}
          </option>
        </select>
      </label>

      <div v-if="is_loading" class="_pickMediaFromFolder--status">
        {{ $t("loading") }}
      </div>
      <div
        v-else-if="!folder_path"
        class="_pickMediaFromFolder--status"
      >
        {{ $t("select_a_folder") }}
      </div>
      <div
        v-else-if="!sorted_files.length"
        class="_pickMediaFromFolder--status"
      >
        {{ $t("no_media_of_type_in_folder", { type: type_label }) }}
      </div>
      <div v-else class="_pickMediaFromFolder--grid">
        <button
          v-for="file in sorted_files"
          :key="file.$path"
          type="button"
          class="_pickMediaFromFolder--tile"
          :title="mediaLabel(file)"
          @click="pickFile(file)"
        >
          <div class="_pickMediaFromFolder--thumb">
            <MediaContent
              :file="file"
              context="preview"
              :resolution="320"
            />
            <span
              v-if="media_type === 'audio'"
              class="_pickMediaFromFolder--typeBadge"
            >
              <b-icon icon="soundwave" />
            </span>
          </div>
          <span class="_pickMediaFromFolder--name">{{
            mediaLabel(file)
          }}</span>
        </button>
      </div>
    </div>
  </BaseModal2>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";

export default {
  name: "PickMediaFromFolder",
  components: {
    MediaContent,
  },
  props: {
    media_type: {
      type: String,
      required: true,
      validator: (value) => ["image", "audio"].includes(value),
    },
    folders: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      folder_path: "",
      folder_files: [],
      is_loading: false,
    };
  },
  computed: {
    type_label() {
      return String(this.$t(this.media_type) || this.media_type).toLowerCase();
    },
    modal_title() {
      return this.$t("pick_media_of_type", { type: this.type_label });
    },
    sorted_files() {
      return this.folder_files
        .filter((file) => file?.$type === this.media_type)
        .slice()
        .sort(
          (a, b) => +new Date(b.$date_created) - +new Date(a.$date_created)
        );
    },
  },
  methods: {
    mediaLabel(file) {
      if (!file) return "";
      const caption = (file.caption || "").replace(/<[^>]+>/g, "").trim();
      if (caption) return caption;
      const filename = file.$path?.split("/").pop() || "Untitled";
      return filename.replace(/\.meta\.txt$/, "");
    },
    async loadFiles() {
      this.folder_files = [];
      if (!this.folder_path) return;
      this.is_loading = true;
      try {
        const folder = await this.$api.getFolder({
          path: this.folder_path,
        });
        this.folder_files = Array.isArray(folder?.$files) ? folder.$files : [];
      } catch (err) {
        console.error(err);
        this.folder_files = [];
      } finally {
        this.is_loading = false;
      }
    },
    pickFile(file) {
      if (!file?.$path) return;
      this.$emit("pickMedia", file);
      this.$emit("close");
    },
  },
};
</script>

<style lang="scss" scoped>
._pickMediaFromFolder {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) * 0.85);
  min-height: 18rem;
}

._pickMediaFromFolder--filterHint {
  margin: 0;
  padding: calc(var(--spacing) / 3) calc(var(--spacing) / 2);
  align-self: flex-start;
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--color-blue, #4980c8) 14%, transparent);
  color: var(--color-blue, #4980c8);
  font-size: var(--sl-font-size-x-small, 0.75rem);
  font-weight: 600;
  letter-spacing: 0.02em;
}

._pickMediaFromFolder--folderField {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 3);
}

._pickMediaFromFolder--folderLabel {
  font-size: var(--sl-font-size-small, 0.85rem);
  font-weight: 600;
}

._pickMediaFromFolder--select {
  width: 100%;
  max-width: 28rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-color, #ccc);
  border-radius: var(--border-radius, 0.5rem);
  background: #fff;
  font: inherit;
}

._pickMediaFromFolder--status {
  margin: auto 0;
  padding: calc(var(--spacing) * 1.5) 0;
  text-align: center;
  color: var(--color-gray, #666);
  font-size: var(--sl-font-size-small, 0.85rem);
}

._pickMediaFromFolder--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: calc(var(--spacing) * 0.75);
  max-height: min(55vh, 28rem);
  overflow: auto;
  padding-bottom: calc(var(--spacing) / 2);
}

._pickMediaFromFolder--tile {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 3);
  padding: 0;
  border: 2px solid transparent;
  border-radius: calc(var(--border-radius, 0.5rem) * 1.1);
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--color-blue, #4980c8);
    transform: translateY(-2px);
    outline: none;
  }
}

._pickMediaFromFolder--thumb {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--border-radius, 0.5rem);
  background: color-mix(in srgb, var(--color-blue, #4980c8) 10%, #f4f4f4);

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
  }

  ::v-deep ._mediaContent--image,
  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

._pickMediaFromFolder--typeBadge {
  position: absolute;
  right: 0.35rem;
  bottom: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-burgundy, #87221d);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

._pickMediaFromFolder--name {
  display: block;
  padding: 0 0.15rem;
  font-size: var(--sl-font-size-x-small, 0.75rem);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
