<template>
  <vue-infinite-viewer
    class="_largeCanvas"
    ref="viewer"
    v-bind="viewerOptions"
    @scroll="onScroll"
    @dragStart="onDragStart"
  >
    <div class="_canvasContent" :style="canvasContentStyle">
      <CanvasItem
        v-for="file in files"
        :key="file.$path"
        :file="file"
        :canvas-scroll-left="canvasScrollLeft"
        :canvas-scroll-top="canvasScrollTop"
        @position-update="handlePositionUpdate"
      />
    </div>
  </vue-infinite-viewer>
</template>
<script>
import { VueInfiniteViewer } from "vue-infinite-viewer";
import CanvasItem from "@/components/slash/CanvasItem.vue";
export default {
  props: {
    files: {
      type: Array,
      required: true,
    },
  },
  components: {
    VueInfiniteViewer,
    CanvasItem,
  },
  data() {
    return {
      canvasScrollLeft: 0,
      canvasScrollTop: 0,
      canvasSize: 1000,
      nextGridX: 0,
      nextGridY: 0,
      viewerOptions: {},
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
    this.updateViewerOptions();
    this.initializeItemPositions();
    this.updateScrollPosition();
  },
  methods: {
    updateViewerOptions() {
      const padding = 200;
      const maxRangeX = Math.max(0, this.canvasSize);
      const maxRangeY = Math.max(0, this.canvasSize);

      this.viewerOptions = {
        useMouseDrag: true,
        useWheelScroll: true,
        useAutoZoom: false,
        rangeX: [-padding, maxRangeX + padding],
        rangeY: [-padding, maxRangeY + padding],
        displayVerticalScroll: false,
        displayHorizontalScroll: false,
      };
    },
    updateScrollPosition() {
      if (this.$refs.viewer) {
        this.canvasScrollLeft = this.$refs.viewer.getScrollLeft();
        this.canvasScrollTop = this.$refs.viewer.getScrollTop();
      }
    },
    onScroll() {
      this.updateScrollPosition();
    },
    onDragStart(event) {
      // Prevent panning when clicking on canvas items
      if (event.inputEvent.target.closest(".panzoom-exclude")) {
        event.stop();
      }
    },
    initializeItemPositions() {
      // Initialize positions for items without x/y coordinates
      let gridX = this.nextGridX;
      let gridY = this.nextGridY;
      const gridSpacing = 200;

      this.files.forEach((file) => {
        if (file.x === undefined || file.y === undefined) {
          // Use grid layout for initial positioning
          const x = gridX;
          const y = gridY;

          // Update file object locally (will be saved when dragged)
          this.$set(file, "x", x);
          this.$set(file, "y", y);

          // Update grid position for next item
          gridX += gridSpacing;
          if (gridX > this.canvasSize - 200) {
            gridX = 0;
            gridY += gridSpacing;
          }
        }
      });

      // Update next grid position
      this.nextGridX = gridX;
      this.nextGridY = gridY;
    },
    handlePositionUpdate({ file, x, y }) {
      // Update file position locally
      this.$set(file, "x", x);
      this.$set(file, "y", y);
    },
  },
};
</script>
<style lang="scss" scoped>
._largeCanvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: move;
}

._canvasContent {
  position: relative;

  --dot-color: rgba(225, 225, 225, 1);
  background-image: radial-gradient(
    circle,
    var(--dot-color) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
  background-position: 0 0;

  // For retina/high-DPI displays (2x)
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: radial-gradient(
      circle,
      var(--dot-color) 0.5px,
      transparent 0.5px
    );
    background-size: 24px 24px;
  }
}
</style>
