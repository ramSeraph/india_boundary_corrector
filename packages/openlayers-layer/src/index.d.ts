import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { LayerConfig, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Options for CorrectedTileLayer
 */
export interface CorrectedTileLayerOptions {
  /** Tile URL template with {x}, {y}, {z} placeholders */
  url: string;
  /** URL to PMTiles file (defaults to CDN) */
  pmtilesUrl?: string;
  /** LayerConfig object or config ID string (auto-detected from URL if not provided) */
  layerConfig?: LayerConfig | string;
  /** Additional layer configs for matching */
  extraLayerConfigs?: LayerConfig[];
  /** Tile size in pixels (default: 256) */
  tileSize?: number;
  /** Additional options for XYZ source */
  sourceOptions?: Partial<ConstructorParameters<typeof XYZ>[0]>;
  /** Additional options for TileLayer (opacity, visible, etc.) */
  [key: string]: unknown;
}

/**
 * Extended OpenLayers TileLayer with India boundary corrections.
 */
export declare class CorrectedTileLayer extends TileLayer<XYZ> {
  constructor(options: CorrectedTileLayerOptions);
  
  /** Get the TileFixer instance */
  getTileFixer(): TileFixer;
  
  /** Get the resolved LayerConfig */
  getLayerConfig(): LayerConfig | null;
  
  /** Get the registry */
  getRegistry(): LayerConfigRegistry;
}

/**
 * Factory function to create a CorrectedTileLayer.
 */
export declare function correctedTileLayer(options: CorrectedTileLayerOptions): CorrectedTileLayer;
