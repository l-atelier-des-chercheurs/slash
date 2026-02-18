<template>
  <div class="_itemMeta">
    <strong class="_itemMeta--filename">
      {{ file.$media_filename }}
    </strong>

    <hr class="_itemMeta--separator" />

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

    <div class="_itemMeta--remove">
      <button
        type="button"
        class="u-button u-button_red u-button_small"
        @click="show_remove_menu = true"
      >
        <b-icon icon="trash" />
        {{ $t("remove") }}
      </button>
    </div>

    <RemoveMenu2
      v-if="show_remove_menu"
      :path="file.$path"
      :modal_title="$t('remove_media')"
      @close="show_remove_menu = false"
      @removedSuccessfully="onRemovedSuccessfully"
    />
  </div>
</template>
<script>
import PositionPicker from "@/adc-core/inputs/PositionPicker.vue";
import RemoveMenu2 from "@/adc-core/fields/RemoveMenu2.vue";

export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
  },
  components: {
    PositionPicker,
    RemoveMenu2,
  },
  data() {
    return {
      show_remove_menu: false,
    };
  },
  computed: {
    authors_path() {
      return this.file.$authors || "noone";
    },
  },
  methods: {
    onRemovedSuccessfully() {
      this.show_remove_menu = false;
      this.$emit("removed");
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
  padding: calc(var(--spacing) * 1) calc(var(--spacing) * 1.5);
}

._itemMeta--filename {
  // font-size: var(--sl-font-size-large);
  // font-weight: 600;
  text-align: center;

  display: block;
  // padding-bottom: calc(var(--spacing) / 2);
}

._itemMeta--separator {
  // border: none;
  // border-bottom: 2px solid var(--c-gris_clair);
  margin-bottom: calc(var(--spacing));
  max-width: 50px;
  margin-left: auto;
  margin-right: auto;
}

._itemMeta--remove {
  margin-top: auto;
  padding-top: calc(var(--spacing) * 1);
}
</style>
