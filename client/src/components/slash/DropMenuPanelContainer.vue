<template>
  <div
    class="_dropMenuPanelContainer"
    :style="{
      left: position_x + 'px',
      top: position_y + 'px',
      transform: `scale(${scale})`,
    }"
  >
    <div class="_text_input_container">
      <input
        type="text"
        v-model="new_text"
        ref="text_input"
        placeholder="Text"
        @keyup.enter="createText"
      />
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
  name: "DropMenuPanelContainer",
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
    };
  },
  mounted() {
    this.$refs.text_input.focus();
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
    handleClose() {
      this.$emit("close");
    },
    async createText() {
      const additional_meta = {
        $type: "canvas_text",
        text: this.new_text,
        x: this.additional_meta?.x,
        y: this.additional_meta?.y,
        requested_slug: `text`,
      };
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
._dropMenuPanelContainer {
  position: absolute;
  z-index: 2;

  top: 0;
  left: 0;
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
    background: var(--c-noir);
    border-radius: 50%;
    z-index: -1;
  }

  ::v-deep {
    ._dropMenu--panel {
      flex-flow: row wrap;
    }
    ._dropMenu--btn {
      border-radius: 1rem;
    }
    ._dropMenu--btn ._dropMenu--label {
      position: relative;
      right: auto;
      left: auto;
      // margin-left: 12px;
    }
    ._dropMenu--panelWrapper {
      align-items: flex-start;
    }
  }
}

._text_input_container {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--spacing) / 2);
  margin-bottom: calc(var(--spacing) / 2);

  button {
  }
}
</style>
