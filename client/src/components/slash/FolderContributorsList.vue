<template>
  <details v-if="contributors.length" class="_folderContributorsDetails">
    <summary class="_folderContributorsDetails--summary">
      {{
        $tc("folder_participants_count", contributors.length, {
          count: contributors.length,
        })
      }}
    </summary>
    <ul class="_folderContributorsList">
      <li
        v-for="author in contributors"
        :key="author.$path"
        class="_folderContributorsList--item"
      >
        <span
          class="_folderContributorsList--color"
          :style="{ backgroundColor: author.color }"
        ></span>
        <span class="_folderContributorsList--name">{{ author.name }}</span>
      </li>
    </ul>
  </details>
</template>
<script>
export default {
  props: {
    folder: {
      type: Object,
      default: null,
    },
  },
  computed: {
    contributor_paths() {
      if (!this.folder) return [];

      const paths = new Set();
      const files = Array.isArray(this.folder.$files) ? this.folder.$files : [];

      for (const file of files) {
        if (!Array.isArray(file.$authors)) continue;
        for (const author_path of file.$authors) {
          paths.add(author_path);
        }
      }

      for (const field of ["$admins", "$contributors"]) {
        const value = this.folder[field];
        if (!Array.isArray(value)) continue;
        for (const author_path of value) {
          paths.add(author_path);
        }
      }

      let result = [...paths];

      if (this.connected_as?.$path) {
        result = result.filter((path) => path !== this.connected_as.$path);
      }

      return result.sort((path_a, path_b) => {
        const name_a = this.getAuthor(path_a)?.name || path_a;
        const name_b = this.getAuthor(path_b)?.name || path_b;
        return name_a.localeCompare(name_b);
      });
    },
    contributors() {
      return this.contributor_paths
        .map((path) => this.getAuthor(path))
        .filter(Boolean);
    },
  },
};
</script>
<style lang="scss" scoped>
._folderContributorsDetails {
  width: 100%;
  padding: 0 calc(var(--spacing) / 2);
}

._folderContributorsDetails--summary {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 4);
  cursor: pointer;
  font-size: var(--sl-font-size-small);
  font-weight: 600;
  color: var(--c-gris_fonce);
  list-style: none;
  user-select: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::before {
    content: "";
    display: inline-block;
    width: 0;
    height: 0;
    border-top: 0.3em solid transparent;
    border-bottom: 0.3em solid transparent;
    border-left: 0.45em solid currentColor;
    transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);
  }
}

._folderContributorsDetails[open] ._folderContributorsDetails--summary::before {
  transform: rotate(90deg);
}

._folderContributorsList {
  list-style: none;
  margin: calc(var(--spacing) / 4) 0 0;
  padding: 0 0 0 calc(var(--spacing) / 2);
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing) / 6);
}

._folderContributorsList--item {
  display: flex;
  align-items: center;
  gap: calc(var(--spacing) / 3);
  font-size: var(--sl-font-size-small);
  line-height: 1.2;
  color: var(--c-gris_fonce);
}

._folderContributorsList--color {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  flex-shrink: 0;
}

._folderContributorsList--name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 16ch;
}
</style>
