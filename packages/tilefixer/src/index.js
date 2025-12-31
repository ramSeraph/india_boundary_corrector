import { CorrectionsSource } from './corrections.js';

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
 * Boundary corrector that applies corrections to raster tiles.
 */
export class BoundaryCorrector {
  /**
   * @param {string} pmtilesUrl - URL to the PMTiles file
   * @param {Object} [options] - Options
   * @param {number} [options.cacheSize=64] - Maximum number of tiles to cache
   * @param {number} [options.maxDataZoom] - Maximum zoom level in PMTiles (auto-detected if not provided)
   */
  constructor(pmtilesUrl, options = {}) {
    this.correctionsSource = new CorrectionsSource(pmtilesUrl, options);
  }

  /**
   * Get the PMTiles source object.
   * @returns {PMTiles}
   */
  getSource() {
    return this.correctionsSource.getSource();
  }

  /**
   * Clear the tile cache.
   */
  clearCache() {
    this.correctionsSource.clearCache();
  }

  /**
   * Get corrections for a tile as a dict of layer name to features.
   * Supports overzoom beyond maxDataZoom by scaling parent tile data.
   * @param {number} z - Zoom level
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @returns {Promise<Object<string, Array>>} Map of layer name to array of features
   */
  async getCorrections(z, x, y) {
    return await this.correctionsSource.get(z, x, y);
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

    // Draw addition lines on top (correct boundaries)
    const addFeatures = corrections[addLayerName] || [];
    if (addFeatures.length > 0) {
      drawFeatures(ctx, addFeatures, addColor, addLineWidth, tileSize, addLineDashed, addLineDashArray);
    }

    // Convert canvas to ArrayBuffer (PNG)
    const outputBlob = await canvas.convertToBlob({ type: 'image/png' });
    return outputBlob.arrayBuffer();
  }

  /**
   * Fetch a tile, apply corrections, and return the result.
   * @param {string} tileUrl - URL of the raster tile
   * @param {number} z - Zoom level
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {Object} layerConfig - Layer configuration with colors and styles
   * @param {Object} [options] - Fetch options
   * @param {number} [options.tileSize=256] - Tile size in pixels
   * @param {AbortSignal} [options.signal] - Abort signal for fetch
   * @param {RequestMode} [options.mode] - Fetch mode (e.g., 'cors')
   * @returns {Promise<{data: ArrayBuffer, wasFixed: boolean}>}
   */
  async fetchAndFixTile(tileUrl, z, x, y, layerConfig, options = {}) {
    const { tileSize = 256, signal, mode } = options;
    const fetchOptions = {};
    if (signal) fetchOptions.signal = signal;
    if (mode) fetchOptions.mode = mode;

    // No layerConfig means no corrections needed
    if (!layerConfig) {
      const response = await fetch(tileUrl, fetchOptions);
      if (!response.ok) throw new Error(`Tile fetch failed: ${response.status}`);
      return { data: await response.arrayBuffer(), wasFixed: false };
    }

    // Fetch tile and corrections in parallel
    const [tileResult, correctionsResult] = await Promise.allSettled([
      fetch(tileUrl, fetchOptions).then(r => {
        if (!r.ok) throw new Error(`Tile fetch failed: ${r.status}`);
        return r.arrayBuffer();
      }),
      this.getCorrections(z, x, y)
    ]);

    // Handle fetch failure
    if (tileResult.status === 'rejected') {
      throw tileResult.reason;
    }

    const tileData = tileResult.value;
    const corrections = correctionsResult.status === 'fulfilled' ? correctionsResult.value : {};

    // Check if there are any corrections to apply
    const hasCorrections = Object.values(corrections).some(arr => arr && arr.length > 0);

    if (!hasCorrections) {
      return { data: tileData, wasFixed: false };
    }

    // Apply corrections
    const fixedData = await this.fixTile(corrections, tileData, layerConfig, z, tileSize);
    return { data: fixedData, wasFixed: true };
  }
}
