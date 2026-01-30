<template>
  <div class="_homeView">
    <LoginModal v-if="show_login_modal" @close="show_login_modal = false" />
    <FolderView v-else />
  </div>
</template>

<script>
import FolderView from "@/components/slash/FolderView.vue";
import LoginModal from "@/components/slash/LoginModal.vue";
export default {
  props: {},
  components: {
    FolderView,
    LoginModal,
  },
  data() {
    return {
      show_login_modal: false,
    };
  },
  created() {
    this.$eventHub.$on("login.openModal", this.openLoginModal);
    if (!this.connected_as) {
      this.show_login_modal = true;
    }
  },
  mounted() {},
  beforeDestroy() {
    this.$eventHub.$off("login.openModal", this.openLoginModal);
  },

  watch: {},

  computed: {},
  methods: {
    openLoginModal() {
      this.show_login_modal = true;
    },
  },
};
</script>
<style lang="scss" scoped></style>
