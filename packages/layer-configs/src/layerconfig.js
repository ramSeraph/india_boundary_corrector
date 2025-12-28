/**
 * Base class for layer configurations
 * 
 * Supports separate styling for NE (Natural Earth) data at low zoom levels
 * and OSM data at higher zoom levels, split by zoomThreshold.
 */
export class LayerConfig {
  constructor({
    id,
    startZoom = 0,
    zoomThreshold = 5,
    // Regex pattern for matching tile URLs (optional)
    tileUrlPattern = null,
    // OSM layer styles (zoom >= zoomThreshold)
    osmAddLineColor = 'green',
    // NE layer styles (zoom < zoomThreshold) - defaults to OSM values if not specified
    neAddLineColor = null,
    // Addition line style options
    addLineDashed = false,
    addLineDashArray = [],
    addLineHaloRatio = 0,
    addLineHaloAlpha = 0,
    // Line width multiplier (default 1.0, increase for thicker lines)
    lineWidthMultiplier = 1.0,
  }) {
    this.id = id;
    this.startZoom = startZoom;
    this.zoomThreshold = zoomThreshold;

    if (startZoom > zoomThreshold) {
      throw new Error(`LayerConfig "${id}": startZoom (${startZoom}) must be <= zoomThreshold (${zoomThreshold})`);
    }

    // Store the original pattern string for serialization
    this._tileUrlPatternSource = typeof tileUrlPattern === 'string' ? tileUrlPattern :
                                  (tileUrlPattern instanceof RegExp ? tileUrlPattern.source : null);
    this.tileUrlPattern = tileUrlPattern instanceof RegExp ? tileUrlPattern : 
                          (tileUrlPattern ? new RegExp(tileUrlPattern, 'i') : null);

    // OSM styles
    this.osmAddLineColor = osmAddLineColor;

    // NE styles (fallback to OSM values)
    this.neAddLineColor = neAddLineColor ?? osmAddLineColor;

    // Addition line style
    this.addLineDashed = addLineDashed;
    this.addLineDashArray = addLineDashArray;
    this.addLineHaloRatio = addLineHaloRatio;
    this.addLineHaloAlpha = addLineHaloAlpha;
    
    // Line width multiplier
    this.lineWidthMultiplier = lineWidthMultiplier;
  }

  /**
   * Check if this config matches the given tile URLs
   * @param {string | string[]} tiles - Single tile URL or array of tile URL templates
   * @returns {boolean}
   */
  match(tiles) {
    if (!this.tileUrlPattern) return false;
    
    const urls = Array.isArray(tiles) ? tiles : [tiles];
    if (urls.length === 0) return false;
    
    return urls.some(url => this.tileUrlPattern.test(url));
  }

  /**
   * Serialize the config to a plain object for postMessage
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      startZoom: this.startZoom,
      zoomThreshold: this.zoomThreshold,
      tileUrlPattern: this._tileUrlPatternSource,
      osmAddLineColor: this.osmAddLineColor,
      neAddLineColor: this.neAddLineColor,
      addLineDashed: this.addLineDashed,
      addLineDashArray: this.addLineDashArray,
      addLineHaloRatio: this.addLineHaloRatio,
      addLineHaloAlpha: this.addLineHaloAlpha,
      lineWidthMultiplier: this.lineWidthMultiplier,
    };
  }

  /**
   * Create a LayerConfig from a plain object (e.g., from postMessage)
   * @param {Object} obj
   * @returns {LayerConfig}
   */
  static fromJSON(obj) {
    return new LayerConfig(obj);
  }
}

export default LayerConfig;
