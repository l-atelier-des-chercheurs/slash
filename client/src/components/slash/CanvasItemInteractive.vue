<template>
  <div
    class="_canvasItem is--canvas"
    :class="{
      'panzoom-exclude': mode !== 'pan-zoom',
      'is--dragging': has_dragged,
      'is--resizing': isResizing,
      'is--selected': is_selected,
    }"
    :data-mode="mode"
    :style="[itemDimensions, itemDisplay]"
    :data-file-type="file.$type"
    :data-file-path="file.$path"
  >
    <template v-if="file.$type === 'canvas_shape'">
      <div
        v-html="display_shape_svg"
        class="_canvasItem--shape"
        @mousedown="handleMouseDown"
        @touchstart.stop.prevent="handleItemTouchStart"
      />
    </template>
    <template v-else-if="file.$type === 'canvas_text'">
      <div class="_canvasItem--text">
        <div class="_canvasItem--textLine">{{ quick_note_text }}</div>
      </div>
    </template>
    <CanvasItem
      v-else
      :file="file"
      :resolution="optimalResolution"
      :mode="'canvas'"
      class="_canvasItemContent"
    />

    <div
      class="_canvasItem--selectedBorder"
      :class="{ 'is--shape': file.$type === 'canvas_shape' }"
      v-if="mode === 'select'"
      @mousedown="handleMouseDown"
      @touchstart.stop.prevent="handleItemTouchStart"
    ></div>
    <div
      v-if="
        !['canvas_shape', 'canvas_text'].includes(file.$type) && is_selected
      "
      class="_canvasItem--resizeHandle"
      :class="{ 'is--widthOnly': isWidthOnly }"
      :style="'--scale-factor: ' + canvas_zoom"
      @mousedown.stop="handleResizeStart($event, 'width')"
      @touchstart.stop.prevent="handleResizeTouchStart($event, 'width')"
    />

    <div
      class="_canvasItem--open"
      v-if="!['canvas_shape', 'canvas_text'].includes(file.$type)"
      :style="'--scale-factor: ' + canvas_zoom"
    >
      <button
        type="button"
        class="u-button u-button_icon u-button_glass _openBtn"
        :class="{ 'panzoom-exclude': mode === 'pan-zoom' }"
        v-if="!shift_or_cmd_pressed"
        @click="handleOpen"
      >
        <b-icon icon="box-arrow-up-right" />
      </button>
    </div>
  </div>
</template>

<script>
import CanvasItem from "./CanvasItem.vue";
import { shapePointsToSvg, getPointsBounds } from "@/utils/shapeUtils.js";
import {
  QUICK_NOTE_HEIGHT,
  normalizeQuickNoteText,
  measureQuickNoteWidth,
} from "@/utils/quickNoteUtils.js";
import {
  TEXT_CANVAS_DEFAULT_WIDTH,
  measureTextCanvasHeight,
} from "@/utils/textCanvasUtils.js";

export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      default: "canvas",
    },
    canvas_topleft_x: {
      type: Number,
      default: 0,
    },
    canvas_topleft_y: {
      type: Number,
      default: 0,
    },
    canvas_width: {
      type: Number,
      default: 10000,
    },
    canvas_height: {
      type: Number,
      default: 10000,
    },
    canvas_zoom: {
      type: Number,
      default: 1,
    },
    is_selected: {
      type: Boolean,
      default: false,
    },
    in_viewport: {
      type: Boolean,
      default: true,
    },
  },
  components: {
    CanvasItem,
  },
  data() {
    return {
      shift_or_cmd_pressed: false,
      isDragging: false,
      isResizing: false,
      has_dragged: false,
      drag_threshold: 3,
      dragStartX: 0,
      dragStartY: 0,
      dragStartFileX: 0,
      dragStartFileY: 0,
      dragOffsetX: 0,
      dragOffsetY: 0,
      currentX: null,
      currentY: null,
      currentWidth: null,
      currentHeight: null,
      resizeStartX: 0,
      resizeStartY: 0,
      resizeStartWidth: 0,
      resizeStartHeight: 0,
      resize_mode: "width",
      saveTimeout: null,

      item_min_width: 50,
      item_max_width: 1000,
      item_min_height: 40,
      item_max_height: 1000,
    };
  },
  mounted() {
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    this.$eventHub.$on("canvas.dragMove", this.onOtherItemDragMove);

    // Retro compat: backfill height for canvas_shape without it
    if (
      this.file.$type === "canvas_shape" &&
      this.file.width != null &&
      this.file.height == null &&
      this.file.shape_points?.length >= 2
    ) {
      this.$nextTick(() => this.backfillShapeHeight());
    }
  },
  beforeDestroy() {
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("touchmove", this.handleItemTouchMove);
    window.removeEventListener("touchend", this.handleItemTouchEnd);
    window.removeEventListener("touchcancel", this.handleItemTouchEnd);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    this.$eventHub.$off("canvas.dragMove", this.onOtherItemDragMove);
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  },
  computed: {
    isWidthOnly() {
      return this.file.$type === "text" || !this.file.$infos?.ratio;
    },
    default_item_height() {
      if (this.file.$type === "canvas_text") {
        return QUICK_NOTE_HEIGHT;
      }
      return 52;
    },
    quick_note_text() {
      if (this.file.$type !== "canvas_text") return "";
      return normalizeQuickNoteText(this.file.text);
    },
    quick_note_width() {
      if (this.file.$type !== "canvas_text") return 160;
      return measureQuickNoteWidth(this.quick_note_text);
    },
    display_shape_svg() {
      if (this.file.$type !== "canvas_shape") return "";
      if (this.file.shape_points && this.file.shape_points.length >= 2) {
        const w = this.file.width || 160;
        const shape_stroke_width =
          Number(this.file.shape_stroke_width) > 0
            ? Number(this.file.shape_stroke_width)
            : 5;
        const h =
          this.file.height != null && this.file.width
            ? w * (this.file.height / this.file.width)
            : undefined;
        return shapePointsToSvg(
          this.file.shape_points,
          w,
          shape_stroke_width,
          h
        );
      }
      return this.file.shape_svg || "";
    },
    itemDimensions() {
      let x = this.currentX !== null ? this.currentX : this.file.x || 0;
      let y = this.currentY !== null ? this.currentY : this.file.y || 0;
      const default_width =
        this.file.$type === "text" ? TEXT_CANVAS_DEFAULT_WIDTH : 160;
      let width =
        this.currentWidth !== null
          ? this.currentWidth
          : this.file.width || default_width;

      if (
        this.file.$type !== "canvas_shape" &&
        this.file.$type !== "canvas_text"
      ) {
        width = Math.min(this.item_max_width, width);
        width = Math.max(this.item_min_width, width);
      }

      if (this.file.$type === "canvas_text") {
        width = this.quick_note_width;
      }

      const author_color = this.$getFirstAuthorColor(this.file.$authors);

      let ratio = this.file.$infos?.ratio;

      if (!ratio && this.file.$type === "pdf") {
        ratio = 9 / 16;
      }

      let height = this.default_item_height;
      if (this.file.$type === "text") {
        height = measureTextCanvasHeight(this.file.$content, width);
      } else if (ratio) {
        height = width * ratio;
      } else if (this.file.$type === "canvas_shape") {
        if (this.file.height != null) {
          height = width * (this.file.height / (this.file.width || 160));
        } else if (this.file.shape_points?.length >= 2) {
          const bounds = getPointsBounds(this.file.shape_points);
          height = width * (bounds.height / bounds.width);
        }
      } else if (this.file.$type === "canvas_text") {
        height = this.default_item_height;
      }

      x = Math.min(x, this.canvas_width - width);
      y = Math.min(y, this.canvas_height - height);

      const style = {
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        "--scale-factor": this.canvas_zoom,
        "--author-color": author_color,
      };

      return style;
    },
    itemDisplay() {
      return {
        display:
          this.in_viewport || this.isDragging || this.isResizing
            ? "block"
            : "none",
      };
    },
    optimalResolution() {
      // Available thumbnail resolutions
      const availableResolutions = [50, 320, 640, 1600];

      // Get the current item width
      const itemWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;

      // Calculate displayed width (item width * zoom level)
      const displayedWidth = itemWidth * this.canvas_zoom;

      // Account for device pixel ratio (retina/high-DPI displays)
      const devicePixelRatio = window.devicePixelRatio || 1;
      const requiredResolution = displayedWidth * devicePixelRatio;

      // Select the smallest resolution that is at least as large as the required resolution
      for (const resolution of availableResolutions) {
        if (resolution >= requiredResolution) {
          return resolution;
        }
      }

      // If required resolution is larger than all available resolutions, use the largest
      return availableResolutions[availableResolutions.length - 1];
    },
  },
  methods: {
    async backfillShapeHeight() {
      if (
        this.file.$type !== "canvas_shape" ||
        this.file.height != null ||
        !this.file.shape_points?.length
      )
        return;
      const width = this.file.width || 160;
      const bounds = getPointsBounds(this.file.shape_points);
      const height = Math.round(width * (bounds.height / bounds.width));
      try {
        await this.$api.updateMeta({
          path: this.file.$path,
          new_meta: { height },
        });
        this.$set(this.file, "height", height);
      } catch (err) {
        console.error("Failed to backfill canvas_shape height:", err);
      }
    },
    handleKeyDown(event) {
      if (event.key === "Shift" || event.key === "Meta") {
        this.shift_or_cmd_pressed = true;
      }
    },
    handleKeyUp(event) {
      if (event.key === "Shift" || event.key === "Meta") {
        this.shift_or_cmd_pressed = false;
      }
    },
    getItemHeightFromWidth(width) {
      const ratio = this.file.$infos?.ratio;
      if (ratio) return width * ratio;
      if (this.file.$type === "canvas_shape") {
        if (this.file.height != null && this.file.width) {
          return width * (this.file.height / this.file.width);
        }
        if (this.file.shape_points?.length >= 2) {
          const bounds = getPointsBounds(this.file.shape_points);
          return width * (bounds.height / bounds.width);
        }
        return 160;
      }
      if (this.file.$type === "canvas_text") {
        return this.default_item_height;
      }
      if (this.file.$type === "text") {
        return measureTextCanvasHeight(this.file.$content, width);
      }
      return 160;
    },
    handleItemTouchStart(event) {
      if (this.mode === "pan-zoom") return;
      if (!event.touches || event.touches.length !== 1) return;
      const t = event.touches[0];
      this.handleMouseDown(this._touchToPointerLike(event, t));
      this.attachItemTouchGestureListeners();
    },
    handleResizeTouchStart(event, resize_mode = "width") {
      if (!event.touches || event.touches.length !== 1) return;
      const t = event.touches[0];
      this.handleResizeStart(this._touchToPointerLike(event, t), resize_mode);
      this.attachItemTouchGestureListeners();
    },
    _touchToPointerLike(root_event, touch) {
      return {
        clientX: touch.clientX,
        clientY: touch.clientY,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => root_event.preventDefault(),
        stopPropagation: () => root_event.stopPropagation(),
      };
    },
    attachItemTouchGestureListeners() {
      window.removeEventListener("touchmove", this.handleItemTouchMove);
      window.removeEventListener("touchend", this.handleItemTouchEnd);
      window.removeEventListener("touchcancel", this.handleItemTouchEnd);
      window.addEventListener("touchmove", this.handleItemTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", this.handleItemTouchEnd);
      window.addEventListener("touchcancel", this.handleItemTouchEnd);
    },
    handleItemTouchMove(event) {
      if (!event.touches || event.touches.length !== 1) {
        this.handleItemTouchEnd(event);
        return;
      }
      const t = event.touches[0];
      if (
        event.cancelable &&
        (this.isResizing || (this.isDragging && this.has_dragged))
      ) {
        event.preventDefault();
      }
      this.handleMouseMove(this._touchToPointerLike(event, t));
    },
    handleItemTouchEnd(event) {
      window.removeEventListener("touchmove", this.handleItemTouchMove);
      window.removeEventListener("touchend", this.handleItemTouchEnd);
      window.removeEventListener("touchcancel", this.handleItemTouchEnd);
      const t =
        event.changedTouches && event.changedTouches.length
          ? event.changedTouches[0]
          : null;
      if (t) {
        this.handleMouseUp(this._touchToPointerLike(event, t));
      } else {
        this.handleMouseUp(event);
      }
    },
    handleResizeStart(event, resize_mode = "width") {
      event.preventDefault();
      event.stopPropagation();

      this.isResizing = true;
      this.resize_mode = resize_mode;

      // Store initial mouse position and current dimensions
      this.resizeStartX = event.clientX;
      this.resizeStartY = event.clientY;
      this.resizeStartWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
      this.resizeStartHeight =
        this.currentHeight !== null
          ? this.currentHeight
          : this.default_item_height;
    },
    handleOpen() {
      this.$eventHub.$emit("canvasItem.openWithTransition", this.file.$path);
    },
    onOtherItemDragMove({ source_path, total_dx, total_dy }) {
      if (source_path === this.file.$path) return;
      if (!this.is_selected) return;
      this.currentX = Math.max(0, (this.file.x || 0) + total_dx);
      this.currentY = Math.max(0, (this.file.y || 0) + total_dy);
    },
    handleMouseDown(event) {
      event.preventDefault();
      event.stopPropagation();

      if (this.mode === "pan-zoom") return;

      this.isDragging = true;
      this.has_dragged = false;

      if (!this.is_selected) {
        const mode = event.metaKey || event.shiftKey ? "append" : "replace";
        this.$emit("select", this.file.$path, mode);
      }

      // Get canvas container
      const canvasContainer = this.$el.closest("._largeCanvas");
      if (!canvasContainer) return;

      const canvasRect = canvasContainer.getBoundingClientRect();

      // Store initial mouse position in screen coordinates
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;

      // Store initial file position
      this.dragStartFileX = this.file.x || 0;
      this.dragStartFileY = this.file.y || 0;

      // Calculate mouse position in canvas coordinates, accounting for zoom
      const mouseScreenX = this.dragStartX - canvasRect.left;
      const mouseScreenY = this.dragStartY - canvasRect.top;
      const mouseCanvasX =
        mouseScreenX / this.canvas_zoom + this.canvas_topleft_x;
      const mouseCanvasY =
        mouseScreenY / this.canvas_zoom + this.canvas_topleft_y;

      // Calculate offset from mouse to item top-left corner in canvas coordinates
      this.dragOffsetX = mouseCanvasX - this.dragStartFileX;
      this.dragOffsetY = mouseCanvasY - this.dragStartFileY;
    },
    handleMouseMove(event) {
      if (this.isResizing) {
        if (this.resize_mode === "height") {
          const delta_y = event.clientY - this.resizeStartY;
          const adjusted_delta_y = delta_y / this.canvas_zoom;
          const next_height = this.resizeStartHeight + adjusted_delta_y;
          const bounded_height = Math.min(
            this.item_max_height,
            Math.max(this.item_min_height, next_height)
          );
          this.currentHeight = Math.round(bounded_height);
          this.$emit("width-update", {
            file: this.file,
            height: this.currentHeight,
          });
        } else {
          // Mouse delta in screen pixels; convert to canvas coordinates using zoom
          const deltaX = event.clientX - this.resizeStartX;
          const adjustedDeltaX = deltaX / this.canvas_zoom;

          // Calculate new width (in canvas coordinates)
          let newWidth = Math.max(
            this.item_min_width,
            this.resizeStartWidth + adjustedDeltaX
          );
          newWidth = Math.min(
            this.item_max_width,
            this.resizeStartWidth + adjustedDeltaX
          );
          this.currentWidth = Math.round(newWidth);

          // Emit width update (include height for canvas_shape so parent can update locally)
          const payload = { file: this.file, width: this.currentWidth };
          if (this.file.$type === "canvas_shape") {
            const old_width = this.file.width || 160;
            const old_height =
              this.file.height ??
              (this.file.shape_points?.length >= 2
                ? (() => {
                    const b = getPointsBounds(this.file.shape_points);
                    return old_width * (b.height / b.width);
                  })()
                : 100);
            payload.height = Math.round(
              this.currentWidth * (old_height / old_width)
            );
          }
          this.$emit("width-update", payload);
        }

        return;
      }

      if (!this.isDragging) return;

      const delta_x = event.clientX - this.dragStartX;
      const delta_y = event.clientY - this.dragStartY;
      const distance_squared = delta_x * delta_x + delta_y * delta_y;
      const threshold = this.drag_threshold;
      const threshold_squared = threshold * threshold;

      if (!this.has_dragged) {
        if (distance_squared < threshold_squared) {
          return;
        }
        this.has_dragged = true;
      }

      // Get canvas container
      const canvasContainer = this.$el.closest("._largeCanvas");
      if (!canvasContainer) return;

      const canvasRect = canvasContainer.getBoundingClientRect();

      // Calculate mouse position relative to canvas, accounting for zoom and scroll
      const mouseScreenX = event.clientX - canvasRect.left;
      const mouseScreenY = event.clientY - canvasRect.top;
      const mouseX = mouseScreenX / this.canvas_zoom + this.canvas_topleft_x;
      const mouseY = mouseScreenY / this.canvas_zoom + this.canvas_topleft_y;

      // Calculate new file position (mouse position minus offset)
      // Clamp to >= 0 so content stays within canvas (no negative coords)
      let newX = Math.max(0, mouseX - this.dragOffsetX);
      let newY = Math.max(0, mouseY - this.dragOffsetY);

      // Clamp to <= canvas size (minus item width/height)
      const currentWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
      const currentHeight = this.getItemHeightFromWidth(currentWidth);

      newX = Math.min(newX, this.canvas_width - currentWidth);
      newY = Math.min(newY, this.canvas_height - currentHeight);

      this.currentX = newX;
      this.currentY = newY;

      this.$eventHub.$emit("canvas.dragMove", {
        source_path: this.file.$path,
        total_dx: newX - this.dragStartFileX,
        total_dy: newY - this.dragStartFileY,
      });
    },
    handleMouseUp(event) {
      if (this.isResizing) {
        this.isResizing = false;

        const is_height_resize = this.resize_mode === "height";
        let final_dimensions_payload = {};

        if (is_height_resize) {
          const final_height =
            this.currentHeight !== null
              ? this.currentHeight
              : this.default_item_height;
          final_dimensions_payload = { height: final_height };
          this.currentHeight = null;
        } else {
          // Save final width
          const finalWidth =
            this.currentWidth !== null
              ? this.currentWidth
              : this.file.width || 160;
          final_dimensions_payload = { width: finalWidth };

          if (this.file.$type === "canvas_shape") {
            const old_width = this.file.width || 160;
            const old_height =
              this.file.height ??
              (this.file.shape_points?.length >= 2
                ? (() => {
                    const b = getPointsBounds(this.file.shape_points);
                    return old_width * (b.height / b.width);
                  })()
                : 100);
            final_dimensions_payload.height = Math.round(
              finalWidth * (old_height / old_width)
            );
          }
          // Clear current width to use file width
          this.currentWidth = null;
        }
        this.resize_mode = "width";

        // Debounce API call
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
          this.saveWidth(final_dimensions_payload);
        }, 300);

        return;
      }

      if (!this.isDragging) {
        // Clear position set by multi-select drag from another item
        if (this.currentX !== null || this.currentY !== null) {
          this.currentX = null;
          this.currentY = null;
        }
        return;
      }

      this.isDragging = false;

      if (!this.has_dragged) {
        this.has_dragged = false;
        this.currentX = null;
        this.currentY = null;
        return;
      }

      this.has_dragged = false;

      // Save final position
      // Re-clamp just in case
      const currentWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
      const currentHeight = this.getItemHeightFromWidth(currentWidth);

      let finalX = this.currentX !== null ? this.currentX : this.file.x || 0;
      let finalY = this.currentY !== null ? this.currentY : this.file.y || 0;

      finalX = Math.max(0, Math.min(finalX, this.canvas_width - currentWidth));
      finalY = Math.max(
        0,
        Math.min(finalY, this.canvas_height - currentHeight)
      );

      // Clear current position to use file position
      this.currentX = null;
      this.currentY = null;

      this.$eventHub.$emit("canvas.dragEnd", {
        file: this.file,
        x: finalX,
        y: finalY,
        delta_x: finalX - this.dragStartFileX,
        delta_y: finalY - this.dragStartFileY,
      });

      // Debounce API call
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      this.saveTimeout = setTimeout(() => {
        this.savePosition(finalX, finalY);
      }, 300);
    },
    async savePosition(x, y) {
      try {
        await this.$api.updateMeta({
          path: this.file.$path,
          new_meta: { x, y },
        });
      } catch (err) {
        console.error("Failed to save canvas position:", err);
      }
    },
    async saveWidth(payload) {
      try {
        const new_meta =
          typeof payload === "number"
            ? { width: payload }
            : {
                ...(payload.width != null && { width: payload.width }),
                ...(payload.height != null && { height: payload.height }),
              };
        if (!Object.keys(new_meta).length) return;
        await this.$api.updateMeta({
          path: this.file.$path,
          new_meta,
        });
      } catch (err) {
        console.error("Failed to save canvas width:", err);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
._canvasItem {
  --shadow-size: 5px;
  --selected-border-width: max(calc(3px / var(--scale-factor)), 3px);
  --selected-border-color: var(
    --author-color,
    var(--active-color, var(--c-gris_fonce))
  );

  position: absolute;
  width: 160px;
  height: auto;

  overflow: visible;

  // cursor: pointer;
  user-select: none;

  &:not(.is--dragging, .is--resizing) {
    transition: all 0.12s cubic-bezier(0.19, 1, 0.22, 1);
  }

  &[data-file-type="canvas_shape"] {
    pointer-events: none;
  }

  ._canvasItem--text {
    display: flex;
    align-items: center;
    font-size: 150%;
    overflow: hidden;
    height: 100%;
    background-color: var(--author-color);
    border-radius: var(--border-radius);
    padding: 0 calc(var(--spacing) / 1);
  }

  ._canvasItem--textLine {
    min-width: 0;
    width: 100%;
    white-space: nowrap;
    // overflow: hidden;
    // text-overflow: ellipsis;
    line-height: 1.2;
  }

  ._canvasItem--open {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    display: flex;
    align-items: center;
    justify-content: center;
    // opacity: 0;
    pointer-events: none;

    transition: opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);

    ._openBtn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 6rem;
      height: 3rem;
      text-align: center;
      border-radius: 8rem;
      pointer-events: auto;
      font-size: 1.5rem;

      &:not(:hover) {
        background-color: rgba(255, 255, 255, 0.6);
      }

      &:hover {
        // background-color: rgba(255, 255, 255, 1);
      }
    }
  }
  &[data-file-type="audio"] ._canvasItem--open button {
    height: 3rem;
    width: 6rem;
    border-radius: 6rem;
    font-size: 1.5rem;
  }
  &:hover {
    ._canvasItem--open {
      opacity: 1;
    }
  }

  &:hover,
  &.is--selected {
    &:not(.is--dragging),
    &:not(.is--resizing) {
      ._canvasItem--selectedBorder {
        opacity: 1;
      }
    }
  }

  &[data-mode="select"] {
    ._canvasItem--selectedBorder {
      pointer-events: auto;
    }
    ._canvasItemContent,
    ._canvasItem--text {
      pointer-events: none;
    }
    &:not(.is--selected) ._canvasItem--selectedBorder.is--shape {
      pointer-events: none;
    }
    ._canvasItem--shape {
      pointer-events: none;
    }
  }

  /* path-hitbox only in select mode for non-selected items (helps with selection) */
  &:not([data-mode="select"]) ._canvasItem--shape ::v-deep path.path-hitbox,
  &.is--selected ._canvasItem--shape ::v-deep path.path-hitbox {
    display: none;
  }

  &[data-mode="pan-zoom"] {
    &,
    ._canvasItemContent,
    ._canvasItem--shape,
    ._canvasItem--text {
      pointer-events: none !important;
    }
    cursor: inherit;
    ._canvasItem--open {
      pointer-events: auto;
      cursor: inherit;
    }
    ._canvasItem--open ._openBtn {
      pointer-events: auto;
    }
  }

  ._canvasItem--selectedBorder {
    position: absolute;
    inset: 0;
    opacity: 0;
    outline: var(--selected-border-width) solid var(--selected-border-color);
    // outline-offset: 0.25rem;
    border-radius: var(--border-radius);
    pointer-events: none;
    transition: opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  }

  ._canvasItemContent {
    width: 100%;
    height: 100%;
  }

  ._canvasItem--resizeHandle {
    --button-size: 20px;

    position: absolute;
    right: calc(var(--button-size) * -1.5);
    bottom: calc(var(--button-size) * -1.5);

    width: calc(var(--button-size) * 3);
    height: calc(var(--button-size) * 3);

    // background-color: red;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: nwse-resize;
    z-index: 10;
    pointer-events: auto;

    transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);

    &::before {
      content: "";
      display: block;
      width: var(--button-size);
      height: var(--button-size);
      // transform: rotate(90deg);
      background-color: white;
      outline: var(--selected-border-width) solid var(--selected-border-color);
      transition: all 0.2s;
    }

    &.is--widthOnly {
      cursor: ew-resize;
      top: 50%;
      transform: translateY(-50%);

      &::before {
      }
    }
    &.is--heightOnly {
      cursor: ns-resize;
      left: 50%;
      right: auto;
      top: auto;
      transform: translateX(-50%);
    }

    &:hover::before {
      background-color: var(--active-color);
      // box-shadow: 0 0 0px calc(var(--button-size) / 10) black;
    }
  }

  &.is--resizing {
    ._canvasItem--resizeHandle::before {
      background-color: var(--active-color);
      // box-shadow: 0 0 0px calc(var(--button-size) / 10) black;
    }
  }
}

._canvasItem--shape {
  ::v-deep {
    svg {
      overflow: visible;
      pointer-events: none;

      path {
        pointer-events: auto;
        pointer-events: visibleStroke;
        stroke: var(--author-color, black);
      }

      path.path-hitbox {
        stroke: transparent !important;
        stroke-width: 20px !important;
      }
    }
  }
}
</style>
