<template>
  <BaseModal2 size="full" :nopadding="true" @close="$emit('close')">
    <div class="_mediaListEditorModal">
      <MediaListWebEditor
        v-if="mode === 'web'"
        ref="webEditor"
        :folder_path="folder_path"
        :resolved_items="resolved_items"
        :media_list_paths="media_list_paths"
        :active_path="active_thumb_path"
      />
      <MediaListPrintEditor
        v-else-if="mode === 'print'"
        :folder_path="folder_path"
        :resolved_items="resolved_items"
        :media_list_paths="media_list_paths"
      />
    </div>
  </BaseModal2>
</template>

<script>
import MediaListThumbsStrip from "@/components/slash/MediaListThumbsStrip.vue";
import MediaListWebEditor from "@/components/slash/MediaListWebEditor.vue";
import MediaListPrintEditor from "@/components/slash/MediaListPrintEditor.vue";

export default {
  components: {
    MediaListThumbsStrip,
    MediaListWebEditor,
    MediaListPrintEditor,
  },
  props: {
    mode: {
      type: String,
      required: true,
      validator: (v) => ["web", "print"].includes(v),
    },
    folder_path: {
      type: String,
      required: true,
    },
    resolved_items: {
      type: Array,
      default: () => [],
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      active_thumb_path: "",
    };
  },
  methods: {
    onThumbSelect(path) {
      this.active_thumb_path = path;
      if (this.mode === "web" && this.$refs.webEditor) {
        this.$refs.webEditor.scrollToPath(path);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListEditorModal {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
</style>
