<template>
  <div class="_itemModal">
    <div class="_itemModal--overlay" />
    <div class="_itemModal--contentWrapper">
      <div class="_meta">
        <div class="_meta--buttons">
          <button
            type="button"
            class="u-button u-button_icon"
            :class="{ 'is--active': current_view === 'informations' }"
            @click="setView('informations')"
            :title="$t('informations')"
          >
            <b-icon icon="info-circle" />
          </button>
          <button
            class="u-button u-button_icon"
            :class="{ 'is--active': current_view === 'chats' }"
            @click="setView('chats')"
            :title="$t('chats')"
          >
            <b-icon icon="chat-left-text-fill" />
          </button>
        </div>
        <div class="_meta--content">
          <div
            class="_flipCard"
            :class="{ 'is--flipped': current_view === 'chats' }"
          >
            <div class="_flipCard--inner">
              <section
                class="_flipCard--face _flipCard--faceFront"
                :aria-hidden="current_view !== 'informations'"
              >
                <div class="_meta--content--informations">
                  Non ex, non tempor consectetur. Tempor consectetur tempor
                  veniam occaecat sunt labore laboris. Tempor veniam occaecat
                  sunt labore laboris, deserunt mollit. Sunt labore laboris
                  deserunt mollit ut, elit. Deserunt mollit ut elit nisi
                  proident cillum voluptate. Ut elit nisi proident cillum. Nisi
                  proident, cillum voluptate non. Voluptate non aute elit. Aute
                  elit ut, cillum. Cillum ut incididunt, non. Non ex, non tempor
                  consectetur. Tempor consectetur tempor veniam occaecat sunt
                  labore laboris. Tempor veniam occaecat sunt labore laboris,
                  deserunt mollit. Sunt labore laboris deserunt mollit ut, elit.
                  Deserunt mollit ut elit nisi proident cillum voluptate. Ut
                  elit nisi proident cillum. Nisi proident, cillum voluptate
                  non. Voluptate non aute elit. Aute elit ut, cillum. Cillum ut
                  incididunt, non. Non ex, non tempor consectetur. Tempor
                  consectetur tempor veniam occaecat sunt labore laboris. Tempor
                  veniam occaecat sunt labore laboris, deserunt mollit. Sunt
                  labore laboris deserunt mollit ut, elit. Deserunt mollit ut
                  elit nisi proident cillum voluptate. Ut elit nisi proident
                  cillum. Nisi proident, cillum voluptate non. Voluptate non
                  aute elit. Aute elit ut, cillum. Cillum ut incididunt, non.
                  Non ex, non tempor consectetur. Tempor consectetur tempor
                  veniam occaecat sunt labore laboris. Tempor veniam occaecat
                  sunt labore laboris, deserunt mollit. Sunt labore laboris
                  deserunt mollit ut, elit. Deserunt mollit ut elit nisi
                  proident cillum voluptate. Ut elit nisi proident cillum. Nisi
                  proident, cillum voluptate non. Voluptate non aute elit. Aute
                  elit ut, cillum. Cillum ut incididunt, non. Non ex, non tempor
                  consectetur. Tempor consectetur tempor veniam occaecat sunt
                  labore laboris. Tempor veniam occaecat sunt labore laboris,
                  deserunt mollit. Sunt labore laboris deserunt mollit ut, elit.
                  Deserunt mollit ut elit nisi proident cillum voluptate. Ut
                  elit nisi proident cillum. Nisi proident, cillum voluptate
                  non. Voluptate non aute elit. Aute elit ut, cillum. Cillum ut
                  incididunt, non.
                </div>
              </section>
              <section
                class="_flipCard--face _flipCard--faceBack"
                :aria-hidden="current_view !== 'chats'"
              >
                <div class="_meta--content--chats">
                  <ItemChat
                    v-if="has_opened_chats"
                    :file="file"
                    @close="setView('informations')"
                  />
                </div>
              </section>
            </div>
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
      has_opened_chats: false,
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {
    current_view(new_view) {
      if (new_view === "chats") this.has_opened_chats = true;
    },
  },
  computed: {},
  methods: {
    setView(view_name) {
      this.current_view = view_name;
    },
  },
};
</script>
<style lang="scss" scoped>
._itemModal {
  position: fixed;
  width: 100%;
  height: 100%;
  padding: calc(var(--spacing) * 2);
  overflow: hidden;
  z-index: 10001;
}
._itemModal--overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(241, 241, 241, 0.85);
  z-index: -1;
}
._itemModal--contentWrapper {
  display: flex;
  flex-flow: row nowrap;
  height: 100%;

  ._file {
    flex: 1;
  }

  ._meta {
    flex: 0 0 320px;
  }
}

._meta {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) * 1);
  padding: calc(var(--spacing) * 1);
  height: 100%;
}

._meta--buttons {
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) / 2);
}
._meta--content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: visible;
}

._meta--content--informations {
  height: 100%;
  background: white;
  border-radius: var(--border-radius);
  overflow: auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  padding: calc(var(--spacing) * 1);
}

._meta--content--chats {
  height: 100%;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

._flipCard {
  position: relative;
  width: 100%;
  height: 100%;
  perspective: 1200px;
}

._flipCard--inner {
  position: absolute;
  inset: 0;
  transition: transform 1420ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-style: preserve-3d;
  will-change: transform;
}

._flipCard.is--flipped ._flipCard--inner {
  transform: rotateY(180deg);
}

._flipCard--face {
  position: absolute;
  inset: 0;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

._flipCard--faceFront {
  transform: rotateY(0deg);
  pointer-events: auto;
}

._flipCard--faceBack {
  transform: rotateY(180deg);
  pointer-events: none;
}

._flipCard.is--flipped ._flipCard--faceFront {
  pointer-events: none;
}

._flipCard.is--flipped ._flipCard--faceBack {
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  ._flipCard--inner {
    transition: none;
  }
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
