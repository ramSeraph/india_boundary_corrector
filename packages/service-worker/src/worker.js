/**
 * Service Worker script for intercepting tile requests and applying
 * India boundary corrections.
 * 
 * This file should be served as the service worker script.
 * It bundles all dependencies for standalone use.
 */

import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs, LayerConfig, LayerConfigRegistry } from '@india-boundary-corrector/layer-configs';
import { TileFixer, TileFetchError } from '@india-boundary-corrector/tilefixer';
import { MessageTypes } from './constants.js';

// Per-client settings
// Map of clientId -> { registry, pmtilesUrl, enabled, fallbackOnCorrectionFailure }
const clientSettings = new Map();

/**
 * Get default settings for a new client.
 */
function createDefaultSettings() {
  return {
    registry: layerConfigs.createMergedRegistry(),
    pmtilesUrl: null, // Will use default lazily
    enabled: true,
    fallbackOnCorrectionFailure: true,
  };
}

/**
 * Get settings for a client, creating defaults if not exists.
 * @param {string} clientId
 * @returns {Object}
 */
function getClientSettings(clientId) {
  if (!clientId) {
    // No client ID (e.g., navigation request) - use a default client
    clientId = '__default__';
  }
  if (!clientSettings.has(clientId)) {
    clientSettings.set(clientId, createDefaultSettings());
  }
  return clientSettings.get(clientId);
}

/**
 * Reset settings for a client to defaults.
 * @param {string} clientId
 */
function resetClientSettings(clientId) {
  clientSettings.set(clientId, createDefaultSettings());
}

/**
 * Clean up settings for clients that no longer exist.
 */
async function cleanupStaleClients() {
  const activeClients = await self.clients.matchAll({ includeUncontrolled: true });
  const activeIds = new Set(activeClients.map(c => c.id));
  activeIds.add('__default__');
  
  for (const clientId of clientSettings.keys()) {
    if (!activeIds.has(clientId)) {
      clientSettings.delete(clientId);
    }
  }
}

/**
 * Get TileFixer for a given pmtilesUrl.
 * @param {string|null} pmtilesUrl
 * @returns {TileFixer}
 */
function getTileFixer(pmtilesUrl) {
  return TileFixer.getOrCreate(pmtilesUrl || getPmtilesUrl());
}

/**
 * Check if a request is for a map tile that we should intercept.
 * @param {Request} request
 * @param {Object} settings - Client settings
 * @returns {{ layerConfig: Object, coords: { z: number, x: number, y: number } } | null}
 */
function shouldIntercept(request, settings) {
  if (!settings.enabled) return null;
  if (request.method !== 'GET') return null;
  
  return settings.registry.parseTileUrl(request.url);
}

/**
 * Apply corrections to a tile and return a Response.
 * @param {Request} request
 * @param {Object} layerConfig
 * @param {{ z: number, x: number, y: number }} coords
 * @param {Object} settings - Client settings
 * @returns {Promise<Response>}
 */
async function applyCorrectedTile(request, layerConfig, coords, settings) {
  const { z, x, y } = coords;
  const fixer = getTileFixer(settings.pmtilesUrl);
  
  // Create a new AbortController and forward abort from request.signal
  // (request.signal doesn't propagate automatically in service workers)
  const controller = new AbortController();
  if (request.signal) {
    request.signal.addEventListener('abort', () => controller.abort());
  }
  
  // Use cors mode since we need to read the tile response.
  const fetchOptions = {
    signal: controller.signal,
    mode: 'cors',
  };
  
  const { data, wasFixed, correctionsFailed, correctionsError } = await fixer.fetchAndFixTile(
    request.url, z, x, y, layerConfig, fetchOptions, settings.fallbackOnCorrectionFailure
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
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      cleanupStaleClients(),
    ])
  );
});

// Fetch event - intercept tile requests
self.addEventListener('fetch', (event) => {
  const settings = getClientSettings(event.clientId);
  const intercept = shouldIntercept(event.request, settings);
  
  if (intercept) {
    event.respondWith(
      applyCorrectedTile(event.request, intercept.layerConfig, intercept.coords, settings)
        .catch((error) => {
          // Don't log abort errors - they're intentional cancellations
          if (error.name === 'AbortError') {
            throw error;
          }
          const status = error instanceof TileFetchError ? error.status : 502;
          const body = error instanceof TileFetchError ? error.body : null;
          return new Response(body, { status, statusText: error.message });
        })
    );
  }
});

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  const { type, ...data } = event.data;
  const port = event.ports[0];
  const clientId = event.source?.id || '__default__';
  const settings = getClientSettings(clientId);
  
  try {
    switch (type) {
      case MessageTypes.ADD_LAYER_CONFIG:
        // Reconstruct LayerConfig from plain object
        const config = LayerConfig.fromJSON(data.layerConfig);
        settings.registry.register(config);
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.REMOVE_LAYER_CONFIG:
        const removed = settings.registry.remove(data.configId);
        port?.postMessage({ success: removed });
        break;
        
      case MessageTypes.SET_PMTILES_URL:
        settings.pmtilesUrl = data.pmtilesUrl;
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.SET_ENABLED:
        settings.enabled = data.enabled;
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.SET_FALLBACK_ON_CORRECTION_FAILURE:
        settings.fallbackOnCorrectionFailure = data.fallbackOnCorrectionFailure;
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.SET_CACHE_MAX_FEATURES:
        // This is global - affects all TileFixer instances
        TileFixer.setDefaultCacheMaxFeatures(data.cacheMaxFeatures);
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.CLEAR_CACHE:
        // Clear cache for this client's TileFixer
        const fixer = getTileFixer(settings.pmtilesUrl);
        fixer?.clearCache();
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.RESET_CONFIG:
        resetClientSettings(clientId);
        port?.postMessage({ success: true });
        break;
        
      case MessageTypes.GET_STATUS:
        port?.postMessage({
          enabled: settings.enabled,
          fallbackOnCorrectionFailure: settings.fallbackOnCorrectionFailure,
          pmtilesUrl: settings.pmtilesUrl || getPmtilesUrl(),
          configIds: settings.registry.getAvailableIds(),
        });
        break;
        
      case MessageTypes.CLAIM_CLIENTS:
        self.clients.claim().then(() => {
          port?.postMessage({ success: true });
        }).catch((error) => {
          port?.postMessage({ error: error.message });
        });
        return; // Don't fall through to sync postMessage
        
      default:
        port?.postMessage({ error: `Unknown message type: ${type}` });
    }
  } catch (error) {
    port?.postMessage({ error: error.message });
  }
});
