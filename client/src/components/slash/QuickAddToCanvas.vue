<template>
  <div
    class="u-overlayPanel _quickAddToCanvas"
    :style="{
      left: position_x + 'px',
      top: position_y + 'px',
    }"
  >
    <div class="_text_input_container">
      <textarea
        v-model="new_text"
        ref="text_input"
        placeholder="Quick note..."
        @keyup.enter="createText"
        @input="autoResizeTextarea"
        autocomplete="off"
        rows="1"
        resize="none"
        maxlength="2000"
      ></textarea>
      <button type="button" class="u-button_icon" @click="createText">
        <b-icon icon="check-lg" />
      </button>
    </div>
    <DropMenuPanel
      :folder_path="folder_path"
      :additional_meta="additional_meta"
      @close="handleClose"
    />
  </div>
</template>
<script>
import DropMenuPanel from "@/components/slash/DropMenuPanel.vue";

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
    zoom: {
      type: Number,
      default: 1,
    },
    folder_path: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      new_text: "",
      max_textarea_lines: 6,
    };
  },
  mounted() {
    this.$refs.text_input.focus();
    this.$nextTick(() => {
      this.autoResizeTextarea();
    });
  },
  computed: {
    position_x() {
      return this.additional_meta?.x ?? 0;
    },
    position_y() {
      return this.additional_meta?.y ?? 0;
    },
    scale() {
      return this.zoom ? 1 / this.zoom : 1;
    },
  },
  methods: {
    autoResizeTextarea() {
      const textarea = this.$refs.text_input;
      if (!textarea) return;

      textarea.style.height = "auto";

      const computed_style = window.getComputedStyle(textarea);
      const line_height =
        Number.parseFloat(computed_style.lineHeight) ||
        Number.parseFloat(computed_style.fontSize) * 1.2;
      const padding_top = Number.parseFloat(computed_style.paddingTop) || 0;
      const padding_bottom =
        Number.parseFloat(computed_style.paddingBottom) || 0;
      const max_height =
        line_height * this.max_textarea_lines + padding_top + padding_bottom;
      const next_height = Math.min(textarea.scrollHeight, max_height);

      textarea.style.height = `${next_height}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > max_height ? "auto" : "hidden";
    },
    handleClose() {
      this.$emit("close");
    },
    async createText() {
      this.autoResizeTextarea();
      const textarea = this.$refs.text_input;
      const text_height = textarea
        ? Math.ceil(textarea.getBoundingClientRect().height)
        : null;

      const additional_meta = {
        $type: "canvas_text",
        text: this.new_text,
        x: this.additional_meta?.x,
        y: this.additional_meta?.y,
        width: this.additional_meta?.width,
        ...(text_height !== null && { height: text_height }),
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
  margin-bottom: calc(var(--spacing) / 4);

  textarea {
    font-size: 150%;
    height: auto;
    min-height: 2.2em;
  }
}
</style>
