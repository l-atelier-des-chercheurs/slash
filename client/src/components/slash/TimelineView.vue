<template>
  <div class="_timelineView" ref="container">
    <div
      class="_timelineView--track"
      :style="{ width: trackWidth + 'px', height: trackHeight + 'px' }"
    >
      <!-- Horizontal lines background -->
      <div class="_timelineView--background"></div>

      <!-- Day Separators -->
      <div
        v-for="sep in daySeparators"
        :key="'sep-' + sep.date"
        class="_timelineView--separator"
        :style="{ left: sep.x + 'px' }"
      >
        <div class="_timelineView--separatorLabel">{{ sep.label }}</div>
      </div>

      <!-- Gaps -->
      <div
        v-for="gap in gaps"
        :key="'gap-' + gap.x"
        class="_timelineView--gap"
        :style="{ left: gap.x + 'px', width: gap.width + 'px' }"
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
        <div class="_timelineView--gapLabel">{{ gap.label }}</div>
      </div>

      <!-- Items -->
      <div
        v-for="item in positionedFiles"
        :key="item.file.$path"
        class="_timelineView--item"
        :class="{ _isText: item.file.$type === 'text' }"
        :style="{
          left: item.x + 'px',
          top: item.y + 'px',
          width: item.width + 'px',
          height: item.height + 'px',
        }"
      >
        <div class="_timelineView--content">
          <MediaContent :file="item.file" :resolution="320" />
        </div>
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
      baseItemWidth: 220,
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
    daySeparators() {
      // Replaced by timelineLayout.days
      return this.timelineLayout.days;
    },
    gaps() {
      return this.timelineLayout.gaps;
    },
    activeDays() {
      const groups = {};
      this.sortedFiles.forEach((f) => {
        // Use moment to get start of day
        // Note: files are already sorted
        const d = moment(f.$date_created).startOf("day");
        const key = d.format("YYYY-MM-DD");
        if (!groups[key]) groups[key] = { date: d, files: [] };
        groups[key].files.push(f);
      });
      return Object.values(groups);
    },
    calculatedScale() {
      if (this.activeDays.length === 0) return 0.001;
      // Duration is number of active days * 24h
      const activeDuration = this.activeDays.length * 24 * 3600 * 1000;

      // Target width
      const targetWidth = this.files.length * (this.baseItemWidth * 0.6);
      const minWidth = window.innerWidth;

      let s = Math.max(targetWidth, minWidth) / activeDuration;

      // Clamp scale
      s = Math.max(0.000005, Math.min(s, 0.001));

      return s;
    },
    timelineLayout() {
      let x = this.padding;
      const days = [];
      const gaps = [];
      const scale = this.calculatedScale;
      const gapWidth = 150;

      this.activeDays.forEach((day, index) => {
        if (index > 0) {
          const prev = this.activeDays[index - 1];
          const diffDays = day.date.diff(prev.date, "days");

          if (diffDays > 1) {
            const gapDays = diffDays - 1;
            let label = "";

            if (gapDays >= 365) {
              const val = Math.round(gapDays / 365);
              label = `${val} ${val > 1 ? "years" : "year"} later...`;
              if (this.$t)
                label = `${val} ${
                  this.$t(val > 1 ? "years_later" : "year_later") || label
                }`;
            } else if (gapDays >= 30) {
              const val = Math.round(gapDays / 30);
              label = `${val} ${val > 1 ? "months" : "month"} later...`;
              if (this.$t)
                label = `${val} ${
                  this.$t(val > 1 ? "months_later" : "month_later") || label
                }`;
            } else if (gapDays >= 7) {
              const val = Math.round(gapDays / 7);
              label = `${val} ${val > 1 ? "weeks" : "week"} later...`;
              if (this.$t)
                label = `${val} ${
                  this.$t(val > 1 ? "weeks_later" : "week_later") || label
                }`;
            } else {
              label = `${gapDays} ${gapDays > 1 ? "days" : "day"} later...`;
              if (this.$t)
                label = `${gapDays} ${
                  this.$t(gapDays > 1 ? "days_later" : "day_later") || label
                }`;
            }

            gaps.push({
              x: x,
              width: gapWidth,
              label,
            });
            x += gapWidth;
          }
        }

        const dayWidth = 24 * 3600 * 1000 * scale;

        days.push({
          date: day.date,
          x: x,
          width: dayWidth,
          label: day.date.format("dddd D MMMM YY"),
        });

        x += dayWidth;
      });

      return { days, gaps, totalWidth: x };
    },
    positionedFiles() {
      const items = [];
      const scale = this.calculatedScale;
      const dayMap = {};
      this.timelineLayout.days.forEach((d) => {
        dayMap[d.date.format("YYYY-MM-DD")] = d;
      });

      // Pre-calculate dimensions and sorted order
      const processed = this.sortedFiles
        .map((file) => {
          const fileMoment = moment(file.$date_created);
          const dayKey = fileMoment.clone().startOf("day").format("YYYY-MM-DD");
          const day = dayMap[dayKey];

          if (!day) return null; // Should not happen

          const timeInDay = fileMoment.diff(day.date); // ms since start of day
          const x = day.x + timeInDay * scale;

          // Calculate dimensions
          let width = this.baseItemWidth;
          let height = 200;

          if (file.$type === "image") {
            const ratio = file.$infos?.ratio || 1;
            width = 180 + Math.random() * 100;
            height = width * ratio;
          } else if (file.$type === "text") {
            width = 200;
            height = 150 + Math.random() * 100;
          }

          // Quantize height
          height =
            Math.ceil(height / this.baseLineHeight) * this.baseLineHeight;

          return {
            file,
            x,
            width,
            height,
            y: 0,
          };
        })
        .filter((i) => i !== null);

      // Packing algorithm
      const placed = [];

      processed.forEach((item) => {
        let y = this.headerHeight; // Start below header

        while (true) {
          const collision = placed.some((other) => {
            // Check X overlap
            if (
              item.x + 20 >= other.x + other.width ||
              item.x + item.width <= other.x + 20
            )
              return false;
            // Check Y overlap
            if (y >= other.y + other.height || y + item.height <= other.y)
              return false;
            return true;
          });

          if (!collision) {
            break;
          }
          y += this.baseLineHeight;
        }

        item.y = y;
        placed.push(item);
        items.push(item);
      });

      return items;
    },
    trackWidth() {
      return this.timelineLayout.totalWidth + this.padding * 4;
    },
    trackHeight() {
      if (this.positionedFiles.length === 0) return window.innerHeight;
      const bottom = this.positionedFiles.reduce(
        (max, item) => Math.max(max, item.y + item.height),
        0
      );
      return Math.max(window.innerHeight, bottom + 100);
    },
  },
  mounted() {
    this.$refs.container.addEventListener("wheel", this.handleWheel, {
      passive: false,
    });
  },
  beforeDestroy() {
    this.$refs.container.removeEventListener("wheel", this.handleWheel);
  },
  methods: {
    handleWheel(e) {
      e.preventDefault();
      this.$refs.container.scrollLeft += e.deltaY + e.deltaX;
    },
  },
};
</script>

<style lang="scss" scoped>
._timelineView {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: white;

  /* Notebook lines pattern */
  background-image: linear-gradient(#e1e1e1 1px, transparent 1px);
  background-size: 100% 28px; /* Matches baseLineHeight */
  background-position: 0 40px; /* Offset for header */
}

._timelineView--track {
  position: relative;
  min-height: 100%;
}

._timelineView--separator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #000;
  z-index: 10;
  pointer-events: none;
}

._timelineView--gap {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
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
  position: absolute;
  display: flex;
  flex-direction: column;
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

    ::v-deep ._mediaContent {
      font-family: var(--sl-font-handwritten, cursive);
      font-size: 1.1em;
    }
  }
}

._timelineView--content {
  width: 100%;
  height: 100%;

  ::v-deep ._mediaContent {
    width: 100%;
    height: 100%;

    img,
    video {
      width: 100%;
      height: 100%;
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
