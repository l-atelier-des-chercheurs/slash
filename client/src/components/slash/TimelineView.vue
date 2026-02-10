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
            <div
              class="_timelineView--dayLabel"
              :aria-expanded="!isDayCollapsed(element.key)"
              @click="toggleDayCollapsed(element.key)"
            >
              <button
                type="button"
                class="_timelineView--dayButton"
                :class="{ 'is--collapsed': isDayCollapsed(element.key) }"
                :aria-label="element.label"
              >
                <span class="">{{ element.label }}</span>
                <span class="">({{ element.mediaItems.length }})</span>
              </button>
            </div>
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
                class="_timelineView--item _canvasItem"
                :data-file-path="item.file.$path"
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
            <div
              class="_timelineView--wave"
              v-for="i in 6"
              :key="`wave-${i}`"
            ></div>
            <div class="_timelineView--gapLabel">{{ element.label }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import CanvasItem from "@/components/slash/CanvasItem.vue";

// Plain JS date helpers (no moment) — all in local time
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function formatYYYYMMDD(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatDayLabel(d) {
  return new Date(d)
    .toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "2-digit",
    })
    .replace(", ", " ");
}
function diffDays(a, b) {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

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
        const d = startOfDay(new Date(f.$date_created));
        const key = formatYYYYMMDD(d);
        if (!groups[key]) groups[key] = { date: d, files: [] };
        groups[key].files.push(f);
      });
      return Object.values(groups).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
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
          const days_between = diffDays(day.date, prev.date);

          if (days_between > 1) {
            const gapDays = days_between - 1;
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
          const fileDate = new Date(file.$date_created);
          const fileEvent = this.getEventForDate(fileDate);
          const phaseLabel = fileEvent ? fileEvent.label : null;

          let height = 224;
          mediaItems.push({
            key: file.$path,
            file,
            height,
            eventPhase: phaseLabel,
          });
        });

        elements.push({
          type: "day",
          key: `day-${formatYYYYMMDD(day.date)}`,
          label: formatDayLabel(day.date),
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
    getEventForDate(date) {
      const d = new Date(date).getTime();
      for (let i = 0; i < this.slash_timeline_events.length; i++) {
        const ev = this.slash_timeline_events[i];
        const from = startOfDay(new Date(ev.from)).getTime();
        const to = endOfDay(new Date(ev.to)).getTime();
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
  flex-flow: row nowrap;
  align-items: center;
  min-width: max-content;
  height: 100%;
}

._timelineView--day {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  flex-shrink: 0;
  height: 100%;
}

._timelineView--dayLabel {
  // width: 4rem;
  position: relative;
  height: 100vh;
  width: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    display: block;
    width: 1px;
    height: 100%;
    background: var(--c-gris);
  }
}

._timelineView--dayButton {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 6px;
  padding: 4px 12px;
  transform: rotate(-90deg);
  background: white;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: var(--c-gris_fonce);
    color: white;
  }

  &.is--collapsed {
    background: var(--c-noir);
    color: white;
  }
}

._timelineView--dayItems {
  columns: 2 auto;
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
  height: 100%;
  padding: 0 var(--spacing);
  pointer-events: none;
}

._timelineView--wave {
  width: calc(var(--spacing) * 1.5);
  height: calc(var(--spacing) * 1.5);
  border-radius: 50%;
  border: 1px solid transparent;
  border-bottom-color: #ccc;
  border-right-color: #ccc;
  transform: rotate(225deg);
  flex-shrink: 0;
  margin-left: -1px;

  &:nth-child(2n) {
    margin-top: -1px;
    transform: rotate(45deg);
  }
}

._timelineView--gapLabel {
  background: transparent;
  padding: 0;
  padding-left: calc(var(--spacing) * 1);
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
}
</style>
