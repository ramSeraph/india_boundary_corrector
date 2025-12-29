/**
 * PMTiles corrections fetcher with LRU caching and overzoom support
 * 
 * This implementation is heavily inspired by and adapts code from:
 * protomaps-leaflet (https://github.com/protomaps/protomaps-leaflet)
 * Copyright (c) 2021 Brandon Liu
 * Licensed under BSD 3-Clause License
 * 
 * Protomaps-leaflet concepts and patterns used:
 * - TileCache: In-flight request deduplication, LRU cache with performance.now()
 * - PmtilesSource: PMTiles tile fetching pattern
 * - View.dataTileForDisplayTile(): Overzoom coordinate calculation logic
 * - toIndex(): Tile key generation (x:y:z format)
 * - parseTile(): Vector tile parsing with @mapbox/vector-tile
 * 
 * Key adaptations for India boundary corrections:
 * - Modified feature format to include 'extent' field needed for coordinate scaling
 * - Simplified overzoom logic (removed levelDiff complexity)
 * - Configurable cache size (protomaps uses fixed 64)
 * - Plain geometry objects {x, y} instead of Point class
 * - transformForOverzoom() adapted from View's coordinate transform logic
 * 
 * Thank you to the protomaps team for the excellent reference implementation!
 */

import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const DEFAULT_CACHE_SIZE = 64;

/**
 * Generate cache key from tile coordinates.
 * Based on protomaps-leaflet toIndex function.
 * @param {number} z
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
function toIndex(z, x, y) {
  return `${x}:${y}:${z}`;
}

/**
 * Parse a vector tile buffer into a map of layer name to features.
 * Adapted from protomaps-leaflet parseTile function.
 * @param {ArrayBuffer} buffer - The raw tile data
 * @returns {Object<string, Array>} Map of layer name to array of features
 */
function parseTile(buffer) {
  const tile = new VectorTile(new Protobuf(buffer));
  const result = {};
  for (const [layerName, layer] of Object.entries(tile.layers)) {
    const features = [];
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      features.push({
        id: feature.id,
        type: feature.type,
        properties: feature.properties,
        geometry: feature.loadGeometry(),
        extent: layer.extent,
      });
    }
    result[layerName] = features;
  }
  return result;
}

/**
 * Transform features for overzoom by scaling and translating geometry.
 * When overzooming, we take a parent tile and extract/scale the relevant quadrant.
 * @param {Object<string, Array>} corrections - Original corrections
 * @param {number} scale - Scale factor (2^(zoom - maxDataZoom))
 * @param {number} offsetX - X offset within parent (0 to scale-1)
 * @param {number} offsetY - Y offset within parent (0 to scale-1)
 * @returns {Object<string, Array>} Transformed corrections
 */
function transformForOverzoom(corrections, scale, offsetX, offsetY) {
  const result = {};
  for (const [layerName, features] of Object.entries(corrections)) {
    result[layerName] = features.map(feature => {
      const extent = feature.extent;
      // Each child tile covers (extent/scale) units of the parent
      const childExtent = extent / scale;
      // The child tile starts at this position in parent coordinates
      const startX = offsetX * childExtent;
      const startY = offsetY * childExtent;
      
      const newGeometry = feature.geometry.map(ring => {
        return ring.map(point => {
          // Translate to child tile origin, then scale up to full extent
          const x = (point.x - startX) * scale;
          const y = (point.y - startY) * scale;
          return { x, y };
        });
      });
      return {
        ...feature,
        geometry: newGeometry,
        // Keep original extent since we scaled coordinates to match
        extent: extent,
      };
    });
  }
  return result;
}

/**
 * PMTiles corrections source with LRU caching and overzoom support.
 * Based on protomaps-leaflet TileCache and PmtilesSource.
 */
export class CorrectionsSource {
  /**
   * @param {string} pmtilesUrl - URL to the PMTiles file
   * @param {Object} [options] - Options
   * @param {number} [options.cacheSize=64] - Maximum number of tiles to cache
   * @param {number} [options.maxDataZoom] - Maximum zoom level in PMTiles (auto-detected if not provided)
   */
  constructor(pmtilesUrl, options = {}) {
    this.pmtilesUrl = pmtilesUrl;
    this.pmtiles = new PMTiles(pmtilesUrl);
    this.cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
    this.maxDataZoom = options.maxDataZoom;
    
    // Cache based on protomaps-leaflet TileCache pattern
    this.cache = new Map(); // Maps toIndex(z,x,y) -> {used: timestamp, data: corrections}
    this.inflight = new Map(); // Maps toIndex(z,x,y) -> [{resolve, reject}]
  }

  /**
   * Get the PMTiles source object.
   * @returns {PMTiles}
   */
  getSource() {
    return this.pmtiles;
  }

  /**
   * Clear the tile cache.
   */
  clearCache() {
    this.cache.clear();
    this.inflight.clear();
  }

  /**
   * Auto-detect max zoom from PMTiles metadata.
   * @returns {Promise<number>}
   * @private
   */
  async _getMaxDataZoom() {
    if (this.maxDataZoom !== undefined) {
      return this.maxDataZoom;
    }
    
    const header = await this.pmtiles.getHeader();
    this.maxDataZoom = header.maxZoom;
    return this.maxDataZoom;
  }

  /**
   * Fetch and parse a tile from PMTiles.
   * Implements in-flight request deduplication from protomaps-leaflet.
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @returns {Promise<Object<string, Array>>}
   * @private
   */
  async _fetchTile(z, x, y) {
    const idx = toIndex(z, x, y);
    
    return new Promise((resolve, reject) => {
      // Check cache first
      const entry = this.cache.get(idx);
      if (entry) {
        // Update LRU timestamp (protomaps pattern)
        entry.used = performance.now();
        resolve(entry.data);
        return;
      }

      // Check if already in-flight
      const ifentry = this.inflight.get(idx);
      if (ifentry) {
        // Add to waiting list
        ifentry.push({ resolve, reject });
        return;
      }

      // Start new fetch
      this.inflight.set(idx, []);
      
      this.pmtiles.getZxy(z, x, y)
        .then((result) => {
          let data;
          if (result) {
            data = parseTile(result.data);
          } else {
            // Cache empty result to avoid repeated fetches
            data = {};
          }

          // Cache the result
          this.cache.set(idx, { used: performance.now(), data });

          // Resolve all waiting promises
          const ifentry2 = this.inflight.get(idx);
          if (ifentry2) {
            for (const waiter of ifentry2) {
              waiter.resolve(data);
            }
          }
          this.inflight.delete(idx);
          resolve(data);

          // Evict LRU entry if cache is full (protomaps pattern)
          if (this.cache.size > this.cacheSize) {
            let minUsed = Infinity;
            let minKey = undefined;
            this.cache.forEach((value, key) => {
              if (value.used < minUsed) {
                minUsed = value.used;
                minKey = key;
              }
            });
            if (minKey) {
              this.cache.delete(minKey);
            }
          }
        })
        .catch((e) => {
          // Reject all waiting promises
          const ifentry2 = this.inflight.get(idx);
          if (ifentry2) {
            for (const waiter of ifentry2) {
              waiter.reject(e);
            }
          }
          this.inflight.delete(idx);
          reject(e);
        });
    });
  }

  /**
   * Get corrections for a tile as a dict of layer name to features.
   * Supports overzoom beyond maxDataZoom by scaling parent tile data.
   * @param {number} z - Zoom level
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {Promise<Object<string, Array>>} Map of layer name to array of features
   */
  async get(z, x, y) {
    const maxDataZoom = await this._getMaxDataZoom();
    
    // Handle overzoom: fetch parent tile and transform
    if (z > maxDataZoom) {
      const zoomDiff = z - maxDataZoom;
      const scale = 1 << zoomDiff; // 2^zoomDiff
      
      // Calculate parent tile coordinates
      const parentX = Math.floor(x / scale);
      const parentY = Math.floor(y / scale);
      
      // Calculate offset within parent tile (0 to scale-1)
      const offsetX = x % scale;
      const offsetY = y % scale;
      
      const corrections = await this._fetchTile(maxDataZoom, parentX, parentY);
      if (Object.keys(corrections).length > 0) {
        return transformForOverzoom(corrections, scale, offsetX, offsetY);
      }
      return {};
    }
    
    return await this._fetchTile(z, x, y);
  }
}
