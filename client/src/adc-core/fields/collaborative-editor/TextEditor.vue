<template>
  <div class="_textEditor">
    <DLabel
      v-if="label"
      :str="label"
      :instructions="can_edit ? instructions : ''"
    />
    <!-- Read-only display -->
    <div
      v-if="!is_editing"
      class="_textEditor--readOnly"
      :class="{ 'is--noPadding': no_padding }"
      :data-format="save_format"
    >
      <div
        class="_textEditor--content"
        :class="{ 'is--empty': !sanitizedContent }"
      >
        <span v-html="sanitizedContent || placeholder" />
        <EditBtn
          v-if="can_edit"
          class="_textEditor--edit"
          :label="sanitizedContent ? $t('edit') : $t('add')"
          @click="startEditing"
        />
      </div>
    </div>

    <!-- CollaborativeEditor3 (loaded when editing) -->
    <CollaborativeEditor3
      v-else
      ref="collaborativeEditor"
      :instructions="instructions"
      :path="path"
      :sharedb_id="sharedb_id"
      :content="content"
      :placeholder="placeholder"
      :field_to_edit="field_to_edit"
      :scrollingContainer="scrollingContainer"
      :custom_formats="custom_formats"
      :can_edit="can_edit"
      :is_collaborative="is_collaborative"
      :save_format="save_format"
      :content_type="content_type"
      :mode="mode"
      :no_padding="no_padding"
      @input="onInput"
      @save="onSave"
      @contentIsEdited="onContentIsEdited"
      @contentIsNotEdited="onContentIsNotEdited"
    >
      <template #custom_buttons>
        <slot name="custom_buttons" />
      </template>
    </CollaborativeEditor3>
  </div>
</template>

<script>
import DOMPurify from "dompurify";

export default {
  name: "TextEditor",
  props: {
    label: {
      type: String,
      default: "",
    },
    instructions: String,
    path: String,
    sharedb_id: String,
    content: String,
    placeholder: {
      type: String,
      default: "…",
    },
    field_to_edit: {
      type: String,
      default: "$content",
    },
    scrollingContainer: HTMLElement,
    custom_formats: Array,
    can_edit: Boolean,
    is_collaborative: {
      type: Boolean,
      default: false,
    },
    save_format: {
      type: String,
      default: "html",
    },
    content_type: String,
    mode: {
      type: String,
      default: "edit_on_mounted",
    },
    no_padding: Boolean,
  },
  data() {
    return {
      is_editing: false,
    };
  },
  computed: {
    sanitizedContent() {
      if (!this.content) return "";
      if (this.save_format === "raw") {
        // Convert newlines to <br> for raw text format
        return DOMPurify.sanitize(this.content.replace(/\n/g, "<br>"));
      }
      return DOMPurify.sanitize(this.content);
    },
  },
  methods: {
    startEditing() {
      this.is_editing = true;
    },
    stopEditing() {
      this.is_editing = false;
    },
    onInput(value) {
      this.$emit("input", value);
    },
    onSave(value) {
      this.stopEditing();
      this.$emit("save", value);
    },
    onContentIsEdited(event) {
      this.$emit("contentIsEdited", event);
    },
    onContentIsNotEdited() {
      this.stopEditing();
      this.$emit("contentIsNotEdited");
      // Optionally stop editing when content is not being edited anymore
      // Uncomment if you want to return to read-only mode after disabling editor
      // this.stopEditing();
    },
  },
  components: {
    CollaborativeEditor3: () => import("./CollaborativeEditor3.vue"),
  },
};
</script>

<style lang="scss" scoped>
._textEditor {
  position: relative;
  font-size: 100%;

  &--readOnly {
    position: relative;

    &.is--noPadding {
      ._textEditor--content {
        padding: 0;
      }
    }
  }

  &--content {
    padding: 0;
    padding-bottom: 0.4em;
    color: inherit;
    font-size: inherit;
    font-family: inherit;
    font-weight: normal;
    background-color: transparent;

    > * {
      padding: 0;
      margin: 0;
    }

    > span {
      display: inline;
    }

    > img {
      max-width: 30ch;
    }

    blockquote {
      padding: calc(var(--spacing) / 2) calc(var(--spacing) * 1);
      margin: calc(var(--spacing) * 1) 0;
      border: none;
      border-left: 2px solid var(--c-gris);
    }

    pre {
      padding: calc(var(--spacing) / 4) calc(var(--spacing) / 2);
      font-family: "Fira Mono", monospace;
      background-color: var(--c-gris_clair);
      border-radius: var(--border-radius);
      overflow-x: auto;
    }

    &.is--empty {
      font-style: italic;
    }
  }

  &--edit {
    margin-top: calc(var(--spacing) / -1);
    transform: translateY(calc(var(--spacing) / 4));

    /* Hide edit button by default on devices that support hover */
    @media (hover: hover) {
      // opacity: 0;
      transition: opacity 0.2s ease;
    }

    /* Always show on touch devices */
    @media (hover: none) {
      opacity: 1;
    }
  }
}

/* Show edit button on hover for devices that support hover */
._textEditor--readOnly:hover ._textEditor--edit {
  @media (hover: hover) {
    opacity: 1;
  }
}

// Apply same styles as Quill editor for consistency
._textEditor--readOnly[data-format="raw"] {
  ._textEditor--content {
    font-family: "Fira Mono", monospace;
    white-space: pre-wrap;
  }
}
</style>
