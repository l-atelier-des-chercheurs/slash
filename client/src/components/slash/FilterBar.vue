<template>
  <div class="_filterBar-inner">
    <span class="_filterBar-label">Media type</span>
    <select
      class="_filterBar-select"
      :value="value === null ? '' : value"
      aria-label="Filter by media type"
      @change="handleChange"
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
</template>
<script>
export default {
  props: {
    value: {
      type: [String, null],
      default: null,
    },
  },
  methods: {
    handleChange(e) {
      const v = e.target.value;
      this.$emit("input", v === "" ? null : v);
    },
  },
};
</script>
<style lang="scss" scoped>
._filterBar-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 12px 24px;
  min-height: 48px;
}

._filterBar-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--c-gris_fonce, #555);
}

._filterBar-select {
  min-width: 140px;
  padding: 6px 28px 6px 10px;
  font-size: 0.875rem;
  border: 1px solid var(--c-gris, #ccc);
  border-radius: 6px;
  background: white;
  color: var(--c-noir, #333);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23555' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5em center;

  &:hover {
    border-color: var(--c-gris_fonce, #777);
  }

  &:focus {
    outline: none;
    border-color: var(--c-bleuvert, #2a9d8f);
  }
}
</style>
