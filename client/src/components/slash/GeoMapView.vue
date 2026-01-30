<template>
  <div class="_geoMapView">
    <div ref="mapContainer" class="_geoMapView--map"></div>
    <div
      ref="popupContainer"
      class="_geoMapView--popup"
      v-show="selectedFile"
      :style="popupStyle"
    >
      <div class="_geoMapView--popupContent" v-if="selectedFile">
        <button class="_geoMapView--closePopup" @click="closePopup">×</button>
        <div class="_geoMapView--media">
          <MediaContent
            :file="selectedFile"
            :context="'full'"
            :resolution="320"
          />
        </div>
        <div class="_geoMapView--info">
          {{ selectedFile.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const CITIES = [
  { name: "Lisbon", lon: -9.1393, lat: 38.7223 },
  { name: "Nantes", lon: -1.5536, lat: 47.2184 },
  { name: "Innsbruck", lon: 11.4041, lat: 47.2692 },
  { name: "Tunis", lon: 10.1815, lat: 36.8065 },
  { name: "Tbilisi", lon: 44.8271, lat: 41.7151 },
];

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      map: null,
      selectedFile: null,
      popupLngLat: null,
      resizeObserver: null,
    };
  },
  computed: {
    popupStyle() {
      if (!this.popupLngLat || !this.map) return {};
      const pt = this.map.project(this.popupLngLat);
      const el = this.$refs.popupContainer;
      const w = el ? el.offsetWidth : 200;
      const h = el ? el.offsetHeight : 0;
      return {
        left: `${pt.x - w / 2}px`,
        top: `${pt.y - h - 10}px`,
      };
    },
  },
  mounted() {
    this.initMap();

    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) {
        this.map.resize();
      }
    });
    this.resizeObserver.observe(this.$refs.mapContainer);
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  },
  watch: {
    files: {
      handler() {
        this.updateGeoJSON();
      },
      deep: true,
    },
  },
  methods: {
    initMap() {
      this.map = new maplibregl.Map({
        container: this.$refs.mapContainer,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [15, 42],
        zoom: 4,
      });

      this.map.on("load", () => {
        this.map.addSource("points", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster circles
        this.map.addLayer({
          id: "clusters",
          type: "circle",
          source: "points",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#e76f51",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18,
              100,
              24,
              750,
              30,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        // Cluster count label
        this.map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "points",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#fff",
          },
        });

        // Unclustered points
        this.map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "points",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#e76f51",
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        // Cluster click: zoom in to expand
        this.map.on("click", "clusters", async (e) => {
          const features = this.map.queryRenderedFeatures(e.point, {
            layers: ["clusters"],
          });
          if (!features.length) return;
          const clusterId = features[0].properties.cluster_id;
          const source = this.map.getSource("points");
          const zoom = await source.getClusterExpansionZoom(clusterId);
          this.map.easeTo({
            center: features[0].geometry.coordinates,
            zoom,
          });
        });

        // Unclustered point click: show popup
        this.map.on("click", "unclustered-point", (e) => {
          const feature = e.features[0];
          const index = feature.properties.index;
          if (index !== undefined && this.files[index]) {
            this.selectedFile = this.files[index];
            this.popupLngLat = feature.geometry.coordinates.slice();
          }
        });

        this.map.on("move", () => {
          this.$forceUpdate();
        });

        this.map.on("mouseenter", "clusters", () => {
          this.map.getCanvas().style.cursor = "pointer";
        });
        this.map.on("mouseleave", "clusters", () => {
          this.map.getCanvas().style.cursor = "";
        });
        this.map.on("mouseenter", "unclustered-point", () => {
          this.map.getCanvas().style.cursor = "pointer";
        });
        this.map.on("mouseleave", "unclustered-point", () => {
          this.map.getCanvas().style.cursor = "";
        });

        this.updateGeoJSON();
      });
    },
    buildGeoJSON() {
      if (!this.files || !this.files.length) {
        return { type: "FeatureCollection", features: [] };
      }
      const features = this.files.map((file, index) => {
        const seed = this.hashCode(
          file.$path || file.name || Math.random().toString()
        );
        const city = CITIES[Math.abs(seed) % CITIES.length];

        // Add jitter to coordinates so points don't stack exactly
        // This allows them to separate at high zoom levels
        const randomX = this.seededRandom(seed) - 0.5;
        const randomY = this.seededRandom(seed + 1) - 0.5;
        const jitter = 0.05; // approx 5km

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              city.lon + randomX * jitter,
              city.lat + randomY * jitter,
            ],
          },
          properties: { index },
        };
      });
      return { type: "FeatureCollection", features };
    },
    seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    },
    updateGeoJSON() {
      if (!this.map || !this.map.getSource("points")) return;
      this.map.getSource("points").setData(this.buildGeoJSON());
    },
    closePopup() {
      this.selectedFile = null;
      this.popupLngLat = null;
    },
    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash;
    },
  },
};
</script>

<style lang="scss" scoped>
._geoMapView {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

._geoMapView--map {
  width: 100%;
  height: 100%;
}

._geoMapView--popup {
  position: absolute;
  background-color: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  min-width: 200px;
  max-width: 300px;
  z-index: 1000;
  pointer-events: auto;

  /* Arrow */
  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -10px;
    border-width: 10px;
    border-style: solid;
    border-color: white transparent transparent transparent;
  }
}

._geoMapView--closePopup {
  position: absolute;
  top: 5px;
  right: 5px;
  border: none;
  background: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  color: #666;
  z-index: 10;

  &:hover {
    color: #000;
  }
}

._geoMapView--media {
  width: 100%;
  aspect-ratio: 4/3;
  margin-bottom: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #f0f0f0;

  ::v-deep ._mediaContent,
  ::v-deep img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

._geoMapView--info {
  font-size: 0.9rem;
  font-weight: 500;
  word-break: break-word;
}
</style>
