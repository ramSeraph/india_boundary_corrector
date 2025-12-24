/**
 * Layer names in the PMTiles file
 */
export const layers: {
  toAddOsm: string;
  toDelOsm: string;
  toAddNe: string;
  toDelNe: string;
};

/**
 * Get the URL for the PMTiles file.
 * Automatically detects the correct URL based on the environment:
 * - ESM bundlers: Uses import.meta.url
 * - CDN (unpkg/jsdelivr): Derives from script src
 * - Fallback: unpkg CDN URL
 */
export function getPmtilesUrl(): string;

/**
 * Manually set the PMTiles URL (useful for custom hosting)
 * @param url - The URL to the PMTiles file
 */
export function setPmtilesUrl(url: string): void;

/**
 * Get the data version string
 * Format: osm_YYYYMMDD_HHMMSS_ne_VERSION
 */
export function getDataVersion(): string;
