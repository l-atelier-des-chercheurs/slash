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
      <div v-show="is_open" class="_dropMenu--panel">
        <div v-for="row in typeRows" :key="row.id" class="_dropMenu--row">
          <button type="button" class="_dropMenu--btn" @click.prevent>
            <span class="_dropMenu--label">{{ row.label }}</span>
            <b-icon :icon="row.icon" class="_dropMenu--icon" />
          </button>
        </div>
        <div class="_dropMenu--footer"></div>
      </div>

      <div class="_dropMenu--buttonContainer">
        <button type="button" class="_dropMenu--userLabel">Louis</button>
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

      <!-- <button
      class="u-button u-button_white u-spacingBottom _loginButton"
      @click="openLoginModal()"
      style="margin-bottom: 12px; margin-right: 8px"
    >
      <template v-if="$root.slash_logged_in_as?.name">
        {{ $root.slash_logged_in_as.name }}
      </template>
      <template v-else>Login</template>
    </button>

    <template v-if="$root.slash_logged_in_as">
      <ImportFileZone :multiple="true" :files_to_import.sync="files_to_import">
        <template #trigger>
          <button class="u-button u-button_white">
            <b-icon icon="upload" :label="$t('import')" />
          </button>
        </template>
      </ImportFileZone>
      <UploadFiles
        v-if="files_to_import.length > 0"
        :files_to_import="files_to_import"
        :path="folder_path"
        :allow_caption_edition="false"
        @importedMedias="mediasJustImported($event)"
        @close="files_to_import = []"
      />
    </template> -->
    </div>
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
        { id: "texte", label: "Texte", icon: "file-earmark-text" },
        { id: "marqueur", label: "Marqueur", icon: "circle-fill" },
        { id: "integration", label: "Intégration", icon: "puzzle" },
        { id: "audio", label: "Audio", icon: "record-circle-fill" },
        { id: "fichier", label: "Fichier", icon: "file-earmark" },
        { id: "video", label: "Vidéo", icon: "play-fill" },
        { id: "image", label: "Image", icon: "image" },
      ],
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
  methods: {
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
  z-index: 10002;
  bottom: calc(var(--spacing) * 2);
  right: calc(var(--spacing) * 2);
  padding: calc(var(--spacing) / 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: auto;

  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
}
._dropMenu--overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.4);
  z-index: 10001;
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
  font-size: 36px;
  border-radius: 50%;
  background-color: white;

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
    color: white;
  }
}

._dropMenu--panel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

._dropMenu--row {
  // margin-right: 20px;
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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

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

._dropMenu--footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 8px;
  padding-top: 8px;
}

._dropMenu--userLabel {
  position: absolute;
  right: 100%;
  // padding: 4px 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  // border-radius: 6px;
  background: white;
  color: var(--c-noir);
  font-weight: 600;
}
</style>
