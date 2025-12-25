# MapLibre Examples

This directory contains examples demonstrating how to use the India Boundary Corrector with MapLibre GL JS.

## Examples

### 1. Basic Example (`basic.html`)
Simple implementation using the `addBoundaryCorrector` helper function with OSM Carto Dark tiles.

**Features:**
- OSM Carto Dark base map
- Complete boundary corrections
- Minimal code
- Navigation controls

**To run:** Start a local server from the repository root and open `basic.html`.

---

### 2. Side-by-Side Comparison (`side-by-side.html`)
Split-screen view comparing original OSM boundaries (left) with corrected boundaries (right).

**Features:**
- Synchronized map movements
- Visual comparison
- Dark theme design
- Responsive layout

**To run:** Start a local server and open `side-by-side.html`.

---

### 3. Layer Switcher (`layer-switcher.html`)
Switch between different base layers with automatic correction handling.

**Features:**
- CartoDB Dark tiles (with corrections)
- OpenStreetMap Standard tiles (with corrections)
- ESRI World Imagery satellite (no corrections)
- Dynamic layer switching

**To run:** Start a local server and open `layer-switcher.html`.

---

## Local Development

All examples can be run directly in a browser without a build step. They use unpkg CDN to load dependencies.

### Using a Local Server

For better performance and to avoid CORS issues, serve the examples with a local HTTP server:

```bash
# From the repository root
npm run serve

# Or using Python 3
python3 -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

Then open `http://localhost:8080/examples/maplibre/` in your browser.

---

## Integration in Your Project

### Installation

```bash
npm install @india-boundary-corrector/maplibre maplibre-gl pmtiles
```

### Basic Usage

```javascript
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Register PMTiles protocol
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256
      }
    },
    layers: [{ id: 'base', type: 'raster', source: 'carto-dark' }]
  },
  center: [78.9629, 20.5937],
  zoom: 4,
});

map.on('load', () => {
  // Auto-detects tile layers and adds corrections
  const corrector = addBoundaryCorrector(map);
  
  // To remove later:
  // corrector.remove();
});
```

### With Explicit Configuration

```javascript
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';
import { osmCartoDark } from '@india-boundary-corrector/layer-configs';

map.on('load', () => {
  const corrector = addBoundaryCorrector(map, {
    layerConfig: osmCartoDark,  // or 'osm-carto-dark' as string
    // pmtilesUrl: 'custom-url.pmtiles',  // optional custom URL
  });
});
```

---

## How It Works

The boundary correction system works in three layers:

1. **Base Raster Layer**: Renders the original raster tile source (e.g., OSM Carto Dark)
2. **Delete Layers**: Draws lines matching the background color over incorrect boundaries
3. **Add Layers**: Draws the correct India boundaries

Different correction layers are used based on zoom level:
- **Lower zoom (< 5)**: Uses Natural Earth corrections (`to-del-ne`, `to-add-ne`)
- **Higher zoom (≥ 5)**: Uses OpenStreetMap corrections (`to-del-osm`, `to-add-osm`)

---

## Customization

You can create custom layer configurations using the `LayerConfig` class:

```javascript
import { LayerConfig } from '@india-boundary-corrector/layer-configs';

const customConfig = new LayerConfig({
  id: 'my-custom-map',
  tileUrlPattern: /my-tile-server/,
  zoomThreshold: 5,
  osmAddLineColor: '#ff0000',  // Red boundaries
  osmDelLineColor: '#ffffff',  // White mask
  lineWidthMultiplier: 1.5,    // Thicker lines
});

const corrector = addBoundaryCorrector(map, {
  layerConfig: customConfig
});
```

---

## Resources

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [PMTiles Specification](https://github.com/protomaps/PMTiles)
- [India Boundary Corrector GitHub](https://github.com/ramSeraph/india_boundary_corrector)

---

## License

These examples are released under the Unlicense.
