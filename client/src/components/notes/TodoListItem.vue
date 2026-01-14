<template>
  <div
    class="_todoListItem"
    :class="{
      '_todoListItem--todo': item.state === 'todo',
      '_todoListItem--done': item.state === 'done',
      '_todoListItem--expanded': isExpanded,
      '_todoListItem--dragging': isDragging,
    }"
    :draggable="item.state === 'todo' && draggable"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="handleItemClick"
  >
    <div class="_todoListItem_header">
      <input
        type="checkbox"
        :checked="item.state === 'done'"
        @change="toggleItemState"
        @click.stop
        class="_checkbox"
      />
      <span class="_itemTitle">{{ item.title }}</span>
      <span v-if="item.state === 'done'" class="u-instructions _doneDate">
        {{ showDoneDate(item) }}
      </span>
      <button
        v-if="isExpanded"
        type="button"
        class="u-button u-button_icon u-button_small"
        @click.stop="collapse"
        title="Close"
      >
        <b-icon icon="chevron-up" />
      </button>
      <button
        v-else
        type="button"
        class="u-button u-button_icon u-button_small"
        @click.stop="expand"
        title="Open note"
      >
        <b-icon icon="chevron-down" />
      </button>
    </div>

    <transition name="expand">
      <div v-if="isExpanded" class="_todoListItem_content">
        <CollaborativeEditor3
          v-if="itemContent !== null"
          :path="item.$path"
          :content="itemContent"
          :can_edit="can_edit"
          :mode="'always_active'"
          :save_format="'html'"
          :content_type="'markdown'"
          :custom_formats="[]"
          class="_noteEditor"
        />
        <div v-else class="_loading">
          <b-icon icon="arrow-repeat" />
          <span>{{ $t("loading") }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: "TodoListItem",
  props: {
    item: {
      type: Object,
      required: true,
    },
    index: {
      type: Number,
      default: null,
    },
    draggable: {
      type: Boolean,
      default: true,
    },
    can_edit: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isExpanded: false,
      isDragging: false,
      itemContent: null,
      isLoadingContent: false,
    };
  },
  methods: {
    async toggleItemState(event) {
      const isChecked = event.target.checked;
      this.$emit("toggle-state", this.item, isChecked);
    },
    async handleItemClick(event) {
      // Don't expand if clicking on checkbox or button
      if (
        event.target.closest("._checkbox") ||
        event.target.closest("button")
      ) {
        return;
      }

      if (!this.isExpanded) {
        await this.expand();
      }
    },
    async expand() {
      if (this.isExpanded) return;

      this.isExpanded = true;

      // Load content if not already loaded
      if (this.itemContent === null && !this.isLoadingContent) {
        await this.loadContent();
      }
    },
    collapse() {
      this.isExpanded = false;
    },
    async loadContent() {
      if (this.isLoadingContent) return;

      // Check if item already has content
      if (this.item.$content !== undefined) {
        this.itemContent = this.item.$content || "";
        return;
      }

      this.isLoadingContent = true;
      try {
        // Get the file content
        const fileData = await this.$api.getFile({
          path: this.item.$path,
        });

        // Use $content if available, otherwise empty string
        this.itemContent = fileData.$content || "";
      } catch (error) {
        console.error("Error loading item content:", error);
        this.itemContent = "";
      } finally {
        this.isLoadingContent = false;
      }
    },
    handleDragStart(event) {
      this.isDragging = true;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/html", event.target);
      if (event.target && event.target.style) {
        event.target.style.opacity = "0.5";
      }
      this.$emit("drag-start", event, this.item, this.index);
    },
    handleDragEnd(event) {
      this.isDragging = false;
      if (event.target && event.target.style) {
        event.target.style.opacity = "";
      }
      this.$emit("drag-end", event);
    },
    showDoneDate(item) {
      if (item.done_date) {
        return `${new Date(item.done_date).toLocaleDateString()}`;
      }
      return "";
    },
  },
};
</script>

<style lang="scss" scoped>
._todoListItem {
  position: relative;
  background-color: white;
  padding: calc(var(--spacing) / 2);
  border-radius: var(--border-radius);
  margin-bottom: calc(var(--spacing) / 4);
  transition: transform 0.2s ease, opacity 0.2s ease;
  cursor: pointer;

  &--todo {
    display: flex;
    flex-flow: column nowrap;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    &._todoListItem--dragging {
      opacity: 0.5;
    }
  }

  &--done {
    display: flex;
    flex-flow: column nowrap;
    opacity: 0.7;
  }

  &--expanded {
    ._todoListItem_content {
      margin-top: calc(var(--spacing) / 2);
      padding-top: calc(var(--spacing) / 2);
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }
  }
}

._todoListItem_header {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  width: 100%;
  gap: calc(var(--spacing) / 2);
  user-select: none;
}

._checkbox {
  flex: 0 0 auto;
  cursor: pointer;
}

._itemTitle {
  flex: 1 1 auto;
}

._doneDate {
  flex: 0 0 auto;
  font-size: 0.85em;
  color: rgba(0, 0, 0, 0.6);
}

._todoListItem_content {
  position: relative;
  min-height: 100px;
}

._noteEditor {
  width: 100%;
}

._loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--spacing) / 2);
  padding: calc(var(--spacing) * 2);
  color: rgba(0, 0, 0, 0.5);

  b-icon {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Expand transition
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
}

.expand-enter-to,
.expand-leave {
  max-height: 1000px;
  opacity: 1;
}
</style>
