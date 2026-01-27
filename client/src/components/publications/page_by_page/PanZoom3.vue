<template>
  <div ref="infiniteviewer" class="viewer">
    <div class="_pzViewport" ref="viewport">
      <slot />
    </div>
  </div>
</template>
<script>
import InfiniteViewer from "infinite-viewer";

export default {
  props: {
    scale: Number,
    contentWidth: Number,
    contentHeight: Number,
    magnification: Number,
  },
  data() {
    return {
      infiniteviewer: null,

      scroll_left: undefined,
      scroll_top: undefined,

      debounce_zoom: undefined,
      debounce_scroll: undefined,
    };
  },
  created() {},
  mounted() {
    this.initInfiniteViewer();
    this.$nextTick(() => {
      this.scrollToCorner({ animate: false });
    });

    this.$eventHub.$on(`panzoom.panTo`, this.panTo);
  },
  beforeDestroy() {
    if (this.infiniteviewer) {
      // Remove event listeners
      this.infiniteviewer.off("scroll", this.onScroll);
      this.infiniteviewer.off("dragStart", this.dragStart);
      this.infiniteviewer.off("dragEnd", this.dragEnd);
      this.infiniteviewer.off("pinchStart", this.pinchStart);
      this.infiniteviewer.off("abortPinch", this.abortPinch);
      this.infiniteviewer.off("pinch", this.pinch);
      this.infiniteviewer.destroy();
    }
    this.$eventHub.$off(`panzoom.panTo`, this.panTo);
    this.$root.set_new_module_offset_left = 0;
    this.$root.set_new_module_offset_top = 0;
  },
  watch: {
    scale() {
      this.updateScale(this.scale);
      this.updateViewerOptions();
    },
    contentWidth() {
      this.updateViewerOptions();
    },
    contentHeight() {
      this.updateViewerOptions();
    },
    magnification() {
      this.updateViewerOptions();
    },
  },
  computed: {},
  methods: {
    initInfiniteViewer() {
      if (!this.$refs.infiniteviewer || !this.$refs.viewport) return;

      const options = this.getViewerOptions();
      this.infiniteviewer = new InfiniteViewer(
        this.$refs.infiniteviewer,
        this.$refs.viewport,
        options
      );

      // Set up event listeners
      this.infiniteviewer.on("scroll", this.onScroll);
      this.infiniteviewer.on("dragStart", this.dragStart);
      this.infiniteviewer.on("dragEnd", this.dragEnd);
      this.infiniteviewer.on("pinchStart", this.pinchStart);
      this.infiniteviewer.on("abortPinch", this.abortPinch);
      this.infiniteviewer.on("pinch", this.pinch);
    },
    getViewerOptions() {
      // Set ranges to prevent scrolling to negative values (less than 0)
      // but allow unlimited positive scrolling
      return {
        useMouseDrag: true,
        useWheelScroll: true,
        useAutoZoom: true,
        margin: 0,
        zoomRange: [0.4, 10],
        maxPinchWheel: 10,
        displayVerticalScroll: true,
        displayHorizontalScroll: true,
      };
    },
    updateViewerOptions() {
      // Since we're not using ranges, we don't need to recreate the viewer
      // when content dimensions change. The viewer will handle it automatically.
      // This method is kept for API compatibility but doesn't need to do anything.
    },
    dragStart(event) {
      console.log("dragStart");
      if (event.inputEvent?.target?.classList?.contains("panzoom-exclude"))
        event.stop();
    },
    dragEnd(event) {
      console.log("dragEnd");
      if (!event.isDrag) this.disableActiveModule();
    },
    pinchStart() {
      console.log("pinchStart");
    },
    abortPinch() {
      console.log("abortPinch");
    },
    pinch() {
      // console.log("pinch");
      if (this.debounce_zoom) clearTimeout(this.debounce_zoom);
      this.debounce_zoom = setTimeout(async () => {
        const zoom = this.infiniteviewer.getZoom();
        if (zoom !== this.scale) this.$emit("update:scale", zoom);
      }, 500);
    },
    panTo({ x, y }) {
      this.scrollToCorner({ x, y, animate: true });
    },
    scrollToCorner({ x, y, animate }) {
      if (!this.infiniteviewer) return;

      const opt = animate
        ? { duration: 200, absolute: true }
        : { absolute: true };

      const margin = 80;
      const currentScale = this.scale || this.infiniteviewer.getZoom() || 1;

      let _x = (x || 0) + -(0 + margin) / currentScale;
      let _y = (y || 0) + -margin / currentScale;
      this.infiniteviewer.scrollTo(_x, _y, opt);
    },
    updateScale(scale) {
      if (!this.infiniteviewer) return;
      if (scale !== this.infiniteviewer.getZoom()) {
        this.infiniteviewer.setZoom(scale, {
          duration: 200,
          zoomBase: "viewport",
          zoomOffsetX: this.$root.zoom_offset,
          zoomOffsetY: this.$root.zoom_offset,
        });
      }
    },
    disableActiveModule() {
      this.$eventHub.$emit("module.setActive", false);
    },
    onScroll() {
      // console.log("onScroll");
      if (this.debounce_scroll) clearTimeout(this.debounce_scroll);
      this.debounce_scroll = setTimeout(async () => {
        this.$root.set_new_module_offset_left = Math.max(
          0,
          this.infiniteviewer.getScrollLeft()
        );
        this.$root.set_new_module_offset_top = Math.max(
          0,
          this.infiniteviewer.getScrollTop()
        );
      }, 500);
    },
    // Expose methods that might be called from parent components
    getZoom() {
      return this.infiniteviewer ? this.infiniteviewer.getZoom() : 1;
    },
    getScrollLeft() {
      return this.infiniteviewer ? this.infiniteviewer.getScrollLeft() : 0;
    },
    getScrollTop() {
      return this.infiniteviewer ? this.infiniteviewer.getScrollTop() : 0;
    },
    scrollTo(x, y, options) {
      if (this.infiniteviewer) {
        this.infiniteviewer.scrollTo(x, y, options);
      }
    },
    setZoom(zoom, options) {
      if (this.infiniteviewer) {
        this.infiniteviewer.setZoom(zoom, options);
      }
    },
  },
};
</script>
<style lang="scss" scoped>
.viewer {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: move;
}
._pzViewport {
  position: relative;
}
</style>
