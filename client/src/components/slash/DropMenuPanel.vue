<template>
  <div class="_dropMenu--panelWrapper">
    <div class="_dropMenu--panel">
      <div
        v-for="(row, index) in typeRows"
        :key="row.id"
        class="_dropMenu--row"
        :style="{
          '--transition-delay': `${(typeRows.length - 1 - index) * 20}ms`,
        }"
      >
        <template v-if="row.accept">
          <label :for="inputId(row)" class="_dropMenu--btn">
            <span class="_dropMenu--label">{{ row.label }}</span>
            <b-icon :icon="row.icon" class="_dropMenu--icon" />
          </label>
          <input
            :id="inputId(row)"
            type="file"
            class="_dropMenu--fileInput"
            :accept="row.accept"
            multiple
            @change="onFileSelect($event, row)"
          />
        </template>
        <button
          v-else
          type="button"
          class="_dropMenu--btn"
          @click.prevent="handleLabelClick(row)"
        >
          <span class="_dropMenu--label">{{ row.label }}</span>
          <b-icon :icon="row.icon" class="_dropMenu--icon" />
        </button>
      </div>
    </div>

    <UploadFiles
      v-if="files_to_import.length > 0"
      :files_to_import="files_to_import"
      :path="folder_path"
      :allow_caption_edition="true"
      :additional_meta="additional_meta"
      @importedMedias="onImportedMedias"
      @close="files_to_import = []"
    />
  </div>
</template>
<script>
export default {
  name: "DropMenuPanel",
  props: {
    folder_path: {
      type: String,
      default: "",
    },
    additional_meta: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      typeRows: [
        { id: "text", label: this.$t("text"), icon: "file-earmark-text" },
        { id: "embed", label: this.$t("embed"), icon: "puzzle" },
        {
          id: "audio",
          label: this.$t("audio"),
          icon: "record-circle-fill",
          accept: "audio/*",
        },
        {
          id: "file",
          label: this.$t("file"),
          icon: "file-earmark",
          accept: "*/*",
        },
        // {
        //   id: "video",
        //   label: this.$t("video"),
        //   icon: "play-fill",
        //   accept: "video/*",
        // },
        // {
        //   id: "image",
        //   label: this.$t("image"),
        //   icon: "image",
        //   accept: "image/*",
        // },
      ],
      files_to_import: [],
    };
  },
  methods: {
    inputId(row) {
      return `_dropMenu--file-${row.id}`;
    },
    onFileSelect($event, row) {
      const files = Array.from($event.target.files || []);
      $event.target.value = "";
      if (files.length) {
        this.files_to_import = files;
      }
    },
    async handleLabelClick(row) {
      if (row.id === "text") {
        const requested_slug = `shape`;

        const additional_meta = {
          $type: "canvas_text",
          text: "Default",
          x: this.additional_meta?.x,
          y: this.additional_meta?.y,
          requested_slug,
        };
        await this.$api.uploadFile({
          $type: "canvas_text",
          path: this.folder_path,
          additional_meta,
        });
        this.$emit("close");
      }
    },
    onImportedMedias(medias) {
      this.$emit("importedMedias", medias);
    },
  },
};
</script>
<style lang="scss" scoped>
._dropMenu--panelWrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing);
  user-select: none;
}

._dropMenu--panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;

  pointer-events: auto;
}

._dropMenu--row {
  opacity: 0;
  transition-property: opacity;
  transition-duration: 0.3s;
  transition-timing-function: ease;
  transition-delay: var(--transition-delay);
  opacity: 1;
}

._dropMenu--btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;

  border: none;
  border-radius: 50%;
  padding: 8px;
  cursor: pointer;
  color: var(--c-noir);
  background: white;
  font-size: 1.25rem;
  font-weight: 500;
  text-transform: lowercase;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);

  &:hover {
    background: var(--c-noir);
    color: white;
  }
  &:focus {
    outline: none;
  }

  ._dropMenu--label {
    position: absolute;
    color: var(--c-noir);
    right: calc(100% + 8px);
  }
}

._dropMenu--icon {
  display: block;
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
</style>
