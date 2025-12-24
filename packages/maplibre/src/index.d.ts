import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LayerConfig } from '@india-boundary-corrector/layer-configs';

/**
 * Options for BoundaryCorrector
 */
export interface BoundaryCorrectorOptions {
  /** Specific source ID to add corrections for (skips auto-detection) */
  sourceId?: string;
  /** Specific layer ID to add corrections above */
  layerId?: string;
  /** URL to the PMTiles file (optional, defaults to bundled file) */
  pmtilesUrl?: string;
  /** Layer configuration object or config ID string */
  layerConfig?: LayerConfig | string;
}

/**
 * Tracked source information
 */
export interface TrackedSource {
  layerId: string;
  correctionSourceId: string;
  correctionLayerIds: string[];
  layerConfig: LayerConfig;
}

/**
 * Configuration returned by getBoundaryCorrectorConfig
 */
export interface BoundaryCorrectorConfig {
  sources: Record<string, object>;
  layers: object[];
  pmtilesUrl: string;
  layerConfig: LayerConfig;
  sourceId: string;
  layerId: string;
}

/**
 * India boundary corrector for MapLibre GL JS maps.
 * Automatically tracks raster sources/layers and adds correction overlays.
 */
export class BoundaryCorrector {
  /**
   * @param map - MapLibre map instance
   * @param options - Configuration options
   */
  constructor(map: MapLibreMap, options?: BoundaryCorrectorOptions);

  /**
   * Initialize the boundary corrector and start tracking.
   */
  init(): this;

  /**
   * Remove all corrections and cleanup listeners.
   */
  remove(): void;

  /**
   * Get the tracked sources map.
   */
  getTrackedSources(): Map<string, TrackedSource>;

  /**
   * Check if corrections are active for a specific source.
   */
  hasCorrections(sourceId: string): boolean;
}

/**
 * Get boundary corrector configuration without adding to map.
 * Use this for manual control over when/how layers are added.
 *
 * @param map - MapLibre map instance
 * @param options - Configuration options
 * @returns Configuration object or null if config cannot be resolved
 */
export function getBoundaryCorrectorConfig(
  map: MapLibreMap,
  options?: BoundaryCorrectorOptions
): BoundaryCorrectorConfig | null;

/**
 * Add India boundary corrections that automatically track raster sources/layers.
 *
 * @param map - MapLibre map instance
 * @param options - Optional configuration
 * @returns BoundaryCorrector instance (call remove() to cleanup)
 */
export function addBoundaryCorrector(
  map: MapLibreMap,
  options?: BoundaryCorrectorOptions
): BoundaryCorrector;

/**
 * Remove boundary corrector layers for a specific source.
 *
 * @param map - MapLibre map instance
 * @param sourceId - Source ID to remove corrections for
 */
/**
 * Remove boundary corrector from the map.
 * @param corrector - BoundaryCorrector instance returned by addBoundaryCorrector
 */
export function removeBoundaryCorrector(corrector: BoundaryCorrector): void;
