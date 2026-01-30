<template>
  <div class="_largeCanvas">
    <PanZoom3
      ref="viewer"
      :zoom="zoom"
      :content-width="canvasSize"
      :content-height="canvasSize"
      :show-rules="false"
      :enable-drag-to-pan="true"
      :margin-around-content="200"
      :limitRange="true"
      @scroll-end="updateScrollAndZoom"
    >
      <div class="_canvasContent" :style="canvasContentStyle">
        <CanvasItemInteractive
          v-for="file in files"
          :key="file.$path"
          :file="file"
          class="_canvasItem"
          :data-file-path="file.$path"
          :canvas-scroll-left="canvasScrollLeft"
          :canvas-scroll-top="canvasScrollTop"
          :canvas-width="canvasSize"
          :canvas-height="canvasSize"
          :canvas-zoom="zoom"
          @position-update="handlePositionUpdate"
          @width-update="handleWidthUpdate"
        />
      </div>

      <div
        class="_currentCenterDot"
        :style="{
          left: canvasScrollLeft + 'px',
          top: canvasScrollTop + 'px',
        }"
      ></div>
    </PanZoom3>
  </div>
</template>
<script>
import PanZoom3 from "@/components/publications/page_by_page/PanZoom3.vue";
import CanvasItemInteractive from "@/components/slash/CanvasItemInteractive.vue";
export default {
  props: {
    files: {
      type: Array,
      required: true,
    },
    zoom: {
      type: Number,
      default: 1,
    },
  },
  components: {
    PanZoom3,
    CanvasItemInteractive,
  },
  data() {
    return {
      canvasScrollLeft: 0,
      canvasScrollTop: 0,
      canvasViewedCenterX: 0,
      canvasViewedCenterY: 0,
      canvasSize: 20000,
      lastLogTime: 0,
      saveStateTimeout: null,
    };
  },
  computed: {
    canvasContentStyle() {
      return {
        width: `${this.canvasSize}px`,
        height: `${this.canvasSize}px`,
      };
    },
  },
  watch: {
    files: {
      handler() {},
      deep: true,
    },
  },
  mounted() {
    this.restoreStateFromLocalStorage();
  },
  beforeDestroy() {},
  methods: {
    updateScrollAndZoom({ x, y, zoom } = {}) {
      this.canvasScrollLeft = x;
      this.canvasScrollTop = y;
      this.$emit("update:zoom", zoom);
      this.saveStateToLocalStorage();
    },
    handlePositionUpdate({ file, x, y }) {
      // Clamp to >= 0 so all content stays within the canvas (no negative coords)
      const clampedX = Math.max(0, x);
      const clampedY = Math.max(0, y);
      this.$set(file, "x", clampedX);
      this.$set(file, "y", clampedY);
    },
    handleWidthUpdate({ file, width }) {
      // Update file width locally
      this.$set(file, "width", width);
    },
    getStorageKey() {
      const path = this.$route ? this.$route.path : window.location.pathname;
      return `slash_canvas_state_${path}`;
    },
    saveStateToLocalStorage() {
      if (this.saveStateTimeout) clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = setTimeout(() => {
        const state = {
          x: this.canvasScrollLeft,
          y: this.canvasScrollTop,
          zoom: this.zoom,
        };
        localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
      }, 500);
    },
    restoreStateFromLocalStorage() {
      try {
        const storedState = localStorage.getItem(this.getStorageKey());
        if (storedState) {
          const state = JSON.parse(storedState);
          if (state.zoom) {
            this.$emit("update:zoom", state.zoom);
          }
        }
      } catch (err) {
        console.error("Failed to restore canvas state:", err);
      }
      this.centerOnOrigin();
    },
    centerOnOrigin() {
      // Start at canvas origin (0,0) so content is visible; all content is clamped to >= 0
      this.$nextTick(() => {
        if (this.$refs.viewer && this.$refs.viewer.scrollTo) {
          setTimeout(() => {
            this.$refs.viewer.scrollTo(0, 0, {
              duration: 0,
              absolute: true,
            });
          }, 100);
        }
      });
    },
  },
};
</script>
<style lang="scss" scoped>
._largeCanvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--c-bleuvert);
}

._canvasContent {
  position: relative;

  // Dot grid pattern with --color-rule; pans with content (this div is inside the panned viewport)
  --rule-color: var(--color-rule);
  --background-color: white;
  --rule-size: 48px;
  --dot-size: 2px;

  border: var(--dot-size) solid var(--rule-color);
  background-image: radial-gradient(
    circle,
    var(--rule-color) var(--dot-size),
    var(--background-color) var(--dot-size)
  );
  background-size: var(--rule-size) var(--rule-size);
  background-position: 0 0;

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: radial-gradient(
      circle,
      var(--rule-color) var(--dot-size),
      var(--background-color) var(--dot-size)
    );
    background-size: var(--rule-size) var(--rule-size);
  }
}

._currentCenterDot {
  position: absolute;
  width: 20px;
  height: 20px;
  background: var(--c-orange);
  border-radius: 50%;
  z-index: 1000;
}
</style>
