import { dataVersion } from './data_version.js';
import { packageVersion } from './version.js';

// Package info for CDN URL construction
const PACKAGE_NAME = '@india-boundary-corrector/data';
const PMTILES_FILENAME = 'india_boundary_corrections.pmtiles';

/**
 * CDNs that need fallback to jsDelivr:
 * - esm.sh, skypack: JS module transformers only, don't serve static files
 * - unpkg.com: Has issues serving PMTiles files (incorrect content-type, range request problems)
 */
const FALLBACK_CDNS = new Set(['esm.sh', 'skypack.dev', 'cdn.skypack.dev', 'unpkg.com']);

// Default fallback CDN (jsDelivr has multi-CDN architecture, more reliable)
export const DEFAULT_CDN_URL = `https://cdn.jsdelivr.net/npm/${PACKAGE_NAME}@${packageVersion}/${PMTILES_FILENAME}`;

// Capture document.currentScript.src at module load time (becomes null after script executes)
const CURRENT_SCRIPT_URL = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || null;

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
 * 2. document.currentScript.src (for IIFE/script tags, captured at load time)
 * 3. Fallback to jsDelivr CDN with pinned version
 * 
 * Note: When this package is bundled into another bundle, import.meta.url
 * won't work and we fall back to the CDN URL. Users can override with
 * setPmtilesUrl() for self-hosted scenarios.
 */
function detectPmtilesUrl() {
  let scriptUrl = null;

  // Try import.meta.url first (works in ESM environments)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      scriptUrl = import.meta.url;
    }
  } catch {
    // import.meta not available
  }

  // Use captured currentScript.src (for IIFE/script tags)
  if (!scriptUrl && CURRENT_SCRIPT_URL) {
    scriptUrl = CURRENT_SCRIPT_URL;
  }

  if (scriptUrl) {
    const moduleUrl = new URL('.', scriptUrl);
    // JS-only CDNs don't serve static files, fall back to default
    if (FALLBACK_CDNS.has(moduleUrl.hostname)) {
      return DEFAULT_CDN_URL;
    }
    return new URL(PMTILES_FILENAME, moduleUrl).href;
  }

  // Fallback to CDN with pinned version
  return DEFAULT_CDN_URL;
}

/**
 * Resolve PMTiles URL from a given script URL.
 * Useful for testing URL resolution logic.
 * @param {string} scriptUrl - The script URL to resolve from
 * @returns {string} The resolved PMTiles URL
 */
export function resolvePmtilesUrl(scriptUrl) {
  const moduleUrl = new URL('.', scriptUrl);
  // JS-only CDNs don't serve static files, fall back to default
  if (FALLBACK_CDNS.has(moduleUrl.hostname)) {
    return DEFAULT_CDN_URL;
  }
  return new URL(PMTILES_FILENAME, moduleUrl).href;
}

// Cache the detected URL
let cachedPmtilesUrl = null;

/**
 * Get the URL for the PMTiles file.
 * 
 * Detection priority:
 * 1. Manually set URL via setPmtilesUrl()
 * 2. import.meta.url (ESM environments)
 * 3. jsDelivr CDN fallback (pinned to current version)
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
