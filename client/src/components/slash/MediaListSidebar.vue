<template>
  <aside
    class="_mediaListSidebar"
    :class="{ 'is--dragOver': drag_over }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="_mediaListSidebar--header">
      <strong>Media list</strong>
      <div class="_mediaListSidebar--headerButtons">
        <button
          v-if="media_list_paths.length"
          type="button"
          class="u-button u-button_icon"
          title="Clear list"
          @click="clearList"
        >
          <b-icon icon="trash" />
        </button>
        <button
          type="button"
          class="u-button u-button_icon"
          title="Close"
          @click="$emit('close')"
        >
          <b-icon icon="x-lg" />
        </button>
      </div>
    </div>

    <div class="_mediaListSidebar--body">
      <div
        v-if="!resolved_items.length"
        class="_mediaListSidebar--empty"
        :class="{ 'is--dragOver': drag_over }"
      />

      <transition-group
        v-else
        ref="list"
        tag="ol"
        name="mediaListReorder"
        class="_mediaListSidebar--list"
        @dragover.prevent="onListDragOver"
      >
        <li
          v-for="(item, index) in resolved_items"
          :key="item.file.$path"
          class="_mediaListSidebar--row"
        >
          <div
            class="_mediaListSidebar--dropZone"
            :class="{
              'is--active': isDropZoneActive(index),
              'is--hovered':
                drag_over_index === index && is_drag_session_active,
            }"
            @dragover.prevent="onDropZoneDragOver($event, index)"
            @dragenter.prevent="onDropZoneDragEnter(index)"
            @dragleave="onDropZoneDragLeave"
            @drop.prevent="onDropZoneDrop($event, index)"
          />

          <div
            class="_mediaListSidebar--item"
            :class="{
              'is--dragging': dragging_index === index,
            }"
            draggable="true"
            @dragstart="onItemDragStart($event, index)"
            @dragend="onItemDragEnd"
          >
            <span class="_mediaListSidebar--order">{{ index + 1 }}</span>
            <div
              class="_mediaListSidebar--thumb"
              @click="openItem(item.file.$path)"
            >
              <MediaContent
                :file="item.file"
                context="preview"
                :resolution="320"
              />
            </div>
            <div class="_mediaListSidebar--meta">
              <span class="_mediaListSidebar--title">{{ item.label }}</span>
              <span class="_mediaListSidebar--type">{{ item.file.$type }}</span>
            </div>
            <button
              type="button"
              class="u-button u-button_icon _mediaListSidebar--remove"
              title="Remove"
              @click="removeAt(index)"
            >
              <b-icon icon="x" />
            </button>
          </div>
        </li>

        <li
          v-if="resolved_items.length"
          key="media-list-drop-last"
          class="_mediaListSidebar--dropZone is--last"
          :class="{
            'is--active': isDropZoneActive(resolved_items.length),
            'is--hovered':
              drag_over_index === resolved_items.length &&
              is_drag_session_active,
          }"
          @dragover.prevent="onDropZoneDragOver($event, resolved_items.length)"
          @dragenter.prevent="onDropZoneDragEnter(resolved_items.length)"
          @dragleave="onDropZoneDragLeave"
          @drop.prevent="onDropZoneDrop($event, resolved_items.length)"
        />
      </transition-group>
    </div>

    <p class="_mediaListSidebar--instructions">
      Drag medias using the hand icon to this list
    </p>

    <div class="_mediaListSidebar--footer">
      <button
        type="button"
        class="u-button _mediaListSidebar--modeBtn"
        :disabled="!can_open_editors"
        @click="openEditor('print')"
      >
        <b-icon icon="printer" />
        <span>PRINT</span>
      </button>
      <button
        type="button"
        class="u-button _mediaListSidebar--modeBtn"
        :disabled="!can_open_editors"
        @click="openEditor('web')"
      >
        <b-icon icon="globe" />
        <span>WEB</span>
      </button>
    </div>

    <MediaListEditorModal
      v-if="active_editor"
      :mode="active_editor"
      :folder_path="folder_path"
      :resolved_items="resolved_items"
      :media_list_paths="media_list_paths"
      @close="active_editor = null"
    />
  </aside>
</template>

<script>
import MediaContent from "@/adc-core/fields/MediaContent.vue";
import MediaListEditorModal from "@/components/slash/MediaListEditorModal.vue";
import {
  isMediaListFile,
  MEDIA_LIST_DRAG_MIME,
} from "@/utils/mediaListUtils.js";
import {
  ensureWebPublication,
  ensurePrintPublication,
} from "@/utils/mediaListProjectUtils.js";

export default {
  components: {
    MediaContent,
    MediaListEditorModal,
  },
  props: {
    files: {
      type: Array,
      default: () => [],
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
    folder_path: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      drag_over: false,
      drag_over_index: null,
      dragging_index: null,
      pointer_drag_active: false,
      active_editor: null,
      is_opening_editor: false,
    };
  },
  computed: {
    files_by_path() {
      const map = new Map();
      for (const file of this.files) {
        map.set(file.$path, file);
      }
      return map;
    },
    resolved_items() {
      return this.media_list_paths
        .map((path) => {
          const file = this.files_by_path.get(path);
          if (!file) return null;
          return {
            file,
            label: this.getItemLabel(file),
          };
        })
        .filter(Boolean);
    },
    is_drag_session_active() {
      return this.dragging_index !== null || this.pointer_drag_active;
    },
    can_open_editors() {
      return (
        !!this.folder_path &&
        this.media_list_paths.length > 0 &&
        !this.is_opening_editor
      );
    },
  },
  mounted() {
    this.$eventHub.$on("mediaList.addFile", this.onAddFileFromCanvas);
    this.$eventHub.$on("mediaList.pointerDragStart", this.onPointerDragStart);
    this.$eventHub.$on("mediaList.pointerDragMove", this.onPointerDragMove);
    this.$eventHub.$on("mediaList.pointerDragEnd", this.onPointerDragEnd);
  },
  beforeDestroy() {
    this.$eventHub.$off("mediaList.addFile", this.onAddFileFromCanvas);
    this.$eventHub.$off("mediaList.pointerDragStart", this.onPointerDragStart);
    this.$eventHub.$off("mediaList.pointerDragMove", this.onPointerDragMove);
    this.$eventHub.$off("mediaList.pointerDragEnd", this.onPointerDragEnd);
  },
  methods: {
    getItemLabel(file) {
      const caption = (file.caption || "").replace(/<[^>]+>/g, "").trim();
      if (caption) return caption;
      const filename = file.$path?.split("/").pop() || "Untitled";
      return filename.replace(/\.meta\.txt$/, "");
    },
    emitPaths(next_paths) {
      this.$emit("update:media_list_paths", next_paths);
    },
    addFilePath(path) {
      if (!path || this.media_list_paths.includes(path)) return;
      const file = this.files_by_path.get(path);
      if (!file || !isMediaListFile(file)) return;
      this.emitPaths([...this.media_list_paths, path]);
    },
    onAddFileFromCanvas({ file }) {
      if (!file?.$path) return;
      this.addFilePath(file.$path);
    },
    resetPointerDragState() {
      this.drag_over = false;
      this.drag_over_index = null;
      this.pointer_drag_active = false;
    },
    isDropZoneActive(drop_index) {
      if (!this.is_drag_session_active) return false;
      if (this.dragging_index === null) return true;
      return (
        this.dragging_index !== drop_index &&
        this.dragging_index !== drop_index - 1
      );
    },
    isPointInSidebar(client_x, client_y) {
      const rect = this.$el?.getBoundingClientRect();
      if (!rect) return false;
      return (
        client_x >= rect.left &&
        client_x <= rect.right &&
        client_y >= rect.top &&
        client_y <= rect.bottom
      );
    },
    getDropIndexFromPointer(client_x, client_y) {
      if (!this.isPointInSidebar(client_x, client_y)) return null;
      if (!this.resolved_items.length) return 0;
      return this.getDropIndexFromEvent({ clientY: client_y });
    },
    onPointerDragStart() {
      this.pointer_drag_active = true;
    },
    onPointerDragMove({ client_x, client_y }) {
      const index = this.getDropIndexFromPointer(client_x, client_y);
      this.drag_over = index !== null;
      if (index !== null && this.isDropZoneActive(index)) {
        this.drag_over_index = index;
      } else if (index === null) {
        this.drag_over_index = null;
      }
    },
    onPointerDragEnd({ file, client_x, client_y }) {
      const index = this.getDropIndexFromPointer(client_x, client_y);
      if (index !== null && file?.$path) {
        this.insertExternalPath(file.$path, index);
      }
      this.resetPointerDragState();
    },
    removeAt(index) {
      const next = this.media_list_paths.slice();
      next.splice(index, 1);
      this.emitPaths(next);
    },
    clearList() {
      this.emitPaths([]);
    },
    openItem(path) {
      this.$eventHub.$emit("canvasItem.openWithTransition", path);
    },
    onDragOver() {
      this.drag_over = true;
    },
    onDragLeave(event) {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      this.drag_over = false;
      this.drag_over_index = null;
    },
    onDrop(event) {
      this.drag_over = false;
      this.drag_over_index = null;
      const path = this.readDraggedPath(event);
      if (path) this.addFilePath(path);
    },
    readDraggedPath(event) {
      const path =
        event.dataTransfer.getData(MEDIA_LIST_DRAG_MIME) ||
        event.dataTransfer.getData("text/plain");
      return path || null;
    },
    onListDragOver(event) {
      this.drag_over = true;
      if (this.dragging_index !== null) return;
      const index = this.getDropIndexFromEvent(event);
      if (this.isDropZoneActive(index)) {
        this.drag_over_index = index;
      }
    },
    onDropZoneDragOver(event, index) {
      event.preventDefault();
      this.drag_over = true;
      if (this.isDropZoneActive(index)) {
        this.drag_over_index = index;
      }
    },
    onDropZoneDragEnter(index) {
      if (this.isDropZoneActive(index)) {
        this.drag_over_index = index;
      }
    },
    onDropZoneDragLeave(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        this.drag_over_index = null;
      }
    },
    onDropZoneDrop(event, drop_index) {
      this.drag_over = false;
      this.drag_over_index = null;

      const external_path = this.readDraggedPath(event);
      if (external_path && this.dragging_index === null) {
        this.insertExternalPath(external_path, drop_index);
        this.onItemDragEnd();
        this.resetPointerDragState();
        return;
      }

      if (this.dragging_index === null) {
        this.resetPointerDragState();
        return;
      }

      let target_index = drop_index;
      if (target_index > this.dragging_index) {
        target_index--;
      }
      if (target_index !== this.dragging_index) {
        this.reorder(this.dragging_index, target_index);
      }
      this.onItemDragEnd();
    },
    onItemDragStart(event, index) {
      this.dragging_index = index;
      const path = this.media_list_paths[index];
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(MEDIA_LIST_DRAG_MIME, path);
      event.dataTransfer.setData("text/plain", path);
    },
    onItemDragEnd() {
      this.dragging_index = null;
      this.drag_over_index = null;
      this.drag_over = false;
      this.pointer_drag_active = false;
    },
    insertExternalPath(path, index) {
      if (!path) return;
      const file = this.files_by_path.get(path);
      if (!file || !isMediaListFile(file)) return;

      const next = this.media_list_paths.filter((p) => p !== path);
      const clamped_index = Math.max(0, Math.min(index, next.length));
      next.splice(clamped_index, 0, path);
      this.emitPaths(next);
    },
    reorder(from_index, to_index) {
      if (from_index === to_index) return;
      const next = this.media_list_paths.slice();
      const [moved] = next.splice(from_index, 1);
      next.splice(to_index, 0, moved);
      this.emitPaths(next);
    },
    getListRootEl() {
      const list_ref = this.$refs.list;
      if (list_ref) {
        const el = list_ref.$el || list_ref;
        if (el?.querySelectorAll) return el;
      }
      return this.$el?.querySelector("._mediaListSidebar--list") || null;
    },
    getDropIndexFromEvent(event) {
      const list = this.getListRootEl();
      if (!list) return this.resolved_items.length;

      const items = list.querySelectorAll("._mediaListSidebar--item");
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (event.clientY < midpoint) return i;
      }
      return items.length;
    },
    async openEditor(mode) {
      if (!this.can_open_editors || this.active_editor) return;
      this.is_opening_editor = true;
      try {
        if (mode === "web") {
          await ensureWebPublication(
            this.$api,
            this.folder_path,
            this.media_list_paths
          );
        } else if (mode === "print") {
          await ensurePrintPublication(this.$api, this.folder_path);
        }
        this.active_editor = mode;
      } catch (err) {
        console.error("Failed to open media list editor:", err);
        const code = err?.code || err?.message;
        if (code === "login_required") {
          this.$alertify
            ?.delay(4000)
            ?.error("Log in to create and edit publications.");
        } else if (code === "folder_private" || code === "not_allowed") {
          this.$alertify
            ?.delay(4000)
            ?.error(
              "Cannot open publication folders. Check folder access permissions."
            );
        }
      } finally {
        this.is_opening_editor = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
._mediaListSidebar {
  flex: 0 0 min(320px, 40vw);
  width: min(320px, 40vw);
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--c-gris_clair);
  border-left: 1px solid var(--c-gris, #ccc);
  padding: calc(var(--spacing) / 1);
  gap: calc(var(--spacing) / 2);
  overflow: hidden;

  &.is--dragOver {
    background: rgba(255, 255, 255, 0.95);
  }
}

._mediaListSidebar--header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

._mediaListSidebar--headerButtons {
  display: flex;
  gap: calc(var(--spacing) / 4);
}

._mediaListSidebar--body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

._mediaListSidebar--empty {
  flex: 1;
  border: 2px dashed var(--c-gris, #ccc);
  border-radius: var(--border-radius);

  &.is--dragOver {
    border-color: var(--c-bleuvert, #2a9d8f);
    background: rgba(42, 157, 143, 0.08);
  }
}

._mediaListSidebar--list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  position: relative;
}

._mediaListSidebar--row {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

._mediaListSidebar--dropZone {
  position: relative;
  flex-shrink: 0;
  height: calc(var(--spacing) * 1.5);
  margin-top: calc(var(--spacing) / -2);
  margin-bottom: calc(var(--spacing) / -2);
  border-radius: var(--border-radius);
  pointer-events: none;
  transition: height 0.2s ease;
  z-index: 2;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
    border-radius: 2px;
    background: var(--c-bleuvert, #2a9d8f);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 8px;
    height: 8px;
    transform: translateY(-50%);
    border-radius: 50%;
    background: var(--c-bleuvert, #2a9d8f);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &.is--active {
    pointer-events: auto;

    &::before {
      opacity: 0.2;
    }

    &::after {
      opacity: 0.35;
    }
  }

  &.is--hovered {
    &::before,
    &::after {
      opacity: 1;
    }

    + ._mediaListSidebar--item {
      transform: translateY(4px);
      transition: transform 0.2s 0.15s ease;
    }
  }

  &.is--last {
    margin-top: calc(var(--spacing) / -2);
  }
}

._mediaListSidebar--item {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 3);
  padding: calc(var(--spacing) / 4);
  background: white;
  border-radius: var(--border-radius);
  border: 1px solid transparent;
  cursor: grab;
  transition: transform 0.2s ease, opacity 0.15s ease;

  &.is--dragging {
    opacity: 0.45;
  }
}

._mediaListSidebar--order {
  flex-shrink: 0;
  width: 1.25rem;
  text-align: center;
  font-size: var(--sl-font-size-x-small);
  font-weight: 700;
  color: var(--c-gris_fonce, #555);
}

._mediaListSidebar--thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: calc(var(--border-radius) - 2px);
  overflow: hidden;
  background: var(--c-gris, #ddd);
  cursor: pointer;

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

._mediaListSidebar--meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 8);
}

._mediaListSidebar--title {
  font-size: var(--sl-font-size-small);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

._mediaListSidebar--type {
  font-size: var(--sl-font-size-x-small);
  color: var(--c-gris_fonce, #666);
  text-transform: capitalize;
}

._mediaListSidebar--remove {
  flex-shrink: 0;
}

._mediaListSidebar--instructions {
  flex-shrink: 0;
  margin: 0;
  padding-top: calc(var(--spacing) / 2);
  font-size: var(--sl-font-size-small);
  color: var(--c-gris_fonce, #666);
  text-align: center;
  line-height: 1.4;
}

._mediaListSidebar--footer {
  flex-shrink: 0;
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) / 3);
  padding-top: calc(var(--spacing) / 2);
  border-top: 1px solid var(--c-gris, #ccc);
}

._mediaListSidebar--modeBtn {
  flex: 1;
  min-height: 3.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) / 4);
  font-weight: 700;
  font-size: var(--sl-font-size-small);
  letter-spacing: 0.04em;

  ::v-deep .b-icon.bi {
    width: 1.5rem;
    height: 1.5rem;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.mediaListReorder-move {
  position: relative;
  z-index: 1;
  transition: transform 0.35s cubic-bezier(0.19, 1, 0.22, 1);
}

.mediaListReorder-enter-active,
.mediaListReorder-leave-active {
  transition: opacity 0.25s cubic-bezier(0.19, 1, 0.22, 1),
    transform 0.35s cubic-bezier(0.19, 1, 0.22, 1);
}

.mediaListReorder-enter,
.mediaListReorder-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.mediaListReorder-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 0;
}
</style>
