import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Path to the PMTiles file containing India boundary corrections
 * Layers:
 * - to-add-osm: Boundaries to add (from OSM perspective)
 * - to-del-osm: Boundaries to delete (from OSM perspective)  
 * - to-add-ne: Boundaries to add (from Natural Earth perspective)
 * - to-del-ne: Boundaries to delete (from Natural Earth perspective)
 */
export const pmtilesPath = join(__dirname, 'india_boundary_corrections.pmtiles');

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
 * @returns {Promise<string>} Data version identifier
 */
export async function getDataVersion() {
  try {
    const { dataVersion } = await import('./version.js');
    return dataVersion;
  } catch (e) {
    return 'unknown';
  }
}
