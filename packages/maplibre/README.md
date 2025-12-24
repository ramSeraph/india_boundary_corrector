# @india-boundary-corrector/maplibre

MapLibre GL JS integration for displaying India maps with corrected boundaries.

## Installation

```bash
npm install @india-boundary-corrector/maplibre maplibre-gl pmtiles
```

## Usage

```javascript
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Register pmtiles protocol
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.example.com/style.json', // any style with raster layers
  center: [78.9629, 20.5937], // India center
  zoom: 4,
});

map.on('load', () => {
  // Automatically detect and correct India boundaries
  const corrector = addBoundaryCorrector(map);
  
  // Later, to remove corrections:
  // corrector.remove();
});
```

## How It Works

1. **Base raster layer**: Uses your existing raster tile source (e.g., OSM Carto Dark)
2. **Delete layers**: Draws lines matching the background color over incorrect boundaries
3. **Add layers**: Draws the correct India boundaries
4. **Dynamic Line Widths**: Line widths scale with zoom level using MapLibre expressions

The package uses different correction layers based on zoom level:
- **Lower zoom (< threshold)**: Uses Natural Earth (`to-del-ne`, `to-add-ne`) corrections
- **Higher zoom (≥ threshold)**: Uses OpenStreetMap (`to-del-osm`, `to-add-osm`) corrections

## API

### `addBoundaryCorrector(map, options?)`

Add India boundary corrections that automatically track raster sources/layers.

**Options:**
- `sourceId` (optional): Specific raster source ID to add corrections for (skips auto-detection)
- `layerId` (optional): Specific raster layer ID to add corrections above
- `pmtilesUrl` (optional): URL to the PMTiles file (defaults to CDN)
- `layerConfig` (optional): Layer configuration object or config name string

**Returns:** `BoundaryCorrector` instance (call `remove()` to cleanup)

**Example with auto-detection:**
```javascript
// Automatically finds raster sources and applies corrections
const corrector = addBoundaryCorrector(map);
```

**Example with explicit source:**
```javascript
const corrector = addBoundaryCorrector(map, {
  sourceId: 'my-raster-source',
  layerId: 'my-raster-layer',
  layerConfig: 'osm-carto-dark', // or a config object
});
```

### `removeBoundaryCorrector(corrector)`

Remove boundary corrector from the map.

**Parameters:**
- `corrector`: BoundaryCorrector instance returned by addBoundaryCorrector

### `BoundaryCorrector` class

The class returned by `addBoundaryCorrector()`.

**Constructor:**
```javascript
new BoundaryCorrector(map, options?)
```

**Methods:**
- `init()`: Initialize the boundary corrector and start tracking. Returns `this`.
- `remove()`: Remove all corrections and cleanup listeners.
- `getTrackedSources()`: Get the tracked sources map.
- `hasCorrections(sourceId)`: Check if corrections are active for a specific source.

## Supported Tile Providers

Built-in support for:
- **OSM Carto Dark** (`osm-carto-dark`): CartoDB dark_all tiles
- **OSM Carto** (`osm-carto`): OpenStreetMap standard tiles (with dashed boundary lines)

## Custom Layer Configs

```javascript
import { LayerConfig } from '@india-boundary-corrector/layer-configs';

const myConfig = new LayerConfig({
  id: 'my-custom-style',
  startZoom: 0,
  zoomThreshold: 5,
  tileUrlPattern: /mytiles\.com/,
  // Colors for boundary lines
  osmAddLineColor: '#000000',
  osmDelLineColor: '#f5f5f3',
  neAddLineColor: '#000000',
  neDelLineColor: '#f5f5f3',
  // Optional: dashed lines with halo
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
  // Optional: width multiplier
  lineWidthMultiplier: 1.0,
});

const corrector = addBoundaryCorrector(map, {
  layerConfig: myConfig,
});
```

## License

Unlicense
