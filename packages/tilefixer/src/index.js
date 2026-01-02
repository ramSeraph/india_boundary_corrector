import { CorrectionsSource } from './corrections.js';

/**
 * Minimum line width used when extrapolating below the lowest zoom stop.
 */
export const MIN_LINE_WIDTH = 0.5;

/**
 * Interpolate or extrapolate line width from a zoom-to-width map.
 * @param {number} zoom - Zoom level
 * @param {Object<number, number>} lineWidthStops - Map of zoom level to line width (at least 2 entries)
 * @returns {number}
 */
export function getLineWidth(zoom, lineWidthStops) {
  const zooms = Object.keys(lineWidthStops).map(Number).sort((a, b) => a - b);
  
  // Exact match
  if (lineWidthStops[zoom] !== undefined) {
    return lineWidthStops[zoom];
  }
  
  // Below lowest zoom - extrapolate
  if (zoom < zooms[0]) {
    const z1 = zooms[0];
    const z2 = zooms[1];
    const w1 = lineWidthStops[z1];
    const w2 = lineWidthStops[z2];
    const slope = (w2 - w1) / (z2 - z1);
    return Math.max(MIN_LINE_WIDTH, w1 + slope * (zoom - z1));
  }
  
  // Above highest zoom - extrapolate
  if (zoom > zooms[zooms.length - 1]) {
    const z1 = zooms[zooms.length - 2];
    const z2 = zooms[zooms.length - 1];
    const w1 = lineWidthStops[z1];
    const w2 = lineWidthStops[z2];
    const slope = (w2 - w1) / (z2 - z1);
    return Math.max(MIN_LINE_WIDTH, w2 + slope * (zoom - z2));
  }
  
  // Interpolate between two stops
  for (let i = 0; i < zooms.length - 1; i++) {
    if (zoom > zooms[i] && zoom < zooms[i + 1]) {
      const z1 = zooms[i];
      const z2 = zooms[i + 1];
      const w1 = lineWidthStops[z1];
      const w2 = lineWidthStops[z2];
      const t = (zoom - z1) / (z2 - z1);
      return w1 + t * (w2 - w1);
    }
  }
  
  return 1; // fallback
}

/**
 * Calculate the bounding box of features in pixel coordinates.
 * @param {Array} features - Array of features with geometry
 * @param {number} tileSize - Size of the tile in pixels
 * @param {number} padding - Padding to add around the bounding box
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
 */
function getFeaturesBoundingBox(features, tileSize, padding = 0) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const feature of features) {
    const scale = tileSize / feature.extent;
    for (const ring of feature.geometry) {
      for (const point of ring) {
        const px = point.x * scale;
        const py = point.y * scale;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }
  }
  
  // Apply padding and clamp to tile bounds
  return {
    minX: Math.max(0, Math.floor(minX - padding)),
    minY: Math.max(0, Math.floor(minY - padding)),
    maxX: Math.min(tileSize, Math.ceil(maxX + padding)),
    maxY: Math.min(tileSize, Math.ceil(maxY + padding))
  };
}

/**
 * Compute median of 8-bit values using histogram bucket sort (O(N) vs O(N log N)).
 * @param {Uint16Array} histogram - Pre-allocated 256-element histogram to reuse
 * @param {number[]} values - Array of 8-bit values (0-255)
 * @returns {number}
 */
function medianFromHistogram(histogram, values) {
  const count = values.length;
  if (count === 0) return 0;
  
  // Clear and populate histogram
  histogram.fill(0);
  for (let i = 0; i < count; i++) {
    histogram[values[i]]++;
  }
  
  // Find median by walking histogram
  const medianPos = count >> 1; // Math.floor(count / 2)
  let cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += histogram[v];
    if (cumulative > medianPos) {
      return v;
    }
  }
  return 0;
}

/**
 * Apply median blur along deletion paths to erase boundary lines.
 * @param {CanvasRenderingContext2D} ctx - Canvas context with the image
 * @param {Array} features - Array of deletion features
 * @param {number} lineWidth - Width of the blur path
 * @param {number} tileSize - Size of the tile in pixels
 * @param {OffscreenCanvas} [maskCanvas] - Optional reusable mask canvas
 */
function applyMedianBlurAlongPath(ctx, features, lineWidth, tileSize, maskCanvas) {
  if (features.length === 0) return;

  // Get the image data
  const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
  const data = imageData.data;
  const width = tileSize;
  const height = tileSize;

  // Use provided canvas or create new one
  if (!maskCanvas || maskCanvas.width !== tileSize || maskCanvas.height !== tileSize) {
    maskCanvas = new OffscreenCanvas(tileSize, tileSize);
  }
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
  
  // Calculate bounding box of features to limit iteration
  const bbox = getFeaturesBoundingBox(features, tileSize, radius);
  
  // Pre-allocate reusable arrays for histogram median calculation
  const histogram = new Uint16Array(256);
  const rValues = [];
  const gValues = [];
  const bValues = [];
  
  // Apply median filter to masked pixels within bounding box
  for (let y = bbox.minY; y < bbox.maxY; y++) {
    for (let x = bbox.minX; x < bbox.maxX; x++) {
      const maskIdx = (y * width + x) * 4;
      
      // Only process pixels on the deletion path (white in mask)
      if (maskData[maskIdx] < 128) continue;
      
      // Clear arrays for reuse
      rValues.length = 0;
      gValues.length = 0;
      bValues.length = 0;
      
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
        output[idx] = medianFromHistogram(histogram, rValues);
        output[idx + 1] = medianFromHistogram(histogram, gValues);
        output[idx + 2] = medianFromHistogram(histogram, bValues);
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
 * @param {number[]} [dashArray] - Dash array pattern (omit for solid line)
 * @param {number} [alpha] - Opacity/alpha value from 0 to 1
 */
function drawFeatures(ctx, features, color, lineWidth, tileSize, dashArray, alpha) {
  const prevAlpha = ctx.globalAlpha;
  if (alpha !== undefined) {
    ctx.globalAlpha = alpha;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';

  if (dashArray && dashArray.length > 0) {
    ctx.setLineDash(dashArray);
    ctx.lineCap = 'butt'; // Use butt cap for dashed lines to show gaps clearly
  } else {
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
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
  if (alpha !== undefined) {
    ctx.globalAlpha = prevAlpha;
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
    /** @type {OffscreenCanvas|null} Reusable scratch canvas for mask operations */
    this._maskCanvas = null;
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
      lineWidthStops,
      delWidthFactor,
    } = layerConfig;

    // Don't apply corrections below startZoom
    if (zoom < startZoom) {
      return rasterTile;
    }

    // Get line styles active at this zoom level
    let activeLineStyles;
    if (layerConfig.getLineStylesForZoom) {
      activeLineStyles = layerConfig.getLineStylesForZoom(zoom);
    } else {
      // Fallback for plain objects: filter by startZoom/endZoom
      const allStyles = layerConfig.lineStyles || [];
      activeLineStyles = allStyles.filter(style => {
        const styleStart = style.startZoom ?? startZoom;
        const styleEnd = style.endZoom ?? Infinity;
        return zoom >= styleStart && zoom <= styleEnd;
      });
    }

    // Determine which data source to use based on zoom
    const useOsm = zoom >= zoomThreshold;
    const addLayerName = useOsm ? 'to-add-osm' : 'to-add-ne';
    const delLayerName = useOsm ? 'to-del-osm' : 'to-del-ne';

    // Create OffscreenCanvas
    const canvas = new OffscreenCanvas(tileSize, tileSize);
    const ctx = canvas.getContext('2d');

    // Draw original raster tile
    const blob = new Blob([rasterTile]);
    const imageBitmap = await createImageBitmap(blob);
    ctx.drawImage(imageBitmap, 0, 0, tileSize, tileSize);

    // Calculate base line width
    const baseLineWidth = getLineWidth(zoom, lineWidthStops);

    // Calculate deletion width based on the thickest add line
    const maxWidthFraction = activeLineStyles.length > 0
      ? Math.max(...activeLineStyles.map(s => s.widthFraction ?? 1.0))
      : 1.0;
    const delLineWidth = baseLineWidth * maxWidthFraction * delWidthFactor;

    // Apply median blur along deletion paths to erase incorrect boundaries
    const delFeatures = corrections[delLayerName] || [];
    if (delFeatures.length > 0) {
      // Get or create reusable mask canvas
      if (!this._maskCanvas || this._maskCanvas.width !== tileSize) {
        this._maskCanvas = new OffscreenCanvas(tileSize, tileSize);
      }
      applyMedianBlurAlongPath(ctx, delFeatures, delLineWidth, tileSize, this._maskCanvas);
    }

    // Draw addition lines using active lineStyles (in order)
    const addFeatures = corrections[addLayerName] || [];
    if (addFeatures.length > 0 && activeLineStyles.length > 0) {
      for (const style of activeLineStyles) {
        const { color, widthFraction = 1.0, dashArray, alpha = 1.0 } = style;
        const lineWidth = baseLineWidth * widthFraction;
        drawFeatures(ctx, addFeatures, color, lineWidth, tileSize, dashArray, alpha);
      }
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

    // Check if aborted before proceeding with CPU-intensive work
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Handle fetch failure
    if (tileResult.status === 'rejected') {
      throw tileResult.reason;
    }

    const tileData = tileResult.value;
    
    // Check if corrections fetch failed
    const correctionsFailed = correctionsResult.status === 'rejected';
    const correctionsError = correctionsFailed ? correctionsResult.reason : null;
    const corrections = correctionsResult.status === 'fulfilled' ? correctionsResult.value : {};

    // Check if there are any corrections to apply
    const hasCorrections = Object.values(corrections).some(arr => arr && arr.length > 0);

    if (!hasCorrections) {
      return { data: tileData, wasFixed: false, correctionsFailed, correctionsError };
    }

    // Apply corrections
    const fixedData = await this.fixTile(corrections, tileData, layerConfig, z, tileSize);
    return { data: fixedData, wasFixed: true, correctionsFailed: false, correctionsError: null };
  }
}
