<template>
  <div v-if="can_show">
    <div
      class="_mediaListDragHandle panzoom-exclude"
      :class="{
        'is--dragging': is_dragging,
        'is--disabled': is_in_media_list,
      }"
      :style="handle_style"
      :title="handle_title"
      @mousedown="onPointerDown"
      @touchstart="onTouchStart"
    >
      <button
        type="button"
        class="u-button u-button_icon"
        :class="{
          'is--dragged': is_dragging,
          'u-button_small': size === 'small',
        }"
        :disabled="is_in_media_list"
        tabindex="-1"
      >
        <b-icon icon="hand-index-thumb" />
      </button>
    </div>

    <portal to="destination">
      <div v-if="is_dragging" class="_mediaListDragGhost" :style="ghost_style">
        <div ref="ghost_content" class="_mediaListDragGhost--content">
          <template v-if="!has_source_clone">
            <MediaContent
              v-if="show_media_content_fallback"
              :file="file"
              context="preview"
              :resolution="320"
            />
            <div
              v-else-if="file.$type === 'text'"
              class="_mediaListDragGhost--textFallback"
              v-text="text_preview"
            />
            <div v-else class="_mediaListDragGhost--iconFallback">
              <b-icon :icon="type_icon" />
            </div>
          </template>
        </div>
        <span
          v-if="type_label"
          class="_mediaListDragGhost--typeLabel"
          v-text="type_label"
        />
      </div>
    </portal>
  </div>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import { isMediaListFile } from "@/utils/mediaListUtils.js";

const DRAG_THRESHOLD = 4;
const GHOST_MAX_WIDTH = 160;
const GHOST_MAX_HEIGHT = 120;
const GHOST_MIN_WIDTH = 88;
const GHOST_MIN_HEIGHT = 66;

const TYPE_ICONS = {
  image: "image",
  video: "camera-video",
  audio: "music-note-beamed",
  text: "file-earmark-text",
  pdf: "file-earmark-pdf",
  url: "link-45deg",
  stl: "box",
  obj: "box",
};

export default {
  components: {
    MediaContent,
  },
  props: {
    file: {
      type: Object,
      required: true,
    },
    size: {
      type: String,
      default: "",
    },
    scale_factor: {
      type: Number,
      default: 1,
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      is_dragging: false,
      pointer_active: false,
      has_source_clone: false,
      start_client_x: 0,
      start_client_y: 0,
      ghost_client_x: 0,
      ghost_client_y: 0,
      ghost_width: GHOST_MIN_WIDTH,
      ghost_height: GHOST_MIN_HEIGHT,
    };
  },
  computed: {
    can_show() {
      return isMediaListFile(this.file);
    },
    is_in_media_list() {
      return this.media_list_paths.includes(this.file.$path);
    },
    handle_title() {
      if (this.is_in_media_list) {
        return "Media already part of the list";
      }
      return "Add to media list";
    },
    handle_style() {
      if (this.scale_factor === 1) return null;
      return {
        "--scale-factor": this.scale_factor,
      };
    },
    ghost_style() {
      return {
        left: `${this.ghost_client_x - this.ghost_width / 2}px`,
        top: `${this.ghost_client_y - this.ghost_height / 2}px`,
        width: `${this.ghost_width}px`,
        height: `${this.ghost_height}px`,
      };
    },
    type_label() {
      if (this.has_source_clone) return "";
      if (this.show_media_content_fallback) return "";
      return this.file.$type;
    },
    type_icon() {
      return TYPE_ICONS[this.file.$type] || "file-earmark";
    },
    show_media_content_fallback() {
      if (this.file.$type === "text") return false;
      if (this.file.$thumbs === "no_preview") return false;
      if (
        ["image", "video", "audio", "pdf", "url", "stl", "obj"].includes(
          this.file.$type
        )
      ) {
        return !!this.file.$thumbs;
      }
      return false;
    },
    text_preview() {
      const raw = (this.file.$content || this.file.caption || "")
        .replace(/<[^>]+>/g, " ")
        .trim();
      if (!raw) return "Text";
      return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
    },
  },
  beforeDestroy() {
    this.cleanupPointerListeners();
    this.clearGhostContent();
  },
  methods: {
    addToMediaList() {
      this.$eventHub.$emit("mediaList.ensureOpen");
      this.$eventHub.$emit("mediaList.addFile", { file: this.file });
    },
    findSourceElement() {
      const candidates = document.querySelectorAll(
        "._canvasItem--content[data-file-path]"
      );
      for (const candidate of candidates) {
        if (candidate.getAttribute("data-file-path") === this.file.$path) {
          return candidate;
        }
      }
      return null;
    },
    setGhostDimensionsFromSource(source) {
      const rect = source.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        this.setGhostDimensionsFromFile();
        return;
      }

      const scale = Math.min(
        GHOST_MAX_WIDTH / rect.width,
        GHOST_MAX_HEIGHT / rect.height,
        1
      );
      this.ghost_width = Math.max(
        GHOST_MIN_WIDTH,
        Math.round(rect.width * scale)
      );
      this.ghost_height = Math.max(
        GHOST_MIN_HEIGHT,
        Math.round(rect.height * scale)
      );
    },
    setGhostDimensionsFromFile() {
      const ratio = this.file.$infos?.ratio;
      if (this.file.$type === "text") {
        this.ghost_width = 120;
        this.ghost_height = 96;
        return;
      }
      if (ratio) {
        this.ghost_width = GHOST_MAX_WIDTH;
        this.ghost_height = Math.max(
          GHOST_MIN_HEIGHT,
          Math.round(GHOST_MAX_WIDTH * ratio)
        );
        return;
      }
      this.ghost_width = GHOST_MAX_WIDTH;
      this.ghost_height = GHOST_MAX_HEIGHT;
    },
    mountGhostClone() {
      this.clearGhostContent();
      const source = this.findSourceElement();
      if (!source) {
        this.has_source_clone = false;
        this.setGhostDimensionsFromFile();
        return;
      }

      this.setGhostDimensionsFromSource(source);
      const clone = source.cloneNode(true);
      clone.classList.add("_mediaListDragGhost--clone");
      clone.style.width = "100%";
      clone.style.height = "100%";
      clone.style.pointerEvents = "none";

      const container = this.$refs.ghost_content;
      if (!container) return;
      container.appendChild(clone);
      this.has_source_clone = true;
    },
    clearGhostContent() {
      const container = this.$refs.ghost_content;
      if (container) container.innerHTML = "";
      this.has_source_clone = false;
    },
    onPointerDown(event) {
      if (this.is_in_media_list) return;
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      this.beginPointerSession(event.clientX, event.clientY);
    },
    onTouchStart(event) {
      if (this.is_in_media_list) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      event.stopPropagation();
      event.preventDefault();
      this.beginPointerSession(touch.clientX, touch.clientY);
    },
    beginPointerSession(client_x, client_y) {
      this.pointer_active = true;
      this.is_dragging = false;
      this.start_client_x = client_x;
      this.start_client_y = client_y;
      this.ghost_client_x = client_x;
      this.ghost_client_y = client_y;
      window.addEventListener("mousemove", this.onPointerMove);
      window.addEventListener("mouseup", this.onPointerUp);
      window.addEventListener("touchmove", this.onTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", this.onTouchEnd);
      window.addEventListener("touchcancel", this.onTouchEnd);
    },
    onPointerMove(event) {
      if (!this.pointer_active) return;
      this.handlePointerMove(event.clientX, event.clientY);
    },
    onTouchMove(event) {
      if (!this.pointer_active) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      if (event.cancelable) event.preventDefault();
      this.handlePointerMove(touch.clientX, touch.clientY);
    },
    handlePointerMove(client_x, client_y) {
      const dx = client_x - this.start_client_x;
      const dy = client_y - this.start_client_y;

      if (!this.is_dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        this.startMediaDrag(client_x, client_y);
      }

      this.ghost_client_x = client_x;
      this.ghost_client_y = client_y;
      this.$eventHub.$emit("mediaList.pointerDragMove", {
        file: this.file,
        client_x,
        client_y,
      });
    },
    startMediaDrag(client_x, client_y) {
      this.is_dragging = true;
      this.ghost_client_x = client_x;
      this.ghost_client_y = client_y;
      this.$eventHub.$emit("mediaList.ensureOpen");
      this.$nextTick(() => {
        this.$eventHub.$emit("mediaList.pointerDragStart", {
          file: this.file,
          client_x,
          client_y,
        });
        this.mountGhostClone();
      });
    },
    onPointerUp(event) {
      if (!this.pointer_active) return;
      this.finishPointerSession(event.clientX, event.clientY);
    },
    onTouchEnd(event) {
      if (!this.pointer_active) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      this.finishPointerSession(touch.clientX, touch.clientY);
    },
    finishPointerSession(client_x, client_y) {
      if (this.is_dragging) {
        this.$eventHub.$emit("mediaList.pointerDragEnd", {
          file: this.file,
          client_x,
          client_y,
        });
      } else {
        this.addToMediaList();
      }
      this.clearGhostContent();
      this.cleanupPointerListeners();
    },
    cleanupPointerListeners() {
      this.pointer_active = false;
      this.is_dragging = false;
      window.removeEventListener("mousemove", this.onPointerMove);
      window.removeEventListener("mouseup", this.onPointerUp);
      window.removeEventListener("touchmove", this.onTouchMove);
      window.removeEventListener("touchend", this.onTouchEnd);
      window.removeEventListener("touchcancel", this.onTouchEnd);
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListDragHandle {
  cursor: grab;
  transform: scale(min(5, calc(1 / var(--scale-factor, 1))));
  transform-origin: top right;

  &:active,
  &.is--dragging {
    cursor: grabbing;
  }

  &.is--disabled {
    cursor: not-allowed;

    ::v-deep button {
      opacity: 0.45;
    }
  }

  ::v-deep button {
    background-color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }

  &.is--dragging ::v-deep button,
  ::v-deep button.is--dragged {
    background-color: rgba(255, 255, 255, 0.9);
  }
}

._mediaListDragGhost {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  opacity: 0.95;
  background: white;
}

._mediaListDragGhost--content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ::v-deep img,
  ::v-deep ._mediaListDragGhost--clone img,
  ::v-deep ._mediaListDragGhost--clone video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  ::v-deep ._mediaListDragGhost--clone {
    border-radius: var(--border-radius);
    overflow: hidden;
  }

  ::v-deep ._mediaListDragGhost--clone ._canvasItem--caption {
    display: none;
  }

  ::v-deep ._mediaContent--rawText,
  ::v-deep ._mediaContent--collabEditor {
    width: 100%;
    height: 100%;
    overflow: hidden;
    padding: calc(var(--spacing) / 2);
    font-size: var(--sl-font-size-x-small);
  }
}

._mediaListDragGhost--textFallback {
  width: 100%;
  height: 100%;
  padding: calc(var(--spacing) / 2);
  overflow: hidden;
  font-size: var(--sl-font-size-x-small);
  line-height: 1.35;
  background: #fff9c4;
  color: var(--c-noir, #111);
}

._mediaListDragGhost--iconFallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-gris_clair, #eee);
  color: var(--c-gris_fonce, #555);

  ::v-deep .b-icon.bi {
    width: 2.5rem;
    height: 2.5rem;
  }
}

._mediaListDragGhost--typeLabel {
  position: absolute;
  left: calc(var(--spacing) / 4);
  bottom: calc(var(--spacing) / 4);
  padding: calc(var(--spacing) / 8) calc(var(--spacing) / 3);
  border-radius: calc(var(--border-radius) - 2px);
  background: rgba(0, 0, 0, 0.65);
  color: white;
  font-size: var(--sl-font-size-x-small);
  text-transform: capitalize;
}
</style>
