<template>
  <div
    class="_miniMap u-overlayPanel"
    v-if="canvas_width > 0 && canvas_height > 0"
    ref="container"
    @mousedown="handleMouseDown"
  >
    <div
      class="_canvasWrapper"
      ref="wrapper"
      :style="{ aspectRatio: `${canvas_width} / ${canvas_height}` }"
    >
      <canvas ref="contentCanvas" class="_contentCanvas" />
      <canvas ref="viewportCanvas" class="_viewportCanvas" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
    canvas_width: {
      type: Number,
      default: 0,
    },
    canvas_height: {
      type: Number,
      default: 0,
    },
    zoom: {
      type: Number,
      default: 1,
    },
    viewport_props: {
      type: Object,
      default: () => ({
        left_pct: 0,
        top_pct: 0,
        width_pct: 0,
        height_pct: 0,
      }),
    },
    selected_files: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      display_width: 0,
      display_height: 0,
      resize_observer: null,
    };
  },
  computed: {
    scale_x() {
      if (this.canvas_width <= 0) return 1;
      return this.display_width / this.canvas_width;
    },
    scale_y() {
      if (this.canvas_height <= 0) return 1;
      return this.display_height / this.canvas_height;
    },
    has_valid_viewport() {
      const p = this.viewport_props;
      return (
        (p.width_pct || 0) > 0 &&
        (p.height_pct || 0) > 0 &&
        this.canvas_width > 0 &&
        this.canvas_height > 0
      );
    },
  },
  watch: {
    files: {
      handler() {
        this.drawContent();
      },
      deep: true,
    },
    selected_files: {
      handler() {
        this.drawContent();
      },
      deep: true,
    },
    canvas_width() {
      this.$nextTick(() => {
        this.updateSize();
        this.drawContent();
        this.drawViewport();
      });
    },
    canvas_height() {
      this.$nextTick(() => {
        this.updateSize();
        this.drawContent();
        this.drawViewport();
      });
    },
    viewport_props: {
      handler() {
        this.drawViewport();
      },
      deep: true,
    },
    display_width() {
      this.drawContent();
      this.drawViewport();
    },
    display_height() {
      this.drawContent();
      this.drawViewport();
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.updateSize();
      this.drawContent();
      this.drawViewport();
    });
    if (typeof ResizeObserver !== "undefined" && this.$refs.wrapper) {
      this.resize_observer = new ResizeObserver(() => this.updateSize());
      this.resize_observer.observe(this.$refs.wrapper);
    }
  },
  beforeDestroy() {
    if (this.resize_observer && this.$refs.wrapper) {
      this.resize_observer.unobserve(this.$refs.wrapper);
    }
  },
  methods: {
    updateSize() {
      const wrapper = this.$refs.wrapper;
      if (!wrapper) return;
      const w = wrapper.clientWidth || 0;
      const h = wrapper.clientHeight || 0;
      if (w <= 0 || h <= 0) return;
      if (this.display_width === w && this.display_height === h) return;
      this.display_width = w;
      this.display_height = h;

      const content = this.$refs.contentCanvas;
      const viewport = this.$refs.viewportCanvas;
      if (content && viewport) {
        content.width = w;
        content.height = h;
        viewport.width = w;
        viewport.height = h;
      }
    },
    drawContent() {
      const canvas = this.$refs.contentCanvas;
      if (!canvas || this.display_width <= 0 || this.display_height <= 0)
        return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sx = this.scale_x;
      const sy = this.scale_y;

      ctx.save();
      ctx.scale(sx, sy);

      // Background
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, this.canvas_width, this.canvas_height);
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1 / Math.min(sx, sy);
      ctx.strokeRect(0, 0, this.canvas_width, this.canvas_height);

      // Items
      for (const file of this.files) {
        const selected = this.selected_files.includes(file.$path);
        if (file.$type === "canvas_shape") {
          this.drawShape(ctx, file, selected);
        } else {
          this.drawItemRect(ctx, file, selected);
        }
      }

      ctx.restore();
    },
    drawItemRect(ctx, file, selected) {
      const x = file.x || 0;
      const y = file.y || 0;
      const w = this.getItemWidth(file);
      const h = this.getItemHeight(file);

      ctx.fillStyle = selected ? "#4a9eff" : "#999";
      ctx.strokeStyle = selected ? "#0066cc" : "#666";
      ctx.globalAlpha = selected ? 0.8 : 0.5;
      ctx.lineWidth = 0.5 / Math.min(this.scale_x, this.scale_y);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.globalAlpha = 1;
    },
    drawShape(ctx, file, selected) {
      const x = file.x || 0;
      const y = file.y || 0;
      const path_d = this.getShapePath(file);

      ctx.save();
      ctx.translate(x, y);

      if (path_d) {
        try {
          const path = new Path2D(path_d);
          ctx.fillStyle = "transparent";
          ctx.strokeStyle = selected ? "#0066cc" : "#333";
          ctx.lineWidth =
            (selected ? 1 : 1) / Math.min(this.scale_x * 2, this.scale_y * 2);
          ctx.globalAlpha = selected ? 0.9 : 0.7;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.fill(path);
          ctx.stroke(path);
        } catch (err) {
          this.drawShapeFallback(ctx, file, selected);
        }
      } else if (file.shape_svg) {
        this.drawShapeFallback(ctx, file, selected);
      }

      ctx.restore();
    },
    drawShapeFallback(ctx, file, selected) {
      const w = file.width || 100;
      const h = file.height || 100;
      ctx.fillStyle = selected ? "#4a9eff" : "#999";
      ctx.strokeStyle = selected ? "#0066cc" : "#666";
      ctx.globalAlpha = selected ? 0.8 : 0.5;
      ctx.lineWidth = 0.5 / Math.min(this.scale_x, this.scale_y);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    },
    drawViewport() {
      const canvas = this.$refs.viewportCanvas;
      if (!canvas || this.display_width <= 0 || this.display_height <= 0)
        return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, this.display_width, this.display_height);

      if (!this.has_valid_viewport) return;

      const x = ((this.viewport_props.left_pct || 0) / 100) * this.canvas_width;
      const y = ((this.viewport_props.top_pct || 0) / 100) * this.canvas_height;
      const w =
        ((this.viewport_props.width_pct || 0) / 100) * this.canvas_width;
      const h =
        ((this.viewport_props.height_pct || 0) / 100) * this.canvas_height;

      const sx = this.scale_x;
      const sy = this.scale_y;
      const px = x * sx;
      const py = y * sy;
      const pw = w * sx;
      const ph = h * sy;

      // Semi-transparent fill
      ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
      ctx.fillRect(px, py, pw, ph);

      // Dashed border
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(px, py, pw, ph);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
    getItemWidth(file) {
      return file.width || 160;
    },
    getItemHeight(file) {
      const width = this.getItemWidth(file);
      const ratio = file.$infos && file.$infos.ratio;
      const default_ratio = 9 / 16;
      const effective_ratio = ratio !== undefined ? ratio : default_ratio;
      return width * effective_ratio;
    },
    getShapePath(file) {
      if (!file.shape_svg) return null;
      try {
        const path_match = file.shape_svg.match(/<path[^>]*d=["']([^"']+)["']/);
        if (path_match && path_match[1]) return path_match[1];
        const parser = new DOMParser();
        const svg_doc = parser.parseFromString(file.shape_svg, "image/svg+xml");
        const parse_error = svg_doc.querySelector("parsererror");
        if (parse_error) return null;
        const path_element = svg_doc.querySelector("path");
        return path_element ? path_element.getAttribute("d") : null;
      } catch (err) {
        return null;
      }
    },
    handleMouseDown(event) {
      const container = this.$refs.container;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scale = Math.min(
        rect.width / this.canvas_width,
        rect.height / this.canvas_height
      );
      const content_w = this.canvas_width * scale;
      const content_h = this.canvas_height * scale;
      const offset_x = (rect.width - content_w) / 2;
      const offset_y = (rect.height - content_h) / 2;

      const client_x = event.clientX - rect.left;
      const client_y = event.clientY - rect.top;
      const x = (client_x - offset_x) / scale;
      const y = (client_y - offset_y) / scale;

      const viewport_w =
        ((this.viewport_props.width_pct || 0) / 100) * this.canvas_width;
      const viewport_h =
        ((this.viewport_props.height_pct || 0) / 100) * this.canvas_height;

      this.$eventHub.$emit("panzoom.panTo", {
        x: x - viewport_w / 2,
        y: y - viewport_h / 2,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
._miniMap {
  position: absolute;
  bottom: var(--fixed-ui-margins);
  left: var(--fixed-ui-margins);
  width: clamp(100px, 50vmin, 200px);
  z-index: 1000;
  cursor: pointer;
  overflow: hidden;
  border-radius: var(--border-radius);
}

._canvasWrapper {
  position: relative;
  width: 100%;
  /* aspect-ratio set inline from canvas_width/canvas_height */
}

._contentCanvas,
._viewportCanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
}

._viewportCanvas {
  pointer-events: none;
}
</style>
