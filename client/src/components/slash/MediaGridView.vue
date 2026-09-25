<template>
  <div class="_mediaGridView">
    <div class="_mediaGridView--toolbar" role="toolbar" :aria-label="$t('grid_group_by')">
      <span class="_mediaGridView--toolbarLabel">{{ $t("grid_group_by") }}</span>
      <div class="_mediaGridView--toolbarButtons">
        <button
          v-for="option in group_options"
          :key="option.value"
          type="button"
          class="u-button _mediaGridView--groupBtn"
          :class="{ 'is--active': group_by === option.value }"
          :aria-pressed="group_by === option.value"
          @click="setGroupBy(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <ViewEmptyMessage v-if="!files.length" />

    <div v-else class="_mediaGridView--groups">
      <section
        v-for="group in file_groups"
        :key="group.key"
        class="_mediaGridView--section"
      >
        <h2 class="_mediaGridView--sectionTitle">
          <span>{{ group.label }}</span>
          <span class="_mediaGridView--sectionCount">{{ group.files.length }}</span>
        </h2>
        <div class="_mediaGridView--grid">
          <CanvasItem
            v-for="file in group.files"
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
      </section>
    </div>
  </div>
</template>
<script>
import CanvasItem from "@/components/slash/CanvasItem.vue";
import ViewEmptyMessage from "@/components/slash/ViewEmptyMessage.vue";

const GROUP_BY_STORAGE_KEY = "slash_grid_group_by";
const TYPE_ORDER = [
  "image",
  "video",
  "audio",
  "text",
  "pdf",
  "stl",
  "obj",
  "url",
  "other",
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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
  data() {
    const stored = localStorage.getItem(GROUP_BY_STORAGE_KEY);
    const valid = ["date", "type", "author"].includes(stored);
    return {
      group_by: valid ? stored : "date",
      authors_loaded: false,
    };
  },
  async created() {
    await this.ensureAuthorsLoaded();
  },
  computed: {
    group_options() {
      return [
        { value: "date", label: this.$t("grid_group_by_date") },
        { value: "type", label: this.$t("grid_group_by_type") },
        { value: "author", label: this.$t("grid_group_by_author") },
      ];
    },
    file_groups() {
      if (!this.files.length) return [];

      if (this.group_by === "type") return this.groupByType();
      if (this.group_by === "author") return this.groupByAuthor();
      return this.groupByDate();
    },
  },
  methods: {
    async ensureAuthorsLoaded() {
      try {
        await this.$api.getFolders({ path: "authors" });
        this.authors_loaded = true;
      } catch (e) {
        console.error("Failed to load authors for grid grouping", e);
      }
    },
    setGroupBy(value) {
      if (this.group_by === value) return;
      this.group_by = value;
      localStorage.setItem(GROUP_BY_STORAGE_KEY, value);
      if (value === "author" && !this.authors_loaded) {
        this.ensureAuthorsLoaded();
      }
    },
    onSelect(file_path, mode) {
      this.$emit("select", file_path, mode);
    },
    typeLabel(type) {
      if (!type) return this.$t("other");
      if (this.$te(type)) return this.$t(type);
      return type;
    },
    authorLabel(author_path) {
      if (!author_path) return this.$t("grid_group_no_author");
      const author = this.getAuthor(author_path);
      return author?.name || author_path.split("/").pop() || this.$t("grid_group_no_author");
    },
    groupByDate() {
      const map = new Map();

      for (const file of this.files) {
        const key = dayKey(file.$date_created);
        if (!map.has(key)) {
          const date = file.$date_created ? new Date(file.$date_created) : null;
          const label =
            key === "unknown" || !date || Number.isNaN(date.getTime())
              ? this.$t("grid_group_unknown_date")
              : this.formatDateToHuman(startOfDay(date));
          map.set(key, {
            key: `date-${key}`,
            sort: key === "unknown" ? 0 : startOfDay(date).getTime(),
            label,
            files: [],
          });
        }
        map.get(key).files.push(file);
      }

      return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
    },
    groupByType() {
      const map = new Map();

      for (const file of this.files) {
        const key = file.$type || "other";
        if (!map.has(key)) {
          map.set(key, {
            key: `type-${key}`,
            label: this.typeLabel(key),
            files: [],
          });
        }
        map.get(key).files.push(file);
      }

      return Array.from(map.values()).sort((a, b) => {
        const type_a = a.key.replace(/^type-/, "");
        const type_b = b.key.replace(/^type-/, "");
        const index_a = TYPE_ORDER.indexOf(type_a);
        const index_b = TYPE_ORDER.indexOf(type_b);
        const order_a = index_a === -1 ? TYPE_ORDER.length : index_a;
        const order_b = index_b === -1 ? TYPE_ORDER.length : index_b;
        if (order_a !== order_b) return order_a - order_b;
        return a.label.localeCompare(b.label);
      });
    },
    groupByAuthor() {
      const map = new Map();

      for (const file of this.files) {
        const authors = Array.isArray(file.$authors) ? file.$authors : [];
        const key = authors[0] || "no_author";
        if (!map.has(key)) {
          map.set(key, {
            key: `author-${key}`,
            label: this.authorLabel(key === "no_author" ? null : key),
            files: [],
          });
        }
        map.get(key).files.push(file);
      }

      return Array.from(map.values()).sort((a, b) => {
        if (a.key === "author-no_author") return 1;
        if (b.key === "author-no_author") return -1;
        return a.label.localeCompare(b.label);
      });
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

._mediaGridView--toolbar {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) / 2);
  max-width: 1400px;
  margin: 0 auto calc(var(--spacing) * 1.5);
  color: var(--c-slash-mint, #e5ffdb);
}

._mediaGridView--toolbarLabel {
  font-size: var(--sl-font-size-small);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
  margin-right: calc(var(--spacing) / 4);
}

._mediaGridView--toolbarButtons {
  display: flex;
  flex-flow: row wrap;
  gap: calc(var(--spacing) / 4);
}

._mediaGridView--groupBtn {
  background: color-mix(in srgb, var(--c-slash-mint, #e5ffdb) 14%, transparent);
  color: var(--c-slash-mint, #e5ffdb);
  border: 2px solid color-mix(in srgb, var(--c-slash-mint, #e5ffdb) 45%, transparent);
  border-radius: 0;
  font-weight: 600;
  padding: calc(var(--spacing) / 3) calc(var(--spacing) / 1.25);

  &:hover,
  &:focus-visible {
    border-color: var(--c-slash-mint, #e5ffdb);
    background: color-mix(in srgb, var(--c-slash-mint, #e5ffdb) 22%, transparent);
  }

  &.is--active {
    background: var(--c-slash-mint, #e5ffdb);
    border-color: var(--c-slash-mint, #e5ffdb);
    color: var(--c-slash-burgundy, var(--c-rouge));

    &:hover,
    &:focus-visible {
      background: white;
      border-color: white;
      color: var(--c-slash-burgundy, var(--c-rouge));
    }
  }
}

._mediaGridView--groups {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) * 2);
  max-width: 1400px;
  margin: 0 auto;
}

._mediaGridView--section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing));
}

._mediaGridView--sectionTitle {
  display: flex;
  align-items: baseline;
  gap: calc(var(--spacing) / 2);
  margin: 0;
  color: var(--c-slash-mint, #e5ffdb);
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

._mediaGridView--sectionCount {
  font-size: var(--sl-font-size-small);
  font-weight: 600;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

._mediaGridView--grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing, 1rem);
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
