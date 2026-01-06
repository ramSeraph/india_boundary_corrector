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
  /** Minimum zoom level for this style (default: layerConfig.startZoom) */
  startZoom?: number;
  /** Maximum zoom level for this style (default: Infinity) */
  endZoom?: number;
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
  /** Tile URL templates for matching (e.g., "https://{s}.tile.example.com/{z}/{x}/{y}.png") */
  tileUrlTemplates?: string | string[];
  /** Line width stops: map of zoom level to line width (at least 2 entries) */
  lineWidthStops?: Record<number, number>;
  /** Line styles array - lines are drawn in order */
  lineStyles?: LineStyle[];
  /** Factor to multiply line width for deletion blur (default: 1.5) */
  delWidthFactor?: number;
  /** Factor to extend add lines by (multiplied by deletion line width) (default: 0.5) */
  lineExtensionFactor?: number;
}

/**
 * Layer configuration class for boundary corrections
 */
export class LayerConfig {
  readonly id: string;
  readonly startZoom: number;
  readonly zoomThreshold: number;
  readonly tileUrlTemplates: string[];
  readonly lineWidthStops: Record<number, number>;
  readonly lineStyles: LineStyle[];
  readonly delWidthFactor: number;
  readonly lineExtensionFactor: number;

  constructor(options: LayerConfigOptions);

  /**
   * Get line styles active at a given zoom level
   * @param z - Zoom level
   */
  getLineStylesForZoom(z: number): LineStyle[];

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
  toJSON(): LayerConfigOptions;

  /**
   * Create a LayerConfig from a plain object (e.g., from postMessage)
   */
  static fromJSON(obj: LayerConfigOptions): LayerConfig;
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
