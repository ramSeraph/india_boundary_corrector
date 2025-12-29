import { LayerConfig } from './layerconfig.js';

/**
 * CartoDB Dark (dark mode tiles from CARTO)
 */
export const cartoDbDark = new LayerConfig({
  id: 'cartodb-dark',
  zoomThreshold: 5,
  tileUrlPattern: /(cartocdn\.com|cartodb-basemaps).*dark_all/,
  osmAddLineColor: 'rgb(40, 40, 40)',
  lineWidthMultiplier: 1.0,
});

export const osmCarto = new LayerConfig({
  id: 'osm-carto',
  startZoom: 1,
  zoomThreshold: 1,
  tileUrlPattern: /tile\.openstreetmap\.org.*\.png/,
  osmAddLineColor: 'rgb(185, 168, 185)',
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
  lineWidthMultiplier: 1.5,
});
