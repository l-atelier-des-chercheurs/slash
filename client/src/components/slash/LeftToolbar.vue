<template>
  <div class="_leftToolbar">
    <div class="_leftToolbar--content">
      <div>
        <button type="button" class="u-button u-button_icon u-button_glass">
          <b-icon icon="arrow" />
        </button>
      </div>
      <div>
        <button type="button" class="u-button u-button_icon u-button_glass">
          <b-icon icon="pencil" />
        </button>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {},
  components: {},
  data() {
    return {};
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
  methods: {},
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
  padding: calc(var(--spacing) / 2);
  border-radius: var(--border-radius);
  background: white;
  box-shadow: 0 0 55px 0px rgba(0, 0, 0, 0.1);
}
</style>
