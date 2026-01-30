<template>
  <div v-if="default_folder" class="_folderView">
    <div v-show="filterBarOpen" class="_filterBar" aria-hidden="true">
      <FilterBar v-model="mediaTypeFilter" />
    </div>

    <div class="_viewArea">
      <ViewModeBar
        :value="viewMode"
        :filter-open="filterBarOpen"
        :canvas-zoom="canvasZoom"
        @input="switchViewMode"
        @toggle-filter="filterBarOpen = !filterBarOpen"
        @update:canvasZoom="canvasZoom = $event"
      />
      <LargeCanvas
        v-show="viewMode === 'canvas'"
        :files="filteredFiles"
        :zoom="canvasZoom"
        @update:zoom="canvasZoom = $event"
      />
      <GeoMapView v-show="viewMode === 'map'" :files="filteredFiles" />
      <TimelineView v-show="viewMode === 'timeline'" :files="filteredFiles" />
      <MediaGridView v-show="viewMode === 'grid'" :files="filteredFiles" />
    </div>
    <DropMenu class="_dropMenu" :folder_path="default_folder.$path" />
  </div>
</template>
<script>
import DropMenu from "@/components/slash/DropMenu.vue";
import FilterBar from "@/components/slash/FilterBar.vue";
import GeoMapView from "@/components/slash/GeoMapView.vue";
import LargeCanvas from "@/components/slash/LargeCanvas.vue";
import MediaGridView from "@/components/slash/MediaGridView.vue";
import TimelineView from "@/components/slash/TimelineView.vue";
import ViewModeBar from "@/components/slash/ViewModeBar.vue";
export default {
  props: {},
  components: {
    DropMenu,
    FilterBar,
    GeoMapView,
    LargeCanvas,
    MediaGridView,
    TimelineView,
    ViewModeBar,
  },
  data() {
    return {
      default_folder: null,
      viewMode: "canvas",
      filterBarOpen: false,
      mediaTypeFilter: null,
      canvasZoom: 1,
    };
  },
  async created() {
    // Initialize view mode from URL or localStorage fallback
    this.initializeViewMode();

    try {
      this.default_folder = await this.loadFolders();
    } catch (err) {
      if (err.code === "not_found") {
        await this.createDefaultFolder();
        this.default_folder = await this.loadFolders();
      } else {
        console.error(err);
      }
    }

    if (this.default_folder) {
      this.$api.join({ room: this.default_folder.$path });
    }
  },
  mounted() {},
  beforeDestroy() {},
  watch: {
    // Watch for route changes to sync view mode from URL
    "$route.query.view"(newView) {
      if (
        newView &&
        this.isValidViewMode(newView) &&
        newView !== this.viewMode
      ) {
        this.viewMode = newView;
      }
    },
  },
  computed: {
    filteredFiles() {
      if (!this.default_folder || !Array.isArray(this.default_folder.$files)) {
        return [];
      }
      const type = this.mediaTypeFilter;
      if (!type) return this.default_folder.$files;
      if (type === "3d") {
        return this.default_folder.$files.filter(
          (f) => f.$type === "stl" || f.$type === "obj"
        );
      }
      return this.default_folder.$files.filter((f) => f.$type === type);
    },
  },
  methods: {
    initializeViewMode() {
      const validModes = ["canvas", "grid", "map", "timeline"];

      // 1. Check URL query parameter first
      const urlView = this.$route.query.view;
      if (urlView && validModes.includes(urlView)) {
        this.viewMode = urlView;
        return;
      }

      // 2. Fallback to localStorage
      const storedView = localStorage.getItem("slash_viewMode");
      if (storedView && validModes.includes(storedView)) {
        this.viewMode = storedView;
        // Update URL to match localStorage
        this.updateUrlViewMode(storedView);
        return;
      }

      // 3. Default to "canvas"
      this.viewMode = "canvas";
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
    async loadFolders() {
      return await this.$api
        .getFolder({
          path: "folders/default",
        })
        .catch((err) => {
          throw err;
        });
    },
    async createDefaultFolder() {
      return await this.$api.createFolder({
        path: "folders",
        additional_meta: {
          title: "Default",
          requested_slug: "default",
          $status: "public",
          $contributors: "everyone",
        },
      });
    },
    async switchViewMode(newMode) {
      if (this.viewMode === newMode) return;

      // 1. Capture positions of current visible items
      const firstPositions = this.capturePositions();

      // 2. Change view mode
      this.viewMode = newMode;

      // 3. Update URL and localStorage
      this.updateUrlViewMode(newMode);
      localStorage.setItem("slash_viewMode", newMode);

      // 4. Wait for DOM update
      await this.$nextTick();
      // Ensure layout is computed for the newly-shown view (v-show toggles display:none)
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 5. Animate to new positions
      this.animateTransitions(firstPositions);
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
      if (this.viewMode === "map") return new Map();

      const positions = new Map();
      const container = this.getViewContainer(this.viewMode);
      const selector = this.getItemSelector(this.viewMode);
      if (!container || !selector) return positions;

      // Important: scope to the active view container only.
      // Otherwise hidden views (v-show) can overwrite rects with 0x0.
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
      if (this.viewMode === "map") return;

      const container = this.getViewContainer(this.viewMode);
      const selector = this.getItemSelector(this.viewMode);
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
  min-height: 100vh;
}

._filterBar {
  flex-shrink: 0;
  width: 100%;
  background: var(--c-gris_clair, #f0f0f0);
  border-bottom: 1px solid var(--c-gris, #ccc);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  z-index: 9999;
}

._viewArea {
  position: relative;
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
