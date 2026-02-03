<template>
  <div
    class="_canvasItemContentWrapper"
    :class="wrapperClasses"
    :style="itemStyle"
  >
    <div class="_canvasItem--shadow" />

    <div class="_canvasItem--content" :data-filetype="file.$type">
      <MediaContent
        :file="file"
        :context="'full'"
        :resolution="resolution"
        :plyr_options="{ controls: ['play', 'progress'] }"
      />

      <button
        type="button"
        class="_canvasItem--chatBubble"
        :aria-label="$t('chats')"
        @mousedown.stop
        @click.stop="showPathModal = true"
      >
        <b-icon icon="chat-left-text-fill" />
      </button>

      <ItemChat
        v-if="showPathModal"
        :file="file"
        @close="showPathModal = false"
      />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
    resolution: {
      type: Number,
      default: 320,
    },
    mode: {
      type: String,
      default: "canvas", // 'canvas', 'timeline', or 'grid'
    },
    timelineHeight: {
      type: Number,
      default: null,
    },
  },
  components: {
    ItemChat: () => import("@/components/slash/ItemChat.vue"),
  },
  data() {
    return {
      showPathModal: false,
    };
  },
  computed: {
    wrapperClasses() {
      return {
        "is--timeline": this.mode === "timeline",
        "is--grid": this.mode === "grid",
        "is--canvas": this.mode === "canvas",
      };
    },
    itemStyle() {
      if (this.mode === "grid") {
        return { width: "100%", height: "100%" };
      }
      if (this.mode === "timeline") {
        // Timeline mode: flex layout
        const width = 224;
        const ratio = this.file.$infos?.ratio;
        const height =
          this.timelineHeight || (ratio ? width * ratio : null) || 200;

        const style = {
          width: `${width}px`,
        };

        if (height !== null) {
          style.height = `${height}px`;
        }

        // Set aspect ratio for images
        if (this.file.$type === "image" && ratio) {
          style.aspectRatio = ratio;
        }

        return style;
      }
      return {};
    },
  },
};
</script>

<style lang="scss" scoped>
._canvasItemContentWrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

._canvasItem--shadow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgb(221, 221, 221);
  border-radius: var(--border-radius);
  z-index: -1;

  .is--grid & {
    display: none;
  }
}

._canvasItem--content {
  position: relative;
  border-radius: var(--border-radius);
  transition: transform 0.12s cubic-bezier(0.19, 1, 0.22, 1);
  height: 100%;
  width: 100%;

  &:not([data-filetype="audio"]) {
    // not audio because we need to keep the controls tooltip when hovering the seek bar
    overflow: hidden;
  }

  ::v-deep .plyr__controls {
    border-radius: var(--border-radius, 4px);
    padding-right: calc(var(--spacing) * 3);
    width: 100%;
  }

  ::v-deep ._mediaContent {
    height: 100%;
    width: 100%;

    img,
    video {
      height: 100%;
      max-width: none;
      width: 100%;
      object-fit: cover;
      display: block;
    }

    ._mediaContent--rawText {
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
  }
}

._canvasItem--chatBubble {
  position: absolute;
  top: calc(var(--spacing) / 4);
  right: calc(var(--spacing) / 4);
  z-index: 5;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;
  padding: 10px;
  border: none;
  border-radius: calc(var(--border-radius) - 2px);

  background: transparent;
  color: white;
  background: var(--c-noir);
  cursor: pointer;
  // opacity: 0.7;

  // transform: scale(calc(1 / var(--scale-factor, 1)));
  // limit scale transform to maximum 5
  transform: scale(min(5, calc(1 / var(--scale-factor, 1))));

  transform-origin: top right;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.15s;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.7);
  }
}

/* Timeline specific styles that affect content */
.is--timeline {
  margin-top: 0;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  background: white;
  transition: transform 0.2s;

  &:hover {
    z-index: 100;
    transform: scale(1.02);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  ._canvasItem--content[data-filetype="text"] {
    background-color: #fff9c4; /* Post-it yellow */
    padding: 10px;

    ::v-deep ._mediaContent {
      font-family: var(--sl-font-handwritten, cursive);
      font-size: 1.1em;
    }
  }
}

.is--grid {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
