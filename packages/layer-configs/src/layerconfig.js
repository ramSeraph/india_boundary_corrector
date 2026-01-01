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
    // Factor to multiply line width for deletion blur (default 1.5)
    // Higher values leave gaps where wiped lines meet existing lines
    // Lower values mean wiped lines show through
    delWidthFactor = 1.5,
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
    
    // Deletion width factor
    this.delWidthFactor = delWidthFactor;
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
      delWidthFactor: this.delWidthFactor,
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

  /**
   * Extract z, x, y from a tile URL.
   * Supports common patterns like /{z}/{x}/{y}.png
   * @param {string} url
   * @returns {{ z: number, x: number, y: number } | null}
   */
  static extractTileCoords(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
      
      // Find z/x/y pattern - typically last 3 numeric segments
      for (let i = pathParts.length - 1; i >= 2; i--) {
        // Remove extension and retina suffix (e.g., @2x)
        const yPart = pathParts[i].replace(/(@\d+x)?\.[^.]+$/, '');
        const xPart = pathParts[i - 1];
        const zPart = pathParts[i - 2];
        
        if (/^\d+$/.test(zPart) && /^\d+$/.test(xPart) && /^\d+$/.test(yPart)) {
          return {
            z: parseInt(zPart, 10),
            x: parseInt(xPart, 10),
            y: parseInt(yPart, 10),
          };
        }
      }
      
      // Try query parameters (some tile servers use ?x=&y=&z=)
      const z = urlObj.searchParams.get('z');
      const x = urlObj.searchParams.get('x');
      const y = urlObj.searchParams.get('y');
      if (z && x && y) {
        return {
          z: parseInt(z, 10),
          x: parseInt(x, 10),
          y: parseInt(y, 10),
        };
      }
    } catch (e) {
      // Invalid URL
    }
    return null;
  }
}

export default LayerConfig;
