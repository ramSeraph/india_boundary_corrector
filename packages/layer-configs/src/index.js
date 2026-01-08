import configsJson from './configs.json' with { type: 'json' };
import { LayerConfig, LineStyle, INFINITY } from './layerconfig.js';

export { LayerConfig, LineStyle, INFINITY } from './layerconfig.js';

// Export raw configs for testing/inspection
export { configsJson };

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
   * Detect layer config from tile URL templates (with {z}/{x}/{y} placeholders)
   * @param {string | string[]} templates - Single template URL or array of template URLs
   */
  detectFromTemplates(templates) {
    if (!templates || (Array.isArray(templates) && templates.length === 0)) return undefined;
    
    for (const config of Object.values(this.registry)) {
      if (config.matchTemplate(templates)) {
        return config;
      }
    }
    
    return undefined;
  }

  /**
   * Detect layer config from actual tile URLs (with numeric coordinates)
   * @param {string | string[]} urls - Single tile URL or array of tile URLs
   */
  detectFromTileUrls(urls) {
    if (!urls || (Array.isArray(urls) && urls.length === 0)) return undefined;
    
    for (const config of Object.values(this.registry)) {
      if (config.matchTileUrl(urls)) {
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
    const layerConfig = this.detectFromTileUrls([url]);
    if (!layerConfig) return null;
    
    // Extract tile coordinates using the matched config
    const coords = layerConfig.extractCoords(url);
    if (!coords) return null;
    
    return { layerConfig, coords };
  }
}

// Default registry with built-in configs loaded from JSON
export const layerConfigs = new LayerConfigRegistry();
for (const configData of configsJson) {
  layerConfigs.register(new LayerConfig(configData));
}

