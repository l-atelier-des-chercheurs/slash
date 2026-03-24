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

    <AdminsAndContributorsField
      :folder="folder"
      :can_edit="can_edit_folder"
    />
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
};
</script>
