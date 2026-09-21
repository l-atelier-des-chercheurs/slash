<template>
  <div class="_foldersPanel" :class="{ 'is--overlay': is_overlay }">
    <div class="_foldersPanel--inner">
      <header class="_foldersPanel--header">
        <div class="_foldersPanel--brand">
          <SlashLogo class="_foldersPanel--logo" />
          <div>
            <h1 class="_foldersPanel--title">Living archive</h1>
            <p class="_foldersPanel--subtitle">
              {{
                is_overlay
                  ? "Pick a folder to open it"
                  : "Publications and documentation spaces"
              }}
            </p>
          </div>
        </div>
        <div class="_foldersPanel--headerButtons">
          <button
            v-if="is_overlay"
            type="button"
            class="u-button u-button_icon"
            title="Close"
            @click="$emit('close')"
          >
            <b-icon icon="x-lg" />
          </button>
        </div>
      </header>

      <!-- Publication section (home only) -->
      <section v-if="!is_overlay" class="_foldersPanel--section">
        <h2 class="_foldersPanel--sectionTitle">Publication</h2>
        <div class="_foldersPanel--grid">
          <button
            type="button"
            class="_foldersPanel--card is--create"
            @click="startCreatePublication('postcard')"
          >
            <span class="_foldersPanel--cardTitle is--flag"
              >Create a postcard</span
            >
            <div class="_foldersPanel--cardIcon is--create">
              <b-icon icon="plus-lg" />
            </div>
          </button>
          <button
            type="button"
            class="_foldersPanel--card is--create"
            @click="startCreatePublication('a5_booklet')"
          >
            <span class="_foldersPanel--cardTitle is--flag"
              >Create a booklet</span
            >
            <div class="_foldersPanel--cardIcon is--create">
              <b-icon icon="plus-lg" />
            </div>
          </button>

          <div
            v-for="pub in sorted_publications"
            :key="pub.$path"
            class="_foldersPanel--card is--publication"
            role="button"
            tabindex="0"
            :title="pub.title || pub.$path.split('/').pop()"
            @click="openPublication(pub)"
            @keydown.enter="openPublication(pub)"
            @keydown.space.prevent="openPublication(pub)"
          >
            <div class="_foldersPanel--pubCover">
              <CoverField
                :cover="pub.$cover"
                :path="pub.$path"
                :can_edit="false"
                :ratio="'148 / 105'"
                :resolution="320"
                context="preview"
              />
              <span class="_foldersPanel--pubName">{{
                pub.title || pub.$path.split("/").pop()
              }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="_foldersPanel--section">
        <h2 v-if="!is_overlay" class="_foldersPanel--sectionTitle">
          Espaces de documentation
        </h2>
        <div class="_foldersPanel--grid">
          <button
            type="button"
            class="_foldersPanel--card is--create"
            @click="show_create_folder_modal = true"
          >
            <div class="_foldersPanel--cardIcon is--create">
              <b-icon icon="plus-lg" />
            </div>
            <span class="_foldersPanel--cardTitle">New folder</span>
          </button>

          <div
            v-for="folder in sorted_folders"
            :key="folder.$path"
            class="_foldersPanel--card u-card2"
            :class="{
              'is--active': folder.$path === current_folder_path,
              'is--disabled': !canAccessFolder(folder),
            }"
            role="button"
            tabindex="0"
            :title="!canAccessFolder(folder) ? 'Private folder' : ''"
            @click="onSelectFolder(folder)"
            @keydown.enter="onSelectFolder(folder)"
            @keydown.space.prevent="onSelectFolder(folder)"
          >
            <span class="_foldersPanel--cardTitle">{{
              folder.title || folder.$path.split("/").pop()
            }}</span>

            <div class="_foldersPanel--cardContributors" @click.stop>
              <AdminsAndContributorsField
                :folder="folder"
                :can_edit="false"
                :show_label="false"
              />
            </div>

            <span
              v-if="isPrivateFolder(folder)"
              class="_foldersPanel--cardBadge"
            >
              <b-icon icon="file-lock2-fill" />
              Private
            </span>
          </div>
        </div>
      </section>
    </div>

    <CreateFolder
      v-if="show_create_folder_modal"
      :modal_name="'Create folder'"
      :path="folders_path"
      @close="show_create_folder_modal = false"
      @openNew="onOpenNewFolder"
    />

    <BaseModal2
      v-if="create_template"
      :title="create_modal_title"
      @close="closeCreateModal"
    >
      <form class="_foldersPanel--createForm" @submit.prevent="confirmCreate">
        <DLabel :str="$t('title')" />
        <TextInput
          :content.sync="create_title"
          :maxlength="60"
          :required="true"
          :autofocus="true"
          ref="createTitleInput"
          @toggleValidity="($event) => (create_allow_save = $event)"
        />
        <div v-if="create_error" class="u-errorMsg" v-text="create_error" />
        <div class="_foldersPanel--createActions">
          <button type="button" class="u-button" @click="closeCreateModal">
            {{ $t("cancel") }}
          </button>
          <button
            type="submit"
            class="u-button u-button_bleuvert"
            :disabled="!create_allow_save || is_creating"
          >
            {{ is_creating ? $t("loading") : $t("create") }}
          </button>
        </div>
      </form>
    </BaseModal2>
  </div>
</template>

<script>
import CreateFolder from "@/adc-core/modals/CreateFolder.vue";
import AdminsAndContributorsField from "@/adc-core/fields/AdminsAndContributorsField.vue";
import CoverField from "@/adc-core/fields/CoverField.vue";
import SlashLogo from "@/components/nav/SlashLogo.vue";
import {
  getRootPublicationsPath,
  buildPublicationCreateMeta,
  getTemplateConfig,
} from "@/utils/folderPublications.js";

export default {
  components: {
    CreateFolder,
    AdminsAndContributorsField,
    CoverField,
    SlashLogo,
  },
  props: {
    folders: {
      type: Array,
      default: () => [],
    },
    current_folder_path: {
      type: String,
      default: "",
    },
    folders_path: {
      type: String,
      required: true,
    },
    is_overlay: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      show_create_folder_modal: false,
      create_template: null,
      create_title: "",
      create_allow_save: false,
      create_error: "",
      is_creating: false,
      publications: [],
      publications_path: "",
    };
  },
  computed: {
    sorted_folders() {
      return this.folders
        .slice()
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    },
    sorted_publications() {
      return this.publications
        .slice()
        .sort(
          (a, b) => +new Date(b.$date_created) - +new Date(a.$date_created)
        );
    },
    create_modal_title() {
      const config = getTemplateConfig(this.create_template);
      return config ? this.$t(config.label_key) : this.$t("create");
    },
  },
  watch: {
    is_overlay: {
      immediate: true,
      handler(is_overlay) {
        if (!is_overlay) {
          this.loadPublications();
        } else {
          this.leavePublicationsRoom();
        }
      },
    },
  },
  beforeDestroy() {
    this.leavePublicationsRoom();
  },
  methods: {
    isRoomJoined(room) {
      return Array.isArray(this.$api.rooms_joined)
        ? this.$api.rooms_joined.includes(room)
        : false;
    },
    async loadPublications() {
      this.leavePublicationsRoom();
      this.publications_path = getRootPublicationsPath();
      try {
        this.publications = await this.$api.getFolders({
          path: this.publications_path,
        });
        if (!this.isRoomJoined(this.publications_path)) {
          this.$api.join({ room: this.publications_path });
        }
      } catch (err) {
        console.error(err);
        this.publications = [];
      }
    },
    leavePublicationsRoom() {
      if (this.publications_path && this.isRoomJoined(this.publications_path)) {
        this.$api.leave({ room: this.publications_path });
      }
    },
    openPublication(pub) {
      if (!pub?.$path) return;
      const slug = pub.$path.split("/").pop();
      if (pub.template === "postcard") {
        this.$router.push({
          name: "PostcardShare",
          params: { publication_slug: slug },
        });
        return;
      }
      this.$router.push({
        name: "RootPublication",
        params: { publication_slug: slug },
      });
    },
    canAccessFolder(folder) {
      if (typeof this.canLoggedinSeeFolder !== "function") return true;
      return this.canLoggedinSeeFolder({ folder });
    },
    isPrivateFolder(folder) {
      return folder?.$status === "private";
    },
    onSelectFolder(folder) {
      if (!this.canAccessFolder(folder)) return;
      if (folder.$path === this.current_folder_path) {
        this.$emit("close");
        return;
      }
      this.$emit("selectFolder", folder.$path);
    },
    onOpenNewFolder(new_folder_slug) {
      this.show_create_folder_modal = false;
      this.$emit("openNewFolder", new_folder_slug);
    },
    startCreatePublication(template_key) {
      if (!this.connected_as) {
        this.$eventHub.$emit("login.openModal");
        return;
      }
      this.create_template = template_key;
      this.create_title =
        template_key === "postcard" ? "Carte postale" : "Booklet";
      this.create_allow_save = true;
      this.create_error = "";
      this.$nextTick(() => {
        this.$refs.createTitleInput?.$el
          ?.querySelector?.("input")
          ?.select?.();
      });
    },
    closeCreateModal() {
      this.create_template = null;
      this.create_title = "";
      this.create_error = "";
      this.create_allow_save = false;
    },
    async confirmCreate() {
      if (!this.create_allow_save || this.is_creating || !this.create_template) {
        return;
      }
      this.is_creating = true;
      this.create_error = "";
      const title = this.cleanUpString(this.create_title);
      try {
        const additional_meta = buildPublicationCreateMeta({
          title,
          template_key: this.create_template,
          at_root: true,
          admin_path: this.connected_as?.$path,
        });
        const slug = await this.$api.createFolder({
          path: getRootPublicationsPath(),
          additional_meta,
        });
        const template = additional_meta.template;
        await this.loadPublications();
        this.closeCreateModal();
        if (template === "postcard") {
          this.$router.push({
            name: "Postcard",
            params: { publication_slug: slug },
          });
        } else {
          this.$router.push({
            name: "RootPublication",
            params: { publication_slug: slug },
          });
        }
      } catch (err) {
        if (err?.code === "unique_field_taken") {
          this.create_error = this.$t("title_taken");
        } else if (err?.code === "login_required") {
          this.$eventHub.$emit("login.openModal");
          this.closeCreateModal();
        } else {
          this.create_error =
            err?.message || this.$t("failed_to_create_publication");
        }
      } finally {
        this.is_creating = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
._foldersPanel {
  --folders-bg: var(--c-slash-blue, var(--c-bleuvert));
  --folders-fg: var(--c-slash-mint, #e5ffdb);
  --folders-accent: var(--c-slash-burgundy, var(--c-rouge));

  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--folders-bg);
  color: var(--folders-fg);
  overflow: auto;

  &.is--overlay {
    z-index: 9000;
    background: color-mix(in srgb, var(--folders-bg) 97%, transparent);
    backdrop-filter: blur(12px);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--folders-fg) 25%, transparent);
  }
}

._foldersPanel--inner {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: calc(var(--spacing) * 2);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc(var(--spacing) * 2);
  text-align: left;
}

._foldersPanel--header {
  position: sticky;
  top: 0;
  padding: calc(var(--spacing)) 0;
  z-index: 100;
  background: var(--folders-bg);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(var(--spacing) / 1);
  flex-shrink: 0;
  text-align: left;
}

._foldersPanel--brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--spacing) * 1.25);
  text-align: left;
}

._foldersPanel--logo {
  display: block;
  width: clamp(7.5rem, 18vw, 9.5rem);
  height: auto;
  color: var(--folders-fg);
}

._foldersPanel--title {
  margin: 0 0 calc(var(--spacing) / 4);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--folders-fg);
}

._foldersPanel--subtitle {
  margin: 0;
  font-size: var(--sl-font-size-medium);
  color: color-mix(in srgb, var(--folders-fg) 80%, transparent);
}

._foldersPanel--headerButtons {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  flex-shrink: 0;

  .u-button {
    color: var(--folders-fg);
  }
}

._foldersPanel--section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc(var(--spacing));
  text-align: left;
}

._foldersPanel--sectionTitle {
  margin: 0;
  font-size: var(--sl-font-size-small);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: left;
  color: color-mix(in srgb, var(--folders-fg) 85%, transparent);
}

._foldersPanel--grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: calc(var(--spacing) * 1.25);
  justify-content: start;
  align-content: start;
  padding-bottom: calc(var(--spacing) / 2);
}

._foldersPanel--card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--spacing) / 1);
  min-height: 190px;
  padding: calc(var(--spacing) * 1.25);
  text-align: left;
  color: var(--folders-accent);
  background: var(--folders-fg);
  border: 2px solid var(--folders-fg);
  border-radius: calc(var(--border-radius) * 1.5);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    box-shadow 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    border-color 0.2s cubic-bezier(0.19, 1, 0.22, 1),
    background-color 0.2s cubic-bezier(0.19, 1, 0.22, 1);

  &:hover:not(.is--disabled),
  &:focus-visible:not(.is--disabled) {
    transform: translateY(-4px);
    border-color: var(--folders-accent);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  }

  &.is--active {
    border-color: var(--folders-accent);
  }

  &.is--disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    pointer-events: none;
  }

  &.is--create {
    border-style: dashed;
    border-color: var(--folders-fg);
    background: transparent;
    color: var(--folders-fg);
    box-shadow: none;

    &:hover,
    &:focus-visible {
      border-color: var(--folders-fg);
      background: color-mix(in srgb, var(--folders-fg) 12%, transparent);
      box-shadow: none;
    }
  }

  &.is--publication {
    padding: 0;
    gap: 0;
    min-height: 0;
    overflow: hidden;

    &:hover:not(.is--disabled),
    &:focus-visible:not(.is--disabled) {
      ._foldersPanel--pubName {
        opacity: 0;
      }
    }
  }
}

._foldersPanel--cardIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: calc(var(--border-radius) * 1.25);
  color: inherit;
  font-size: 1.75rem;
  flex-shrink: 0;

  &.is--create {
    background: transparent;
    border: 2px dashed var(--folders-fg);
    color: var(--folders-fg);
  }
}

._foldersPanel--cardTitle {
  font-size: var(--sl-font-size-large);
  word-break: break-word;
  text-align: left;

  &.is--flag {
    align-self: flex-start;
    font-weight: 700;
    line-height: 1.25;
  }
}

._foldersPanel--card.is--create ._foldersPanel--cardTitle.is--flag ~ ._foldersPanel--cardIcon {
  margin-top: auto;
}

._foldersPanel--card.is--create:has(._foldersPanel--cardTitle.is--flag) {
  min-height: 160px;
}

._foldersPanel--pubCover {
  position: relative;
  width: 100%;
  aspect-ratio: 148 / 105;
  overflow: hidden;
  background: color-mix(in srgb, var(--folders-accent) 12%, transparent);
  flex-shrink: 0;

  ::v-deep ._coverField {
    width: 100%;
    height: 100%;
  }

  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

._foldersPanel--pubName {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  transform: translate(-50%, -50%);
  max-width: calc(100% - 1.5rem);
  padding: 0.45rem 0.85rem;
  background: rgba(255, 255, 255, 0.5);
  color: var(--folders-accent);
  font-size: var(--sl-font-size-medium);
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  word-break: break-word;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

._foldersPanel--cardContributors {
  width: 100%;
  margin-top: auto;

  ::v-deep ._adminsAndContributorsField {
    margin: 0;
  }

  ::v-deep .u-listOfAvatars {
    padding: 0;
  }

  ::v-deep ._indicators {
    font-size: var(--sl-font-size-x-small);
    color: color-mix(in srgb, var(--folders-accent) 70%, transparent);
  }
}

._foldersPanel--cardBadge {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  margin-top: auto;
  padding: calc(var(--spacing) / 4) calc(var(--spacing) / 2);
  border-radius: var(--border-radius);
  background: color-mix(in srgb, var(--folders-accent) 12%, transparent);
  color: var(--folders-accent);
  font-size: var(--sl-font-size-x-small);
  font-weight: 600;
}

._foldersPanel--createForm {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 2);
}

._foldersPanel--createActions {
  display: flex;
  justify-content: flex-end;
  gap: calc(var(--spacing) / 2);
  margin-top: calc(var(--spacing) / 2);
}
</style>
