<template>
  <PanZoom3
    class="_largeCanvas"
    ref="viewer"
    :scale="scale"
    :content-width="canvasSize"
    :content-height="canvasSize"
    :show-rules="false"
    :enable-drag-to-pan="true"
    :margin-around-content="200"
    :limitRange="true"
    @update:scale="handleZoomUpdate"
  >
    <div class="_canvasContent" :style="canvasContentStyle">
      <CanvasItemInteractive
        v-for="file in files"
        :key="file.$path"
        :file="file"
        :canvas-scroll-left="canvasScrollLeft"
        :canvas-scroll-top="canvasScrollTop"
        :canvas-zoom="scale"
        @position-update="handlePositionUpdate"
        @width-update="handleWidthUpdate"
      />
    </div>

    <div
      class="_currentCenterDot"
      :style="{
        left: canvasScrollLeft + 'px',
        top: canvasScrollTop + 'px',
      }"
    ></div>
  </PanZoom3>
</template>
<script>
import PanZoom3 from "@/components/publications/page_by_page/PanZoom3.vue";
import CanvasItemInteractive from "@/components/slash/CanvasItemInteractive.vue";
export default {
  props: {
    files: {
      type: Array,
      required: true,
    },
    scale: {
      type: Number,
      default: 1,
    },
  },
  components: {
    PanZoom3,
    CanvasItemInteractive,
  },
  data() {
    return {
      canvasScrollLeft: 0,
      canvasScrollTop: 0,
      canvasViewedCenterX: 0,
      canvasViewedCenterY: 0,
      canvasSize: 10000,
      nextGridX: 0,
      nextGridY: 0,
      scrollAnimationFrame: null,
      lastLogTime: 0,
    };
  },
  computed: {
    canvasContentStyle() {
      return {
        width: `${this.canvasSize}px`,
        height: `${this.canvasSize}px`,
      };
    },
  },
  watch: {
    files: {
      handler() {
        this.$nextTick(() => {
          this.initializeItemPositions();
        });
      },
      deep: true,
    },
  },
  mounted() {
    this.initializeItemPositions();
    this.updateScrollPosition();
    this.startScrollTracking();
    this.centerOnOrigin();
  },
  beforeDestroy() {
    this.stopScrollTracking();
  },
  methods: {
    startScrollTracking() {
      const trackScroll = () => {
        this.updateScrollPosition();
        this.scrollAnimationFrame = requestAnimationFrame(trackScroll);
      };
      this.scrollAnimationFrame = requestAnimationFrame(trackScroll);
    },
    stopScrollTracking() {
      if (this.scrollAnimationFrame) {
        cancelAnimationFrame(this.scrollAnimationFrame);
        this.scrollAnimationFrame = null;
      }
    },
    updateScrollPosition() {
      if (this.$refs.viewer) {
        this.canvasScrollLeft = this.$refs.viewer.getScrollLeft();
        this.canvasScrollTop = this.$refs.viewer.getScrollTop();
        this.logCenterPosition();
      }
    },
    logCenterPosition() {
      const now = Date.now();
      if (now - this.lastLogTime < 200) return;
      this.lastLogTime = now;

      const viewerEl = this.$el;
      if (!viewerEl) return;

      const rect = viewerEl.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const zoom = this.scale;

      this.canvasViewedCenterX = centerX / zoom + this.canvasScrollLeft;
      this.canvasViewedCenterY = centerY / zoom + this.canvasScrollTop;

      console.log(
        `Canvas Center: x=${Math.round(
          this.canvasViewedCenterX
        )}, y=${Math.round(this.canvasViewedCenterY)}`,
        `Canvas Scroll: x=${Math.round(this.canvasScrollLeft)}, y=${Math.round(
          this.canvasScrollTop
        )}`
      );
    },
    initializeItemPositions() {
      // Initialize positions for items without x/y coordinates; clamp all to >= 0 so content stays in canvas
      let gridX = this.nextGridX;
      let gridY = this.nextGridY;
      const gridSpacing = 200;

      this.files.forEach((file) => {
        if (file.x === undefined || file.y === undefined) {
          // Use grid layout for initial positioning (always non-negative)
          const x = Math.max(0, gridX);
          const y = Math.max(0, gridY);

          this.$set(file, "x", x);
          this.$set(file, "y", y);

          gridX += gridSpacing;
          if (gridX > this.canvasSize - 200) {
            gridX = 0;
            gridY += gridSpacing;
          }
        } else {
          // Clamp existing coordinates so content stays in positive quadrant
          const clampedX = Math.max(0, file.x);
          const clampedY = Math.max(0, file.y);
          if (file.x !== clampedX) this.$set(file, "x", clampedX);
          if (file.y !== clampedY) this.$set(file, "y", clampedY);
        }
      });

      this.nextGridX = gridX;
      this.nextGridY = gridY;
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
    handleZoomUpdate(zoom) {
      this.$emit("update:scale", zoom);
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
  --rule-size: 48px;
  --dot-size: 2px;

  border: var(--dot-size) solid var(--rule-color);
  background-image: radial-gradient(
    circle,
    var(--rule-color) var(--dot-size),
    var(--background-color) var(--dot-size)
  );
  background-size: var(--rule-size) var(--rule-size);
  background-position: 0 0;

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: radial-gradient(
      circle,
      var(--rule-color) var(--dot-size),
      var(--background-color) var(--dot-size)
    );
    background-size: var(--rule-size) var(--rule-size);
  }
}

._currentCenterDot {
  position: absolute;
  width: 20px;
  height: 20px;
  background: var(--c-orange);
  border-radius: 50%;
  z-index: 1000;
}
</style>
