<template>
  <div class="_largeCanvas" :data-mode="current_mode" draggable="false">
    <ViewEmptyMessage
      v-if="!files.length"
      cta_key="slash_import_medias_cta_canvas"
    />
    <SlashPanZoom2
      ref="viewer"
      :zoom="zoom"
      :initial_topleft_x="initial_topleft_x"
      :initial_topleft_y="initial_topleft_y"
      :zoom_range="zoom_range"
      :content_width="canvas_width"
      :content_height="canvas_height"
      :touch_mode="current_mode === 'pan-zoom' ? 'pan-zoom' : 'select'"
      :margin_around_content="margin_around_content"
      @scroll-end="updateScrollAndZoom"
      @viewport-change="handleViewportChange"
    >
      <div
        class="_canvasContent"
        :data-mode="current_mode"
        draggable="false"
        :style="{
          width: `${canvas_width}px`,
          height: `${canvas_height}px`,
          backgroundImage: zoom > 0.25 ? undefined : 'none',
        }"
        @mousedown.self="startLasso"
        @touchstart.self.passive="startLasso"
        @click.self="handleCanvasClick"
      >
        <div
          v-if="show_expand_preview_right"
          class="_canvasExpandPreview _canvasExpandPreview_right"
          :style="{ left: `${expand_preview_right}px` }"
        ></div>
        <div
          v-if="show_expand_preview_bottom"
          class="_canvasExpandPreview _canvasExpandPreview_bottom"
          :style="{ top: `${expand_preview_bottom}px` }"
        ></div>
        <CanvasItemInteractive
          v-for="file in files"
          :key="file.$path"
          :file="file"
          class="_canvasItem"
          :data-file-path="file.$path"
          :canvas_topleft_x="canvas_topleft_x"
          :canvas_topleft_y="canvas_topleft_y"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :canvas_zoom="zoom"
          :mode="current_mode"
          :is_selected="currently_selected_files.includes(file.$path)"
          :in_viewport="visible_file_paths.has(file.$path)"
          :show_media_list_sidebar="show_media_list_sidebar"
          :media_list_paths="media_list_paths"
          @width-update="handleWidthUpdate"
          @select="handleSelect"
        />
        <CanvasDrawOverlay
          v-if="current_mode === 'draw'"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :folder_path="folder_path"
          :getCanvasCoords="getCanvasCoordinatesFromEvent"
          :draw_stroke_width="draw_stroke_width"
        />
        <transition name="fade">
          <QuickAddToCanvas
            ref="quickAdd"
            v-if="show_drop_menu"
            :additional_meta="additional_meta"
            :folder_path="folder_path"
            @close="show_drop_menu = false"
          />
        </transition>
        <div
          v-if="lasso_rect"
          class="_lassoRect"
          :style="{
            left: lasso_rect.x + 'px',
            top: lasso_rect.y + 'px',
            width: lasso_rect.width + 'px',
            height: lasso_rect.height + 'px',
          }"
        />
      </div>
      <!-- <div
        class="_currentCenterDot"
        :style="{
          left: canvas_topleft_x + 'px',
          top: canvas_topleft_y + 'px',
        }"
      ></div> -->
    </SlashPanZoom2>
    <MiniMap
      v-if="!$root.is_mobile_view"
      :files="files"
      :canvas_width="canvas_width"
      :canvas_height="canvas_height"
      :zoom="zoom"
      :selected_files="currently_selected_files"
    />
    <LeftToolbar
      :current_mode.sync="current_mode"
      :draw_stroke_width.sync="draw_stroke_width"
    />
    <FpsCounter v-if="show_fps_counter" />
  </div>
</template>
<script>
import SlashPanZoom2 from "@/components/slash/SlashPanZoom2.vue";
import CanvasItemInteractive from "@/components/slash/CanvasItemInteractive.vue";
import { getPointsBounds } from "@/utils/shapeUtils.js";
import {
  QUICK_NOTE_HEIGHT,
  measureQuickNoteWidth,
} from "@/utils/quickNoteUtils.js";
import {
  getTextCanvasDimensions,
  getTextCanvasDisplayHeight,
} from "@/utils/textCanvasUtils.js";
import CanvasDrawOverlay from "@/components/slash/CanvasDrawOverlay.vue";
import LeftToolbar from "@/components/slash/LeftToolbar.vue";
import QuickAddToCanvas from "@/components/slash/QuickAddToCanvas.vue";
import MiniMap from "@/components/slash/MiniMap.vue";
import FpsCounter from "@/components/slash/FpsCounter.vue";
import ViewEmptyMessage from "@/components/slash/ViewEmptyMessage.vue";

export default {
  props: {
    files: {
      type: Array,
      required: true,
    },
    all_files: {
      type: Array,
      default: null,
    },
    zoom: {
      type: Number,
      default: 1,
    },
    zoom_range: Array,
    folder_path: String,
    show_media_list_sidebar: {
      type: Boolean,
      default: false,
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
    selected_files: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    SlashPanZoom2,
    CanvasItemInteractive,
    CanvasDrawOverlay,
    LeftToolbar,
    QuickAddToCanvas,
    MiniMap,
    FpsCounter,
    ViewEmptyMessage,
  },
  data() {
    return {
      canvas_topleft_x: 0,
      canvas_topleft_y: 0,
      initial_topleft_x: 0,
      initial_topleft_y: 0,

      canvas_clicked_x: null,
      canvas_clicked_y: null,

      current_mode: "pan-zoom",

      min_canvas_width: 1600,
      min_canvas_height: 1600,
      max_canvas_width: 10000,
      max_canvas_height: 10000,
      margin_around_content: 800,

      lastLogTime: 0,
      saveStateTimeout: null,

      show_add_menu: false,
      show_drop_menu: false,

      viewport_props_throttled: {
        left_pct: 0,
        top_pct: 0,
        width_pct: 0,
        height_pct: 0,
      },
      viewport_throttle_timer: null,
      viewport_throttle_last: 0,

      lasso_start: null,
      lasso_end: null,
      lasso_active: false,
      lasso_dragged: false,
      draw_stroke_width: 5,
      restored_view_state: null,
    };
  },
  computed: {
    bounds_files() {
      return this.all_files || this.files;
    },
    content_bounds() {
      let right_edge = 0;
      let bottom_edge = 0;
      if (!this.bounds_files || this.bounds_files.length === 0) {
        return { right_edge, bottom_edge };
      }
      this.bounds_files.forEach((file) => {
        const { width, height } = this.getFileDimensions(file);
        const x = file.x || 0;
        const y = file.y || 0;
        right_edge = Math.max(right_edge, x + width);
        bottom_edge = Math.max(bottom_edge, y + height);
      });
      return { right_edge, bottom_edge };
    },
    canvas_width() {
      if (!this.bounds_files || this.bounds_files.length === 0) {
        return this.min_canvas_width;
      }
      const right_edge = this.content_bounds.right_edge;
      const cw = Math.round(right_edge + this.margin_around_content);

      return Math.min(
        Math.max(this.min_canvas_width, cw),
        this.max_canvas_width
      );
    },
    canvas_height() {
      if (!this.bounds_files || this.bounds_files.length === 0) {
        return this.min_canvas_height;
      }
      const bottom_edge = this.content_bounds.bottom_edge;
      const ch = Math.round(bottom_edge + this.margin_around_content);
      return Math.min(
        Math.max(this.min_canvas_height, ch),
        this.max_canvas_height
      );
    },
    additional_meta() {
      // Allow 0 coordinates (top/left edge clicks).
      if (this.canvas_clicked_x == null || this.canvas_clicked_y == null)
        return null;

      const base_width = 640;

      return {
        x: this.canvas_clicked_x,
        y: this.canvas_clicked_y,
        width: base_width,
      };
    },
    visible_file_paths() {
      const p = this.viewport_props_throttled;
      const cw = this.canvas_width;
      const ch = this.canvas_height;
      if (!cw || !ch || !this.files?.length) return new Set();

      const width_pct = p.width_pct || 0;
      const height_pct = p.height_pct || 0;
      // Before viewport is computed, show all items
      if (width_pct <= 0 || height_pct <= 0) {
        return new Set(this.files.map((f) => f.$path));
      }

      // Viewport bounds in content coordinates (with buffer to avoid flicker)
      const buffer_pct = 0.5; // 50% of viewport size on each side
      const v_left =
        ((p.left_pct || 0) / 100) * cw - (width_pct / 100) * cw * buffer_pct;
      const v_top =
        ((p.top_pct || 0) / 100) * ch - (height_pct / 100) * ch * buffer_pct;
      const v_right =
        ((p.left_pct || 0) / 100) * cw +
        (width_pct / 100) * cw * (1 + buffer_pct);
      const v_bottom =
        ((p.top_pct || 0) / 100) * ch +
        (height_pct / 100) * ch * (1 + buffer_pct);

      const visible = new Set();
      for (const file of this.files) {
        const { width, height } = this.getFileDimensions(file);
        const x = file.x || 0;
        const y = file.y || 0;
        const item_right = x + width;
        const item_bottom = y + height;
        if (
          item_right >= v_left &&
          x <= v_right &&
          item_bottom >= v_top &&
          y <= v_bottom
        ) {
          visible.add(file.$path);
        }
      }
      return visible;
    },
    currently_selected_files() {
      return this.selected_files && this.current_mode === "select"
        ? this.selected_files
        : [];
    },
    show_fps_counter() {
      return this.$root.app_infos?.debug_mode === true;
    },
    expand_preview_right() {
      return Math.max(0, this.canvas_width - this.margin_around_content);
    },
    expand_preview_bottom() {
      return Math.max(0, this.canvas_height - this.margin_around_content);
    },
    show_expand_preview_right() {
      return (
        this.bounds_files?.length > 0 &&
        this.canvas_width < this.max_canvas_width
      );
    },
    show_expand_preview_bottom() {
      return (
        this.bounds_files?.length > 0 &&
        this.canvas_height < this.max_canvas_height
      );
    },
    lasso_rect() {
      if (!this.lasso_active || !this.lasso_start || !this.lasso_end)
        return null;
      const x = Math.min(this.lasso_start.x, this.lasso_end.x);
      const y = Math.min(this.lasso_start.y, this.lasso_end.y);
      return {
        x,
        y,
        width: Math.abs(this.lasso_end.x - this.lasso_start.x),
        height: Math.abs(this.lasso_end.y - this.lasso_start.y),
      };
    },
  },
  created() {
    this.restoreStateFromLocalStorage();
  },
  mounted() {
    this.$emit("update:interaction_mode", this.current_mode);
    this.$eventHub.$on("canvas.dragEnd", this.handleDragEnd);
    window.addEventListener("keydown", this.handleGlobalKeydown);
    this.$nextTick(() => {
      this.applyRestoredViewport();
    });
  },
  beforeDestroy() {
    this.$eventHub.$off("canvas.dragEnd", this.handleDragEnd);
    window.removeEventListener("keydown", this.handleGlobalKeydown);
    window.removeEventListener("mousemove", this.updateLasso);
    window.removeEventListener("mouseup", this.endLasso);
    window.removeEventListener("touchmove", this.updateLassoTouch);
    window.removeEventListener("touchend", this.endLassoTouch);
    window.removeEventListener("touchcancel", this.endLassoTouch);
    if (this.saveStateTimeout) clearTimeout(this.saveStateTimeout);
    if (this.viewport_throttle_timer)
      clearTimeout(this.viewport_throttle_timer);
  },
  watch: {
    current_mode(new_mode) {
      if (new_mode !== "select") {
        this.show_drop_menu = false;
      }
      this.$emit("update:interaction_mode", new_mode);
      this.saveStateToLocalStorage();
    },
    draw_stroke_width() {
      this.saveStateToLocalStorage();
    },
  },
  methods: {
    handleGlobalKeydown(event) {
      const target = event.target;
      const is_input =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        (target.isContentEditable &&
          target.getAttribute("contenteditable") === "true");
      if (is_input) return;

      if (this.current_mode !== "select") return;

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        if (this.selected_files.length > 0) this.$emit("remove-selected");
      } else if (event.key === " ") {
        event.preventDefault();
        if (this.current_mode !== "pan-zoom") {
          this.previous_mode = this.current_mode;
          this.current_mode = "pan-zoom";
        }
        const restoreMode = (e) => {
          if (e.key === " ") {
            if (this.previous_mode && this.current_mode === "pan-zoom") {
              this.current_mode = this.previous_mode;
              this.previous_mode = null;
            }
            window.removeEventListener("keyup", restoreMode);
          }
        };
        window.addEventListener("keyup", restoreMode);
      }
    },
    async setSelectedShapesStrokeWidth(width) {
      if (!Number.isFinite(width)) {
        return;
      }
      const selected = new Set(this.currently_selected_files);
      const selected_shape_files = this.files.filter(
        (file) => file.$type === "canvas_shape" && selected.has(file.$path)
      );
      if (selected_shape_files.length === 0) return;

      this.draw_stroke_width = width;
      for (const file of selected_shape_files) {
        this.$set(file, "shape_stroke_width", width);
        try {
          await this.$api.updateMeta({
            path: file.$path,
            new_meta: { shape_stroke_width: width },
          });
        } catch (err) {
          console.error("Failed to save shape stroke width:", err);
        }
      }
    },
    updateSelectedFiles(next_paths) {
      this.$emit("update:selected_files", next_paths);
    },
    handleCanvasClick(event) {
      if (this.current_mode !== "select") return;

      // A lasso drag just ended — don't open the drop menu
      if (this.lasso_dragged) {
        this.lasso_dragged = false;
        return;
      }

      if (event.metaKey || event.shiftKey) {
        return;
      } else if (this.selected_files.length > 0) {
        this.updateSelectedFiles([]);
        return;
      }

      // if (this.canvas_clicked_x !== null && this.canvas_clicked_y !== null) {
      //   this.canvas_clicked_x = null;
      //   this.canvas_clicked_y = null;
      //   this.show_drop_menu = false;
      //   return;
      // } else {
      const coords = this.getCanvasCoordinatesFromEvent(event);
      if (!coords) return;
      this.canvas_clicked_x = coords.x;
      this.canvas_clicked_y = coords.y;
      this.show_drop_menu = true;

      // Panel stays at click coords; pan/zoom so its center sits in the viewer viewport.
      this.$nextTick(() => {
        this.$nextTick(() => {
          requestAnimationFrame(() => {
            this.centerQuickAddInViewport();
          });
        });
      });

      return;
      // }
    },
    centerQuickAddInViewport() {
      if (!this.show_drop_menu) return;
      const viewer = this.$refs.viewer;
      const quick = this.$refs.quickAdd;
      if (!viewer || typeof viewer.zoomAndCenterTo !== "function") return;

      const x = this.canvas_clicked_x;
      const y = this.canvas_clicked_y;
      if (x == null || y == null) return;

      let w = 320;
      let h = 140;
      if (quick && quick.$el) {
        w = quick.$el.offsetWidth || w;
        h = quick.$el.offsetHeight || h;
      }

      const center_x = x + w / 2;
      const center_y = y + h / 2;

      const is_mobile = this.$root.is_mobile_view;
      const zoom = is_mobile ? 0.8 : 1;
      const zoom_options = {};

      if (is_mobile && viewer.wrapper_oh > 0) {
        // Place the field higher so the on-screen keyboard does not cover it.
        zoom_options.viewport_anchor_y = viewer.wrapper_oh * 0.28;
      }

      viewer.zoomAndCenterTo(center_x, center_y, zoom, zoom_options);

      this.$nextTick(() => {
        if (quick && typeof quick.focusInputField === "function") {
          quick.focusInputField();
        }
      });
    },
    handleSelect(file_path, mode) {
      this.show_drop_menu = false;
      if (mode === "append") {
        if (this.selected_files.includes(file_path)) return;
        this.updateSelectedFiles([...this.selected_files, file_path]);
      } else {
        this.updateSelectedFiles([file_path]);
      }
    },
    startLasso(event) {
      if (this.current_mode !== "select") return;
      const coords = this.getCanvasCoordinatesFromEvent(event);
      if (!coords) return;
      this.lasso_start = coords;
      this.lasso_end = coords;
      this.lasso_active = false;
      this.lasso_dragged = false;
      if (event.type === "touchstart") {
        window.addEventListener("touchmove", this.updateLassoTouch, {
          passive: false,
        });
        window.addEventListener("touchend", this.endLassoTouch);
        window.addEventListener("touchcancel", this.endLassoTouch);
      } else {
        window.addEventListener("mousemove", this.updateLasso);
        window.addEventListener("mouseup", this.endLasso);
      }
    },
    updateLassoTouch(event) {
      if (this.lasso_start && event.cancelable) {
        event.preventDefault();
      }
      this.updateLasso(event);
    },
    endLassoTouch(event) {
      this.updateLasso(event);
      this.endLasso();
    },
    updateLasso(event) {
      if (!this.lasso_start) return;
      const coords = this.getCanvasCoordinatesFromEvent(event);
      if (!coords) return;
      const threshold = 5 / (this.zoom || 1);
      const dx = coords.x - this.lasso_start.x;
      const dy = coords.y - this.lasso_start.y;
      if (!this.lasso_active && Math.hypot(dx, dy) > threshold) {
        this.lasso_active = true;
        this.lasso_dragged = true;
        this.show_drop_menu = false;
      }
      if (this.lasso_active) {
        this.lasso_end = coords;
        this.applyLassoSelection();
      }
    },
    applyLassoSelection() {
      const rect = this.lasso_rect;
      if (!rect) return;
      const selected = [];
      for (const file of this.files) {
        const { width, height } = this.getFileDimensions(file);
        const x = file.x || 0;
        const y = file.y || 0;
        if (
          x < rect.x + rect.width &&
          x + width > rect.x &&
          y < rect.y + rect.height &&
          y + height > rect.y
        ) {
          selected.push(file.$path);
        }
      }
      this.updateSelectedFiles(selected);
    },
    endLasso() {
      window.removeEventListener("mousemove", this.updateLasso);
      window.removeEventListener("mouseup", this.endLasso);
      window.removeEventListener("touchmove", this.updateLassoTouch);
      window.removeEventListener("touchend", this.endLassoTouch);
      window.removeEventListener("touchcancel", this.endLassoTouch);
      this.lasso_active = false;
      this.lasso_start = null;
      this.lasso_end = null;
    },
    handleViewportChange(pct) {
      this.$eventHub.$emit("canvas.viewportChange", pct);
      this._latest_viewport_pct = pct;
      const now = Date.now();
      const elapsed = now - this.viewport_throttle_last;
      if (elapsed >= 500) {
        this.viewport_throttle_last = now;
        this.viewport_props_throttled = { ...pct };
      } else if (!this.viewport_throttle_timer) {
        this.viewport_throttle_timer = setTimeout(() => {
          this.viewport_throttle_timer = null;
          this.viewport_throttle_last = Date.now();
          this.viewport_props_throttled = { ...this._latest_viewport_pct };
        }, 500 - elapsed);
      }
    },
    updateScrollAndZoom({
      center_x,
      center_y,
      topleft_x,
      topleft_y,
      zoom,
    } = {}) {
      this.canvas_topleft_x = topleft_x;
      this.canvas_topleft_y = topleft_y;
      this.$emit("update:zoom", zoom);
      this.$emit("update:scroll", { topleft_x, topleft_y, center_x, center_y });
      this.saveStateToLocalStorage();
    },
    async handleDragEnd({ file: dragged_file, x, y, delta_x, delta_y }) {
      // Commit the dragged file's final position into reactive state
      this.$set(dragged_file, "x", x);
      this.$set(dragged_file, "y", y);

      // For multi-select: commit all other selected files' positions at once
      if (
        this.selected_files.length > 1 &&
        this.selected_files.includes(dragged_file.$path)
      ) {
        for (const path of this.selected_files) {
          if (path === dragged_file.$path) continue;
          const f = this.files.find((file) => file.$path === path);
          if (!f) continue;
          const new_x = Math.max(0, (f.x || 0) + delta_x);
          const new_y = Math.max(0, (f.y || 0) + delta_y);
          this.$set(f, "x", new_x);
          this.$set(f, "y", new_y);
          try {
            await this.$api.updateMeta({
              path: f.$path,
              new_meta: { x: new_x, y: new_y },
            });
          } catch (err) {
            console.error("Failed to save canvas position:", err);
          }
        }
      }
    },
    handleWidthUpdate({ file, width, height }) {
      if (width != null) {
        this.$set(file, "width", width);
      }
      if (height != null) {
        this.$set(file, "height", height);
      }
    },
    getFileDimensions(file) {
      let width = file.width || 160;
      const ratio = file.$infos && file.$infos.ratio;
      let height;
      if (file.$type === "canvas_text") {
        width = measureQuickNoteWidth(file.text);
        height = QUICK_NOTE_HEIGHT;
      } else if (file.$type === "text") {
        ({ width } = getTextCanvasDimensions(file.$content, width));
        height = getTextCanvasDisplayHeight(
          file.$content,
          width,
          file.height
        );
      } else if (ratio !== undefined) {
        height = width * ratio;
      } else if (file.$type === "canvas_shape") {
        if (file.height != null && file.width) {
          height = file.height;
        } else if (file.shape_points?.length >= 2) {
          const bounds = getPointsBounds(file.shape_points);
          height = width * (bounds.height / bounds.width);
        } else {
          height = 100;
        }
      } else {
        // PDF and embed have fixed aspect ratio in UI (e.g. 16/9); use default when no ratio
        const default_ratio = 9 / 16; // height/width for 16:9
        height = width * default_ratio;
      }
      return { width, height };
    },
    getStorageKey() {
      const path = this.$route ? this.$route.path : window.location.pathname;
      return `slash_canvas_state_${path}`;
    },
    saveStateToLocalStorage() {
      if (this.saveStateTimeout) clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = setTimeout(() => {
        const viewer = this.$refs.viewer;
        let zoom = this.zoom;
        let topleft_x = this.canvas_topleft_x;
        let topleft_y = this.canvas_topleft_y;

        if (viewer && typeof viewer.getZoom === "function") {
          const live_zoom = viewer.getZoom();
          const live_scroll_left =
            typeof viewer.getScrollLeft === "function"
              ? viewer.getScrollLeft()
              : null;
          const live_scroll_top =
            typeof viewer.getScrollTop === "function"
              ? viewer.getScrollTop()
              : null;

          if (Number.isFinite(live_zoom) && live_zoom > 0) {
            zoom = live_zoom;
            if (Number.isFinite(live_scroll_left)) {
              topleft_x = live_scroll_left / live_zoom;
            }
            if (Number.isFinite(live_scroll_top)) {
              topleft_y = live_scroll_top / live_zoom;
            }
          }
        }

        const state = {
          topleft_x,
          topleft_y,
          zoom,
          current_mode: this.current_mode,
          draw_stroke_width: this.draw_stroke_width,
        };
        localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
      }, 500);
    },
    restoreStateFromLocalStorage() {
      try {
        const storedState = localStorage.getItem(this.getStorageKey());
        if (storedState) {
          const state = JSON.parse(storedState);
          if (typeof state.zoom === "number" && Number.isFinite(state.zoom)) {
            this.$emit("update:zoom", state.zoom);
          }
          if (
            typeof state.current_mode === "string" &&
            ["pan-zoom", "draw", "select"].includes(state.current_mode)
          ) {
            this.current_mode = state.current_mode;
          }
          if (
            typeof state.draw_stroke_width === "number" &&
            Number.isFinite(state.draw_stroke_width)
          ) {
            this.draw_stroke_width = state.draw_stroke_width;
          }
          if (
            typeof state.topleft_x === "number" &&
            Number.isFinite(state.topleft_x) &&
            typeof state.topleft_y === "number" &&
            Number.isFinite(state.topleft_y)
          ) {
            this.restored_view_state = {
              topleft_x: state.topleft_x,
              topleft_y: state.topleft_y,
              zoom:
                typeof state.zoom === "number" && Number.isFinite(state.zoom)
                  ? state.zoom
                  : this.zoom,
            };
            this.canvas_topleft_x = state.topleft_x;
            this.canvas_topleft_y = state.topleft_y;
            this.initial_topleft_x = state.topleft_x;
            this.initial_topleft_y = state.topleft_y;
            return;
          }
        }
      } catch (err) {
        console.error("Failed to restore canvas state:", err);
      }
      this.canvas_topleft_x = 0;
      this.canvas_topleft_y = 0;
      this.initial_topleft_x = 0;
      this.initial_topleft_y = 0;
    },
    applyRestoredViewport() {
      if (!this.restored_view_state || !this.$refs.viewer) return;

      const { topleft_x, topleft_y, zoom } = this.restored_view_state;
      const viewer = this.$refs.viewer;

      if (Number.isFinite(zoom) && typeof viewer.setZoom === "function") {
        viewer.setZoom(zoom, { emit: false });
        this.$emit("update:zoom", zoom);
      }

      const applied_zoom =
        typeof viewer.getZoom === "function" ? viewer.getZoom() : zoom;
      if (
        Number.isFinite(applied_zoom) &&
        applied_zoom > 0 &&
        typeof viewer.scrollTo === "function"
      ) {
        viewer.scrollTo(topleft_x * applied_zoom, topleft_y * applied_zoom, {
          duration: 0,
        });
      }

      this.canvas_topleft_x = topleft_x;
      this.canvas_topleft_y = topleft_y;
      this.initial_topleft_x = topleft_x;
      this.initial_topleft_y = topleft_y;
      this.restored_view_state = null;
    },

    getCanvasCoordinatesFromEvent(event) {
      if (!this.$refs.viewer || !this.$refs.viewer.getZoom) return null;
      const pointer_event =
        (event && event.touches && event.touches[0]) ||
        (event && event.changedTouches && event.changedTouches[0]) ||
        event;
      if (
        !pointer_event ||
        pointer_event.clientX === undefined ||
        pointer_event.clientY === undefined
      ) {
        console.log(
          "[LargeCanvas] getCanvasCoordinatesFromEvent: invalid event",
          {
            has_event: !!event,
            touches_count: event && event.touches ? event.touches.length : 0,
            changed_touches_count:
              event && event.changedTouches ? event.changedTouches.length : 0,
          }
        );
        return null;
      }

      // Prefer the viewer's own coordinate conversion to avoid mismatches.
      if (
        this.$refs.viewer &&
        typeof this.$refs.viewer.getContentPointFromClient === "function"
      ) {
        const { content_x, content_y } =
          this.$refs.viewer.getContentPointFromClient(
            pointer_event.clientX,
            pointer_event.clientY
          );
        const clamped_x = Math.round(
          Math.max(0, Math.min(content_x, this.canvas_width))
        );
        const clamped_y = Math.round(
          Math.max(0, Math.min(content_y, this.canvas_height))
        );
        return { x: clamped_x, y: clamped_y };
      }

      // Fallback: older math (kept for safety if viewer ref is missing).
      const zoom = this.zoom;
      const scroll_left = this.canvas_topleft_x;
      const scroll_top = this.canvas_topleft_y;

      const canvas_rect = this.$el.getBoundingClientRect();
      const mouse_screen_x = pointer_event.clientX - canvas_rect.left;
      const mouse_screen_y = pointer_event.clientY - canvas_rect.top;

      const x = scroll_left + mouse_screen_x / zoom;
      const y = scroll_top + mouse_screen_y / zoom;

      const clamped_x = Math.round(Math.max(0, Math.min(x, this.canvas_width)));
      const clamped_y = Math.round(
        Math.max(0, Math.min(y, this.canvas_height))
      );

      return { x: clamped_x, y: clamped_y };
    },
  },
};
</script>
<style lang="scss" scoped>
._largeCanvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

._canvasContent {
  position: relative;
  contain: layout paint;

  --background-color: white;
  --bg-size: 100px;
  --dot-size: 1px;

  overflow: visible;

  background-color: #ffffff;
  background-image: radial-gradient(
    circle at center,
    rgba(0, 0, 0, 0.22) var(--dot-size),
    transparent 4px
  );
  background-repeat: repeat;
  background-size: var(--bg-size) var(--bg-size);
  background-position: -24px -24px;

  border-radius: 40px;
  outline: 10px solid var(--c-gris_clair);

  transition: width 0.3s cubic-bezier(0.19, 1, 0.22, 1),
    height 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}

._canvasExpandPreview {
  position: absolute;
  pointer-events: none;
  opacity: 0.45;
  z-index: 2;
}

._canvasExpandPreview_right {
  top: 20px;
  bottom: 20px;
  border-left: 6px dotted var(--c-gris);
}

._canvasExpandPreview_bottom {
  left: 20px;
  right: 20px;
  border-top: 6px dotted var(--c-gris);
}

._largeCanvas[data-mode="draw"] {
  cursor: crosshair;
}

._canvasContent[data-mode="draw"] {
  cursor: crosshair;
  user-select: none;
}

._lassoRect {
  position: absolute;
  border: 1.5px solid var(--c-orange);
  background: rgba(var(--c-orange-rgb, 255, 120, 50), 0.08);
  pointer-events: none;
  z-index: 100;
  border-radius: 3px;
}

._currentCenterDot {
  position: absolute;
  width: 30px;
  height: 30px;
  background: var(--c-orange);
  border-radius: 50%;
  z-index: 1000;
}
</style>
