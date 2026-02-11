<template>
  <BaseModal2
    :title="'Hello Slashers!'"
    :is_closable="is_logged_in"
    @close="$emit('close')"
  >
    <div>
      <p class="u-spacingBottom">
        Before using the app, please pick your name and structure/role so all
        your contributions are credited to you. Choose an existing account or
        create a new one below.
      </p>

      <div v-if="!is_logged_in">
        <!-- Create new account: Name or pseudo + Role -->
        <template v-if="show_create">
          <div class="_loginRow u-spacingBottom">
            <div class="_loginRow__name">
              <label class="u-label">Name or pseudo</label>
              <input
                v-model="new_author_name"
                type="text"
                class="u-input"
                :placeholder="name_placeholder"
              />
            </div>
            <div class="_loginRow__role">
              <label class="u-label">Role</label>
              <select v-model="selected_structure_role" class="u-input">
                <option disabled value="">Choose…</option>
                <option
                  v-for="opt in structure_role_options"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
            </div>
          </div>

          <ColorInput
            class="u-spacingBottom"
            :label="$t('color')"
            :value="new_author_color"
            :allow_transparent="false"
            :can_toggle="false"
            :default_value="suggested_colors[0]"
            :default_colors="suggested_colors"
            @save="new_author_color = $event"
          />
        </template>

        <!-- Login with existing account: list of all created accounts from path authors -->
        <div v-else class="u-spacingBottom">
          <label class="u-label">Choose an existing account</label>
          <select v-model="selected_author" class="u-input">
            <option disabled value="">Identify yourself here</option>
            <option
              v-for="author in authors_from_api"
              :key="author.path"
              :value="author"
            >
              {{ author.name
              }}{{
                (author.group || []).length
                  ? " (" + (author.group || []).join(", ") + ")"
                  : ""
              }}
            </option>
          </select>
        </div>
      </div>
      <div v-else class="u-spacingBottom">
        <p>
          You are currently logged in as

          <strong :style="{ backgroundColor: connected_as.color }">{{
            connected_as.name
          }}</strong
          ><span v-if="connected_as_group.length">
            ({{ connected_as_group }})</span
          >.
        </p>

        <div class="u-spacingBottom"></div>

        <button
          type="button"
          class="u-button u-button_small"
          :class="{ 'is--active': show_color_input }"
          @click="show_color_input = !show_color_input"
        >
          <b-icon icon="palette-fill" /> Change color
        </button>
        <ColorInput
          v-if="show_color_input"
          class="u-spacingBottom"
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
        v-if="!is_logged_in"
        type="button"
        class="u-button u-button_white u-button_small"
        @click="show_create = !show_create"
      >
        {{ show_create ? "Choose existing account" : "Create new account" }}
      </button>
      <button
        v-if="is_logged_in"
        type="button"
        class="u-button u-button_red"
        @click="logout()"
      >
        Logout
      </button>
      <template v-else>
        <button
          v-if="show_create"
          type="button"
          class="u-button u-button_bleuvert"
          :disabled="!can_create"
          @click="createAccount()"
        >
          Create account
        </button>
        <button
          v-else
          type="button"
          class="u-button u-button_bleuvert"
          :disabled="!can_login"
          @click="login()"
        >
          Login
        </button>
      </template>
    </template>
  </BaseModal2>
</template>
<script>
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
      selected_structure_role: "",

      show_create: false,
      new_author_name: "",
      new_author_color: "",

      authors_from_api: [],
      structure_role_options: [
        "Artist",
        "L’École de Design Nantes Atlantique",
        "L’Art Rue",
        "Casa De Capitão",
        "Mutant Radio",
        "OpenSpace",
        "Trempo",
        "Other",
      ],
      show_color_input: false,
    };
  },
  async created() {
    await this.fetchAuthors();
  },
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {
    is_logged_in() {
      return !!this.connected_as;
    },
    connected_as_group() {
      const g = this.connected_as?.group;
      return Array.isArray(g) && g.length ? g.join(", ") : "";
    },
    name_placeholder() {
      return "Your name or pseudonym";
    },
    can_login() {
      return !!this.selected_author;
    },
    can_create() {
      return (
        (this.new_author_name || "").trim().length > 0 &&
        !!this.selected_structure_role
      );
    },
    suggested_colors() {
      return [
        "hsl(227, 63%, 61%)",
        "#52c5b9",
        "#ffbe32",
        "#fc4b60",
        "transparent",
      ];
    },
  },
  methods: {
    async fetchAuthors() {
      try {
        const folders = await this.$api.getFolders({ path: "authors" });
        this.authors_from_api = folders.map((f) => ({
          name: f.name,
          path: f.$path,
          group: f.group || [],
        }));
      } catch (e) {
        console.error("Failed to fetch authors", e);
      }
    },
    _group_from_role() {
      return this.selected_structure_role ? [this.selected_structure_role] : [];
    },
    async login() {
      if (!this.selected_author) return;

      const default_password = "slash";

      await this.$api.loginToFolder({
        path: this.selected_author.path,
        password: default_password,
      });

      this.$alertify.success("Logged in");
      this.$emit("close");
    },
    async createAccount() {
      if (!this.can_create) return;

      const default_password = "slash";
      const name = (this.new_author_name || "").trim();
      const color = this.new_author_color;

      try {
        const new_folder_slug = await this.$api.createFolder({
          path: "authors",
          additional_meta: {
            name,
            $password: default_password,
            requested_slug: name,
            group: this._group_from_role(),
            color,
          },
        });
        await this.$api.loginToFolder({
          path: `authors/${new_folder_slug}`,
          password: default_password,
        });

        this.$alertify.success(`Account created for ${name}`);
        this.$emit("close");
      } catch (e) {
        console.error(e);
        this.$alertify.error("Failed to create account: " + (e.message || e));
      }
    },
    async logout() {
      if (this.$api.tokenpath.token_path) {
        await this.$api.logoutFromFolder();
      }
      this.selected_author = "";
      this.selected_structure_role = "";
      this.$alertify.success("Logged out");
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
._loginRow {
  display: flex;
  gap: var(--spacing);
  align-items: flex-end;
}
._loginRow__name {
  flex: 1;
  min-width: 0;
}
._loginRow__role {
  flex: 1;
}
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
.u-background-white {
  background: white;
  border: 1px solid var(--c-gris);
}
.u-border-radius {
  border-radius: 4px;
}
.u-padding {
  padding: var(--spacing);
}
</style>
