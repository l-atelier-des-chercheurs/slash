<template>
  <div class="_largeCanvas">
    <SlashPanZoom
      ref="viewer"
      :zoom="zoom"
      :zoom_range="zoom_range"
      :content_width="canvas_width"
      :content_height="canvas_height"
      :enable_drag_to_pan="true"
      :margin_around_content="200"
      @scroll-end="updateScrollAndZoom"
    >
      <div
        class="_canvasContent"
        :style="{
          width: `${canvas_width}px`,
          height: `${canvas_height}px`,
        }"
      >
        <CanvasItemInteractive
          v-for="file in files"
          :key="file.$path"
          :file="file"
          class="_canvasItem"
          :data-file-path="file.$path"
          :canvas_scroll_left="canvasScrollLeft"
          :canvas_scroll_top="canvasScrollTop"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :canvas_zoom="zoom"
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
    </SlashPanZoom>
  </div>
</template>
<script>
import SlashPanZoom from "@/components/slash/SlashPanZoom.vue";
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
    zoom_range: Array,
  },
  components: {
    SlashPanZoom,
    CanvasItemInteractive,
  },
  data() {
    return {
      canvasScrollLeft: 0,
      canvasScrollTop: 0,
      canvasViewedCenterX: 0,
      canvasViewedCenterY: 0,

      min_canvas_width: 1600,
      min_canvas_height: 1000,

      lastLogTime: 0,
      saveStateTimeout: null,
    };
  },
  computed: {
    canvas_width() {
      const padding = 200;
      if (!this.files || this.files.length === 0) {
        return this.min_canvas_width;
      }
      let right_edge = 0;
      this.files.forEach((file) => {
        const { width } = this.getFileDimensions(file);
        const x = file.x || 0;
        right_edge = Math.max(right_edge, x + width);
      });
      return Math.max(this.min_canvas_width, right_edge + padding);
    },
    canvas_height() {
      const padding = 200;
      if (!this.files || this.files.length === 0) {
        return this.min_canvas_height;
      }
      let bottom_edge = 0;
      this.files.forEach((file) => {
        const { height } = this.getFileDimensions(file);
        const y = file.y || 0;
        bottom_edge = Math.max(bottom_edge, y + height);
      });
      return Math.max(this.min_canvas_height, bottom_edge + padding);
    },
  },
  watch: {},
  mounted() {
    this.restoreStateFromLocalStorage();
  },
  beforeDestroy() {},
  methods: {
    updateScrollAndZoom({ x, y, zoom } = {}) {
      this.canvasScrollLeft = x;
      this.canvasScrollTop = y;
      this.$emit("update:zoom", zoom);
      this.$emit("update:scroll", { x, y });
      this.saveStateToLocalStorage();
    },
    handlePositionUpdate({ file, x, y }) {
      // Clamp to >= 0 so all content stays within the canvas (no negative coords)
      const clampedX = Math.max(0, x);
      const clampedY = Math.max(0, y);
      this.$set(file, "x", clampedX);
      this.$set(file, "y", clampedY);

      this.checkFileForExpansion(file);
    },
    handleWidthUpdate({ file, width }) {
      // Update file width locally
      this.$set(file, "width", width);
      this.checkFileForExpansion(file);
    },
    getFileDimensions(file) {
      const width = file.width || 160;
      const ratio = file.$infos && file.$infos.ratio;
      const height = ratio ? width * ratio : 160;
      return { width, height };
    },
    checkFileForExpansion(file) {
      const { width, height } = this.getFileDimensions(file);
      const x = file.x || 0;
      const y = file.y || 0;

      const neededWidth = x + width + 200;
      const neededHeight = y + height + 200;
      const neededSize = Math.max(neededWidth, neededHeight);
    },
    checkAllFilesForExpansion() {
      // Canvas size is now computed from rightmost/bottommost file edges + padding
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
