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

      <hr
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
      <div
        v-for="(item, index) in local_todo_items"
        :key="item.$path"
        class="_listItem _listItem_todo"
        :class="{
          _dragging: draggedIndex === index,
          '_drag-over': dragOverIndex === index,
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, index)"
        @dragenter.prevent="handleDragEnter(index)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop($event, index)"
      >
        <input
          type="checkbox"
          :checked="item.state === 'done'"
          @change="toggleItemState(item, $event.target.checked)"
          class="_checkbox"
        />
        <span class="_itemTitle">{{ item.title }}</span>
      </div>

      <div v-if="local_todo_items.length === 0" key="no-todo-items" class="">
        <b-icon icon="check-lg" />
        <DLabel :str="$t('no_todo_items')" />
      </div>

      <hr
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
        <div
          class="_listItem _listItem_done"
          v-for="item in list_items_done"
          :key="item.$path"
        >
          <input
            type="checkbox"
            :checked="true"
            @change="toggleItemState(item, $event.target.checked)"
            class="_checkbox"
          />
          <span class="_itemTitle"
            >{{ item.title }} {{ showDoneDate(item) }}</span
          >
        </div>
      </template>
    </transition-group>

    <!-- <pre>{{ list_meta }}</pre> -->
  </div>
</template>
<script>
export default {
  props: {
    path: {
      type: String,
      required: true,
    },
  },
  components: {},
  data() {
    return {
      new_item_title: "",
      list_meta: undefined,
      draggedIndex: null,
      dragOverIndex: null,
      local_todo_items: [],
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

      // this.$api.updateMeta({
      //   path: this.list_meta.$path,
      //   new_meta: {
      //     notes_list: [...this.list_items, { meta_filename }],
      //   },
      // });
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
    },
    handleDragStart(event, index) {
      this.draggedIndex = index;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/html", event.target);
      // Add a slight delay to allow the drag image to be set
      event.target.style.opacity = "0.5";
    },
    handleDragEnd(event) {
      event.target.style.opacity = "";
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
    showDoneDate(item) {
      if (item.done_date) {
        return ` - ${this.$t("done_on")} ${new Date(
          item.done_date
        ).toLocaleDateString()}`;
      }
      return "";
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
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) / 2);
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
}

._listItem_newItem {
  // display: flex;
  // flex-flow: row nowrap;
  padding: 0;
  background-color: transparent;
  padding-right: calc(var(--spacing) / 4);
  margin-bottom: calc(var(--spacing) * 1);
  gap: calc(var(--spacing) / 2);

  .u-button {
    color: white;
  }
}

._listItem_todo {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: calc(var(--spacing) / 2);
  cursor: grab;
  transition: transform 0.2s ease, opacity 0.2s ease;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &._dragging {
    opacity: 0.5;
  }

  &._drag-over {
    transform: translateY(4px);
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--c-bleumarine_clair);
      border-radius: 2px;
      opacity: 0.8;
      transition: opacity 0.2s ease;
    }
  }
}

._checkbox {
  flex: 0 0 auto;
  cursor: pointer;
}

._itemTitle {
  flex: 1 1 auto;
}

._separator {
  margin: calc(var(--spacing)) 0;
  border: none;
  border-top: 1px solid var(--c-bleumarine_clair);
}

._listItems_done {
  margin-top: calc(var(--spacing) / 2);
}

._listItem_done {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: calc(var(--spacing) / 2);
  opacity: 0.7;
}
</style>
