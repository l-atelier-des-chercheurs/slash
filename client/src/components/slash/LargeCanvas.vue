<template>
  <div class="_largeCanvas" :data-mode="current_mode" draggable="false">
    <SlashPanZoom2
      ref="viewer"
      :zoom="zoom"
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
        }"
        @click.self="handleCanvasClick"
      >
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
          :is_selected="selected_files.includes(file.$path)"
          @position-update="handlePositionUpdate"
          @width-update="handleWidthUpdate"
          @select="handleSelect"
        />
        <CanvasDrawOverlay
          v-if="current_mode === 'draw'"
          :canvas_width="canvas_width"
          :canvas_height="canvas_height"
          :folder_path="folder_path"
          :getCanvasCoords="getCanvasCoordinatesFromEvent"
        />
        <transition name="fade">
          <DropMenuPanelContainer
            v-if="show_drop_menu"
            :additional_meta="additional_meta"
            :zoom="zoom"
            :folder_path="folder_path"
            @close="show_drop_menu = false"
          />
        </transition>
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
      :files="files"
      :canvas_width="canvas_width"
      :canvas_height="canvas_height"
      :zoom="zoom"
      :viewport_props="viewport_props"
      :selected_files="selected_files"
    />
    <LeftToolbar :current_mode.sync="current_mode" />
  </div>
</template>
<script>
import SlashPanZoom2 from "@/components/slash/SlashPanZoom2.vue";
import CanvasItemInteractive from "@/components/slash/CanvasItemInteractive.vue";
import CanvasDrawOverlay from "@/components/slash/CanvasDrawOverlay.vue";
import LeftToolbar from "@/components/slash/LeftToolbar.vue";
import CanvasShape from "@/components/slash/CanvasShape.vue";
import DropMenuPanelContainer from "@/components/slash/DropMenuPanelContainer.vue";
import MiniMap from "@/components/slash/MiniMap.vue";

export default {
  props: {
    files: {
      type: Array,
      required: true,
    },
    zoom: {
      type: Number,
      default: 1,
    },
    zoom_range: Array,
    folder_path: String,
  },
  components: {
    SlashPanZoom2,
    CanvasItemInteractive,
    CanvasDrawOverlay,
    LeftToolbar,
    CanvasShape,
    DropMenuPanelContainer,
    MiniMap,
  },
  data() {
    return {
      canvas_topleft_x: 0,
      canvas_topleft_y: 0,

      canvas_clicked_x: null,
      canvas_clicked_y: null,

      current_mode: "pan-zoom",

      min_canvas_width: 1600,
      min_canvas_height: 1000,
      margin_around_content: 500,

      lastLogTime: 0,
      saveStateTimeout: null,

      show_add_menu: false,
      show_drop_menu: false,

      selected_files: [],

      viewport_props: {
        left_pct: 0,
        top_pct: 0,
        width_pct: 0,
        height_pct: 0,
      },
    };
  },
  computed: {
    canvas_width() {
      if (!this.files || this.files.length === 0) {
        return this.min_canvas_width;
      }
      let right_edge = 0;
      this.files.forEach((file) => {
        const { width } = this.getFileDimensions(file);
        const x = file.x || 0;
        right_edge = Math.max(right_edge, x + width);
      });
      const cw = Math.round(right_edge + this.margin_around_content);
      return Math.max(this.min_canvas_width, cw);
    },
    canvas_height() {
      if (!this.files || this.files.length === 0) {
        return this.min_canvas_height;
      }
      let bottom_edge = 0;
      this.files.forEach((file) => {
        const { height } = this.getFileDimensions(file);
        const y = file.y || 0;
        bottom_edge = Math.max(bottom_edge, y + height);
      });
      const ch = Math.round(bottom_edge + this.margin_around_content);
      return Math.max(this.min_canvas_height, ch);
    },
    additional_meta() {
      if (!this.canvas_clicked_x || !this.canvas_clicked_y) return null;

      const base_width = 640;

      return {
        x: this.canvas_clicked_x,
        y: this.canvas_clicked_y,
        width: base_width,
      };
    },
  },
  mounted() {
    this.restoreStateFromLocalStorage();
    this.$eventHub.$on("canvas.dragEnd", this.handleDragEnd);
    window.addEventListener("keydown", this.handleGlobalKeydown);
  },
  beforeDestroy() {
    this.$eventHub.$off("canvas.dragEnd", this.handleDragEnd);
    window.removeEventListener("keydown", this.handleGlobalKeydown);
  },
  methods: {
    handleGlobalKeydown(event) {
      if (this.selected_files.length === 0) return;
      if (event.key !== "Backspace" && event.key !== "Delete") return;
      const target = event.target;
      const is_input =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        (target.isContentEditable &&
          target.getAttribute("contenteditable") === "true");
      if (is_input) return;
      event.preventDefault();
      this.removeSelectedFiles();
    },
    async removeSelectedFiles() {
      const paths = [...this.selected_files];
      this.selected_files = [];
      for (const path of paths) {
        try {
          await this.$api.deleteItem({ path });
        } catch (err) {
          console.error("Failed to delete:", path, err);
        }
      }
      if (paths.length > 0) {
        this.$alertify
          .closeLogOnClick(true)
          .delay(4000)
          .success(this.$t("removed_successfully"));
        this.$emit("items-removed", paths);
      }
    },
    handleCanvasClick(event) {
      if (this.current_mode === "pan-zoom") {
        return;
      }
      if (event.metaKey || event.shiftKey) {
        return;
      } else if (this.selected_files.length > 0) {
        this.selected_files = [];
        return;
      }

      if (this.canvas_clicked_x !== null && this.canvas_clicked_y !== null) {
        this.canvas_clicked_x = null;
        this.canvas_clicked_y = null;
        this.show_drop_menu = false;
        return;
      } else {
        this.canvas_clicked_x = event.offsetX;
        this.canvas_clicked_y = event.offsetY;
        this.show_drop_menu = true;
        return;
      }
    },
    handleSelect(file_path, mode) {
      this.show_drop_menu = false;
      // if command or shift is pressed, append to selected_files; otherwise, replace
      if (mode === "append") {
        this.selected_files.push(file_path);
      } else {
        this.selected_files = [file_path];
      }
    },
    handleViewportChange(pct) {
      this.viewport_props = { ...pct };
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
    handlePositionUpdate({ file, x, y }) {
      // Clamp to >= 0 so all content stays within the canvas (no negative coords)
      const clamped_x = Math.max(0, x);
      const clamped_y = Math.max(0, y);
      const old_x = file.x || 0;
      const old_y = file.y || 0;
      const delta_x = clamped_x - old_x;
      const delta_y = clamped_y - old_y;

      this.$set(file, "x", clamped_x);
      this.$set(file, "y", clamped_y);

      // If multiple items are selected, move all of them by the same delta
      if (
        this.selected_files.length > 1 &&
        this.selected_files.includes(file.$path)
      ) {
        for (const path of this.selected_files) {
          if (path === file.$path) continue;
          const other = this.files.find((f) => f.$path === path);
          if (!other) continue;
          const other_x = Math.max(0, (other.x || 0) + delta_x);
          const other_y = Math.max(0, (other.y || 0) + delta_y);
          const { width, height } = this.getFileDimensions(other);
          const max_x = Math.max(0, this.canvas_width - width);
          const max_y = Math.max(0, this.canvas_height - height);
          this.$set(other, "x", Math.min(other_x, max_x));
          this.$set(other, "y", Math.min(other_y, max_y));
        }
      }
    },
    async handleDragEnd({ file: dragged_file }) {
      // Persist position for other selected files (the dragged file is saved by CanvasItemInteractive)
      if (this.selected_files.length <= 1) return;
      for (const path of this.selected_files) {
        if (path === dragged_file.$path) continue;
        const f = this.files.find((file) => file.$path === path);
        if (!f) continue;
        try {
          await this.$api.updateMeta({
            path: f.$path,
            new_meta: { x: f.x || 0, y: f.y || 0 },
          });
        } catch (err) {
          console.error("Failed to save canvas position:", err);
        }
      }
    },
    handleWidthUpdate({ file, width }) {
      // Update file width locally
      this.$set(file, "width", width);
    },
    getFileDimensions(file) {
      const width = file.width || 160;
      const ratio = file.$infos && file.$infos.ratio;
      // PDF and embed have fixed aspect ratio in UI (e.g. 16/9); use default when no ratio
      const default_ratio = 9 / 16; // height/width for 16:9
      const effective_ratio = ratio !== undefined ? ratio : default_ratio;
      const height = width * effective_ratio;
      return { width, height };
    },
    getStorageKey() {
      const path = this.$route ? this.$route.path : window.location.pathname;
      return `slash_canvas_state_${path}`;
    },
    saveStateToLocalStorage() {
      if (this.saveStateTimeout) clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = setTimeout(() => {
        const state = {
          topleft_x: this.canvas_topleft_x,
          topleft_y: this.canvas_topleft_y,
          zoom: this.zoom,
        };
        localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
      }, 500);
    },
    restoreStateFromLocalStorage() {
      try {
        const storedState = localStorage.getItem(this.getStorageKey());
        if (storedState) {
          const state = JSON.parse(storedState);
          if (state.zoom) {
            this.$emit("update:zoom", state.zoom);
          }
        }
      } catch (err) {
        console.error("Failed to restore canvas state:", err);
      }
      this.centerOnOrigin();
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

      const zoom = this.zoom;
      const scroll_left = this.canvas_topleft_x;
      const scroll_top = this.canvas_topleft_y;

      const canvas_rect = this.$el.getBoundingClientRect();
      const mouse_screen_x = pointer_event.clientX - canvas_rect.left;
      const mouse_screen_y = pointer_event.clientY - canvas_rect.top;

      const x = scroll_left + mouse_screen_x / zoom;
      const y = scroll_top + mouse_screen_y / zoom;

      const clamped_x = Math.max(0, Math.min(x, this.canvas_width));
      const clamped_y = Math.max(0, Math.min(y, this.canvas_height));

      if (event && event.type && event.type.startsWith("touch")) {
        console.log("[LargeCanvas] touch coords", {
          event_type: event.type,
          client_x: pointer_event.clientX,
          client_y: pointer_event.clientY,
          canvas_x: clamped_x,
          canvas_y: clamped_y,
          zoom,
          scroll_left,
          scroll_top,
        });
      }

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
  background: #eee;
}

._canvasContent {
  position: relative;

  // Dot grid pattern with --color-rule; pans with content (this div is inside the panned viewport)
  --rule-color: var(--color-rule);
  --background-color: white;
  --bg-size: 100px;
  --bg-position: 0 0;
  --dot-size: 2px;

  // border: var(--dot-size) solid var(--rule-color);
  box-shadow: 0 0 55px 0px rgba(0, 0, 0, 0.1);
  // border-radius: var(--border-radius);
  overflow: visible;

  // draw tiny SLASH "/" in the background
  background-color: #ffffff;

  background-image: radial-gradient(
      var(--rule-color) var(--dot-size),
      transparent var(--dot-size)
    ),
    radial-gradient(
      var(--rule-color) var(--dot-size),
      transparent var(--dot-size)
    );
  background-size: var(--bg-size) var(--bg-size);
  background-position: 0 0, calc(var(--bg-size) / 2) calc(var(--bg-size) / 2);
}

._largeCanvas[data-mode="draw"] {
  cursor: crosshair;
}

._canvasContent[data-mode="draw"] {
  cursor: crosshair;
  user-select: none;
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
