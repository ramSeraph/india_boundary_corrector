import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Re-export for convenience
export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

const PROTOCOL_PREFIX = 'ibc';

/**
 * Parse an ibc:// URL.
 * Format: ibc://[configId@]originalUrl
 * Examples:
 *   ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png
 *   ibc://osm-carto@https://tile.openstreetmap.org/{z}/{x}/{y}.png
 * 
 * @param {string} url - The full URL with ibc:// prefix
 * @returns {{ configId: string|null, tileUrl: string, z: number, x: number, y: number }}
 */
function parseCorrectionsUrl(url) {
  // Remove protocol prefix
  const withoutProtocol = url.replace(`${PROTOCOL_PREFIX}://`, '');
  
  // Check for configId@url format
  let configId = null;
  let tileUrl = withoutProtocol;
  
  const atIndex = withoutProtocol.indexOf('@');
  if (atIndex > 0 && atIndex < withoutProtocol.indexOf('/')) {
    // Has configId prefix
    configId = withoutProtocol.substring(0, atIndex);
    tileUrl = withoutProtocol.substring(atIndex + 1);
  }
  
  // Extract z, x, y from the URL (assuming standard {z}/{x}/{y} pattern in the path)
  // The URL has already been templated by MapLibre, so we need to parse actual numbers
  const urlObj = new URL(tileUrl);
  const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
  
  // Find z/x/y pattern - typically last 3 numeric segments
  let z, x, y;
  for (let i = pathParts.length - 1; i >= 2; i--) {
    const yPart = pathParts[i].replace(/\.[^.]+$/, ''); // Remove extension
    const xPart = pathParts[i - 1];
    const zPart = pathParts[i - 2];
    
    if (/^\d+$/.test(zPart) && /^\d+$/.test(xPart) && /^\d+$/.test(yPart)) {
      z = parseInt(zPart, 10);
      x = parseInt(xPart, 10);
      y = parseInt(yPart, 10);
      break;
    }
  }
  
  return { configId, tileUrl, z, x, y };
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
 * @returns {Promise<{data: ArrayBuffer}>}
 */
async function fetchAndFixTile(tileUrl, z, x, y, tileFixer, layerConfig, tileSize, options = {}) {
  try {
    // Fetch tile and corrections in parallel
    const [tileResponse, corrections] = await Promise.all([
      fetch(tileUrl, { signal: options.signal }),
      tileFixer.getCorrections(z, x, y)
    ]);

    if (!tileResponse.ok) {
      throw new Error(`Tile fetch failed: ${tileResponse.status}`);
    }

    const tileData = await tileResponse.arrayBuffer();

    // Check if there are any corrections to apply
    const hasCorrections = layerConfig && Object.values(corrections).some(arr => arr.length > 0);

    if (hasCorrections) {
      // Apply corrections
      const fixedTileData = await tileFixer.fixTile(
        corrections,
        tileData,
        layerConfig,
        z,
        tileSize
      );
      return { data: fixedTileData };
    } else {
      // No corrections needed
      return { data: tileData };
    }
  } catch (err) {
    // Re-throw abort errors as-is
    if (err.name === 'AbortError') {
      throw err;
    }
    // Wrap other errors with context
    const error = new Error(`Error applying corrections: ${err.message}`);
    error.originalError = err;
    throw error;
  }
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
    this._registry = new LayerConfigRegistry();
    
    // Copy all global configs
    for (const id of layerConfigs.getAvailableIds()) {
      this._registry.register(layerConfigs.get(id));
    }
    
    this._loadFn = this._createLoadFunction();
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
      const { configId, tileUrl, z, x, y } = parseCorrectionsUrl(params.url);
      
      // Resolve layer config
      let layerConfig;
      if (configId) {
        layerConfig = self._registry.get(configId);
      } else {
        layerConfig = self._registry.detectFromUrls([tileUrl]);
      }
      
      return fetchAndFixTile(
        tileUrl,
        z, 
        x,
        y,
        self._tileFixer,
        layerConfig,
        self._tileSize,
        { signal: abortController?.signal }
      );
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
