<template>
  <div class="_importCreateTextButtons--import">
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
  },
};
</script>
<style lang="scss" scoped>
._importCreateTextButtons--import {
  position: fixed;
  bottom: 0;
  right: 0;
  // width: 300px;
  // height: 300px;
  background: white;
  z-index: 1000;
  border: 1px solid var(--c-gris);
  border-radius: 4px;
  padding: 10px;
}
</style>
