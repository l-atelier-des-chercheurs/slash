<template>
  <p class="_viewEmptyMessage u-instructions">
    <slot>{{ $t("nothing_to_show") }}</slot>
  </p>
</template>

<style lang="scss" scoped>
._viewEmptyMessage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  margin: 0;
  pointer-events: none;
  font-size: 0.875rem;
}
</style>
