import type { Map as LeafletMap, TileLayer, Layer } from 'leaflet';
import type { LayerConfig, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';

/**
 * Options for BoundaryCorrector
 */
export interface BoundaryCorrectorOptions {
  /** Specific tile layer to add corrections for (disables auto-tracking) */
  tileLayer?: TileLayer;
  /** URL to the PMTiles file (optional, defaults to bundled file) */
  pmtilesUrl?: string;
  /** Layer configuration object or config ID string */
  layerConfig?: LayerConfig | string;
}

/**
 * Tracked layer information
 */
export interface TrackedLayer {
  config: LayerConfig;
  correctionLayer: Layer;
}

/**
 * India boundary corrector for Leaflet maps using protomaps-leaflet.
 * Renders boundary corrections as a vector tile overlay.
 * Automatically tracks layer add/remove events to manage corrections dynamically.
 */
export class BoundaryCorrector {
  /**
   * @param map - Leaflet map instance
   * @param options - Configuration options
   */
  constructor(map: LeafletMap, options?: BoundaryCorrectorOptions);

  /**
   * Initialize the boundary corrector and add correction layer to map.
   */
  init(): this;

  /**
   * Remove the correction layer from the map and stop tracking.
   */
  remove(): void;

  /**
   * Get all tracked tile layers and their corrections.
   */
  getTrackedLayers(): Map<TileLayer, TrackedLayer>;

  /**
   * Check if corrections are active for a specific tile layer.
   */
  hasCorrections(tileLayer: TileLayer): boolean;

  /**
   * Check if the corrector is initialized.
   */
  isInitialized(): boolean;
}

/**
 * Add India boundary corrections to a Leaflet map.
 * Automatically tracks layeradd/layerremove events to manage corrections dynamically.
 *
 * @param map - Leaflet map instance
 * @param options - Configuration options
 * @returns BoundaryCorrector instance (call remove() to cleanup)
 */
export function addBoundaryCorrector(
  map: LeafletMap,
  options?: BoundaryCorrectorOptions
): BoundaryCorrector;

/**
 * Remove boundary corrector from the map.
 *
 * @param corrector - The corrector instance to remove
 */
export function removeBoundaryCorrector(corrector: BoundaryCorrector): void;

/** Re-exported layer config registry */
export { layerConfigs } from '@india-boundary-corrector/layer-configs';

/** Re-exported getPmtilesUrl function */
export { getPmtilesUrl } from '@india-boundary-corrector/data';
