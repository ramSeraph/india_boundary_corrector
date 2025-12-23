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
    osmDelLineColor = 'red',
    // NE layer styles (zoom < zoomThreshold) - defaults to OSM values if not specified
    neAddLineColor = null,
    neDelLineColor = null,
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

    this.tileUrlPattern = tileUrlPattern instanceof RegExp ? tileUrlPattern : 
                          (tileUrlPattern ? new RegExp(tileUrlPattern, 'i') : null);

    // OSM styles
    this.osmAddLineColor = osmAddLineColor;
    this.osmDelLineColor = osmDelLineColor;

    // NE styles (fallback to OSM values)
    this.neAddLineColor = neAddLineColor ?? osmAddLineColor;
    this.neDelLineColor = neDelLineColor ?? osmDelLineColor;

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
}

export default LayerConfig;
