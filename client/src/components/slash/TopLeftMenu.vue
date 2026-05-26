<template>
  <div class="_dropMenu">
    <div class="_dropMenu--content u-overlayPanel">
      <div class="_dropMenu--main">
        <div class="_dropMenu--folderLabelWrapper">
          <button
            type="button"
            class="u-button u-button_transparent u-button_icon"
            @click="$emit('toggleFoldersSidebar')"
          >
            <b-icon icon="layout-sidebar" />
          </button>
          <button
            type="button"
            class="u-button u-button_transparent _dropMenu--folderLabel"
            @click="$emit('openCurrentFolderSettings')"
          >
            {{ current_folder_title || "Untitled folder" }}
            &nbsp; <b-icon icon="three-dots" />
          </button>
        </div>

        <div class="_dropMenu--identity">
          <div class="_dropMenu--identityUser">
            <button
              v-if="connected_as"
              type="button"
              class="u-button u-button_transparent u-button_icon _dropMenu--userLabel"
              @click="openLoginModal()"
            >
              <span
                class="_dropMenu--userLabel__color"
                :style="{ backgroundColor: connected_as?.color }"
              ></span>
              {{ connected_as.name }}
            </button>
            <FolderContributorsList v-if="folder" :folder="folder" />
          </div>
          <DropMenuPanel
            :folder_path="folder_path"
            :additional_meta="additional_meta"
            :show_labels="false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import DropMenuPanel from "@/components/slash/DropMenuPanel.vue";
import FolderContributorsList from "@/components/slash/FolderContributorsList.vue";

export default {
  components: {
    DropMenuPanel,
    FolderContributorsList,
  },
  props: {
    folder: Object,
    folder_path: String,
    canvas_zoom: Number,
    canvas_scroll: Object,
    current_folder_title: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      files_to_import: [],
    };
  },
  computed: {
    additional_meta() {
      if (!this.canvas_scroll) return {};
      const baseWidth = 320;
      const width = this.canvas_zoom
        ? Math.round(baseWidth / this.canvas_zoom)
        : baseWidth;
      const x = this.canvas_scroll.topleft_x + 150;
      const y = this.canvas_scroll.topleft_y + 150;

      return { x, y, width };
    },
  },
  methods: {
    openLoginModal() {
      this.$eventHub.$emit("login.openModal");
    },
    openFileImport() {
      this.$refs.file_input?.click();
    },
    onFileSelect(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      if (files.length) {
        this.files_to_import = files;
      }
    },
  },
};
</script>
<style lang="scss" scoped>
._dropMenu {
  position: absolute;
  top: var(--fixed-ui-margins);
  left: var(--fixed-ui-margins);
  z-index: 900;
}

._dropMenu--content {
}

._dropMenu--identity {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  gap: calc(var(--spacing) / 2);
}

._dropMenu--identityUser {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--spacing) / 6);
}

._dropMenu--fileInput {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  pointer-events: none;
}

._dropMenu--openButton {
  display: block;

  padding: calc(var(--spacing) / 2);
  line-height: 0;

  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  flex-shrink: 0;
}

._dropMenu--userLabel {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 2);
  white-space: nowrap;
  font-weight: 600;
  background-color: transparent;
  padding: calc(var(--spacing) / 2);
}

._dropMenu--folderLabelWrapper {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  // justify-content: space-between;
  gap: calc(var(--spacing) / 4);
}

._dropMenu--folderLabel {
  // max-width: 220px;
  font-size: var(--sl-font-size-medium);
  font-weight: 700;
  margin-right: calc(var(--spacing) * 2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

._dropMenu--userLabel__color {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  margin-right: calc(var(--spacing) / 4);
  line-height: 0;
}
</style>
