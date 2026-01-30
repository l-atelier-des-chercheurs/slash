<template>
  <div class="_dropMenu">
    <div
      class="_dropMenu--overlay"
      :class="{ 'is--open': is_open }"
      @click="toggleOpen()"
    ></div>

    <div
      class="_dropMenu--content"
      :class="{
        'is--open': is_open,
      }"
    >
      <div class="_dropMenu--panel" :class="{ 'is--open': is_open }">
        <div
          v-for="(row, index) in typeRows"
          :key="row.id"
          class="_dropMenu--row"
          :style="{
            '--transition-delay': is_open
              ? `${(typeRows.length - 1 - index) * 20}ms`
              : '0ms',
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
          <button v-else type="button" class="_dropMenu--btn" @click.prevent>
            <span class="_dropMenu--label">{{ row.label }}</span>
            <b-icon :icon="row.icon" class="_dropMenu--icon" />
          </button>
        </div>
      </div>

      <div class="_dropMenu--buttonContainer">
        <button
          type="button"
          class="_dropMenu--userLabel"
          @click="openLoginModal()"
        >
          {{ connected_as.name }}
        </button>
        <button
          class="_dropMenu--openButton"
          :title="$t('import')"
          :class="{
            'is--open': is_open,
          }"
          @click="toggleOpen()"
        >
          <b-icon icon="plus-lg" scale="1" />
        </button>
      </div>
    </div>

    <UploadFiles
      v-if="files_to_import.length > 0"
      :files_to_import="files_to_import"
      :path="folder_path"
      :allow_caption_edition="true"
      @importedMedias="mediasJustImported($event)"
      @close="files_to_import = []"
    />
  </div>
</template>
<script>
import ImportFileZone from "@/adc-core/ui/ImportFileZone.vue";

export default {
  props: {
    folder_path: String,
  },
  components: {
    ImportFileZone,
  },
  data() {
    return {
      files_to_import: [],
      is_open: false,
      typeRows: [
        { id: "texte", label: this.$t("text"), icon: "file-earmark-text" },
        { id: "embed", label: this.$t("embed"), icon: "puzzle" },
        {
          id: "audio",
          label: this.$t("audio"),
          icon: "record-circle-fill",
          accept: "audio/*",
        },
        {
          id: "fichier",
          label: this.$t("file"),
          icon: "file-earmark",
          accept: "*/*",
        },
        {
          id: "video",
          label: this.$t("video"),
          icon: "play-fill",
          accept: "video/*",
        },
        {
          id: "image",
          label: this.$t("image"),
          icon: "image",
          accept: "image/*",
        },
      ],
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
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
    mediasJustImported(medias) {
      console.log(medias);
    },
    openLoginModal() {
      this.$eventHub.$emit("login.openModal");
    },
    toggleOpen() {
      this.is_open = !this.is_open;
    },
  },
};
</script>
<style lang="scss" scoped>
$_peach: #f5d0a9;
$_peach_dark: #e8bc85;

._dropMenu {
  pointer-events: none;
}

._dropMenu--content {
  position: fixed;
  z-index: 1002;
  bottom: calc(var(--spacing) * 2);
  right: calc(var(--spacing) * 2);
  padding: calc(var(--spacing) / 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
}
._dropMenu--overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.4);
  z-index: 1001;
  backdrop-filter: blur(10px);

  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);

  opacity: 0;

  &.is--open {
    opacity: 1;
    pointer-events: auto;
  }
}

._dropMenu--buttonContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

._dropMenu--openButton {
  width: 72px;
  height: 72px;
  font-size: 30px;
  border-radius: 40%;
  background-color: white;
  color: var(--c-noir);
  pointer-events: auto;

  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);

  color: var(--c-noir);
  border: none;
  cursor: pointer;
  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
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

  &.is--open {
    transform: rotate(225deg);
    background-color: var(--c-noir);
    border-radius: 50%;
    color: white;

    &:hover {
      background-color: var(--c-gris_fonce);
    }
  }
}

._dropMenu--panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;

  &.is--open {
    pointer-events: auto;
  }
}

._dropMenu--row {
  opacity: 0;
  transition-property: opacity;
  transition-duration: 0.3s;
  transition-timing-function: ease;
  transition-delay: var(--transition-delay);

  ._dropMenu--panel.is--open & {
    opacity: 1;
  }
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
  // width: 30px;
  // height: 30px;
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

._dropMenu--userLabel {
  position: absolute;
  right: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);

  background: white;
  color: var(--c-noir);
  font-weight: 600;
  pointer-events: auto;
}
</style>
