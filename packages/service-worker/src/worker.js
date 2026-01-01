/**
 * Service Worker script for intercepting tile requests and applying
 * India boundary corrections.
 * 
 * This file should be served as the service worker script.
 * It bundles all dependencies for standalone use.
 */

import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Message types
const MessageTypes = {
  ADD_LAYER_CONFIG: 'ADD_LAYER_CONFIG',
  REMOVE_LAYER_CONFIG: 'REMOVE_LAYER_CONFIG',
  SET_PMTILES_URL: 'SET_PMTILES_URL',
  SET_ENABLED: 'SET_ENABLED',
  CLEAR_CACHE: 'CLEAR_CACHE',
  GET_STATUS: 'GET_STATUS',
  RESET_CONFIG: 'RESET_CONFIG',
};

// Cache name for corrected tiles
const CACHE_NAME = 'india-boundary-corrections-v1';

// State
let registry = layerConfigs.createMergedRegistry();
let tileFixer = null;
let pmtilesUrl = null; // Will be set lazily or via message
let enabled = true;
let tileSize = 256;

// Reset to default configuration
function resetConfig() {
  pmtilesUrl = null;
  tileFixer = null;
  enabled = true;
  registry = layerConfigs.createMergedRegistry();
}

// Initialize TileFixer lazily
function getTileFixer() {
  if (!tileFixer) {
    if (!pmtilesUrl) {
      pmtilesUrl = getPmtilesUrl();
    }
    tileFixer = new TileFixer(pmtilesUrl);
  }
  return tileFixer;
}

// Reinitialize TileFixer with new URL
function reinitTileFixer() {
  tileFixer = new TileFixer(pmtilesUrl);
}

/**
 * Check if a request is for a map tile that we should intercept.
 * @param {Request} request
 * @returns {{ layerConfig: Object, coords: { z: number, x: number, y: number } } | null}
 */
function shouldIntercept(request) {
  if (!enabled) return null;
  if (request.method !== 'GET') return null;
  
  return registry.parseTileUrl(request.url);
}

/**
 * Fetch and fix a tile for service worker.
 * Extracted for testability.
 * @param {string} tileUrl - URL of the raster tile
 * @param {number} z - Zoom level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {TileFixer} tileFixer - TileFixer instance
 * @param {Object} layerConfig - Layer configuration
 * @param {number} tileSize - Tile size in pixels
 * @param {Object} [options] - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchAndFixTile(tileUrl, z, x, y, tileFixer, layerConfig, tileSize, options = {}) {
  const { data, wasFixed } = await tileFixer.fetchAndFixTile(
    tileUrl, z, x, y, layerConfig, { tileSize, mode: 'cors', ...options }
  );
  
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=3600',
      'X-Boundary-Corrected': wasFixed ? 'true' : 'false',
    },
  });
}

/**
 * Apply corrections to a tile.
 * @param {Request} request
 * @param {Object} layerConfig
 * @param {{ z: number, x: number, y: number }} coords
 * @returns {Promise<Response>}
 */
async function applyCorrectedTile(request, layerConfig, coords) {
  const { z, x, y } = coords;
  const fixer = getTileFixer();
  
  return fetchAndFixTile(request.url, z, x, y, fixer, layerConfig, tileSize);
}

// Install event
self.addEventListener('install', (event) => {
  console.log('[CorrectionSW] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[CorrectionSW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch event - intercept tile requests
self.addEventListener('fetch', (event) => {
  const intercept = shouldIntercept(event.request);
  
  if (intercept) {
    event.respondWith(
      applyCorrectedTile(event.request, intercept.layerConfig, intercept.coords)
        .catch((error) => {
          console.warn('[CorrectionSW] Error applying corrections:', error);
          // Fallback to original request
          return fetch(event.request);
        })
    );
  }
});

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  const { type, ...data } = event.data;
  const port = event.ports[0];
  
  try {
    switch (type) {
      case MessageTypes.ADD_LAYER_CONFIG:
        // Reconstruct LayerConfig from plain object
        const config = LayerConfig.fromJSON(data.layerConfig);
        registry.register(config);
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.REMOVE_LAYER_CONFIG:
        const removed = registry.remove(data.configId);
        port?.postMessage({ success: removed });
        break;
        
      case MessageTypes.SET_PMTILES_URL:
        pmtilesUrl = data.pmtilesUrl;
        reinitTileFixer();
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.SET_ENABLED:
        enabled = data.enabled;
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.CLEAR_CACHE:
        caches.delete(CACHE_NAME).then(() => {
          tileFixer?.clearCache();
          port?.postMessage({ success: true });
        });
        break;
        
      case MessageTypes.RESET_CONFIG:
        resetConfig();
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.GET_STATUS:
        port?.postMessage({
          enabled,
          pmtilesUrl: pmtilesUrl || getPmtilesUrl(),
          configIds: registry.getAvailableIds(),
        });
        break;
        
      default:
        port?.postMessage({ error: `Unknown message type: ${type}` });
    }
  } catch (error) {
    port?.postMessage({ error: error.message });
  }
});

console.log('[CorrectionSW] Service worker loaded');
