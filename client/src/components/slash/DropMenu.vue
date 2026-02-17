<template>
  <div class="_dropMenu">
    <div class="_dropMenu--content">
      <button
        v-if="connected_as"
        type="button"
        class="_dropMenu--userLabel"
        :style="{ backgroundColor: connected_as?.color }"
        @click="openLoginModal()"
      >
        {{ connected_as.name }}
      </button>
      <button
        class="_dropMenu--openButton"
        :title="$t('import')"
        :style="{ backgroundColor: connected_as?.color }"
        @click="openFileImport()"
      >
        <b-icon icon="plus-lg" scale="1" />
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
      />
    </div>
  </div>
</template>
<script>
export default {
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
      return {
        x: this.canvas_scroll.x + 50,
        y: this.canvas_scroll.y + 50,
        width: this.canvas_zoom
          ? Math.round(baseWidth / this.canvas_zoom)
          : baseWidth,
      };
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
  pointer-events: none;
}

._dropMenu--content {
  position: fixed;
  z-index: 900;
  top: calc(var(--spacing) * 2);
  left: calc(var(--spacing) * 2);
  padding: calc(var(--spacing) / 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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
  width: 72px;
  height: 72px;
  font-size: 20px;
  border-radius: 50%;
  background-color: white;
  color: var(--c-noir);
  pointer-events: auto;

  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);

  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  flex-shrink: 0;

  &:hover {
    background-color: var(--c-gris_clair);
  }
  &:active {
    background-color: var(--c-gris);
  }
  &:focus {
    outline: none;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

._dropMenu--userLabel {
  position: absolute;
  right: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  white-space: nowrap;

  background: white;
  color: var(--c-noir);
  font-weight: 600;
  pointer-events: auto;
}
</style>
