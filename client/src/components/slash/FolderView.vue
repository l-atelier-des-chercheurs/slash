<template>
  <div v-if="default_folder" class="_folderView">
    <ViewModeBar :value="viewMode" @input="switchViewMode" />
    <LargeCanvas v-show="viewMode === 'canvas'" :files="default_folder.$files" />
    <GeoMapView v-show="viewMode === 'geoMap'" :files="default_folder.$files" />
    <TimelineView v-show="viewMode === 'timeline'" :files="default_folder.$files" />
    <MediaGridView
      v-show="viewMode === 'grid'"
      :files="default_folder.$files"
    />
    <DropMenu class="_dropMenu" :folder_path="default_folder.$path" />
  </div>
</template>
<script>
import DropMenu from "@/components/slash/DropMenu.vue";
import GeoMapView from "@/components/slash/GeoMapView.vue";
import LargeCanvas from "@/components/slash/LargeCanvas.vue";
import MediaGridView from "@/components/slash/MediaGridView.vue";
import TimelineView from "@/components/slash/TimelineView.vue";
import ViewModeBar from "@/components/slash/ViewModeBar.vue";
export default {
  props: {},
  components: {
    DropMenu,
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
      if (newView && this.isValidViewMode(newView) && newView !== this.viewMode) {
        this.viewMode = newView;
      }
    },
  },
  computed: {},
  methods: {
    initializeViewMode() {
      const validModes = ["canvas", "grid", "geoMap", "timeline"];
      
      // 1. Check URL query parameter first (handle legacy "map" value)
      const urlView = this.$route.query.view;
      if (urlView) {
        const normalizedView = urlView === "map" ? "canvas" : urlView;
        if (validModes.includes(normalizedView)) {
          this.viewMode = normalizedView;
          // Update URL if it was legacy "map"
          if (urlView === "map") {
            this.updateUrlViewMode("canvas");
          }
          return;
        }
      }

      // 2. Fallback to localStorage (also handle legacy "map" value)
      const storedView = localStorage.getItem("slash_viewMode");
      const normalizedView = storedView === "map" ? "canvas" : storedView;
      if (normalizedView && validModes.includes(normalizedView)) {
        this.viewMode = normalizedView;
        // Update URL to match localStorage
        this.updateUrlViewMode(normalizedView);
        return;
      }

      // 3. Default to "canvas"
      this.viewMode = "canvas";
      this.updateUrlViewMode("canvas");
    },
    isValidViewMode(mode) {
      // Also accept legacy "map" for backward compatibility
      return ["canvas", "map", "grid", "geoMap", "timeline"].includes(mode);
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

      // 5. Animate to new positions
      this.animateTransitions(firstPositions);
    },
    capturePositions() {
      if (this.viewMode === "geoMap" || this.viewMode === "timeline") return new Map();

      const positions = new Map();
      const selector =
        this.viewMode === "canvas"
          ? "._canvasItem"
          : "._mediaGridView--item";
      
      const elements = this.$el.querySelectorAll(selector);
      elements.forEach((el) => {
        const path = el.getAttribute("data-file-path");
        if (path) {
          positions.set(path, el.getBoundingClientRect());
        }
      });
      return positions;
    },
    animateTransitions(firstPositions) {
      if (this.viewMode === "geoMap" || this.viewMode === "timeline") return;

      const selector =
        this.viewMode === "canvas"
          ? "._canvasItem"
          : "._mediaGridView--item";
          
      const elements = this.$el.querySelectorAll(selector);
      
      // Force a reflow before starting to ensure we have clean state
      document.body.offsetHeight;

      elements.forEach((el) => {
        const path = el.getAttribute("data-file-path");
        const first = firstPositions.get(path);
        
        if (first) {
          const last = el.getBoundingClientRect();
          
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
             el.removeEventListener('transitionend', cleanup);
          };
          el.addEventListener('transitionend', cleanup);
        }
      });

      // Force reflow
      document.body.offsetHeight;

      // Play animation
      requestAnimationFrame(() => {
        elements.forEach((el) => {
          const path = el.getAttribute("data-file-path");
          if (firstPositions.has(path)) {
             el.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
             el.style.transform = "none";
          }
        });
      });
    }
  },
};
</script>
<style lang="scss" scoped>
._folderView {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
}
</style>
