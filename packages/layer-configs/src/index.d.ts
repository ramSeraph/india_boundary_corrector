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
}

/**
 * Configuration options for LayerConfig
 */
export interface LayerConfigOptions {
  /** Unique identifier for this config */
  id: string;
  /** Minimum zoom to start rendering (default: 0) */
  startZoom?: number;
  /** Zoom level to switch from NE to OSM data (default: 5) */
  zoomThreshold?: number;
  /** Regex pattern for matching tile URLs */
  tileUrlPattern?: RegExp | string | null;
  /** Line width stops: map of zoom level to line width (at least 2 entries) */
  lineWidthStops?: Record<number, number>;
  /** Line styles array - lines are drawn in order */
  lineStyles?: LineStyle[];
  /** Factor to multiply line width for deletion blur (default: 1.5) */
  delWidthFactor?: number;
}

/**
 * Layer configuration class for boundary corrections
 */
export class LayerConfig {
  readonly id: string;
  readonly startZoom: number;
  readonly zoomThreshold: number;
  readonly tileUrlPattern: RegExp | null;
  readonly lineWidthStops: Record<number, number>;
  readonly lineStyles: LineStyle[];
  readonly delWidthFactor: number;

  constructor(options: LayerConfigOptions);

  /**
   * Check if this config matches the given tile URLs
   * @param tiles - Single tile URL or array of tile URL templates
   */
  match(tiles: string | string[]): boolean;

  /**
   * Serialize the config to a plain object for postMessage
   */
  toJSON(): LayerConfigOptions;

  /**
   * Create a LayerConfig from a plain object (e.g., from postMessage)
   */
  static fromJSON(obj: LayerConfigOptions): LayerConfig;

  /**
   * Extract z, x, y from a tile URL.
   * Supports common patterns like /{z}/{x}/{y}.png
   * @param url - Tile URL to parse
   * @returns Tile coordinates or null if not found
   */
  static extractTileCoords(url: string): TileCoords | null;
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
   * Detect layer config from raster tile URLs
   * @param tiles - Single tile URL or array of tile URL templates
   */
  detectFromUrls(tiles: string | string[]): LayerConfig | undefined;

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

/** Pre-built config for CartoDB dark tiles */
export const cartoDbDark: LayerConfig;

/** Pre-built config for OpenStreetMap standard tiles */
export const osmCarto: LayerConfig;

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
