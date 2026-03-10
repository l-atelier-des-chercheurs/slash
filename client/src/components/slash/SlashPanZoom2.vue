<template>
  <div
    ref="wrapper"
    class="viewer"
    :class="{
      'is--drag-to-pan': touch_mode === 'pan-zoom' && !is_panning,
      'is--panning': touch_mode === 'pan-zoom' && is_panning,
      'is--zooming': is_zooming,
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
    touch_mode: {
      type: String,
      default: "pan-zoom",
      validator: (value) => ["pan-zoom", "select"].includes(value),
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

      // Cmd-drag zoom state
      is_zooming: false,
      zoom_drag_start_client_y: 0,
      zoom_drag_start_zoom: 1,
      zoom_drag_anchor_content_x: 0,
      zoom_drag_anchor_content_y: 0,
      zoom_drag_anchor_offset_x: 0,
      zoom_drag_anchor_offset_y: 0,

      // Pinch state
      is_pinch: false,
      pinch_start_distance: 0,
      pinch_start_zoom: 1,

      debounce_interaction: undefined,

      resize_observer: null,
      viewport_throttle_ms: 500,
      viewport_last_emit: 0,
      viewport_throttle_timer: null,
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
      const scale = `scale(${this.current_zoom})`;
      const transform = `${translate} ${scale}`;
      return {
        width: this.content_width ? `${this.content_width}px` : "100%",
        height: this.content_height ? `${this.content_height}px` : "100%",
        transform,
      };
    },
    overlayStyle() {
      return {
        width: this.content_width ? `${this.content_width}px` : "100%",
        height: this.content_height ? `${this.content_height}px` : "100%",
      };
    },
    viewport_pct() {
      return this.getViewportPct();
    },
  },
  watch: {
    zoom(new_zoom) {
      this.setZoom(new_zoom);
    },
    viewport_pct: {
      handler() {
        this.scheduleViewportChange();
      },
      deep: true,
      immediate: true,
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
    if (this.viewport_throttle_timer != null) {
      clearTimeout(this.viewport_throttle_timer);
      this.viewport_throttle_timer = null;
    }
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
    getContentPointFromClient(client_x, client_y) {
      const wrapper = this.$refs.wrapper;
      const zoom = this.current_zoom || 1;
      if (!wrapper || !zoom) {
        return {
          content_x: 0,
          content_y: 0,
          offset_x: 0,
          offset_y: 0,
        };
      }

      const rect = wrapper.getBoundingClientRect();
      const offset_x = client_x - rect.left;
      const offset_y = client_y - rect.top;
      const content_x = (this.scroll_left + offset_x) / zoom;
      const content_y = (this.scroll_top + offset_y) / zoom;

      return { content_x, content_y, offset_x, offset_y };
    },
    onMouseDown(event) {
      if (event.button !== 0) return;

      // Cmd-drag should zoom instead of panning
      if (event.metaKey) {
        event.preventDefault();

        const { content_x, content_y, offset_x, offset_y } =
          this.getContentPointFromClient(event.clientX, event.clientY);

        this.is_zooming = true;
        this.is_panning = false;
        this.zoom_drag_start_client_y = event.clientY;
        this.zoom_drag_start_zoom = this.current_zoom || 1;
        this.zoom_drag_anchor_content_x = content_x;
        this.zoom_drag_anchor_content_y = content_y;
        this.zoom_drag_anchor_offset_x = offset_x;
        this.zoom_drag_anchor_offset_y = offset_y;
        return;
      }

      // Ignore drags starting from excluded elements
      if (
        event.target &&
        event.target.closest &&
        event.target.closest(".panzoom-exclude")
      ) {
        return;
      }

      if (this.touch_mode !== "pan-zoom") return;

      event.preventDefault();
      this.is_panning = true;
      this.drag_start_client_x = event.clientX;
      this.drag_start_client_y = event.clientY;
      this.drag_start_scroll_left = this.scroll_left;
      this.drag_start_scroll_top = this.scroll_top;
    },
    onMouseMove(event) {
      if (this.is_zooming) {
        const dy = event.clientY - this.zoom_drag_start_client_y;
        const start_zoom = this.zoom_drag_start_zoom || 1;

        // Smooth exponential zoom: drag up to zoom in, down to zoom out
        const sensitivity = 0.006;
        const target_zoom = start_zoom * Math.exp(-dy * sensitivity);

        const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
        const new_zoom = Math.min(Math.max(target_zoom, min_zoom), max_zoom);

        this.current_zoom = new_zoom;
        this.scroll_left =
          this.zoom_drag_anchor_content_x * new_zoom -
          this.zoom_drag_anchor_offset_x;
        this.scroll_top =
          this.zoom_drag_anchor_content_y * new_zoom -
          this.zoom_drag_anchor_offset_y;
        this.clampScroll();
        return;
      }

      if (!this.is_panning) return;

      const dx = event.clientX - this.drag_start_client_x;
      const dy = event.clientY - this.drag_start_client_y;

      // Convert screen-space movement to content-space movement
      this.scroll_left = this.drag_start_scroll_left - dx;
      this.scroll_top = this.drag_start_scroll_top - dy;
      this.clampScroll();
    },
    onMouseUp(event) {
      if (this.is_zooming) {
        this.is_zooming = false;
        this.handleInteractionEnd();
        return;
      }

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
      // Cmd + wheel = zoom (instead of wheel-pan)
      if (event.metaKey) {
        const zoom_delta = -event.deltaY * 0.005;
        const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
        const current_zoom = this.current_zoom || 1;
        const new_zoom = Math.min(
          Math.max(current_zoom * (1 + zoom_delta), min_zoom),
          max_zoom
        );

        // Zoom around cursor position
        const { content_x, content_y, offset_x, offset_y } =
          this.getContentPointFromClient(event.clientX, event.clientY);

        this.current_zoom = new_zoom;
        this.scroll_left = content_x * new_zoom - offset_x;
        this.scroll_top = content_y * new_zoom - offset_y;
        this.clampScroll();
        this.handleInteractionEnd();
        return;
      }

      // Trackpad pinch-to-zoom: browsers send wheel with ctrlKey
      if (event.ctrlKey) {
        const zoom_delta = -event.deltaY * 0.005;
        const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
        const current_zoom = this.current_zoom || 1;
        const new_zoom = Math.min(
          Math.max(current_zoom * (1 + zoom_delta), min_zoom),
          max_zoom
        );

        // Zoom around cursor position (matches Cmd + wheel behavior)
        const { content_x, content_y, offset_x, offset_y } =
          this.getContentPointFromClient(event.clientX, event.clientY);

        this.current_zoom = new_zoom;
        this.scroll_left = content_x * new_zoom - offset_x;
        this.scroll_top = content_y * new_zoom - offset_y;
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
        return;
      }

      // One-finger drag should pan when hand mode is active
      if (touches.length !== 1 || this.touch_mode !== "pan-zoom") return;

      const touch = touches[0];
      const target = touch.target;

      if (target && target.closest && target.closest(".panzoom-exclude")) {
        return;
      }

      this.is_pinch = false;
      this.is_panning = true;
      this.drag_start_client_x = touch.clientX;
      this.drag_start_client_y = touch.clientY;
      this.drag_start_scroll_left = this.scroll_left;
      this.drag_start_scroll_top = this.scroll_top;
    },
    onTouchMove(event) {
      const touches = event.touches;

      if (this.is_pinch && touches.length === 2) {
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

        // Zoom around pinch midpoint (touch "mouse position")
        const mid_x = (t1.clientX + t2.clientX) / 2;
        const mid_y = (t1.clientY + t2.clientY) / 2;
        const { content_x, content_y, offset_x, offset_y } =
          this.getContentPointFromClient(mid_x, mid_y);

        this.current_zoom = new_zoom;
        this.scroll_left = content_x * new_zoom - offset_x;
        this.scroll_top = content_y * new_zoom - offset_y;
        this.clampScroll();

        this.handleInteractionEnd();
        return;
      }

      if (!this.is_panning || touches.length !== 1) return;

      const touch = touches[0];
      const dx = touch.clientX - this.drag_start_client_x;
      const dy = touch.clientY - this.drag_start_client_y;

      this.scroll_left = this.drag_start_scroll_left - dx;
      this.scroll_top = this.drag_start_scroll_top - dy;
      this.clampScroll();
    },
    onTouchEnd(event) {
      if (event.touches.length < 2) {
        this.is_pinch = false;
      }
      if (event.touches.length === 0) {
        this.is_panning = false;
      }
      this.handleInteractionEnd();
    },
    updateWrapperSize() {
      const wrapper = this.$refs.wrapper;
      if (!wrapper) return;
      this.wrapper_ow = wrapper.offsetWidth || 0;
      this.wrapper_oh = wrapper.offsetHeight || 0;
    },
    getViewportPct() {
      const zoom = this.current_zoom || 1;
      const cw = this.content_width;
      const ch = this.content_height;
      if (cw == null || ch == null || cw <= 0 || ch <= 0) {
        return {
          left_pct: 0,
          top_pct: 0,
          width_pct: 100,
          height_pct: 100,
        };
      }
      const viewport_w = this.wrapper_ow / zoom;
      const viewport_h = this.wrapper_oh / zoom;
      return {
        left_pct: (this.topleft_x / cw) * 100,
        top_pct: (this.topleft_y / ch) * 100,
        width_pct: (viewport_w / cw) * 100,
        height_pct: (viewport_h / ch) * 100,
      };
    },
    scheduleViewportChange() {
      const now = Date.now();
      const elapsed = now - this.viewport_last_emit;
      if (elapsed >= this.viewport_throttle_ms) {
        this.viewport_last_emit = now;
        this.emitViewportChange();
      } else if (!this.viewport_throttle_timer) {
        this.viewport_throttle_timer = setTimeout(() => {
          this.viewport_throttle_timer = null;
          this.viewport_last_emit = Date.now();
          this.emitViewportChange();
        }, this.viewport_throttle_ms - elapsed);
      }
    },
    emitViewportChange() {
      this.$emit("viewport-change", this.getViewportPct());
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

      // Zoom around viewport center, like pinch
      const center_x = this.center_x;
      const center_y = this.center_y;

      this.current_zoom = clamped;
      this.scroll_left = center_x * clamped - this.wrapper_ow / 2;
      this.scroll_top = center_y * clamped - this.wrapper_oh / 2;
      this.clampScroll();

      if (options.emit !== false) {
        this.handleInteractionEnd();
      }
    },
    zoomAndCenterTo(content_x, content_y, zoom, options = {}) {
      if (!zoom) return;

      const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
      const clamped = Math.min(Math.max(zoom, min_zoom), max_zoom);

      this.$refs.viewport.style.transition =
        "all 1.5s cubic-bezier(0.19, 1, 0.22, 1)";
      // this.$refs.viewport.addEventListener(
      //   "transitionend",
      //   () => {
      //     this.$refs.viewport.style.transition = "none";
      //   },
      //   { once: true }
      // );

      this.current_zoom = clamped;
      this.scroll_left = (content_x || 0) * clamped - this.wrapper_ow / 2;
      this.scroll_top = (content_y || 0) * clamped - this.wrapper_oh / 2;
      this.clampScroll();

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
  &.is--zooming {
    cursor: ns-resize;
  }
}

._pzViewport {
  position: relative;
  transform-origin: 0 0;
  will-change: transform;
}

._panZoomOverlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  z-index: 1;
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
