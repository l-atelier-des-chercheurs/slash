<template>
  <div class="_fpsCounter u-overlayPanel">{{ fps_display }}</div>
</template>

<script>
export default {
  data() {
    return {
      fps_display: "—",
      fps_raf_id: null,
      fps_frame_times: [],
    };
  },
  mounted() {
    this.startFpsCounter();
  },
  beforeDestroy() {
    this.stopFpsCounter();
  },
  methods: {
    startFpsCounter() {
      let last_time = performance.now();
      const tick = () => {
        const now = performance.now();
        const dt = now - last_time;
        last_time = now;
        this.fps_frame_times.push(dt);
        const window_ms = 500;
        while (
          this.fps_frame_times.length > 1 &&
          this.fps_frame_times.reduce((a, b) => a + b, 0) > window_ms
        ) {
          this.fps_frame_times.shift();
        }
        const total_ms = this.fps_frame_times.reduce((a, b) => a + b, 0);
        const fps =
          total_ms > 0
            ? Math.round((1000 * this.fps_frame_times.length) / total_ms)
            : 0;
        this.fps_display = `${fps} FPS`;
        this.fps_raf_id = requestAnimationFrame(tick);
      };
      this.fps_raf_id = requestAnimationFrame(tick);
    },
    stopFpsCounter() {
      if (this.fps_raf_id) {
        cancelAnimationFrame(this.fps_raf_id);
        this.fps_raf_id = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
._fpsCounter {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1000;
  font-family: var(--sl-font-mono, monospace);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  border-radius: 0;
}
</style>
