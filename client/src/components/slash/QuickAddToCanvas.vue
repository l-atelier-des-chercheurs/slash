<template>
  <div
    class="u-overlayPanel _quickAddToCanvas"
    :style="{
      left: position_x + 'px',
      top: position_y + 'px',
    }"
    @mousedown="handlePanelMouseDown"
  >
    <div class="_text_input_container">
      <input
        v-model="new_text"
        ref="text_input"
        type="text"
        class="_quick_note_input"
        :class="{ 'is--error': is_over_limit }"
        placeholder="Quick note (99 chars max)"
        @keyup.enter="createText"
        autocomplete="off"
      />
      <button
        type="button"
        class="u-button_icon"
        :disabled="!can_submit"
        @click="createText"
      >
        <b-icon icon="check-lg" />
      </button>
    </div>
    <p
      v-if="has_text_entered"
      class="_quick_note_meta"
      :class="{ 'is--error': is_over_limit }"
    >
      <span v-if="is_over_limit" class="_quick_note_error">
        Max 99 characters — use Text for longer content
      </span>
      <span class="_quick_note_count">{{ character_count }} / 99</span>
    </p>
    <p v-if="!has_text_entered" class="_quick_note_hint">
      For longer content, use Text below.
    </p>
    <DropMenuPanel
      v-if="!has_text_entered"
      :folder_path="folder_path"
      :additional_meta="additional_meta"
      @close="handleClose"
    />
  </div>
</template>
<script>
import DropMenuPanel from "@/components/slash/DropMenuPanel.vue";
import {
  QUICK_NOTE_MAX_LENGTH,
  QUICK_NOTE_HEIGHT,
  normalizeQuickNoteText,
  measureQuickNoteWidth,
} from "@/utils/quickNoteUtils.js";

export default {
  name: "QuickAddToCanvas",
  components: {
    DropMenuPanel,
  },
  props: {
    additional_meta: {
      type: Object,
      default: () => null,
    },
    folder_path: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      new_text: "",
    };
  },
  mounted() {
    this.focusInputField();
  },
  watch: {
    additional_meta: {
      handler() {
        this.$nextTick(() => this.focusInputField());
      },
    },
  },
  computed: {
    position_x() {
      return this.additional_meta?.x ?? 0;
    },
    position_y() {
      return this.additional_meta?.y ?? 0;
    },
    character_count() {
      return this.new_text.length;
    },
    is_over_limit() {
      return this.character_count > QUICK_NOTE_MAX_LENGTH;
    },
    has_text_entered() {
      return this.new_text.length > 0;
    },
    can_submit() {
      return this.new_text.trim().length > 0 && !this.is_over_limit;
    },
  },
  methods: {
    focusInputField() {
      const input = this.$refs.text_input;
      if (input) input.focus();
    },
    handlePanelMouseDown(event) {
      if (event.target.closest("button, label, input[type='file']")) return;
      this.focusInputField();
    },
    handleClose() {
      this.$emit("close");
    },
    async createText() {
      if (!this.can_submit) return;

      const text = normalizeQuickNoteText(this.new_text);

      const additional_meta = {
        $type: "canvas_text",
        text,
        x: this.additional_meta?.x,
        y: this.additional_meta?.y,
        width: measureQuickNoteWidth(text),
        height: QUICK_NOTE_HEIGHT,
        requested_slug: `text`,
      };
      if (this.connected_as?.$path)
        additional_meta.$authors = [this.connected_as.$path];

      await this.$api.uploadFile({
        path: this.folder_path,
        additional_meta,
      });

      this.$emit("close");
    },
  },
};
</script>
<style lang="scss" scoped>
._quickAddToCanvas {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  border-top-left-radius: 0;
  width: 320px;

  transform-origin: top left;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &::before {
    content: "";
    position: absolute;
    top: -0.5rem;
    left: -0.5rem;
    width: 1rem;
    height: 1rem;
    background: var(--color-rule);
    border-radius: 50%;
    z-index: -1;
  }
}

._text_input_container {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--spacing) / 2);
  margin-bottom: calc(var(--spacing) / 8);

  ._quick_note_input {
    flex: 1;
    min-width: 0;
    font-size: 150%;
    height: auto;
    min-height: 2.2em;

    &.is--error {
      border-color: var(--c-rouge, #fc4b60);
    }
  }
}

._quick_note_meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--spacing) / 4);
  margin: 0 0 calc(var(--spacing) / 4);
  font-size: 0.75rem;
  line-height: 1.3;
  opacity: 0.65;

  &.is--error {
    opacity: 1;
    color: var(--c-rouge, #fc4b60);
  }
}

._quick_note_error {
  flex: 1 1 100%;
}

._quick_note_count {
  margin-left: auto;
}

._quick_note_hint {
  margin: 0 0 calc(var(--spacing) / 4);
  font-size: 0.75rem;
  line-height: 1.3;
  opacity: 0.65;
}
</style>
