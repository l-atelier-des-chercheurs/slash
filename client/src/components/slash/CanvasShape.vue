<template>
  <div class="_canvasShape" :data-shape-path="shape.$path">
    <div class="_canvasShape--content">
      <div v-html="shape.shape_svg" />
    </div>
  </div>
</template>
<script>
export default {
  props: {
    shape: Object,
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
<style lang="scss" scoped></style>
