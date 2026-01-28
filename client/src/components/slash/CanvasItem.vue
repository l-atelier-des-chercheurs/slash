<template>
  <div
    class="_canvasItem panzoom-exclude"
    :class="{ 'is--dragging': isDragging, 'is--resizing': isResizing }"
    :style="itemStyle"
    @mousedown="handleMouseDown"
    :data-file-path="file.$path"
  >
    <!-- <span class="_canvasItem--debug"
      >{{ file.x }} {{ file.y }} {{ optimalResolution }}</span
    > -->
    <div class="_canvasItem--shadow" />

    <div class="_canvasItem--content">
      <MediaContent
        :file="file"
        :context="'full'"
        :resolution="optimalResolution"
      />
      <div
        v-if="showResizeHandle"
        class="_resizeHandle"
        @mousedown.stop="handleResizeStart"
      ></div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
    canvasScrollLeft: {
      type: Number,
      default: 0,
    },
    canvasScrollTop: {
      type: Number,
      default: 0,
    },
    canvasZoom: {
      type: Number,
      default: 1,
    },
  },
  components: {},
  data() {
    return {
      isDragging: false,
      isResizing: false,
      isHovering: false,
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
    itemStyle() {
      const x = this.currentX !== null ? this.currentX : this.file.x || 0;
      const y = this.currentY !== null ? this.currentY : this.file.y || 0;
      const width =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
      const ratio = this.file.$infos?.ratio;
      const height = ratio ? width * ratio : null;

      const style = {
        left: `${x}px`,
        top: `${y}px`,
        cursor: this.isDragging
          ? "grabbing"
          : this.isResizing
          ? "ew-resize"
          : "grab",
        width: `${width}px`,
      };

      if (height !== null) {
        style.height = `${height}px`;
      }

      return style;
    },
    showResizeHandle() {
      return (this.isHovering || this.isResizing) && !this.isDragging;
    },
    optimalResolution() {
      // Available thumbnail resolutions
      const availableResolutions = [50, 320, 640, 2000];

      // Get the current item width
      const itemWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;

      // Calculate displayed width (item width * zoom level)
      const displayedWidth = itemWidth * this.canvasZoom;

      // Account for device pixel ratio (retina/high-DPI displays)
      const devicePixelRatio = window.devicePixelRatio || 1;
      const requiredResolution = displayedWidth * devicePixelRatio;

      // Select the smallest resolution that is at least as large as the required resolution
      // This avoids upscaling while preventing unnecessarily large thumbnails
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
    this.$el.addEventListener("mouseenter", this.handleMouseEnter);
    this.$el.addEventListener("mouseleave", this.handleMouseLeave);
  },
  beforeDestroy() {
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    if (this.$el) {
      this.$el.removeEventListener("mouseenter", this.handleMouseEnter);
      this.$el.removeEventListener("mouseleave", this.handleMouseLeave);
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
  },
  methods: {
    handleMouseEnter() {
      this.isHovering = true;
    },
    handleMouseLeave() {
      this.isHovering = false;
    },
    handleResizeStart(event) {
      event.preventDefault();
      event.stopPropagation();

      this.isResizing = true;

      // Store initial mouse position and width
      this.resizeStartX = event.clientX;
      this.resizeStartWidth =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
    },
    handleMouseDown(event) {
      // Don't start dragging if clicking on resize handle
      if (event.target.classList.contains("_resizeHandle")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      this.isDragging = true;

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
      // Convert screen coordinates to canvas coordinates by dividing by zoom
      const mouseScreenX = this.dragStartX - canvasRect.left;
      const mouseScreenY = this.dragStartY - canvasRect.top;
      const mouseCanvasX =
        mouseScreenX / this.canvasZoom + this.canvasScrollLeft;
      const mouseCanvasY =
        mouseScreenY / this.canvasZoom + this.canvasScrollTop;

      // Calculate offset from mouse to item top-left corner in canvas coordinates
      this.dragOffsetX = mouseCanvasX - this.dragStartFileX;
      this.dragOffsetY = mouseCanvasY - this.dragStartFileY;
    },
    handleMouseMove(event) {
      if (this.isResizing) {
        // Calculate width change based on mouse movement
        const deltaX = event.clientX - this.resizeStartX;

        // Get canvas container to account for zoom/scale
        const canvasContainer = this.$el.closest("._largeCanvas");
        if (!canvasContainer) return;

        // Get the PanZoom3 viewer to check for zoom
        const viewer = canvasContainer.querySelector(".viewer");
        let scale = 1;
        if (viewer) {
          const transform = window.getComputedStyle(viewer).transform;
          if (transform && transform !== "none") {
            const matrix = transform.match(/matrix\(([^)]+)\)/);
            if (matrix) {
              const values = matrix[1].split(",");
              scale = parseFloat(values[0]) || 1;
            }
          }
        }

        // Adjust deltaX for zoom scale
        const adjustedDeltaX = deltaX / scale;

        // Calculate new width
        const newWidth = Math.max(50, this.resizeStartWidth + adjustedDeltaX);

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

      // Get canvas container
      const canvasContainer = this.$el.closest("._largeCanvas");
      if (!canvasContainer) return;

      const canvasRect = canvasContainer.getBoundingClientRect();

      // Calculate mouse position relative to canvas, accounting for zoom and scroll
      // Convert screen coordinates to canvas coordinates by dividing by zoom
      const mouseScreenX = event.clientX - canvasRect.left;
      const mouseScreenY = event.clientY - canvasRect.top;
      const mouseX = mouseScreenX / this.canvasZoom + this.canvasScrollLeft;
      const mouseY = mouseScreenY / this.canvasZoom + this.canvasScrollTop;

      // Calculate new file position (mouse position minus offset)
      const newX = mouseX - this.dragOffsetX;
      const newY = mouseY - this.dragOffsetY;

      // Allow any position (negative or positive) - no clamping
      this.currentX = newX;
      this.currentY = newY;

      // Emit position update
      this.$emit("position-update", {
        file: this.file,
        x: this.currentX,
        y: this.currentY,
      });
    },
    handleMouseUp() {
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

      // Save final position
      const finalX = this.currentX !== null ? this.currentX : this.file.x || 0;
      const finalY = this.currentY !== null ? this.currentY : this.file.y || 0;

      // Clear current position to use file position
      this.currentX = null;
      this.currentY = null;

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

  position: absolute;
  width: 160px;
  height: auto;

  overflow: visible;

  cursor: grab;
  user-select: none;

  transition: all 0.12s cubic-bezier(0.19, 1, 0.22, 1);

  &.is--dragging {
    cursor: grabbing;
    z-index: 1000;
  }
  &.is--resizing {
    cursor: ew-resize;
  }

  ._canvasItem--content {
    position: relative;
    border-radius: var(--border-radius);
    overflow: hidden;
    transition: transform 0.12s cubic-bezier(0.19, 1, 0.22, 1);
  }

  &:hover,
  &.is--dragging,
  &.is--resizing {
    ._canvasItem--content {
      transform: translate(-5px, -5px);
    }
  }

  ._canvasItem--shadow {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgb(221, 221, 221);
    border-radius: var(--border-radius);
    z-index: -1;
  }

  ._resizeHandle {
    position: absolute;
    right: 6px;
    bottom: 6px;

    width: 6px;
    height: 16px;
    background-color: white;
    border-radius: 4px;
    cursor: ew-resize;
    z-index: 10;
    transition: background-color 0.2s;
    pointer-events: auto;

    &:hover {
      transform: translateY(-50%) scale(1.2);
    }
  }
}

._canvasItem--debug {
  position: absolute;
  bottom: 0;
  left: 0;
  font-size: 10px;
  color: var(--c-gris_fonce);
  background-color: rgba(255, 255, 255, 0.5);
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
