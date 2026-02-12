<template>
  <div class="_dropMenu" :class="{ 'is--open': is_open }">
    <div class="_dropMenu--overlay" @click="toggleOpen()"></div>

    <div
      class="_dropMenu--content"
      :class="{
        'is--open': is_open,
      }"
    >
      <DropMenuPanel
        v-if="is_open"
        :folder_path="folder_path"
        :additional_meta="additional_meta"
      />

      <div class="_dropMenu--buttonContainer">
        <button
          v-if="connected_as"
          type="button"
          class="_dropMenu--userLabel"
          :style="{ backgroundColor: connected_as.color }"
          @click="openLoginModal()"
        >
          {{ connected_as.name }}
        </button>
        <button
          class="_dropMenu--openButton"
          :title="$t('import')"
          :style="{ backgroundColor: connected_as.color }"
          :class="{
            'is--open': is_open,
          }"
          @click="toggleOpen()"
        >
          <b-icon icon="plus-lg" scale="1" />
        </button>
      </div>
    </div>
  </div>
</template>
<script>
import ImportFileZone from "@/adc-core/ui/ImportFileZone.vue";
import DropMenuPanel from "@/components/slash/DropMenuPanel.vue";

export default {
  props: {
    folder_path: String,
    canvas_zoom: Number,
    canvas_scroll: Object,
  },
  components: {
    ImportFileZone,
    DropMenuPanel,
  },
  data() {
    return {
      is_open: false,
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {
    additional_meta() {
      if (!this.canvas_scroll) return {};
      const baseWidth = 320;
      return {
        x: this.canvas_scroll.x + 50,
        y: this.canvas_scroll.y + 50,
        width: this.canvas_zoom
          ? Math.round(baseWidth / this.canvas_zoom)
          : baseWidth,
      };
    },
  },
  methods: {
    openLoginModal() {
      this.$eventHub.$emit("login.openModal");
    },
    toggleOpen() {
      this.is_open = !this.is_open;
    },
  },
};
</script>
<style lang="scss" scoped>
$_peach: #f5d0a9;
$_peach_dark: #e8bc85;

._dropMenu {
  pointer-events: none;

  &.is--open {
    z-index: 1001;
  }
}

._dropMenu--content {
  position: fixed;
  z-index: 900;
  bottom: calc(var(--spacing) * 2);
  right: calc(var(--spacing) * 2);
  padding: calc(var(--spacing) / 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
}
._dropMenu--overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.4);
  // z-index: 1001;
  backdrop-filter: blur(10px);

  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);

  opacity: 0;

  ._dropMenu.is--open & {
    opacity: 1;
    pointer-events: auto;
  }
}

._dropMenu--buttonContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

._dropMenu--openButton {
  width: 72px;
  height: 72px;
  font-size: 20px;
  border-radius: 50%;
  background-color: white;
  color: var(--c-noir);
  pointer-events: auto;

  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);

  color: var(--c-noir);
  border: none;
  cursor: pointer;
  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
  flex-shrink: 0;

  &:hover {
    background-color: var(--c-gris_clair);
  }
  &:active {
    background-color: var(--c-gris);
  }
  &:focus {
    outline: none;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.is--open {
    transform: rotate(225deg);
    background-color: var(--c-noir) !important;
    border-radius: 50%;
    color: white;

    &:hover {
      background-color: var(--c-gris_fonce);
    }
  }
}

._dropMenu--userLabel {
  position: absolute;
  right: 100%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  white-space: nowrap;

  background: white;
  color: var(--c-noir);
  font-weight: 600;
  pointer-events: auto;
}
</style>
