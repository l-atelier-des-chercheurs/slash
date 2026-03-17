<template>
  <div class="_itemModal">
    <div class="_itemModal--overlay" @click="closeModal" />
    <button
      type="button"
      class="u-button u-button_icon u-button_glass _closeBtn"
      @click="$emit('close')"
      :title="$t('close')"
    >
      <b-icon icon="x-lg" />
    </button>

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
          <button
            class="u-button u-button_icon"
            :class="{ 'is--active': current_view === 'qrcode' }"
            @click="setView('qrcode')"
            :title="$t('share')"
          >
            <svg
              enable-background="new 0 0 90 90"
              viewBox="0 0 90 90"
              xmlns="http://www.w3.org/2000/svg"
              width="1.35rem"
              height="1.35rem"
            >
              <path
                d="m48 0v42h42v-42zm36 36h-30v-30h30zm-71 41h16v-16h-16zm-13 13h42v-42h-42zm6-36h30v30h-30zm57-6h-15v13h15zm6 6h8v7h-8v12h-8v-8h-9v8h5v9h-9v8h21v-8h13v-9h-5v-8h13v-17h-21zm-69-12h42v-42h-42zm6-36h30v30h-30zm84 84v-8h-8v8zm-77-61h16v-16h-16zm64-16h-16v16h16z"
              ></path>
            </svg>
          </button>
        </div>
        <div class="_meta--content">
          <transition name="flip-panel" mode="out-in">
            <div
              v-if="current_view === 'informations'"
              key="informations"
              class="_panel"
            >
              <ItemMeta :file="file" @removed="$emit('close')" />
            </div>
            <div
              v-else-if="current_view === 'chats'"
              key="chats"
              class="_panel _panel_chats"
            >
              <ItemChat
                v-if="has_opened_chats"
                :file="file"
                @close="setView('informations')"
              />
            </div>
            <div
              v-else-if="current_view === 'qrcode'"
              key="qrcode"
              class="_panel _panel_qrcode"
            >
              <QRCodeWithLink
                v-if="has_opened_qrcode"
                :url="media_preview_url"
              />
            </div>
          </transition>
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
import ItemMeta from "./ItemMeta.vue";
import QRCodeWithLink from "@/adc-core/ui/QRCodeWithLink.vue";

export default {
  props: {
    file: {
      type: Object,
      required: true,
    },
  },
  components: {
    ItemChat,
    ItemMeta,
    QRCodeWithLink,
  },
  data() {
    return {
      current_view: "informations",
      has_opened_chats: false,
      has_opened_qrcode: false,
    };
  },
  created() {},
  mounted() {
    // Clear any existing text selection to prevent modal content from being selected
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    window.addEventListener("keyup", this.handleKeyPress);
  },
  beforeDestroy() {
    window.removeEventListener("keyup", this.handleKeyPress);
  },
  watch: {
    current_view(new_view) {
      if (new_view === "chats") this.has_opened_chats = true;
      if (new_view === "qrcode") this.has_opened_qrcode = true;
    },
  },
  computed: {
    media_preview_url() {
      if (!this.file.$path) return "";
      return (
        window.location.origin +
        "/_previewmedia?path_to_meta=" +
        this.file.$path
      );
    },
    has_geolocation() {
      return (
        !!this.file.$location &&
        !!this.file.$location.latitude &&
        !!this.file.$location.longitude
      );
    },
  },
  methods: {
    handleKeyPress($event) {
      if ($event.key === "Escape") {
        this.closeModal();
        $event.stopImmediatePropagation();
      }
    },
    setView(view_name) {
      this.current_view = view_name;
    },
    closeModal() {
      this.$emit("close");
    },
  },
};
</script>
<style lang="scss" scoped>
._closeBtn {
  position: absolute;
  top: 0;
  right: 0;
  margin: var(--spacing);
  z-index: 1;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}
._itemModal {
  position: fixed;
  width: 100%;
  height: 100%;
  padding: 5vmin;
  overflow: hidden;
  z-index: 1001;
  transition: opacity 0.3s ease;
}
._itemModal--overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(241, 241, 241, 0.2);
  backdrop-filter: blur(10px);
  z-index: -1;
  cursor: pointer;

  transition: backdrop-filter 0.3s ease;

  &:hover {
    backdrop-filter: blur(2px);
  }
}
._itemModal--contentWrapper {
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) * 1);
  height: 100%;
  pointer-events: none;

  ._file {
    flex: 1;
    background: white;
    border-radius: var(--border-radius);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);

    ::v-deep ._mediaContent {
      pointer-events: auto;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;

      ._mediaContent--image {
        position: absolute;
        width: 100%;
        height: 100%;

        object-fit: contain;
        max-width: none;
      }
    }
  }

  ._meta {
    flex: 0 0 320px;
  }
}

._meta {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) * 1);
  // padding: calc(var(--spacing) * 1);
  height: 100%;
}

._meta--buttons {
  display: flex;
  flex-flow: row nowrap;
  gap: calc(var(--spacing) / 2);

  > button {
    pointer-events: auto;
  }
}
._meta--content {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  perspective: 1200px;
}

._panel {
  position: absolute;
  inset: 0;
  pointer-events: auto;
}

._panel_chats {
  border-radius: var(--border-radius);
  background: var(--c-noir);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

._panel_qrcode {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  overflow: auto;
  padding: calc(var(--spacing) * 1) calc(var(--spacing) * 1.5);
}

.flip-panel-enter-active,
.flip-panel-leave-active {
  transition: transform 0.25s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.25s ease;
}

.flip-panel-enter {
  transform: perspective(1200px) rotateY(-90deg);
  opacity: 0;
}

.flip-panel-leave-to {
  transform: perspective(1200px) rotateY(90deg);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .flip-panel-enter-active,
  .flip-panel-leave-active {
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
