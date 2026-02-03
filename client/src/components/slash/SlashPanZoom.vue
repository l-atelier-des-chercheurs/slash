<template>
  <div
    ref="infiniteviewer"
    class="viewer"
    :class="{
      'is--drag-to-pan': enable_drag_to_pan && !isPanning,
      'is--panning': enable_drag_to_pan && isPanning,
    }"
  >
    <div class="_pzViewport" ref="viewport">
      <slot />
    </div>
  </div>
</template>
<script>
import InfiniteViewer from "infinite-viewer";

export default {
  props: {
    zoom: Number,
    zoom_range: {
      type: Array,
      default: () => [0.01, 1],
    },
    content_width: Number,
    content_height: Number,
    margin_around_content: {
      type: Number,
      default: 0,
    },
    enable_drag_to_pan: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      infiniteviewer: null,
      debounce_interaction: undefined,
      isPanning: false,
    };
  },
  mounted() {
    this.initInfiniteViewer();

    this.$eventHub.$on(`panzoom.panTo`, this.panTo);
  },
  beforeDestroy() {
    if (this.infiniteviewer) {
      this.infiniteviewer.off("scroll", this.onScroll);
      this.infiniteviewer.off("dragStart", this.dragStart);
      this.infiniteviewer.off("dragEnd", this.dragEnd);
      this.infiniteviewer.off("pinchStart", this.pinchStart);
      this.infiniteviewer.off("abortPinch", this.abortPinch);
      this.infiniteviewer.off("pinch", this.pinch);
      this.infiniteviewer.destroy();
    }
    if (this.debounce_interaction) {
      clearTimeout(this.debounce_interaction);
    }
    this.$eventHub.$off(`panzoom.panTo`, this.panTo);
  },
  watch: {
    zoom() {
      this.setZoom(this.zoom);
    },
    enable_drag_to_pan(newValue) {
      // Update drag-to-pan option dynamically
      if (this.infiniteviewer) {
        this.infiniteviewer.useMouseDrag = newValue;
      }
    },
  },
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
      return {
        useMouseDrag: this.enable_drag_to_pan,
        useWheelScroll: true,
        useAutoZoom: true,
        margin: 0,
        zoomRange: this.zoom_range,
        maxPinchWheel: 10,
        displayVerticalScroll: true,
        displayHorizontalScroll: true,
      };
    },
    handleInteractionEnd() {
      if (this.debounce_interaction) clearTimeout(this.debounce_interaction);
      this.debounce_interaction = setTimeout(() => {
        const left = this.infiniteviewer.getScrollLeft();
        const top = this.infiniteviewer.getScrollTop();
        const zoom = this.infiniteviewer.getZoom();

        const infiniteviewer = this.$refs.infiniteviewer;
        const infiniteviewer_w = infiniteviewer
          ? infiniteviewer.offsetWidth
          : 0;
        const infiniteviewer_h = infiniteviewer
          ? infiniteviewer.offsetHeight
          : 0;
        const x = left + infiniteviewer_w / (2 * zoom);
        const y = top + infiniteviewer_h / (2 * zoom);

        this.$emit("scroll-end", { zoom, x, y });
      }, 200);
    },
    dragStart(event) {
      if (event.inputEvent?.target?.classList?.contains("panzoom-exclude"))
        event.stop();
      this.isPanning = true;
    },
    dragEnd(event) {
      this.isPanning = false;
      if (!event.isDrag) this.disableActiveModule();
    },
    pinchStart() {
      console.log("pinchStart");
    },
    abortPinch() {
      console.log("abortPinch");
    },
    pinch() {
      console.log("pinch");
      this.handleInteractionEnd();
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
      const currentScale = this.zoom || this.infiniteviewer.getZoom() || 1;

      let _x = (x || 0) + -(0 + margin) / currentScale;
      let _y = (y || 0) + -margin / currentScale;
      this.infiniteviewer.scrollTo(_x, _y, opt);
    },
    disableActiveModule() {
      this.$eventHub.$emit("module.setActive", false);
    },
    onScroll() {
      console.log("onScroll");
      this.handleInteractionEnd();
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

  &.is--drag-to-pan {
    cursor: grab;
  }
  &.is--panning {
    cursor: grabbing;
  }
}
._pzViewport {
  position: relative;
}
</style>
