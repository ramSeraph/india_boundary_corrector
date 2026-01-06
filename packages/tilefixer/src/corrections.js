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

// Default cache size: enough to cache all tiles in PMTiles
// 6136 tiles with ~10.7k total features, uses ~0.5MB memory
// Note: Default is set in TileFixer._defaultCacheMaxFeatures

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
 * Count total features in a parsed corrections object.
 * @param {Object<string, Array>} corrections - Parsed corrections
 * @returns {number} Total feature count
 */
function countFeatures(corrections) {
  let count = 0;
  for (const features of Object.values(corrections)) {
    count += features.length;
  }
  return count;
}

/**
 * Check if corrections object is empty.
 * @param {Object<string, Array>} corrections - Parsed corrections
 * @returns {boolean}
 */
function isEmpty(corrections) {
  return countFeatures(corrections) === 0;
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
   * @param {number} [options.cacheMaxFeatures=10000] - Maximum number of features to cache
   * @param {number} [options.maxDataZoom] - Maximum zoom level in PMTiles (auto-detected if not provided)
   */
  constructor(pmtilesUrl, options = {}) {
    this.pmtilesUrl = pmtilesUrl;
    this.pmtiles = new PMTiles(pmtilesUrl);
    this.cacheMaxFeatures = options.cacheMaxFeatures;
    this.maxDataZoom = options.maxDataZoom;
    
    // Cache based on protomaps-leaflet TileCache pattern
    // Maps toIndex(z,x,y) -> {used: timestamp, data: corrections, featureCount: number, empty: boolean}
    this.cache = new Map();
    this.inflight = new Map(); // Maps toIndex(z,x,y) -> [{resolve, reject}]
    this.cachedFeatureCount = 0; // Track total features in cache
    
    // Separate tracking for empty vs non-empty entries for efficient eviction
    // Empty entries are evicted first since they're cheap to re-fetch
    this.emptyKeys = new Set();
    this.nonEmptyKeys = new Set();
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
    this.cachedFeatureCount = 0;
    this.emptyKeys.clear();
    this.nonEmptyKeys.clear();
  }

  /**
   * Evict cache entries to stay under the feature limit.
   * Empty entries are evicted first (cheap to re-fetch from PMTiles directory cache).
   * Within each category, evicts LRU (least recently used) entries.
   * @private
   */
  _evictIfNeeded() {
    while (this.cachedFeatureCount > this.cacheMaxFeatures && this.cache.size > 1) {
      // Determine which set to evict from: empty first, then non-empty
      const targetSet = this.emptyKeys.size > 0 ? this.emptyKeys : this.nonEmptyKeys;
      if (targetSet.size === 0) break;
      
      // Find LRU entry within the target set
      let evictKey = undefined;
      let minUsed = Infinity;
      for (const key of targetSet) {
        const entry = this.cache.get(key);
        if (entry && entry.used < minUsed) {
          minUsed = entry.used;
          evictKey = key;
        }
      }
      
      if (!evictKey) break;
      
      // Evict the entry
      const evicted = this.cache.get(evictKey);
      this.cachedFeatureCount -= evicted.featureCount;
      targetSet.delete(evictKey);
      this.cache.delete(evictKey);
    }
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

          // Track features and empty status for cache management
          const featureCount = countFeatures(data);
          const empty = featureCount === 0;

          // Cache the result and track in appropriate set
          this.cache.set(idx, { used: performance.now(), data, featureCount, empty });
          this.cachedFeatureCount += featureCount;
          (empty ? this.emptyKeys : this.nonEmptyKeys).add(idx);

          // Resolve all waiting promises
          const ifentry2 = this.inflight.get(idx);
          if (ifentry2) {
            for (const waiter of ifentry2) {
              waiter.resolve(data);
            }
          }
          this.inflight.delete(idx);
          resolve(data);

          // Evict if over limit
          this._evictIfNeeded();
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
