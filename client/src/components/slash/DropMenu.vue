<template>
  <div class="_dropMenu">
    <button
      class="u-button u-button_bleuvert u-spacingBottom"
      v-if="$root.slash_logged_in_as"
      @click="openLoginModal()"
      style="margin-bottom: 12px; margin-right: 8px"
    >
      {{
        typeof $root.slash_logged_in_as === "object"
          ? $root.slash_logged_in_as.name
          : $root.slash_logged_in_as
      }}
    </button>

    <ImportFileZone :multiple="true" :files_to_import.sync="files_to_import" />
    <UploadFiles
      v-if="files_to_import.length > 0"
      :files_to_import="files_to_import"
      :path="folder_path"
      :allow_caption_edition="false"
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
  border: 2px solid var(--c-gris_clair);

  padding: calc(var(--spacing) / 2);
  border: 2px solid var(--c-gri);
}
</style>
