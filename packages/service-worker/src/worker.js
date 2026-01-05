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
import { MessageTypes } from './constants.js';

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
 * Apply corrections to a tile and return a Response.
 * @param {Request} request
 * @param {Object} layerConfig
 * @param {{ z: number, x: number, y: number }} coords
 * @returns {Promise<Response>}
 */
async function applyCorrectedTile(request, layerConfig, coords) {
  const { z, x, y } = coords;
  const fixer = getTileFixer();
  
  const { data, wasFixed, correctionsFailed, correctionsError } = await fixer.fetchAndFixTile(
    request.url, z, x, y, layerConfig, { tileSize, mode: 'cors' }
  );
  
  if (correctionsFailed) {
    console.warn('[CorrectionSW] Corrections fetch failed:', correctionsError);
  }
  
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=3600',
      'X-Boundary-Corrected': wasFixed ? 'true' : 'false',
    },
  });
}

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch event - intercept tile requests
self.addEventListener('fetch', (event) => {
  const intercept = shouldIntercept(event.request);
  
  if (intercept) {
    event.respondWith(
      applyCorrectedTile(event.request, intercept.layerConfig, intercept.coords)
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
        tileFixer?.clearCache();
        port?.postMessage({ success: true });
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
