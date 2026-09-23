<template>
  <portal to="destination">
    <div
      class="_gateScreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-gate-title"
    >
      <button
        v-if="is_logged_in"
        type="button"
        class="u-button u-button_icon _gateScreen--close"
        :title="$t('close')"
        @click="$emit('close')"
      >
        <b-icon icon="x-lg" :label="$t('close')" />
      </button>

      <div class="_gateScreen--inner">
        <header class="_gateScreen--header">
          <SlashLogo class="_gateScreen--logo" />
          <h1 id="login-gate-title" class="_gateScreen--title">
            <template v-if="is_logged_in">{{ connected_as.name }}</template>
            <template v-else>{{ $t("hello_slashers") }}</template>
          </h1>
          <p v-if="!is_logged_in" class="_gateScreen--subtitle">
            {{ $t("login_modal_description") }}
          </p>
          <p v-if="is_logged_in && connected_as_group" class="_gateScreen--subtitle">
            {{ connected_as_group }}
          </p>
        </header>

        <div class="_gateScreen--body">
          <div v-if="!is_logged_in" class="_gateScreen--field">
            <label class="u-label" for="login-author-select">{{
              $t("pick_your_name_label")
            }}</label>
            <select
              id="login-author-select"
              v-model="selected_author"
              class="u-input"
            >
              <option disabled value="">
                {{ $t("identify_yourself_here") }}
              </option>
              <optgroup
                v-for="group in author_select_groups"
                :key="group.category"
                :label="group.category"
              >
                <option
                  v-for="author in group.authors"
                  :key="author.path"
                  :value="author"
                >
                  {{ author.name }}
                </option>
              </optgroup>
            </select>
          </div>
          <div v-else class="_gateScreen--field">
            <ColorInput
              :label="$t('color')"
              :value="connected_as.color"
              :allow_transparent="false"
              :can_toggle="false"
              :default_value="suggested_colors[0]"
              :default_colors="suggested_colors"
              @save="updateConnectedAs({ color: $event })"
            />
          </div>
        </div>

        <div class="_gateScreen--actions">
          <button
            v-if="is_logged_in"
            type="button"
            class="u-button u-button_red"
            @click="logout()"
          >
            {{ $t("logout") }}
          </button>
          <button
            v-else
            type="button"
            class="u-button _gateScreen--cta"
            :disabled="!can_login"
            @click="login()"
          >
            {{ $t("login") }}
          </button>
        </div>
      </div>
    </div>
  </portal>
</template>
<script>
import randomcolor from "randomcolor";
import { slash_contributors_list } from "@/config/slash_contributors_list.js";
import SlashLogo from "@/components/nav/SlashLogo.vue";

export default {
  props: {},
  components: {
    SlashLogo,
  },
  data() {
    let saved_author = this.connected_as;
    if (typeof saved_author === "string") {
      try {
        saved_author = JSON.parse(saved_author);
      } catch (e) {
        // failed to parse
      }
    }
    return {
      selected_author: saved_author || "",
      authors_by_path: {},
    };
  },
  async created() {
    await this.fetchAuthors();
  },
  computed: {
    is_logged_in() {
      return !!this.connected_as;
    },
    connected_as_group() {
      const g = this.connected_as?.group;
      return Array.isArray(g) && g.length ? g.join(", ") : "";
    },
    can_login() {
      return !!this.selected_author;
    },
    suggested_colors() {
      return randomcolor({
        luminosity: "light",
        count: 25,
      });
    },
    listed_author_paths() {
      const paths = new Set();
      for (const group of slash_contributors_list) {
        for (const author of group.authors || []) {
          paths.add(author.path);
        }
      }
      return paths;
    },
    author_select_groups() {
      const groups = slash_contributors_list
        .map((group) => ({
          category: group.category,
          authors: (group.authors || [])
            .map((author) => this.authors_by_path[author.path])
            .filter(Boolean)
            .sort((author_a, author_b) =>
              author_a.name.localeCompare(author_b.name)
            ),
        }))
        .filter((group) => group.authors.length > 0);

      const other_authors = Object.values(this.authors_by_path)
        .filter((author) => !this.listed_author_paths.has(author.path))
        .sort((author_a, author_b) =>
          author_a.name.localeCompare(author_b.name)
        );

      if (other_authors.length) {
        groups.push({
          category: this.$t("other_authors_category"),
          authors: other_authors,
        });
      }

      return groups;
    },
  },
  methods: {
    _preset_authors_from_contributors_list() {
      return slash_contributors_list.flatMap((group) =>
        (group.authors || []).map((author) => ({
          name: author.name,
          path: author.path,
          group: author.group || [group.category],
          email: author.email,
          color: author.color,
        }))
      );
    },
    _merge_authors_by_path({ from_api = [], from_presets = [] }) {
      const by_path = {};

      for (const author of from_presets) {
        by_path[author.path] = { ...author };
      }

      for (const author of from_api) {
        by_path[author.path] = {
          ...by_path[author.path],
          ...author,
          group: author.group?.length
            ? author.group
            : by_path[author.path]?.group || [],
        };
      }

      return by_path;
    },
    async fetchAuthors() {
      let from_api = [];

      try {
        const folders = await this.$api.getFolders({ path: "authors" });
        from_api = folders.map((f) => ({
          name: f.name,
          path: f.$path,
          group: f.group || [],
          email: f.email,
          color: f.color,
        }));
      } catch (e) {
        console.error("Failed to fetch authors", e);
      }

      this.authors_by_path = this._merge_authors_by_path({
        from_api,
        from_presets: this._preset_authors_from_contributors_list(),
      });
    },
    async ensureAuthorFolder(author) {
      try {
        await this.$api.getFolder({ path: author.path });
        return false;
      } catch (e) {
        if (e?.code !== "not_found") throw e;
      }

      const requested_slug = author.path.replace(/^authors\//, "");
      const default_password = "slash";
      const color =
        author.color ||
        this.authors_by_path[author.path]?.color ||
        randomcolor({
          luminosity: "light",
        });

      await this.$api.createFolder({
        path: "authors",
        additional_meta: {
          name: author.name,
          email: author.email,
          requested_slug,
          $status: "public",
          $password: default_password,
          group: author.group || [],
          color,
        },
      });

      await this.fetchAuthors();
      return true;
    },
    async login() {
      if (!this.can_login) return;

      const default_password = "slash";
      const author = this.selected_author;

      try {
        await this.ensureAuthorFolder(author);

        await this.$api.loginToFolder({
          path: author.path,
          password: default_password,
        });
        this.$alertify.success(this.$t("login"));
        this.$emit("close");
      } catch (e) {
        const msg =
          e?.message ||
          e?.code ||
          (typeof e === "object" ? "Unknown error" : String(e));
        this.$alertify.error("Login failed: " + msg);
      }
    },
    async logout() {
      if (this.$api.tokenpath.token_path) {
        await this.$api.logoutFromFolder();
      }
      this.selected_author = "";
      this.$alertify.success(this.$t("logout"));
    },
    async updateConnectedAs(meta) {
      await this.$api.updateMeta({
        path: this.connected_as.$path,
        new_meta: meta,
      });
    },
  },
};
</script>
<style lang="scss" scoped>
._gateScreen {
  --gate-bg: var(--c-slash-blue, var(--c-bleuvert));
  --gate-fg: var(--c-slash-mint, #e5ffdb);
  --gate-accent: var(--c-slash-burgundy, var(--c-rouge));

  position: fixed;
  inset: 0;
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: calc(var(--spacing) * 2);
  background: var(--gate-bg);
  color: var(--gate-fg);
  animation: gateReveal 0.45s cubic-bezier(0.19, 1, 0.22, 1);
}

._gateScreen--close {
  position: absolute;
  top: calc(var(--spacing) * 1.25);
  right: calc(var(--spacing) * 1.25);
  color: var(--gate-fg);
  z-index: 1;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--gate-fg) 15%, transparent);
  }
}

._gateScreen--inner {
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) * 2);
}

._gateScreen--header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--spacing) * 1.25);
}

._gateScreen--logo {
  width: clamp(7.5rem, 18vw, 9.5rem);
  height: auto;
  color: var(--gate-fg);
}

._gateScreen--title {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--gate-fg);
}

._gateScreen--subtitle {
  margin: 0;
  font-size: var(--sl-font-size-normal);
  line-height: 1.5;
  color: color-mix(in srgb, var(--gate-fg) 85%, transparent);
}

._gateScreen--body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing));
}

._gateScreen--field {
  .u-label {
    color: color-mix(in srgb, var(--gate-fg) 80%, transparent);
  }

  .u-input,
  select {
    background: color-mix(in srgb, var(--gate-fg) 12%, transparent);
    color: var(--gate-fg);
    border-color: transparent;

    &:hover {
      background: color-mix(in srgb, var(--gate-fg) 18%, transparent);
    }

    &:focus {
      background: color-mix(in srgb, var(--gate-fg) 18%, transparent);
      border-color: var(--gate-fg);
    }

    option,
    optgroup {
      color: var(--c-noir);
      background: white;
    }
  }

  ::v-deep .u-label,
  ::v-deep label {
    color: color-mix(in srgb, var(--gate-fg) 80%, transparent);
  }
}

._gateScreen--actions {
  display: flex;
  justify-content: flex-start;
  gap: calc(var(--spacing) / 2);
}

._gateScreen--cta {
  background: var(--gate-fg);
  color: var(--gate-accent);
  font-weight: 600;
  padding: calc(var(--spacing) / 2) calc(var(--spacing) * 1.25);

  &:hover,
  &:focus-visible {
    &:not([disabled]) {
      background: white;
      color: var(--gate-accent);
    }
  }

  &[disabled] {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

@keyframes gateReveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
