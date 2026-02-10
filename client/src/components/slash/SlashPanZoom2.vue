<template>
  <div
    ref="wrapper"
    class="viewer"
    :class="{
      'is--drag-to-pan': enable_drag_to_pan && !is_panning,
      'is--panning': enable_drag_to_pan && is_panning,
    }"
    @mousedown="onMouseDown"
    @wheel.prevent="onWheel"
    @touchstart.prevent.stop="onTouchStart"
    @touchmove.prevent.stop="onTouchMove"
    @touchend.prevent.stop="onTouchEnd"
    @touchcancel.prevent.stop="onTouchEnd"
  >
    <div class="_pzViewport" ref="viewport" :style="viewportStyle">
      <slot />
    </div>
    <div class="_panzoomDebug">
      <div>zoom: {{ current_zoom.toFixed(2) }}</div>
      <div>
        scroll: {{ Math.round(scroll_left) }}, {{ Math.round(scroll_top) }}
      </div>
      <div>
        content: {{ content_width || "auto" }} x
        {{ content_height || "auto" }}
      </div>
      <div>
        {{ getScrollBounds() }}
      </div>
    </div>
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
    };
  },
  computed: {
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
  },
  beforeDestroy() {
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
      const scale = this.current_zoom || 1;
      this.scroll_left = this.drag_start_scroll_left - dx / scale;
      this.scroll_top = this.drag_start_scroll_top - dy / scale;
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
        const wrapper = this.$refs.wrapper;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const cursor_x = event.clientX - rect.left;
        const cursor_y = event.clientY - rect.top;

        const zoom_delta = -event.deltaY * 0.005;
        const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
        const current_zoom = this.current_zoom || 1;
        const new_zoom = Math.min(
          Math.max(current_zoom * (1 + zoom_delta), min_zoom),
          max_zoom
        );

        // Keep point under cursor fixed
        const content_x = this.scroll_left + cursor_x / current_zoom;
        const content_y = this.scroll_top + cursor_y / current_zoom;
        this.current_zoom = new_zoom;
        this.scroll_left = content_x - cursor_x / new_zoom;
        this.scroll_top = content_y - cursor_y / new_zoom;
        this.clampScroll();
        this.handleInteractionEnd();
        return;
      }

      // Scroll-to-pan: use wheel deltas to move the viewport
      const scale = this.current_zoom || 1;
      this.scroll_left += event.deltaX / scale;
      this.scroll_top += event.deltaY / scale;
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

      // Center point between touches in wrapper coordinates
      const wrapper_rect = this.$refs.wrapper
        ? this.$refs.wrapper.getBoundingClientRect()
        : { left: 0, top: 0 };
      const center_client_x = (t1.clientX + t2.clientX) / 2 - wrapper_rect.left;
      const center_client_y = (t1.clientY + t2.clientY) / 2 - wrapper_rect.top;

      // Compute new zoom based on pinch scale
      const scale_factor = distance / this.pinch_start_distance;
      const target_zoom = this.pinch_start_zoom * scale_factor;

      const [min_zoom, max_zoom] = this.zoom_range || [0.01, 1];
      const new_zoom = Math.min(Math.max(target_zoom, min_zoom), max_zoom);

      const current_zoom = this.current_zoom || 1;

      // Content coordinates of the point under the pinch center before zoom
      const content_center_x =
        this.scroll_left + center_client_x / current_zoom;
      const content_center_y = this.scroll_top + center_client_y / current_zoom;

      // Adjust scroll so the same content point stays under the pinch center
      this.current_zoom = new_zoom;
      this.scroll_left = content_center_x - center_client_x / new_zoom;
      this.scroll_top = content_center_y - center_client_y / new_zoom;
      this.clampScroll();

      this.handleInteractionEnd();
    },
    onTouchEnd(event) {
      if (event.touches.length < 2) {
        this.is_pinch = false;
      }
      this.handleInteractionEnd();
    },
    handleInteractionEnd() {
      if (this.debounce_interaction) clearTimeout(this.debounce_interaction);
      this.debounce_interaction = setTimeout(() => {
        const wrapper = this.$refs.wrapper;
        if (!wrapper) return;

        const wrapper_width = wrapper.offsetWidth || 0;
        const wrapper_height = wrapper.offsetHeight || 0;
        const zoom = this.current_zoom || 1;

        const x = this.scroll_left + wrapper_width / (2 * zoom);
        const y = this.scroll_top + wrapper_height / (2 * zoom);

        this.$emit("scroll-end", { zoom, x, y });
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
      const wrapper = this.$refs.wrapper;
      const zoom = this.current_zoom || 1;
      const w = this.content_width;
      const h = this.content_height;
      const margin = this.margin_around_content || 0;

      let wrapper_width = 0;
      let wrapper_height = 0;
      if (wrapper) {
        debugger;
        wrapper_width = wrapper.offsetWidth;
        wrapper_height = wrapper.offsetHeight;
      }

      // Visible viewport size in content coordinates (wrapper size / zoom)
      // Fixed margin in content coords: allow at most this much empty space around content
      return {
        min_left: -margin,
        max_left: w + margin - wrapper_width,
        min_top: -margin,
        max_top: h + margin - wrapper_height,
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
