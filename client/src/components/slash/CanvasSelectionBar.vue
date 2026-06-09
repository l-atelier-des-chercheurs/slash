<template>
  <div class="_canvasSelectionBar u-overlayPanel">
    <div class="_canvasSelectionBar--row">
      <button
        v-if="selection_count > 0"
        type="button"
        class="_canvasSelectionBar--count"
        :title="$t('items_selected')"
        @click="$emit('clear')"
      >{{ selection_count }}</button>
      <button
        type="button"
        class="u-button u-button_icon u-button_bleuvert"
        :title="$t('download_selected')"
        :aria-label="$t('download_selected')"
        :disabled="is_downloading"
        @click="$emit('download')"
      >
        <b-icon
          v-if="is_downloading"
          icon="arrow-repeat"
          class="_spinner"
        />
        <b-icon v-else icon="file-earmark-arrow-down" />
      </button>
      <button
        type="button"
        class="u-button u-button_icon u-button_red"
        :title="$t('remove')"
        :aria-label="$t('remove')"
        @click="$emit('remove')"
      >
        <b-icon icon="trash" />
      </button>

      <template v-if="show_stroke_controls">
        <div class="_canvasSelectionBar--divider"></div>
        <div class="_canvasSelectionBar--strokeGroup" role="group">
          <button
            v-for="option in stroke_size_options"
            :key="option.key"
            type="button"
            class="u-button _canvasSelectionBar--strokeBtn"
            :class="{ 'is--active': shape_stroke_width === option.width }"
            :aria-pressed="shape_stroke_width === option.width"
            @click="$emit('update:shape_stroke_width', option.width)"
          >
            {{ option.key }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
<script>
export default {
  name: "CanvasSelectionBar",
  props: {
    selection_count: {
      type: Number,
      default: 0,
    },
    is_downloading: {
      type: Boolean,
      default: false,
    },
    show_stroke_controls: {
      type: Boolean,
      default: false,
    },
    shape_stroke_width: {
      type: Number,
      default: 5,
    },
  },
  computed: {
    stroke_size_options() {
      return [
        { key: "S", width: 2 },
        { key: "M", width: 5 },
        { key: "L", width: 10 },
        { key: "XL", width: 18 },
      ];
    },
  },
};
</script>
<style lang="scss" scoped>
._canvasSelectionBar {
  position: absolute;
  left: 50%;
  bottom: var(--fixed-ui-margins);
  transform: translateX(-50%);
  z-index: 1001;
  pointer-events: auto;
}

._canvasSelectionBar--row {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
}

._canvasSelectionBar--count {
  min-width: 1.5rem;
  padding: 0 calc(var(--spacing) / 4);
  font-family: var(--sl-font-mono);
  font-size: var(--sl-font-size-small);
  font-weight: 700;
  text-align: center;
  color: var(--c-noir, #111);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--border-radius);

  &:hover {
    background: var(--c-gris_clair, #f0f0f0);
  }
}

._canvasSelectionBar--divider {
  width: 1px;
  height: 20px;
  background: var(--c-gris, #ccc);
  margin: 0 4px;
}

._canvasSelectionBar--strokeGroup {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 5);
}

._canvasSelectionBar--strokeBtn {
  min-width: 2.2rem;
  padding: calc(var(--spacing) / 4) calc(var(--spacing) / 3);
  font-family: var(--sl-font-mono);
  font-size: var(--sl-font-size-x-small);
}
</style>
