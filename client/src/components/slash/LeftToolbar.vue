<template>
  <div class="_leftToolbar">
    <div class="u-overlayPanel _leftToolbar--content">
      <div>
        <button
          type="button"
          class="u-button u-button_icon"
          :class="{ 'is--active': current_mode === 'select' }"
          @click="selectMode('select')"
        >
          <b-icon icon="cursor" />
        </button>
      </div>
      <div>
        <button
          type="button"
          class="u-button u-button_icon"
          :class="{ 'is--active': current_mode === 'pan-zoom' }"
          @click="selectMode('pan-zoom')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 30 30"
            class="b-icon bi"
            fill="none"
          >
            <path
              id="tool-hand"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.636 16.022c-.19-.723-.38-1.618-.78-2.95-.757-2.49-2.075-4.8-2.723-7.326-.425-1.81 1.12-3.643 3.046-2.969 2.949 1.036 3.868 6.109 4.283 8.678l.152.856c-.203-3.707-.469-6.126 0-9.172.463-2.89 4.888-2.825 5.254.038.189 2.079.19 4.154.19 6.242 0 .437 0 3.082.038 2.797.114-1.256.171-6.07.647-7.498 1.04-3.19 4.893-2.028 5.083.876.157 2.1-.062 4.29-.114 6.394 0 .076-.02.57.038.342.574-1.786.076-6.736 3.187-6.119 1.027.204 2.932 1.59 1.542 6.289-1.96 6.631-4.5 9.498-4.5 16.5h-14c0-5-6.61-8.82-8.5-12.598-.418-.799-.626-1.807-.36-2.53.438-1.123 1.254-1.713 2.568-1.58 2.142.206 3.008 2.032 4.949 3.73"
            />
          </svg>
        </button>
      </div>
      <div>
        <button
          type="button"
          class="u-button u-button_icon"
          :class="{ 'is--active': current_mode === 'draw' }"
          @click="selectMode('draw')"
        >
          <b-icon icon="pencil" />
        </button>
        <div v-if="current_mode === 'draw'" class="_drawSizeMenu">
          <button
            v-for="option in draw_size_options"
            :key="option.key"
            type="button"
            class="u-button _drawSizeMenu--btn"
            :class="{ 'is--active': draw_stroke_width === option.width }"
            @click="setDrawStrokeWidth(option.width)"
          >
            {{ option.key }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    current_mode: {
      type: String,
      default: "pan-zoom",
      validator: (v) => ["pan-zoom", "draw", "select"].includes(v),
    },
    draw_stroke_width: {
      type: Number,
      default: 5,
    },
  },
  components: {},
  data() {
    return {};
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {
    draw_size_options() {
      return [
        { key: "S", width: 2 },
        { key: "M", width: 5 },
        { key: "L", width: 10 },
        { key: "XL", width: 18 },
      ];
    },
  },
  methods: {
    selectMode(mode) {
      this.$emit("update:current_mode", mode);
    },
    setDrawStrokeWidth(width) {
      if (!Number.isFinite(width)) return;
      this.$emit("update:draw_stroke_width", width);
    },
  },
};
</script>
<style lang="scss" scoped>
._leftToolbar {
  position: absolute;
  top: var(--fixed-ui-margins);
  left: var(--fixed-ui-margins);

  height: 100%;
  z-index: 1000;
  border-radius: var(--border-radius);

  display: flex;
  flex-direction: column;
  gap: var(--spacing);
  align-items: center;
  justify-content: center;

  pointer-events: none;
}

._leftToolbar--content {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 4);
  pointer-events: auto;
}

._drawSizeMenu {
  margin-top: calc(var(--spacing) / 3);
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 5);
}

._drawSizeMenu--btn {
  min-width: 2.2rem;
  padding: calc(var(--spacing) / 4) calc(var(--spacing) / 3);
  font-family: var(--sl-font-mono);
  font-size: var(--sl-font-size-x-small);
}
</style>
