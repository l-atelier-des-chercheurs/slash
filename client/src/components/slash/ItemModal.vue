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
            <b-icon icon="qr-code" />
          </button>
        </div>
        <div class="_meta--content">
          <div
            class="_flipCard"
            :class="{ 'is--flipped': current_view === 'chats' }"
            v-show="current_view !== 'qrcode'"
          >
            <div class="_flipCard--inner">
              <section
                class="_flipCard--face _flipCard--faceFront"
                :aria-hidden="current_view !== 'informations'"
              >
                <ItemMeta :file="file" @removed="$emit('close')" />
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
          <div
            class="_meta--content--qrcode"
            v-show="current_view === 'qrcode'"
          >
            <QRCodeWithLink v-if="has_opened_qrcode" :url="media_preview_url" />
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
  overflow: visible;
}

._meta--content--chats {
  height: 100%;
  border-radius: var(--border-radius);
  background: var(--c-noir);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
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
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
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

._meta--content--qrcode {
  position: absolute;
  inset: 0;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  overflow: auto;
  pointer-events: auto;
  padding: calc(var(--spacing) * 1) calc(var(--spacing) * 1.5);
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
