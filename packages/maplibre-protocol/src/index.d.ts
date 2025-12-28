import { LayerConfig, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Options for CorrectionProtocol
 */
export interface CorrectionProtocolOptions {
  /** URL to PMTiles file (defaults to CDN) */
  pmtilesUrl?: string;
  /** Tile size in pixels (default: 256) */
  tileSize?: number;
}

/**
 * India boundary corrections protocol for MapLibre GL.
 * 
 * Usage:
 *   const protocol = new CorrectionProtocol();
 *   protocol.register(maplibregl);
 * 
 *   // In your style:
 *   tiles: ['corrections://https://tile.openstreetmap.org/{z}/{x}/{y}.png']
 *   // Or with explicit config:
 *   tiles: ['corrections://osm-carto@https://tile.openstreetmap.org/{z}/{x}/{y}.png']
 */
export declare class CorrectionProtocol {
  constructor(options?: CorrectionProtocolOptions);
  
  /**
   * Add a custom layer config to the registry.
   */
  addLayerConfig(layerConfig: LayerConfig): this;
  
  /**
   * Get the registry.
   */
  getRegistry(): LayerConfigRegistry;
  
  /**
   * Get the TileFixer instance.
   */
  getTileFixer(): TileFixer;
  
  /**
   * Register the protocol with MapLibre GL.
   */
  register(maplibregl: typeof import('maplibre-gl')): this;
  
  /**
   * Unregister the protocol from MapLibre GL.
   */
  unregister(maplibregl: typeof import('maplibre-gl')): this;
}

/**
 * Create and register a correction protocol with MapLibre GL.
 */
export declare function registerCorrectionProtocol(
  maplibregl: typeof import('maplibre-gl'),
  options?: CorrectionProtocolOptions
): CorrectionProtocol;
