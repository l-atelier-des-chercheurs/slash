<template>
  <div class="_timelineView" ref="container" @wheel.prevent="onWheel">
    <ViewEmptyMessage v-if="!files.length" />
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
              <div
                v-for="(column, column_index) in element.columns"
                :key="`${element.key}-col-${column_index}`"
                class="_timelineView--column"
                :class="{ 'is--staggered': column_index % 2 === 1 }"
              >
                <CanvasItem
                  v-for="item in column"
                  :key="item.key"
                  :file="item.file"
                  :mode="'timeline'"
                  :timeline-height="item.height"
                  :event-phase="item.eventPhase"
                  :show_media_list_sidebar="show_media_list_sidebar"
                  :media_list_paths="media_list_paths"
                  :is_selected="selected_files.includes(item.file.$path)"
                  class="_timelineView--item _canvasItem"
                  :data-file-path="item.file.$path"
                  @select="onSelect"
                />
              </div>
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
import ViewEmptyMessage from "@/components/slash/ViewEmptyMessage.vue";

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

const TIMELINE_ITEM_WIDTH = 224;
const TIMELINE_ITEMS_PER_COLUMN = 2;

function getTimelineItemHeight(file) {
  const ratio = file.$infos?.ratio;
  if (file.$type === "text") {
    return Math.min(320, Math.max(140, Math.round(TIMELINE_ITEM_WIDTH * 0.75)));
  }
  if (ratio) {
    return Math.round(TIMELINE_ITEM_WIDTH * ratio);
  }
  if (file.$type === "pdf") {
    return Math.round(TIMELINE_ITEM_WIDTH * (9 / 16));
  }
  return TIMELINE_ITEM_WIDTH;
}

function chunkItemsIntoColumns(
  items,
  max_per_column = TIMELINE_ITEMS_PER_COLUMN
) {
  const columns = [];
  for (let i = 0; i < items.length; i += max_per_column) {
    columns.push(items.slice(i, i + max_per_column));
  }
  return columns;
}

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
    show_media_list_sidebar: {
      type: Boolean,
      default: false,
    },
    media_list_paths: {
      type: Array,
      default: () => [],
    },
    selected_files: {
      type: Array,
      default: () => [],
    },
  },
  components: {
    CanvasItem,
    ViewEmptyMessage,
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

          mediaItems.push({
            key: file.$path,
            file,
            height: getTimelineItemHeight(file),
            eventPhase: phaseLabel,
          });
        });

        elements.push({
          type: "day",
          key: `day-${formatYYYYMMDD(day.date)}`,
          label: formatDayLabel(day.date),
          mediaItems,
          columns: chunkItemsIntoColumns(mediaItems),
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
      const delta = e.deltaX + e.deltaY;
      if (delta === 0) return;
      track.scrollLeft += delta;
    },
    onSelect(file_path, mode) {
      this.$emit("select", file_path, mode);
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
  background-color: #fafafa;
  --timeline-item-width: 224px;
  --timeline-stagger-offset: calc(var(--timeline-item-width) * 0.55);
}

._timelineView--background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

._timelineView--track {
  position: relative;
  display: flex;
  align-items: center;
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
  gap: calc(var(--spacing) * 2);
  min-width: max-content;
  min-height: 100%;
  height: auto;
  padding: calc(var(--spacing) * 3) calc(var(--spacing) * 4);
  box-sizing: border-box;
}

._timelineView--day {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  flex-shrink: 0;
  align-self: center;
}

._timelineView--dayLabel {
  position: relative;
  align-self: stretch;
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
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  gap: calc(var(--spacing) * 1.25);
  flex-shrink: 0;
  margin-left: 12px;
}

._timelineView--column {
  display: flex;
  flex-flow: column nowrap;
  gap: calc(var(--spacing) * 1.25);
  flex-shrink: 0;

  &.is--staggered {
    margin-top: var(--timeline-stagger-offset);
  }
}

._timelineView--item {
  flex-shrink: 0;
}

._timelineView--event {
  position: sticky;
  left: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
  align-self: center;
  padding-right: 16px;
  pointer-events: none;
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
  align-self: center;
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
</style>
