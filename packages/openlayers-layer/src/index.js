import TileLayer from 'ol/layer/Tile.js';
import XYZ from 'ol/source/XYZ.js';
import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Re-export for convenience
export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Derive fetch options from crossOrigin attribute (matches OpenLayers behavior).
 * @param {string|null} crossOrigin - The crossOrigin attribute value
 * @returns {{mode: RequestMode, credentials: RequestCredentials}}
 */
function getFetchOptionsFromCrossOrigin(crossOrigin) {
  if (crossOrigin === 'anonymous' || crossOrigin === '') {
    return { mode: 'cors', credentials: 'omit' };
  } else if (crossOrigin === 'use-credentials') {
    return { mode: 'cors', credentials: 'include' };
  }
  return { mode: 'same-origin', credentials: 'same-origin' };
}

/**
 * Create a custom tileLoadFunction that applies boundary corrections.
 * @param {TileFixer} tileFixer - The TileFixer instance
 * @param {Object} layerConfig - The layer configuration
 * @param {number} tileSize - Tile size in pixels
 * @param {IndiaBoundaryCorrectedTileLayer} layer - The layer instance for event dispatching
 * @param {Object} fetchOptions - Fetch options (mode, credentials)
 * @returns {Function} Custom tile load function
 */
function createCorrectedTileLoadFunction(tileFixer, layerConfig, tileSize, layer, fetchOptions) {
  return async function(imageTile, src) {
    const tileCoord = imageTile.getTileCoord();
    const z = tileCoord[0];
    const x = tileCoord[1];
    const y = tileCoord[2];

    try {
      const { data, correctionsFailed, correctionsError } = await tileFixer.fetchAndFixTile(
        src, z, x, y, layerConfig, { tileSize, ...fetchOptions }
      );

      if (correctionsFailed) {
        console.warn('[IndiaBoundaryCorrectedTileLayer] Corrections fetch failed:', correctionsError);
        layer.dispatchEvent({ type: 'correctionerror', error: correctionsError, coords: { z, x, y }, tileUrl: src });
      }

      const blob = new Blob([data]);
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
      console.warn('[IndiaBoundaryCorrectedTileLayer] Tile fetch failed:', err);
      // Fall back to original tile
      const image = imageTile.getImage();
      if (typeof image.src !== 'undefined') {
        // HTMLImageElement - load original tile
        image.src = src;
      } else if (typeof image.dispatchEvent === 'function') {
        // OffscreenCanvas - can't fall back, signal error
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
    const registry = layerConfigs.createMergedRegistry(extraLayerConfigs);
    let resolvedConfig;
    
    if (typeof layerConfig === 'string') {
      resolvedConfig = registry.get(layerConfig);
    } else if (layerConfig) {
      resolvedConfig = layerConfig;
    } else {
      // Auto-detect from URL
      resolvedConfig = registry.detectFromTemplates([url]);
    }

    // Create TileFixer
    const tileFixer = new TileFixer(pmtilesUrl ?? getPmtilesUrl());

    // Create XYZ source (tileLoadFunction set after super() to access 'this')
    const source = new XYZ({
      url,
      tileSize,
      crossOrigin: 'anonymous',
      ...sourceOptions,
    });

    // Derive fetch options from crossOrigin (matches OpenLayers behavior)
    // Default to 'anonymous' if not specified in sourceOptions
    const fetchOptions = getFetchOptionsFromCrossOrigin(sourceOptions.crossOrigin ?? 'anonymous');

    super({
      source,
      ...layerOptions
    });

    this._tileFixer = tileFixer;
    this._layerConfig = resolvedConfig;
    this._registry = registry;

    // Set tileLoadFunction after super() so we can pass 'this' for event dispatching
    if (resolvedConfig) {
      source.setTileLoadFunction(createCorrectedTileLoadFunction(tileFixer, resolvedConfig, tileSize, this, fetchOptions));
    }

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
}

/**
 * Factory function to create an IndiaBoundaryCorrectedTileLayer.
 * @param {Object} options - Layer options (see IndiaBoundaryCorrectedTileLayer constructor)
 * @returns {IndiaBoundaryCorrectedTileLayer}
 */
export function indiaBoundaryCorrectedTileLayer(options) {
  return new IndiaBoundaryCorrectedTileLayer(options);
}
