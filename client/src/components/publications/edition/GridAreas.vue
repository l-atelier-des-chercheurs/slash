<template>
  <div class="_grid">
    <!-- Grid container wrapper -->
    <div class="_gridWrapper">
      <!-- Background grid for visual reference -->
      <div
        class="_gridBackground"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${column_count}, 1fr)`,
          gridTemplateRows: `repeat(${row_count}, 1fr)`,
          gap: 'calc(var(--spacing) / 2)',
        }"
      >
        <div
          v-for="cellIndex in column_count * row_count"
          :key="'bg-' + cellIndex"
          class="_gridCell--background"
          :class="{ '_gridCell--occupied': isCellOccupied(cellIndex) }"
          @click="addAreaAtCell(cellIndex)"
        >
          <div v-if="!isCellOccupied(cellIndex)" class="_gridCell--addIcon">
            <b-icon icon="plus" scale="1.5" />
          </div>
        </div>
      </div>

      <!-- Overlay grid for positioning areas -->
      <div
        class="_gridOverlay"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${column_count || 1}, 1fr)`,
          gridTemplateRows: `repeat(${row_count || 1}, 1fr)`,
          gap: 'calc(var(--spacing) / 2)',
        }"
      >
        <!-- Grid areas (absolutely positioned on grid) -->
        <GridArea
          v-for="(area, index) in grid_areas"
          :key="area.id"
          :area="area"
          :selected-area-id="selected_area_id"
          :dragging-area-id="dragging_area_id"
          :updating-area-id="updating_area_id"
          :publication="publication"
          :column-count="column_count"
          :row-count="row_count"
          :is_being_chained="toggle_chain_area_id === area.id"
          @select="selectArea"
          @drag-start="startDrag"
          @resize-start="startResize"
          @toggle-chain="toggleChain"
          @delete="deleteArea"
        />
      </div>
    </div>

    <!-- Add new area button (optional fallback) -->
    <div v-if="grid_areas.length === 0" class="_addAreaButton">
      <p class="u-instructions">
        {{ $t("click_empty_cell_to_add_area") }}
      </p>
    </div>
  </div>
</template>

<script>
import GridArea from "./GridArea.vue";

export default {
  props: {
    chapter: {
      type: Object,
      required: true,
    },
    publication: {
      type: Object,
      required: true,
    },
  },
  components: {
    GridArea,
  },
  data() {
    return {
      selected_area_id: null,
      resizing_area_id: null,
      dragging_area_id: null,
      drag_start_pos: null,
      resize_start_pos: null,
      initial_area_position: null,
      temp_grid_areas: null,
      updating_area_id: null,
      toggle_chain_area_id: null,
    };
  },
  computed: {
    column_count() {
      return this.chapter.column_count || 6;
    },
    row_count() {
      return this.chapter.row_count || 6;
    },
    grid_areas() {
      // Use temporary grid_areas during drag/resize operations
      const areas = this.temp_grid_areas || this.chapter.grid_areas || [];
      // Clamp all areas to grid bounds
      return areas.map((area) => this.clampAreaToBounds(area));
    },
  },
  methods: {
    generateNextLetterId() {
      // Find the next available letter ID
      const existingLetters = this.grid_areas.map((area) => area.id);
      let index = 0;
      let letter = this.getAreaLetter(index);

      // Keep incrementing until we find an unused letter
      while (existingLetters.includes(letter)) {
        index++;
        letter = this.getAreaLetter(index);
      }

      return letter;
    },
    updateChapter(new_meta) {
      this.$api.updateMeta({
        path: this.chapter.$path,
        new_meta,
      });
    },
    async deleteArea(areaId) {
      this.$eventHub.$emit("gridArea.delete", areaId);
      // Remove area from grid_areas
      const grid_areas = this.chapter.grid_areas.filter(
        (area) => area.id !== areaId
      );
      this.updateChapter({ grid_areas });
    },
    selectArea(areaId) {
      this.selected_area_id = areaId;
    },
    findAreaById(areaId) {
      return this.grid_areas.find((area) => area.id === areaId);
    },
    getAreaLetter(index) {
      // Convert index to letter (A, B, C, ..., Z, AA, AB, ...)
      let letter = "";
      let num = index;
      while (num >= 0) {
        letter = String.fromCharCode(65 + (num % 26)) + letter;
        num = Math.floor(num / 26) - 1;
      }
      return letter;
    },
    getCellPosition(cellIndex) {
      // Convert 1-based cellIndex to column and row (1-based for CSS Grid)
      const row = Math.ceil(cellIndex / this.column_count);
      const col = ((cellIndex - 1) % this.column_count) + 1;
      return { col, row };
    },
    clampAreaToBounds(area) {
      // Ensure area stays within grid bounds
      const col_span = area.column_end - area.column_start;
      const row_span = area.row_end - area.row_start;

      // Clamp start positions
      let column_start = Math.max(
        1,
        Math.min(area.column_start, this.column_count)
      );
      let row_start = Math.max(1, Math.min(area.row_start, this.row_count));

      // Ensure end positions don't exceed grid bounds
      let column_end = Math.min(column_start + col_span, this.column_count + 1);
      let row_end = Math.min(row_start + row_span, this.row_count + 1);

      // Ensure minimum size of 1x1
      if (column_end <= column_start) {
        column_end = column_start + 1;
      }
      if (row_end <= row_start) {
        row_end = row_start + 1;
      }

      // Adjust start if end would exceed bounds
      if (column_end > this.column_count + 1) {
        column_start = Math.max(1, this.column_count + 1 - col_span);
        column_end = this.column_count + 1;
      }
      if (row_end > this.row_count + 1) {
        row_start = Math.max(1, this.row_count + 1 - row_span);
        row_end = this.row_count + 1;
      }

      return {
        ...area,
        column_start,
        column_end,
        row_start,
        row_end,
      };
    },
    isCellOccupied(cellIndex) {
      const { col, row } = this.getCellPosition(cellIndex);
      return this.grid_areas.some((area) => {
        return (
          col >= area.column_start &&
          col < area.column_end &&
          row >= area.row_start &&
          row < area.row_end
        );
      });
    },
    async addAreaAtCell(cellIndex) {
      if (this.isCellOccupied(cellIndex)) return;

      const { col, row } = this.getCellPosition(cellIndex);

      // Ensure the cell is within bounds
      if (col > this.column_count || row > this.row_count) return;

      let new_area_id;

      if (this.toggle_chain_area_id) {
        new_area_id = this.toggle_chain_area_id + "1";
        this.toggle_chain_area_id = null;
      } else {
        new_area_id = this.generateNextLetterId();
      }

      const new_area = {
        id: new_area_id,
        column_start: Math.min(col, this.column_count),
        column_end: Math.min(col + 1, this.column_count + 1),
        row_start: Math.min(row, this.row_count),
        row_end: Math.min(row + 1, this.row_count + 1),
      };

      const grid_areas = [...this.grid_areas, new_area];
      this.updateChapter({ grid_areas });
    },
    // Drag to move area
    startDrag(areaId, event) {
      this.dragging_area_id = areaId;
      this.drag_start_pos = { x: event.clientX, y: event.clientY };
      const area = this.findAreaById(areaId);
      this.initial_area_position = {
        column_start: area.column_start,
        column_end: area.column_end,
        row_start: area.row_start,
        row_end: area.row_end,
      };
      // Clone grid_areas for local manipulation during drag
      this.temp_grid_areas = JSON.parse(
        JSON.stringify(this.chapter.grid_areas || [])
      );

      document.addEventListener("mousemove", this.handleDrag);
      document.addEventListener("mouseup", this.stopDrag);
    },
    handleDrag(event) {
      if (this.dragging_area_id === null) return;

      const container = this.$el.querySelector("._gridOverlay");
      const rect = container.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(container).gap.replace("px", ""));
      const cellWidth =
        (rect.width - gap * (this.column_count - 1)) / this.column_count;
      const cellHeight =
        (rect.height - gap * (this.row_count - 1)) / this.row_count;

      const deltaX = event.clientX - this.drag_start_pos.x;
      const deltaY = event.clientY - this.drag_start_pos.y;

      const colChange = Math.round(deltaX / (cellWidth + gap));
      const rowChange = Math.round(deltaY / (cellHeight + gap));

      const area = this.findAreaById(this.dragging_area_id);
      const col_span = area.column_end - area.column_start;
      const row_span = area.row_end - area.row_start;

      let new_col_start = this.initial_area_position.column_start + colChange;
      let new_row_start = this.initial_area_position.row_start + rowChange;

      // Constrain to grid bounds - ensure area doesn't go outside grid
      new_col_start = Math.max(
        1,
        Math.min(new_col_start, Math.max(1, this.column_count - col_span + 1))
      );
      new_row_start = Math.max(
        1,
        Math.min(new_row_start, Math.max(1, this.row_count - row_span + 1))
      );

      const new_col_end = Math.min(
        new_col_start + col_span,
        this.column_count + 1
      );
      const new_row_end = Math.min(
        new_row_start + row_span,
        this.row_count + 1
      );

      if (
        new_col_start !== area.column_start ||
        new_row_start !== area.row_start
      ) {
        // Update temp_grid_areas instead of calling updateChapter
        this.temp_grid_areas = this.temp_grid_areas.map((a) =>
          a.id === this.dragging_area_id
            ? {
                ...a,
                column_start: new_col_start,
                column_end: new_col_end,
                row_start: new_row_start,
                row_end: new_row_end,
              }
            : a
        );
      }
    },
    stopDrag() {
      // Save the final state when drag stops, only if position changed
      if (this.temp_grid_areas && this.dragging_area_id) {
        const final_area = this.temp_grid_areas.find(
          (a) => a.id === this.dragging_area_id
        );

        // Check if position actually changed
        const has_changed =
          final_area.column_start !== this.initial_area_position.column_start ||
          final_area.column_end !== this.initial_area_position.column_end ||
          final_area.row_start !== this.initial_area_position.row_start ||
          final_area.row_end !== this.initial_area_position.row_end;

        if (has_changed) {
          this.updating_area_id = this.dragging_area_id;
          this.updateChapter({ grid_areas: this.temp_grid_areas });

          // Keep temp_grid_areas and clear after a short delay to prevent flashing
          setTimeout(() => {
            this.temp_grid_areas = null;
            this.updating_area_id = null;
          }, 100);
        } else {
          // No change, just clear temp state immediately
          this.temp_grid_areas = null;
        }
      }

      this.dragging_area_id = null;
      this.drag_start_pos = null;
      this.initial_area_position = null;
      document.removeEventListener("mousemove", this.handleDrag);
      document.removeEventListener("mouseup", this.stopDrag);
    },
    // Resize area
    startResize(areaId, event) {
      this.resizing_area_id = areaId;
      this.resize_start_pos = { x: event.clientX, y: event.clientY };
      const area = this.findAreaById(areaId);
      this.initial_area_position = {
        column_end: area.column_end,
        row_end: area.row_end,
      };
      // Clone grid_areas for local manipulation during resize
      this.temp_grid_areas = JSON.parse(
        JSON.stringify(this.chapter.grid_areas || [])
      );

      document.addEventListener("mousemove", this.handleResize);
      document.addEventListener("mouseup", this.stopResize);
    },
    handleResize(event) {
      if (this.resizing_area_id === null) return;

      const container = this.$el.querySelector("._gridOverlay");
      const rect = container.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(container).gap.replace("px", ""));
      const cellWidth =
        (rect.width - gap * (this.column_count - 1)) / this.column_count;
      const cellHeight =
        (rect.height - gap * (this.row_count - 1)) / this.row_count;

      const deltaX = event.clientX - this.resize_start_pos.x;
      const deltaY = event.clientY - this.resize_start_pos.y;

      const colChange = Math.round(deltaX / (cellWidth + gap));
      const rowChange = Math.round(deltaY / (cellHeight + gap));

      const area = this.findAreaById(this.resizing_area_id);

      let new_col_end = this.initial_area_position.column_end + colChange;
      let new_row_end = this.initial_area_position.row_end + rowChange;

      // Constrain to grid bounds and minimum size
      // Ensure end doesn't exceed grid bounds
      new_col_end = Math.max(
        area.column_start + 1,
        Math.min(new_col_end, this.column_count + 1)
      );
      new_row_end = Math.max(
        area.row_start + 1,
        Math.min(new_row_end, this.row_count + 1)
      );

      // If resize would exceed bounds, clamp it
      if (new_col_end > this.column_count + 1) {
        new_col_end = this.column_count + 1;
      }
      if (new_row_end > this.row_count + 1) {
        new_row_end = this.row_count + 1;
      }

      if (new_col_end !== area.column_end || new_row_end !== area.row_end) {
        // Update temp_grid_areas instead of calling updateChapter
        this.temp_grid_areas = this.temp_grid_areas.map((a) =>
          a.id === this.resizing_area_id
            ? {
                ...a,
                column_end: new_col_end,
                row_end: new_row_end,
              }
            : a
        );
      }
    },
    stopResize() {
      // Save the final state when resize stops, only if size changed
      if (this.temp_grid_areas && this.resizing_area_id) {
        const final_area = this.temp_grid_areas.find(
          (a) => a.id === this.resizing_area_id
        );

        // Check if size actually changed
        const has_changed =
          final_area.column_end !== this.initial_area_position.column_end ||
          final_area.row_end !== this.initial_area_position.row_end;

        if (has_changed) {
          this.updating_area_id = this.resizing_area_id;
          this.updateChapter({ grid_areas: this.temp_grid_areas });

          // Keep temp_grid_areas and clear after a short delay to prevent flashing
          setTimeout(() => {
            this.temp_grid_areas = null;
            this.updating_area_id = null;
          }, 100);
        } else {
          // No change, just clear temp state immediately
          this.temp_grid_areas = null;
        }
      }

      this.resizing_area_id = null;
      this.resize_start_pos = null;
      this.initial_area_position = null;
      document.removeEventListener("mousemove", this.handleResize);
      document.removeEventListener("mouseup", this.stopResize);
    },
    toggleChain(areaId) {
      if (this.toggle_chain_area_id === areaId) {
        this.toggle_chain_area_id = null;
      } else {
        this.toggle_chain_area_id = areaId;
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("mousemove", this.handleResize);
    document.removeEventListener("mouseup", this.stopResize);
    document.removeEventListener("mousemove", this.handleDrag);
    document.removeEventListener("mouseup", this.stopDrag);
  },
};
</script>

<style lang="scss" scoped>
._grid {
  margin-bottom: calc(var(--spacing) * 1);
}

._gridWrapper {
  position: relative;
  background: transparent;
  padding: 0;
}

._gridBackground {
  position: relative;
  z-index: 1;
}

._gridCell--background {
  background: transparent;
  background: var(--c-gris_clair);
  color: var(--c-gris_fonce);
  outline-offset: -1px;
  height: 60px;
  border-radius: var(--input-border-radius);
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;

  ._gridCell--addIcon {
    color: var(--c-gris);
  }

  &:not(._gridCell--occupied):hover {
    background: rgba(0, 0, 0, 0.02);
    outline: 1px dashed var(--c-gris);

    ._gridCell--addIcon {
      opacity: 1;
    }
  }

  &._gridCell--occupied {
    cursor: default;
    opacity: 0.3;
  }
}

._gridCell--addIcon {
  font-size: 20px;
  color: white;
}

._gridOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}

._addAreaButton {
  margin-top: calc(var(--spacing) * 1);
  display: flex;
  justify-content: center;
}
</style>
