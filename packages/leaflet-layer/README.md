# @india-boundary-corrector/leaflet-layer

Leaflet TileLayer extension that automatically applies India boundary corrections.

## Installation

```bash
npm install @india-boundary-corrector/leaflet-layer leaflet
```

## Usage

### Script Tag (IIFE) - Simplest Setup

No bundler required! Just include the script and use the global `IndiaBoundaryCorrector`:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/@india-boundary-corrector/leaflet-layer/dist/index.global.js"></script>

<div id="map" style="height: 400px;"></div>

<script>
  // Extend Leaflet with corrected tile layer
  IndiaBoundaryCorrector.extendLeaflet(L);

  // Create map
  const map = L.map('map').setView([20.5937, 78.9629], 5);

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
const map = L.map('map').setView([20.5937, 78.9629], 5);

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

const map = L.map('map').setView([20.5937, 78.9629], 5);

// Use a specific config by ID
L.tileLayer.indiaBoundaryCorrected('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  layerConfig: 'cartodb-dark',
  attribution: '© CartoDB © OpenStreetMap contributors'
}).addTo(map);
```

### With Custom Layer Config

```javascript
import L from 'leaflet';
import { extendLeaflet, LayerConfig } from '@india-boundary-corrector/leaflet-layer';

extendLeaflet(L);

const map = L.map('map').setView([20.5937, 78.9629], 5);

// Create custom config
const osmDeConfig = new LayerConfig({
  id: 'osm-de',
  tileUrlPattern: /tile\.openstreetmap\.de/,
  osmAddLineColor: 'rgb(165, 180, 165)',
  neAddLineColor: 'rgb(165, 180, 165)',
  lineWidthMultiplier: 1.5,
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
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

## Global Auto-extension

If Leaflet is available as a global `L` object, the extension is applied automatically on import:

```html
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script type="module">
  import '@india-boundary-corrector/leaflet-layer';
  
  // L.TileLayer.IndiaBoundaryCorrected is now available
  const map = L.map('map').setView([20.5937, 78.9629], 5);
  L.tileLayer.indiaBoundaryCorrected('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
</script>
```

## License

Unlicense
