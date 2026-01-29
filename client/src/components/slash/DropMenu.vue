<template>
  <div class="_dropMenu">
    <button
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
    </template>
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
  },
};
</script>
<style lang="scss" scoped>
._dropMenu {
  position: fixed;
  bottom: calc(var(--spacing) * 2);
  right: calc(var(--spacing) * 2);
  // border: 2px solid var(--c-gris_clair);
  // background-color: var(--c-bleuvert);
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);

  padding: calc(var(--spacing) / 1);
}

._loginButton {
  width: 100%;
}
</style>
