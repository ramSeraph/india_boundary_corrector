# @india-boundary-corrector/openlayers

OpenLayers integration for displaying India maps with corrected boundaries using [ol-pmtiles](https://github.com/protomaps/PMTiles/tree/main/openlayers).

## Installation

```bash
npm install @india-boundary-corrector/openlayers ol ol-pmtiles
```

## Usage

### Basic Usage

```javascript
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { useGeographic } from 'ol/proj';
import { addBoundaryCorrector } from '@india-boundary-corrector/openlayers';

useGeographic();

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() }),
  ],
  view: new View({
    center: [78.9629, 20.5937],
    zoom: 4,
  }),
});

// Add corrections - auto-detects layer config from tile URLs
const corrector = addBoundaryCorrector(map);

// Later: cleanup
corrector.remove();
```

### With Layer Config Object

```javascript
import { osmCartoDark } from '@india-boundary-corrector/layer-configs';

const corrector = addBoundaryCorrector(map, { 
  layerConfig: osmCartoDark 
});
```

### Custom PMTiles URL

```javascript
const corrector = addBoundaryCorrector(map, {
  layerConfig: 'osm-carto',
  pmtilesUrl: 'https://my-cdn.com/india_boundary_corrections.pmtiles'
});
```

## How It Works

1. **Vector Tiles**: Uses ol-pmtiles to load boundary corrections from PMTiles
2. **Zoom-based Styling**: Uses Natural Earth data at low zoom levels and OSM data at higher zoom levels
3. **Style Function**: Dynamically styles features based on layer name and zoom level
4. **Dynamic Line Widths**: Line widths scale with zoom level (zoom/4 for additions, zoom/2 for deletions)

### Correction Layers

The PMTiles file contains 4 layers:
- `to-del-ne`: Lines to mask (Natural Earth, low zoom)
- `to-add-ne`: Correct boundaries (Natural Earth, low zoom)
- `to-del-osm`: Lines to mask (OSM, high zoom)
- `to-add-osm`: Correct boundaries (OSM, high zoom)

## API

### `addBoundaryCorrector(map, options?)`

Add boundary corrections to an OpenLayers map.

**Parameters:**
- `map`: OpenLayers Map instance
- `options.pmtilesUrl`: URL to the PMTiles file (optional, defaults to bundled file)
- `options.layerConfig`: Layer configuration object or config ID string (optional, auto-detected from tile URLs)

**Returns:** `BoundaryCorrector` instance

**Features:**
- Automatically detects tile layers and applies corrections
- Tracks layer additions/removals dynamically
- Auto-detects layer config from tile URLs if not provided

### `removeBoundaryCorrector(corrector)`

Remove boundary corrector from the map.

### `BoundaryCorrector` Class

```javascript
const corrector = new BoundaryCorrector(map, options);
corrector.init();                    // Initialize and start tracking
corrector.remove();                  // Remove all corrections and stop tracking
corrector.getTrackedLayers();        // Get map of tracked base layers
corrector.hasCorrections(layer);     // Check if layer has corrections
corrector.getCorrectionLayer(layer); // Get correction layer for a base layer
corrector.getLayerConfig(layer);     // Get resolved config for a base layer
corrector.isInitialized();           // Check if initialized
```

## Supported Tile Providers

Built-in support for:
- **OSM Carto Dark** (`osm-carto-dark`): CartoDB dark_all tiles
- **OSM Carto** (`osm-carto`): OpenStreetMap standard tiles (with dashed boundary lines)

## Custom Layer Configs

```javascript
import { LayerConfig } from '@india-boundary-corrector/layer-configs';

const myConfig = new LayerConfig({
  id: 'my-custom-map',
  startZoom: 0,
  zoomThreshold: 5,
  tileUrlPattern: /my-tile-server\.com/,
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

const corrector = addBoundaryCorrector(map, { layerConfig: myConfig });
```

## Browser Usage (CDN)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@9.0.0/ol.css">
<script src="https://cdn.jsdelivr.net/npm/ol@9.0.0/dist/ol.js"></script>
<script src="https://unpkg.com/ol-pmtiles@2.0.2/dist/olpmtiles.js"></script>
<script type="module">
  import { addBoundaryCorrector } from './india_boundary_corrector/packages/openlayers/src/index.js';

  ol.proj.useGeographic();
  
  const map = new ol.Map({
    target: 'map',
    layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
    view: new ol.View({ center: [78.9629, 20.5937], zoom: 4 }),
  });
  
  const corrector = addBoundaryCorrector(map);
</script>
```

## License

Unlicense
