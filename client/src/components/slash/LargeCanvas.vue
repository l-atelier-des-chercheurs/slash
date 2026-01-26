<template>
  <div class="_largeCanvas">
    <div v-for="file in files" :key="file.$path">
      <MediaContent :file="file" :resolution="320" />
    </div>
  </div>
</template>
<script>
export default {
  props: {
    files: {
      type: Array,
      required: true,
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
  methods: {},
};
</script>
<style lang="scss" scoped>
._largeCanvas {
  position: absolute;
  inset: 0;
  // Repeating dot pattern background
  background-image: radial-gradient(
    circle,
    rgba(0, 0, 0, 1) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
  background-position: 0 0;

  // For retina/high-DPI displays (2x)
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: radial-gradient(
      circle,
      rgba(0, 0, 0, 1) 0.5px,
      transparent 0.5px
    );
    background-size: 24px 24px;
  }
}
</style>
