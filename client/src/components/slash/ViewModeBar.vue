<template>
  <div class="_viewModeBar">
    <div class="_viewModeBar--row">
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

    <div
      v-if="value === 'canvas'"
      class="_viewModeBar--row _viewModeBar--zoomRow"
    >
      <!-- <span class="_viewModeBar--zoomLabel" aria-hidden="true">{{
        zoomLabel
      }}</span> -->
      <input
        type="range"
        class="_viewModeBar--zoomSlider"
        :value="canvasZoom"
        :min="zoom_range[0]"
        :max="zoom_range[1]"
        step="0.01"
        aria-label="Canvas zoom"
        @input="onZoomInput"
      />
    </div>
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
    zoom_range: Array,
    canvasZoom: {
      type: Number,
      default: 1,
    },
  },
  computed: {
    zoomLabel() {
      return `${Math.round(this.canvasZoom * 100)}%`;
    },
  },
  methods: {
    onZoomInput(e) {
      const v = parseFloat(e.target.value);
      if (!Number.isNaN(v)) this.$emit("update:canvasZoom", v);
    },
  },
};
</script>
<style lang="scss" scoped>
._viewModeBar {
  position: absolute;
  top: calc(var(--spacing, 1rem) * 1.5);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  padding: 6px;
  background: var(--c-gris_clair, #ccc);
  box-shadow: 0 4px 5px 0px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

._viewModeBar--row {
  display: flex;
  align-items: center;
  gap: 2px;
}

._viewModeBar--zoomRow {
  width: 100%;
  padding-top: 4px;
  padding-bottom: 4px;
  // border-top: 1px solid var(--c-gris, #ccc);
  gap: 8px;
}

._viewModeBar--zoomLabel {
  min-width: 2.5rem;
  font-size: var(--sl-font-size-small);
  font-variant-numeric: tabular-nums;
  color: var(--c-gris_fonce, #555);
}

._viewModeBar--zoomSlider {
  flex: 1;
  min-width: 80px;
  // max-width: 140px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--c-gris, #ccc);
  border-radius: 3px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-bleuvert, #2a9d8f);
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c-bleuvert, #2a9d8f);
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
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
