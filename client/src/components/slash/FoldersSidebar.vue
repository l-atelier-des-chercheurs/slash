<template>
  <div class="_foldersPanel" :class="{ 'is--overlay': is_overlay }">
    <div class="_foldersPanel--inner">
      <header class="_foldersPanel--header">
        <div>
          <h1 class="_foldersPanel--title">Your folders</h1>
          <p class="_foldersPanel--subtitle">Pick a folder to open it</p>
        </div>
        <div class="_foldersPanel--headerButtons">
          <button
            v-if="is_overlay"
            type="button"
            class="u-button u-button_icon"
            title="Close"
            @click="$emit('close')"
          >
            <b-icon icon="x-lg" />
          </button>
        </div>
      </header>

      <div class="_foldersPanel--grid">
        <button
          type="button"
          class="_foldersPanel--card is--create"
          @click="show_create_folder_modal = true"
        >
          <div class="_foldersPanel--cardIcon is--create">
            <b-icon icon="plus-lg" />
          </div>
          <span class="_foldersPanel--cardTitle">New folder</span>
        </button>

        <button
          v-for="folder in sorted_folders"
          :key="folder.$path"
          type="button"
          class="_foldersPanel--card u-card2"
          :class="{
            'is--active': folder.$path === current_folder_path,
            'is--disabled': !canAccessFolder(folder),
          }"
          :disabled="!canAccessFolder(folder)"
          :title="!canAccessFolder(folder) ? 'Private folder' : ''"
          @click="onSelectFolder(folder)"
        >
          <!-- <div
            class="_foldersPanel--cardIcon"
            :style="{ backgroundColor: getFolderColor(folder) }"
          >
            <b-icon icon="folder-fill" />
          </div> -->
          <span class="_foldersPanel--cardTitle">{{
            folder.title || folder.$path.split("/").pop()
          }}</span>
          <span v-if="isPrivateFolder(folder)" class="_foldersPanel--cardBadge">
            <b-icon icon="file-lock2-fill" />
            Private
          </span>
        </button>
      </div>
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

const FOLDER_COLORS = [
  "#ffd166",
  "#06d6a0",
  "#118ab2",
  "#ef476f",
  "#8338ec",
  "#fb5607",
  "#3a86ff",
  "#ff006e",
];

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
    is_overlay: {
      type: Boolean,
      default: false,
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
    canAccessFolder(folder) {
      if (typeof this.canLoggedinSeeFolder !== "function") return true;
      return this.canLoggedinSeeFolder({ folder });
    },
    isPrivateFolder(folder) {
      return folder?.$status === "private";
    },
    getFolderColor(folder) {
      const label = folder.title || folder.$path.split("/").pop() || "";
      let hash = 0;
      for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
      }
      return FOLDER_COLORS[Math.abs(hash) % FOLDER_COLORS.length];
    },
    onSelectFolder(folder) {
      if (!this.canAccessFolder(folder)) return;
      this.$emit("selectFolder", folder.$path);
    },
    onOpenNewFolder(new_folder_slug) {
      this.show_create_folder_modal = false;
      this.$emit("openNewFolder", new_folder_slug);
    },
  },
};
</script>

<style lang="scss" scoped>
._foldersPanel {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--c-blanc);
  overflow: auto;

  &.is--overlay {
    z-index: 9000;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(12px);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  }
}

._foldersPanel--inner {
  width: 100%;
  max-width: min(1280px, 100%);
  margin: 0 auto;
  padding: calc(var(--spacing) * 2);
  gap: calc(var(--spacing) * 1.5);
}

._foldersPanel--header {
  position: sticky;
  top: 0;
  padding: calc(var(--spacing)) 0;
  z-index: 100;
  background: white;
  margin-bottom: calc(var(--spacing) * 2);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(var(--spacing) / 1);
  flex-shrink: 0;
}

._foldersPanel--title {
  margin: 0 0 calc(var(--spacing) / 4);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

._foldersPanel--subtitle {
  margin: 0;
  font-size: var(--sl-font-size-medium);
  color: var(--c-text-secondary, #666);
}

._foldersPanel--headerButtons {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  flex-shrink: 0;
}

._foldersPanel--grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: calc(var(--spacing) * 1.25);
  align-content: start;
  // overflow: auto;
  padding-bottom: calc(var(--spacing) / 2);
}

._foldersPanel--card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--spacing) / 1);
  min-height: 190px;
  padding: calc(var(--spacing) * 1.25);
  text-align: left;
  background: var(--c-blanc);
  border: 2px solid var(--c-gris);
  border-radius: calc(var(--border-radius) * 1.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    border-color 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &:hover:not(.is--disabled),
  &:focus-visible:not(.is--disabled) {
    transform: translateY(-4px);
    border-color: var(--c-noir);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  }

  &.is--active {
    pointer-events: none;
    border-color: var(--c-noir);
    // box-shadow: 0 0 0 3px var(--c-noir), 0 12px 32px rgba(0, 0, 0, 0.12);
  }

  &.is--disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  &.is--create {
    border-style: dashed;
    border-color: var(--c-gris);
    background: var(--c-gris_clair);
    box-shadow: none;

    &:hover,
    &:focus-visible {
      border-color: var(--c-noir);
      background: var(--c-blanc);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }
  }
}

._foldersPanel--cardIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: calc(var(--border-radius) * 1.25);
  color: var(--c-noir);
  font-size: 1.75rem;
  flex-shrink: 0;

  &.is--create {
    background: var(--c-blanc);
    border: 2px dashed var(--c-gris);
    color: var(--c-noir);
  }
}

._foldersPanel--cardTitle {
  font-size: var(--sl-font-size-large);
  // font-weight: 700;
  // line-height: 1.25;
  word-break: break-word;
}

._foldersPanel--cardBadge {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  margin-top: auto;
  padding: calc(var(--spacing) / 4) calc(var(--spacing) / 2);
  border-radius: var(--border-radius);
  background: var(--c-gris_clair);
  font-size: var(--sl-font-size-x-small);
  font-weight: 600;
  opacity: 0.85;
}
</style>
