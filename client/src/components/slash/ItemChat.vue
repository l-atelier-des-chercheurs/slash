<template>
  <div v-if="is_loading" class="_loader">
    <LoaderSpinner />
  </div>
  <div v-else-if="!chat_slug">
    <!-- <p class="_itemChat--pathContent">{{ file.$path }}</p> -->
    <!-- <br /> -->
    <button type="button" class="u-button" @click="createChat">
      <b-icon icon="chat-left-text" />
      {{ $t("comment") || "Comment" }}
    </button>
  </div>
  <div v-else class="_chatWrapper">
    <OpenedChat :chat_slug="chat_slug" @close="chat_slug = null" />
  </div>
</template>
<script>
import OpenedChat from "../../adc-core/chats/OpenedChat.vue";

export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
  },
  components: {
    OpenedChat,
  },
  data() {
    return {
      chat_slug: null,
      is_loading: true,
    };
  },
  async mounted() {
    await this.findChat();
    this.is_loading = false;
  },
  computed: {},
  methods: {
    async findChat() {
      const chats = await this.$api.getFolders({ path: "chats" });
      if (!chats || !Array.isArray(chats)) return;

      const matching_chat = chats.find(
        (c) => c.linked_file_path === this.file.$path
      );
      if (matching_chat) {
        this.chat_slug = matching_chat.$path.split("/").pop();
      }
    },
    async createChat() {
      const new_folder_slug = await this.$api.createFolder({
        path: "chats",
        additional_meta: {
          $contributors: "everyone",
          $status: "public",
          linked_file_path: this.file.$path,
        },
      });
      this.chat_slug = new_folder_slug;
    },
  },
};
</script>
<style lang="scss" scoped>
._itemChat--pathContent {
  word-break: break-all;
  margin: 0;
}
._chatWrapper {
  position: relative;
  height: 100%;

  ::v-deep {
    ._openedChat {
      border: none;
      background: transparent;
    }
    ._openedChat--content,
    ._dayTitle {
      background: var(--c-gris);
    }
    ._openedChat--footer {
      background: white;
    }
    ._openedChat--header {
      display: none;
    }
    ._unreadMessages {
      background: var(--c-gris);
    }
  }
}
._loader {
  display: flex;
  justify-content: center;
  padding: 2rem;
}
</style>
