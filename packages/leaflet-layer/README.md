# @india-boundary-corrector/leaflet-layer

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/leaflet-layer)](https://www.npmjs.com/package/@india-boundary-corrector/leaflet-layer)

Leaflet TileLayer extension that automatically applies India boundary corrections.

[Try it on JSFiddle](https://jsfiddle.net/ak3fpn7z/)

## Installation

```bash
npm install @india-boundary-corrector/leaflet-layer leaflet
```

## Usage

### Script Tag (IIFE) - Simplest Setup

No bundler required! Just include the script and use the global `IndiaBoundaryCorrector`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@india-boundary-corrector/leaflet-layer/dist/index.global.js"></script>

<div id="map" style="height: 400px;"></div>

<script>
  // Extend Leaflet with corrected tile layer
  IndiaBoundaryCorrector.extendLeaflet(L);

  // Create map
  const map = L.map('map').setView([33.2778, 75.3412], 5);

  // Use corrected tile layer - config auto-detected from URL
  L.tileLayer.indiaBoundaryCorrected('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
</script>
```

### ES Modules

```javascript
import L from 'leaflet';
import { extendLeaflet } from '@india-boundary-corrector/leaflet-layer';

// Extend Leaflet with corrected tile layer
extendLeaflet(L);

// Create map
const map = L.map('map').setView([33.2778, 75.3412], 5);

// Use corrected tile layer - config auto-detected from URL
L.tileLayer.indiaBoundaryCorrected('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
```

### With Explicit Layer Config

```javascript
import L from 'leaflet';
import { extendLeaflet, layerConfigs } from '@india-boundary-corrector/leaflet-layer';

extendLeaflet(L);

const map = L.map('map').setView([33.2778, 75.3412], 5);

// Use a specific config by ID
L.tileLayer.indiaBoundaryCorrected('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  layerConfig: 'cartodb-dark',
  attribution: '© CARTO © OpenStreetMap contributors'
}).addTo(map);
```

### With Custom Layer Config

```javascript
import L from 'leaflet';
import { extendLeaflet, LayerConfig } from '@india-boundary-corrector/leaflet-layer';

extendLeaflet(L);

const map = L.map('map').setView([33.2778, 75.3412], 5);

// Create custom config
const osmDeConfig = new LayerConfig({
  id: 'osm-de',
  tileUrlTemplates: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    // layerSuffix determines which PMTiles layer to use
    { color: 'rgb(180, 200, 180)', layerSuffix: 'osm' },
    { color: 'rgb(121, 146, 127)', layerSuffix: 'osm', widthFraction: 1/3, dashArray: [30, 2, 8, 2] },
  ],
});

// Pass as layerConfig option
L.tileLayer.indiaBoundaryCorrected('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
  layerConfig: osmDeConfig,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Or register with extraLayerConfigs for auto-detection
L.tileLayer.indiaBoundaryCorrected('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
  extraLayerConfigs: [osmDeConfig],
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
```

## Options

All standard `L.TileLayer` options are supported, plus:

| Option | Type | Description |
|--------|------|-------------|
| `pmtilesUrl` | string | URL to PMTiles file (auto-detected if not provided) |
| `layerConfig` | LayerConfig \| string | Layer config object or config ID |
| `extraLayerConfigs` | LayerConfig[] | Additional configs for auto-detection |
| `fallbackOnCorrectionFailure` | boolean | Return original tile if corrections fail (default: true) |

## Events

### `correctionerror`

Fired when the corrections data fails to load (e.g., PMTiles fetch failure). The tile will still display using the original uncorrected image.

```javascript
layer.on('correctionerror', (e) => {
  console.warn('Corrections unavailable:', e.error);
  console.log('Tile coords:', e.coords); // { z, x, y }
  console.log('Tile URL:', e.tileUrl);
});
```

| Property | Type | Description |
|----------|------|-------------|
| `error` | Error | The error that occurred |
| `coords` | object | Tile coordinates `{ z, x, y }` |
| `tileUrl` | string | URL of the tile being loaded |

## Bundling

If you're bundling your application (Rollup, Webpack, Vite, etc.), you may need to copy the PMTiles data file to your output directory. See **[Bundling the PMTiles Asset](../data/bundling-pmtiles.md)** for instructions.

## License

Unlicense
