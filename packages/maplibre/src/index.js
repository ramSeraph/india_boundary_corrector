//import { getPmtilesUrl, layers as pmtilesCorrectionLayers } from '@india-boundary-corrector/data';
import { getPmtilesUrl, layers as pmtilesCorrectionLayers } from '../../data/index.js';
//import { layerConfigs } from '@india-boundary-corrector/layer-configs';
import { layerConfigs } from '../../layer-configs/src/index.js';

const DEFAULT_ADD_LINE_COLOR = '#000000';
const DEFAULT_DEL_LINE_COLOR = '#f5f5f3'; // typical land color
const DEFAULT_LINE_WIDTH = 1.5;
const DEFAULT_ZOOM_THRESHOLD = 5;

/**
 * Resolve layer config from options
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
 * Find the first raster source in the map
 * @param {Object} map - MapLibre map instance
 * @returns {string|undefined}
 */
function findFirstRasterSource(map) {
  const style = map.getStyle();
  if (!style || !style.sources) return undefined;
  
  for (const [id, source] of Object.entries(style.sources)) {
    if (source.type === 'raster') {
      return id;
    }
  }
  return undefined;
}

/**
 * Find the first raster layer using a given source
 * @param {Object} map - MapLibre map instance
 * @param {string} sourceId
 * @returns {string|undefined}
 */
function findRasterLayerForSource(map, sourceId) {
  const style = map.getStyle();
  if (!style || !style.layers) return undefined;
  
  for (const layer of style.layers) {
    if (layer.type === 'raster' && layer.source === sourceId) {
      return layer.id;
    }
  }
  return undefined;
}

// TODO: should this be a single source for all corrections instead?
function getCorrectionSourceId(sourceId) {
  return `${sourceId}-corrections`;
}

function getCorrectionLayerIdMap(sourceId) {
  const layerIdMap = {};
  for (const layer of pmtilesCorrectionLayers) {
    layerIdMap[layer.id] = `${sourceId}-${layer.id}`;
  }
  return layerIdMap;
}

/**
 * Generate correction layer specifications
 * @param {string} pmtilesUrl
 * @param {Object} layerConfig
 * @param {string} sourceId
 * @returns {{ sources: Object, layers: Object[] }}
 */
function generateCorrectionLayers(pmtilesUrl, layerConfig, sourceId) {
  const {
    zoomThreshold = DEFAULT_ZOOM_THRESHOLD,
    osmAddLineColor = DEFAULT_ADD_LINE_COLOR,
    osmDelLineColor = DEFAULT_DEL_LINE_COLOR,
    neAddLineColor = DEFAULT_ADD_LINE_COLOR,
    neDelLineColor = DEFAULT_DEL_LINE_COLOR,
    osmAddLineWidth = DEFAULT_LINE_WIDTH,
    osmDelLineWidth = DEFAULT_LINE_WIDTH,
    neAddLineWidth = DEFAULT_LINE_WIDTH,
    neDelLineWidth = DEFAULT_LINE_WIDTH,
  } = layerConfig;

  const correctionSourceId = getCorrectionSourceId(sourceId);

  const sources = {
    [correctionSourceId]: {
      type: 'vector',
      url: `pmtiles://${pmtilesUrl}`,
    },
  };

  const layers = [];

  // Add layers (draw correct boundaries)
  layers.push({
    id: `${sourceId}-add-ne`,
    type: 'line',
    source: correctionSourceId,
    'source-layer': 'to-add-ne',
    maxzoom: zoomThreshold,
    paint: {
      'line-color': neAddLineColor,
      'line-width': neAddLineWidth,
    },
  });

  layers.push({
    id: `${sourceId}-add-osm`,
    type: 'line',
    source: correctionSourceId,
    'source-layer': 'to-add-osm',
    minzoom: zoomThreshold,
    paint: {
      'line-color': osmAddLineColor,
      'line-width': osmAddLineWidth,
    },
  });

  // Delete layers (mask unwanted boundaries with background-colored lines)
  layers.push({
    id: `${sourceId}-del-ne`,
    type: 'line',
    source: correctionSourceId,
    'source-layer': 'to-del-ne',
    maxzoom: zoomThreshold,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': neDelLineColor,
      'line-width': neDelLineWidth + 1,
    },
  });

  layers.push({
    id: `${sourceId}-del-osm`,
    type: 'line',
    source: correctionSourceId,
    'source-layer': 'to-del-osm',
    minzoom: zoomThreshold,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': osmDelLineColor,
      'line-width': osmDelLineWidth + 1,
    },
  });

  return { sources, layers };
}

/**
 * India boundary corrector for MapLibre GL JS maps.
 * Automatically tracks raster sources/layers and adds correction overlays.
 */
export class BoundaryCorrector {
  /**
   * @param {Object} map - MapLibre map instance
   * @param {Object} [options] - Configuration options
   * @param {string} [options.sourceId] - Specific source ID to add corrections for (skips auto-detection)
   * @param {string} [options.layerId] - Specific layer ID to add corrections above
   * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to CDN)
   * @param {Object|string} [options.layerConfig] - Layer configuration object or config name string
   */
  constructor(map, options = {}) {
    this.map = map;
    this.pmtilesUrl = options.pmtilesUrl ?? getPmtilesUrl();
    this.providedSourceId = options.sourceId;
    this.providedLayerId = options.layerId;
    this.layerConfig = typeof options.layerConfig === 'string' 
      ? layerConfigs.get(options.layerConfig) 
      : options.layerConfig;
    
    /** @type {Map<string, { layerId: string, correctionSourceId: string, correctionLayerIds: string[], layerConfig: Object }>} */
    this.trackedSources = new Map();
    
    this._onStyleData = this._handleStyleData.bind(this);
    this._initialized = false;
  }

  /**
   * Initialize the boundary corrector and start tracking.
   * @returns {this}
   */
  init() {
    if (this._initialized) return this;
    
    this._initialized = true;
    this._handleStyleData();
    this.map.on('styledata', this._onStyleData);
    
    return this;
  }

  /**
   * Remove all corrections and cleanup listeners.
   */
  remove() {
    if (!this._initialized) return;
    
    this.map.off('styledata', this._onStyleData);
    
    for (const sourceId of this.trackedSources.keys()) {
      this._removeCorrectionsForSource(sourceId);
    }
    
    this._initialized = false;
  }

  /**
   * Get the tracked sources map.
   * @returns {Map<string, Object>}
   */
  getTrackedSources() {
    return new Map(this.trackedSources);
  }

  /**
   * Check if corrections are active for a specific source.
   * @param {string} sourceId
   * @returns {boolean}
   */
  hasCorrections(sourceId) {
    return this.trackedSources.has(sourceId);
  }

  _handleStyleData() {
    if (this.providedSourceId) {
      this._handleSpecificSource();
    } else {
      this._scanAndAddCorrections();
    }
  }

  _handleSpecificSource() {
    let layerId = this.providedLayerId;
    if (!layerId) {
      layerId = findRasterLayerForSource(this.map, this.providedSourceId);
    }
    
    if (!layerId || !this.map.getLayer(layerId)) {
      this._removeCorrectionsForSource(this.providedSourceId);
      return;
    }

    if (this.trackedSources.has(this.providedSourceId)) return;

    const source = this.map.getSource(this.providedSourceId);
    const tiles = source && source.type === 'raster' ? source.tiles : [];

    const layerConfig = this.layerConfig ?? resolveLayerConfig(undefined, tiles || []);
    if (!layerConfig) {
      console.error('Could not resolve layer config. Provide layerConfig option.');
      return;
    }

    this._addCorrectionsForLayer(this.providedSourceId, layerId, layerConfig);
  }

  _scanAndAddCorrections() {
    const style = this.map.getStyle();
    if (!style) return;

    for (const layer of style.layers || []) {
      if (layer.type !== 'raster') continue;
      
      const sourceId = layer.source;
      if (!sourceId || this.trackedSources.has(sourceId)) continue;

      const source = this.map.getSource(sourceId);
      if (!source || source.type !== 'raster') continue;

      const tiles = source.tiles;
      if (!tiles || tiles.length === 0) continue;

      const layerConfig = this.layerConfig ?? resolveLayerConfig(undefined, tiles);
      if (!layerConfig) continue;

      this._addCorrectionsForLayer(sourceId, layer.id, layerConfig);
    }

    // Remove corrections for sources that no longer exist
    for (const [sourceId, tracked] of this.trackedSources) {
      if (!this.map.getLayer(tracked.layerId)) {
        this._removeCorrectionsForSource(sourceId);
      }
    }
  }

  _addCorrectionsForLayer(sourceId, layerId, layerConfig) {
    if (this.trackedSources.has(sourceId)) return;

    const { sources, layers } = generateCorrectionLayers(this.pmtilesUrl, layerConfig, sourceId);
    const correctionSourceId = getCorrectionSourceId(sourceId);
    const correctionLayerIds = layers.map(l => l.id);

    for (const [id, source] of Object.entries(sources)) {
      if (!this.map.getSource(id)) {
        this.map.addSource(id, source);
      }
    }

    for (const layer of layers) {
      if (!this.map.getLayer(layer.id)) {
        const style = this.map.getStyle();
        const layerIndex = style?.layers?.findIndex(l => l.id === layerId) ?? -1;
        const beforeLayerId = layerIndex >= 0 && style?.layers?.[layerIndex + 1]?.id;
        this.map.addLayer(layer, beforeLayerId || undefined);
      }
    }

    this.trackedSources.set(sourceId, {
      layerId,
      correctionSourceId,
      correctionLayerIds,
      layerConfig,
    });
  }

  _removeCorrectionsForSource(sourceId) {
    const tracked = this.trackedSources.get(sourceId);
    if (!tracked) return;

    for (const layerId of tracked.correctionLayerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }
    if (this.map.getSource(tracked.correctionSourceId)) {
      this.map.removeSource(tracked.correctionSourceId);
    }

    this.trackedSources.delete(sourceId);
  }
}

/**
 * Get boundary corrector configuration without adding to map.
 * Use this for manual control over when/how layers are added.
 * 
 * @param {Object} map - MapLibre map instance (needed to read source tiles for auto-detection)
 * @param {Object} [options] - Configuration options
 * @param {string} [options.sourceId] - ID of the raster source (required if layerConfig not provided)
 * @param {string} [options.layerId] - ID of the raster layer (optional, auto-detected from sourceId)
 * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to CDN)
 * @param {Object|string} [options.layerConfig] - Layer configuration object or config name string
 * @returns {Object|null} Configuration object with sources and layers, or null if config cannot be resolved
 */
export function getBoundaryCorrectorConfig(map, options = {}) {
  const { sourceId: providedSourceId, layerId: providedLayerId, pmtilesUrl: providedPmtilesUrl, layerConfig: providedLayerConfig } = options;

  const pmtilesUrl = providedPmtilesUrl ?? getPmtilesUrl();

  const sourceId = providedSourceId ?? findFirstRasterSource(map);
  if (!sourceId) {
    console.error('No raster source found. Provide sourceId explicitly or add a raster source first.');
    return null;
  }

  let tiles;
  const source = map.getSource(sourceId);
  if (source && source.type === 'raster') {
    tiles = source.tiles;
  }

  const layerConfig = resolveLayerConfig(providedLayerConfig, tiles);
  if (!layerConfig) {
    console.error('Could not resolve layer config. Provide layerConfig or use a supported tile provider.');
    return null;
  }
  
  const resolvedLayerId = providedLayerId ?? findRasterLayerForSource(map, sourceId);
  if (!resolvedLayerId) {
    console.error(`Could not find raster layer for source "${sourceId}". Provide layerId explicitly.`);
    return null;
  }

  const { sources, layers } = generateCorrectionLayers(pmtilesUrl, layerConfig, sourceId);

  return {
    sources,
    layers,
    pmtilesUrl,
    layerConfig,
    sourceId,
    layerId: resolvedLayerId,
  };
}

/**
 * Add India boundary corrections that automatically track raster sources/layers.
 * 
 * @param {Object} map - MapLibre map instance
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.sourceId] - Specific source ID to add corrections for (skips auto-detection)
 * @param {string} [options.layerId] - Specific layer ID to add corrections above
 * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to CDN)
 * @param {Object|string} [options.layerConfig] - Layer configuration object or config name string
 * @returns {BoundaryCorrector} BoundaryCorrector instance (call remove() to cleanup)
 */
export function addBoundaryCorrector(map, options = {}) {
  const corrector = new BoundaryCorrector(map, options);
  return corrector.init();
}

/**
 * Remove boundary corrector layers for a specific source.
 * @param {Object} map - MapLibre map instance
 * @param {string} sourceId
 */
export function removeBoundaryCorrector(map, sourceId) {
  const layerIdMap = getCorrectionLayerIdMap(sourceId);
  const layerIds = Object.values(layerIdMap);
  const correctionSourceId = getCorrectionSourceId(sourceId);
  
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }
  if (map.getSource(correctionSourceId)) {
    map.removeSource(correctionSourceId);
  }
}
