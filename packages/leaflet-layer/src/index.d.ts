import * as L from 'leaflet';
import { LayerConfig } from '@india-boundary-corrector/layer-configs';
import { TileFixer } from '@india-boundary-corrector/tilefixer';

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Options for L.TileLayer.IndiaBoundaryCorrected
 */
export interface IndiaBoundaryCorrectedTileLayerOptions extends L.TileLayerOptions {
  /** URL to PMTiles file (defaults to CDN) */
  pmtilesUrl?: string;
  /** LayerConfig object or config ID string (auto-detected from URL if not provided) */
  layerConfig?: LayerConfig | string;
  /** Additional layer configs for matching */
  extraLayerConfigs?: LayerConfig[];
  /** Whether to return original tile if corrections fail (default: true) */
  fallbackOnCorrectionFailure?: boolean;
}

/**
 * Extended TileLayer with boundary corrections
 */
export interface IndiaBoundaryCorrectedTileLayer extends L.TileLayer {
  /** Get the TileFixer instance */
  getTileFixer(): TileFixer;
  /** Get the resolved LayerConfig */
  getLayerConfig(): LayerConfig | null;
}

declare module 'leaflet' {
  namespace TileLayer {
    class IndiaBoundaryCorrected extends L.TileLayer implements IndiaBoundaryCorrectedTileLayer {
      constructor(url: string, options?: IndiaBoundaryCorrectedTileLayerOptions);
      getTileFixer(): TileFixer;
      getLayerConfig(): LayerConfig | null;
    }
  }

  namespace tileLayer {
    function indiaBoundaryCorrected(url: string, options?: IndiaBoundaryCorrectedTileLayerOptions): TileLayer.IndiaBoundaryCorrected;
  }
}

/**
 * Extend Leaflet with L.TileLayer.IndiaBoundaryCorrected and L.tileLayer.indiaBoundaryCorrected.
 * Called automatically when Leaflet is available globally.
 * Use this for ES module imports where L is not global.
 * @param L - Leaflet namespace
 */
export declare function extendLeaflet(L: typeof import('leaflet')): void;
