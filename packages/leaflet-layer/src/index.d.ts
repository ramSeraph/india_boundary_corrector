import * as L from 'leaflet';
import { LayerConfig } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Options for L.TileLayer.Corrected
 */
export interface CorrectedTileLayerOptions extends L.TileLayerOptions {
  /** URL to PMTiles file (defaults to CDN) */
  pmtilesUrl?: string;
  /** LayerConfig object or config ID string (auto-detected from URL if not provided) */
  layerConfig?: LayerConfig | string;
  /** Additional layer configs for matching */
  extraLayerConfigs?: LayerConfig[];
}

/**
 * Extended TileLayer with boundary corrections
 */
export interface CorrectedTileLayer extends L.TileLayer {
  /** Get the TileFixer instance */
  getTileFixer(): TileFixer;
  /** Get the resolved LayerConfig */
  getLayerConfig(): LayerConfig | null;
}

declare module 'leaflet' {
  namespace TileLayer {
    class Corrected extends L.TileLayer implements CorrectedTileLayer {
      constructor(url: string, options?: CorrectedTileLayerOptions);
      getTileFixer(): TileFixer;
      getLayerConfig(): LayerConfig | null;
    }
  }

  namespace tileLayer {
    function corrected(url: string, options?: CorrectedTileLayerOptions): TileLayer.Corrected;
  }
}

/**
 * Extend Leaflet with L.TileLayer.Corrected and L.tileLayer.corrected.
 * Called automatically when Leaflet is available globally.
 * Use this for ES module imports where L is not global.
 * @param L - Leaflet namespace
 */
export declare function extendLeaflet(L: typeof import('leaflet')): void;
