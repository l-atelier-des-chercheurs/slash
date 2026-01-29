<template>
  <div class="_timelineView" ref="container" @wheel.prevent="onWheel">
    <div class="_timelineView--track" ref="track">
      <!-- Horizontal lines background -->
      <div class="_timelineView--background"></div>

      <div class="_timelineView--content">
        <template v-for="(element, index) in timelineElements">
          <!-- Day: label (button) + contained media items -->
          <div
            v-if="element.type === 'day'"
            :key="`day-${element.key}`"
            class="_timelineView--day"
          >
            <button
              type="button"
              class="_timelineView--dayButton"
              :class="{ 'is--collapsed': isDayCollapsed(element.key) }"
              :aria-expanded="!isDayCollapsed(element.key)"
              @click="toggleDayCollapsed(element.key)"
            >
              <span class="_timelineView--dayButtonLabel">{{
                element.label
              }}</span>
              <span class="_timelineView--dayButtonCount"
                >({{ element.mediaItems.length }})</span
              >
            </button>
            <div
              v-show="!isDayCollapsed(element.key)"
              class="_timelineView--dayItems"
            >
              <CanvasItem
                v-for="item in element.mediaItems"
                :key="item.key"
                :file="item.file"
                :mode="'timeline'"
                :timeline-height="item.height"
                :event-phase="item.eventPhase"
                class="_timelineView--item"
              />
            </div>
          </div>

          <!-- Event / Phase marker -->
          <div
            v-else-if="element.type === 'event'"
            :key="`event-${element.key}`"
            class="_timelineView--event"
          >
            <div class="_timelineView--eventBar"></div>
            <div class="_timelineView--eventLabel">{{ element.label }}</div>
          </div>

          <!-- Gap -->
          <div
            v-else-if="element.type === 'gap'"
            :key="`gap-${element.key}`"
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
              <!-- Half circles linked: bottom, top, bottom, top, bottom -->
              <path
                d="M 0 6 A 6 6 0 0 1 12 6 A 6 6 0 0 0 24 6 A 6 6 0 0 1 36 6 A 6 6 0 0 0 48 6 A 6 6 0 0 1 60 6"
                stroke="#CCCCCC"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="_timelineView--gapLabel">{{ element.label }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import CanvasItem from "@/components/slash/CanvasItem.vue";

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    CanvasItem,
  },
  data() {
    return {
      baseLineHeight: 28, // Height of horizontal lines
      padding: 60,
      headerHeight: 40,
      collapsedDays: {}, // { 'day-YYYY-MM-DD': true } when day is collapsed

      slash_timeline_events: [
        {
          label: "Local Hubs",
          from: "2025-03-01",
          to: "2025-10-01",
        },
        {
          label: "Briefs + artists selection",
          from: "2025-10-01",
          to: "2025-12-01",
        },
        {
          label: "Training",
          from: "2025-12-08",
          to: "2025-12-17",
        },
        {
          label: "Online Consortium",
          from: "2026-02-01",
          to: "2026-03-01",
        },
        {
          label: "Study Visits + Residencies",
          from: "2026-03-01",
          to: "2026-08-01",
        },
        {
          label: "Artworks Presentation",
          from: "2026-08-01",
          to: "2026-10-01",
        },
        {
          label: "Collab Lab Lisboa",
          from: "2026-10-01",
          to: "2027-03-01",
        },
      ],
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
      let prevEventKey = null;

      this.activeDays.forEach((day, index) => {
        const event = this.getEventForDate(day.date);

        // Insert event/phase marker when we enter a new event
        if (event && event.key !== prevEventKey) {
          elements.push({
            type: "event",
            key: `event-${event.key}`,
            label: event.label,
          });
          prevEventKey = event.key;
        }

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

        // Add day block with label + media items (day contains its items)
        const mediaItems = [];
        day.files.forEach((file) => {
          const fileMoment = moment(file.$date_created);
          const fileEvent = this.getEventForDate(fileMoment);
          const phaseLabel = fileEvent ? fileEvent.label : null;

          let height = 200;
          if (file.$type === "image") {
            const ratio = file.$infos?.ratio || 1;
            const baseWidth = 180 + Math.random() * 100;
            height = baseWidth * ratio;
          } else if (file.$type === "text") {
            height = 150 + Math.random() * 100;
          }
          height =
            Math.ceil(height / this.baseLineHeight) * this.baseLineHeight;

          mediaItems.push({
            key: file.$path,
            file,
            height,
            eventPhase: phaseLabel,
          });
        });

        elements.push({
          type: "day",
          key: `day-${day.date.format("YYYY-MM-DD")}`,
          label: day.date.format("dddd D MMMM YY"),
          mediaItems,
        });
      });

      return elements;
    },
  },
  methods: {
    isDayCollapsed(dayKey) {
      return !!this.collapsedDays[dayKey];
    },
    toggleDayCollapsed(dayKey) {
      this.$set(this.collapsedDays, dayKey, !this.collapsedDays[dayKey]);
    },
    getEventForDate(dateMoment) {
      const d = dateMoment.valueOf();
      for (let i = 0; i < this.slash_timeline_events.length; i++) {
        const ev = this.slash_timeline_events[i];
        const from = moment(ev.from).startOf("day").valueOf();
        const to = moment(ev.to).endOf("day").valueOf();
        if (d >= from && d <= to) {
          return { key: `${i}-${ev.from}`, label: ev.label };
        }
      }
      return null;
    },
    onWheel(e) {
      const track = this.$refs.track;
      if (!track) return;
      // Vertical wheel → horizontal scroll; horizontal wheel → horizontal scroll (like Les Cahiers)
      const delta = e.deltaX + e.deltaY;
      if (delta === 0) return;
      track.scrollLeft += delta;
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
  background-color: white;

  // background-image: linear-gradient(#e1e1e1 1px, transparent 1px);
  // background-size: 100% 28px; /* Matches baseLineHeight */
  // background-position: 0 40px; /* Offset for header */
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

._timelineView--day {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
}

._timelineView--dayButton {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 12px;
  margin: 0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #f8f8f8;
  font-family: inherit;
  font-size: 0.95rem;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #eee;
    border-color: #ccc;
  }

  &.is--collapsed {
    background: #f0f0f0;
    border-color: #ddd;
  }
}

._timelineView--dayButtonLabel {
  font-weight: 500;
}

._timelineView--dayButtonCount {
  font-size: 0.85rem;
  color: #888;
  font-weight: normal;
}

._timelineView--dayItems {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 0;
  margin-left: 12px;
}

._timelineView--event {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
  height: 100%;
  padding-right: 16px;
  pointer-events: none;

  min-height: 50vh;
  position: sticky;
  left: 0;
}

._timelineView--eventBar {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: linear-gradient(180deg, #6b7fd7 0%, #4a5bb5 100%);
  flex-shrink: 0;
}

._timelineView--eventLabel {
  font-family: var(--sl-font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5bb5;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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
  flex-shrink: 0;
  margin-top: 50px;
}
</style>
