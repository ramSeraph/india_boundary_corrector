# @india-boundary-corrector/openlayers-layer

OpenLayers TileLayer extension that automatically applies India boundary corrections.

## Installation

```bash
npm install @india-boundary-corrector/openlayers-layer ol
```

## Usage

### Script Tag (IIFE) - Simplest Setup

No bundler required! Just include the script and use the global `IndiaBoundaryCorrector`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@10.3.1/ol.css">
<script src="https://cdn.jsdelivr.net/npm/ol@10.3.1/dist/ol.js"></script>
<script src="https://unpkg.com/@india-boundary-corrector/openlayers-layer/dist/index.global.js"></script>

<div id="map" style="height: 400px;"></div>

<script>
  const { IndiaBoundaryCorrectedTileLayer } = IndiaBoundaryCorrector;

  const map = new ol.Map({
    target: 'map',
    layers: [
      new IndiaBoundaryCorrectedTileLayer({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      })
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([78.9629, 20.5937]),
      zoom: 5
    })
  });
</script>
```

### ES Modules

```javascript
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { IndiaBoundaryCorrectedTileLayer } from '@india-boundary-corrector/openlayers-layer';

const map = new Map({
  target: 'map',
  layers: [
    new IndiaBoundaryCorrectedTileLayer({
      url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    })
  ],
  view: new View({
    center: fromLonLat([78.9629, 20.5937]),
    zoom: 5
  })
});
```

### With Explicit Layer Config

```javascript
import { IndiaBoundaryCorrectedTileLayer } from '@india-boundary-corrector/openlayers-layer';

const layer = new IndiaBoundaryCorrectedTileLayer({
  url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  layerConfig: 'cartodb-dark'
});
```

### With Custom Layer Config

```javascript
import { IndiaBoundaryCorrectedTileLayer, LayerConfig } from '@india-boundary-corrector/openlayers-layer';

const osmDeConfig = new LayerConfig({
  id: 'osm-de',
  tileUrlTemplates: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    { color: 'rgb(180, 200, 180)' },
    { color: 'rgb(121, 146, 127)', widthFraction: 1/3, dashArray: [30, 2, 8, 2] },
  ],
});

const layer = new IndiaBoundaryCorrectedTileLayer({
  url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  layerConfig: osmDeConfig
});

// Or use extraLayerConfigs for auto-detection
const layer2 = new IndiaBoundaryCorrectedTileLayer({
  url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  extraLayerConfigs: [osmDeConfig]
});
```

### Factory Function

```javascript
import { indiaBoundaryCorrectedTileLayer } from '@india-boundary-corrector/openlayers-layer';

const layer = indiaBoundaryCorrectedTileLayer({
  url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `url` | string | Tile URL template with `{z}`, `{x}`, `{y}` placeholders |
| `pmtilesUrl` | string | URL to PMTiles file (auto-detected if not provided) |
| `layerConfig` | LayerConfig \| string | Layer config object or config ID |
| `extraLayerConfigs` | LayerConfig[] | Additional configs for auto-detection |
| `tileSize` | number | Tile size in pixels (default: 256) |
| `sourceOptions` | Object | Additional options passed to XYZ source |
| `...layerOptions` | Object | Additional options passed to TileLayer |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getTileFixer()` | `TileFixer` | Get the underlying TileFixer instance |
| `getLayerConfig()` | `LayerConfig` | Get the resolved layer configuration |
| `getRegistry()` | `LayerConfigRegistry` | Get the layer config registry |

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

## License

Unlicense
