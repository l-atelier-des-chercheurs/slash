<template>
  <div class="_viewModeBar u-overlayPanel">
    <div class="_viewModeBar--row">
      <button
        v-for="mode in ['canvas', 'grid', 'map', 'timeline']"
        :key="mode"
        type="button"
        class="u-button u-button_icon"
        :class="{ 'is--active': value === mode }"
        :aria-pressed="value === mode"
        @click="$emit('input', mode)"
      >
        <b-icon
          :icon="
            mode === 'canvas'
              ? 'layout-wtf'
              : mode === 'grid'
              ? 'grid'
              : mode === 'map'
              ? 'map'
              : 'calendar-day'
          "
        />
      </button>

      <div class="_viewModeBar--divider"></div>

      <button
        type="button"
        class="u-button u-button_icon _viewModeBar--btn"
        :class="{ 'is--active': filter_open }"
        aria-label="Filter"
        :aria-pressed="filter_open"
        @click="$emit('toggle-filter')"
      >
        <b-icon icon="filter" />
      </button>
    </div>

    <div
      v-if="value === 'canvas'"
      class="_viewModeBar--row _viewModeBar--zoomRow"
    >
      <input
        type="range"
        class="_viewModeBar--zoomSlider"
        :value="canvas_zoom"
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
    filter_open: {
      type: Boolean,
      default: false,
    },
    zoom_range: Array,
    canvas_zoom: {
      type: Number,
      default: 1,
    },
  },
  computed: {
    zoom_label() {
      return `${Math.round(this.canvas_zoom * 100)}%`;
    },
  },
  methods: {
    onZoomInput(e) {
      const v = parseFloat(e.target.value);
      if (!Number.isNaN(v)) this.$emit("update:canvas_zoom", v);
    },
  },
};
</script>
<style lang="scss" scoped>
._viewModeBar {
  position: absolute;
  top: var(--fixed-ui-margins);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  @media (max-width: 767px) {
    top: auto;
    bottom: var(--fixed-ui-margins);
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
}

._viewModeBar--row {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
}

._viewModeBar--zoomRow {
  width: 100%;

  input {
    width: 100%;
  }
}

._viewModeBar--btn {
  // display: flex;
  // align-items: center;
  // justify-content: center;
  // width: 36px;
  // height: 36px;
  // padding: 0;
  // border: none;
  // border-radius: 6px;
  // background: transparent;
  // color: var(--c-gris_fonce, #555);
  // cursor: pointer;
  // transition: background 0.15s, color 0.15s;

  // &:hover {
  //   background: rgba(0, 0, 0, 0.06);
  //   color: inherit;
  // }

  // &.is--active {
  //   background: var(--c-bleuvert, #2a9d8f);
  //   color: white;
  // }

  .b-icon {
    // font-size: 1.25rem;
  }
}

._viewModeBar--divider {
  width: 1px;
  height: 20px;
  background: var(--c-gris, #ccc);
  margin: 0 4px;
}
</style>
