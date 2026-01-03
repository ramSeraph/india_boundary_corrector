import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Re-export for convenience
export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

const PROTOCOL_PREFIX = 'ibc';

/**
 * Extract tile coordinates from a URL using generic z/x/y pattern matching.
 * Handles standard tile URL patterns including retina suffixes (@2x, @3x, etc.).
 * 
 * @param {string} url - The tile URL to parse
 * @returns {{ z: number, x: number, y: number } | null} Parsed coordinates or null if not found
 */
function extractTileCoordsFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
    
    // Find z/x/y pattern - typically last 3 numeric segments
    for (let i = pathParts.length - 1; i >= 2; i--) {
      // Remove extension and retina suffix (e.g., "5@2x.png" -> "5")
      const yPart = pathParts[i].replace(/(@\d+x)?\.[^.]+$/, '');
      const xPart = pathParts[i - 1];
      const zPart = pathParts[i - 2];
      
      if (/^\d+$/.test(zPart) && /^\d+$/.test(xPart) && /^\d+$/.test(yPart)) {
        return {
          z: parseInt(zPart, 10),
          x: parseInt(xPart, 10),
          y: parseInt(yPart, 10)
        };
      }
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Parse an ibc:// URL.
 * Format: ibc://[configId@]originalUrl
 * Examples:
 *   ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png
 *   ibc://osm-carto@https://tile.openstreetmap.org/{z}/{x}/{y}.png
 * 
 * @param {string} url - The full URL with ibc:// prefix
 * @param {import('@india-boundary-corrector/layer-configs').LayerConfigRegistry} registry - Registry to use for parsing
 * @returns {{ configId: string|null, tileUrl: string, z: number|undefined, x: number|undefined, y: number|undefined }}
 */
function parseCorrectionsUrl(url, registry) {
  // Remove protocol prefix
  const withoutProtocol = url.replace(`${PROTOCOL_PREFIX}://`, '');
  
  // Check for configId@url format
  let configId = null;
  let tileUrl = withoutProtocol;
  
  const atIndex = withoutProtocol.indexOf('@');
  const slashIndex = withoutProtocol.indexOf('/');
  // Config ID exists if @ comes before first / (or if there's no /)
  if (atIndex > 0 && (slashIndex === -1 || atIndex < slashIndex)) {
    // Has configId prefix
    configId = withoutProtocol.substring(0, atIndex);
    tileUrl = withoutProtocol.substring(atIndex + 1);
  }
  
  // If configId is explicit, use generic parsing (URL may not match config's patterns)
  // Otherwise, use registry detection only (unregistered URLs won't get corrections)
  let coords = null;
  if (configId) {
    coords = extractTileCoordsFromUrl(tileUrl);
  } else {
    const parsed = registry.parseTileUrl(tileUrl);
    coords = parsed?.coords ?? null;
  }
  
  return { 
    configId, 
    tileUrl, 
    z: coords?.z, 
    x: coords?.x, 
    y: coords?.y 
  };
}

/**
 * Fetch and fix a tile for MapLibre protocol.
 * Extracted for testability.
 * @param {string} tileUrl - URL of the raster tile
 * @param {number} z - Zoom level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {TileFixer} tileFixer - TileFixer instance
 * @param {Object} layerConfig - Layer configuration (can be null)
 * @param {number} tileSize - Tile size in pixels
 * @param {Object} [options] - Fetch options
 * @param {AbortSignal} [options.signal] - Abort signal
 * @returns {Promise<{data: ArrayBuffer, correctionsFailed: boolean, correctionsError: Error|null}>}
 */
async function fetchAndFixTile(tileUrl, z, x, y, tileFixer, layerConfig, tileSize, options = {}) {
  const { data, correctionsFailed, correctionsError } = await tileFixer.fetchAndFixTile(
    tileUrl, z, x, y, layerConfig, { tileSize, signal: options.signal }
  );
  return { data, correctionsFailed, correctionsError };
}

/**
 * India boundary corrections protocol for MapLibre GL.
 * 
 * Usage:
 *   const protocol = new CorrectionProtocol();
 *   protocol.register(maplibregl);
 * 
 *   // In your style:
 *   tiles: ['ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png']
 *   // Or with explicit config:
 *   tiles: ['ibc://osm-carto@https://tile.openstreetmap.org/{z}/{x}/{y}.png']
 */
export class CorrectionProtocol {
  /**
   * @param {Object} [options]
   * @param {string} [options.pmtilesUrl] - URL to PMTiles file (defaults to CDN)
   * @param {number} [options.tileSize=256] - Tile size in pixels
   */
  constructor(options = {}) {
    this._pmtilesUrl = options.pmtilesUrl ?? getPmtilesUrl();
    this._tileSize = options.tileSize ?? 256;
    this._tileFixer = new TileFixer(this._pmtilesUrl);
    this._registry = layerConfigs.createMergedRegistry();
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    
    this._loadFn = this._createLoadFunction();
  }

  /**
   * Add a listener for an event.
   * @param {'correctionerror'} event - Event name
   * @param {Function} listener - Callback function receiving event data
   * @returns {this}
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);
    return this;
  }

  /**
   * Remove an event listener.
   * @param {'correctionerror'} event - Event name
   * @param {Function} listener - Callback to remove
   * @returns {this}
   */
  off(event, listener) {
    this._listeners.get(event)?.delete(listener);
    return this;
  }

  /**
   * Emit an event to all listeners.
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _emit(event, data) {
    this._listeners.get(event)?.forEach(fn => fn(data));
  }

  /**
   * Add a custom layer config to the registry.
   * @param {Object} layerConfig - LayerConfig to add
   * @returns {this}
   */
  addLayerConfig(layerConfig) {
    this._registry.register(layerConfig);
    return this;
  }

  /**
   * Get the registry.
   * @returns {LayerConfigRegistry}
   */
  getRegistry() {
    return this._registry;
  }

  /**
   * Get the TileFixer instance.
   * @returns {TileFixer}
   */
  getTileFixer() {
    return this._tileFixer;
  }

  /**
   * Register the protocol with MapLibre GL.
   * @param {typeof import('maplibre-gl')} maplibregl - MapLibre GL namespace
   * @returns {this}
   */
  register(maplibregl) {
    maplibregl.addProtocol(PROTOCOL_PREFIX, this._loadFn);
    return this;
  }

  /**
   * Unregister the protocol from MapLibre GL.
   * @param {typeof import('maplibre-gl')} maplibregl - MapLibre GL namespace
   * @returns {this}
   */
  unregister(maplibregl) {
    maplibregl.removeProtocol(PROTOCOL_PREFIX);
    return this;
  }

  /**
   * Create the protocol load function.
   * @returns {Function}
   * @private
   */
  _createLoadFunction() {
    const self = this;
    
    return async (params, abortController) => {
      const { configId, tileUrl, z, x, y } = parseCorrectionsUrl(params.url, self._registry);
      
      // Validate parsed coordinates
      if (z === undefined || x === undefined || y === undefined) {
        console.warn(`[CorrectionProtocol] Could not parse tile coordinates from URL: ${params.url}, falling back to original`);
        const response = await fetch(tileUrl, { signal: abortController?.signal });
        return { data: await response.arrayBuffer() };
      }
      
      // Resolve layer config
      let layerConfig;
      if (configId) {
        layerConfig = self._registry.get(configId);
      } else {
        layerConfig = self._registry.detectFromTileUrls([tileUrl]);
      }
      
      try {
        const result = await fetchAndFixTile(
          tileUrl,
          z, 
          x,
          y,
          self._tileFixer,
          layerConfig,
          self._tileSize,
          { signal: abortController?.signal }
        );
        
        if (result.correctionsFailed && result.correctionsError?.name !== 'AbortError') {
          console.warn('[CorrectionProtocol] Corrections fetch failed:', result.correctionsError);
          self._emit('correctionerror', { error: result.correctionsError, coords: { z, x, y }, tileUrl });
        }
        
        return { data: result.data };
      } catch (err) {
        // Don't catch AbortError - let it propagate
        if (err.name === 'AbortError') {
          throw err;
        }
        // Re-throw other errors (tile fetch failures, processing errors)
        // correctionerror is only for PMTiles/correction failures (handled via correctionsFailed)
        throw err;
      }
    };
  }
}

/**
 * Create and register a correction protocol with MapLibre GL.
 * 
 * @param {typeof import('maplibre-gl')} maplibregl - MapLibre GL namespace
 * @param {Object} [options] - Protocol options
 * @param {string} [options.pmtilesUrl] - URL to PMTiles file
 * @param {number} [options.tileSize=256] - Tile size in pixels
 * @returns {CorrectionProtocol}
 * 
 * @example
 * import maplibregl from 'maplibre-gl';
 * import { registerCorrectionProtocol } from '@india-boundary-corrector/maplibre-protocol';
 * 
 * const protocol = registerCorrectionProtocol(maplibregl);
 * 
 * // Use in style:
 * const map = new maplibregl.Map({
 *   container: 'map',
 *   style: {
 *     sources: {
 *       osm: {
 *         type: 'raster',
 *         tiles: ['ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
 *         tileSize: 256
 *       }
 *     },
 *     layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
 *   }
 * });
 */
export function registerCorrectionProtocol(maplibregl, options = {}) {
  const protocol = new CorrectionProtocol(options);
  return protocol.register(maplibregl);
}

// Export for testing
export { parseCorrectionsUrl, fetchAndFixTile };
