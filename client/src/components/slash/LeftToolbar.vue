<template>
  <div class="_leftToolbar">
    <div class="_leftToolbar--content">
      <div>
        <button
          type="button"
          class="u-button u-button_icon u-button_glass"
          :class="{ 'is--active': current_mode === 'pan-zoom' }"
          @click="selectMode('pan-zoom')"
        >
          <b-icon icon="hand-index" />
        </button>
      </div>
      <div>
        <button
          type="button"
          class="u-button u-button_icon u-button_glass"
          :class="{ 'is--active': current_mode === 'draw' }"
          @click="selectMode('draw')"
        >
          <b-icon icon="pencil" />
        </button>
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
      validator: (v) => ["pan-zoom", "draw"].includes(v),
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
  computed: {},
  methods: {
    selectMode(mode) {
      this.$emit("update:current_mode", mode);
    },
  },
};
</script>
<style lang="scss" scoped>
._leftToolbar {
  position: absolute;
  top: 0;
  left: 0;

  height: 100%;
  z-index: 1000;
  border-radius: var(--border-radius);
  padding: var(--spacing);

  display: flex;
  flex-direction: column;
  gap: var(--spacing);
  align-items: center;
  justify-content: center;
}

._leftToolbar--content {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
  padding: calc(var(--spacing) / 2);
  border-radius: var(--border-radius);

  border: 1px solid var(--c-gris);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 55px 0px rgba(0, 0, 0, 0.1);
}
</style>
