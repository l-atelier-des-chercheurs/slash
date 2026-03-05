<template>
  <div class="_filterBar-inner">
    <div class="_filterBar-field">
      <span class="_filterBar-label">By author</span>
      <select
        class="_filterBar-select"
        :value="author_filter === null ? '' : author_filter"
        aria-label="Filter by author"
        @change="handleChangeAuthor"
      >
        <option value="">All</option>
        <option
          v-for="author in authors"
          :key="author.$path"
          :value="author.$path"
          v-text="author.name"
        />
      </select>
    </div>
    <div class="_filterBar-field">
      <span class="_filterBar-label">Media type</span>
      <select
        class="_filterBar-select"
        :value="media_type_filter === null ? '' : media_type_filter"
        aria-label="Filter by media type"
        @change="handleChangeMediaType"
      >
        <option value="">All</option>
        <option value="image">Image</option>
        <option value="video">Video</option>
        <option value="3d">3D</option>
        <option value="audio">Audio</option>
        <option value="text">Text</option>
        <option value="pdf">PDF</option>
        <option value="other">Other</option>
      </select>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    author_filter: {
      type: String,
      default: null,
    },
    media_type_filter: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      authors: [],
    };
  },
  async mounted() {
    this.authors = await this.$api.getFolders({ path: "authors" });
  },
  methods: {
    handleChangeAuthor(e) {
      const v = e.target.value;
      this.$emit("update:author_filter", v === "" ? null : v);
    },
    handleChangeMediaType(e) {
      const v = e.target.value;
      this.$emit("update:media_type_filter", v === "" ? null : v);
    },
  },
};
</script>
<style lang="scss" scoped>
._filterBar-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: calc(var(--spacing) / 1) var(--fixed-ui-margins);
  min-height: 48px;
}

._filterBar-label {
  white-space: nowrap;
  // font-weight: bold;
}

._filterBar-select {
  min-width: 140px;
  max-width: 20ch;
}
</style>
