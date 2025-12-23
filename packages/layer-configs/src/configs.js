import { LayerConfig } from './layerconfig.js';

/**
 * OSM Carto Dark (dark mode OpenStreetMap style)
 * Uses CartoDB dark_all tiles
 * 
 * Tile source: CartoDB/CARTO
 * NE data used for zoom < 5, OSM data for zoom >= 5
 */
export const osmCartoDark = new LayerConfig({
  id: 'osm-carto-dark',
  zoomThreshold: 5,
  tileUrlPattern: /cartocdn\.com.*dark_all/,
  // OSM styles (zoom >= 5)
  osmAddLineColor: '#262626',
  osmDelLineColor: '#090909',
  // NE styles (zoom < 5)
  neAddLineColor: '#262626',
  neDelLineColor: '#090909',
  // Thicker lines at lower zoom levels
  lineWidthMultiplier: 1.0,
});

export const osmCarto = new LayerConfig({
  id: 'osm-carto',
  startZoom: 1,
  zoomThreshold: 1,
  tileUrlPattern: /tile\.openstreetmap\.org.*\.png/,
  // OSM styles (zoom >= 5)
  osmAddLineColor: '#b9a8b9',
  osmDelLineColor: '#f2efea',
  // NE styles (zoom < 5)
  neAddLineColor: '#b9a8b9',
  neDelLineColor: '#f2efea',
  // Addition line style
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
});
