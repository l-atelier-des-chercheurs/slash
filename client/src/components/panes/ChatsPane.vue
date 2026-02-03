<template>
  <div class="_chatPane">
    <div class="_content">
      <div v-if="!opened_chat_slug" class="_chatsList">
        <div class="_chatsList--header">
          <div class="u-label">{{ $t("list_of_topics") }}</div>
        </div>
        <div class="_chatsList--content">
          <div v-if="sorted_chats.length === 0" class="_placeholder">
            <p>{{ $t("no_content") }}</p>
          </div>
          <ChatPreview
            v-for="chat in sorted_chats"
            :key="chat.$path"
            :chat="chat"
            :is-opened="false"
            @toggle="toggleChat"
          />
        </div>
      </div>

      <transition name="pagechange">
        <div v-if="opened_chat_slug" class="_openedChatContainer">
          <OpenedChat
            :key="opened_chat_slug"
            :chat_slug="opened_chat_slug"
            @close="opened_chat_slug = null"
          />
        </div>
      </transition>
    </div>
  </div>
</template>
<script>
import ChatPreview from "@/adc-core/chats/ChatPreview.vue";
import OpenedChat from "@/adc-core/chats/OpenedChat.vue";
import authorMessageMixin from "@/adc-core/chats/mixins/authorMessageMixin";

export default {
  props: {
    project: Object,
  },
  components: {
    ChatPreview,
    OpenedChat,
  },
  mixins: [authorMessageMixin],
  data() {
    return {
      chats: [],
      path: "chats",
      opened_chat_slug: null,
    };
  },
  async mounted() {
    await this.loadChats();
    this.$api.join({ room: this.path });
  },
  beforeDestroy() {
    this.$api.leave({ room: this.path });
  },
  computed: {
    filtered_chats() {
      return this.chats.filter((chat) => {
        if (chat.linked_project_path !== this.project.$path) return false;
        return this.canLoggedinSeeFolder({
          folder: chat,
        });
      });
    },
    sorted_chats() {
      return this.filtered_chats.sort((a, b) => {
        return +new Date(b.$date_modified) - +new Date(a.$date_modified);
      });
    },
  },
  methods: {
    async loadChats() {
      this.chats = await this.$api
        .getFolders({
          path: this.path,
        })
        .catch((err) => {
          return [];
        });
    },
    toggleChat(path) {
      const chat_slug = this.getFilename(path);
      this.opened_chat_slug =
        this.opened_chat_slug === chat_slug ? null : chat_slug;
    },
  },
};
</script>
<style lang="scss" scoped>
._chatPane {
  position: relative;
  height: 100%;
  background-color: var(--color-chats);
  // padding: calc(var(--spacing) * 1);
  display: flex;
  flex-flow: column nowrap;
}

._content {
  flex: 1 1 0;
  height: 100%;
  max-width: 450px;
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  position: relative;
}

._chatsList {
  height: 100%;
  overflow: auto;
  padding: calc(var(--spacing) / 2);
}

._chatsList--header {
  margin-bottom: calc(var(--spacing) / 2);
  color: white;

  .u-label {
    color: white;
  }
}

._chatsList--content {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) / 2);
}

._placeholder {
  text-align: center;
  opacity: 0.5;
  color: white;
  margin-top: calc(var(--spacing) * 2);
}

._openedChatContainer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: var(--color-chats);
}
</style>
