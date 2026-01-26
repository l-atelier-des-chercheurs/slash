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
  background-image: radial-gradient(circle, #000 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  
  // For retina/high-DPI displays
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-size: 20px 20px;
    background-image: radial-gradient(circle, #000 0.5px, transparent 0.5px);
  }
}
</style>
