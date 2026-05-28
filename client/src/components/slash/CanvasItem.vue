<template>
  <div
    class="_canvasItemContentWrapper"
    :class="wrapperClasses"
    :style="itemStyle"
  >
    <!-- <div class="_canvasItem--shadow" /> -->

    <div
      class="_canvasItem--content"
      :data-filetype="file.$type"
      @click.stop="openItemModal"
      :data-file-path="file.$path"
    >
      <MediaContent
        :file="file"
        :context="'full'"
        :resolution="resolution"
        :plyr_options="{ controls: ['play', 'progress'] }"
      />

      <div class="_canvasItem--caption" v-if="file.$type !== 'text'">
        <span v-if="caption" v-html="caption" />
      </div>
    </div>

    <div
      v-if="can_show_media_list_handle"
      class="_canvasItem--mediaListHandle"
    >
      <MediaListDragHandle
        :file="file"
        :size="mode === 'canvas' ? 'small' : ''"
        :scale_factor="mode === 'canvas' ? scale_factor : 1"
        :media_list_paths="media_list_paths"
      />
    </div>
  </div>
</template>

<script>
import MediaListDragHandle from "@/components/slash/MediaListDragHandle.vue";
import { isMediaListFile } from "@/utils/mediaListUtils.js";

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
    scale_factor: {
      type: Number,
      default: 1,
    },
    show_media_list_sidebar: {
      type: Boolean,
      default: false,
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    MediaListDragHandle,
  },
  data() {
    return {};
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
      const author_color = this.$getFirstAuthorColor(this.file.$authors);

      let style = {
        "--author-color": author_color,
      };

      if (this.mode === "grid") {
        style.width = "100%";
        style.height = "100%";
      }
      if (this.mode === "timeline") {
        // Timeline mode: flex layout
        const width = 224;
        const ratio = this.file.$infos?.ratio;
        const height =
          this.timelineHeight || (ratio ? width * ratio : null) || 200;

        style.width = `${width}px`;

        if (height !== null) {
          style.height = `${height}px`;
        }

        // Set aspect ratio for images
        if (this.file.$type === "image" && ratio) {
          style.aspectRatio = ratio;
        }
      }
      return style;
    },
    caption() {
      return this.$sanitize(this.file.caption);
    },
    can_show_media_list_handle() {
      return (
        this.show_media_list_sidebar && isMediaListFile(this.file)
      );
    },
  },
  methods: {
    openItemModal() {
      this.$eventHub.$emit("canvasItem.openWithTransition", this.file.$path);
    },
  },
};
</script>

<style lang="scss" scoped>
._canvasItemContentWrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 3rem;
}

._canvasItem--mediaListHandle {
  position: absolute;
  top: calc(var(--spacing) / 4);
  right: calc(var(--spacing) / 4);
  z-index: 6;
  pointer-events: auto;
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
  cursor: pointer;

  background: var(--author-color, var(--c-gris_fonce));
  // color: white;

  &:not([data-filetype="audio"]) {
    // not audio because we need to keep the controls tooltip when hovering the seek bar
    overflow: hidden;
  }

  &[data-filetype="text"] {
    padding: calc(var(--spacing) * 1);

    ._mediaContent {
      align-items: flex-start;
    }
  }

  .is--canvas & {
    &[data-filetype="text"] {
      background: transparent;

      ::v-deep ._mediaContent {
        overflow: hidden;
        height: 100%;
      }

      ::v-deep ._mediaContent--rawText,
      ::v-deep ._mediaContent--collabEditor {
        height: 100%;
        overflow: hidden;
      }
    }
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
  top: calc(var(--spacing) / 1);
  right: calc(var(--spacing) / 1);

  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: calc(var(--border-radius) - 2px);
  color: var(--g-800);

  background: transparent;
  cursor: pointer;

  transform: scale(min(5, calc(1 / var(--scale-factor, 1))));

  transform-origin: top right;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.15s;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.7);
  }

  > .b-icon.bi {
    width: 1rem;
    height: 1rem;
    // box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }
}

/* Timeline specific styles that affect content */
.is--timeline {
  margin-top: 0;
  overflow: hidden;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    z-index: 100;
    transform: scale(1.02);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  ._canvasItem--content[data-filetype="text"] {
    // background-color: #fff9c4; /* Post-it yellow */
    // padding: 10px;

    ::v-deep ._mediaContent {
      // font-family: var(--sl-font-handwritten, cursive);
      // font-size: 1.1em;
    }
  }
}

.is--grid {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

._canvasItem--caption {
  position: absolute;
  top: calc(var(--spacing) / 2);
  left: calc(var(--spacing) / 2);
  max-width: calc(100% - var(--spacing) * 1);
  background: var(--author-color);
  // color: white;
  padding: calc(var(--spacing) / 8) calc(var(--spacing) / 2);
  border-radius: var(--border-radius);
  //transform: scale(min(5, calc(1 / var(--scale-factor, 1))));
  // transform-origin: top left;

  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.15s;

  &:empty {
    padding: calc(var(--spacing) / 4);
  }

  span {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
