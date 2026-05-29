<template>
  <BaseModal2
    :title="$t('hello_slashers')"
    :is_closable="is_logged_in"
    @close="$emit('close')"
  >
    <div>
      <p class="u-spacingBottom">
        {{ $t("login_modal_description") }}
      </p>

      <div v-if="!is_logged_in">
        <label class="u-label">{{ $t("pick_your_name_label") }}</label>
        <select v-model="selected_author" class="u-input u-spacingBottom">
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
      <div v-else class="u-spacingBottom">
        <p class="u-spacingBottom">
          {{ $t("logged_in_as") }}
          <strong :style="{ backgroundColor: connected_as.color }">{{
            connected_as.name
          }}</strong
          ><span v-if="connected_as_group.length">
            ({{ connected_as_group }})</span
          >.
        </p>

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

    <template slot="footer">
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
        class="u-button u-button_bleuvert"
        :disabled="!can_login"
        @click="login()"
      >
        {{ $t("login") }}
      </button>
    </template>
  </BaseModal2>
</template>
<script>
import randomcolor from "randomcolor";
import { slash_contributors_list } from "@/config/slash_contributors_list.js";

export default {
  props: {},
  components: {},
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
.u-label {
  display: block;
  margin-bottom: calc(var(--spacing) / 4);
  font-weight: 600;
  font-size: 0.9em;
}
.u-input {
  width: 100%;
  padding: calc(var(--spacing) / 2);
  border: 1px solid var(--c-gris);
  border-radius: 4px;
}
</style>
