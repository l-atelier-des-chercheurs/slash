<template>
  <div class="_openedList">
    <!-- <DLabel :str="list_meta.title" /> -->
    <transition-group name="listComplete" class="_listItems" appear>
      <div key="header">
        <DLabel :str="$t('new_note_todo')" />
      </div>
      <div class="_listItem _listItem_newItem" key="newItem">
        <TextInput
          :content.sync="new_item_title"
          :placeholder="$t('title')"
          :custom_formats="[]"
          @onEnter="createNewItem"
        >
          <template #suffix>
            <button
              type="button"
              class="u-button u-button_icon"
              @click="createNewItem"
            >
              <b-icon icon="plus-circle" />
            </button>
          </template>
        </TextInput>
      </div>

      <div
        v-if="list_items_done.length > 0"
        key="todo-separator"
        class="_separator"
      />

      <div key="list">
        <DLabel
          :str="
            $tc('list_of_notes_todo', local_todo_items.length, {
              count: local_todo_items.length,
            })
          "
        />
      </div>

      <template v-for="(item, index) in local_todo_items">
        <div
          class="_dropZone"
          :class="{
            _dropZone_active:
              draggedIndex !== null &&
              draggedIndex !== index &&
              draggedIndex !== index - 1,
            _dropZone_hovered: dragOverIndex === index && draggedIndex !== null,
          }"
          :key="item.$path + '_dropZone'"
          @dragover.prevent="handleDragOver($event, index)"
          @dragenter.prevent="handleDragEnter(index)"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop($event, index)"
        ></div>

        <TodoListItem
          :key="item.$path"
          :item="item"
          :index="index"
          :draggable="true"
          @toggle-state="toggleItemState"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
        />
        <div
          v-if="index === local_todo_items.length - 1"
          class="_dropZone _dropZone_last"
          :class="{
            _dropZone_active: draggedIndex !== null,
            _dropZone_hovered:
              dragOverIndex === index + 1 && draggedIndex !== null,
          }"
          :key="item.$path + '_dropZone_last'"
          @dragover.prevent="handleDragOver($event, index + 1)"
          @dragenter.prevent="handleDragEnter(index + 1)"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop($event, index + 1)"
        ></div>
      </template>

      <div v-if="local_todo_items.length === 0" key="no-todo-items" class="">
        <b-icon icon="check-lg" />
        <DLabel :str="$t('no_todo_items')" />
      </div>

      <div
        v-if="list_items_done.length > 0"
        key="done-separator"
        class="_separator"
      />

      <template v-if="list_items_done.length > 0">
        <div key="done-header">
          <DLabel
            :str="
              $tc('archived', list_items_done.length, {
                count: list_items_done.length,
              })
            "
          />
        </div>
        <TodoListItem
          v-for="item in list_items_done"
          :key="item.$path"
          :item="item"
          :draggable="false"
          @toggle-state="toggleItemState"
        />
      </template>
    </transition-group>

    <!-- <pre>{{ list_meta }}</pre> -->
  </div>
</template>
<script>
import TodoListItem from "./TodoListItem.vue";

export default {
  props: {
    path: {
      type: String,
      required: true,
    },
  },
  components: {
    TodoListItem,
  },
  data() {
    return {
      new_item_title: "",
      list_meta: undefined,
      draggedIndex: null,
      dragOverIndex: null,
      local_todo_items: [],

      opened_item_path: undefined,
    };
  },
  async created() {
    await this.fetchListMeta();
    this.$api.join({ room: this.path });
  },
  mounted() {},
  beforeDestroy() {
    this.$api.leave({ room: this.path });
  },
  watch: {
    list_items_todo: {
      handler(newItems) {
        // Update local items when computed property changes
        // Only update if the order actually changed (not just during drag)
        if (this.draggedIndex === null) {
          this.local_todo_items = [...newItems];
        }
      },
      immediate: true,
    },
  },
  computed: {
    list_items_todo() {
      if (
        this.list_meta === undefined ||
        Array.isArray(this.list_meta.notes_list) === false
      )
        return [];

      const all_notes = this.list_meta?.$files || [];

      return this.list_meta.notes_list.reduce((acc, meta) => {
        const note = all_notes.find((note) =>
          note.$path.endsWith("/" + meta.meta_filename)
        );
        if (note && note.state !== "done") {
          acc.push(note);
        }
        return acc;
      }, []);
    },
    list_items_done() {
      const all_notes = this.list_meta?.$files || [];

      const done_items = all_notes.reduce((acc, note) => {
        if (note?.state === "done") {
          acc.push(note);
        }
        return acc;
      }, []);

      // Sort by done_date descending (most recent first)
      return done_items.sort((a, b) => {
        const dateA = a.done_date ? new Date(a.done_date) : new Date(0);
        const dateB = b.done_date ? new Date(b.done_date) : new Date(0);
        return dateB - dateA; // descending order
      });
    },
  },
  methods: {
    async fetchListMeta() {
      const list_meta = await this.$api.getFolder({
        path: this.path,
      });
      this.list_meta = list_meta;
    },
    async createNewItem() {
      if (!this.new_item_title) return;
      const filename = `${this.new_item_title}.txt`;

      const { meta_filename } = await this.$api.uploadText({
        path: this.list_meta.$path,
        filename,
        content: "",
        additional_meta: {
          title: this.new_item_title,
          state: "todo",
        },
      });

      this.new_item_title = "";

      const current_list = JSON.parse(
        JSON.stringify(this.list_meta?.notes_list || [])
      );
      current_list.splice(0, 0, { meta_filename });

      this.$api.updateMeta({
        path: this.list_meta.$path,
        new_meta: {
          notes_list: current_list,
        },
      });
    },
    async toggleItemState(item, isChecked) {
      const new_meta = {
        state: isChecked ? "done" : "todo",
      };

      if (isChecked) {
        new_meta.done_date = new Date().toISOString();
      } else {
        new_meta.done_date = null;
      }

      await this.$api.updateMeta({
        path: item.$path,
        new_meta,
      });

      // Remove from notes_list when set to done
      if (isChecked) {
        const filename = item.$path.split("/").pop();
        const current_list = JSON.parse(
          JSON.stringify(this.list_meta?.notes_list || [])
        );
        const updated_list = current_list.filter(
          (meta) => meta.meta_filename !== filename
        );

        await this.$api.updateMeta({
          path: this.list_meta.$path,
          new_meta: {
            notes_list: updated_list,
          },
        });
      }
    },
    handleDragStart(event, item, index) {
      this.draggedIndex = index;
      // Event handling is already done in TodoListItem
    },
    handleDragEnd(event) {
      if (event.target && event.target.style) {
        event.target.style.opacity = "";
      }
      this.draggedIndex = null;
      this.dragOverIndex = null;
    },
    handleDragOver(event, index) {
      event.preventDefault();
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        this.dragOverIndex = index;
      }
    },
    handleDragEnter(index) {
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        this.dragOverIndex = index;
      }
    },
    handleDragLeave(event) {
      // Only clear if we're leaving the list item itself, not a child element
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        this.dragOverIndex = null;
      }
    },
    handleDrop(event, dropIndex) {
      event.preventDefault();
      if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
        return;
      }

      if (dropIndex > this.draggedIndex) {
        dropIndex--;
      }

      // Reorder items locally for immediate visual feedback
      const newItems = [...this.local_todo_items];
      const draggedItem = newItems[this.draggedIndex];
      newItems.splice(this.draggedIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);
      this.local_todo_items = newItems;

      // Update the order on the server
      this.updateTodoOrder(newItems);

      this.draggedIndex = null;
      this.dragOverIndex = null;
    },
    async updateTodoOrder(reorderedItems) {
      // Extract meta_filename from each reordered item
      const reorderedMetaFilenames = reorderedItems.map((item) => {
        const filename = item.$path.split("/").pop();
        return { meta_filename: filename };
      });

      // Get current notes_list and separate done items
      const current_list = JSON.parse(
        JSON.stringify(this.list_meta?.notes_list || [])
      );

      const all_notes = this.list_meta?.$files || [];
      const doneItemsInList = current_list.filter((meta) => {
        const note = all_notes.find((note) =>
          note.$path.endsWith("/" + meta.meta_filename)
        );
        return note && note.state === "done";
      });

      // Create new list: reordered todo items first, then done items
      const updated_list = [...reorderedMetaFilenames, ...doneItemsInList];

      await this.$api.updateMeta({
        path: this.list_meta.$path,
        new_meta: {
          notes_list: updated_list,
        },
      });
    },
  },
};
</script>
<style lang="scss" scoped>
._openedList {
  position: relative;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;

  width: 100%;
  max-width: 500px;
  padding: calc(var(--spacing) * 2);
  margin: 0 auto;
}

._listItems {
  position: relative;
  // display: flex;
  // flex-flow: column nowrap;
  background-color: rgba(0, 0, 0, 0.1);
  padding: calc(var(--spacing) / 2);
  border-radius: calc(var(--border-radius) * 2);

  :deep(.u-label) {
    color: white;
  }
}

._todoList {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) / 2);
}

._listItem {
  position: relative;
  background-color: white;
  padding: calc(var(--spacing) / 2);
  border-radius: var(--border-radius);
  margin-bottom: calc(var(--spacing) / 4);
}

._listItem_newItem {
  // display: flex;
  // flex-flow: row nowrap;
  padding: 0;
  background-color: transparent;
  padding-right: calc(var(--spacing) / 4);
  gap: calc(var(--spacing) / 2);

  .u-button {
    color: white;
  }
}

._separator {
  margin: calc(var(--spacing)) 0;
  // border: none;
  // border-top: 1px solid var(--c-bleumarine_clair);
}

._listItems_done {
  margin-top: calc(var(--spacing) / 2);
}

._dropZone {
  position: relative;
  height: calc(var(--spacing) / 1);
  margin-top: calc(var(--spacing) / -2);
  margin-bottom: calc(var(--spacing) / -2);
  border-radius: var(--border-radius);
  transition: height 0.2s ease, background-color 0.2s ease;
  background-color: transparent;
  height: 20px;
  width: calc(100% + 20px);
  margin-left: -10px;
  background-color: transparent;
  pointer-events: none;

  z-index: 1000;

  &:not(._dropZone_first) {
  }

  &::before {
    content: "•";
    font-weight: 600;
    font-family: "Fira Mono";
    position: absolute;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    // top: -10px;
    line-height: 0;
    left: 0;
    font-size: 150%;
    color: white;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
}

._dropZone_active {
  pointer-events: auto;
  &::before {
    opacity: 0.2;
  }
}

._dropZone_hovered {
  // background-color: white;

  &::before {
    opacity: 1;
  }

  + ._todoListItem {
    transform: translateY(5px);
    transition: transform 0.2s 0.3s ease;
  }
}
</style>
