<template>
  <div v-if="default_folder" class="_folderView">
    <ViewModeBar v-model="viewMode" />
    <LargeCanvas v-show="viewMode === 'map'" :files="default_folder.$files" />
    <MediaGridView v-show="viewMode === 'grid'" :files="default_folder.$files" />
    <DropMenu class="_dropMenu" :folder_path="default_folder.$path" />
  </div>
</template>
<script>
import DropMenu from "@/components/slash/DropMenu.vue";
import LargeCanvas from "@/components/slash/LargeCanvas.vue";
import MediaGridView from "@/components/slash/MediaGridView.vue";
import ViewModeBar from "@/components/slash/ViewModeBar.vue";
export default {
  props: {},
  components: {
    DropMenu,
    LargeCanvas,
    MediaGridView,
    ViewModeBar,
  },
  data() {
    return {
      default_folder: null,
      viewMode: "map",
    };
  },
  async created() {
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
  watch: {},
  computed: {},
  methods: {
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
