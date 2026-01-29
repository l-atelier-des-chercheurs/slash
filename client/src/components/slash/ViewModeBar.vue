<template>
  <div class="_viewModeBar">
    <button
      type="button"
      class="_viewModeBar--btn"
      :class="{ 'is--active': value === 'canvas' }"
      :aria-pressed="value === 'canvas'"
      @click="$emit('input', 'canvas')"
    >
      <b-icon icon="layout-wtf" />
    </button>
    <button
      type="button"
      class="_viewModeBar--btn"
      :class="{ 'is--active': value === 'grid' }"
      :aria-pressed="value === 'grid'"
      @click="$emit('input', 'grid')"
    >
      <b-icon icon="grid" />
    </button>
    <button
      type="button"
      class="_viewModeBar--btn"
      :class="{ 'is--active': value === 'map' }"
      :aria-pressed="value === 'map'"
      @click="$emit('input', 'map')"
    >
      <b-icon icon="map" />
    </button>
    <button
      type="button"
      class="_viewModeBar--btn"
      :class="{ 'is--active': value === 'timeline' }"
      :aria-pressed="value === 'timeline'"
      @click="$emit('input', 'timeline')"
    >
      <b-icon icon="calendar-day" />
    </button>
    <div class="_viewModeBar--divider"></div>

    <button
      type="button"
      class="_viewModeBar--btn"
      :class="{ 'is--active': filterOpen }"
      aria-label="Filter"
      aria-pressed="filterOpen"
      @click="$emit('toggle-filter')"
    >
      <b-icon icon="filter" />
    </button>
  </div>
</template>
<script>
export default {
  props: {
    value: {
      type: String,
      default: "canvas",
      validator: (v) => ["canvas", "grid", "map", "timeline"].includes(v),
    },
    filterOpen: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
<style lang="scss" scoped>
._viewModeBar {
  position: fixed;
  top: calc(var(--spacing, 1rem) * 1.5);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;

  display: flex;
  align-items: center;
  gap: 2px;

  padding: 6px 8px;
  background: var(--c-gris_clair, #f0f0f0);
  border: 1px solid var(--c-gris, #ccc);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

._viewModeBar--btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--c-gris_fonce, #555);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: inherit;
  }

  &.is--active {
    background: var(--c-bleuvert, #2a9d8f);
    color: white;
  }

  .b-icon {
    font-size: 1.25rem;
  }
}

._viewModeBar--divider {
  width: 1px;
  height: 20px;
  background: var(--c-gris, #ccc);
  margin: 0 4px;
}
</style>
