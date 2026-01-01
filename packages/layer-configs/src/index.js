import { cartoDbDark, cartoDbLight, osmCarto } from './configs.js';
import { LayerConfig } from './layerconfig.js';

// Re-export all layer configs
export { cartoDbDark, cartoDbLight, osmCarto } from './configs.js';
export { LayerConfig } from './layerconfig.js';

/**
 * Layer configuration registry
 */
export class LayerConfigRegistry {
  constructor() {
    this.registry = {};
  }

  /**
   * Get a layer config by id
   */
  get(id) {
    return this.registry[id];
  }

  /**
   * Register a new layer config
   */
  register(config) {
    this.registry[config.id] = config;
  }

  /**
   * Remove a layer config by id
   */
  remove(id) {
    if (!this.registry[id]) return false;
    delete this.registry[id];
    return true;
  }

  /**
   * Detect layer config from raster tile URLs
   * @param {string | string[]} tiles - Single tile URL or array of tile URL templates
   */
  detectFromUrls(tiles) {
    if (!tiles || (Array.isArray(tiles) && tiles.length === 0)) return undefined;
    
    for (const config of Object.values(this.registry)) {
      if (config.match && config.match(tiles)) {
        return config;
      }
    }
    
    return undefined;
  }

  /**
   * Get all available layer config ids
   */
  getAvailableIds() {
    return Object.keys(this.registry);
  }

  /**
   * Create a new registry with all configs from this registry plus extra configs.
   * @param {LayerConfig[]} extraLayerConfigs - Additional configs to add
   * @returns {LayerConfigRegistry} A new registry with merged configs
   */
  createMergedRegistry(extraLayerConfigs) {
    const registry = new LayerConfigRegistry();
    
    for (const id of this.getAvailableIds()) {
      registry.register(this.get(id));
    }
    
    if (extraLayerConfigs && extraLayerConfigs.length > 0) {
      for (const config of extraLayerConfigs) {
        registry.register(config);
      }
    }
    
    return registry;
  }

  /**
   * Parse a tile URL into its components: layer config and coordinates
   * @param {string} url - Tile URL to parse
   * @returns {{ layerConfig: LayerConfig, coords: { z: number, x: number, y: number } } | null}
   */
  parseTileUrl(url) {
    // Check if URL matches any layer config
    const layerConfig = this.detectFromUrls([url]);
    if (!layerConfig) return null;
    
    // Extract tile coordinates
    const coords = LayerConfig.extractTileCoords(url);
    if (!coords) return null;
    
    return { layerConfig, coords };
  }
}

// Default registry with built-in configs
export const layerConfigs = new LayerConfigRegistry();
layerConfigs.register(cartoDbDark);
layerConfigs.register(cartoDbLight);
layerConfigs.register(osmCarto);

