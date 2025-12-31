import { LayerConfig } from './layerconfig.js';

/**
 * CartoDB Dark (dark mode tiles from CARTO)
 */
export const cartoDbDark = new LayerConfig({
  id: 'cartodb-dark',
  zoomThreshold: 5,
  tileUrlPattern: /(cartocdn\.com|cartodb-basemaps).*dark_all/,
  lineWidthStops: { 1: 0.5, 10: 2.5 },
  lineStyles: [
    { color: 'rgb(40, 40, 40)' },
  ],
});

export const osmCarto = new LayerConfig({
  id: 'osm-carto',
  startZoom: 1,
  zoomThreshold: 1,
  tileUrlPattern: /tile\.openstreetmap\.org.*\.png/,
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    { color: 'rgb(200, 180, 200)' },
    { color: 'rgb(160, 120, 160)', widthFraction: 1/3, dashArray: [30, 2, 8, 2] },
  ],
});
