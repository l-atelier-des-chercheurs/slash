<template>
  <div class="_viewEmptyMessage">
    <p class="_viewEmptyMessage--title u-instructions">{{ $t(message_key) }}</p>
    <p v-if="show_cta && cta_key" class="_viewEmptyMessage--cta u-instructions">
      {{ $t(cta_key) }}
    </p>
  </div>
</template>

<script>
export default {
  props: {
    message_key: {
      type: String,
      default: "nothing_to_show",
    },
    cta_key: {
      type: String,
      default: "slash_import_medias_cta",
    },
    show_cta: {
      type: Boolean,
      default: true,
    },
  },
};
</script>

<style lang="scss" scoped>
._viewEmptyMessage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  max-width: 28ch;
  text-align: center;
  pointer-events: none;
}

._viewEmptyMessage--title,
._viewEmptyMessage--cta {
  margin: 0;
  font-size: 0.875rem;
}

._viewEmptyMessage--cta {
  margin-top: calc(var(--spacing, 1rem) / 2);
  font-size: 0.8125rem;
}
</style>
