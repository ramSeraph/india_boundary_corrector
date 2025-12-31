# @india-boundary-corrector/maplibre-protocol

MapLibre GL custom protocol for India boundary corrections.

## Installation

```bash
npm install @india-boundary-corrector/maplibre-protocol maplibre-gl
```

## Usage

### Script Tag (IIFE) - Simplest Setup

No bundler required! Just include the script and use the global `IndiaBoundaryCorrector`:

```html
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/@india-boundary-corrector/maplibre-protocol/dist/index.global.js"></script>

<div id="map" style="height: 400px;"></div>

<script>
  // Register the ibc:// protocol
  IndiaBoundaryCorrector.registerCorrectionProtocol(maplibregl);

  // Use in map style
  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256
        }
      },
      layers: [
        { id: 'osm', type: 'raster', source: 'osm' }
      ]
    },
    center: [78.9629, 20.5937],
    zoom: 5
  });
</script>
```

### ES Modules

```javascript
import maplibregl from 'maplibre-gl';
import { registerCorrectionProtocol } from '@india-boundary-corrector/maplibre-protocol';

// Register the ibc:// protocol
registerCorrectionProtocol(maplibregl);

// Use in map style
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [
      { id: 'osm', type: 'raster', source: 'osm' }
    ]
  },
  center: [78.9629, 20.5937],
  zoom: 5
});
```

### With Explicit Config ID

Specify the config ID in the URL:

```javascript
tiles: ['ibc://cartodb-dark@https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png']
```

### With Custom Layer Config

```javascript
import maplibregl from 'maplibre-gl';
import { CorrectionProtocol, LayerConfig } from '@india-boundary-corrector/maplibre-protocol';

// Create protocol with custom config
const protocol = new CorrectionProtocol();

// Add custom config
protocol.addLayerConfig(new LayerConfig({
  id: 'osm-de',
  tileUrlPattern: /tile\.openstreetmap\.de/,
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    { color: 'rgb(180, 200, 180)' },
    { color: 'rgb(121, 146, 127)', widthFraction: 1/3, dashArray: [30, 2, 8, 2] },
  ],
}));

// Register with MapLibre
protocol.register(maplibregl);

// Use in style (auto-detected or explicit)
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      osmde: {
        type: 'raster',
        tiles: ['ibc://https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
        // Or explicit: tiles: ['ibc://osm-de@https://tile.openstreetmap.de/{z}/{x}/{y}.png']
        tileSize: 256
      }
    },
    layers: [
      { id: 'osmde', type: 'raster', source: 'osmde' }
    ]
  }
});
```

## URL Format

```
ibc://[configId@]originalTileUrl
```

- `configId` (optional): Layer config ID to use
- `originalTileUrl`: The original tile URL template

Examples:
- `ibc://https://tile.openstreetmap.org/{z}/{x}/{y}.png` (auto-detect)
- `ibc://osm-carto@https://tile.openstreetmap.org/{z}/{x}/{y}.png` (explicit)

## API

### `registerCorrectionProtocol(maplibregl, options?)`

Convenience function to create and register a protocol.

| Parameter | Type | Description |
|-----------|------|-------------|
| `maplibregl` | object | MapLibre GL namespace |
| `options.pmtilesUrl` | string | URL to PMTiles file |
| `options.tileSize` | number | Tile size (default: 256) |

Returns: `CorrectionProtocol`

### `CorrectionProtocol`

#### Constructor

```javascript
new CorrectionProtocol(options?)
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addLayerConfig(config)` | `this` | Add a custom layer config |
| `register(maplibregl)` | `this` | Register protocol with MapLibre |
| `unregister(maplibregl)` | `this` | Unregister protocol |
| `getRegistry()` | `LayerConfigRegistry` | Get the layer config registry |
| `getTileFixer()` | `TileFixer` | Get the TileFixer instance |

## License

Unlicense
