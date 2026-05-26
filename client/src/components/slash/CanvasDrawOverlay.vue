<template>
  <div
    class="_drawOverlayWrap"
    draggable="false"
    :style="{
      width: `${canvas_width}px`,
      height: `${canvas_height}px`,
    }"
    @mousedown="handleCanvasMouseDown"
    @touchstart.prevent.stop="handleCanvasTouchStart"
  >
    <svg
      v-if="draw_points.length > 1"
      class="_drawOverlay"
      draggable="false"
      :width="canvas_width"
      :height="canvas_height"
      :viewBox="`0 0 ${canvas_width} ${canvas_height}`"
    >
      <path
        v-if="draw_path_d"
        :d="draw_path_d"
        class="_drawPath"
        :stroke-width="draw_stroke_width"
      />
    </svg>
  </div>
</template>
<script>
import { pointsToSvgPath, buildShapeMetadata } from "@/utils/shapeUtils.js";

export default {
  name: "CanvasDrawOverlay",
  props: {
    canvas_width: { type: Number, required: true },
    canvas_height: { type: Number, required: true },
    folder_path: { type: String, default: "" },
    getCanvasCoords: { type: Function, required: true },
    draw_stroke_width: { type: Number, default: 5 },
  },
  data() {
    return {
      draw_points: [],
      draw_min_distance: 4,
    };
  },
  computed: {
    draw_path_d() {
      if (!this.draw_points || this.draw_points.length === 0) return "";
      return pointsToSvgPath(this.draw_points);
    },
  },
  methods: {
    logDrawDebug(label, payload = null) {
      if (payload) {
        console.log(`[CanvasDrawOverlay] ${label}`, payload);
      } else {
        console.log(`[CanvasDrawOverlay] ${label}`);
      }
    },
    handleCanvasMouseDown(event) {
      if (event.button !== 0) return;
      this.logDrawDebug("mouse down", {
        client_x: event.clientX,
        client_y: event.clientY,
      });
      this.startDrawing(event, { input_type: "mouse" });
    },

    handleCanvasTouchStart(event) {
      const touch_count = event.touches ? event.touches.length : 0;
      this.logDrawDebug("touch start", { touch_count });
      if (!event.touches || event.touches.length !== 1) return;
      this.startDrawing(event.touches[0], { input_type: "touch" });
    },

    startDrawing(start_event, { input_type } = {}) {
      if (!start_event) return;
      const touch_listener_options = { passive: false };
      let move_count = 0;

      const point = this.getCanvasCoords(start_event);
      if (!point) {
        this.logDrawDebug("startDrawing: no start point", { input_type });
        return;
      }
      this.logDrawDebug("startDrawing: start point", { input_type, point });

      this.draw_points = [point];

      const move_handler = (move_event) => {
        let source_event = move_event;
        if (input_type === "touch") {
          if (!move_event.touches || move_event.touches.length !== 1) return;
          source_event = move_event.touches[0];
          if (move_event.cancelable) move_event.preventDefault();
        }

        const next_point = this.getCanvasCoords(source_event);
        if (!next_point) {
          this.logDrawDebug("move: no next point", { input_type });
          return;
        }

        const last_point =
          this.draw_points[this.draw_points.length - 1] || next_point;
        const dx = next_point.x - last_point.x;
        const dy = next_point.y - last_point.y;
        const distance_sq = dx * dx + dy * dy;
        const min_distance_sq = this.draw_min_distance * this.draw_min_distance;

        if (distance_sq >= min_distance_sq) {
          this.draw_points.push(next_point);
          move_count += 1;
          if (move_count <= 5 || move_count % 20 === 0) {
            this.logDrawDebug("move: point added", {
              input_type,
              move_count,
              next_point,
              total_points: this.draw_points.length,
            });
          }
        }
      };

      const up_handler = () => {
        if (input_type === "touch") {
          window.removeEventListener(
            "touchmove",
            move_handler,
            touch_listener_options
          );
          window.removeEventListener("touchend", up_handler);
          window.removeEventListener("touchcancel", up_handler);
        } else {
          window.removeEventListener("mousemove", move_handler);
          window.removeEventListener("mouseup", up_handler);
        }
        this.logDrawDebug("input end", {
          input_type,
          total_points: this.draw_points.length,
        });
        this.finishDrawingShape();
      };

      if (input_type === "touch") {
        window.addEventListener(
          "touchmove",
          move_handler,
          touch_listener_options
        );
        window.addEventListener("touchend", up_handler);
        window.addEventListener("touchcancel", up_handler);
      } else {
        window.addEventListener("mousemove", move_handler);
        window.addEventListener("mouseup", up_handler);
      }
    },

    async finishDrawingShape() {
      if (!this.draw_points || this.draw_points.length < 2) {
        this.logDrawDebug("finishDrawingShape: not enough points", {
          total_points: this.draw_points ? this.draw_points.length : 0,
        });
        this.draw_points = [];
        return;
      }

      if (!this.folder_path) {
        this.logDrawDebug("finishDrawingShape: missing folder_path");
        console.error(
          "CanvasDrawOverlay: missing folder_path for shape creation"
        );
        this.draw_points = [];
        return;
      }

      const shape_meta = buildShapeMetadata(
        this.draw_points,
        this.draw_stroke_width
      );
      if (!shape_meta) {
        this.draw_points = [];
        return;
      }

      const random_suffix = (
        Math.random().toString(36) + "00000000000000000"
      ).slice(2, 5);

      const requested_slug = `shape-${random_suffix}`;

      const additional_meta = {
        $type: "canvas_shape",
        shape_points: shape_meta.shape_points,
        shape_stroke_width: this.draw_stroke_width,
        x: shape_meta.x,
        y: shape_meta.y,
        width: shape_meta.width,
        height: shape_meta.height,
        requested_slug,
        $authors: [this.connected_as.$path],
      };

      try {
        this.logDrawDebug("finishDrawingShape: uploading", {
          width: shape_meta.width,
          height: shape_meta.height,
          points: this.draw_points.length,
          folder_path: this.folder_path,
        });
        await this.$api.uploadFile({
          path: this.folder_path,
          additional_meta,
        });
        this.logDrawDebug("finishDrawingShape: upload success");
      } catch (err) {
        this.logDrawDebug("finishDrawingShape: upload failed", err);
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
  touch-action: none;
}

._drawOverlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

._drawPath {
  stroke: var(--current-author-color, var(--c-noir));
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
