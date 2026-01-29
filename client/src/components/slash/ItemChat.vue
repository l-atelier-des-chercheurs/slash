<template>
  <BaseModal2
    :title="$t('file_path')"
    :is_closable="true"
    @close="$emit('close')"
  >
    <p class="_itemChat--pathContent">{{ filePath }}</p>
  </BaseModal2>
</template>
<script>
export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
  },
  computed: {
    filePath() {
      return this.file.$path ?? "";
    },
  },
};
</script>
<style lang="scss" scoped>
._itemChat--pathContent {
  word-break: break-all;
  margin: 0;
}
</style>
