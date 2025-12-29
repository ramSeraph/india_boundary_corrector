/**
 * Utilities for parsing tile URLs and extracting coordinates
 */

/**
 * Extract z, x, y from a tile URL.
 * Supports common patterns like /{z}/{x}/{y}.png
 * @param {string} url
 * @returns {{ z: number, x: number, y: number } | null}
 */
export function extractTileCoords(url) {
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

/**
 * Parse a tile URL into its components: layer config and coordinates
 * @param {string} url - Tile URL to parse
 * @param {import('./index.js').LayerConfigRegistry} registry - Registry to detect layer config from
 * @returns {{ layerConfig: import('./layerconfig.js').LayerConfig, coords: { z: number, x: number, y: number } } | null}
 */
export function parseTileUrl(url, registry) {
  // Check if URL matches any layer config
  const layerConfig = registry.detectFromUrls([url]);
  if (!layerConfig) return null;
  
  // Extract tile coordinates
  const coords = extractTileCoords(url);
  if (!coords) return null;
  
  return { layerConfig, coords };
}
