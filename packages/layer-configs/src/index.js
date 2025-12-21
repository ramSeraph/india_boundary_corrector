import { osmCartoDark, osmCarto } from './configs.js';

// Re-export all layer configs
export { osmCartoDark, osmCarto } from './configs.js';
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
}

// Default registry with built-in configs
export const layerConfigs = new LayerConfigRegistry();
layerConfigs.register(osmCartoDark);
layerConfigs.register(osmCarto);

