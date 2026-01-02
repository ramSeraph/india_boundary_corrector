import { dataVersion } from './data_version.js';
import { packageVersion } from './version.js';

// Package info for CDN URL construction
const PACKAGE_NAME = '@india-boundary-corrector/data';
const PMTILES_FILENAME = 'india_boundary_corrections.pmtiles';

// Default CDN URL with pinned package version
const DEFAULT_CDN_URL = `https://unpkg.com/${PACKAGE_NAME}@${packageVersion}/${PMTILES_FILENAME}`;

/**
 * Layer names in the PMTiles file
 */
export const layers = {
  toAddOsm: 'to-add-osm',
  toDelOsm: 'to-del-osm',
  toAddNe: 'to-add-ne',
  toDelNe: 'to-del-ne',
};

/**
 * Detect the PMTiles URL from various sources:
 * 1. import.meta.url (for ESM bundlers - most reliable)
 * 2. Fallback to unpkg CDN with pinned version
 * 
 * Note: When this package is bundled into another bundle, import.meta.url
 * won't work and we fall back to the CDN URL. Users can override with
 * setPmtilesUrl() for self-hosted scenarios.
 */
function detectPmtilesUrl() {
  // Try import.meta.url first (works in ESM environments)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      const moduleUrl = new URL('.', import.meta.url);
      return new URL(PMTILES_FILENAME, moduleUrl).href;
    }
  } catch {
    // import.meta not available (UMD/CJS/bundled)
  }

  // Fallback to CDN with pinned version
  // This ensures it works even when bundled into another package
  return DEFAULT_CDN_URL;
}

// Cache the detected URL
let cachedPmtilesUrl = null;

/**
 * Get the URL for the PMTiles file.
 * 
 * Detection priority:
 * 1. Manually set URL via setPmtilesUrl()
 * 2. import.meta.url (ESM environments)
 * 3. unpkg CDN fallback (pinned to current version)
 * 
 * For self-hosted deployments or custom bundling scenarios,
 * use setPmtilesUrl().
 * 
 * @returns {string} URL to the PMTiles file
 */
export function getPmtilesUrl() {
  if (cachedPmtilesUrl === null) {
    cachedPmtilesUrl = detectPmtilesUrl();
  }
  return cachedPmtilesUrl;
}

/**
 * Manually set the PMTiles URL.
 * Use this for self-hosted deployments or custom bundling scenarios.
 * 
 * @param {string} url - The URL to the PMTiles file
 * 
 * @example
 * // Self-hosted
 * setPmtilesUrl('/assets/india_boundary_corrections.pmtiles');
 * 
 * @example
 * // Different CDN
 * setPmtilesUrl('https://my-cdn.com/india_boundary_corrections.pmtiles');
 */
export function setPmtilesUrl(url) {
  cachedPmtilesUrl = url;
}

/**
 * Get the data version string
 * @returns {string} Data version identifier
 */
export function getDataVersion() {
  return dataVersion;
}
