<template>
  <BaseModal2 :title="'Hello Slashers!'" :is_closable="is_logged_in">
    <div>
      <p class="u-spacingBottom">
        Before using the app, please pick your name in this list so all your
        contributions are credited to you. If your name is missing, you can
        create a new account below.
      </p>

      <div class="u-spacingBottom" v-if="!is_logged_in">
        <label class="u-label">Choose an existing account</label>
        <select v-model="selected_author" class="u-input">
          <option disabled value="">Identify yourself here</option>
          <optgroup
            v-for="category in all_contributors"
            :label="category.category"
            :key="category.category"
          >
            <option
              v-for="author in category.authors"
              :key="author.path"
              :value="author"
            >
              {{ author.name }}
            </option>
          </optgroup>
        </select>
      </div>
      <div v-else class="u-spacingBottom">
        <p>
          You are currently logged in as
          <strong>{{ connected_as.name }}</strong
          >.
        </p>
      </div>
    </div>

    <template slot="footer">
      <div />
      <button
        v-if="is_logged_in"
        type="button"
        class="u-button u-button_red"
        @click="logout()"
      >
        Logout
      </button>
      <button
        v-else
        type="button"
        class="u-button u-button_bleuvert"
        :disabled="!selected_author"
        @click="login()"
      >
        Login
      </button>
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
      show_create: false,
      new_author_name: "",
      authors_from_api: [],
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
    all_contributors() {
      // Create a deep copy of the hardcoded list to avoid mutating the original
      let all = JSON.parse(JSON.stringify(this.$root.slash_contributors_list));
      const api_authors = [...this.authors_from_api];

      // Mark authors that exist in API
      all.forEach((cat) => {
        cat.authors.forEach((author) => {
          const matching_api_author_index = api_authors.findIndex(
            (api_a) => api_a.path === author.path
          );
          if (matching_api_author_index !== -1) {
            author.exists = true;
            // Remove from api_authors to track which ones are left (new ones)
            api_authors.splice(matching_api_author_index, 1);
          } else {
            author.exists = false;
          }
        });
      });

      // Add remaining API authors to a new category
      if (api_authors.length > 0) {
        all.push({
          category: "Others",
          authors: api_authors.map((a) => ({ ...a, exists: true })),
        });
      }

      return all;
    },
  },
  methods: {
    async fetchAuthors() {
      try {
        const folders = await this.$api.getFolders({ path: "authors" });
        this.authors_from_api = folders.map((f) => ({
          name: f.name,
          path: f.$path,
        }));
      } catch (e) {
        console.error("Failed to fetch authors", e);
      }
    },
    async login() {
      if (!this.selected_author) return;

      const default_password = "slash";

      // If author doesn't exist on backend (from hardcoded list), create it
      if (this.selected_author.exists === false) {
        try {
          // Try to use the hardcoded slug if possible
          let requested_slug = undefined;
          if (this.selected_author.path) {
            const parts = this.selected_author.path.split("/");
            if (parts.length > 1) requested_slug = parts[parts.length - 1];
          }

          const new_folder_slug = await this.$api.createFolder({
            path: "authors",
            additional_meta: {
              name: this.selected_author.name,
              $password: default_password,
              requested_slug,
            },
          });
          await this.$api.loginToFolder({
            path: `authors/${new_folder_slug}`,
            password: default_password,
          });

          this.$alertify.success(
            `Account created for ${this.selected_author.name}`
          );
        } catch (e) {
          console.error(e);
          this.$alertify.error("Failed to create account: " + e.message);
          return;
        }
      } else {
        await this.$api.loginToFolder({
          path: this.selected_author.path,
          password: default_password,
        });
      }

      this.$alertify.success("Logged in");

      this.$emit("close");
    },
    async logout() {
      if (this.$api.tokenpath.token_path) {
        await this.$api.logoutFromFolder();
      }
      this.selected_author = "";
      this.$alertify.success("Logged out");
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
