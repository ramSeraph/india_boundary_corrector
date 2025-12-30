import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';
import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Re-export for convenience
export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Create a merged registry with global configs and extra configs
 * @param {LayerConfig[]} extraLayerConfigs
 * @returns {LayerConfigRegistry}
 */
function createMergedRegistry(extraLayerConfigs) {
  const registry = new LayerConfigRegistry();
  
  for (const id of layerConfigs.getAvailableIds()) {
    registry.register(layerConfigs.get(id));
  }
  
  if (extraLayerConfigs && extraLayerConfigs.length > 0) {
    for (const config of extraLayerConfigs) {
      registry.register(config);
    }
  }
  
  return registry;
}

/**
 * Handle tile fetching and correction application logic.
 * This method is extracted for testability.
 * @param {string} src - URL of the raster tile
 * @param {number} z - Zoom level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {TileFixer} tileFixer - TileFixer instance
 * @param {Object} layerConfig - Layer configuration
 * @param {number} tileSize - Tile size in pixels
 * @returns {Promise<{blob: Blob, wasFixed: boolean}>}
 */
async function fetchAndFixTile(src, z, x, y, tileFixer, layerConfig, tileSize) {
  try {
    // Fetch both raster tile and corrections in parallel
    const [tileResult, correctionsResult] = await Promise.allSettled([
      fetch(src, { mode: 'cors' }).then(r => {
        if (!r.ok) throw new Error(`Tile fetch failed: ${r.status}`);
        return r.arrayBuffer();
      }),
      tileFixer.getCorrections(z, x, y)
    ]);

    // Handle various failure scenarios
    const tileData = tileResult.status === 'fulfilled' ? tileResult.value : null;
    const corrections = correctionsResult.status === 'fulfilled' ? correctionsResult.value : {};

    // Case 1: Both failed
    if (!tileData && (!corrections || Object.keys(corrections).length === 0)) {
      const error = new Error('Both tile and corrections failed to load');
      error.tileError = tileResult.reason;
      error.correctionsError = correctionsResult.reason;
      throw error;
    }

    // Case 2: Tile failed but corrections available - return error (can't fix non-existent tile)
    if (!tileData) {
      throw tileResult.reason || new Error('Tile fetch failed');
    }

    // Case 3: Tile succeeded but corrections failed or empty - return original tile
    const hasCorrections = corrections && Object.values(corrections).some(arr => arr && arr.length > 0);
    if (!hasCorrections) {
      const blob = new Blob([tileData]);
      return { blob, wasFixed: false };
    }

    // Case 4: Both succeeded - apply corrections
    const fixedTileData = await tileFixer.fixTile(
      corrections,
      tileData,
      layerConfig,
      z,
      tileSize
    );

    const blob = new Blob([fixedTileData], { type: 'image/png' });
    return { blob, wasFixed: true };
  } catch (err) {
    // Re-throw with context
    if (!err.message) {
      err.message = 'Error in tile fetch and fix';
    }
    throw err;
  }
}

/**
 * Create a custom tileLoadFunction that applies boundary corrections.
 * @param {TileFixer} tileFixer - The TileFixer instance
 * @param {Object} layerConfig - The layer configuration
 * @param {number} tileSize - Tile size in pixels
 * @returns {Function} Custom tile load function
 */
function createCorrectedTileLoadFunction(tileFixer, layerConfig, tileSize) {
  return async function(imageTile, src) {
    const tileCoord = imageTile.getTileCoord();
    const z = tileCoord[0];
    const x = tileCoord[1];
    const y = tileCoord[2];

    try {
      const { blob } = await fetchAndFixTile(src, z, x, y, tileFixer, layerConfig, tileSize);

      const image = imageTile.getImage();
      
      // Check if image is a canvas (OffscreenCanvas) or HTMLImageElement
      if (typeof image.getContext === 'function') {
        // OffscreenCanvas path
        const imageBitmap = await createImageBitmap(blob);
        image.width = imageBitmap.width;
        image.height = imageBitmap.height;
        const ctx = image.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0);
        imageBitmap.close?.();
        image.dispatchEvent(new Event('load'));
      } else {
        // HTMLImageElement path - use blob URL
        const blobUrl = URL.createObjectURL(blob);
        image.onload = () => {
          URL.revokeObjectURL(blobUrl);
        };
        image.onerror = () => {
          URL.revokeObjectURL(blobUrl);
        };
        image.src = blobUrl;
      }
    } catch (err) {
      console.warn('[IndiaBoundaryCorrectedTileLayer] Error applying corrections:', err);
      // Signal error to OpenLayers
      const image = imageTile.getImage();
      if (typeof image.dispatchEvent === 'function') {
        image.dispatchEvent(new Event('error'));
      }
    }
  };
}

/**
 * Extended OpenLayers TileLayer with India boundary corrections.
 * Extends ol/layer/Tile with a custom XYZ source that applies corrections.
 */
export class IndiaBoundaryCorrectedTileLayer extends TileLayer {
  /**
   * @param {Object} options - Layer options
   * @param {string} options.url - Tile URL template with {x}, {y}, {z} placeholders
   * @param {string} [options.pmtilesUrl] - URL to PMTiles file (defaults to CDN)
   * @param {Object|string} [options.layerConfig] - LayerConfig or config ID (auto-detected if not provided)
   * @param {Object[]} [options.extraLayerConfigs] - Additional LayerConfigs for matching
   * @param {number} [options.tileSize=256] - Tile size in pixels
   * @param {Object} [options.sourceOptions] - Additional options for XYZ source
   * @param {Object} [options.layerOptions] - Additional options for TileLayer
   */
  constructor(options) {
    const {
      url,
      pmtilesUrl,
      layerConfig,
      extraLayerConfigs,
      tileSize = 256,
      sourceOptions = {},
      ...layerOptions
    } = options;

    // Initialize registry and resolve layer config
    const registry = createMergedRegistry(extraLayerConfigs);
    let resolvedConfig;
    
    if (typeof layerConfig === 'string') {
      resolvedConfig = registry.get(layerConfig);
    } else if (layerConfig) {
      resolvedConfig = layerConfig;
    } else {
      // Auto-detect from URL
      resolvedConfig = registry.detectFromUrls([url]);
    }

    // Create TileFixer
    const tileFixer = new TileFixer(pmtilesUrl ?? getPmtilesUrl());

    // Create XYZ source with custom tile load function
    const source = new XYZ({
      url,
      tileSize,
      crossOrigin: 'anonymous',
      ...sourceOptions,
      ...(resolvedConfig ? {
        tileLoadFunction: createCorrectedTileLoadFunction(tileFixer, resolvedConfig, tileSize)
      } : {})
    });

    super({
      source,
      ...layerOptions
    });

    this._tileFixer = tileFixer;
    this._layerConfig = resolvedConfig;
    this._registry = registry;

    if (!resolvedConfig) {
      console.warn('[IndiaBoundaryCorrectedTileLayer] Could not detect layer config from URL. Corrections will not be applied.');
    }
  }

  /**
   * Get the TileFixer instance.
   * @returns {TileFixer}
   */
  getTileFixer() {
    return this._tileFixer;
  }

  /**
   * Get the resolved LayerConfig.
   * @returns {Object|null}
   */
  getLayerConfig() {
    return this._layerConfig;
  }

  /**
   * Get the registry.
   * @returns {LayerConfigRegistry}
   */
  getRegistry() {
    return this._registry;
  }

  /**
   * Fetch and fix a tile (exposed for testing).
   * @param {string} src - Tile URL
   * @param {number} z - Zoom level
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {Promise<{blob: Blob, wasFixed: boolean}>}
   * @private
   */
  async _fetchAndFixTile(src, z, x, y) {
    const tileSize = this.getSource().getTileGrid()?.getTileSize(z) || 256;
    return fetchAndFixTile(src, z, x, y, this._tileFixer, this._layerConfig, tileSize);
  }
}

// Export for testing
export { fetchAndFixTile };

/**
 * Factory function to create an IndiaBoundaryCorrectedTileLayer.
 * @param {Object} options - Layer options (see IndiaBoundaryCorrectedTileLayer constructor)
 * @returns {IndiaBoundaryCorrectedTileLayer}
 */
export function indiaBoundaryCorrectedTileLayer(options) {
  return new IndiaBoundaryCorrectedTileLayer(options);
}
