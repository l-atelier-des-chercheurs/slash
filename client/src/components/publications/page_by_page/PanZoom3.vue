<template>
  <div
    ref="infiniteviewer"
    class="viewer"
    :class="{
      'is--drag-to-pan': enableDragToPan && !isPanning,
      'is--panning': enableDragToPan && isPanning,
    }"
  >
    <div
      v-if="show_rules"
      ref="horizontalGuides"
      class="guides guides--horizontal"
    ></div>
    <div
      v-if="show_rules"
      ref="verticalGuides"
      class="guides guides--vertical"
    ></div>
    <div class="_pzViewport" ref="viewport">
      <slot />
    </div>

    <transition name="fade">
      <button
        v-if="!isContentVisible"
        class="u-button u-button_bleuvert _showOriginBtn"
        type="button"
        @click="scrollToOrigin"
      >
        <b-icon icon="house" />
        {{ $t("back_to_content") }}
      </button>
    </transition>
  </div>
</template>
<script>
import InfiniteViewer from "infinite-viewer";
import Guides from "@scena/guides";

export default {
  props: {
    zoom: Number,
    contentWidth: Number,
    contentHeight: Number,
    marginAroundContent: {
      type: Number,
      default: 0,
    },
    limitRange: {
      type: Boolean,
      default: false,
    },
    magnification: Number,
    layout_mode: {
      type: String,
      default: "screen",
    },
    show_rules: {
      type: Boolean,
      default: false,
    },
    enableDragToPan: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      infiniteviewer: null,
      horizontalGuides: null,
      verticalGuides: null,

      scroll_left: undefined,
      scroll_top: undefined,

      debounce_zoom: undefined,
      debounce_interaction: undefined,
      debounce_content_visibility: undefined,
      is_zooming: false,

      contentOffset: { x: 0, y: 0 },
      isContentVisible: true,
      isPanning: false,
    };
  },
  created() {},
  mounted() {
    this.initInfiniteViewer();

    this.$eventHub.$on(`panzoom.panTo`, this.panTo);

    // Handle window resize for guides
    window.addEventListener("resize", this.onWindowResize);
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
    if (this.horizontalGuides) {
      this.horizontalGuides.destroy();
    }
    if (this.verticalGuides) {
      this.verticalGuides.destroy();
    }
    if (this.debounce_content_visibility) {
      clearTimeout(this.debounce_content_visibility);
    }
    if (this.debounce_interaction) {
      clearTimeout(this.debounce_interaction);
    }
    window.removeEventListener("resize", this.onWindowResize);
    this.$eventHub.$off(`panzoom.panTo`, this.panTo);
  },
  watch: {
    zoom() {
      this.setZoom(this.zoom);
      this.updateViewerOptions();
      this.updateGuidesZoom();
    },
    contentWidth() {
      this.updateViewerOptions();
      this.updateGuidesResize();
    },
    contentHeight() {
      this.updateViewerOptions();
      this.updateGuidesResize();
    },
    magnification() {
      this.updateViewerOptions();
    },
    layout_mode() {
      // Reinitialize guides when layout mode changes (only if show_rules is true)
      if (this.show_rules) {
        if (this.horizontalGuides) {
          this.horizontalGuides.destroy();
          this.horizontalGuides = null;
        }
        if (this.verticalGuides) {
          this.verticalGuides.destroy();
          this.verticalGuides = null;
        }
        this.$nextTick(() => {
          this.initGuides();
        });
      }
    },
    show_rules(newValue) {
      if (newValue) {
        // Show guides - initialize them
        this.$nextTick(() => {
          setTimeout(() => {
            this.initGuides();
          }, 100);
        });
      } else {
        // Hide guides - destroy them
        if (this.horizontalGuides) {
          this.horizontalGuides.destroy();
          this.horizontalGuides = null;
        }
        if (this.verticalGuides) {
          this.verticalGuides.destroy();
          this.verticalGuides = null;
        }
      }
    },
    enableDragToPan(newValue) {
      // Update drag-to-pan option dynamically
      if (this.infiniteviewer) {
        this.infiniteviewer.useMouseDrag = newValue;
      }
    },
  },
  computed: {
    unit() {
      if (this.layout_mode === "screen") return "px";
      else return "cm"; // For print mode, use cm
    },
    guidesConfig() {
      // if (this.unit === "cm") {
      //   // 1cm = 37.7952px, unit: 1 (every 1cm)
      //   return {
      //     zoom: 1,
      //     unit: 20,
      //   };
      // } else {
      // PX mode: every 50px
      return {
        zoom: 1,
        unit: 50,
      };
      // }
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

      // Initialize guides after InfiniteViewer is ready (only if show_rules is true)
      // Wait a bit longer for content to be rendered (especially for PagedViewer)
      if (this.show_rules) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.initGuides();
          }, 100);
        });
      }
    },
    initGuides() {
      if (!this.$refs.horizontalGuides || !this.$refs.verticalGuides) return;

      // Calculate content offset first
      this.contentOffset = this.getContentOffset();

      const config = this.guidesConfig;

      // Initialize horizontal guides (Y axis)
      this.horizontalGuides = new Guides(this.$refs.horizontalGuides, {
        type: "horizontal",
        zoom: config.zoom,
        unit: config.unit,
        backgroundColor: "transparent",
        lineColor: "hsl(0, 0%, 83%)",
        textColor: "hsl(0, 0%, 83%)",
        textBackgroundColor: "transparent",
        segment: 2,
      });

      // Initialize vertical guides (X axis)
      this.verticalGuides = new Guides(this.$refs.verticalGuides, {
        type: "vertical",
        zoom: config.zoom,
        unit: config.unit,
        backgroundColor: "transparent",
        lineColor: "hsl(0, 0%, 83%)",
        textColor: "hsl(0, 0%, 83%)",
        textBackgroundColor: "transparent",
        segment: 2,
      });

      // Sync guides with scroll
      this.updateGuidesScroll();
    },
    updateGuidesScroll() {
      if (
        !this.show_rules ||
        !this.infiniteviewer ||
        !this.horizontalGuides ||
        !this.verticalGuides ||
        !this.$refs.viewport
      )
        return;

      // Recalculate content offset in case content has moved
      this.contentOffset = this.getContentOffset();

      const scrollLeft = this.infiniteviewer.getScrollLeft() || 0;
      const scrollTop = this.infiniteviewer.getScrollTop() || 0;
      const currentZoom = this.infiniteviewer.getZoom() || 1;
      const config = this.guidesConfig;

      // Adjust scroll positions to account for content offset
      // The offset represents where content's origin (0,0) is in scroll coordinates
      // We subtract the offset so guides show 0 at the content's origin
      const adjustedScrollLeft = scrollLeft - this.contentOffset.x;
      const adjustedScrollTop = scrollTop - this.contentOffset.y;

      // Calculate the effective zoom for guides (base zoom * current viewer zoom)
      const guidesZoom = config.zoom * currentZoom;

      // Horizontal guides: scroll ruler horizontally, scroll guidelines vertically
      // Pass zoom parameter so guides scroll at the same speed as content
      this.horizontalGuides.scroll(adjustedScrollLeft, guidesZoom);
      this.horizontalGuides.scrollGuides(adjustedScrollTop, guidesZoom);

      // Vertical guides: scroll ruler vertically, scroll guidelines horizontally
      this.verticalGuides.scroll(adjustedScrollTop, guidesZoom);
      this.verticalGuides.scrollGuides(adjustedScrollLeft, guidesZoom);
    },
    getContentOffset() {
      // Get the offset where the actual content starts in scroll coordinates
      // This accounts for margins, padding, or positioning of content within the viewport
      if (!this.$refs.viewport || !this.infiniteviewer) return { x: 0, y: 0 };

      const viewport = this.$refs.viewport;

      // Try to find the first content element to determine where content starts
      // For PagedViewer, look for the first page
      const firstPage = viewport.querySelector(
        ".pagedjs_first_page, .pagedjs_page, [data-page-number]"
      );
      if (firstPage) {
        // Use offsetLeft/offsetTop which gives position relative to offsetParent (viewport)
        // This is the position in the scrollable coordinate space
        let offsetX = firstPage.offsetLeft;
        let offsetY = firstPage.offsetTop;

        // If the element has a positioned parent, we need to account for that
        let parent = firstPage.offsetParent;
        while (
          parent &&
          parent !== viewport &&
          parent !== this.$refs.infiniteviewer
        ) {
          offsetX += parent.offsetLeft;
          offsetY += parent.offsetTop;
          parent = parent.offsetParent;
        }

        return {
          x: offsetX,
          y: offsetY,
        };
      }

      // Fallback: check if viewport has any positioned children
      const firstChild = viewport.firstElementChild;
      if (firstChild) {
        return {
          x: firstChild.offsetLeft || 0,
          y: firstChild.offsetTop || 0,
        };
      }

      return { x: 0, y: 0 };
    },
    getViewerOptions() {
      // Set ranges to prevent scrolling to negative values (less than 0)
      // but allow unlimited positive scrolling

      let rangeX = undefined;
      let rangeY = undefined;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      if (this.limitRange) {
        rangeX = [
          -this.marginAroundContent,
          this.contentWidth - windowWidth + this.marginAroundContent,
        ];
        rangeY = [
          -this.marginAroundContent,
          this.contentHeight - windowHeight + this.marginAroundContent,
        ];
      }

      return {
        useMouseDrag: this.enableDragToPan,
        useWheelScroll: true,
        useAutoZoom: true,
        margin: 0,
        zoomRange: [0.1, 50],
        maxPinchWheel: 10,
        displayVerticalScroll: true,
        displayHorizontalScroll: true,
        // rangeX: rangeX,
        // rangeY: rangeY,
      };
    },
    updateViewerOptions() {
      // Since we're not using ranges, we don't need to recreate the viewer
      // when content dimensions change. The viewer will handle it automatically.
      // This method is kept for API compatibility but doesn't need to do anything.
    },
    handleInteractionEnd() {
      if (this.debounce_interaction) clearTimeout(this.debounce_interaction);
      this.debounce_interaction = setTimeout(() => {
        const x = this.infiniteviewer.getScrollLeft();
        const y = this.infiniteviewer.getScrollTop();
        const zoom = this.infiniteviewer.getZoom();
        console.log("handleInteractionEnd", x, y, zoom);
        this.$emit("scroll-end", { x, y, zoom });
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
    scrollToOrigin() {
      // Scroll to content origin (0, 0)
      // Account for content offset to show the actual content origin
      if (!this.infiniteviewer) return;

      // Recalculate offset to ensure it's current
      const offset = this.getContentOffset();

      // Scroll to the content origin position
      this.scrollToCorner({
        x: offset.x || 0,
        y: offset.y || 0,
        animate: false,
      });
      // Clamp disabled - allow scrolling after going to origin
      // this.clampScrollToContent();
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
      if (this.show_rules) this.updateGuidesScroll();
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
      this.updateGuidesZoom();
    },
    updateGuidesZoom() {
      if (
        !this.show_rules ||
        !this.horizontalGuides ||
        !this.verticalGuides ||
        !this.infiniteviewer
      )
        return;

      const currentZoom = this.infiniteviewer.getZoom() || this.zoom || 1;
      const config = this.guidesConfig;

      // Update guides zoom based on current scale
      // The guides zoom needs to account for the viewer's zoom level
      this.horizontalGuides.setZoom(config.zoom * currentZoom);
      this.verticalGuides.setZoom(config.zoom * currentZoom);
    },
    updateGuidesResize() {
      if (!this.show_rules) return;
      if (this.horizontalGuides) {
        this.horizontalGuides.resize();
      }
      if (this.verticalGuides) {
        this.verticalGuides.resize();
      }
    },
    onWindowResize() {
      this.updateGuidesResize();
      // Recalculate content offset after resize
      this.$nextTick(() => this.updateGuidesScroll());
    },
    onWheel(event) {
      this.handleInteractionEnd();
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
.guides {
  position: absolute;
  pointer-events: none;
  z-index: 1;

  ::v-deep {
    // Target any divs and make them transparent
    div {
      background: transparent !important;
    }

    // Make text/labels lighter and more subtle
    span,
    div[class*="text"],
    div[class*="label"] {
      color: var(--c-gris_fonce);
      opacity: 0.5 !important;
    }

    // Override any background colors
    [style*="background"] {
      background: transparent !important;
    }
  }
}
.guides--horizontal {
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  overflow: hidden;
}
.guides--vertical {
  top: 0;
  left: 0;
  bottom: 0;
  width: 30px;
  overflow: hidden;
}
._showOriginBtn {
  position: absolute;
  bottom: calc(var(--spacing) * 2);
  right: calc(var(--spacing) * 2);
  z-index: 100;
  pointer-events: auto;
}
</style>
