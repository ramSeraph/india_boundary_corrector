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
    // Line width stops: map of zoom level to line width (at least 2 entries)
    lineWidthStops = { 1: 0.5, 10: 2.5 },
    // Line styles array - each element describes a line to draw
    // { color: string, widthFraction: number, dashArray?: number[] }
    // Lines are drawn in array order
    lineStyles = [{ color: 'green', widthFraction: 1.0 }],
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

    // Line width stops
    this.lineWidthStops = lineWidthStops;
    
    // Line styles
    this.lineStyles = lineStyles;
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
      lineWidthStops: this.lineWidthStops,
      lineStyles: this.lineStyles,
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
