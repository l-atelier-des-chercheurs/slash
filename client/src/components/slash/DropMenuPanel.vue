<template>
  <div class="_dropMenu--panelWrapper">
    <div
      v-for="(row, index) in typeRows"
      :key="row.id"
      class="_dropMenu--item"
      :style="{
        '--transition-delay': `${(typeRows.length - 1 - index) * 20}ms`,
      }"
    >
      <template v-if="row.accept">
        <label
          :for="inputId(row)"
          class="u-button u-button_icon _dropMenu--btn"
          :title="row.label"
        >
          <b-icon :icon="row.icon" class="_dropMenu--icon" />
          <span v-if="show_labels" class="_dropMenu--label">{{
            row.label
          }}</span>
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
        class="u-button u-button_icon _dropMenu--btn"
        :title="row.label"
        @click.prevent="handleLabelClick(row)"
      >
        <b-icon :icon="row.icon" class="_dropMenu--icon" />
        <span v-if="show_labels" class="_dropMenu--label">{{ row.label }}</span>
      </button>
    </div>

    <UploadFiles
      v-if="files_to_import.length > 0"
      :files_to_import="files_to_import"
      :path="folder_path"
      :allow_caption_edition="true"
      :additional_meta="additional_meta"
      @importedMedias="onImportedMedias"
      @close="
        files_to_import = [];
        $emit('close');
      "
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
    show_labels: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      panel_uid: `dropmenu-${Math.random().toString(36).slice(2, 10)}`,
      typeRows: [
        // { id: "text", label: this.$t("text"), icon: "file-earmark-text" },
        // { id: "embed", label: this.$t("embed"), icon: "puzzle" },
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
        {
          id: "text",
          label: this.$t("write"),
          icon: "text-paragraph",
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
      return `_dropMenu--file-${this.panel_uid}-${row.id}`;
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
        const filename = `text-${+new Date()}.txt`;
        const additional_meta = {
          x: this.additional_meta?.x,
          y: this.additional_meta?.y,
          width: this.additional_meta?.width,
        };
        if (this.connected_as?.$path) {
          additional_meta.$authors = [this.connected_as.$path];
        }

        const { meta_filename } = await this.$api.uploadText({
          path: this.folder_path,
          filename,
          additional_meta,
        });

        const path = `${this.folder_path}/${meta_filename}`;
        this.$eventHub.$emit("canvasItem.openWithTransition", path);
        this.$nextTick(() => {
          // Trigger once when modal is likely mounted, then retry once for safety.
          setTimeout(() => {
            this.$eventHub.$emit(`media.enableEditor.${path}`);
          }, 350);
          setTimeout(() => {
            this.$eventHub.$emit(`media.enableEditor.${path}`);
          }, 900);
        });

        this.$emit("close");
      }
    },
    onImportedMedias(medias) {
      this.$emit("importedMedias", medias);
      this.$emit("close");
    },
  },
};
</script>
<style lang="scss" scoped>
._dropMenu--panelWrapper {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-end;
  gap: calc(var(--spacing) / 4);
  user-select: none;
}

._dropMenu--panel {
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
  gap: calc(var(--spacing) / 2);

  cursor: pointer;
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
