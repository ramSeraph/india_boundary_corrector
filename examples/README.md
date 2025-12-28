# Examples

This folder contains examples demonstrating how to use the India Boundary Corrector packages.

## Running Examples Locally

1. Install dependencies from the repository root:
   ```bash
   npm install
   ```

2. Build all packages:
   ```bash
   npm run build
   ```

3. Start a local server from the examples folder:
   ```bash
   cd examples
   npx http-server . --cors -p 8080
   ```

4. Open `http://localhost:8080/` in your browser.

## Example Categories

### Leaflet Examples (`leaflet/`)
- **script-tag.html**: Simple `<script>` tag setup using IIFE bundle (no bundler required)
- **tile-layer.html**: Using `L.tileLayer.indiaBoundaryCorrected()` with ES modules
- **service-worker.html**: Using service worker for automatic tile correction
- **custom-layerconfig.html**: Creating custom LayerConfig for unsupported tile providers
- **service-worker-custom.html**: Service worker with custom layer config

### OpenLayers Examples (`openlayers/`)
- **script-tag.html**: Simple `<script>` tag setup using IIFE bundle (no bundler required)
- **tile-layer.html**: Using `IndiaBoundaryCorrectedTileLayer` with ES modules
- **service-worker.html**: Using service worker for automatic tile correction
- **custom-layerconfig.html**: Creating custom LayerConfig for unsupported tile providers

### MapLibre Examples (`maplibre/`)
- **script-tag.html**: Simple `<script>` tag setup using IIFE bundle (no bundler required)
- **protocol.html**: Using custom `ibc://` protocol with ES modules
- **service-worker.html**: Using service worker for automatic tile correction
- **custom-layerconfig.html**: Creating custom LayerConfig for unsupported tile providers

## Usage Patterns

### Script Tag (IIFE) - Simplest Setup

No bundler required! Just include the script and use the global `IndiaBoundaryCorrector`:

```html
<!-- Leaflet -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="path/to/leaflet-layer/dist/index.global.js"></script>
<script>
  IndiaBoundaryCorrector.extendLeaflet(L);
  L.tileLayer.indiaBoundaryCorrected('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
</script>

<!-- MapLibre -->
<script src="https://unpkg.com/maplibre-gl@5.0.1/dist/maplibre-gl.js"></script>
<script src="path/to/maplibre-protocol/dist/index.global.js"></script>
<script>
  IndiaBoundaryCorrector.registerCorrectionProtocol(maplibregl);
  // Use ibc://https://... URLs in your tile sources
</script>

<!-- OpenLayers -->
<script src="https://cdn.jsdelivr.net/npm/ol@10.3.1/dist/ol.js"></script>
<script src="path/to/openlayers-layer/dist/index.global.js"></script>
<script>
  const layer = new IndiaBoundaryCorrector.IndiaBoundaryCorrectedTileLayer({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  });
</script>
```

### ES Modules

For modern applications using import maps or bundlers:

```javascript
import { extendLeaflet } from '@india-boundary-corrector/leaflet-layer';
import { registerCorrectionProtocol } from '@india-boundary-corrector/maplibre-protocol';
import { IndiaBoundaryCorrectedTileLayer } from '@india-boundary-corrector/openlayers-layer';
```

## Notes

- Service worker examples require HTTPS or localhost
- IIFE bundles expose the `IndiaBoundaryCorrector` global object
- Examples use relative imports and work with the local development build
- Each example includes comments explaining the setup
