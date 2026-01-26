<template>
  <div class="_chatPane">
    <div class="_content">
      <!-- Chat content will go here -->
      <div class="_placeholder">
        <p>{{ $t("chats") }} (à venir)</p>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    project: Object,
  },
  components: {},
  data() {
    return {};
  },
  async mounted() {},
  beforeDestroy() {},
  computed: {},
  methods: {},
};
</script>
<style lang="scss" scoped>
._chatPane {
  position: relative;
  height: 100%;
  background-color: var(--color-chats);
  display: flex;
  flex-flow: column nowrap;
}

._content {
  flex: 1 1 0;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

._placeholder {
  text-align: center;
  opacity: 0.5;
}
</style>
