<template>
  <BaseModal2
    :title="file.$name"
    :is_closable="true"
    @close="showFileModal = false"
  >
    <div class="_itemModal--content">
      <MediaContent
        :file="file"
        :context="'full'"
        :resolution="resolution"
        :plyr_options="{ controls: ['play', 'progress'] }"
      />
    </div>
    <div class="_itemModal--meta">
      <button type="button" class="u-button" @click="show_item_modal = false">
        {{ $t("informations") }}
      </button>
      <button class="u-button" @click="show_item_modal = false">
        {{ $t("chats") }}
      </button>
    </div>
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
  components: {},
  data() {
    return {};
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
  methods: {},
};
</script>
<style lang="scss" scoped></style>
