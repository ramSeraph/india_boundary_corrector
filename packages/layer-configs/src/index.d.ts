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
  /** Addition line color for OSM data (zoom >= zoomThreshold) */
  osmAddLineColor?: string;
  /** Addition line color for NE data (zoom < zoomThreshold), defaults to osmAddLineColor */
  neAddLineColor?: string | null;
  /** Use dashed lines for additions */
  addLineDashed?: boolean;
  /** Dash pattern array */
  addLineDashArray?: readonly number[];
  /** Halo width ratio (0 = no halo) */
  addLineHaloRatio?: number;
  /** Halo opacity (0-1) */
  addLineHaloAlpha?: number;
  /** Line width multiplier (default: 1.0) */
  lineWidthMultiplier?: number;
}

/**
 * Layer configuration class for boundary corrections
 */
export class LayerConfig {
  readonly id: string;
  readonly startZoom: number;
  readonly zoomThreshold: number;
  readonly tileUrlPattern: RegExp | null;
  readonly osmAddLineColor: string;
  readonly neAddLineColor: string;
  readonly addLineDashed: boolean;
  readonly addLineDashArray: number[];
  readonly addLineHaloRatio: number;
  readonly addLineHaloAlpha: number;
  readonly lineWidthMultiplier: number;

  constructor(options: LayerConfigOptions);

  /**
   * Check if this config matches the given tile URLs
   * @param tiles - Single tile URL or array of tile URL templates
   */
  match(tiles: string | string[]): boolean;
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
}

/** Default registry with built-in configs */
export const layerConfigs: LayerConfigRegistry;

/** Pre-built config for CartoDB dark tiles */
export const osmCartoDark: LayerConfig;

/** Pre-built config for OpenStreetMap standard tiles */
export const osmCarto: LayerConfig;
