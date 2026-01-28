<template>
  <div class="_timelineView" ref="container">
    <div class="_timelineView--track">
      <!-- Horizontal lines background -->
      <div class="_timelineView--background"></div>

      <div class="_timelineView--content">
        <template v-for="(element, index) in timelineElements">
          <!-- Day Separator -->
          <div
            :key="element.key"
            v-if="element.type === 'day'"
            class="_timelineView--daySeparator"
          >
            <div class="_timelineView--separator"></div>
            <div class="_timelineView--separatorLabel">{{ element.label }}</div>
          </div>

          <!-- Gap -->
          <div
            v-else-if="element.type === 'gap'"
            :key="element.key"
            class="_timelineView--gap"
          >
            <svg
              class="_timelineView--wave"
              width="60"
              height="12"
              viewBox="0 0 60 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 6C4 6 6 1 10 1C14 1 16 11 20 11C24 11 26 1 30 1C34 1 36 11 40 11C44 11 46 1 50 1C54 1 56 6 59 6"
                stroke="#CCCCCC"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="_timelineView--gapLabel">{{ element.label }}</div>
          </div>

          <!-- Media Item -->
          <div
            v-else-if="element.type === 'media'"
            class="_timelineView--item"
            :class="{
              _isText: element.file.$type === 'text',
              _isImage: element.file.$type === 'image',
            }"
            :style="{
              height: element.height + 'px',
              aspectRatio:
                element.file.$type === 'image' && element.file.$infos?.ratio
                  ? element.file.$infos.ratio
                  : undefined,
            }"
          >
            <div class="_timelineView--itemContent">
              <MediaContent :file="element.file" :resolution="320" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      baseLineHeight: 28, // Height of horizontal lines
      padding: 60,
      headerHeight: 40,
    };
  },
  computed: {
    sortedFiles() {
      if (!this.files) return [];
      return [...this.files].sort((a, b) => {
        return new Date(a.$date_created) - new Date(b.$date_created);
      });
    },
    activeDays() {
      const groups = {};
      this.sortedFiles.forEach((f) => {
        const d = moment(f.$date_created).startOf("day");
        const key = d.format("YYYY-MM-DD");
        if (!groups[key]) groups[key] = { date: d, files: [] };
        groups[key].files.push(f);
      });
      return Object.values(groups);
    },
    timelineElements() {
      const elements = [];
      const gapWidth = 150;

      this.activeDays.forEach((day, index) => {
        // Add gap if needed
        if (index > 0) {
          const prev = this.activeDays[index - 1];
          const diffDays = day.date.diff(prev.date, "days");

          if (diffDays > 1) {
            const gapDays = diffDays - 1;
            let label = "";

            if (gapDays >= 365) {
              const val = Math.round(gapDays / 365);
              label = `${this.$tc("year_later", val)}...`;
            } else if (gapDays >= 30) {
              const val = Math.round(gapDays / 30);
              label = `${this.$tc("month_later", val)}...`;
            } else if (gapDays >= 7) {
              const val = Math.round(gapDays / 7);
              label = `${this.$tc("week_later", val)}...`;
            } else {
              label = `${this.$tc("day_later", gapDays)}...`;
            }

            elements.push({
              type: "gap",
              key: `gap-${index}`,
              width: gapWidth,
              label,
            });
          }
        }

        // Add day separator
        elements.push({
          type: "day",
          key: `day-${day.date.format("YYYY-MM-DD")}`,
          label: day.date.format("dddd D MMMM YY"),
        });

        // Add media items for this day
        day.files.forEach((file) => {
          const fileMoment = moment(file.$date_created);
          const timeInDay = fileMoment.diff(day.date); // ms since start of day

          // Calculate height only - width will be automatic from aspect ratio
          let height = 200;

          if (file.$type === "image") {
            const ratio = file.$infos?.ratio || 1;
            // Use a base width to calculate height
            const baseWidth = 180 + Math.random() * 100;
            height = baseWidth * ratio;
          } else if (file.$type === "text") {
            height = 150 + Math.random() * 100;
          }

          // Quantize height
          height =
            Math.ceil(height / this.baseLineHeight) * this.baseLineHeight;

          elements.push({
            type: "media",
            key: file.$path,
            file,
            height,
          });
        });
      });

      return elements;
    },
  },
  methods: {},
};
</script>

<style lang="scss" scoped>
._timelineView {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-color: white;

  /* Notebook lines pattern */
  background-image: linear-gradient(#e1e1e1 1px, transparent 1px);
  background-size: 100% 28px; /* Matches baseLineHeight */
  background-position: 0 40px; /* Offset for header */
}

._timelineView--track {
  position: relative;
  overflow-x: scroll;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  height: 100%;
}

._timelineView--content {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: max-content;
  min-height: 100%;
}

._timelineView--daySeparator {
  position: relative;
  flex-shrink: 0;
  height: 100%;
}

._timelineView--separator {
}

._timelineView--separatorLabel {
}

._timelineView--gap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-shrink: 0;
  height: 100%;
  pointer-events: none;
}

._timelineView--wave {
  width: 60px;
  flex-shrink: 0;
}

._timelineView--gapLabel {
  background: transparent;
  padding: 0;
  border: none;
  font-family: var(--sl-font-mono, monospace);
  font-size: 1.1rem;
  color: #999;
  white-space: nowrap;
  box-shadow: none;
  z-index: 5;
}

._timelineView--item {
  position: relative;
  flex-shrink: 0;
  margin-top: 50px;
  overflow: hidden;

  /* Shadow for depth */
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  background: white;
  transition: transform 0.2s;

  &:hover {
    z-index: 100;
    transform: scale(1.02);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  &._isText {
    background-color: #fff9c4; /* Post-it yellow */
    padding: 10px;
    width: 200px; /* Fixed width for text items */

    ::v-deep ._mediaContent {
      font-family: var(--sl-font-handwritten, cursive);
      font-size: 1.1em;
    }
  }

  &._isImage {
    // Width automatically calculated from aspect-ratio CSS property
  }
}

._timelineView--itemContent {
  height: 100%;
  width: 100%;

  ::v-deep ._mediaContent {
    height: 100%;
    width: 100%;

    img,
    video {
      height: 100%;
      width: 100%;
      object-fit: cover;
      display: block;
    }

    ._mediaContent--rawText {
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
  }
}
</style>
