<template>
  <div class="_itemMeta">
    <div class="u-spacingBottom">
      <TitleField
        :label="$t('caption')"
        :field_name="'caption'"
        :content="file.caption"
        :path="file.$path"
        :input_type="'editor'"
        :custom_formats="['bold', 'italic', 'link', 'emoji']"
        :can_edit="true"
      />
    </div>

    <div class="u-spacingBottom">
      <TagsField
        :label="$t('keywords')"
        :field_name="'keywords'"
        :tag_type="'keywords'"
        :local_suggestions="[]"
        :content="file.keywords"
        :path="file.$path"
        :can_edit="true"
      />
    </div>

    <div class="u-spacingBottom" v-if="authors_path !== 'noone'">
      <AuthorField
        :label="$t('authors')"
        :field="'$authors'"
        :authors_paths="authors_path"
        :path="file.$path"
        :can_edit="false"
        :instructions="$t('file_author_instructions')"
        :no_options="true"
      />
    </div>

    <div
      class="u-spacingBottom"
      v-if="file.$infos && file.$infos.hasOwnProperty('size')"
    >
      <SizeDisplay :size="file.$infos.size" />
    </div>

    <div
      class="u-spacingBottom"
      v-if="file.$infos && file.$infos.hasOwnProperty('duration')"
    >
      <DurationDisplay
        :title="$t('duration')"
        :duration="file.$infos.duration"
      />
    </div>

    <PositionPicker
      :label="$t('location')"
      :field_name="'$location'"
      :content="file.$location"
      :path="file.$path"
      :can_edit="true"
    />
  </div>
</template>
<script>
import PositionPicker from "@/adc-core/inputs/PositionPicker.vue";

export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
  },
  components: {
    PositionPicker,
  },
  computed: {
    authors_path() {
      return this.file.$authors || "noone";
    },
  },
};
</script>
<style lang="scss" scoped>
._itemMeta {
  height: 100%;
  background: white;
  border-radius: var(--border-radius);
  overflow: auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: calc(var(--spacing) * 1);
}
</style>
