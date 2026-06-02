<template>
  <div
    class="_viewModeBar u-overlayPanel"
    :class="{
      'is--mobileView': is_mobile_view,
      'is--open': is_mobile_view && mobile_menu_open,
    }"
  >
    <template v-if="is_mobile_view">
      <button
        type="button"
        class="u-button u-button_icon _viewModeBar--mobileTrigger"
        :aria-expanded="mobile_menu_open"
        aria-haspopup="listbox"
        @click="toggleMobileMenu"
      >
        <b-icon :icon="iconForMode(value)" />
        <b-icon
          icon="chevron-down"
          class="_viewModeBar--caret"
          :class="{ 'is--open': mobile_menu_open }"
        />
      </button>
      <div
        v-if="mobile_menu_open"
        class="_viewModeBar--mobileMenu"
        role="listbox"
      >
        <button
          v-for="mode in view_modes"
          :key="mode"
          type="button"
          class="u-button u-button_icon _viewModeBar--mobileOption"
          :class="{ 'is--active': value === mode }"
          role="option"
          :aria-selected="value === mode"
          @click="selectMode(mode)"
        >
          <b-icon :icon="iconForMode(mode)" />
        </button>
        <div class="_viewModeBar--divider"></div>
        <button
          type="button"
          class="u-button u-button_icon _viewModeBar--mobileOption"
          :class="{ 'is--active': filter_open }"
          aria-label="Filter"
          :aria-pressed="filter_open"
          @click="toggleFilter"
        >
          <b-icon icon="filter" />
        </button>
      </div>
    </template>

    <template v-else>
      <div class="_viewModeBar--row">
        <button
          v-for="mode in view_modes"
          :key="mode"
          type="button"
          class="u-button u-button_icon"
          :class="{ 'is--active': value === mode }"
          :aria-pressed="value === mode"
          @click="$emit('input', mode)"
        >
          <b-icon :icon="iconForMode(mode)" />
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
    </template>
  </div>
</template>
<script>
const VIEW_MODE_ICONS = {
  canvas: "layout-wtf",
  grid: "grid",
  map: "map",
  timeline: "calendar-day",
};

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
  data() {
    return {
      mobile_menu_open: false,
    };
  },
  computed: {
    is_mobile_view() {
      return this.$root.is_mobile_view;
    },
    view_modes() {
      return ["canvas", "grid", "timeline", "map"];
    },
  },
  watch: {
    is_mobile_view(is_mobile) {
      if (!is_mobile) this.closeMobileMenu();
    },
    value() {
      this.closeMobileMenu();
    },
  },
  mounted() {
    document.addEventListener("pointerdown", this.handleDocumentPointerDown);
  },
  beforeDestroy() {
    document.removeEventListener("pointerdown", this.handleDocumentPointerDown);
  },
  methods: {
    iconForMode(mode) {
      return VIEW_MODE_ICONS[mode] || "layout-wtf";
    },
    onZoomInput(e) {
      const v = parseFloat(e.target.value);
      if (!Number.isNaN(v)) this.$emit("update:canvas_zoom", v);
    },
    toggleMobileMenu() {
      this.mobile_menu_open = !this.mobile_menu_open;
    },
    closeMobileMenu() {
      this.mobile_menu_open = false;
    },
    selectMode(mode) {
      if (mode !== this.value) {
        this.$emit("input", mode);
      }
      this.closeMobileMenu();
    },
    toggleFilter() {
      this.$emit("toggle-filter");
      this.closeMobileMenu();
    },
    handleDocumentPointerDown(event) {
      if (!this.mobile_menu_open || !this.is_mobile_view) return;
      if (this.$el && !this.$el.contains(event.target)) {
        this.closeMobileMenu();
      }
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

  &.is--mobileView {
    top: var(--fixed-ui-margins);
    right: var(--fixed-ui-margins);
    left: auto;
    bottom: auto;
    transform: none;
    align-items: stretch;
    min-width: 2.75rem;

    &.is--open {
      background: white;
      backdrop-filter: none;
      transition: background-color 0.2s cubic-bezier(0.19, 1, 0.22, 1);
    }
  }
}

._viewModeBar--row {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
}

._viewModeBar--mobileTrigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) / 4);
  width: 100%;
}

._viewModeBar--caret {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &.is--open {
    transform: rotate(180deg);
  }
}

._viewModeBar--mobileMenu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc(var(--spacing) / 5);
  width: 100%;
  padding-top: calc(var(--spacing) / 4);
}

._viewModeBar--mobileOption {
  justify-content: center;
}

._viewModeBar--zoomRow {
  width: 100%;

  input {
    width: 100%;
  }
}

._viewModeBar--divider {
  width: 100%;
  height: 1px;
  background: var(--c-gris, #ccc);
  margin: 2px 0;

  .is--mobileView & {
    width: 100%;
    height: 1px;
    margin: calc(var(--spacing) / 6) 0;
  }
}

._viewModeBar--btn {
  .b-icon {
  }
}
</style>
