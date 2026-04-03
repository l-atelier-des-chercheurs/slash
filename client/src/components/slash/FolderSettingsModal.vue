<template>
  <BaseModal2
    v-if="show_modal && folder"
    :title="'Folder settings'"
    @close="$emit('close')"
  >
    <div class="u-spacingBottom">
      <TitleField
        :label="$t('title')"
        :field_name="'title'"
        :content="folder.title"
        :path="folder.$path"
        :required="true"
        :maxlength="60"
        :can_edit="can_edit_folder"
      />
    </div>

    <div class="u-spacingBottom">
      <DLabel :str="$t('status')" />
      <StatusTag
        :status="folder_status"
        :path="folder.$path"
        :can_edit="can_edit_folder"
        :status_options="['public', 'private']"
        :show_label="true"
      />
    </div>

    <AdminsAndContributorsField :folder="folder" :can_edit="can_edit_folder" />

    <div v-if="can_edit_folder" class="u-spacingBottom">
      <button
        type="button"
        class="u-button u-button_red u-button_small"
        @click="show_remove_menu = true"
      >
        <b-icon icon="trash" />
        {{ $t("remove") }}
      </button>

      <RemoveMenu2
        v-if="show_remove_menu"
        :path="folder.$path"
        :modal_title="$t('remove_folder', { name: folder.title || folder.$path })"
        :modal_expl="$t('remove_folder_expl')"
        :success_notification="$t('folder_was_removed')"
        @close="show_remove_menu = false"
        @removedSuccessfully="onFolderRemovedSuccessfully"
      />
    </div>
  </BaseModal2>
</template>

<script>
export default {
  props: {
    show_modal: {
      type: Boolean,
      default: false,
    },
    folder: {
      type: Object,
      default: null,
    },
    can_edit_folder: {
      type: Boolean,
      default: false,
    },
    folder_status: {
      type: String,
      default: "public",
    },
  },
  data() {
    return {
      show_remove_menu: false,
    };
  },
  methods: {
    onFolderRemovedSuccessfully() {
      this.show_remove_menu = false;
      this.$emit("close");
      this.$emit("folderRemoved");
    },
  },
};
</script>
