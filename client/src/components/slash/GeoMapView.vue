<template>
  <div class="_geoMapView">
    <div ref="mapContainer" class="_geoMapView--map"></div>
    <div ref="popupContainer" class="_geoMapView--popup" v-show="selectedFile">
      <div class="_geoMapView--popupContent" v-if="selectedFile">
        <button class="_geoMapView--closePopup" @click="selectedFile = null">×</button>
        <div class="_geoMapView--media">
          <MediaContent :file="selectedFile" :context="'full'" :resolution="320" />
        </div>
        <div class="_geoMapView--info">
          {{ selectedFile.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle, Fill, Stroke, Text } from "ol/style";
import Overlay from "ol/Overlay";
import { Cluster } from "ol/source";
import AnimatedCluster from "ol-ext/layer/AnimatedCluster";
import SelectCluster from "ol-ext/interaction/SelectCluster";

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
      overlay: null,
      resizeObserver: null,
      styleCache: {},
    };
  },
  mounted() {
    this.initMap();
    
    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) {
        this.map.updateSize();
      }
    });
    this.resizeObserver.observe(this.$refs.mapContainer);
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  watch: {
    files: {
      handler() {
        this.updateFeatures();
      },
      deep: true,
    },
  },
  methods: {
    initMap() {
      // Center roughly in the middle of our polygon (Mediterranean/Europe)
      const center = fromLonLat([15, 42]); 

      this.map = new Map({
        target: this.$refs.mapContainer,
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: center,
          zoom: 4,
        }),
      });

      this.vectorSource = new VectorSource();
      this.clusterSource = new Cluster({
        distance: 40,
        source: this.vectorSource,
      });

      const clusterLayer = new AnimatedCluster({
        name: "Cluster",
        source: this.clusterSource,
        animationDuration: 700,
        style: this.getStyle,
      });
      this.map.addLayer(clusterLayer);

      // Popup overlay
      this.overlay = new Overlay({
        element: this.$refs.popupContainer,
        autoPan: true,
        autoPanAnimation: {
          duration: 250,
        },
        positioning: 'bottom-center',
        offset: [0, -10]
      });
      this.map.addOverlay(this.overlay);

      // Select interaction to handle clicks
      const selectCluster = new SelectCluster({
        pointRadius: 20,
        animate: true,
        spiral: true,
        featureStyle: this.getStyle,
      });
      this.map.addInteraction(selectCluster);

      selectCluster.getFeatures().on(["add"], (e) => {
        const features = e.element.get("features");
        if (features && features.length === 1) {
          const file = features[0].get("file");
          this.selectedFile = file;
          const coordinates = e.element.getGeometry().getCoordinates();
          this.overlay.setPosition(coordinates);
        } else {
          // If cluster with multiple items is clicked and spiderfied
          // We don't show popup for the cluster center itself
          this.selectedFile = null;
          this.overlay.setPosition(undefined);
        }
      });
      
      selectCluster.getFeatures().on(["remove"], () => {
         this.selectedFile = null;
         this.overlay.setPosition(undefined);
      });

      // Pointer cursor on hover
      this.map.on("pointermove", (evt) => {
        const pixel = this.map.getEventPixel(evt.originalEvent);
        const hit = this.map.hasFeatureAtPixel(pixel);
        this.map.getTarget().style.cursor = hit ? "pointer" : "";
      });

      this.updateFeatures();
    },
    getStyle(feature) {
      const features = feature.get("features");
      const size = features ? features.length : 1;
      let style = this.styleCache[size];
      if (!style) {
        if (size > 1) {
          style = new Style({
            image: new Circle({
              radius: 10 + Math.min(size, 20), // Cap size
              fill: new Fill({ color: "#2a9d8f" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({ color: "#fff" }),
              scale: 1.2,
            }),
          });
        } else {
           // Single feature style
           style = new Style({
            image: new Circle({
              radius: 6,
              fill: new Fill({ color: "#e76f51" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          });
        }
        this.styleCache[size] = style;
      }
      return style;
    },
    updateFeatures() {
      if (!this.vectorSource) return;
      this.vectorSource.clear();

      if (!this.files || this.files.length === 0) return;

      const cities = [
        { name: 'Lisbon', lon: -9.1393, lat: 38.7223 },
        { name: 'Nantes', lon: -1.5536, lat: 47.2184 },
        { name: 'Innsbruck', lon: 11.4041, lat: 47.2692 },
        { name: 'Tunis', lon: 10.1815, lat: 36.8065 },
        { name: 'Tbilisi', lon: 44.8271, lat: 41.7151 },
      ];

      const features = this.files.map((file) => {
        // Use a consistent hash to pick a city
        const seed = this.hashCode(file.$path || file.name || Math.random().toString());
        const cityIndex = Math.abs(seed) % cities.length;
        const city = cities[cityIndex];

        // Exact coordinates now
        const lat = city.lat;
        const lon = city.lon;

        const feature = new Feature({
          geometry: new Point(fromLonLat([lon, lat])),
        });
        feature.set("file", file);
        return feature;
      });

      this.vectorSource.addFeatures(features);
    },
    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    },
    seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }
  },
};
</script>

<style lang="scss" scoped>
._geoMapView {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding-top: calc(var(--spacing, 1rem) * 4); 
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
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  min-width: 200px;
  max-width: 300px;
  z-index: 1000;
  
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