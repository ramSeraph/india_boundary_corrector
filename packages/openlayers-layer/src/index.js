import TileLayer from 'ol/layer/Tile.js';
import ImageTile from 'ol/source/ImageTile.js';
import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';
import { TileFixer, buildFetchOptions } from '@india-boundary-corrector/tilefixer';

// Re-export for convenience
export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Create a tile loader function that applies boundary corrections.
 * Uses the modern OpenLayers loader API with abort signal support.
 * @param {string} urlTemplate - URL template with {x}, {y}, {z} placeholders
 * @param {TileFixer} tileFixer - The TileFixer instance
 * @param {Object} layerConfig - The layer configuration
 * @param {{current: IndiaBoundaryCorrectedTileLayer}} layerRef - Reference to layer instance for event dispatching
 * @param {Object} fetchOptions - Fetch options (mode, credentials)
 * @param {boolean} fallbackOnCorrectionFailure - Whether to return original tile if corrections fail
 * @returns {Function} Tile loader function
 */
function createCorrectedTileLoader(urlTemplate, tileFixer, layerConfig, layerRef, fetchOptions, fallbackOnCorrectionFailure) {
  return async function(z, x, y, { signal }) {
    const src = urlTemplate
      .replace('{z}', z)
      .replace('{x}', x)
      .replace('{y}', y);

    try {
      const { data, correctionsFailed, correctionsError } = await tileFixer.fetchAndFixTile(
        src, z, x, y, layerConfig, { signal, ...fetchOptions }, fallbackOnCorrectionFailure
      );

      if (correctionsFailed && layerRef.current) {
        console.warn('[IndiaBoundaryCorrectedTileLayer] Corrections fetch failed:', correctionsError);
        layerRef.current.dispatchEvent({ type: 'correctionerror', error: correctionsError, coords: { z, x, y }, tileUrl: src });
      }

      const blob = new Blob([data]);
      return createImageBitmap(blob);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[IndiaBoundaryCorrectedTileLayer] Tile fetch failed:', err);
      }
      throw err;
    }
  };
}

/**
 * Extended OpenLayers TileLayer with India boundary corrections.
 * Uses ol/source/ImageTile with a custom loader that applies corrections.
 */
export class IndiaBoundaryCorrectedTileLayer extends TileLayer {
  /**
   * @param {Object} options - Layer options
   * @param {string} options.url - Tile URL template with {x}, {y}, {z} placeholders
   * @param {string} [options.pmtilesUrl] - URL to PMTiles file (defaults to CDN)
   * @param {Object|string} [options.layerConfig] - LayerConfig or config ID (auto-detected if not provided)
   * @param {Object[]} [options.extraLayerConfigs] - Additional LayerConfigs for matching
   * @param {number} [options.tileSize=256] - Tile size in pixels (for OpenLayers source)
   * @param {boolean} [options.fallbackOnCorrectionFailure=true] - Return original tile if corrections fail
   * @param {Object} [options.sourceOptions] - Additional options for ImageTile source
   * @param {string} [options.sourceOptions.crossOrigin] - Cross-origin attribute ('anonymous' or 'use-credentials')
   * @param {string} [options.sourceOptions.referrerPolicy] - Referrer policy for fetch requests
   * @param {Object} [options.layerOptions] - Additional options for TileLayer
   */
  constructor(options) {
    const {
      url,
      pmtilesUrl,
      layerConfig,
      extraLayerConfigs,
      tileSize = 256,
      fallbackOnCorrectionFailure = true,
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
    const tileFixer = TileFixer.getOrCreate(pmtilesUrl ?? getPmtilesUrl());

    // Derive fetch options from crossOrigin (matches OpenLayers behavior)
    // Default to 'anonymous' if not specified in sourceOptions
    const crossOrigin = sourceOptions.crossOrigin ?? 'anonymous';
    const fetchOptions = buildFetchOptions(crossOrigin, sourceOptions.referrerPolicy);

    // Create a placeholder for the layer instance (needed for event dispatching in loader)
    const layerRef = { current: null };

    // Create ImageTile source with loader (supports abort signals)
    const source = new ImageTile({
      tileSize,
      crossOrigin,
      ...sourceOptions,
      loader: resolvedConfig
        ? createCorrectedTileLoader(url, tileFixer, resolvedConfig, layerRef, fetchOptions, fallbackOnCorrectionFailure)
        : undefined,
      url: resolvedConfig ? undefined : url,
    });

    super({
      source,
      ...layerOptions
    });

    // Set the layer reference for event dispatching
    layerRef.current = this;

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
}

/**
 * Factory function to create an IndiaBoundaryCorrectedTileLayer.
 * @param {Object} options - Layer options (see IndiaBoundaryCorrectedTileLayer constructor)
 * @returns {IndiaBoundaryCorrectedTileLayer}
 */
export function indiaBoundaryCorrectedTileLayer(options) {
  return new IndiaBoundaryCorrectedTileLayer(options);
}
