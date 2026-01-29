<template>
  <div
    class="_canvasItem panzoom-exclude"
    :class="{
      'is--dragging': isDragging,
      'is--resizing': isResizing,
      'is--timeline': mode === 'timeline',
    }"
    :style="itemStyle"
    @mousedown="handleMouseDown"
    :data-file-path="file.$path"
  >
    <div class="_canvasItem--shadow" />

    <div class="_canvasItem--content" :data-filetype="file.$type">
      <MediaContent
        :file="file"
        :context="'full'"
        :resolution="optimalResolution"
        :plyr_options="{ controls: ['play', 'progress'] }"
      />
    </div>
    <div
      v-if="mode !== 'timeline'"
      class="_canvasItem--resizeHandle"
      :class="{ 'is--widthOnly': isWidthOnly }"
      @mousedown.stop="handleResizeStart"
      @mouseenter="handleResizeHandleEnter"
      @mouseleave="handleResizeHandleLeave"
    />
  </div>
</template>
<script>
export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      default: "canvas", // 'canvas' or 'timeline'
    },
    timelineHeight: {
      type: Number,
      default: null,
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
      isHoveringResizeHandle: false,
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
      if (this.mode === "timeline") {
        // Timeline mode: flex layout
        const width =
          this.currentWidth !== null
            ? this.currentWidth
            : this.file.width || 160;
        const ratio = this.file.$infos?.ratio;
        const height =
          this.timelineHeight || (ratio ? width * ratio : null) || 200;

        const style = {
          width: `${width}px`,
        };

        if (height !== null) {
          style.height = `${height}px`;
        }

        // Set aspect ratio for images
        if (this.file.$type === "image" && ratio) {
          style.aspectRatio = ratio;
        }

        return style;
      }

      // Canvas mode: absolute positioning
      const x = this.currentX !== null ? this.currentX : this.file.x || 0;
      const y = this.currentY !== null ? this.currentY : this.file.y || 0;
      const width =
        this.currentWidth !== null ? this.currentWidth : this.file.width || 160;
      const ratio = this.file.$infos?.ratio;
      const height = ratio ? width * ratio : null;

      const style = {
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
      };

      if (height !== null) {
        style.height = `${height}px`;
      }

      return style;
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
    handleResizeHandleEnter() {
      this.isHoveringResizeHandle = true;
    },
    handleResizeHandleLeave() {
      this.isHoveringResizeHandle = false;
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
      if (event.target.classList.contains("_canvasItem--resizeHandle")) {
        return;
      }

      // In timeline mode, don't allow dragging
      if (this.mode === "timeline") {
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
        // Mouse delta in screen pixels; convert to canvas coordinates using zoom
        const deltaX = event.clientX - this.resizeStartX;
        const adjustedDeltaX = deltaX / this.canvasZoom;

        // Calculate new width (in canvas coordinates)
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
      // Clamp to >= 0 so content stays within canvas (no negative coords)
      const newX = Math.max(0, mouseX - this.dragOffsetX);
      const newY = Math.max(0, mouseY - this.dragOffsetY);

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
  z-index: 10;

  overflow: visible;

  cursor: pointer;
  user-select: none;

  transition: all 0.12s cubic-bezier(0.19, 1, 0.22, 1);

  &.is--timeline {
    position: relative;
    margin-top: 0;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
    background: white;
    transition: transform 0.2s;

    &:hover {
      z-index: 100;
      transform: scale(1.02);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    &[data-filetype="text"] {
      background-color: #fff9c4; /* Post-it yellow */
      padding: 10px;
      width: 200px; /* Fixed width for text items */

      ::v-deep ._mediaContent {
        font-family: var(--sl-font-handwritten, cursive);
        font-size: 1.1em;
      }
    }
  }

  &.is--dragging {
    cursor: pointer;
    z-index: 1000;
  }
  &.is--resizing {
    cursor: ew-resize;
  }

  ._canvasItem--content {
    position: relative;
    border-radius: var(--border-radius);
    transition: transform 0.12s cubic-bezier(0.19, 1, 0.22, 1);

    &:not([data-filetype="audio"]) {
      // not audio because we need to keep the controls tooltip when hovering the seek bar
      overflow: hidden;
    }
  }

  &:not(.is--timeline) {
    &:hover,
    &.is--dragging {
      &:not(.is--resizing) {
        ._canvasItem--content {
          transform: translate(-5px, -5px);
        }
      }
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

  ._canvasItem--resizeHandle {
    --button-size: 36px;

    position: absolute;
    right: calc(var(--button-size) / -2);
    bottom: calc(var(--button-size) / -2);

    // Larger touch target (44x44px minimum for accessibility)
    width: var(--button-size);
    height: var(--button-size);

    display: flex;
    align-items: center;
    justify-content: center;
    // padding: 8px; // Creates larger hit area while keeping visual size same

    cursor: nwse-resize;
    z-index: 10;
    pointer-events: auto;
    opacity: 1;

    // Visual handle using pseudo-element
    &::before {
      content: "";
      display: block;
      width: 16px;
      height: 6px;
      transform: rotate(90deg);
      background-color: black;
      border-radius: 4px;
      box-shadow: 0 0 0px 2px white;
      transform: rotate(45deg);
      transition: background-color 0.2s;
    }

    &.is--widthOnly {
      cursor: ew-resize;
      // right: 0;
      top: 50%;
      transform: translateY(-50%);

      &::before {
        transform: rotate(90deg);
      }
    }

    &:hover::before {
      background-color: white;
      box-shadow: 0 0 0px 2px black;
    }
  }
  &:hover,
  &.is--dragging,
  &.is--resizing {
    ._canvasItem--resizeHandle {
      opacity: 1;
    }
  }
}

._canvasItem--content {
  ::v-deep .plyr__controls {
    border-radius: var(--border-radius, 4px);
    width: 100%;
  }

  height: 100%;
  width: 100%;

  ::v-deep ._mediaContent {
    height: 100%;
    width: 100%;

    img,
    video {
      height: 100%;
      max-width: none;
      width: 100%;
      object-fit: cover;
      display: block;
    }

    ._mediaContent--rawText {
      padding: 0;
      height: 100%;
      overflow: hidden;
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
