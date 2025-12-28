import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';

const MAX_DATA_ZOOM = 14;
const DEFAULT_CACHE_SIZE = 512;

/**
 * Simple LRU cache for parsed tile data.
 */
class TileCache {
  /**
   * @param {number} maxSize - Maximum number of tiles to cache
   */
  constructor(maxSize = DEFAULT_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Generate cache key from tile coordinates.
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @returns {string}
   */
  static key(z, x, y) {
    return `${z}/${x}/${y}`;
  }

  /**
   * Get a tile from cache.
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @returns {Object|undefined}
   */
  get(z, x, y) {
    const key = TileCache.key(z, x, y);
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Set a tile in cache.
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @param {Object} value
   */
  set(z, x, y, value) {
    const key = TileCache.key(z, x, y);
    
    // Delete if exists to refresh position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    this.cache.set(key, value);
    
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }

  /**
   * Check if tile is in cache.
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  has(z, x, y) {
    return this.cache.has(TileCache.key(z, x, y));
  }

  /**
   * Clear the cache.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current cache size.
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }
}

/**
 * Parse a vector tile buffer into a map of layer name to features.
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
 * Calculate line width based on zoom level.
 * @param {number} zoom - Zoom level
 * @param {number} multiplier - Line width multiplier
 * @param {boolean} isDel - Whether this is a deletion line (thicker)
 * @returns {number}
 */
function getLineWidth(zoom, multiplier, isDel) {
  // Add lines: zoom / 4 (min 0.5)
  // Del lines: zoom / 2 (min 1)
  if (isDel) {
    return Math.max(1, zoom / 2) * multiplier;
  }
  return Math.max(0.5, zoom / 4) * multiplier;
}

/**
 * Get median of an array of numbers.
 * @param {number[]} arr
 * @returns {number}
 */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Apply median blur along deletion paths to erase boundary lines.
 * @param {CanvasRenderingContext2D} ctx - Canvas context with the image
 * @param {Array} features - Array of deletion features
 * @param {number} lineWidth - Width of the blur path
 * @param {number} tileSize - Size of the tile in pixels
 */
function applyMedianBlurAlongPath(ctx, features, lineWidth, tileSize) {
  if (features.length === 0) return;

  // Get the image data
  const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
  const data = imageData.data;
  const width = tileSize;
  const height = tileSize;

  // Create a mask canvas to mark pixels that need blurring
  const maskCanvas = new OffscreenCanvas(tileSize, tileSize);
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.fillStyle = 'black';
  maskCtx.fillRect(0, 0, tileSize, tileSize);
  
  // Draw the deletion paths on the mask
  maskCtx.strokeStyle = 'white';
  maskCtx.lineWidth = lineWidth;
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  
  for (const feature of features) {
    const scale = tileSize / feature.extent;
    for (const ring of feature.geometry) {
      if (ring.length === 0) continue;
      maskCtx.beginPath();
      maskCtx.moveTo(ring[0].x * scale, ring[0].y * scale);
      for (let i = 1; i < ring.length; i++) {
        maskCtx.lineTo(ring[i].x * scale, ring[i].y * scale);
      }
      maskCtx.stroke();
    }
  }
  
  const maskData = maskCtx.getImageData(0, 0, tileSize, tileSize).data;
  
  // Blur radius based on line width
  const radius = Math.max(2, Math.ceil(lineWidth / 2) + 1);
  
  // Create output buffer
  const output = new Uint8ClampedArray(data);
  
  // Apply median filter to masked pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const maskIdx = (y * width + x) * 4;
      
      // Only process pixels on the deletion path (white in mask)
      if (maskData[maskIdx] < 128) continue;
      
      const rValues = [];
      const gValues = [];
      const bValues = [];
      
      // Collect neighbor pixels (excluding masked pixels)
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          const nMaskIdx = (ny * width + nx) * 4;
          // Only use pixels that are NOT on the deletion path
          if (maskData[nMaskIdx] >= 128) continue;
          
          const nIdx = nMaskIdx;
          rValues.push(data[nIdx]);
          gValues.push(data[nIdx + 1]);
          bValues.push(data[nIdx + 2]);
        }
      }
      
      // Apply median if we have enough samples
      if (rValues.length >= 3) {
        const idx = maskIdx;
        output[idx] = median(rValues);
        output[idx + 1] = median(gValues);
        output[idx + 2] = median(bValues);
        // Keep alpha unchanged
      }
    }
  }
  
  // Write back the result
  ctx.putImageData(new ImageData(output, width, height), 0, 0);
}

/**
 * Draw features on a canvas context.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} features - Array of features to draw
 * @param {string} color - Line color
 * @param {number} lineWidth - Line width
 * @param {number} tileSize - Size of the tile in pixels
 * @param {boolean} dashed - Whether to use dashed lines
 * @param {number[]} dashArray - Dash array pattern
 */
function drawFeatures(ctx, features, color, lineWidth, tileSize, dashed = false, dashArray = []) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (dashed && dashArray.length > 0) {
    ctx.setLineDash(dashArray);
  } else {
    ctx.setLineDash([]);
  }

  for (const feature of features) {
    const scale = tileSize / feature.extent;
    for (const ring of feature.geometry) {
      if (ring.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(ring[0].x * scale, ring[0].y * scale);
      for (let i = 1; i < ring.length; i++) {
        ctx.lineTo(ring[i].x * scale, ring[i].y * scale);
      }
      ctx.stroke();
    }
  }
}

/**
 * Boundary corrector that creates a PMTiles source for fetching correction data.
 */
export class BoundaryCorrector {
  /**
   * @param {string} pmtilesUrl - URL to the PMTiles file
   * @param {Object} [options] - Options
   * @param {number} [options.cacheSize=64] - Maximum number of tiles to cache
   */
  constructor(pmtilesUrl, options = {}) {
    this.pmtilesUrl = pmtilesUrl;
    this.pmtiles = new PMTiles(pmtilesUrl);
    this.cache = new TileCache(options.cacheSize ?? DEFAULT_CACHE_SIZE);
  }

  /**
   * Get the PMTiles source object.
   * @returns {PMTiles}
   */
  getSource() {
    return this.pmtiles;
  }

  /**
   * Get the tile cache.
   * @returns {TileCache}
   */
  getCache() {
    return this.cache;
  }

  /**
   * Clear the tile cache.
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Fetch and parse a tile, using cache.
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @returns {Promise<Object<string, Array>>}
   * @private
   */
  async _fetchTile(z, x, y) {
    // Check cache first
    const cached = this.cache.get(z, x, y);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from PMTiles
    const result = await this.pmtiles.getZxy(z, x, y);
    if (result) {
      const parsed = parseTile(result.data);
      this.cache.set(z, x, y, parsed);
      return parsed;
    }

    // Cache empty result too to avoid repeated fetches
    const empty = {};
    this.cache.set(z, x, y, empty);
    return empty;
  }

  /**
   * Get corrections for a tile as a dict of layer name to features.
   * Supports overzoom beyond maxDataZoom (14) by scaling parent tile data.
   * @param {number} z - Zoom level
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {Promise<Object<string, Array>>} Map of layer name to array of features
   */
  async getCorrections(z, x, y) {
    // Handle overzoom: fetch parent tile and transform
    if (z > MAX_DATA_ZOOM) {
      const zoomDiff = z - MAX_DATA_ZOOM;
      const scale = 1 << zoomDiff; // 2^zoomDiff
      
      // Calculate parent tile coordinates
      const parentX = Math.floor(x / scale);
      const parentY = Math.floor(y / scale);
      
      // Calculate offset within parent tile (0 to scale-1)
      const offsetX = x % scale;
      const offsetY = y % scale;
      
      const corrections = await this._fetchTile(MAX_DATA_ZOOM, parentX, parentY);
      if (Object.keys(corrections).length > 0) {
        return transformForOverzoom(corrections, scale, offsetX, offsetY);
      }
      return {};
    }
    
    return await this._fetchTile(z, x, y);
  }

  /**
   * Apply corrections to a raster tile.
   * @param {Object<string, Array>} corrections - Feature map from getCorrections
   * @param {ArrayBuffer} rasterTile - The original raster tile as ArrayBuffer
   * @param {Object} layerConfig - Layer configuration with colors and styles
   * @param {number} zoom - Current zoom level
   * @param {number} [tileSize=256] - Size of the tile in pixels
   * @returns {Promise<ArrayBuffer>} The corrected tile as ArrayBuffer (PNG)
   */
  async fixTile(corrections, rasterTile, layerConfig, zoom, tileSize = 256) {
    const {
      startZoom = 0,
      zoomThreshold,
      osmAddLineColor,
      neAddLineColor,
      addLineDashed,
      addLineDashArray,
      lineWidthMultiplier,
    } = layerConfig;

    // Don't apply corrections below startZoom
    if (zoom < startZoom) {
      return rasterTile;
    }

    // Determine which data source to use based on zoom
    const useOsm = zoom >= zoomThreshold;
    const addColor = useOsm ? osmAddLineColor : neAddLineColor;
    const addLayerName = useOsm ? 'to-add-osm' : 'to-add-ne';
    const delLayerName = useOsm ? 'to-del-osm' : 'to-del-ne';

    // Create OffscreenCanvas
    const canvas = new OffscreenCanvas(tileSize, tileSize);
    const ctx = canvas.getContext('2d');

    // Draw original raster tile
    const blob = new Blob([rasterTile]);
    const imageBitmap = await createImageBitmap(blob);
    ctx.drawImage(imageBitmap, 0, 0, tileSize, tileSize);

    // Calculate line widths
    const addLineWidth = getLineWidth(zoom, lineWidthMultiplier, false);
    const delLineWidth = getLineWidth(zoom, lineWidthMultiplier, true);

    // Apply median blur along deletion paths to erase incorrect boundaries
    const delFeatures = corrections[delLayerName] || [];
    if (delFeatures.length > 0) {
      applyMedianBlurAlongPath(ctx, delFeatures, delLineWidth, tileSize);
    }

    // Old approach: draw deletion lines with background color
    // const delFeatures = corrections[delLayerName] || [];
    // if (delFeatures.length > 0) {
    //   drawFeatures(ctx, delFeatures, delColor, delLineWidth, tileSize);
    // }

    // Draw addition lines on top (correct boundaries)
    const addFeatures = corrections[addLayerName] || [];
    if (addFeatures.length > 0) {
      drawFeatures(ctx, addFeatures, addColor, addLineWidth, tileSize, addLineDashed, addLineDashArray);
    }

    // Convert canvas to ArrayBuffer (PNG)
    const outputBlob = await canvas.convertToBlob({ type: 'image/png' });
    return outputBlob.arrayBuffer();
  }
}
