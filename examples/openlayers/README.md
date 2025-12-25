# OpenLayers Examples

This directory contains examples demonstrating how to use the India Boundary Corrector with OpenLayers.

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

Then open `http://localhost:8080/examples/openlayers/` in your browser.

---

## Integration in Your Project

### Installation

```bash
npm install @india-boundary-corrector/openlayers ol ol-pmtiles
```

### Basic Usage

```javascript
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { useGeographic } from 'ol/proj';
import { addBoundaryCorrector } from '@india-boundary-corrector/openlayers';

useGeographic();

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new XYZ({
        urls: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png']
      })
    })
  ],
  view: new View({
    center: [78.9629, 20.5937],
    zoom: 4
  })
});

// Auto-detects tile layers and adds corrections
const corrector = addBoundaryCorrector(map);

// To remove later:
// corrector.remove();
```

### With Explicit Configuration

```javascript
import { addBoundaryCorrector } from '@india-boundary-corrector/openlayers';
import { osmCarto } from '@india-boundary-corrector/layer-configs';

const corrector = addBoundaryCorrector(map, {
  layerConfig: osmCarto,  // or 'osm-carto' as string
});
```

---

## How It Works

The OpenLayers integration uses `ol-pmtiles` to render vector tile corrections:

1. **Base Tile Layer**: Standard OpenLayers TileLayer renders the raster tiles
2. **Delete Layer**: VectorTileLayer draws background-colored lines to mask incorrect boundaries
3. **Add Layer**: VectorTileLayer draws the correct India boundaries
4. **Auto-tracking**: The corrector listens to layer collection events to manage corrections dynamically

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

- The OpenLayers integration requires `ol-pmtiles` as a peer dependency
- Corrections are rendered as two separate VectorTile layers (delete + add)
- The corrector automatically manages layer z-ordering relative to the base layer

---

## Resources

- [OpenLayers Documentation](https://openlayers.org/en/latest/doc/)
- [ol-pmtiles](https://github.com/protomaps/ol-pmtiles)
- [India Boundary Corrector GitHub](https://github.com/ramSeraph/india_boundary_corrector)

---

## License

These examples are released under the Unlicense.
