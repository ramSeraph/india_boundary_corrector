import { leafletLayer, LineSymbolizer } from 'protomaps-leaflet';
import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';

/**
 * Custom dashed line symbolizer for protomaps-leaflet
 * Uses Canvas setLineDash() for dotted/dashed lines with solid halo
 */
class DashedLineSymbolizer {
  constructor(options) {
    this.color = options.color || '#000';
    this.width = options.width || 1;
    this.dashArray = options.dashArray || [];
    this.lineCap = options.lineCap || 'butt';
    this.lineJoin = options.lineJoin || 'miter';
    this.haloRatio = options.haloRatio || 0;
    this.haloAlpha = options.haloAlpha || 0;
  }

  draw(context, geom, z, feature) {
    const width = typeof this.width === 'function' ? this.width(z, feature) : this.width;
    if (width <= 0) return;

    const haloWidth = width * this.haloRatio;
    
    // Scale dash array proportionally with line width
    const scaledDashArray = this.dashArray.map(v => v * width);

    context.save();
    context.lineCap = this.lineCap;
    context.lineJoin = this.lineJoin;

    // Draw solid halo (no dash) if haloRatio > 0
    if (this.haloRatio > 0 && this.haloAlpha > 0) {
      context.setLineDash([]);
      context.strokeStyle = this.color;
      context.lineWidth = width + haloWidth;
      context.globalAlpha = this.haloAlpha;
      context.beginPath();
      for (const line of geom) {
        for (let i = 0; i < line.length; i++) {
          const pt = line[i];
          if (i === 0) context.moveTo(pt.x, pt.y);
          else context.lineTo(pt.x, pt.y);
        }
      }
      context.stroke();
    }

    // Draw dashed main line
    context.setLineDash(scaledDashArray);
    context.globalAlpha = 1.0;
    context.strokeStyle = this.color;
    context.lineWidth = width;
    context.beginPath();
    for (const line of geom) {
      for (let i = 0; i < line.length; i++) {
        const pt = line[i];
        if (i === 0) context.moveTo(pt.x, pt.y);
        else context.lineTo(pt.x, pt.y);
      }
    }
    context.stroke();

    context.restore();
  }
}

/**
 * Check if a layer is a tile layer with a URL
 * @param {L.Layer} layer
 * @returns {boolean}
 */
function isTileLayer(layer) {
  return layer && typeof layer._url === 'string';
}

/**
 * Try to match a tile layer against registered configs
 * @param {L.TileLayer} layer
 * @returns {LayerConfig|null}
 */
function matchLayerConfig(layer) {
  if (!isTileLayer(layer)) {
    return null;
  }
  const config = layerConfigs.detectFromUrls([layer._url]);
  return config || null;
}

/**
 * Find all matching tile layers from the map based on registered layer configs
 * @param {L.Map} map - Leaflet map instance
 * @returns {Array<{ layer: L.TileLayer, config: LayerConfig }>}
 */
function findMatchingTileLayers(map) {
  const matches = [];

  map.eachLayer((layer) => {
    if (!isTileLayer(layer)) return;
    
    const config = matchLayerConfig(layer);
    if (config) {
      matches.push({ layer, config });
    }
  });

  return matches;
}

/**
 * Generate protomaps-leaflet paint rules from a LayerConfig
 * @param {LayerConfig} layerConfig
 * @returns {Array<PaintRule>}
 */
function generatePaintRules(layerConfig) {
  const {
    startZoom = 0,
    zoomThreshold = 5,
    osmAddLineColor,
    osmDelLineColor,
    neAddLineColor,
    neDelLineColor,
    addLineDashed = false,
    addLineDashArray = [],
    addLineHaloRatio = 0,
    addLineHaloAlpha = 0,
    lineWidthMultiplier = 1.0,
  } = layerConfig;

  // Zoom-based width functions: zoom / 4 for add, zoom / 2 for del, with minimum widths
  const addWidthFn = (z) => Math.max(0.5, (z / 4) * lineWidthMultiplier);
  const delWidthFn = (z) => Math.max(1, (z / 2) * lineWidthMultiplier);

  // Create appropriate symbolizer for addition lines
  const createAddSymbolizer = (color) => {
    if (addLineDashed) {
      return new DashedLineSymbolizer({
        color,
        width: addWidthFn,
        dashArray: addLineDashArray,
        haloRatio: addLineHaloRatio,
        haloAlpha: addLineHaloAlpha,
      });
    }
    return new LineSymbolizer({
      color,
      width: addWidthFn,
    });
  };

  const rules = [];

  // Delete NE boundaries (startZoom <= zoom < threshold) - draw background-colored lines to mask
  // Note: protomaps-leaflet maxzoom is inclusive, so we use threshold - 0.1 to exclude threshold
  rules.push({
    dataLayer: 'to-del-ne',
    minzoom: startZoom,
    maxzoom: zoomThreshold - 0.1,
    symbolizer: new LineSymbolizer({
      color: neDelLineColor,
      width: delWidthFn,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  });
  // Add NE boundaries (startZoom <= zoom < threshold)
  rules.push({
    dataLayer: 'to-add-ne',
    minzoom: startZoom,
    maxzoom: zoomThreshold - 0.1,
    symbolizer: createAddSymbolizer(neAddLineColor),
  });

  // Delete OSM boundaries (zoom >= zoomThreshold)
  rules.push({
    dataLayer: 'to-del-osm',
    minzoom: zoomThreshold,
    symbolizer: new LineSymbolizer({
      color: osmDelLineColor,
      width: delWidthFn,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  });
  // Add OSM boundaries (zoom >= zoomThreshold)
  rules.push({
    dataLayer: 'to-add-osm',
    minzoom: zoomThreshold,
    symbolizer: createAddSymbolizer(osmAddLineColor),
  });

  return rules;
}

/**
 * Create a correction layer for a given config
 * @param {string} pmtilesUrl
 * @param {LayerConfig} layerConfig
 * @returns {L.Layer}
 */
function createCorrectionLayer(pmtilesUrl, layerConfig) {
  const paintRules = generatePaintRules(layerConfig);
  
  // Note: Custom panes cause rendering issues with protomaps-leaflet,
  // so we use the default tilePane
  const layer = leafletLayer({
    url: pmtilesUrl,
    paintRules: paintRules,
    labelRules: [],
    attribution: '',
    maxDataZoom: 14, // PMTiles max zoom, enables overzooming beyond this
  });
  
  return layer;
}

/**
 * India boundary corrector for Leaflet maps using protomaps-leaflet.
 * Renders boundary corrections as a vector tile overlay positioned just above each tile layer.
 * Automatically tracks layer add/remove events to manage corrections dynamically.
 * Creates a unique pane per tile layer to maintain proper z-ordering with multiple base layers.
 */
export class BoundaryCorrector {
  /**
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} [options] - Configuration options
   * @param {L.TileLayer} [options.tileLayer] - Specific tile layer to add corrections for (auto-detect if not provided)
   * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to CDN)
   * @param {LayerConfig|string} [options.layerConfig] - Layer configuration object or config ID string
   */
  constructor(map, options = {}) {
    this.map = map;
    this.pmtilesUrl = options.pmtilesUrl ?? getPmtilesUrl();
    this.providedTileLayer = options.tileLayer;
    this.providedLayerConfig = typeof options.layerConfig === 'string'
      ? layerConfigs.get(options.layerConfig)
      : options.layerConfig;
    
    /** @type {Map<L.TileLayer, { config: LayerConfig, correctionLayer: L.Layer }>} */
    this.trackedLayers = new Map();
    
    this._onLayerAdd = this._handleLayerAdd.bind(this);
    this._onLayerRemove = this._handleLayerRemove.bind(this);
    this._initialized = false;
  }

  /**
   * Initialize the boundary corrector and add correction layer to map.
   * @returns {this}
   */
  init() {
    if (this._initialized) return this;


    // If a specific tile layer was provided, only track that one
    if (this.providedTileLayer) {
      const config = this.providedLayerConfig || matchLayerConfig(this.providedTileLayer);
      if (config) {
        this._addCorrectionForLayer(this.providedTileLayer, config);
      } else {
        console.warn('[india-boundary-corrector] Could not resolve layer config for provided tile layer.');
      }
    } else {
      // Auto-detect: scan existing layers
      const matches = findMatchingTileLayers(this.map);
      for (const { layer, config } of matches) {
        const effectiveConfig = this.providedLayerConfig || config;
        this._addCorrectionForLayer(layer, effectiveConfig);
      }
    }

    // Start listening for layer events (only if no specific tile layer provided)
    if (!this.providedTileLayer) {
      this.map.on('layeradd', this._onLayerAdd);
      this.map.on('layerremove', this._onLayerRemove);
    }

    this._initialized = true;
    return this;
  }

  /**
   * Remove the correction layer from the map and stop tracking.
   */
  remove() {
    if (!this._initialized) return;

    // Stop listening for events
    this.map.off('layeradd', this._onLayerAdd);
    this.map.off('layerremove', this._onLayerRemove);

    // Remove all correction layers
    for (const [tileLayer, tracked] of this.trackedLayers) {
      this.map.removeLayer(tracked.correctionLayer);
    }
    this.trackedLayers.clear();

    this._initialized = false;
  }

  /**
   * Handle layer add event
   * @param {L.LayerEvent} e
   */
  _handleLayerAdd(e) {
    const layer = e.layer;
    
    
    // Skip if this is our own correction layer
    if (layer.paintRules) {
      return;
    }
    
    // Skip if already tracking this layer
    if (this.trackedLayers.has(layer)) {
      return;
    }
    
    // Check if it's a matching tile layer
    const config = this.providedLayerConfig || matchLayerConfig(layer);
    if (config) {
      this._addCorrectionForLayer(layer, config);
    }
  }

  /**
   * Handle layer remove event
   * @param {L.LayerEvent} e
   */
  _handleLayerRemove(e) {
    const layer = e.layer;
    
    
    const tracked = this.trackedLayers.get(layer);
    if (tracked) {
      this.map.removeLayer(tracked.correctionLayer);
      this.trackedLayers.delete(layer);
    }
  }

  /**
   * Add correction layer for a tile layer
   * @param {L.TileLayer} tileLayer
   * @param {LayerConfig} config
   */
  _addCorrectionForLayer(tileLayer, config) {
    if (this.trackedLayers.has(tileLayer)) return;


    const correctionLayer = createCorrectionLayer(
      this.pmtilesUrl,
      config
    );

    correctionLayer.addTo(this.map);

    this.trackedLayers.set(tileLayer, {
      config,
      correctionLayer,
    });
  }

  /**
   * Get all tracked tile layers and their corrections.
   * @returns {Map<L.TileLayer, { config: LayerConfig, correctionLayer: L.Layer }>}
   */
  getTrackedLayers() {
    return new Map(this.trackedLayers);
  }

  /**
   * Check if corrections are active for a specific tile layer.
   * @param {L.TileLayer} tileLayer
   * @returns {boolean}
   */
  hasCorrections(tileLayer) {
    return this.trackedLayers.has(tileLayer);
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
 * Add India boundary corrections to a Leaflet map.
 * Automatically tracks layeradd/layerremove events to manage corrections dynamically.
 * 
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} [options] - Configuration options
 * @param {L.TileLayer} [options.tileLayer] - Specific tile layer to add corrections for (disables auto-tracking)
 * @param {string} [options.pmtilesUrl] - URL to the PMTiles file (optional, defaults to bundled file)
 * @param {LayerConfig|string} [options.layerConfig] - Layer configuration object or config ID string
 * @returns {BoundaryCorrector} BoundaryCorrector instance (call remove() to cleanup)
 * 
 * @example
 * // Auto-detect and track tile layers dynamically
 * const corrector = addBoundaryCorrector(map);
 * 
 * @example
 * // Track a specific tile layer only (no event tracking)
 * const corrector = addBoundaryCorrector(map, { tileLayer: myTileLayer });
 * 
 * @example
 * // Use explicit config for all matched layers
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
export { layerConfigs } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';
