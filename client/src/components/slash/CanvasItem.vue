<template>
  <div
    class="_canvasItem panzoom-exclude"
    :class="{ 'is--dragging': isDragging }"
    :style="itemStyle"
    @mousedown="handleMouseDown"
  >
    <MediaContent :file="file" :resolution="320" />
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
  },
  components: {},
  data() {
    return {
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragStartFileX: 0,
      dragStartFileY: 0,
      dragOffsetX: 0,
      dragOffsetY: 0,
      currentX: null,
      currentY: null,
      saveTimeout: null,
    };
  },
  computed: {
    itemStyle() {
      const x = this.currentX !== null ? this.currentX : this.file.x || 0;
      const y = this.currentY !== null ? this.currentY : this.file.y || 0;
      return {
        left: `${x}px`,
        top: `${y}px`,
        cursor: this.isDragging ? "grabbing" : "grab",
      };
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
    handleMouseDown(event) {
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

      // Calculate mouse position in canvas coordinates
      const mouseCanvasX =
        this.dragStartX - canvasRect.left + this.canvasScrollLeft;
      const mouseCanvasY =
        this.dragStartY - canvasRect.top + this.canvasScrollTop;

      // Calculate offset from mouse to item top-left corner in canvas coordinates
      this.dragOffsetX = mouseCanvasX - this.dragStartFileX;
      this.dragOffsetY = mouseCanvasY - this.dragStartFileY;
    },
    handleMouseMove(event) {
      if (!this.isDragging) return;

      // Get canvas container
      const canvasContainer = this.$el.closest("._largeCanvas");
      if (!canvasContainer) return;

      const canvasRect = canvasContainer.getBoundingClientRect();

      // Calculate mouse position relative to canvas, accounting for scroll
      const mouseX = event.clientX - canvasRect.left + this.canvasScrollLeft;
      const mouseY = event.clientY - canvasRect.top + this.canvasScrollTop;

      // Calculate new file position (mouse position minus offset)
      const newX = mouseX - this.dragOffsetX;
      const newY = mouseY - this.dragOffsetY;

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(10000 - 160, newX));
      const clampedY = Math.max(0, Math.min(10000 - 120, newY));

      // Update position
      this.currentX = clampedX;
      this.currentY = clampedY;

      // Emit position update
      this.$emit("position-update", {
        file: this.file,
        x: this.currentX,
        y: this.currentY,
      });
    },
    handleMouseUp() {
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
  },
};
</script>
<style lang="scss" scoped>
._canvasItem {
  position: absolute;
  width: 160px;
  height: 120px;

  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.12);
  border-radius: var(--border-radius);
  overflow: hidden;

  cursor: grab;
  user-select: none;

  &:not(.is--dragging) {
    transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  }

  &:hover:not(.is--dragging) {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.24);
    transform: scale(1.05);
  }

  &.is--dragging {
    cursor: grabbing;
    z-index: 1000;
    box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.3);
    transform: scale(1.1);
  }
}
</style>
