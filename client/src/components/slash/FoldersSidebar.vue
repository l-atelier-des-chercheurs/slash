<template>
  <div class="_foldersSidebar">
    <div class="_foldersSidebar--header">
      <strong>Folders</strong>
      <div class="_foldersSidebar--headerButtons">
        <button
          type="button"
          class="u-button u-button_icon"
          title="Create folder"
          @click="show_create_folder_modal = true"
        >
          <b-icon icon="plus-lg" />
        </button>
        <button
          type="button"
          class="u-button u-button_icon"
          title="Close"
          @click="$emit('close')"
        >
          <b-icon icon="x-lg" />
        </button>
      </div>
    </div>

    <div class="_foldersSidebar--list">
      <button
        v-for="folder in sorted_folders"
        :key="folder.$path"
        type="button"
        class="u-button _foldersSidebar--item"
        :class="{ 'is--active': folder.$path === current_folder_path }"
        @click="$emit('selectFolder', folder.$path)"
      >
        {{ folder.title || folder.$path.split("/").pop() }}
      </button>
    </div>

    <CreateFolder
      v-if="show_create_folder_modal"
      :modal_name="'Create folder'"
      :path="folders_path"
      @close="show_create_folder_modal = false"
      @openNew="onOpenNewFolder"
    />
  </div>
</template>

<script>
import CreateFolder from "@/adc-core/modals/CreateFolder.vue";

export default {
  components: {
    CreateFolder,
  },
  props: {
    folders: {
      type: Array,
      default: () => [],
    },
    current_folder_path: {
      type: String,
      default: "",
    },
    folders_path: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      show_create_folder_modal: false,
    };
  },
  computed: {
    sorted_folders() {
      return this.folders
        .slice()
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
  },
  methods: {
    onOpenNewFolder(new_folder_slug) {
      this.show_create_folder_modal = false;
      this.$emit("openNewFolder", new_folder_slug);
    },
  },
};
</script>

<style lang="scss" scoped>
._foldersSidebar {
  flex: 0 0 min(320px, 85vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid var(--c-gris);
  padding: calc(var(--spacing) / 1);
  gap: calc(var(--spacing) / 2);
  overflow: hidden;
}

._foldersSidebar--header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

._foldersSidebar--headerButtons {
  display: flex;
  gap: calc(var(--spacing) / 4);
}

._foldersSidebar--list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 4);
  overflow: auto;
}

._foldersSidebar--item {
  justify-content: flex-start;
  text-align: left;
}
</style>
