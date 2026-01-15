<template>
  <div class="_gridItem">
    <div class="_gridItem--header">
      <span class="_gridItem--label">
        {{ area.id }}
      </span>

      <!-- <select class="_gridItem--select" size="small">
        <option value="1">texte (markdown)</option>
        <option value="2">titre</option>
        <option value="3">sous-titre</option>
        <option value="4">média (image, video, audio)</option>
      </select> -->
    </div>
    <div class="_gridItem--content">
      <button
        v-if="!area_text_meta"
        type="button"
        class="u-button u-button_bleuvert"
        @click="$emit('createText', area.id)"
      >
        {{ $t("add_text") }}
      </button>
      <div v-else>
        <MainText
          :text_file="area_text_meta"
          :medias_holder="area_text_meta"
          :publication_path="publication.$path"
          :show_label="false"
        />
      </div>
    </div>
  </div>
</template>

<script>
import MainText from "@/components/publications/edition/MainText.vue";

export default {
  props: {
    area: {
      type: Object,
      required: true,
    },
    area_text_meta: {
      type: Object,
    },
    publication: Object,
  },
  components: {
    MainText,
  },
  data() {
    return {};
  },
  created() {},
  mounted() {},
  beforeDestroy() {},
  watch: {},
  computed: {},
  methods: {},
};
</script>

<style lang="scss" scoped>
._gridItem {
  border: 1px solid var(--c-gris);
  padding: calc(var(--spacing) / 4) calc(var(--spacing) / 2);
  border-radius: var(--input-border-radius);
}

._gridItem--header {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--spacing) / 2);
  margin-bottom: calc(var(--spacing) * 1);
}

._gridItem--content {
}

._gridItem--label {
  font-weight: bold;
}
._gridItem--select {
  width: 25ch;
}
</style>
