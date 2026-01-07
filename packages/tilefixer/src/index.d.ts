import { PMTiles } from 'pmtiles';

/**
 * Error thrown when tile fetch fails.
 * Includes the HTTP status code and response body for proper error handling.
 */
export declare class TileFetchError extends Error {
  /** HTTP status code */
  status: number;
  /** The URL that failed */
  url?: string;
  /** Response body text */
  body?: string;

  constructor(status: number, url?: string, body?: string);

  /**
   * Create a TileFetchError from a failed Response.
   */
  static fromResponse(response: Response): Promise<TileFetchError>;
}

/**
 * Minimum line width used when extrapolating below the lowest zoom stop.
 */
export const MIN_LINE_WIDTH: number;

/**
 * Build fetch options from HTML image element attributes.
 * Maps crossorigin and referrerpolicy attribute values to fetch() options.
 * @param crossOrigin - The crossOrigin attribute value
 * @param referrerPolicy - The referrerPolicy attribute value
 * @returns Object with mode, credentials, and optionally referrerPolicy for fetch()
 */
export function buildFetchOptions(
  crossOrigin: string | boolean | null | undefined,
  referrerPolicy?: string
): {
  mode: RequestMode;
  credentials: RequestCredentials;
  referrerPolicy?: ReferrerPolicy;
};

/**
 * Interpolate or extrapolate line width from a zoom-to-width map.
 * @param zoom - Zoom level
 * @param lineWidthStops - Map of zoom level to line width (at least 2 entries)
 * @returns Interpolated/extrapolated line width (minimum 0.5)
 */
export function getLineWidth(zoom: number, lineWidthStops: Record<number, number>): number;

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
  lineExtensionFactor?: number;
}

/**
 * Options for TileFixer constructor.
 */
export interface TileFixerOptions {
  /** Maximum number of features to cache (default: 25000) */
  cacheMaxFeatures?: number;
  /** Maximum zoom level in PMTiles (auto-detected if not provided) */
  maxDataZoom?: number;
}

/**
 * Boundary corrector that fetches correction data and applies it to raster tiles.
 */
export declare class TileFixer {
  /**
   * Set the default maximum features to cache for new TileFixer instances.
   * @param maxFeatures - Maximum features to cache
   */
  static setDefaultCacheMaxFeatures(maxFeatures: number): void;

  /**
   * Get or create a TileFixer instance for a given PMTiles URL.
   * Reuses existing instances for the same URL.
   * @param pmtilesUrl - URL to the PMTiles file
   */
  static getOrCreate(pmtilesUrl: string): TileFixer;

  /**
   * Create a new TileFixer.
   * @param pmtilesUrl - URL to the PMTiles file
   * @param options - Options
   */
  constructor(pmtilesUrl: string, options?: TileFixerOptions);

  /**
   * Get the PMTiles source object.
   */
  getSource(): PMTiles;

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
   * @returns The corrected tile as ArrayBuffer (PNG)
   */
  fixTile(
    corrections: CorrectionResult,
    rasterTile: ArrayBuffer,
    layerConfig: LayerConfig,
    zoom: number
  ): Promise<ArrayBuffer>;

  /**
   * Fetch a tile, apply corrections, and return the result.
   * @param tileUrl - URL of the raster tile
   * @param z - Zoom level
   * @param x - Tile X coordinate
   * @param y - Tile Y coordinate
   * @param layerConfig - Layer configuration with colors and styles
   * @param fetchOptions - Fetch options passed to fetch()
   * @param fallbackOnCorrectionFailure - Return original tile if corrections fail (default: true)
   * @returns The tile data and whether corrections were applied
   */
  fetchAndFixTile(
    tileUrl: string,
    z: number,
    x: number,
    y: number,
    layerConfig: LayerConfig,
    fetchOptions?: FetchAndFixTileFetchOptions,
    fallbackOnCorrectionFailure?: boolean
  ): Promise<FetchAndFixTileResult>;
}

/**
 * Fetch options for fetchAndFixTile method (passed directly to fetch()).
 */
export interface FetchAndFixTileFetchOptions {
  /** Abort signal for fetch */
  signal?: AbortSignal;
  /** Fetch mode (e.g., 'cors') */
  mode?: RequestMode;
  /** Fetch credentials (e.g., 'omit', 'include') */
  credentials?: RequestCredentials;
  /** Referrer URL or empty string for none */
  referrer?: string;
  /** Referrer policy (e.g., 'no-referrer', 'origin') */
  referrerPolicy?: ReferrerPolicy;
}

/**
 * Result of fetchAndFixTile method.
 */
export interface FetchAndFixTileResult {
  /** The tile data as ArrayBuffer */
  data: ArrayBuffer;
  /** Whether corrections were applied */
  wasFixed: boolean;
  /** Whether corrections fetch failed (only present if fallbackOnCorrectionFailure is true) */
  correctionsFailed?: boolean;
  /** The error if corrections fetch failed */
  correctionsError?: Error | null;
}
