<template>
  <div class="_itemModal">
    <div class="_itemModal--overlay" />
    <div class="_itemModal--contentWrapper">
      <div class="_meta">
        <div class="_meta--buttons">
          <button
            type="button"
            class="u-button"
            @click="current_view = 'informations'"
            :title="$t('informations')"
          >
            <b-icon icon="info-circle" />
          </button>
          <button
            class="u-button"
            @click="current_view = 'chats'"
            :title="$t('chats')"
          >
            <b-icon icon="chat-left-text-fill" />
          </button>
        </div>
        <div class="_meta--content">
          <div v-if="current_view === 'informations'">
            Non ex, non tempor consectetur. Tempor consectetur tempor veniam
            occaecat sunt labore laboris. Tempor veniam occaecat sunt labore
            laboris, deserunt mollit. Sunt labore laboris deserunt mollit ut,
            elit. Deserunt mollit ut elit nisi proident cillum voluptate. Ut
            elit nisi proident cillum. Nisi proident, cillum voluptate non.
            Voluptate non aute elit. Aute elit ut, cillum. Cillum ut incididunt,
            non.
          </div>
          <div v-if="current_view === 'chats'">
            <ItemChat :file="file" @close="current_view = 'informations'" />
          </div>
        </div>
      </div>
      <div class="_file">
        <MediaContent
          :file="file"
          :resolution="1600"
          :context="'full'"
          :show_fs_button="true"
          :zoom_on_click="false"
        />
      </div>
    </div>
  </div>
</template>
<script>
import ItemChat from "./ItemChat.vue";
export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
  },
  components: {
    ItemChat,
  },
  data() {
    return {
      current_view: "informations",
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
  methods: {},
};
</script>
<style lang="scss" scoped>
._itemModal {
  position: fixed;
  width: 100%;
  height: 100%;
  padding: calc(var(--spacing) * 2);
  border-radius: var(--border-radius);
  overflow: hidden;
  z-index: 10001;
}
._itemModal--overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(241, 241, 241, 0.5);
  backdrop-filter: blur(8px);
  z-index: -1;
}
._itemModal--contentWrapper {
  display: flex;
  flex-direction: row nowrap;
  height: 100%;

  ._file {
    flex: 1;
  }

  ._meta {
    flex: 0 1 280px;
  }
}

._meta {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) * 1);
  padding: calc(var(--spacing) * 1);
}

._meta--buttons {
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) / 2);
}
._meta--content {
  background: white;
  padding: calc(var(--spacing) * 1);
  border-radius: var(--border-radius);
}

._file {
  position: relative;
  width: 100%;
  height: 100%;

  overflow: hidden;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
}
</style>
