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
- **leaflet-layer/**: Using `CorrectedTileLayer` extension
- **service-worker/**: Using service worker for automatic tile correction
- **service-worker-custom/**: Service worker with custom layer config

### OpenLayers Examples (`openlayers/`)
- **openlayers-layer/**: Using `CorrectedTileLayer` source
- **service-worker/**: Using service worker for automatic tile correction

### MapLibre Examples (`maplibre/`)
- **maplibre-protocol/**: Using custom `corrections:` protocol
- **service-worker/**: Using service worker for automatic tile correction

## Notes

- Service worker examples require HTTPS or localhost
- Examples use relative imports and work with the local development build
- Each example includes comments explaining the setup
