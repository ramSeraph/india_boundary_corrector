import { LayerConfig } from './layerconfig.js';

/**
 * CartoDB Dark (dark mode tiles from CARTO)
 */
export const cartoDbDark = new LayerConfig({
  id: 'cartodb-dark',
  zoomThreshold: 5,
  tileUrlTemplates: [
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png',
  ],
  lineWidthStops: { 1: 0.5, 10: 2.5 },
  lineStyles: [
    { color: 'rgb(40, 40, 40)' },
  ],
});

export const cartoDbLight = new LayerConfig({
  id: 'cartodb-light',
  zoomThreshold: 5,
  tileUrlTemplates: [
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png',
  ],
  lineWidthStops: { 1: 1.0, 2: 1.5, 3: 2.0, 10: 5.5 },
  lineStyles: [
    { color: "rgb(246,244,242)", widthFraction: 1.0 },
    { color: "rgb(235,214,216)", widthFraction: 0.33 }
  ],
  delWidthFactor: 2.0
});

export const osmCarto = new LayerConfig({
  id: 'osm-carto',
  startZoom: 1,
  zoomThreshold: 1,
  tileUrlTemplates: [
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  ],
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    { color: 'rgb(200, 180, 200)' },
    { color: 'rgb(160, 120, 160)', widthFraction: 1/3, dashArray: [30, 2, 8, 2] },
  ],
});
