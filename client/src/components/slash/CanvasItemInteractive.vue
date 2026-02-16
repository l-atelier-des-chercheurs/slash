<template>
  <div
    class="_canvasItem is--canvas panzoom-exclude"
    :class="{
      'is--dragging': has_dragged,
      'is--resizing': isResizing,
      'is--selected': is_selected,
    }"
    :style="itemStyle"
    :data-file-type="file.$type"
    @mousedown="handleMouseDown"
    :data-file-path="file.$path"
  >
    <template v-if="file.$type === 'canvas_shape'">
      <div v-html="file.shape_svg" class="_canvasItem--shape" />
    </template>
    <template v-else-if="file.$type === 'canvas_text'">
      <div class="_canvasItem--text">
        <div v-html="file.text" />
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
      class="_canvasItem--open"
      v-if="!['canvas_shape', 'canvas_text'].includes(file.$type)"
      :style="'--scale-factor: ' + canvas_zoom"
    >
      <button
        type="button"
        class="u-button u-button_icon u-button_glass _openBtn"
        @click="handleOpen"
      >
        <b-icon icon="box-arrow-up-right" />
      </button>
    </div>

    <div class="_canvasItem--selectedBorder"></div>
    <div
      v-if="
        !['canvas_shape', 'canvas_text'].includes(file.$type) && is_selected
      "
      class="_canvasItem--resizeHandle"
      :class="{ 'is--widthOnly': isWidthOnly }"
      :style="'--scale-factor: ' + canvas_zoom"
      @mousedown.stop="handleResizeStart"
    />
  </div>
</template>

<script>
import CanvasItem from "./CanvasItem.vue";

export default {
  props: {
    file: {
      type: Object,
      required: true,
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
  },
  components: {
    CanvasItem,
  },
  data() {
    return {
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
      resizeStartX: 0,
      resizeStartWidth: 0,
      saveTimeout: null,
    };
  },
  computed: {
    isWidthOnly() {
      return !this.file.$infos?.ratio;
    },
    itemStyle() {
      // Canvas mode: absolute positioning
      const x = this.currentX !== null ? this.currentX : this.file.x || 0;
      const y = this.currentY !== null ? this.currentY : this.file.y || 0;
      // Clamp for display as well
      let width =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;

      // max width is 2000px
      const max_width = 2000;
      const max_height = 1000;
      width = Math.min(width, max_width);

      const ratio = this.file.$infos?.ratio;
      const height = ratio ? width * ratio : 160;

      const style = {
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        "--scale-factor": this.canvas_zoom,
      };

      if (ratio) {
        style.height = `${height}px`;
      }

      return style;
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
  mounted() {
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  },
  beforeDestroy() {
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  },
  methods: {
    handleResizeStart(event) {
      event.preventDefault();
      event.stopPropagation();

      this.isResizing = true;

      // Store initial mouse position and width
      this.resizeStartX = event.clientX;
      this.resizeStartWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
    },
    handleOpen() {
      this.$eventHub.$emit("canvasItem.openWithTransition", this.file.$path);
    },
    handleMouseDown(event) {
      // Don't start dragging if clicking on resize handle
      if (event.target.classList.contains("_canvasItem--resizeHandle")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

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
        // Mouse delta in screen pixels; convert to canvas coordinates using zoom
        const deltaX = event.clientX - this.resizeStartX;
        const adjustedDeltaX = deltaX / this.canvas_zoom;

        // Calculate new width (in canvas coordinates)
        let newWidth = Math.max(50, this.resizeStartWidth + adjustedDeltaX);
        newWidth = Math.min(2600, this.resizeStartWidth + adjustedDeltaX);

        // Allow any width (no upper bound clamping since we allow negative positions)
        const clampedWidth = newWidth;

        this.currentWidth = Math.round(clampedWidth);

        // Emit width update
        this.$emit("width-update", {
          file: this.file,
          width: this.currentWidth,
        });

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
      const ratio = this.file.$infos?.ratio;
      const currentHeight = ratio ? currentWidth * ratio : 160;

      newX = Math.min(newX, this.canvas_width - currentWidth);
      newY = Math.min(newY, this.canvas_height - currentHeight);

      this.currentX = newX;
      this.currentY = newY;

      // Emit position update
      this.$emit("position-update", {
        file: this.file,
        x: this.currentX,
        y: this.currentY,
      });
    },
    handleMouseUp(event) {
      event.preventDefault();
      event.stopPropagation();

      if (this.isResizing) {
        this.isResizing = false;

        // Save final width
        const finalWidth =
          this.currentWidth !== null
            ? this.currentWidth
            : this.file.width || 160;

        // Clear current width to use file width
        this.currentWidth = null;

        // Debounce API call
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
          this.saveWidth(finalWidth);
        }, 300);

        return;
      }

      if (!this.isDragging) return;

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
      const ratio = this.file.$infos?.ratio;
      const currentHeight = ratio ? currentWidth * ratio : 160;

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
    async saveWidth(width) {
      try {
        await this.$api.updateMeta({
          path: this.file.$path,
          new_meta: { width },
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
  --selected-border-width: max(calc(2px / var(--scale-factor)), 4px);

  position: absolute;
  width: 160px;
  height: auto;

  overflow: visible;

  cursor: pointer;
  user-select: none;

  transition: all 0.12s cubic-bezier(0.19, 1, 0.22, 1);

  &[data-file-type="shape"] {
    pointer-events: none;
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
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);

    ._openBtn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 10rem;
      height: 6rem;
      text-align: center;
      border-radius: 8rem;
      pointer-events: auto;
      font-size: 3rem;

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

  ._canvasItem--selectedBorder {
    position: absolute;
    inset: 0;
    opacity: 0;
    outline: var(--selected-border-width) solid var(--active-color);
    pointer-events: none;
    transition: opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  }

  ._canvasItemContent {
    width: 100%;
    height: 100%;
  }

  ._canvasItem--resizeHandle {
    --button-size: 24px;

    position: absolute;
    right: calc(var(--button-size) / -2);
    bottom: calc(var(--button-size) / -2);

    width: var(--button-size);
    height: var(--button-size);

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
      height: calc(var(--button-size));
      // transform: rotate(90deg);
      background-color: white;
      outline: var(--selected-border-width) solid var(--active-color);
      transition: all 0.2s;
    }

    &.is--widthOnly {
      cursor: ew-resize;
      top: 50%;
      transform: translateY(-50%);

      &::before {
      }
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
      path {
        pointer-events: auto;
        stroke-width: 4px;
      }
    }
  }

  &:hover {
    ::v-deep path {
      stroke-width: 6px;
    }
  }
}
</style>
