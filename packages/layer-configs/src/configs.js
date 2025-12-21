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
  osmAddLineWidth: 3,
  osmDelLineColor: '#090909',
  osmDelLineWidth: 4,
  // NE styles (zoom < 5)
  neAddLineColor: '#262626',
  neAddLineWidth: 2,
  neDelLineColor: '#090909',
  neDelLineWidth: 3,
});

export const osmCarto = new LayerConfig({
  id: 'osm-carto',
  zoomThreshold: 0,
  tileUrlPattern: /tile\.openstreetmap\.org.*\.png/,
  // OSM styles (zoom >= 5)
  osmAddLineColor: '#b9a8b9',
  osmAddLineWidth: 2,
  osmDelLineColor: '#f2efea',
  osmDelLineWidth: 3,
  // NE styles (zoom < 5)
  neAddLineColor: '#b9a8b9',
  neAddLineWidth: 1,
  neDelLineColor: '#f2efea',
  neDelLineWidth: 2,
});
