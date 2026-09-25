<template>
  <div class="_homeView">
    <LoginModal v-if="show_login_modal" @close="show_login_modal = false" />

    <div class="_homeLayout">
      <transition name="folderViewTransition" mode="out-in">
        <div
          v-if="current_folder_path"
          :key="current_folder_path"
          class="_folderViewPane"
        >
          <FolderView
            :folder_path="current_folder_path"
            @toggleFoldersSidebar="toggleFoldersSidebar"
            @folderRemoved="onCurrentFolderRemoved"
          />
        </div>
      </transition>

      <transition name="foldersPanel">
        <FoldersSidebar
          v-if="show_folders_sidebar"
          :folders="folders"
          :current_folder_path="current_folder_path"
          :folders_path="folders_path"
          :is_overlay="!!current_folder_path"
          @close="closeFoldersSidebar"
          @selectFolder="selectFolder"
          @openNewFolder="openNewFolder"
        />
      </transition>
    </div>
  </div>
</template>

<script>
import FolderView from "@/components/slash/FolderView.vue";
import FoldersSidebar from "@/components/slash/FoldersSidebar.vue";
import LoginModal from "@/components/slash/LoginModal.vue";
export default {
  props: {},
  components: {
    FolderView,
    FoldersSidebar,
    LoginModal,
  },
  data() {
    return {
      show_login_modal: false,
      folders_path: "folders",
      folders: [],
      current_folder_path: "",
      show_folders_sidebar: false,
    };
  },
  async created() {
    this.$eventHub.$on("login.openModal", this.openLoginModal);
    if (!this.connected_as) {
      this.show_login_modal = true;
    }
    await this.initializeCurrentFolderFromRoute();
  },
  mounted() {},
  beforeDestroy() {
    this.$eventHub.$off("login.openModal", this.openLoginModal);
    if (this.isRoomJoined(this.folders_path)) {
      this.$api.leave({ room: this.folders_path });
    }
  },

  watch: {
    async "$route.params.folder_slug"(new_folder_slug) {
      if (!new_folder_slug) {
        this.current_folder_path = "";
        if (Object.keys(this.$route.query || {}).length) {
          await this.$router.replace({ name: "Accueil", query: {} });
        }
        await this.toggleFoldersSidebar(true);
        return;
      }
      const next_folder_path = `${this.folders_path}/${new_folder_slug}`;
      if (next_folder_path !== this.current_folder_path) {
        this.current_folder_path = next_folder_path;
      }
    },
  },

  methods: {
    isRoomJoined(room) {
      return Array.isArray(this.$api.rooms_joined)
        ? this.$api.rooms_joined.includes(room)
        : false;
    },
    openLoginModal() {
      this.show_login_modal = true;
    },
    async initializeCurrentFolderFromRoute() {
      const folder_slug_from_route = this.$route.params.folder_slug;
      if (folder_slug_from_route) {
        this.current_folder_path = `${this.folders_path}/${folder_slug_from_route}`;
      } else {
        this.current_folder_path = "";
        await this.toggleFoldersSidebar(true);
      }
    },
    async ensureFoldersSidebarData() {
      try {
        this.folders = await this.$api.getFolders({ path: this.folders_path });
      } catch (err) {
        if (err.code === "not_found") {
          await this.createDefaultFolder();
          this.folders = await this.$api.getFolders({
            path: this.folders_path,
          });
        } else {
          throw err;
        }
      }

      if (!Array.isArray(this.folders) || this.folders.length === 0) {
        await this.createDefaultFolder();
        this.folders = await this.$api.getFolders({ path: this.folders_path });
      }

      if (!this.isRoomJoined(this.folders_path)) {
        this.$api.join({ room: this.folders_path });
      }
    },
    async createDefaultFolder() {
      return await this.$api.createFolder({
        path: this.folders_path,
        additional_meta: {
          title: "Default",
          requested_slug: "default",
          $status: "public",
          $contributors: "everyone",
        },
      });
    },
    async toggleFoldersSidebar(force_open) {
      // From a folder: slash/folder button goes home (clean URL, no leftover queries)
      if (this.current_folder_path && typeof force_open !== "boolean") {
        this.current_folder_path = "";
        await this.$router.push({ name: "Accueil", query: {} });
        await this.toggleFoldersSidebar(true);
        return;
      }

      const should_open =
        typeof force_open === "boolean"
          ? force_open
          : !this.show_folders_sidebar;
      if (!should_open) {
        this.closeFoldersSidebar();
        return;
      }
      await this.ensureFoldersSidebarData();
      this.show_folders_sidebar = true;
    },
    closeFoldersSidebar() {
      this.show_folders_sidebar = false;
      if (this.isRoomJoined(this.folders_path)) {
        this.$api.leave({ room: this.folders_path });
      }
    },
    getFolderSlug(folder_path) {
      return folder_path.split("/").pop();
    },
    getSavedFolderViewMode(folder_path) {
      if (!folder_path || typeof localStorage === "undefined") return "";
      try {
        const stored = localStorage.getItem(`slash_view_mode:${folder_path}`);
        if (
          stored &&
          ["canvas", "grid", "map", "timeline"].includes(stored)
        ) {
          return stored;
        }
      } catch (err) {
        // ignore storage errors
      }
      return "";
    },
    buildFolderRouteQuery(folder_path) {
      const query = {};
      const saved_view = this.getSavedFolderViewMode(folder_path);
      if (saved_view) query.view = saved_view;
      return query;
    },
    async selectFolder(folder_path, { replace = false } = {}) {
      if (!folder_path || folder_path === this.current_folder_path) {
        return;
      }

      this.current_folder_path = folder_path;

      const folder_slug = this.getFolderSlug(folder_path);
      const router_method = replace ? "replace" : "push";
      this.$router[router_method]({
        name: "Folder",
        params: { folder_slug },
        query: this.buildFolderRouteQuery(folder_path),
      });

      this.closeFoldersSidebar();
    },
    async openNewFolder(new_folder_slug) {
      await this.$api.updateStore(this.folders_path);
      this.folders = await this.$api.getFolders({ path: this.folders_path });
      await this.selectFolder(`${this.folders_path}/${new_folder_slug}`);
    },
    async onCurrentFolderRemoved() {
      this.current_folder_path = "";
      await this.$router.replace({ name: "Accueil", query: {} });
      await this.$api.updateStore(this.folders_path);
      await this.ensureFoldersSidebarData();
      await this.toggleFoldersSidebar(true);
    },
  },
};
</script>
<style lang="scss" scoped>
._homeView {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  height: 100%;
  /* Slash charter: sharp corners, not soft pills */
  --border-radius: 0;
}

._homeLayout {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--c-gris_clair);
}

._folderViewPane {
  position: absolute;
  inset: 0;
  min-width: 0;
}

.foldersPanel-enter-active,
.foldersPanel-leave-active {
  transition: opacity 0.22s cubic-bezier(0.19, 1, 0.22, 1),
    transform 0.22s cubic-bezier(0.19, 1, 0.22, 1);
}

.foldersPanel-enter,
.foldersPanel-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.folderViewTransition-enter-active,
.folderViewTransition-leave-active {
  transition: opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}

.folderViewTransition-enter,
.folderViewTransition-leave-to {
  opacity: 0;
}
</style>
