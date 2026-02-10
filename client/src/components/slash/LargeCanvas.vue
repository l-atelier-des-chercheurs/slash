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
        @mousedown="handleCanvasMouseDown"
      >
        <svg
          v-if="draw_points.length > 1"
          class="_drawOverlay"
          :width="canvas_width"
          :height="canvas_height"
          :viewBox="`0 0 ${canvas_width} ${canvas_height}`"
        >
          <path
            v-if="draw_path_d"
            :d="draw_path_d"
            stroke="var(--c-noir)"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            :stroke-width="draw_stroke_width"
          />
        </svg>
        <CanvasItemInteractive
          v-for="file in files"
          :key="file.$path"
          :file="file"
          class="_canvasItem"
          :data-file-path="file.$path"
          :canvas_scroll_left="canvasScrollX"
          :canvas_scroll_top="canvasScrollY"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :canvas_zoom="zoom"
          @position-update="handlePositionUpdate"
          @width-update="handleWidthUpdate"
        />
      </div>
      <!-- <div
        class="_currentCenterDot"
        :style="{
          left: canvasScrollX + 'px',
          top: canvasScrollY + 'px',
        }"
      ></div> -->
    </SlashPanZoom2>
    <LeftToolbar :current_mode.sync="current_mode" />
  </div>
</template>
<script>
import SlashPanZoom2 from "@/components/slash/SlashPanZoom2.vue";
import CanvasItemInteractive from "@/components/slash/CanvasItemInteractive.vue";
import LeftToolbar from "@/components/slash/LeftToolbar.vue";
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
    shapes: Array,
  },
  components: {
    SlashPanZoom2,
    CanvasItemInteractive,
    LeftToolbar,
  },
  data() {
    return {
      canvasScrollX: 0,
      canvasScrollY: 0,

      current_mode: "pan-zoom",

      min_canvas_width: 1600,
      min_canvas_height: 1000,

      lastLogTime: 0,
      saveStateTimeout: null,

      // Drawing state
      draw_points: [],
      draw_stroke_width: 4,
      draw_min_distance: 2,
    };
  },
  computed: {
    draw_path_d() {
      if (!this.draw_points || this.draw_points.length === 0) return "";
      return this.pointsToSvgPath(this.draw_points);
    },
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
    updateScrollAndZoom({ x, y, zoom } = {}) {
      if (this.$refs.viewer && this.$refs.viewer.getScrollLeft) {
        this.canvasScrollX = this.$refs.viewer.getScrollLeft();
        this.canvasScrollY = this.$refs.viewer.getScrollTop();
      } else {
        // Fallback to provided values if viewer API is unavailable
        this.canvasScrollX = x;
        this.canvasScrollY = y;
      }
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
          x: this.canvasScrollX,
          y: this.canvasScrollY,
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

      const zoom = this.$refs.viewer.getZoom();
      const scroll_left = this.$refs.viewer.getScrollLeft();
      const scroll_top = this.$refs.viewer.getScrollTop();

      const canvas_rect = this.$el.getBoundingClientRect();
      const mouse_screen_x = event.clientX - canvas_rect.left;
      const mouse_screen_y = event.clientY - canvas_rect.top;

      const x = scroll_left + mouse_screen_x / zoom;
      const y = scroll_top + mouse_screen_y / zoom;

      const clamped_x = Math.max(0, Math.min(x, this.canvas_width));
      const clamped_y = Math.max(0, Math.min(y, this.canvas_height));

      return { x: clamped_x, y: clamped_y };
    },

    handleCanvasMouseDown(event) {
      if (this.current_mode !== "draw") return;
      if (event.button !== 0) return;

      const point = this.getCanvasCoordinatesFromEvent(event);
      if (!point) return;

      this.draw_points = [point];

      const moveHandler = (move_event) => {
        if (this.current_mode !== "draw") return;
        const next_point = this.getCanvasCoordinatesFromEvent(move_event);
        if (!next_point) return;

        const last_point =
          this.draw_points[this.draw_points.length - 1] || next_point;
        const dx = next_point.x - last_point.x;
        const dy = next_point.y - last_point.y;
        const distance_sq = dx * dx + dy * dy;
        const min_distance_sq = this.draw_min_distance * this.draw_min_distance;

        if (distance_sq >= min_distance_sq) {
          this.draw_points.push(next_point);
        }
      };

      const upHandler = () => {
        window.removeEventListener("mousemove", moveHandler);
        window.removeEventListener("mouseup", upHandler);
        this.finishDrawingShape();
      };

      window.addEventListener("mousemove", moveHandler);
      window.addEventListener("mouseup", upHandler);
    },

    pointsToSvgPath(points) {
      if (!points || points.length === 0) return "";
      const [first, ...rest] = points;
      let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
      rest.forEach((point) => {
        d += ` L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      });
      return d;
    },

    async finishDrawingShape() {
      if (!this.draw_points || this.draw_points.length < 2) {
        this.draw_points = [];
        return;
      }

      if (!this.folder_path) {
        // Folder path is required to create a new media
        console.error("LargeCanvas: missing folder_path for shape creation");
        this.draw_points = [];
        return;
      }

      let min_x = Infinity;
      let max_x = -Infinity;
      let min_y = Infinity;
      let max_y = -Infinity;

      this.draw_points.forEach((point) => {
        min_x = Math.min(min_x, point.x);
        max_x = Math.max(max_x, point.x);
        min_y = Math.min(min_y, point.y);
        max_y = Math.max(max_y, point.y);
      });

      if (!isFinite(min_x) || !isFinite(min_y)) {
        this.draw_points = [];
        return;
      }

      const width = Math.max(max_x - min_x, 1);
      const height = Math.max(max_y - min_y, 1);

      const normalized_points = this.draw_points.map((point) => ({
        x: point.x - min_x,
        y: point.y - min_y,
      }));

      const path_d = this.pointsToSvgPath(normalized_points);

      const rounded_width = Math.round(width);
      const rounded_height = Math.round(height);

      const svg_content = `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded_width}" height="${rounded_height}" viewBox="0 0 ${width} ${height}"><path d="${path_d}" fill="none" stroke="black" stroke-width="${this.draw_stroke_width}" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

      const random_suffix = (
        Math.random().toString(36) + "00000000000000000"
      ).slice(2, 5);

      const requested_slug = `shape-${random_suffix}`;

      const additional_meta = {
        $type: "shape",
        shape_svg: svg_content,
        x: Math.round(min_x),
        y: Math.round(min_y),
        width: rounded_width,
        requested_slug,
      };

      try {
        await this.$api.uploadFile({
          path: this.folder_path,
          additional_meta,
        });
      } catch (err) {
        console.error("Failed to create shape media:", err);
      } finally {
        this.draw_points = [];
      }
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

._drawOverlay {
  position: absolute;
  inset: 0;
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
