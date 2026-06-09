<template>
  <div v-if="folder" class="_folderView">
    <div v-if="filter_bar_open" class="_filterBar">
      <FilterBar
        :author_filter.sync="author_filter"
        :media_type_filter.sync="media_type_filter"
      />
    </div>

    <div class="_mainContent">
      <div class="_viewArea">
        <TopLeftMenu
          :folder="folder"
          :folder_path="folder.$path"
          :current_folder_title="folder_display_title"
          :canvas_zoom="canvas_zoom"
          :canvas_scroll="canvas_scroll"
          @toggleFoldersSidebar="$emit('toggleFoldersSidebar')"
          @openCurrentFolderSettings="openCurrentFolderSettings"
        />
        <ViewModeBar
          :value="view_mode"
          :filter_open="filter_bar_open"
          :canvas_zoom="canvas_zoom"
          :zoom_range="zoom_range"
          @input="switchViewMode"
          @toggle-filter="filter_bar_open = !filter_bar_open"
          @update:canvas_zoom="canvas_zoom = $event"
        />
        <LargeCanvas
          v-if="view_mode === 'canvas'"
          ref="largeCanvas"
          :files="filtered_files"
          :all_files="sorted_files"
          :zoom="canvas_zoom"
          :zoom_range="zoom_range"
          :folder_path="folder.$path"
          :show_media_list_sidebar="show_media_list_sidebar"
          :media_list_paths="media_list_paths"
          :selected_files="selected_files"
          @update:selected_files="selected_files = $event"
          @update:interaction_mode="canvas_interaction_mode = $event"
          @remove-selected="removeSelectedFiles"
          @update:zoom="canvas_zoom = $event"
          @update:scroll="canvas_scroll = $event"
        />
        <GeoMapView
          v-if="view_mode === 'map'"
          :files="filtered_files_without_canvas_items"
        />
        <TimelineView
          v-if="view_mode === 'timeline'"
          :files="filtered_files_without_canvas_items"
          :show_media_list_sidebar="show_media_list_sidebar"
          :media_list_paths="media_list_paths"
          :selected_files="selected_files"
          @select="handleItemSelect"
        />
        <MediaGridView
          v-if="view_mode === 'grid'"
          :files="filtered_files_without_canvas_items"
          :show_media_list_sidebar="show_media_list_sidebar"
          :media_list_paths="media_list_paths"
          :selected_files="selected_files"
          @select="handleItemSelect"
        />

        <button
          type="button"
          class="u-button u-button_icon _mediaListToggle u-overlayPanel"
          :class="{ 'is--active': show_media_list_sidebar }"
          title="Media list"
          aria-label="Media list"
          @click="toggleMediaListSidebar"
        >
          <b-icon icon="printer" />
        </button>

        <transition name="fade">
          <CanvasSelectionBar
            v-if="show_selection_bar"
            :selection_count="selected_files.length"
            :is_downloading="is_downloading_sources"
            :show_stroke_controls="show_shape_stroke_controls"
            :shape_stroke_width="selection_shape_stroke_width"
            @download="downloadSelectedFiles"
            @remove="removeSelectedFiles"
            @clear="selected_files = []"
            @update:shape_stroke_width="onShapeStrokeWidthUpdate"
          />
        </transition>
      </div>

      <transition name="mediaListSidebarSlide">
        <MediaListSidebar
          v-show="show_media_list_sidebar"
          ref="mediaListSidebar"
          :folder_path="folder_path"
          :files="sorted_files"
          :media_list_paths="media_list_paths"
          @update:media_list_paths="onMediaListPathsUpdate"
          @close="closeMediaListSidebar"
        />
      </transition>
    </div>

    <ItemModal
      v-if="opened_file"
      :file="opened_file"
      @close="closeItemModalWithTransition"
    />

    <FolderSettingsModal
      :show_modal="show_folder_settings_modal"
      :folder="folder"
      :can_edit_folder="can_edit_current_folder"
      :folder_status="current_folder_status"
      @close="closeCurrentFolderSettings"
      @folderRemoved="$emit('folderRemoved')"
    />
  </div>
</template>
<script>
import TopLeftMenu from "@/components/slash/TopLeftMenu.vue";
import FilterBar from "@/components/slash/FilterBar.vue";
import GeoMapView from "@/components/slash/GeoMapView.vue";
import LargeCanvas from "@/components/slash/LargeCanvas.vue";
import MediaGridView from "@/components/slash/MediaGridView.vue";
import TimelineView from "@/components/slash/TimelineView.vue";
import ViewModeBar from "@/components/slash/ViewModeBar.vue";
import ItemModal from "@/components/slash/ItemModal.vue";
import FolderSettingsModal from "@/components/slash/FolderSettingsModal.vue";
import MediaListSidebar from "@/components/slash/MediaListSidebar.vue";
import CanvasSelectionBar from "@/components/slash/CanvasSelectionBar.vue";
import {
  loadMediaListPaths,
  saveMediaListPaths,
} from "@/utils/mediaListUtils.js";

export default {
  props: {
    folder_path: {
      type: String,
      required: true,
    },
  },
  components: {
    TopLeftMenu,
    FilterBar,
    GeoMapView,
    LargeCanvas,
    MediaGridView,
    TimelineView,
    ViewModeBar,
    ItemModal,
    FolderSettingsModal,
    MediaListSidebar,
    CanvasSelectionBar,
  },
  data() {
    return {
      folder: null,
      view_mode: "canvas",
      filter_bar_open: false,
      author_filter: null,
      media_type_filter: null,
      canvas_zoom: 1,
      canvas_scroll: null,
      zoom_range: [0.1, 1],
      show_folder_settings_modal: false,
      show_media_list_sidebar: false,
      media_list_paths: [],
      selected_files: [],
      is_downloading_sources: false,
      canvas_interaction_mode: "pan-zoom",
    };
  },
  async created() {
    // Initialize view mode from URL or localStorage fallback
    this.initializeViewMode();
    this.syncMediaListEditorFromUrl(this.$route.query.editor);
  },
  mounted() {
    this.$eventHub.$on("canvasItem.open", this.openItemModal);
    this.$eventHub.$on(
      "canvasItem.openWithTransition",
      this.switchToFileWithTransition
    );
    this.$eventHub.$on("mediaList.ensureOpen", this.openMediaListSidebar);
  },
  beforeDestroy() {
    this.$eventHub.$off("canvasItem.open", this.openItemModal);
    this.$eventHub.$off(
      "canvasItem.openWithTransition",
      this.switchToFileWithTransition
    );
    this.$eventHub.$off("mediaList.ensureOpen", this.openMediaListSidebar);
    if (this.folder_path && this.isRoomJoined(this.folder_path)) {
      this.$api.leave({ room: this.folder_path });
    }
  },
  watch: {
    // Watch for route changes to sync view mode from URL
    "$route.query.view"(new_view) {
      if (
        new_view &&
        this.isValidViewMode(new_view) &&
        new_view !== this.view_mode
      ) {
        this.view_mode = new_view;
      }
    },
    "$route.query.editor"(editor) {
      this.syncMediaListEditorFromUrl(editor);
    },
    folder_path: {
      immediate: true,
      async handler(new_folder_path, old_folder_path) {
        if (!new_folder_path) return;
        if (
          old_folder_path &&
          old_folder_path !== new_folder_path &&
          this.isRoomJoined(old_folder_path)
        ) {
          this.$api.leave({ room: old_folder_path });
        }
        if (old_folder_path && old_folder_path !== new_folder_path) {
          this.selected_files = [];
        }

        try {
          this.folder = await this.loadFolder(new_folder_path);
          this.loadMediaListForFolder(new_folder_path);
          this.syncMediaListEditorFromUrl(this.$route.query.editor);
          if (!this.isRoomJoined(new_folder_path)) {
            this.$api.join({ room: new_folder_path });
          }
        } catch (error) {
          this.folder = null;
          if (this.$route.path !== "/") {
            this.$router.replace({
              path: "/",
              query: { ...this.$route.query },
            });
          }
          this.$emit("toggleFoldersSidebar", true);
        }
      },
    },
    sorted_files() {
      if (!this.folder_path || !this.media_list_paths.length) return;
      const pruned = this.pruneMediaListPaths(this.media_list_paths);
      if (pruned.length !== this.media_list_paths.length) {
        this.onMediaListPathsUpdate(pruned);
      }

      if (this.selected_files.length) {
        const valid_paths = new Set(this.sorted_files.map((file) => file.$path));
        const pruned_selection = this.selected_files.filter((path) =>
          valid_paths.has(path)
        );
        if (pruned_selection.length !== this.selected_files.length) {
          this.selected_files = pruned_selection;
        }
      }
    },
  },
  computed: {
    folder_display_title() {
      return this.folder?.title || "";
    },
    opened_file() {
      if (!this.$route.query.file) return null;
      const metafilename = this.$route.query.file;
      return this.filtered_files.find((f) =>
        f.$path.endsWith("/" + metafilename)
      );
    },
    sorted_files() {
      if (!this.folder || !Array.isArray(this.folder.$files)) {
        return [];
      }
      let files = this.folder.$files;
      if (!files) return [];
      return files.sort((a, b) => {
        return a.$date_created - b.$date_created;
      });
    },
    filtered_files() {
      if (!this.folder || !Array.isArray(this.folder.$files)) {
        return [];
      }
      const media_type_filter = this.media_type_filter;
      const author_filter = this.author_filter;

      return this.sorted_files.filter((file) => {
        const has_author_filter = !!author_filter;
        const file_authors = Array.isArray(file.$authors) ? file.$authors : [];
        const match_author =
          !has_author_filter || file_authors.includes(author_filter);

        if (!media_type_filter) return match_author;
        if (media_type_filter === "3d") {
          return match_author && (file.$type === "stl" || file.$type === "obj");
        }
        return match_author && file.$type === media_type_filter;
      });
    },
    filtered_files_without_canvas_items() {
      return this.filtered_files.filter((f) => !f.$type.startsWith("canvas_"));
    },
    can_edit_current_folder() {
      if (!this.folder) return false;
      if (typeof this.canLoggedinEditFolder !== "function") return true;
      return this.canLoggedinEditFolder({
        folder: this.folder,
      });
    },
    current_folder_status() {
      if (!this.folder?.$status) return "public";
      return this.folder.$status === "private" ? "private" : "public";
    },
    show_selection_bar() {
      if (!this.selected_files.length) return false;
      if (this.view_mode === "grid" || this.view_mode === "timeline") {
        return true;
      }
      if (this.view_mode === "canvas") {
        return this.canvas_interaction_mode === "select";
      }
      return false;
    },
    selected_shape_files() {
      const selected = new Set(this.selected_files);
      return this.filtered_files.filter(
        (file) => file.$type === "canvas_shape" && selected.has(file.$path)
      );
    },
    show_shape_stroke_controls() {
      return (
        this.view_mode === "canvas" &&
        this.canvas_interaction_mode === "select" &&
        this.selected_shape_files.length > 0
      );
    },
    selection_shape_stroke_width() {
      const shapes = this.selected_shape_files;
      if (!shapes.length) return 5;
      const first = Number(shapes[0].shape_stroke_width);
      return Number.isFinite(first) && first > 0 ? first : 5;
    },
  },
  methods: {
    isRoomJoined(room) {
      return Array.isArray(this.$api.rooms_joined)
        ? this.$api.rooms_joined.includes(room)
        : false;
    },
    async loadFolder(path) {
      return await this.$api.getFolder({ path });
    },
    async openCurrentFolderSettings() {
      if (!this.folder_path) return;
      this.folder = await this.$api.getFolder({
        path: this.folder_path,
      });
      this.show_folder_settings_modal = true;
    },
    closeCurrentFolderSettings() {
      this.show_folder_settings_modal = false;
    },
    initializeViewMode() {
      const valid_modes = ["canvas", "grid", "map", "timeline"];

      // 1. Check URL query parameter first
      const url_view = this.$route.query.view;
      if (url_view && valid_modes.includes(url_view)) {
        this.view_mode = url_view;
        return;
      }

      // 2. Fallback to localStorage
      const stored_view =
        localStorage.getItem("slash_view_mode") ||
        localStorage.getItem("slash_viewMode");
      if (stored_view && valid_modes.includes(stored_view)) {
        this.view_mode = stored_view;
        // Update URL to match localStorage
        this.updateUrlViewMode(stored_view);
        return;
      }

      // 3. Default to "canvas"
      this.view_mode = "canvas";
      this.updateUrlViewMode("canvas");
    },
    isValidViewMode(mode) {
      return ["canvas", "map", "grid", "timeline"].includes(mode);
    },
    updateUrlViewMode(mode) {
      // Use replace to avoid cluttering browser history with view mode changes
      this.$router.replace({
        query: {
          ...this.$route.query,
          view: mode,
        },
      });
    },
    async switchViewMode(newMode) {
      if (this.view_mode === newMode) return;

      if (this.view_mode === "canvas" && newMode !== "canvas") {
        this.pruneCanvasOnlySelection();
      }

      // 1. Capture positions of current visible items
      const firstPositions = this.capturePositions();

      // 2. Change view mode
      this.view_mode = newMode;

      // 3. Update URL and localStorage
      this.updateUrlViewMode(newMode);
      localStorage.setItem("slash_view_mode", newMode);

      // 4. Wait for DOM update
      await this.$nextTick();
      // Ensure layout is computed for the newly-mounted view
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 5. Animate to new positions
      this.animateTransitions(firstPositions);
    },
    async closeItemModalWithTransition() {
      const modalEl = this.$el.querySelector("._itemModal");
      if (!modalEl) {
        this.closeItemModal();
        return;
      }

      // Disable "between media" transform animations on close:
      // keep only the modal fade-out.
      const prefersReducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      )?.matches;
      if (prefersReducedMotion) {
        this.closeItemModal();
        return;
      }

      // Ensure we start from visible state
      modalEl.style.opacity = "1";

      const onTransitionEnd = (event) => {
        if (event?.propertyName && event.propertyName !== "opacity") return;
        modalEl.removeEventListener("transitionend", onTransitionEnd);
        modalEl.style.opacity = "";
        this.closeItemModal();
      };

      modalEl.addEventListener("transitionend", onTransitionEnd);

      // Allow styles to apply before triggering the transition.
      requestAnimationFrame(() => {
        modalEl.style.opacity = "0";
      });

      // Fallback: if transitionend doesn't fire for any reason.
      setTimeout(() => {
        if (!document.contains(modalEl)) return;
        modalEl.removeEventListener("transitionend", onTransitionEnd);
        modalEl.style.opacity = "";
        this.closeItemModal();
      }, 400);
    },
    async switchToFileWithTransition(path) {
      // Only animate when opening the modal.
      // When switching media while the modal is already open, swap instantly.
      const modal_was_open = !!this.opened_file;

      this.openItemModal(path);

      if (modal_was_open) return;

      await this.$nextTick();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const modalEl = this.$el.querySelector("._itemModal");
      if (!modalEl) {
        return;
      }

      // Start hidden so CSS opacity transition can animate in.
      modalEl.style.opacity = "0";
      // Force reflow so the browser registers the initial opacity.
      // eslint-disable-next-line no-unused-expressions
      void document.body.offsetHeight;

      requestAnimationFrame(() => {
        modalEl.style.opacity = "1";
      });
    },
    getViewContainer(mode) {
      switch (mode) {
        case "canvas":
          return this.$el.querySelector("._largeCanvas");
        case "timeline":
          return this.$el.querySelector("._timelineView");
        case "grid":
          return this.$el.querySelector("._mediaGridView");
        default:
          return null;
      }
    },
    getItemSelector(mode) {
      switch (mode) {
        case "canvas":
        case "timeline":
          return "._canvasItem";
        case "grid":
          return "._mediaGridView--item";
        default:
          return null;
      }
    },
    capturePositions() {
      if (this.view_mode === "map") return new Map();

      const positions = new Map();
      const container = this.getViewContainer(this.view_mode);
      const selector = this.getItemSelector(this.view_mode);
      if (!container || !selector) return positions;

      // Important: scope to the active view container only.
      const elements = container.querySelectorAll(selector);
      elements.forEach((el) => {
        const path = el.getAttribute("data-file-path");
        if (path) {
          positions.set(path, el.getBoundingClientRect());
        }
      });
      return positions;
    },
    animateTransitions(firstPositions) {
      if (this.view_mode === "map") return;

      const container = this.getViewContainer(this.view_mode);
      const selector = this.getItemSelector(this.view_mode);
      if (!container || !selector) return;

      const elements = container.querySelectorAll(selector);

      // Force a reflow before starting to ensure we have clean state
      document.body.offsetHeight;

      elements.forEach((el) => {
        const path = el.getAttribute("data-file-path");
        const first = firstPositions.get(path);

        if (first) {
          const last = el.getBoundingClientRect();
          if (!last.width || !last.height) return;

          // Calculate delta
          const deltaX = first.left - last.left;
          const deltaY = first.top - last.top;
          const deltaW = first.width / last.width;
          const deltaH = first.height / last.height;

          // Check if there is significant change
          if (
            Math.abs(deltaX) < 1 &&
            Math.abs(deltaY) < 1 &&
            Math.abs(deltaW - 1) < 0.01 &&
            Math.abs(deltaH - 1) < 0.01
          ) {
            return;
          }

          // Apply transform to put element at 'first' position
          // Use inline style to override any existing classes
          el.style.transition = "none";
          el.style.transformOrigin = "top left";
          el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
          el.style.zIndex = "1000"; // Ensure it's on top during transition

          // Clean up z-index after animation
          const cleanup = () => {
            el.style.transform = "";
            el.style.transition = "";
            el.style.transformOrigin = "";
            el.style.zIndex = "";
            el.removeEventListener("transitionend", cleanup);
          };
          el.addEventListener("transitionend", cleanup);
        }
      });

      // Force reflow
      document.body.offsetHeight;

      // Play animation
      requestAnimationFrame(() => {
        elements.forEach((el) => {
          const path = el.getAttribute("data-file-path");
          if (firstPositions.has(path)) {
            el.style.transition =
              "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
            el.style.transform = "none";
          }
        });
      });
    },
    openItemModal(path) {
      // get metafilename, store in url as file=
      const metafilename = this.getFilename(path);
      this.$router.push({
        query: {
          ...this.$route.query,
          file: metafilename,
        },
      });
    },
    closeItemModal() {
      this.$router.push({
        query: {
          ...this.$route.query,
          file: null,
        },
      });
    },
    loadMediaListForFolder(folder_path) {
      const stored_paths = loadMediaListPaths(folder_path);
      this.media_list_paths = this.pruneMediaListPaths(stored_paths);
      if (this.media_list_paths.length !== stored_paths.length && folder_path) {
        saveMediaListPaths(folder_path, this.media_list_paths);
      }
    },
    pruneMediaListPaths(paths) {
      const valid_paths = new Set(this.sorted_files.map((file) => file.$path));
      return paths.filter((path) => valid_paths.has(path));
    },
    toggleMediaListSidebar() {
      this.show_media_list_sidebar = !this.show_media_list_sidebar;
    },
    openMediaListSidebar() {
      this.show_media_list_sidebar = true;
    },
    closeMediaListSidebar() {
      this.show_media_list_sidebar = false;
    },
    syncMediaListEditorFromUrl(editor) {
      if (editor === "print" || editor === "web") {
        this.show_media_list_sidebar = true;
      }
    },
    onMediaListPathsUpdate(paths) {
      this.media_list_paths = paths;
      if (this.folder_path) {
        saveMediaListPaths(this.folder_path, paths);
      }
    },
    handleItemSelect(file_path, mode) {
      if (mode === "append") {
        if (this.selected_files.includes(file_path)) return;
        this.selected_files = [...this.selected_files, file_path];
        return;
      }
      this.selected_files = [file_path];
    },
    pruneCanvasOnlySelection() {
      this.selected_files = this.selected_files.filter((path) => {
        const file = this.sorted_files.find((f) => f.$path === path);
        return file && !file.$type.startsWith("canvas_");
      });
    },
    onShapeStrokeWidthUpdate(width) {
      this.$refs.largeCanvas?.setSelectedShapesStrokeWidth(width);
    },
    async removeSelectedFiles() {
      const paths = [...this.selected_files];
      this.selected_files = [];
      if (paths.length === 0 || !this.folder_path) return;

      const meta_filenames = paths.map((p) => p.split("/").pop());
      let result;
      try {
        result = await this.$api.deleteItems({
          path: this.folder_path,
          meta_filenames,
        });
      } catch (err) {
        console.error("Failed to delete items:", err);
        return;
      }

      const succeeded = result?.success ?? [];
      if (succeeded.length > 0) {
        this.$alertify
          .closeLogOnClick(true)
          .delay(4000)
          .success(this.$t("removed_successfully"));
      }
    },
    async downloadSelectedFiles() {
      const paths = [...this.selected_files];
      if (paths.length === 0 || !this.folder_path) return;

      const meta_filenames = paths.map((p) => p.split("/").pop());
      this.is_downloading_sources = true;
      try {
        await this.$api.downloadSources({
          path: this.folder_path,
          meta_filenames,
        });
      } catch (err) {
        this.$alertify?.error(this.$t("failed_to_download"));
      } finally {
        this.is_downloading_sources = false;
      }
    },
  },
};
</script>
<style lang="scss" scoped>
._folderView {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 100%;

  transition: all 1s ease-in-out;
}

._filterBar {
  flex: 0 0 auto;
  width: 100%;
  background: var(--c-gris_clair);
  // color: white;
  border-bottom: 1px solid var(--c-gris, #ccc);
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

._mainContent {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

._viewArea {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

._mediaListToggle {
  position: absolute;
  bottom: var(--fixed-ui-margins);
  right: var(--fixed-ui-margins);
  z-index: 900;
  padding: calc(var(--spacing) / 1.5);
  color: var(--c-gris_fonce, #555);
  transition: color 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    background-color 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  ::v-deep .b-icon.bi {
    width: 1.75rem;
    height: 1.75rem;
  }

  &:hover,
  &:focus-visible {
    color: var(--c-bleuvert, #2a9d8f);
    background-color: rgba(42, 157, 143, 0.12);
    transform: translateY(-1px);
  }

  &.is--active {
    color: white;
    background-color: var(--c-bleuvert, #2a9d8f);
  }
}

.mediaListSidebarSlide-enter-active,
.mediaListSidebarSlide-leave-active {
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}

.mediaListSidebarSlide-enter,
.mediaListSidebarSlide-leave-to {
  transform: translateX(16px);
  opacity: 0;
}
</style>
