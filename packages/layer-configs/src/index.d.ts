/**
 * Constant representing no zoom limit (used for endZoom).
 * Using -1 instead of Infinity for JSON serialization compatibility.
 */
export const INFINITY: -1;

/**
 * Minimum line width used when extrapolating below the lowest zoom stop.
 */
export const MIN_LINE_WIDTH: number;

/**
 * Interpolate or extrapolate line width for a given zoom level.
 * @param zoom - Zoom level
 * @param lineWidthStops - Map of zoom level to line width (at least 2 entries)
 * @returns Interpolated/extrapolated line width (minimum MIN_LINE_WIDTH)
 */
export function interpolateLineWidth(zoom: number, lineWidthStops: Record<number, number>): number;

/**
 * Line style definition for drawing boundary lines
 */
export interface LineStyleOptions {
  /** Line color (CSS color string) */
  color: string;
  /** Layer suffix (e.g., 'osm', 'ne', 'osm-disp') - determines PMTiles layer */
  layerSuffix: string;
  /** Line width stops: map of zoom level to line width (required) */
  lineWidthStops: Record<number, number>;
  /** Width as fraction of base line width (default: 1.0) */
  widthFraction?: number;
  /** Dash pattern array (omit for solid line) */
  dashArray?: number[];
  /** Opacity/alpha value from 0 (transparent) to 1 (opaque) (default: 1.0) */
  alpha?: number;
  /** Minimum zoom level for this style (default: 0) */
  startZoom?: number;
  /** Maximum zoom level for this style (default: INFINITY, i.e., -1) */
  endZoom?: number;
  /** Factor to extend add lines by (multiplied by deletion line width) (default: 0.0) */
  lineExtensionFactor?: number;
  /** Factor to multiply line width for deletion blur (default: 1.5) */
  delWidthFactor?: number;
}

/**
 * Line style class for drawing boundary lines
 */
export class LineStyle {
  readonly color: string;
  readonly layerSuffix: string;
  readonly lineWidthStops: Record<number, number>;
  readonly widthFraction: number;
  readonly dashArray?: number[];
  readonly alpha: number;
  readonly startZoom: number;
  readonly endZoom: number;
  readonly lineExtensionFactor: number;
  readonly delWidthFactor: number;

  constructor(options: LineStyleOptions);

  /**
   * Get base line width for this style at a given zoom level.
   * @param zoom - Zoom level
   */
  getLineWidth(zoom: number): number;

  /**
   * Check if this style is active at the given zoom level.
   * @param z - Zoom level
   */
  isActiveAtZoom(z: number): boolean;

  /**
   * Serialize to plain object.
   */
  toJSON(): LineStyleOptions;

  /**
   * Create from plain object with validation.
   */
  static fromJSON(obj: LineStyleOptions, index?: number): LineStyle;

  /**
   * Validate a LineStyle configuration object.
   */
  static validateJSON(obj: unknown, index?: number, requireLineWidthStops?: boolean): void;
}

/**
 * Line style input for LayerConfig (lineWidthStops is optional, inherited from config if not provided)
 */
export type LineStyleInput = Omit<LineStyleOptions, 'lineWidthStops'> & {
  lineWidthStops?: Record<number, number>;
};

/**
 * Configuration options for LayerConfig input (constructor)
 */
export interface LayerConfigOptions {
  /** Unique identifier for this config */
  id: string;
  /** Tile URL templates for matching (e.g., "https://{s}.tile.example.com/{z}/{x}/{y}.png") */
  tileUrlTemplates?: string | string[];
  /** Line width stops: map of zoom level to line width (at least 2 entries) */
  lineWidthStops?: Record<number, number>;
  /** Line styles array - lines are drawn in order (required). lineWidthStops is optional per style (inherited from config if not provided) */
  lineStyles: LineStyleInput[];
}

/**
 * Serialized LayerConfig (from toJSON)
 */
export interface LayerConfigJSON {
  id: string;
  tileUrlTemplates: string[];
  lineWidthStops: Record<number, number>;
  lineStyles: LineStyleOptions[];
}

/**
 * Layer configuration class for boundary corrections
 */
export class LayerConfig {
  readonly id: string;
  readonly tileUrlTemplates: string[];
  readonly lineWidthStops: Record<number, number>;
  readonly lineStyles: LineStyle[];

  constructor(options: LayerConfigOptions);

  /**
   * Get line styles active at a given zoom level
   * @param z - Zoom level
   */
  getLineStylesForZoom(z: number): LineStyle[];

  /**
   * Get unique layer suffixes from styles active at a given zoom level
   * @param z - Zoom level
   */
  getLayerSuffixesForZoom(z: number): string[];

  /**
   * Check if this config matches the given template URLs (with {z}/{x}/{y} placeholders)
   * @param templates - Single template URL or array of template URLs
   */
  matchTemplate(templates: string | string[]): boolean;

  /**
   * Check if this config matches the given tile URLs (with actual coordinates)
   * @param tiles - Single tile URL or array of tile URLs
   */
  matchTileUrl(tiles: string | string[]): boolean;

  /**
   * Extract tile coordinates (z, x, y) from a URL using this config's templates
   * @param url - Tile URL to extract coordinates from
   * @returns Tile coordinates or null if not found
   */
  extractCoords(url: string): TileCoords | null;

  /**
   * Serialize the config to a plain object for postMessage
   */
  toJSON(): LayerConfigJSON;

  /**
   * Create a LayerConfig from a plain object (e.g., from postMessage)
   */
  static fromJSON(obj: LayerConfigOptions | LayerConfigJSON): LayerConfig;
}

/**
 * Registry for layer configurations
 */
export class LayerConfigRegistry {
  constructor();

  /**
   * Get a layer config by id
   */
  get(id: string): LayerConfig | undefined;

  /**
   * Register a new layer config
   */
  register(config: LayerConfig): void;

  /**
   * Remove a layer config by id
   */
  remove(id: string): boolean;

  /**
   * Detect layer config from tile URL templates (with {z}/{x}/{y} placeholders)
   * @param templates - Single template URL or array of template URLs
   */
  detectFromTemplates(templates: string | string[]): LayerConfig | undefined;

  /**
   * Detect layer config from actual tile URLs (with numeric coordinates)
   * @param urls - Single tile URL or array of tile URLs
   */
  detectFromTileUrls(urls: string | string[]): LayerConfig | undefined;

  /**
   * Get all available layer config ids
   */
  getAvailableIds(): string[];

  /**
   * Create a new registry with all configs from this registry plus extra configs.
   * @param extraLayerConfigs - Additional configs to add
   */
  createMergedRegistry(extraLayerConfigs?: LayerConfig[]): LayerConfigRegistry;

  /**
   * Parse a tile URL into its components: layer config and coordinates
   * @param url - Tile URL to parse
   * @returns Parsed tile URL result or null if not matched
   */
  parseTileUrl(url: string): ParsedTileUrl | null;
}

/** Default registry with built-in configs */
export const layerConfigs: LayerConfigRegistry;

/**
 * Tile coordinates
 */
export interface TileCoords {
  z: number;
  x: number;
  y: number;
}

/**
 * Parsed tile URL result
 */
export interface ParsedTileUrl {
  layerConfig: LayerConfig;
  coords: TileCoords;
}
