# @india-boundary-corrector/leaflet

Leaflet integration for displaying India maps with corrected boundaries using [protomaps-leaflet](https://github.com/protomaps/protomaps-leaflet).

## Installation

```bash
npm install @india-boundary-corrector/leaflet leaflet protomaps-leaflet
```

## Usage

### Basic Usage (Auto-detection)

```javascript
import L from 'leaflet';
import { addBoundaryCorrector } from '@india-boundary-corrector/leaflet';

const map = L.map('map').setView([20.5937, 78.9629], 4);

// Add a supported base tile layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors, © CARTO'
}).addTo(map);

// Auto-detect tile layer and add corrections
const corrector = addBoundaryCorrector(map);

// Later: cleanup
corrector.remove();
```

### Explicit Tile Layer

```javascript
const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');
baseLayer.addTo(map);

const corrector = addBoundaryCorrector(map, { 
  tileLayer: baseLayer 
});
```

### Explicit Layer Config

```javascript
import { osmCartoDark } from '@india-boundary-corrector/layer-configs';

const corrector = addBoundaryCorrector(map, { 
  layerConfig: osmCartoDark 
});

// Or by config ID
const corrector = addBoundaryCorrector(map, { 
  layerConfig: 'osm-carto-dark' 
});
```

### Custom PMTiles URL

```javascript
const corrector = addBoundaryCorrector(map, {
  pmtilesUrl: 'https://my-cdn.com/india_boundary_corrections.pmtiles'
});
```

## How It Works

1. **Auto-detection**: Scans map layers to find matching tile layers based on URL patterns
2. **Dynamic Tracking**: Listens for `layeradd` and `layerremove` events to automatically add/remove corrections
3. **Vector Rendering**: Uses protomaps-leaflet to render boundary corrections from PMTiles
4. **Zoom-based Styling**: Uses Natural Earth data at low zoom levels and OSM data at higher zoom levels

> **Note**: The correction layer renders in the default `tilePane`. Custom panes are not used due to compatibility issues with protomaps-leaflet.

### Dynamic Layer Tracking

When no specific `tileLayer` is provided, the corrector automatically:
- Adds corrections when a matching tile layer is added to the map
- Removes corrections when the corresponding tile layer is removed

```javascript
const corrector = addBoundaryCorrector(map);

// Later: add a new tile layer - corrections are automatically added
const newLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');
newLayer.addTo(map); // Corrections automatically added!

// Remove the layer - corrections are automatically removed
map.removeLayer(newLayer); // Corrections automatically removed!
```

### Correction Layers

The PMTiles file contains 4 layers:
- `to-del-ne`: Lines to mask (Natural Earth, low zoom)
- `to-add-ne`: Correct boundaries (Natural Earth, low zoom)
- `to-del-osm`: Lines to mask (OSM, high zoom)
- `to-add-osm`: Correct boundaries (OSM, high zoom)

## API

### `addBoundaryCorrector(map, options?)`

Add boundary corrections to a Leaflet map.

**Parameters:**
- `map`: Leaflet map instance
- `options.tileLayer`: Specific tile layer to add corrections for (auto-detect if not provided)
- `options.pmtilesUrl`: URL to the PMTiles file (optional, defaults to bundled file)
- `options.layerConfig`: Layer configuration object or config ID string

**Returns:** `BoundaryCorrector` instance

### `removeBoundaryCorrector(corrector)`

Remove boundary corrector from the map.

### `BoundaryCorrector` Class

```javascript
const corrector = new BoundaryCorrector(map, options);
corrector.init();              // Initialize and add to map
corrector.remove();            // Remove from map and stop tracking
corrector.getTrackedLayers();  // Get Map of tracked tile layers
corrector.hasCorrections(layer); // Check if a layer has corrections
corrector.isInitialized();     // Check if initialized
```

## Supported Tile Providers

Built-in support for:
- **OSM Carto Dark** (`osm-carto-dark`): CartoDB dark_all tiles
- **OSM Carto** (`osm-carto`): OpenStreetMap standard tiles

## Custom Layer Configs

```javascript
import { LayerConfig } from '@india-boundary-corrector/layer-configs';

const myConfig = new LayerConfig({
  id: 'my-custom-map',
  zoomThreshold: 5,
  tileUrlPattern: /my-tile-server\.com/,
  // OSM styles (zoom >= zoomThreshold)
  osmAddLineColor: '#000000',
  osmAddLineWidth: 2,
  osmDelLineColor: '#f5f5f3',
  osmDelLineWidth: 3,
  // NE styles (zoom < zoomThreshold)
  neAddLineColor: '#000000',
  neAddLineWidth: 1,
  neDelLineColor: '#f5f5f3',
  neDelLineWidth: 2,
});

const corrector = addBoundaryCorrector(map, { layerConfig: myConfig });
```

## Browser Usage (CDN)

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/protomaps-leaflet@5.1.0/dist/protomaps-leaflet.js"></script>
<script src="https://unpkg.com/@india-boundary-corrector/leaflet/dist/index.js"></script>

<script>
  const map = L.map('map').setView([20.5937, 78.9629], 4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png').addTo(map);
  
  const corrector = indiaBoundaryCorrector.addBoundaryCorrector(map);
</script>
```

## License

Unlicense
