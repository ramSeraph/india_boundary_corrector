import VectorTileLayer from 'ol/layer/VectorTile';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import { PMTilesVectorSource } from 'ol-pmtiles';
import { getPmtilesUrl } from '../../data/index.js';
import { layerConfigs } from '../../layer-configs/src/index.js';

/**
 * Generate OpenLayers style function from a LayerConfig
 * @param {LayerConfig} layerConfig
 * @returns {function} Style function for OpenLayers
 */
function generateStyleFunction(layerConfig) {
  const {
    zoomThreshold = 5,
    osmAddLineColor,
    osmDelLineColor,
    neAddLineColor,
    neDelLineColor,
    osmAddLineWidth,
    osmDelLineWidth,
    neAddLineWidth,
    neDelLineWidth,
  } = layerConfig;

  // Pre-create styles for performance
  const styles = {
    'to-del-ne': new Style({
      stroke: new Stroke({
        color: neDelLineColor,
        width: neDelLineWidth - 1,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
    'to-add-ne': new Style({
      stroke: new Stroke({
        color: neAddLineColor,
        width: neAddLineWidth - 1,
      }),
    }),
    'to-del-osm': new Style({
      stroke: new Stroke({
        color: osmDelLineColor,
        width: osmDelLineWidth - 1,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
    'to-add-osm': new Style({
      stroke: new Stroke({
        color: osmAddLineColor,
        width: osmAddLineWidth - 1,
      }),
    }),
  };

  return function(feature, resolution) {
    const layer = feature.get('layer');
    const zoom = Math.log2(156543.03392 / resolution);

    // NE layers only for zoom < threshold
    if (layer === 'to-del-ne' || layer === 'to-add-ne') {
      if (zoomThreshold > 0 && zoom < zoomThreshold) {
        return styles[layer];
      }
      return null;
    }

    // OSM layers for zoom >= threshold
    if (layer === 'to-del-osm' || layer === 'to-add-osm') {
      if (zoom >= zoomThreshold) {
        return styles[layer];
      }
      return null;
    }

    return null;
  };
}

/**
 * Create a correction layer for OpenLayers
 * @param {string} pmtilesUrl
 * @param {LayerConfig} layerConfig
 * @returns {VectorTileLayer}
 */
function createCorrectionLayer(pmtilesUrl, layerConfig) {
  const source = new PMTilesVectorSource({
    url: pmtilesUrl,
    attributions: [],
  });

  const styleFunction = generateStyleFunction(layerConfig);

  const layer = new VectorTileLayer({
    source: source,
    style: styleFunction,
    declutter: false,
  });

  return layer;
}

/**
 * India boundary corrector for OpenLayers maps.
 * Renders boundary corrections as a vector tile overlay.
 */
export class BoundaryCorrector {
  /**
   * @param {import('ol/Map').default} map - OpenLayers map instance
   * @param {Object} [options] - Configuration options
   * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to bundled file)
   * @param {LayerConfig|string} [options.layerConfig] - Layer configuration object or config ID string
   */
  constructor(map, options = {}) {
    this.map = map;
    this.pmtilesUrl = options.pmtilesUrl ?? getPmtilesUrl();
    this.layerConfig = typeof options.layerConfig === 'string'
      ? layerConfigs.get(options.layerConfig)
      : options.layerConfig;
    
    this.correctionLayer = null;
    this._initialized = false;
  }

  /**
   * Initialize the boundary corrector and add correction layer to map.
   * @returns {this}
   */
  init() {
    if (this._initialized) return this;

    if (!this.layerConfig) {
      console.warn('[india-boundary-corrector] No layer config provided. Use layerConfig option.');
      return this;
    }

    this.correctionLayer = createCorrectionLayer(
      this.pmtilesUrl,
      this.layerConfig
    );

    this.map.addLayer(this.correctionLayer);
    this._initialized = true;

    return this;
  }

  /**
   * Remove the correction layer from the map.
   */
  remove() {
    if (!this._initialized) return;

    if (this.correctionLayer) {
      this.map.removeLayer(this.correctionLayer);
      this.correctionLayer = null;
    }

    this._initialized = false;
  }

  /**
   * Get the correction layer.
   * @returns {VectorTileLayer|null}
   */
  getLayer() {
    return this.correctionLayer;
  }

  /**
   * Get the layer config.
   * @returns {LayerConfig|null}
   */
  getLayerConfig() {
    return this.layerConfig;
  }

  /**
   * Check if the corrector is initialized.
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
}

/**
 * Add India boundary corrections to an OpenLayers map.
 * 
 * @param {import('ol/Map').default} map - OpenLayers map instance
 * @param {Object} [options] - Configuration options
 * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to bundled file)
 * @param {LayerConfig|string} [options.layerConfig] - Layer configuration object or config ID string
 * @returns {BoundaryCorrector} BoundaryCorrector instance (call remove() to cleanup)
 * 
 * @example
 * import { addBoundaryCorrector } from '@india-boundary-corrector/openlayers';
 * const corrector = addBoundaryCorrector(map, { layerConfig: 'osm-carto' });
 * 
 * @example
 * // With explicit config
 * import { osmCartoDark } from '@india-boundary-corrector/layer-configs';
 * const corrector = addBoundaryCorrector(map, { layerConfig: osmCartoDark });
 */
export function addBoundaryCorrector(map, options = {}) {
  const corrector = new BoundaryCorrector(map, options);
  return corrector.init();
}

/**
 * Remove boundary corrector from the map.
 * @param {BoundaryCorrector} corrector - The corrector instance to remove
 */
export function removeBoundaryCorrector(corrector) {
  if (corrector && typeof corrector.remove === 'function') {
    corrector.remove();
  }
}

// Re-export utilities for advanced usage
export { layerConfigs } from '../../layer-configs/src/index.js';
export { getPmtilesUrl } from '../../data/index.js';
