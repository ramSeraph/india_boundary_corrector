import { LayerConfig, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';
import { TileFixer } from '@india-boundary-corrector/tilefixer';

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Options for CorrectionProtocol
 */
export interface CorrectionProtocolOptions {
  /** URL to PMTiles file (defaults to CDN) */
  pmtilesUrl?: string;
  /** Whether to return original tile if corrections fail (default: true) */
  fallbackOnCorrectionFailure?: boolean;
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

  /**
   * Add a listener for an event.
   * @param event - Event name
   * @param listener - Callback function receiving event data
   */
  on(event: 'correctionerror', listener: (data: CorrectionErrorEvent) => void): this;

  /**
   * Remove an event listener.
   * @param event - Event name
   * @param listener - Callback to remove
   */
  off(event: 'correctionerror', listener: (data: CorrectionErrorEvent) => void): this;
}

/**
 * Event data for correctionerror event.
 */
export interface CorrectionErrorEvent {
  error: Error;
  coords: { z: number; x: number; y: number };
  tileUrl: string;
}

/**
 * Create and register a correction protocol with MapLibre GL.
 */
export declare function registerCorrectionProtocol(
  maplibregl: typeof import('maplibre-gl'),
  options?: CorrectionProtocolOptions
): CorrectionProtocol;
