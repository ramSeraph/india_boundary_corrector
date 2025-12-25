# Leaflet Examples

This directory contains examples demonstrating how to use the India Boundary Corrector with Leaflet.

## Examples

### 1. Basic Example (`basic.html`)
Simple implementation using the `addBoundaryCorrector` helper function with OSM Carto Dark tiles.

**Features:**
- Auto-detection of tile layers
- OSM Carto Dark base map
- Complete boundary corrections
- Minimal code

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

These examples import from local source files and need to be served via HTTP.

### Using a Local Server

```bash
# From the repository root
npm run serve

# Or using Python 3
python3 -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

Then open `http://localhost:8080/examples/leaflet/` in your browser.

---

## Integration in Your Project

### Installation

```bash
npm install @india-boundary-corrector/leaflet leaflet protomaps-leaflet
```

### Basic Usage

```javascript
import L from 'leaflet';
import { addBoundaryCorrector } from '@india-boundary-corrector/leaflet';

const map = L.map('map').setView([20.5937, 78.9629], 4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors, © CARTO'
}).addTo(map);

// Auto-detects tile layers and adds corrections
const corrector = addBoundaryCorrector(map);

// To remove later:
// corrector.remove();
```

### With Explicit Configuration

```javascript
import { addBoundaryCorrector } from '@india-boundary-corrector/leaflet';
import { osmCarto } from '@india-boundary-corrector/layer-configs';

const corrector = addBoundaryCorrector(map, {
  layerConfig: osmCarto,  // or 'osm-carto' as string
  // tileLayer: specificTileLayer,  // optional: track specific layer only
});
```

---

## How It Works

The Leaflet integration uses `protomaps-leaflet` to render vector tile corrections:

1. **Base Tile Layer**: Standard Leaflet `L.tileLayer` renders the raster tiles
2. **Correction Layer**: `protomaps-leaflet` renders PMTiles vector data with custom symbolizers
3. **Auto-tracking**: The corrector listens to `layeradd`/`layerremove` events to manage corrections dynamically

Different correction layers are used based on zoom level:
- **Lower zoom (< threshold)**: Uses Natural Earth corrections
- **Higher zoom (≥ threshold)**: Uses OpenStreetMap corrections

---

## Customization

You can create custom layer configurations:

```javascript
import { LayerConfig } from '@india-boundary-corrector/layer-configs';

const customConfig = new LayerConfig({
  id: 'my-custom-map',
  tileUrlPattern: /my-tile-server/,
  zoomThreshold: 5,
  osmAddLineColor: '#ff0000',
  osmDelLineColor: '#ffffff',
  addLineDashed: true,
  addLineDashArray: [8, 4],
  lineWidthMultiplier: 1.5,
});

const corrector = addBoundaryCorrector(map, {
  layerConfig: customConfig
});
```

---

## Notes

- The Leaflet integration requires `protomaps-leaflet` as a peer dependency
- Corrections are rendered as a separate canvas layer on top of the tile layer
- The corrector automatically manages layer z-ordering

---

## Resources

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [protomaps-leaflet](https://github.com/protomaps/protomaps-leaflet)
- [India Boundary Corrector GitHub](https://github.com/ramSeraph/india_boundary_corrector)

---

## License

These examples are released under the Unlicense.
