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
 * Line style definition for drawing boundary lines
 */
export interface LineStyle {
  /** Line color (CSS color string) */
  color: string;
  /** Width as fraction of base line width (default: 1.0) */
  widthFraction?: number;
  /** Dash pattern array (omit for solid line) */
  dashArray?: number[];
  /** Opacity/alpha value from 0 (transparent) to 1 (opaque) (default: 1.0) */
  alpha?: number;
}

/**
 * Layer configuration for styling corrections.
 */
export interface LayerConfig {
  startZoom?: number;
  zoomThreshold: number;
  lineWidthStops: Record<number, number>;
  lineStyles: LineStyle[];
  delWidthFactor?: number;
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

  /**
   * Fetch a tile, apply corrections, and return the result.
   * @param tileUrl - URL of the raster tile
   * @param z - Zoom level
   * @param x - Tile X coordinate
   * @param y - Tile Y coordinate
   * @param layerConfig - Layer configuration with colors and styles
   * @param options - Fetch options
   * @returns The tile data and whether corrections were applied
   */
  fetchAndFixTile(
    tileUrl: string,
    z: number,
    x: number,
    y: number,
    layerConfig: LayerConfig,
    options?: FetchAndFixTileOptions
  ): Promise<FetchAndFixTileResult>;
}

/**
 * Options for fetchAndFixTile method.
 */
export interface FetchAndFixTileOptions {
  /** Tile size in pixels (default: 256) */
  tileSize?: number;
  /** Abort signal for fetch */
  signal?: AbortSignal;
  /** Fetch mode (e.g., 'cors') */
  mode?: RequestMode;
}

/**
 * Result of fetchAndFixTile method.
 */
export interface FetchAndFixTileResult {
  /** The tile data as ArrayBuffer */
  data: ArrayBuffer;
  /** Whether corrections were applied */
  wasFixed: boolean;
}
