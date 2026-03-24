<template>
  <div class="_homeView">
    <LoginModal v-if="show_login_modal" @close="show_login_modal = false" />

    <div class="_homeLayout">
      <transition name="sidebarPush">
        <FoldersSidebar
          v-if="show_folders_sidebar"
          :folders="folders"
          :current_folder_path="current_folder_path"
          :folders_path="folders_path"
          @close="closeFoldersSidebar"
          @selectFolder="selectFolder"
          @openNewFolder="openNewFolder"
        />
      </transition>

      <div v-if="current_folder_path" class="_folderViewPane">
        <FolderView
          :key="current_folder_path"
          :folder_path="current_folder_path"
          :current_folder_title="current_folder_title"
          @openFoldersSidebar="openFoldersSidebar"
          @openCurrentFolderSettings="openCurrentFolderSettings"
          @folderLoaded="onFolderLoaded"
        />
      </div>
    </div>

    <BaseModal2
      v-if="show_folder_settings_modal && current_folder_details"
      :title="'Folder settings'"
      @close="closeCurrentFolderSettings"
    >
      <div class="u-spacingBottom">
        <TitleField
          :label="$t('title')"
          :field_name="'title'"
          :content="current_folder_details.title"
          :path="current_folder_details.$path"
          :required="true"
          :maxlength="60"
          :can_edit="can_edit_current_folder"
        />
      </div>

      <div class="u-spacingBottom">
        <DLabel :str="$t('status')" />
        <StatusTag
          :status="current_folder_status"
          :path="current_folder_details.$path"
          :can_edit="can_edit_current_folder"
          :status_options="['public', 'private']"
          :show_label="true"
        />
      </div>

      <AdminsAndContributorsField
        :folder="current_folder_details"
        :can_edit="can_edit_current_folder"
      />
    </BaseModal2>
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
      current_folder_title: "",
      show_folders_sidebar: false,
      show_folder_settings_modal: false,
      current_folder_details: null,
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
        this.current_folder_title = "";
        await this.openFoldersSidebar();
        return;
      }
      const next_folder_path = `${this.folders_path}/${new_folder_slug}`;
      if (next_folder_path !== this.current_folder_path) {
        this.current_folder_path = next_folder_path;
      }
      this.show_folders_sidebar = false;
      if (Array.isArray(this.folders) && this.folders.length > 0) {
        const matched_folder = this.folders.find(
          (folder) => folder.$path === next_folder_path
        );
        if (matched_folder?.title) {
          this.current_folder_title = matched_folder.title;
        }
      }
    },
  },

  computed: {
    can_edit_current_folder() {
      if (!this.current_folder_details) return false;
      if (typeof this.canLoggedinEditFolder !== "function") return true;
      return this.canLoggedinEditFolder({ folder: this.current_folder_details });
    },
    current_folder_status() {
      if (!this.current_folder_details?.$status) return "public";
      return this.current_folder_details.$status === "private"
        ? "private"
        : "public";
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
        this.current_folder_title = "";
        await this.openFoldersSidebar();
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
      const current_folder = this.folders.find(
        (folder) => folder.$path === this.current_folder_path
      );
      if (current_folder?.title) {
        this.current_folder_title = current_folder.title;
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
    async openFoldersSidebar() {
      await this.ensureFoldersSidebarData();
      this.show_folders_sidebar = true;
    },
    closeFoldersSidebar() {
      this.show_folders_sidebar = false;
      if (this.isRoomJoined(this.folders_path)) {
        this.$api.leave({ room: this.folders_path });
      }
    },
    onFolderLoaded({ path, title } = {}) {
      if (!path || path !== this.current_folder_path) return;
      this.current_folder_title = title || this.current_folder_title;
    },
    async openCurrentFolderSettings() {
      if (!this.current_folder_path) return;
      this.current_folder_details = await this.$api.getFolder({
        path: this.current_folder_path,
      });
      this.show_folder_settings_modal = true;
    },
    closeCurrentFolderSettings() {
      this.show_folder_settings_modal = false;
      this.current_folder_details = null;
    },
    getFolderSlug(folder_path) {
      return folder_path.split("/").pop();
    },
    async selectFolder(folder_path, { replace = false } = {}) {
      if (!folder_path || folder_path === this.current_folder_path) {
        this.show_folders_sidebar = false;
        return;
      }

      this.current_folder_path = folder_path;
      this.closeFoldersSidebar();

      const folder_slug = this.getFolderSlug(folder_path);
      const router_method = replace ? "replace" : "push";
      this.$router[router_method]({
        path: `/${folder_slug}`,
        query: { ...this.$route.query },
      });
    },
    async openNewFolder(new_folder_slug) {
      await this.$api.updateStore(this.folders_path);
      this.folders = await this.$api.getFolders({ path: this.folders_path });
      await this.selectFolder(`${this.folders_path}/${new_folder_slug}`);
    },
  },
};
</script>
<style lang="scss" scoped>
._homeView {
  position: relative;
  width: 100%;
  height: 100%;
}

._homeLayout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

._folderViewPane {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
}

.sidebarPush-enter-active,
.sidebarPush-leave-active {
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    opacity 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}

.sidebarPush-enter,
.sidebarPush-leave-to {
  transform: translateX(-16px);
  opacity: 0;
}
</style>
