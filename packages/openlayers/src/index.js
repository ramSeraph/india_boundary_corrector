import VectorTileLayer from 'ol/layer/VectorTile';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import { PMTilesVectorSource } from 'ol-pmtiles';
import { getPmtilesUrl } from '../../data/index.js';
import { layerConfigs } from '../../layer-configs/src/index.js';

// Width scaling factor for OpenLayers (reduces width by 1/5th)
const WIDTH_SCALE_FACTOR = 0.8;

/**
 * Extract tile URLs from an OpenLayers tile layer
 * @param {import('ol/layer/Layer').default} layer
 * @returns {string[]}
 */
function getTileUrls(layer) {
  const source = layer.getSource?.();
  console.log('[BoundaryCorrector] getTileUrls - source:', source);
  console.log('[BoundaryCorrector] getTileUrls - source constructor:', source?.constructor?.name);
  if (!source) return [];
  
  // Try to get URLs from UrlTile-based sources (XYZ, OSM, TileImage, etc.)
  // UrlTile stores URLs in the 'urls' property
  console.log('[BoundaryCorrector] getTileUrls - source.urls:', source.urls);
  if (source.urls && Array.isArray(source.urls) && source.urls.length > 0) {
    console.log('[BoundaryCorrector] getTileUrls - returning source.urls:', source.urls);
    return source.urls;
  }
  
  // Fallback: try getUrls() method
  if (typeof source.getUrls === 'function') {
    const urls = source.getUrls();
    console.log('[BoundaryCorrector] getTileUrls - getUrls() returned:', urls);
    return urls || [];
  }
  
  // Fallback: try getUrl() method
  if (typeof source.getUrl === 'function') {
    const url = source.getUrl();
    console.log('[BoundaryCorrector] getTileUrls - getUrl() returned:', url);
    return url ? [url] : [];
  }
  
  console.log('[BoundaryCorrector] getTileUrls - no URLs found');
  return [];
}

/**
 * Resolve layer config from options or detect from tile URLs
 * @param {Object|string|undefined} layerConfig
 * @param {string[]} [tiles]
 * @returns {Object|undefined}
 */
function resolveLayerConfig(layerConfig, tiles) {
  if (typeof layerConfig === 'string') {
    return layerConfigs.get(layerConfig);
  }
  
  if (layerConfig) {
    return layerConfig;
  }
  
  if (tiles && tiles.length > 0) {
    return layerConfigs.detectFromUrls(tiles);
  }
  
  return undefined;
}

/**
 * Check if a layer is a tile layer (raster)
 * @param {import('ol/layer/Layer').default} layer
 * @returns {boolean}
 */
function isTileLayer(layer) {
  const source = layer.getSource?.();
  console.log('[BoundaryCorrector] isTileLayer - source:', source);
  if (!source) {
    console.log('[BoundaryCorrector] isTileLayer - no source, returning false');
    return false;
  }
  
  // Check for UrlTile-based sources by checking for characteristic methods/properties
  // UrlTile has: getTileUrlFunction, tileUrlFunction, urls, getTileLoadFunction
  const hasUrlTileFeatures = typeof source.getTileUrlFunction === 'function' ||
                             typeof source.getTileLoadFunction === 'function' ||
                             'urls' in source;
  
  console.log('[BoundaryCorrector] isTileLayer - hasUrlTileFeatures:', hasUrlTileFeatures);
  return hasUrlTileFeatures;
}

/**
 * Generate style function for deletion layers only
 */
function generateDelStyleFunction(layerConfig) {
  const {
    startZoom = 0,
    zoomThreshold = 5,
    osmDelLineColor,
    neDelLineColor,
    lineWidthMultiplier = 1.0,
  } = layerConfig;

  return function(feature, resolution) {
    const layer = feature.get('layer');
    const zoom = Math.round(Math.log2(156543.03392 / resolution));

    if (zoom < startZoom) {
      return null;
    }

    // Zoom-based width: zoom / 2 for deletions, scaled, with minimum of 1
    const width = Math.max(1, (zoom / 2) * WIDTH_SCALE_FACTOR * lineWidthMultiplier);

    if (layer === 'to-del-ne' && zoom >= startZoom && zoom < zoomThreshold) {
      return new Style({
        stroke: new Stroke({
          color: neDelLineColor,
          width: width,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      });
    }

    if (layer === 'to-del-osm' && zoom >= zoomThreshold) {
      return new Style({
        stroke: new Stroke({
          color: osmDelLineColor,
          width: width,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      });
    }

    return null;
  };
}

/**
 * Generate style function for addition layers only
 */
function generateAddStyleFunction(layerConfig) {
  const {
    startZoom = 0,
    zoomThreshold = 5,
    osmAddLineColor,
    neAddLineColor,
    addLineDashed = false,
    addLineDashArray = [],
    addLineHaloRatio = 0,
    addLineHaloAlpha = 0,
    lineWidthMultiplier = 1.0,
  } = layerConfig;

  return function(feature, resolution) {
    const layer = feature.get('layer');
    const zoom = Math.round(Math.log2(156543.03392 / resolution));

    if (zoom < startZoom) {
      return null;
    }

    // Zoom-based width: zoom / 4 for additions, scaled, with minimum of 0.5
    const width = Math.max(0.5, (zoom / 4) * WIDTH_SCALE_FACTOR * lineWidthMultiplier);
    const color = layer === 'to-add-ne' ? neAddLineColor : osmAddLineColor;

    if ((layer === 'to-add-ne' && zoom >= startZoom && zoom < zoomThreshold) ||
        (layer === 'to-add-osm' && zoom >= zoomThreshold)) {
      
      const styles = [];

      // Add halo if enabled
      if (addLineHaloRatio > 0 && addLineHaloAlpha > 0) {
        // Parse color and add alpha
        const haloColor = color.startsWith('#') 
          ? `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},${addLineHaloAlpha})`
          : color;
        styles.push(new Style({
          stroke: new Stroke({
            color: haloColor,
            width: width * (1 + addLineHaloRatio),
          }),
          zIndex: 1,
        }));
      }

      // Main line
      styles.push(new Style({
        stroke: new Stroke({
          color: color,
          width: width,
          ...(addLineDashed && addLineDashArray.length > 0 ? { lineDash: addLineDashArray.map(v => v * width) } : {}),
        }),
        zIndex: 2,
      }));

      return styles;
    }

    return null;
  };
}

/**
 * Create correction layers for OpenLayers (deletion layer + addition layer)
 * @param {string} pmtilesUrl
 * @param {LayerConfig} layerConfig
 * @returns {{ delLayer: VectorTileLayer, addLayer: VectorTileLayer }}
 */
function createCorrectionLayers(pmtilesUrl, layerConfig) {
  const delSource = new PMTilesVectorSource({
    url: pmtilesUrl,
    attributions: [],
  });

  const addSource = new PMTilesVectorSource({
    url: pmtilesUrl,
    attributions: [],
  });

  const delLayer = new VectorTileLayer({
    source: delSource,
    style: generateDelStyleFunction(layerConfig),
    declutter: false,
  });

  const addLayer = new VectorTileLayer({
    source: addSource,
    style: generateAddStyleFunction(layerConfig),
    declutter: false,
  });

  return { delLayer, addLayer };
}

/**
 * India boundary corrector for OpenLayers maps.
 * Automatically tracks tile layers and adds correction overlays.
 */
export class BoundaryCorrector {
  /**
   * @param {import('ol/Map').default} map - OpenLayers map instance
   * @param {Object} [options] - Configuration options
   * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to bundled file)
   * @param {LayerConfig|string} [options.layerConfig] - Layer configuration object or config ID string (optional, auto-detected from tile URLs)
   */
  constructor(map, options = {}) {
    this.map = map;
    this.pmtilesUrl = options.pmtilesUrl ?? getPmtilesUrl();
    this.providedLayerConfig = typeof options.layerConfig === 'string'
      ? layerConfigs.get(options.layerConfig)
      : options.layerConfig;
    
    /** @type {Map<import('ol/layer/Layer').default, { delLayer: VectorTileLayer, addLayer: VectorTileLayer, layerConfig: Object }>} */
    this.trackedLayers = new Map();
    
    this._onAddLayer = this._handleAddLayer.bind(this);
    this._onRemoveLayer = this._handleRemoveLayer.bind(this);
    this._initialized = false;
  }

  /**
   * Initialize the boundary corrector and start tracking.
   * @returns {this}
   */
  init() {
    if (this._initialized) return this;

    this._initialized = true;
    
    // Scan existing layers
    this._scanExistingLayers();
    
    // Listen for layer changes
    const layers = this.map.getLayers();
    layers.on('add', this._onAddLayer);
    layers.on('remove', this._onRemoveLayer);

    return this;
  }

  /**
   * Remove all corrections and cleanup listeners.
   */
  remove() {
    if (!this._initialized) return;

    const layers = this.map.getLayers();
    layers.un('add', this._onAddLayer);
    layers.un('remove', this._onRemoveLayer);

    for (const baseLayer of this.trackedLayers.keys()) {
      this._removeCorrectionsForLayer(baseLayer);
    }

    this._initialized = false;
  }

  /**
   * Get the tracked layers map.
   * @returns {Map<import('ol/layer/Layer').default, Object>}
   */
  getTrackedLayers() {
    return new Map(this.trackedLayers);
  }

  /**
   * Check if corrections are active for a specific layer.
   * @param {import('ol/layer/Layer').default} layer
   * @returns {boolean}
   */
  hasCorrections(layer) {
    return this.trackedLayers.has(layer);
  }

  /**
   * Get the correction layers for a base layer.
   * @param {import('ol/layer/Layer').default} baseLayer
   * @returns {{ delLayer: VectorTileLayer, addLayer: VectorTileLayer }|null}
   */
  getCorrectionLayers(baseLayer) {
    const tracked = this.trackedLayers.get(baseLayer);
    return tracked ? { delLayer: tracked.delLayer, addLayer: tracked.addLayer } : null;
  }

  /**
   * Get the layer config for a base layer.
   * @param {import('ol/layer/Layer').default} baseLayer
   * @returns {LayerConfig|null}
   */
  getLayerConfig(baseLayer) {
    const tracked = this.trackedLayers.get(baseLayer);
    return tracked ? tracked.layerConfig : null;
  }

  /**
   * Check if the corrector is initialized.
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  _scanExistingLayers() {
    const layers = this.map.getLayers().getArray();
    for (const layer of layers) {
      this._tryAddCorrections(layer);
    }
  }

  _handleAddLayer(event) {
    const layer = event.element;
    this._tryAddCorrections(layer);
  }

  _handleRemoveLayer(event) {
    const layer = event.element;
    this._removeCorrectionsForLayer(layer);
  }

  _tryAddCorrections(layer) {
    console.log('[BoundaryCorrector] _tryAddCorrections - layer:', layer);
    if (this.trackedLayers.has(layer)) {
      console.log('[BoundaryCorrector] _tryAddCorrections - layer already tracked, skipping');
      return;
    }
    if (!isTileLayer(layer)) {
      console.log('[BoundaryCorrector] _tryAddCorrections - not a tile layer, skipping');
      return;
    }

    const tiles = getTileUrls(layer);
    console.log('[BoundaryCorrector] _tryAddCorrections - tiles:', tiles);
    console.log('[BoundaryCorrector] _tryAddCorrections - providedLayerConfig:', this.providedLayerConfig);
    const layerConfig = this.providedLayerConfig ?? resolveLayerConfig(undefined, tiles);
    console.log('[BoundaryCorrector] _tryAddCorrections - resolved layerConfig:', layerConfig);
    
    if (!layerConfig) {
      // No config found - skip this layer
      console.log('[BoundaryCorrector] _tryAddCorrections - no layerConfig found, skipping');
      return;
    }

    this._addCorrectionsForLayer(layer, layerConfig);
  }

  _addCorrectionsForLayer(baseLayer, layerConfig) {
    if (this.trackedLayers.has(baseLayer)) return;

    const { delLayer, addLayer } = createCorrectionLayers(this.pmtilesUrl, layerConfig);
    
    // Match z-index to base layer so correction renders right above it
    const baseZIndex = baseLayer.getZIndex() ?? 0;
    delLayer.setZIndex(baseZIndex);
    addLayer.setZIndex(baseZIndex);
    
    // Insert correction layers right after the base layer
    // Order: base -> del -> add (additions on top)
    const layers = this.map.getLayers();
    const baseIndex = layers.getArray().indexOf(baseLayer);
    if (baseIndex >= 0) {
      layers.insertAt(baseIndex + 1, delLayer);
      layers.insertAt(baseIndex + 2, addLayer);
    } else {
      this.map.addLayer(delLayer);
      this.map.addLayer(addLayer);
    }

    this.trackedLayers.set(baseLayer, {
      delLayer,
      addLayer,
      layerConfig,
    });
  }

  _removeCorrectionsForLayer(baseLayer) {
    const tracked = this.trackedLayers.get(baseLayer);
    if (!tracked) return;

    this.map.removeLayer(tracked.delLayer);
    this.map.removeLayer(tracked.addLayer);
    this.trackedLayers.delete(baseLayer);
  }
}

/**
 * Add India boundary corrections to an OpenLayers map.
 * Automatically detects tile layers and applies appropriate corrections.
 * 
 * @param {import('ol/Map').default} map - OpenLayers map instance
 * @param {Object} [options] - Configuration options
 * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to bundled file)
 * @param {LayerConfig|string} [options.layerConfig] - Layer configuration object or config ID string (optional, auto-detected from tile URLs)
 * @returns {BoundaryCorrector} BoundaryCorrector instance (call remove() to cleanup)
 * 
 * @example
 * // Auto-detect layer config from tile URLs
 * import { addBoundaryCorrector } from '@india-boundary-corrector/openlayers';
 * const corrector = addBoundaryCorrector(map);
 * 
 * @example
 * // With explicit config
 * import { osmCartoDark } from '@india-boundary-corrector/layer-configs';
 * const corrector = addBoundaryCorrector(map, { layerConfig: osmCartoDark });
 * 
 * @example
 * // With config ID string
 * const corrector = addBoundaryCorrector(map, { layerConfig: 'osm-carto' });
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
