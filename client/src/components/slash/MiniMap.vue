<template>
  <div class="_miniMap" v-if="canvas_width > 0 && canvas_height > 0">
    <svg
      ref="svg"
      class="_miniMapSvg"
      :viewBox="`0 0 ${canvas_width} ${canvas_height}`"
      preserveAspectRatio="xMidYMid meet"
      @mousedown="handleMouseDown"
    >
      <!-- Canvas background -->
      <rect
        x="0"
        :y="0"
        :width="canvas_width"
        :height="canvas_height"
        fill="#f5f5f5"
        stroke="#ddd"
        stroke-width="1"
      />

      <!-- Items -->
      <g v-for="file in files" :key="file.$path">
        <!-- Canvas shapes: render actual shape -->
        <g
          v-if="file.$type === 'canvas_shape'"
          :transform="`translate(${file.x || 0}, ${file.y || 0})`"
        >
          <!-- Render the path directly from parsed SVG -->
          <path
            v-if="getShapePath(file)"
            :d="getShapePath(file)"
            :fill="isSelected(file) ? '#4a9eff' : 'none'"
            :stroke="isSelected(file) ? '#0066cc' : '#333'"
            :stroke-width="isSelected(file) ? '2' : '1.5'"
            :opacity="isSelected(file) ? 0.9 : 0.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- Fallback: render entire SVG using foreignObject if path extraction fails -->
          <foreignObject
            v-else-if="file.shape_svg"
            :width="file.width || 100"
            :height="file.height || 100"
            style="overflow: visible"
          >
            <div
              v-html="file.shape_svg"
              style="
                width: 100%;
                height: 100%;
                pointer-events: none;
                display: block;
              "
            />
          </foreignObject>
        </g>
        <!-- Other items: render box -->
        <rect
          v-else
          :x="file.x || 0"
          :y="file.y || 0"
          :width="getItemWidth(file)"
          :height="getItemHeight(file)"
          :fill="isSelected(file) ? '#4a9eff' : '#999'"
          :stroke="isSelected(file) ? '#0066cc' : '#666'"
          stroke-width="0.5"
          :opacity="isSelected(file) ? 0.8 : 0.5"
        />
      </g>

      <!-- Viewport rectangle -->
      <g v-if="has_valid_viewport" class="_viewportRectangle">
        <!-- Semi-transparent fill -->
        <rect
          :x="viewport_x"
          :y="viewport_y"
          :width="viewport_width"
          :height="viewport_height"
          fill="#00FF00"
          opacity="0.15"
        />
        <!-- Border -->
        <rect
          :x="viewport_x"
          :y="viewport_y"
          :width="viewport_width"
          :height="viewport_height"
          fill="none"
          stroke="#ff6600"
          stroke-width="2"
          stroke-dasharray="4 4"
          opacity="0.9"
        />
      </g>
    </svg>
  </div>
</template>

<script>
export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
    canvas_width: {
      type: Number,
      default: 0,
    },
    canvas_height: {
      type: Number,
      default: 0,
    },
    zoom: {
      type: Number,
      default: 1,
    },
    viewport_props: {
      type: Object,
      default: () => ({
        left_pct: 0,
        top_pct: 0,
        width_pct: 0,
        height_pct: 0,
      }),
    },
    selected_files: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    viewport_x() {
      return ((this.viewport_props.left_pct || 0) / 100) * this.canvas_width;
    },
    viewport_y() {
      return ((this.viewport_props.top_pct || 0) / 100) * this.canvas_height;
    },
    viewport_width() {
      return ((this.viewport_props.width_pct || 0) / 100) * this.canvas_width;
    },
    viewport_height() {
      return ((this.viewport_props.height_pct || 0) / 100) * this.canvas_height;
    },
    has_valid_viewport() {
      const p = this.viewport_props;
      return (
        (p.width_pct || 0) > 0 &&
        (p.height_pct || 0) > 0 &&
        this.canvas_width > 0 &&
        this.canvas_height > 0
      );
    },
  },
  methods: {
    getItemWidth(file) {
      return file.width || 160;
    },
    getItemHeight(file) {
      const width = this.getItemWidth(file);
      const ratio = file.$infos && file.$infos.ratio;
      const default_ratio = 9 / 16; // height/width for 16:9
      const effective_ratio = ratio !== undefined ? ratio : default_ratio;
      return width * effective_ratio;
    },
    isSelected(file) {
      return this.selected_files.includes(file.$path);
    },
    getShapePath(file) {
      if (!file.shape_svg) {
        return null;
      }
      try {
        // First try regex extraction (more reliable for simple cases)
        const path_match = file.shape_svg.match(/<path[^>]*d=["']([^"']+)["']/);
        if (path_match && path_match[1]) {
          return path_match[1];
        }
        // Fallback to DOM parsing
        const parser = new DOMParser();
        const svg_doc = parser.parseFromString(file.shape_svg, "image/svg+xml");
        const parse_error = svg_doc.querySelector("parsererror");
        if (parse_error) {
          console.warn("SVG parse error:", parse_error.textContent);
          return null;
        }
        const path_element = svg_doc.querySelector("path");
        if (path_element) {
          const path_d = path_element.getAttribute("d");
          if (path_d) {
            return path_d;
          }
        }
      } catch (err) {
        console.warn("Failed to parse shape SVG:", err);
      }
      return null;
    },
    handleMouseDown(event) {
      if (!this.$refs.svg) return;
      const svg_rect = this.$refs.svg.getBoundingClientRect();
      const scale_x = this.canvas_width / svg_rect.width;
      const scale_y = this.canvas_height / svg_rect.height;

      const x = (event.clientX - svg_rect.left) * scale_x;
      const y = (event.clientY - svg_rect.top) * scale_y;

      // Emit event to pan to this position (center the viewport on the clicked point)
      this.$eventHub.$emit("panzoom.panTo", {
        x: x - this.viewport_width / 2,
        y: y - this.viewport_height / 2,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
._miniMap {
  position: absolute;
  bottom: var(--spacing);
  left: var(--spacing);
  width: 200px;
  height: 150px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  cursor: pointer;
  overflow: hidden;
}

._miniMapSvg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
