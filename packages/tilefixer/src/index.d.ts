import { PMTiles } from 'pmtiles';

/**
 * A parsed vector tile feature.
 */
export interface Feature {
  id: number | undefined;
  type: number;
  properties: Record<string, unknown>;
  geometry: Array<Array<{ x: number; y: number }>>;
  extent: number;
}

/**
 * Map of layer name to array of features.
 */
export type CorrectionResult = Record<string, Feature[]>;

/**
 * Layer configuration for styling corrections.
 */
export interface LayerConfig {
  startZoom?: number;
  zoomThreshold: number;
  osmAddLineColor: string;
  neAddLineColor: string;
  addLineDashed: boolean;
  addLineDashArray: number[];
  lineWidthMultiplier: number;
}

/**
 * Options for BoundaryCorrector constructor.
 */
export interface BoundaryCorrectorOptions {
  /** Maximum number of tiles to cache (default: 512) */
  cacheSize?: number;
}

/**
 * Simple LRU cache for parsed tile data.
 */
export declare class TileCache {
  constructor(maxSize?: number);
  get(z: number, x: number, y: number): CorrectionResult | undefined;
  set(z: number, x: number, y: number, value: CorrectionResult): void;
  has(z: number, x: number, y: number): boolean;
  clear(): void;
  readonly size: number;
}

/**
 * Boundary corrector that creates a PMTiles source for fetching correction data.
 */
export declare class BoundaryCorrector {
  /**
   * The URL to the PMTiles file.
   */
  pmtilesUrl: string;

  /**
   * The PMTiles source instance.
   */
  pmtiles: PMTiles;

  /**
   * The tile cache.
   */
  cache: TileCache;

  /**
   * Create a new BoundaryCorrector.
   * @param pmtilesUrl - URL to the PMTiles file
   * @param options - Options
   */
  constructor(pmtilesUrl: string, options?: BoundaryCorrectorOptions);

  /**
   * Get the PMTiles source object.
   */
  getSource(): PMTiles;

  /**
   * Get the tile cache.
   */
  getCache(): TileCache;

  /**
   * Clear the tile cache.
   */
  clearCache(): void;

  /**
   * Get corrections for a tile as a dict of layer name to features.
   * Supports overzoom beyond maxDataZoom (14) by scaling parent tile data.
   * @param z - Zoom level
   * @param x - Tile X coordinate
   * @param y - Tile Y coordinate
   */
  getCorrections(z: number, x: number, y: number): Promise<CorrectionResult>;

  /**
   * Apply corrections to a raster tile.
   * @param corrections - Feature map from getCorrections
   * @param rasterTile - The original raster tile as ArrayBuffer
   * @param layerConfig - Layer configuration with colors and styles
   * @param zoom - Current zoom level
   * @param tileSize - Size of the tile in pixels (default: 256)
   * @returns The corrected tile as ArrayBuffer (PNG)
   */
  fixTile(
    corrections: CorrectionResult,
    rasterTile: ArrayBuffer,
    layerConfig: LayerConfig,
    zoom: number,
    tileSize?: number
  ): Promise<ArrayBuffer>;
}
