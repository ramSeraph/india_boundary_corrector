import { LayerConfig } from './layerconfig.js';

/**
 * CartoDB Dark (dark mode tiles from CARTO)
 * Uses CartoDB dark_all tiles
 * 
 * Tile source: CartoDB/CARTO
 * NE data used for zoom < 5, OSM data for zoom >= 5
 */
export const cartoDbDark = new LayerConfig({
  id: 'cartodb-dark',
  zoomThreshold: 5,
  tileUrlPattern: /(cartocdn\.com|cartodb-basemaps).*dark_all/,
  // OSM styles (zoom >= 5)
  osmAddLineColor: 'rgb(40, 40, 40)',
  // NE styles (zoom < 5)
  neAddLineColor: 'rgb(40, 40, 40)',
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
  // NE styles (zoom < 5)
  neAddLineColor: '#b9a8b9',
  // Addition line style
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
  lineWidthMultiplier: 1.5,
});
