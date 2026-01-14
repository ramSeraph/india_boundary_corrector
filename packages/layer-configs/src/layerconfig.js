/**
 * Constant representing no zoom limit (used for endZoom).
 * Using -1 instead of Infinity for JSON serialization compatibility.
 */
export const INFINITY = -1;

/**
 * Minimum line width used when extrapolating below the lowest zoom stop.
 */
export const MIN_LINE_WIDTH = 0.1;

/**
 * Default fallback line width if interpolation fails.
 */
const DEFAULT_LINE_WIDTH = 1;

/**
 * Convert a tile URL template to a regex pattern and capture group names.
 * Supports {z}, {x}, {y}, {s} (Leaflet subdomain), {a-c}/{1-4} (OpenLayers subdomain), and {r} (retina) placeholders.
 * @param {string} template - URL template like "https://{s}.tile.example.com/{z}/{x}/{y}.png"
 * @returns {{ pattern: RegExp, groups: string[] }}
 */
function templateToRegex(template) {
  const groups = [];
  const hasRetina = template.includes('{r}');
  const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(template);
  
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
        // Retina suffix: required @2x or similar (must be present for retina configs)
        return '(@\\d+x)';
      }
      // z, x, y: numeric
      return '(\\d+)';
    });
  
  // If template has no {r} placeholder, ensure we DON'T match retina URLs
  if (!hasRetina) {
    if (hasExtension) {
      // Insert negative lookahead before .png/.jpg/.webp etc
      pattern = pattern.replace(/(\\\.(png|jpg|jpeg|webp|gif))/, '(?!@\\d+x)$1');
    } else {
      // No extension - add negative lookahead at the end (before query string)
      pattern = pattern + '(?!@\\d+x)';
    }
  }
  
  // Allow optional query string at end
  return { pattern: new RegExp('^' + pattern + '(\\?.*)?$', 'i'), groups };
}

/**
 * Convert a tile URL template to a regex that matches the template itself.
 * @param {string} template - URL template like "https://{s}.tile.example.com/{z}/{x}/{y}.png"
 * @returns {RegExp}
 */
function templateToTemplateRegex(template) {
  const hasRetina = template.includes('{r}');
  const hasExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(template);
  
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
        // Match {r} placeholder or actual retina suffix (required for retina configs)
        return '(\\{r\\}|@\\d+x)';
      }
      // Match {z}, {x}, {y} placeholders
      return `\\{${lowerName}\\}`;
    });
  
  // If template has no {r} placeholder, ensure we DON'T match retina URLs/templates
  if (!hasRetina) {
    if (hasExtension) {
      // Insert negative lookahead before .png/.jpg/.webp etc to reject @2x and {r}
      pattern = pattern.replace(/(\\\.(png|jpg|jpeg|webp|gif))/, '(?!@\\d+x|\\{r\\})$1');
    } else {
      // No extension - add negative lookahead at the end (before query string)
      pattern = pattern + '(?!@\\d+x|\\{r\\})';
    }
  }
  
  // Allow optional query string at end
  return new RegExp('^' + pattern + '(\\?.*)?$', 'i');
}

/**
 * Check if a string is a valid CSS color using the browser's CSS parser.
 * Falls back to a basic regex check in non-browser environments.
 * @param {string} color
 * @returns {boolean}
 */
function isValidColor(color) {
  if (typeof color !== 'string' || !color.trim()) return false;
  
  // Use CSS.supports if available (modern browsers)
  if (typeof CSS !== 'undefined' && CSS.supports) {
    return CSS.supports('color', color);
  }
  
  // Fallback: basic validation for common formats
  const trimmed = color.trim().toLowerCase();
  // Hex colors
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(trimmed)) return true;
  // rgb/rgba/hsl/hsla functions
  if (/^(rgb|hsl)a?\(/.test(trimmed)) return true;
  // Named colors (just check it's alphabetic)
  if (/^[a-z]+$/.test(trimmed)) return true;
  return false;
}

/**
 * Represents a line style for drawing boundaries.
 */
export class LineStyle {
  /**
   * Validate a LineStyle configuration object.
   * @param {Object} obj - The object to validate
   * @param {number} [index] - Optional index for error messages (when validating in an array)
   * @throws {Error} If validation fails
   */
  static validateJSON(obj, index) {
    const prefix = index !== undefined ? `lineStyles[${index}]` : 'LineStyle';
    
    if (!obj || typeof obj !== 'object') {
      throw new Error(`${prefix}: must be an object`);
    }
    
    if (!obj.color || typeof obj.color !== 'string') {
      throw new Error(`${prefix}: color must be a non-empty string`);
    }
    
    if (!isValidColor(obj.color)) {
      throw new Error(`${prefix}: color "${obj.color}" is not a valid CSS color`);
    }
    
    if (!obj.layerSuffix || typeof obj.layerSuffix !== 'string') {
      throw new Error(`${prefix}: layerSuffix must be a non-empty string`);
    }
    
    if (obj.widthFraction !== undefined && (typeof obj.widthFraction !== 'number' || obj.widthFraction <= 0)) {
      throw new Error(`${prefix}: widthFraction must be a positive number`);
    }
    
    if (obj.dashArray !== undefined && !Array.isArray(obj.dashArray)) {
      throw new Error(`${prefix}: dashArray must be an array`);
    }
    
    if (obj.alpha !== undefined && (typeof obj.alpha !== 'number' || obj.alpha < 0 || obj.alpha > 1)) {
      throw new Error(`${prefix}: alpha must be a number between 0 and 1`);
    }
    
    if (obj.startZoom !== undefined && (typeof obj.startZoom !== 'number' || obj.startZoom < 0)) {
      throw new Error(`${prefix}: startZoom must be a non-negative number`);
    }
    
    if (obj.endZoom !== undefined && (typeof obj.endZoom !== 'number' || (obj.endZoom < 0 && obj.endZoom !== INFINITY))) {
      throw new Error(`${prefix}: endZoom must be a non-negative number or INFINITY (${INFINITY})`);
    }
    
    if (obj.lineExtensionFactor !== undefined && (typeof obj.lineExtensionFactor !== 'number' || obj.lineExtensionFactor < 0)) {
      throw new Error(`${prefix}: lineExtensionFactor must be a non-negative number`);
    }
    
    if (obj.delWidthFactor !== undefined && (typeof obj.delWidthFactor !== 'number' || obj.delWidthFactor < 0)) {
      throw new Error(`${prefix}: delWidthFactor must be a non-negative number`);
    }
  }

  /**
   * @param {Object} options
   * @param {string} options.color - CSS color string
   * @param {string} options.layerSuffix - Layer suffix (e.g., 'osm', 'ne', 'osm-disp')
   * @param {number} [options.widthFraction=1.0] - Multiplier for base line width
   * @param {number[]} [options.dashArray] - Dash pattern for dashed lines
   * @param {number} [options.alpha=1.0] - Opacity (0-1)
   * @param {number} [options.startZoom=0] - Minimum zoom level for this style
   * @param {number} [options.endZoom=INFINITY] - Maximum zoom level for this style (INFINITY means no limit)
   * @param {number} [options.lineExtensionFactor=0.5] - Factor to extend lines by (multiplied by deletion line width)
   * @param {number} [options.delWidthFactor=1.5] - Factor to multiply line width for deletion blur
   */
  constructor({ color, layerSuffix, widthFraction = 1.0, dashArray, alpha = 1.0, startZoom = 0, endZoom = INFINITY, lineExtensionFactor = 0.0, delWidthFactor = 1.5 }) {
    this.color = color;
    this.layerSuffix = layerSuffix;
    this.widthFraction = widthFraction;
    this.dashArray = dashArray;
    this.alpha = alpha;
    this.startZoom = startZoom;
    this.endZoom = endZoom;
    this.lineExtensionFactor = lineExtensionFactor;
    this.delWidthFactor = delWidthFactor;
  }

  /**
   * Check if this style is active at the given zoom level.
   * @param {number} z - Zoom level
   * @returns {boolean}
   */
  isActiveAtZoom(z) {
    return z >= this.startZoom && (this.endZoom === INFINITY || z <= this.endZoom);
  }

  /**
   * Serialize to plain object.
   * @returns {Object}
   */
  toJSON() {
    return {
      color: this.color,
      layerSuffix: this.layerSuffix,
      widthFraction: this.widthFraction,
      dashArray: this.dashArray,
      alpha: this.alpha,
      startZoom: this.startZoom,
      endZoom: this.endZoom,
      lineExtensionFactor: this.lineExtensionFactor,
      delWidthFactor: this.delWidthFactor,
    };
  }

  /**
   * Create from plain object with validation.
   * @param {Object} obj
   * @param {number} [index] - Optional index for error messages
   * @returns {LineStyle}
   */
  static fromJSON(obj, index) {
    LineStyle.validateJSON(obj, index);
    return new LineStyle(obj);
  }
}

/**
 * Base class for layer configurations
 * 
 * Each lineStyle specifies which data layer to use via layerSuffix (e.g., 'osm', 'ne', 'osm-disp').
 * Layer names are derived as: to-add-{layerSuffix} and to-del-{layerSuffix}
 */
export class LayerConfig {
  /**
   * Validate a LayerConfig configuration object.
   * Also validates all lineStyles within the config.
   * @param {Object} obj - The object to validate
   * @throws {Error} If validation fails
   */
  static validateJSON(obj) {
    if (!obj || typeof obj !== 'object') {
      throw new Error('LayerConfig: must be an object');
    }
    
    // Validate id (required)
    if (!obj.id || typeof obj.id !== 'string') {
      throw new Error('LayerConfig: id must be a non-empty string');
    }
    if (obj.id.includes('/')) {
      throw new Error(`LayerConfig: id cannot contain slashes: "${obj.id}"`);
    }
    
    const id = obj.id;
    
    // Validate lineWidthStops (optional, but if provided must be valid)
    if (obj.lineWidthStops !== undefined) {
      if (!obj.lineWidthStops || typeof obj.lineWidthStops !== 'object' || Array.isArray(obj.lineWidthStops)) {
        throw new Error(`LayerConfig "${id}": lineWidthStops must be an object`);
      }
      const stopKeys = Object.keys(obj.lineWidthStops);
      if (stopKeys.length < 2) {
        throw new Error(`LayerConfig "${id}": lineWidthStops must have at least 2 entries`);
      }
      for (const key of stopKeys) {
        const zoom = Number(key);
        if (!Number.isInteger(zoom) || zoom < 0) {
          throw new Error(`LayerConfig "${id}": lineWidthStops keys must be non-negative integers, got "${key}"`);
        }
        if (typeof obj.lineWidthStops[key] !== 'number' || obj.lineWidthStops[key] <= 0) {
          throw new Error(`LayerConfig "${id}": lineWidthStops values must be positive numbers`);
        }
      }
    }
    
    // Validate lineStyles (required)
    if (!Array.isArray(obj.lineStyles) || obj.lineStyles.length === 0) {
      throw new Error(`LayerConfig "${id}": lineStyles must be a non-empty array`);
    }
    // Validate each lineStyle
    for (let i = 0; i < obj.lineStyles.length; i++) {
      LineStyle.validateJSON(obj.lineStyles[i], i);
    }
  }

  constructor({
    id,
    // Tile URL templates for matching (e.g., "https://{s}.tile.example.com/{z}/{x}/{y}.png")
    tileUrlTemplates = [],
    // Line width stops: map of zoom level to line width (at least 2 entries)
    // Note: interpolated/extrapolated line width is capped at a minimum of 0.5
    lineWidthStops = { 1: 0.5, 10: 2.5 },
    // Line styles array - each element describes a line to draw from a specific layer
    // { color: string, layerSuffix: string, widthFraction?: number, dashArray?: number[], 
    //   startZoom?: number, endZoom?: number, lineExtensionFactor?: number, delWidthFactor?: number }
    // Lines are drawn in array order. layerSuffix determines which PMTiles layer to use.
    lineStyles,
  }) {
    this.id = id;

    // Normalize to array
    const templates = Array.isArray(tileUrlTemplates) ? tileUrlTemplates : 
                      (tileUrlTemplates ? [tileUrlTemplates] : []);
    this.tileUrlTemplates = templates;
    
    // Pre-compile regex patterns for matching tile URLs (with actual coords)
    this._compiledPatterns = templates.map(t => templateToRegex(t));
    
    // Pre-compile regex patterns for matching template URLs (with {z}/{x}/{y} placeholders)
    this._templatePatterns = templates.map(t => templateToTemplateRegex(t));

    this.lineWidthStops = lineWidthStops;
    
    // Convert to LineStyle instances
    this.lineStyles = lineStyles.map(style => 
      style instanceof LineStyle ? style : new LineStyle(style)
    );
  }

  /**
   * Get line styles active at a given zoom level
   * @param {number} z - Zoom level
   * @returns {LineStyle[]}
   */
  getLineStylesForZoom(z) {
    return this.lineStyles.filter(style => style.isActiveAtZoom(z));
  }

  /**
   * Get unique layer suffixes from styles active at a given zoom level
   * @param {number} z - Zoom level
   * @returns {string[]}
   */
  getLayerSuffixesForZoom(z) {
    const activeStyles = this.getLineStylesForZoom(z);
    return [...new Set(activeStyles.map(s => s.layerSuffix))];
  }

  /**
   * Interpolate or extrapolate line width for a given zoom level.
   * Uses the lineWidthStops map to calculate the appropriate width.
   * @param {number} zoom - Zoom level
   * @returns {number}
   */
  getLineWidth(zoom) {
    const zooms = Object.keys(this.lineWidthStops).map(Number).sort((a, b) => a - b);
    
    // Exact match
    if (this.lineWidthStops[zoom] !== undefined) {
      return this.lineWidthStops[zoom];
    }
    
    // Below lowest zoom - extrapolate
    if (zoom < zooms[0]) {
      const z1 = zooms[0];
      const z2 = zooms[1];
      const w1 = this.lineWidthStops[z1];
      const w2 = this.lineWidthStops[z2];
      const slope = (w2 - w1) / (z2 - z1);
      return Math.max(MIN_LINE_WIDTH, w1 + slope * (zoom - z1));
    }
    
    // Above highest zoom - extrapolate
    if (zoom > zooms[zooms.length - 1]) {
      const z1 = zooms[zooms.length - 2];
      const z2 = zooms[zooms.length - 1];
      const w1 = this.lineWidthStops[z1];
      const w2 = this.lineWidthStops[z2];
      const slope = (w2 - w1) / (z2 - z1);
      return Math.max(MIN_LINE_WIDTH, w2 + slope * (zoom - z2));
    }
    
    // Interpolate between two stops
    for (let i = 0; i < zooms.length - 1; i++) {
      if (zoom > zooms[i] && zoom < zooms[i + 1]) {
        const z1 = zooms[i];
        const z2 = zooms[i + 1];
        const w1 = this.lineWidthStops[z1];
        const w2 = this.lineWidthStops[z2];
        const t = (zoom - z1) / (z2 - z1);
        return w1 + t * (w2 - w1);
      }
    }
    
    return DEFAULT_LINE_WIDTH; // fallback
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
      tileUrlTemplates: this.tileUrlTemplates,
      lineWidthStops: this.lineWidthStops,
      lineStyles: this.lineStyles.map(s => s.toJSON()),
    };
  }

  /**
   * Create a LayerConfig from a plain object with validation.
   * @param {Object} obj
   * @returns {LayerConfig}
   * @throws {Error} If validation fails
   */
  static fromJSON(obj) {
    LayerConfig.validateJSON(obj);
    return new LayerConfig(obj);
  }
}

export default LayerConfig;
