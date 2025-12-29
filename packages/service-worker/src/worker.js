/**
 * Service Worker script for intercepting tile requests and applying
 * India boundary corrections.
 * 
 * This file should be served as the service worker script.
 * It bundles all dependencies for standalone use.
 */

import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs, LayerConfigRegistry, LayerConfig, parseTileUrl } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Message types
const MessageTypes = {
  ADD_LAYER_CONFIG: 'ADD_LAYER_CONFIG',
  REMOVE_LAYER_CONFIG: 'REMOVE_LAYER_CONFIG',
  SET_PMTILES_URL: 'SET_PMTILES_URL',
  SET_ENABLED: 'SET_ENABLED',
  CLEAR_CACHE: 'CLEAR_CACHE',
  GET_STATUS: 'GET_STATUS',
};

// Cache name for corrected tiles
const CACHE_NAME = 'india-boundary-corrections-v1';

// State
let registry = new LayerConfigRegistry();
let tileFixer = null;
let pmtilesUrl = null; // Will be set lazily or via message
let enabled = true;
let tileSize = 256;

// Initialize registry with default configs
for (const id of layerConfigs.getAvailableIds()) {
  registry.register(layerConfigs.get(id));
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
  
  return parseTileUrl(request.url, registry);
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
  
  // Fetch tile with CORS mode and corrections in parallel
  const [tileResponse, corrections] = await Promise.all([
    fetch(request.url, { mode: 'cors' }),
    fixer.getCorrections(z, x, y),
  ]);
  
  if (!tileResponse.ok) {
    return tileResponse;
  }
  
  // Check if there are any corrections to apply
  const hasCorrections = Object.values(corrections).some(arr => arr.length > 0);
  
  if (!hasCorrections) {
    return tileResponse;
  }
  
  // Apply corrections
  const tileData = await tileResponse.arrayBuffer();
  const fixedTileData = await fixer.fixTile(
    corrections,
    tileData,
    layerConfig,
    z,
    tileSize
  );
  
  // Return corrected tile
  return new Response(fixedTileData, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': tileResponse.headers.get('Cache-Control') || 'max-age=3600',
      'X-Boundary-Corrected': 'true',
    },
  });
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
        
      case MessageTypes.GET_STATUS:
        port?.postMessage({
          enabled,
          pmtilesUrl: pmtilesUrl || getPmtilesUrl(),
          configIds: registry.getAvailableIds(),
          cacheSize: tileFixer?.getCache()?.size ?? 0,
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
