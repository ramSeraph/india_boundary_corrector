/**
 * Convert a tile URL template to a regex pattern and capture group names.
 * Supports {z}, {x}, {y}, {s} (Leaflet subdomain), {a-c}/{1-4} (OpenLayers subdomain), and {r} (retina) placeholders.
 * @param {string} template - URL template like "https://{s}.tile.example.com/{z}/{x}/{y}.png"
 * @returns {{ pattern: RegExp, groups: string[] }}
 */
function templateToRegex(template) {
  const groups = [];
  // Escape regex special chars, then replace placeholders
  let pattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, (char) => {
      // Don't escape our placeholders
      if (char === '{' || char === '}') return char;
      return '\\' + char;
    })
    // Make protocol flexible (http/https)
    .replace(/^https:\/\//, 'https?://')
    .replace(/^http:\/\//, 'https?://')
    // Handle {a-c} or {1-4} etc (OpenLayers style subdomain)
    .replace(/\{[a-z0-9]-[a-z0-9]\}/gi, () => {
      groups.push('s');
      return '([a-z0-9]+)';
    })
    .replace(/\{(z|x|y|s|r)\}/gi, (_, name) => {
      const lowerName = name.toLowerCase();
      groups.push(lowerName);
      if (lowerName === 's') {
        // Subdomain: single letter or short string
        return '([a-z0-9]+)';
      }
      if (lowerName === 'r') {
        // Retina suffix: optional @2x or similar
        return '(@\\d+x)?';
      }
      // z, x, y: numeric
      return '(\\d+)';
    });
  
  // Allow optional query string at end
  return { pattern: new RegExp('^' + pattern + '(\\?.*)?$', 'i'), groups };
}

/**
 * Convert a tile URL template to a regex that matches the template itself.
 * @param {string} template - URL template like "https://{s}.tile.example.com/{z}/{x}/{y}.png"
 * @returns {RegExp}
 */
function templateToTemplateRegex(template) {
  // Escape regex special chars, then replace placeholders with literal match
  let pattern = template
    .replace(/[.*+?^${}()|[\]\\]/g, (char) => {
      if (char === '{' || char === '}') return char;
      return '\\' + char;
    })
    // Make protocol flexible (http/https)
    .replace(/^https:\/\//, 'https?://')
    .replace(/^http:\/\//, 'https?://')
    // Handle {a-c} or {1-4} (OpenLayers style subdomain)
    .replace(/\{([a-z0-9])-([a-z0-9])\}/gi, (_, start, end) => `(\\{${start}-${end}\\}|\\{s\\}|[a-z0-9]+)`)
    .replace(/\{(z|x|y|s|r)\}/gi, (_, name) => {
      const lowerName = name.toLowerCase();
      if (lowerName === 's') {
        // Match {s} placeholder, {a-c} style placeholder, or actual subdomain
        return '(\\{s\\}|\\{[a-z0-9]-[a-z0-9]\\}|[a-z0-9]+)';
      }
      if (lowerName === 'r') {
        // Match {r} placeholder or actual retina or empty
        return '(\\{r\\}|@\\d+x)?';
      }
      // Match {z}, {x}, {y} placeholders
      return `\\{${lowerName}\\}`;
    });
  
  // Allow optional query string at end
  return new RegExp('^' + pattern + '(\\?.*)?$', 'i');
}

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
    // Tile URL templates for matching (e.g., "https://{s}.tile.example.com/{z}/{x}/{y}.png")
    tileUrlTemplates = [],
    // Line width stops: map of zoom level to line width (at least 2 entries)
    // Note: interpolated/extrapolated line width is capped at a minimum of 0.5
    lineWidthStops = { 1: 0.5, 10: 2.5 },
    // Line styles array - each element describes a line to draw
    // { color: string, widthFraction?: number, dashArray?: number[], startZoom?: number, endZoom?: number }
    // Lines are drawn in array order. startZoom defaults to layerConfig startZoom, endZoom defaults to Infinity
    lineStyles = [{ color: 'green', widthFraction: 1.0 }],
    // Factor to multiply line width for deletion blur (default 1.5)
    // Higher values leave gaps where wiped lines meet existing lines
    // Lower values mean wiped lines show through
    delWidthFactor = 1.5,
    // Factor to extend add lines by (multiplied by deletion line width)
    // Helps cover gaps where deleted lines meet the new boundary
    // Set to 0 to disable extension
    lineExtensionFactor = 0.5,
  }) {
    if (!id || typeof id !== 'string') {
      throw new Error('LayerConfig requires a non-empty string id');
    }
    if (id.includes('/')) {
      throw new Error(`LayerConfig id cannot contain slashes: "${id}"`);
    }

    this.id = id;
    this.startZoom = startZoom;
    this.zoomThreshold = zoomThreshold;

    if (startZoom > zoomThreshold) {
      throw new Error(`LayerConfig "${id}": startZoom (${startZoom}) must be <= zoomThreshold (${zoomThreshold})`);
    }

    // Normalize to array
    const templates = Array.isArray(tileUrlTemplates) ? tileUrlTemplates : 
                      (tileUrlTemplates ? [tileUrlTemplates] : []);
    this.tileUrlTemplates = templates;
    
    // Pre-compile regex patterns for matching tile URLs (with actual coords)
    this._compiledPatterns = templates.map(t => templateToRegex(t));
    
    // Pre-compile regex patterns for matching template URLs (with {z}/{x}/{y} placeholders)
    this._templatePatterns = templates.map(t => templateToTemplateRegex(t));

    // Validate lineWidthStops
    if (!lineWidthStops || typeof lineWidthStops !== 'object' || Array.isArray(lineWidthStops)) {
      throw new Error(`LayerConfig "${id}": lineWidthStops must be an object`);
    }
    const stopKeys = Object.keys(lineWidthStops);
    if (stopKeys.length < 2) {
      throw new Error(`LayerConfig "${id}": lineWidthStops must have at least 2 entries`);
    }
    for (const key of stopKeys) {
      const zoom = Number(key);
      if (!Number.isInteger(zoom) || zoom < 0) {
        throw new Error(`LayerConfig "${id}": lineWidthStops keys must be non-negative integers, got "${key}"`);
      }
      if (typeof lineWidthStops[key] !== 'number' || lineWidthStops[key] <= 0) {
        throw new Error(`LayerConfig "${id}": lineWidthStops values must be positive numbers`);
      }
    }
    this.lineWidthStops = lineWidthStops;

    // Validate lineStyles
    if (!Array.isArray(lineStyles) || lineStyles.length === 0) {
      throw new Error(`LayerConfig "${id}": lineStyles must be a non-empty array`);
    }
    for (let i = 0; i < lineStyles.length; i++) {
      const style = lineStyles[i];
      if (!style || typeof style !== 'object') {
        throw new Error(`LayerConfig "${id}": lineStyles[${i}] must be an object`);
      }
      if (!style.color || typeof style.color !== 'string') {
        throw new Error(`LayerConfig "${id}": lineStyles[${i}].color must be a non-empty string`);
      }
    }
    
    // Line styles - normalize startZoom/endZoom defaults
    this.lineStyles = lineStyles.map(style => ({
      ...style,
      startZoom: style.startZoom ?? startZoom,
      endZoom: style.endZoom ?? Infinity,
    }));
    
    // Deletion width factor
    this.delWidthFactor = delWidthFactor;
    
    // Line extension factor
    this.lineExtensionFactor = lineExtensionFactor;
  }

  /**
   * Get line styles active at a given zoom level
   * @param {number} z - Zoom level
   * @returns {Array<{color: string, widthFraction?: number, dashArray?: number[]}>}
   */
  getLineStylesForZoom(z) {
    return this.lineStyles.filter(style => z >= style.startZoom && z <= style.endZoom);
  }

  /**
   * Check if this config matches the given template URLs (with {z}/{x}/{y} placeholders)
   * @param {string | string[]} templates - Single template URL or array of template URLs
   * @returns {boolean}
   */
  matchTemplate(templates) {
    if (this._templatePatterns.length === 0) return false;
    
    const urls = Array.isArray(templates) ? templates : [templates];
    if (urls.length === 0) return false;
    
    return urls.some(url => 
      this._templatePatterns.some(pattern => pattern.test(url))
    );
  }

  /**
   * Check if this config matches the given tile URLs (with actual coordinates)
   * @param {string | string[]} tiles - Single tile URL or array of tile URLs
   * @returns {boolean}
   */
  matchTileUrl(tiles) {
    if (this._compiledPatterns.length === 0) return false;
    
    const urls = Array.isArray(tiles) ? tiles : [tiles];
    if (urls.length === 0) return false;
    
    return urls.some(url => 
      this._compiledPatterns.some(({ pattern }) => pattern.test(url))
    );
  }

  /**
   * Extract tile coordinates (z, x, y) from a URL using this config's templates
   * @param {string} url - Tile URL to extract coordinates from
   * @returns {{ z: number, x: number, y: number } | null}
   */
  extractCoords(url) {
    for (const { pattern, groups } of this._compiledPatterns) {
      const match = url.match(pattern);
      if (match) {
        const result = {};
        for (let i = 0; i < groups.length; i++) {
          const name = groups[i];
          const value = match[i + 1];
          if (name === 'z' || name === 'x' || name === 'y') {
            result[name] = parseInt(value, 10);
          }
        }
        if ('z' in result && 'x' in result && 'y' in result) {
          return { z: result.z, x: result.x, y: result.y };
        }
      }
    }
    return null;
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
      tileUrlTemplates: this.tileUrlTemplates,
      lineWidthStops: this.lineWidthStops,
      lineStyles: this.lineStyles,
      delWidthFactor: this.delWidthFactor,
      lineExtensionFactor: this.lineExtensionFactor,
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
