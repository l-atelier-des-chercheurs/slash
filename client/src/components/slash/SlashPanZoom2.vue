<template>
  <div
    ref="wrapper"
    class="viewer"
    :class="{
      'is--drag-to-pan': enable_drag_to_pan && !is_panning,
      'is--panning': enable_drag_to_pan && is_panning,
    }"
    draggable="false"
    @mousedown="onMouseDown"
    @wheel.prevent="onWheel"
    @touchstart.prevent.stop="onTouchStart"
    @touchmove.prevent.stop="onTouchMove"
    @touchend.prevent.stop="onTouchEnd"
    @touchcancel.prevent.stop="onTouchEnd"
  >
    <div
      class="_pzViewport"
      ref="viewport"
      :style="viewportStyle"
      draggable="false"
    >
      <slot />
    </div>
    <!-- <div class="_panzoomDebug">
      <div>zoom: {{ current_zoom.toFixed(2) }}</div>
      <div>
        scroll: {{ Math.round(scroll_left) }}, {{ Math.round(scroll_top) }}
      </div>
      <div>
        content: {{ content_width || "auto" }} x
        {{ content_height || "auto" }}
      </div>
      <div>center: {{ center_x }}, {{ center_y }}</div>
      <div>topleft: {{ topleft_x }}, {{ topleft_y }}</div>
    </div> -->
  </div>
</template>

<script>
export default {
  props: {
    zoom: {
      type: Number,
      default: 1,
    },
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
      // Wrapper size (updated by ResizeObserver)
      wrapper_ow: 0,
      wrapper_oh: 0,

      // Pan/scroll state in content coordinates
      scroll_left: 0,
      scroll_top: 0,

      current_zoom: this.zoom || 1,

      // Drag state
      is_panning: false,
      drag_start_client_x: 0,
      drag_start_client_y: 0,
      drag_start_scroll_left: 0,
      drag_start_scroll_top: 0,

      // Pinch state
      is_pinch: false,
      pinch_start_distance: 0,
      pinch_start_zoom: 1,

      debounce_interaction: undefined,

      resize_observer: null,
    };
  },
  computed: {
    topleft_x() {
      return this.scroll_left / this.current_zoom;
    },
    topleft_y() {
      return this.scroll_top / this.current_zoom;
    },
    center_x() {
      const raw = (this.scroll_left + this.wrapper_ow / 2) / this.current_zoom;
      const w = this.content_width;
      if (w == null) return raw;
      return Math.min(Math.max(raw, 0), w);
    },
    center_y() {
      const raw = (this.scroll_top + this.wrapper_oh / 2) / this.current_zoom;
      const h = this.content_height;
      if (h == null) return raw;
      return Math.min(Math.max(raw, 0), h);
    },
    viewportStyle() {
      const translate = `translate3d(${-this.scroll_left}px, ${-this
        .scroll_top}px, 0)`;
      const scale = `scale3d(${this.current_zoom}, ${this.current_zoom}, 1)`;
      const transform = `${translate} ${scale}`;
      return {
        width: this.content_width ? `${this.content_width}px` : "100%",
        height: this.content_height ? `${this.content_height}px` : "100%",
        transformOrigin: "0 0",
        transform,
        willChange: "transform",
      };
    },
  },
  watch: {
    zoom(new_zoom) {
      this.setZoom(new_zoom);
    },
  },
  mounted() {
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);

    this.$eventHub.$on(`panzoom.panTo`, this.panTo);

    this.updateWrapperSize();
    const wrapper = this.$refs.wrapper;
    if (wrapper && typeof ResizeObserver !== "undefined") {
      this.resize_observer = new ResizeObserver(() => this.updateWrapperSize());
      this.resize_observer.observe(wrapper);
    }
  },
  beforeDestroy() {
    if (this.resize_observer && this.$refs.wrapper) {
      this.resize_observer.unobserve(this.$refs.wrapper);
      this.resize_observer = null;
    }
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);

    if (this.debounce_interaction) {
      clearTimeout(this.debounce_interaction);
    }

    this.$eventHub.$off(`panzoom.panTo`, this.panTo);
  },
  methods: {
    onMouseDown(event) {
      if (!this.enable_drag_to_pan) return;

      // Ignore drags starting from excluded elements
      if (
        event.target &&
        event.target.closest &&
        event.target.closest(".panzoom-exclude")
      ) {
        return;
      }

      this.is_panning = true;
      this.drag_start_client_x = event.clientX;
      this.drag_start_client_y = event.clientY;
      this.drag_start_scroll_left = this.scroll_left;
      this.drag_start_scroll_top = this.scroll_top;
    },
    onMouseMove(event) {
      if (!this.is_panning) return;

      const dx = event.clientX - this.drag_start_client_x;
      const dy = event.clientY - this.drag_start_client_y;

      // Convert screen-space movement to content-space movement
      this.scroll_left = this.drag_start_scroll_left - dx;
      this.scroll_top = this.drag_start_scroll_top - dy;
      this.clampScroll();
    },
    onMouseUp(event) {
      if (!this.is_panning) return;

      this.is_panning = false;

      // Detect click vs drag (small movement = click)
      const total_dx = event.clientX - this.drag_start_client_x;
      const total_dy = event.clientY - this.drag_start_client_y;
      const distance_sq = total_dx * total_dx + total_dy * total_dy;
      const CLICK_THRESHOLD_SQ = 3 * 3;

      if (distance_sq <= CLICK_THRESHOLD_SQ) {
        this.disableActiveModule();
      }

      this.handleInteractionEnd();
    },
    onWheel(event) {
      // Trackpad pinch-to-zoom: browsers send wheel with ctrlKey
      if (event.ctrlKey) {
        const zoom_delta = -event.deltaY * 0.005;
        const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
        const current_zoom = this.current_zoom || 1;
        const new_zoom = Math.min(
          Math.max(current_zoom * (1 + zoom_delta), min_zoom),
          max_zoom
        );

        // Zoom around the current viewport center (center_x, center_y)
        const center_x = this.center_x;
        const center_y = this.center_y;

        this.current_zoom = new_zoom;
        this.scroll_left = center_x * new_zoom - this.wrapper_ow / 2;
        this.scroll_top = center_y * new_zoom - this.wrapper_oh / 2;
        this.clampScroll();
        this.handleInteractionEnd();
        return;
      }

      // Scroll-to-pan: use wheel deltas to move the viewport
      this.scroll_left += event.deltaX;
      this.scroll_top += event.deltaY;
      this.clampScroll();
      this.handleInteractionEnd();
    },
    onTouchStart(event) {
      const touches = event.touches;

      // Two-finger pinch start
      if (touches.length === 2) {
        this.is_pinch = true;
        this.is_panning = false;

        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        this.pinch_start_distance = Math.hypot(dx, dy) || 1;
        this.pinch_start_zoom = this.current_zoom || 1;
      }
    },
    onTouchMove(event) {
      const touches = event.touches;

      if (!this.is_pinch || touches.length !== 2) return;

      const t1 = touches[0];
      const t2 = touches[1];

      // Current distance between fingers
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const distance = Math.hypot(dx, dy) || 1;

      // Compute new zoom based on pinch scale
      const scale_factor = distance / this.pinch_start_distance;
      const target_zoom = this.pinch_start_zoom * scale_factor;

      const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
      const new_zoom = Math.min(Math.max(target_zoom, min_zoom), max_zoom);

      // Zoom around the current viewport center (center_x, center_y)
      const center_x = this.center_x;
      const center_y = this.center_y;

      this.current_zoom = new_zoom;
      this.scroll_left = center_x * new_zoom - this.wrapper_ow / 2;
      this.scroll_top = center_y * new_zoom - this.wrapper_oh / 2;
      this.clampScroll();

      this.handleInteractionEnd();
    },
    onTouchEnd(event) {
      if (event.touches.length < 2) {
        this.is_pinch = false;
      }
      this.handleInteractionEnd();
    },
    updateWrapperSize() {
      const wrapper = this.$refs.wrapper;
      if (!wrapper) return;
      this.wrapper_ow = wrapper.offsetWidth || 0;
      this.wrapper_oh = wrapper.offsetHeight || 0;
    },
    handleInteractionEnd() {
      if (this.debounce_interaction) clearTimeout(this.debounce_interaction);
      this.debounce_interaction = setTimeout(() => {
        const zoom = this.current_zoom || 1;
        this.$emit("scroll-end", {
          zoom,
          center_x: this.center_x,
          center_y: this.center_y,
          topleft_x: this.topleft_x,
          topleft_y: this.topleft_y,
        });
      }, 200);
    },
    panTo({ x, y }) {
      this.scrollToCorner({ x, y, animate: true });
    },
    scrollToCorner({ x, y, animate }) {
      const zoom = this.current_zoom || this.zoom || 1;
      const margin = this.margin_around_content || 80;

      const offset = margin / zoom;
      const target_left = (x || 0) - offset;
      const target_top = (y || 0) - offset;

      this.scrollTo(target_left, target_top, {
        duration: animate ? 200 : 0,
        absolute: true,
      });
    },
    disableActiveModule() {
      this.$eventHub.$emit("module.setActive", false);
    },
    getScrollBounds() {
      const zoom = this.current_zoom || 1;
      const w = this.content_width;
      const h = this.content_height;
      const margin = this.margin_around_content || 0;

      const max_left = Math.max(0, w * zoom + margin - this.wrapper_ow);
      const max_top = Math.max(0, h * zoom + margin - this.wrapper_oh);

      // Visible viewport size in content coordinates (wrapper size / zoom)
      // Fixed margin in content coords: allow at most this much empty space around content
      return {
        min_left: -margin,
        max_left,
        min_top: -margin,
        max_top,
      };
    },
    clampScroll() {
      const { min_left, max_left, min_top, max_top } = this.getScrollBounds();
      // Use min/max so clamping works when content is smaller than view (reversed bounds)
      const left_lo = Math.min(min_left, max_left);
      const left_hi = Math.max(min_left, max_left);
      const top_lo = Math.min(min_top, max_top);
      const top_hi = Math.max(min_top, max_top);
      this.scroll_left = Math.min(Math.max(this.scroll_left, left_lo), left_hi);
      this.scroll_top = Math.min(Math.max(this.scroll_top, top_lo), top_hi);
    },
    // Public API: getters
    getZoom() {
      return this.current_zoom || 1;
    },
    getScrollLeft() {
      return this.scroll_left || 0;
    },
    getScrollTop() {
      return this.scroll_top || 0;
    },
    // Public API: setters
    scrollTo(x, y, options = {}) {
      const duration = options.duration || 0;

      if (!duration) {
        this.scroll_left = x || 0;
        this.scroll_top = y || 0;
        this.clampScroll();
        this.handleInteractionEnd();
        return;
      }

      const start_left = this.scroll_left;
      const start_top = this.scroll_top;
      let target_left = x || 0;
      let target_top = y || 0;
      const bounds = this.getScrollBounds();
      target_left = Math.min(
        Math.max(target_left, bounds.min_left),
        bounds.max_left
      );
      target_top = Math.min(
        Math.max(target_top, bounds.min_top),
        bounds.max_top
      );
      const start_time = performance.now();

      const animate = (now) => {
        const elapsed = now - start_time;
        const t = Math.min(1, elapsed / duration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        this.scroll_left = start_left + (target_left - start_left) * ease;
        this.scroll_top = start_top + (target_top - start_top) * ease;
        this.clampScroll();

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.handleInteractionEnd();
        }
      };

      requestAnimationFrame(animate);
    },
    setZoom(zoom, options = {}) {
      if (!zoom) return;

      const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
      const clamped = Math.min(Math.max(zoom, min_zoom), max_zoom);

      this.current_zoom = clamped;

      if (options.emit !== false) {
        this.handleInteractionEnd();
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

._panzoomDebug {
  position: fixed;
  right: 8px;
  bottom: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  line-height: 1.4;
  z-index: 9999;
  pointer-events: none;
  max-width: 260px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Helvetica Neue", Arial, sans-serif;
}
</style>
