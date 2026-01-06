/**
 * Shared constants for service worker communication.
 */

/**
 * Message types for communication between main thread and service worker.
 */
export const MessageTypes = {
  ADD_LAYER_CONFIG: 'ADD_LAYER_CONFIG',
  REMOVE_LAYER_CONFIG: 'REMOVE_LAYER_CONFIG',
  SET_PMTILES_URL: 'SET_PMTILES_URL',
  SET_ENABLED: 'SET_ENABLED',
  SET_FALLBACK_ON_CORRECTION_FAILURE: 'SET_FALLBACK_ON_CORRECTION_FAILURE',
  SET_CACHE_MAX_FEATURES: 'SET_CACHE_MAX_FEATURES',
  CLEAR_CACHE: 'CLEAR_CACHE',
  GET_STATUS: 'GET_STATUS',
  RESET_CONFIG: 'RESET_CONFIG',
};
