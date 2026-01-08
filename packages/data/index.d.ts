/**
 * Default CDN URL for the PMTiles file (jsDelivr with pinned version)
 */
export const DEFAULT_CDN_URL: string;

/**
 * Get the URL for the PMTiles file.
 * Automatically detects the correct URL based on the environment:
 * - ESM bundlers: Uses import.meta.url
 * - IIFE/script tags: Uses document.currentScript.src
 * - Fallback: jsDelivr CDN URL
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

/**
 * Resolve PMTiles URL from a given script URL.
 * Useful for testing URL resolution logic.
 * @param scriptUrl - The script URL to resolve from
 * @returns The resolved PMTiles URL
 */
export function resolvePmtilesUrl(scriptUrl: string): string;
