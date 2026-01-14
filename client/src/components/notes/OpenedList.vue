<template>
  <div class="_openedList">
    <!-- <DLabel :str="list_meta.title" /> -->
    <transition-group name="listComplete" class="_listItems">
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
        <DLabel :str="$t('list_of_notes_todo')" />
      </div>
      <SlickList
        v-if="list_items_todo.length > 0"
        class="_slickList"
        key="todo-list"
        axis="y"
        :value="list_items_todo"
        @input="updateTodoOrder($event)"
        :useDragHandle="false"
      >
        <SlickItem
          v-for="(item, index) in list_items_todo"
          :key="item.$path"
          :index="index"
          class="_listItem _listItem_todo"
        >
          <input
            type="checkbox"
            :checked="item.state === 'done'"
            @change="toggleItemState(item, $event.target.checked)"
            class="_checkbox"
          />
          <span class="_itemTitle">{{ item.title }}</span>
        </SlickItem>
      </SlickList>
      <div v-else key="no-todo-items" class="">
        <b-icon icon="check-lg" />
      </div>

      <hr
        v-if="list_items_done.length > 0"
        key="done-separator"
        class="_separator"
      />

      <template v-if="list_items_done.length > 0">
        <div key="done-header">
          <DLabel :str="$t('list_of_notes_done')" />
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
          <span class="_itemTitle">{{ item.title }}</span>
        </div>
      </template>
    </transition-group>

    <!-- <pre>{{ list_meta }}</pre> -->
  </div>
</template>
<script>
import { SlickList, SlickItem } from "vue-slicksort";

export default {
  props: {
    path: {
      type: String,
      required: true,
    },
  },
  components: {
    SlickList,
    SlickItem,
  },
  data() {
    return {
      new_item_title: "",
      list_meta: undefined,
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
  watch: {},
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
      debugger;

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

._slickList {
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

  &:active {
    cursor: grabbing;
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
