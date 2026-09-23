<template>
  <div class="_gateScreen" role="dialog" aria-modal="true" aria-labelledby="general-password-title">
    <div class="_gateScreen--inner">
      <header class="_gateScreen--header">
        <SlashLogo class="_gateScreen--logo" />
        <h1 id="general-password-title" class="_gateScreen--title">
          {{ instance_name }}
        </h1>
        <p class="_gateScreen--subtitle">
          {{ $t("general_password_modal_text") }}
          <template v-if="$root.app_infos.instance_meta.contactmail">
            <a
              class="_gateScreen--link"
              :href="'mailto:' + $root.app_infos.instance_meta.contactmail"
              target="_blank"
            >
              {{ $root.app_infos.instance_meta.contactmail }}
            </a>
          </template>
        </p>
      </header>

      <form class="_gateScreen--form" @submit.prevent="submitGeneralPassword">
        <TextInput
          :label_str="'general_password'"
          :content.sync="password_to_submit"
          :required="true"
          :input_type="'password'"
          :autofocus="true"
          @toggleValidity="($event) => (allow_send = $event)"
          @onEnter="submitGeneralPassword"
        />

        <p v-if="password_submit_error" class="u-errorMsg">
          {{ password_submit_error }}
        </p>

        <div class="_gateScreen--actions">
          <button
            type="submit"
            class="u-button u-button_bleuvert _gateScreen--cta"
            :disabled="!allow_send"
          >
            {{ $t("access") }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
<script>
import SlashLogo from "@/components/nav/SlashLogo.vue";

export default {
  props: {},
  components: {
    SlashLogo,
  },
  data() {
    return {
      password_to_submit: "",
      allow_send: false,
      remember_on_this_device: true,
      password_submit_error: false,
    };
  },
  created() {},
  async mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {
    instance_name() {
      return this.$root.app_infos.instance_meta.name || this.$t("home");
    },
  },
  methods: {
    async submitGeneralPassword() {
      if (!this.allow_send) return;

      try {
        await this.$api.submitGeneralPassword({
          password: this.password_to_submit,
          remember_on_this_device: this.remember_on_this_device,
        });
        this.$emit("close");
      } catch (err) {
        let msg = err.code;
        if (err.code === "submitted_general_password_is_wrong")
          msg = this.$t("submitted_password_is_wrong");

        this.password_submit_error = msg;
        this.$alertify.delay(4000).error(msg);

        setTimeout(() => {
          this.password_submit_error = false;
        }, 4000);
        return false;
      }
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

._gateScreen--link {
  color: var(--gate-fg);
  text-decoration: underline;
  text-underline-offset: 0.15em;

  &:hover,
  &:focus-visible {
    color: white;
  }
}

._gateScreen--form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing));

  ::v-deep .u-label,
  ::v-deep ._dLabel .u-label,
  ::v-deep label {
    color: color-mix(in srgb, var(--gate-fg) 80%, transparent);
  }

  ::v-deep input {
    background: color-mix(in srgb, var(--gate-fg) 12%, transparent);
    color: var(--gate-fg);
    border-color: transparent;

    &:focus {
      background: color-mix(in srgb, var(--gate-fg) 18%, transparent);
      border-color: var(--gate-fg);
    }

    &::placeholder {
      color: color-mix(in srgb, var(--gate-fg) 55%, transparent);
    }
  }

  ::v-deep .u-button.u-suffix {
    color: var(--gate-fg);

    &:hover,
    &:focus-visible {
      background: color-mix(in srgb, var(--gate-fg) 15%, transparent);
    }
  }
}

._gateScreen--actions {
  display: flex;
  justify-content: flex-start;
  margin-top: calc(var(--spacing) / 2);
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
