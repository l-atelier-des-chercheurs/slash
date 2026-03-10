<template>
  <div class="_dropMenu">
    <div class="_dropMenu--content u-overlayPanel">
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

      <DropMenuPanel
        :folder_path="folder_path"
        :additional_meta="additional_meta"
      />

      <!-- <button
        class="u-button u-button_transparent _dropMenu--openButton"
        :title="$t('import')"
        @click="openFileImport()"
      >
        <b-icon icon="plus" scale="1.5" />
      </button>
      <input
        ref="file_input"
        type="file"
        class="_dropMenu--fileInput"
        accept="*/*"
        multiple
        @change="onFileSelect"
      />
      <UploadFiles
        v-if="files_to_import.length > 0"
        :files_to_import="files_to_import"
        :path="folder_path"
        :allow_caption_edition="true"
        :additional_meta="additional_meta"
        @importedMedias="$emit('importedMedias', $event)"
        @close="files_to_import = []"
      /> -->
    </div>
  </div>
</template>
<script>
import DropMenuPanel from "@/components/slash/DropMenuPanel.vue";

export default {
  components: {
    DropMenuPanel,
  },
  props: {
    folder_path: String,
    canvas_zoom: Number,
    canvas_scroll: Object,
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
  display: flex;
  flex-direction: row nowrap;
  align-items: center;
  overflow: hidden;
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

._dropMenu--userLabel__color {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  margin-right: calc(var(--spacing) / 4);
  line-height: 0;
}
</style>
