import type { Map as OLMap } from 'ol';
import type BaseLayer from 'ol/layer/Base';
import type VectorTileLayer from 'ol/layer/VectorTile';
import type { LayerConfig, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';

/**
 * Options for BoundaryCorrector
 */
export interface BoundaryCorrectorOptions {
  /** URL to the PMTiles file (optional, defaults to bundled file) */
  pmtilesUrl?: string;
  /** Layer configuration object or config ID string */
  layerConfig?: LayerConfig | string;
}

/**
 * Tracked layer information
 */
export interface TrackedLayer {
  delLayer: VectorTileLayer;
  addLayer: VectorTileLayer;
  layerConfig: LayerConfig;
}

/**
 * India boundary corrector for OpenLayers maps.
 * Automatically tracks tile layers and adds correction overlays.
 */
export class BoundaryCorrector {
  /**
   * @param map - OpenLayers map instance
   * @param options - Configuration options
   */
  constructor(map: OLMap, options?: BoundaryCorrectorOptions);

  /**
   * Initialize the boundary corrector and start tracking.
   */
  init(): this;

  /**
   * Remove all corrections and cleanup listeners.
   */
  remove(): void;

  /**
   * Get the tracked layers map.
   */
  getTrackedLayers(): Map<BaseLayer, TrackedLayer>;

  /**
   * Check if corrections are active for a specific layer.
   */
  hasCorrections(layer: BaseLayer): boolean;

  /**
   * Get the correction layers for a base layer.
   */
  getCorrectionLayers(baseLayer: BaseLayer): { delLayer: VectorTileLayer; addLayer: VectorTileLayer } | null;

  /**
   * Get the layer config for a base layer.
   */
  getLayerConfig(baseLayer: BaseLayer): LayerConfig | null;

  /**
   * Check if the corrector is initialized.
   */
  isInitialized(): boolean;
}

/**
 * Add India boundary corrections to an OpenLayers map.
 * Automatically detects tile layers and applies appropriate corrections.
 *
 * @param map - OpenLayers map instance
 * @param options - Configuration options
 * @returns BoundaryCorrector instance (call remove() to cleanup)
 */
export function addBoundaryCorrector(
  map: OLMap,
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
