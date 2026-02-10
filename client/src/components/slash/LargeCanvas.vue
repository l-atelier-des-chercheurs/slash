<template>
  <div
    class="_largeCanvas"
    :class="{
      'is--drawMode': current_mode === 'draw',
    }"
  >
    <SlashPanZoom2
      ref="viewer"
      :zoom="zoom"
      :zoom_range="zoom_range"
      :content_width="canvas_width"
      :content_height="canvas_height"
      :enable_drag_to_pan="current_mode === 'pan-zoom'"
      :margin_around_content="200"
      @scroll-end="updateScrollAndZoom"
    >
      <div
        class="_canvasContent"
        :class="{
          'is--drawMode': current_mode === 'draw',
        }"
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
          :canvas_topleft_x="canvas_topleft_x"
          :canvas_topleft_y="canvas_topleft_y"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :canvas_zoom="zoom"
          @position-update="handlePositionUpdate"
          @width-update="handleWidthUpdate"
        />
        <CanvasDrawOverlay
          v-if="current_mode === 'draw'"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :folder_path="folder_path"
          :getCanvasCoords="getCanvasCoordinatesFromEvent"
        />
      </div>
      <div
        class="_currentCenterDot"
        :style="{
          left: canvas_topleft_x + 'px',
          top: canvas_topleft_y + 'px',
        }"
      ></div>
    </SlashPanZoom2>
    <LeftToolbar :current_mode.sync="current_mode" />
  </div>
</template>
<script>
import SlashPanZoom2 from "@/components/slash/SlashPanZoom2.vue";
import CanvasItemInteractive from "@/components/slash/CanvasItemInteractive.vue";
import CanvasDrawOverlay from "@/components/slash/CanvasDrawOverlay.vue";
import LeftToolbar from "@/components/slash/LeftToolbar.vue";
import CanvasShape from "@/components/slash/CanvasShape.vue";

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
    folder_path: String,
  },
  components: {
    SlashPanZoom2,
    CanvasItemInteractive,
    CanvasDrawOverlay,
    LeftToolbar,
    CanvasShape,
  },
  data() {
    return {
      canvas_topleft_x: 0,
      canvas_topleft_y: 0,

      current_mode: "pan-zoom",

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
      const cw = Math.round(right_edge + padding);
      return Math.max(this.min_canvas_width, cw);
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
      const ch = Math.round(bottom_edge + padding);
      return Math.max(this.min_canvas_height, ch);
    },
  },
  watch: {},
  mounted() {
    this.restoreStateFromLocalStorage();
  },
  beforeDestroy() {},
  methods: {
    updateScrollAndZoom({
      center_x,
      center_y,
      topleft_x,
      topleft_y,
      zoom,
    } = {}) {
      this.canvas_topleft_x = topleft_x;
      this.canvas_topleft_y = topleft_y;
      this.$emit("update:zoom", zoom);
      this.$emit("update:scroll", { center_x, center_y });
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
    getFileDimensions(file) {
      const width = file.width || 160;
      const ratio = file.$infos && file.$infos.ratio;
      // PDF and embed have fixed aspect ratio in UI (e.g. 16/9); use default when no ratio
      const default_ratio = 9 / 16; // height/width for 16:9
      const effective_ratio = ratio !== undefined ? ratio : default_ratio;
      const height = width * effective_ratio;
      return { width, height };
    },
    getStorageKey() {
      const path = this.$route ? this.$route.path : window.location.pathname;
      return `slash_canvas_state_${path}`;
    },
    saveStateToLocalStorage() {
      if (this.saveStateTimeout) clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = setTimeout(() => {
        const state = {
          topleft_x: this.canvas_topleft_x,
          topleft_y: this.canvas_topleft_y,
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

    getCanvasCoordinatesFromEvent(event) {
      if (!this.$refs.viewer || !this.$refs.viewer.getZoom) return null;

      const zoom = this.zoom;
      const scroll_left = this.canvas_topleft_x;
      const scroll_top = this.canvas_topleft_y;

      const canvas_rect = this.$el.getBoundingClientRect();
      const mouse_screen_x = event.clientX - canvas_rect.left;
      const mouse_screen_y = event.clientY - canvas_rect.top;

      const x = scroll_left + mouse_screen_x / zoom;
      const y = scroll_top + mouse_screen_y / zoom;

      const clamped_x = Math.max(0, Math.min(x, this.canvas_width));
      const clamped_y = Math.max(0, Math.min(y, this.canvas_height));

      return { x: clamped_x, y: clamped_y };
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
  --rule-size: 100px;
  --dot-size: 4px;

  // border: var(--dot-size) solid var(--rule-color);
  box-shadow: 0 0 55px 0px rgba(0, 0, 0, 0.1);
  border-radius: var(--border-radius);
  overflow: hidden;
  background-image: radial-gradient(
    circle,
    var(--rule-color) var(--dot-size),
    var(--background-color) var(--dot-size)
  );
  background-size: var(--rule-size) var(--rule-size);
  background-position: calc(var(--rule-size) / 2) calc(var(--rule-size) / 2);

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: radial-gradient(
      circle,
      var(--rule-color) var(--dot-size),
      var(--background-color) var(--dot-size)
    );
    background-size: var(--rule-size) var(--rule-size);
  }
}

._largeCanvas.is--drawMode {
  cursor: crosshair;
}

._canvasContent.is--drawMode {
  cursor: crosshair;
  user-select: none;
}

._canvasContent.is--drawMode ._canvasItem,
._canvasContent.is--drawMode ._canvasItemContent {
  pointer-events: none;
}

._currentCenterDot {
  position: absolute;
  width: 30px;
  height: 30px;
  background: var(--c-orange);
  border-radius: 50%;
  z-index: 1000;
}
</style>
