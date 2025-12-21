import { dataVersion } from './version.js';

/**
 * Get the file system path to the PMTiles file (Node.js only)
 * @returns {Promise<string>} Absolute path to the PMTiles file
 * @throws {Error} If called in a browser environment
 */
export async function getPmtilesPath() {
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('getPmtilesPath() is only available in Node.js');
  }
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, 'india_boundary_corrections.pmtiles');
}

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
 * Get the URL for the PMTiles file
 * Uses import.meta.url to generate a URL relative to this module's location.
 * Works in both browser (CDN/bundler) and Node.js environments.
 */
export function getPmtilesUrl() {
  // Use import.meta.url to construct URL relative to this module
  const moduleUrl = new URL('.', import.meta.url);
  return new URL('india_boundary_corrections.pmtiles', moduleUrl).href;
}

/**
 * Get the data version string
 * Format: osm_YYYYMMDD_HHMMSS_ne_VERSION
 * @returns {string} Data version identifier
 */
export function getDataVersion() {
  return dataVersion;
}
