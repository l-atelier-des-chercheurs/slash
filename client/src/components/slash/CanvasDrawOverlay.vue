<template>
  <div
    class="_drawOverlayWrap"
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
  </div>
</template>
<script>
export default {
  name: "CanvasDrawOverlay",
  props: {
    canvas_width: { type: Number, required: true },
    canvas_height: { type: Number, required: true },
    folder_path: { type: String, default: "" },
    get_canvas_coords: { type: Function, required: true },
  },
  data() {
    return {
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
  },
  methods: {
    handleCanvasMouseDown(event) {
      if (event.button !== 0) return;

      const point = this.get_canvas_coords(event);
      if (!point) return;

      this.draw_points = [point];

      const moveHandler = (move_event) => {
        const next_point = this.get_canvas_coords(move_event);
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
        console.error(
          "CanvasDrawOverlay: missing folder_path for shape creation"
        );
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
._drawOverlayWrap {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  pointer-events: auto;
}

._drawOverlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
