<template>
  <BaseModal2 :title="'Hello Slashers!'" :is_closable="true">
    <div>
      <p class="u-spacingBottom">
        Before using the app, please pick your name in this list so all your
        contributions are credited to you. If your name is missing, get in touch
        with Louis to add it (and in the future a form will allow you to do it
        yourself):
        <a href="mailto:hello@louiseveillard.com">hello@louiseveillard.com</a>
      </p>
      <select v-model="selected_author" class="u-spacingBottom">
        <option disabled value="">Identify yourself here</option>
        <optgroup
          v-for="category in $root.slash_contributors_list"
          :label="category.category"
          :key="category.category"
        >
          <option
            v-for="author in category.authors"
            :key="author.name"
            :value="author"
          >
            {{ author.name }}
          </option>
        </optgroup>
      </select>
    </div>
    <template slot="footer">
      <div />
      <button
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
    return {
      selected_author: this.$root.slash_logged_in_as || "",
    };
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
  methods: {
    login() {
      localStorage.setItem("slash_logged_in_as", this.selected_author);
      this.$root.slash_logged_in_as = this.selected_author;
      this.$emit("close");
    },
  },
};
</script>
<style lang="scss" scoped></style>
