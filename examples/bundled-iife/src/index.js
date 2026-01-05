import { getPmtilesUrl, setPmtilesUrl, getDataVersion, layers } from '@india-boundary-corrector/data';

/**
 * Wrapper to test how getPmtilesUrl behaves in an IIFE bundle
 */
export function getUrl() {
  return getPmtilesUrl();
}

export function setUrl(url) {
  setPmtilesUrl(url);
}

export function getVersion() {
  return getDataVersion();
}

export function getLayers() {
  return layers;
}

// Auto-log on load for easy testing
console.log('=== India Boundary Data Package - IIFE Bundle Test ===');
console.log('Data Version:', getDataVersion());
console.log('Layers:', layers);
console.log('PMTiles URL:', getPmtilesUrl());
