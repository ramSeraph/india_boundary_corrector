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

The package uses different correction layers based on zoom level:
- **Lower zoom (< 5)**: Uses Natural Earth (`to-del-ne`, `to-add-ne`) corrections
- **Higher zoom (≥ 5)**: Uses OpenStreetMap (`to-del-osm`, `to-add-osm`) corrections

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

### `removeBoundaryCorrector(map, sourceId)`

Removes boundary corrector layers for a specific source.

**Parameters:**
- `map`: MapLibre map instance
- `sourceId`: ID of the raster source to remove corrections for

### `getBoundaryCorrectorConfig(map, options?)`

Get boundary corrector configuration without adding to map. Use this for manual control over when/how layers are added.

**Options:**
- `sourceId` (optional): ID of the raster source (required if layerConfig not provided)
- `layerId` (optional): ID of the raster layer (auto-detected from sourceId)
- `pmtilesUrl` (optional): URL to the PMTiles file (defaults to CDN)
- `layerConfig` (optional): Layer configuration object or config name string

**Returns:** Configuration object with `{ sources, layers, pmtilesUrl, layerConfig, sourceId, layerId }` or `null` if config cannot be resolved.

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

## Custom Layer Configs

```javascript
const myConfig = {
  zoomThreshold: 5,
  osmAddLineColor: '#000000',
  osmDelLineColor: '#f5f5f3',
  neAddLineColor: '#000000',
  neDelLineColor: '#f5f5f3',
  osmAddLineWidth: 1.5,
  osmDelLineWidth: 1.5,
  neAddLineWidth: 1.5,
  neDelLineWidth: 1.5,
};

const corrector = addBoundaryCorrector(map, {
  layerConfig: myConfig,
});
```

## License

Unlicense
