/**
 * Base class for layer configurations
 * 
 * Supports separate styling for NE (Natural Earth) data at low zoom levels
 * and OSM data at higher zoom levels, split by zoomThreshold.
 */
export class LayerConfig {
  constructor({
    id,
    zoomThreshold = 5,
    // Regex pattern for matching tile URLs (optional)
    tileUrlPattern = null,
    // OSM layer styles (zoom >= zoomThreshold)
    osmAddLineColor = 'green',
    osmAddLineWidth = 1,
    osmDelLineColor = 'red',
    osmDelLineWidth = 1,
    // NE layer styles (zoom < zoomThreshold) - defaults to OSM values if not specified
    neAddLineColor = null,
    neAddLineWidth = null,
    neDelLineColor = null,
    neDelLineWidth = null,
  }) {
    this.id = id;
    this.zoomThreshold = zoomThreshold;
    this.tileUrlPattern = tileUrlPattern instanceof RegExp ? tileUrlPattern : 
                          (tileUrlPattern ? new RegExp(tileUrlPattern, 'i') : null);

    // OSM styles
    this.osmAddLineColor = osmAddLineColor;
    this.osmAddLineWidth = osmAddLineWidth;
    this.osmDelLineColor = osmDelLineColor;
    this.osmDelLineWidth = osmDelLineWidth;

    // NE styles (fallback to OSM values)
    this.neAddLineColor = neAddLineColor ?? osmAddLineColor;
    this.neAddLineWidth = neAddLineWidth ?? osmAddLineWidth;
    this.neDelLineColor = neDelLineColor ?? osmDelLineColor;
    this.neDelLineWidth = neDelLineWidth ?? osmDelLineWidth;
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
