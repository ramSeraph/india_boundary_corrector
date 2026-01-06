# @india-boundary-corrector/service-worker

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/service-worker)](https://www.npmjs.com/package/@india-boundary-corrector/service-worker)

Service worker that intercepts map tile requests and applies India boundary corrections automatically.

## Installation

```bash
npm install @india-boundary-corrector/service-worker
```

## Usage

### 1. Create a Service Worker File

Create `sw.js` in your public directory:

```javascript
importScripts('https://cdn.jsdelivr.net/npm/@india-boundary-corrector/service-worker/dist/worker.global.js');
```

> **Note:** We use jsDelivr instead of unpkg because `importScripts()` does not follow HTTP redirects, and unpkg uses redirects for bare package URLs.

Or if bundling:

```javascript
import '@india-boundary-corrector/service-worker/worker';
```

### 2. Register from Main Thread

```javascript
import { registerCorrectionServiceWorker } from '@india-boundary-corrector/service-worker';

// Register and wait for control
const sw = await registerCorrectionServiceWorker('./sw.js');

// Now any matching tile requests will be automatically corrected
```

### 3. Use with Any Map Library

The service worker intercepts tile requests transparently:

```javascript
// Leaflet
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// OpenLayers
new TileLayer({ source: new XYZ({
  url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attributions: '© OpenStreetMap contributors'
}) });

// MapLibre
{ type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], attribution: '© OpenStreetMap contributors' }
```

### With Custom Layer Config

```javascript
import { 
  registerCorrectionServiceWorker, 
  LayerConfig 
} from '@india-boundary-corrector/service-worker';

const sw = await registerCorrectionServiceWorker('./sw.js');

// Add custom config
await sw.addLayerConfig(new LayerConfig({
  id: 'osm-de',
  tileUrlTemplates: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    { color: 'rgb(180, 200, 180)' },
    { color: 'rgb(121, 146, 127)', widthFraction: 1/3, dashArray: [30, 2, 8, 2] },
  ],
}));
```

## Usage with IIFE (No Bundler)

For projects without a module bundler, you can use the CDN builds directly.

### 1. Create a Service Worker File

Create `sw.js` in your public directory. This file **must** be hosted on your own domain (service workers cannot be loaded from a CDN):

```javascript
importScripts('https://cdn.jsdelivr.net/npm/@india-boundary-corrector/service-worker/dist/worker.global.js');
```

> **Note:** We use jsDelivr instead of unpkg because `importScripts()` does not follow HTTP redirects, and unpkg uses redirects for bare package URLs.

### 2. Include the Script and Register

```html
<script src="https://cdn.jsdelivr.net/npm/@india-boundary-corrector/service-worker/dist/index.global.js"></script>
<script>
  // The library is available as IndiaBoundaryCorrector on the global window object
  const { registerCorrectionServiceWorker, LayerConfig } = IndiaBoundaryCorrector;

  registerCorrectionServiceWorker('./sw.js').then(sw => {
    console.log('Service worker registered');
    
    // Now any matching tile requests will be automatically corrected
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  });
</script>
```

### With Custom Layer Config (IIFE)

```html
<script src="https://cdn.jsdelivr.net/npm/@india-boundary-corrector/service-worker/dist/index.global.js"></script>
<script>
  const { registerCorrectionServiceWorker, LayerConfig } = IndiaBoundaryCorrector;

  registerCorrectionServiceWorker('./sw.js').then(async sw => {
    // Add custom config for a different tile provider
    await sw.addLayerConfig(new LayerConfig({
      id: 'my-tiles',
      tileUrlTemplates: ['https://mytiles.example.com/{z}/{x}/{y}.png'],
      lineStyles: [{ color: 'rgb(165, 180, 165)' }],
    }));
  });
</script>
```

## API

### `registerCorrectionServiceWorker(workerUrl, options?)`

Register the service worker and wait for it to take control.

| Parameter | Type | Description |
|-----------|------|-------------|
| `workerUrl` | string | URL to the service worker script |
| `options.scope` | string | Service worker scope |
| `options.pmtilesUrl` | string | PMTiles URL to use |
| `options.controllerTimeout` | number | Timeout for SW to take control (default: 3000ms) |
| `options.forceReinstall` | boolean | Unregister existing SW before registering (default: false) |

Returns: `Promise<CorrectionServiceWorker>`

#### Development Mode

Use `forceReinstall: true` during development to ensure you always get a fresh service worker:

```javascript
const sw = await registerCorrectionServiceWorker('./sw.js', {
  forceReinstall: true  // Useful when iterating on SW code
});
```

### `CorrectionServiceWorker`

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `register()` | `Promise<this>` | Register and wait for control |
| `unregister()` | `Promise<boolean>` | Unregister the service worker |
| `isControlling()` | `boolean` | Check if SW is controlling the page |
| `addLayerConfig(config)` | `Promise<void>` | Add a layer config |
| `removeLayerConfig(id)` | `Promise<void>` | Remove a layer config |
| `setPmtilesUrl(url)` | `Promise<void>` | Set PMTiles URL |
| `setEnabled(enabled)` | `Promise<void>` | Enable/disable corrections |
| `clearCache()` | `Promise<void>` | Clear the tile cache |
| `getStatus()` | `Promise<Object>` | Get SW status |
| `resetConfig()` | `Promise<void>` | Reset to default pmtilesUrl and layer configs |

## Built-in Configs

The service worker comes with pre-registered configs:

- `cartodb-dark`: CartoDB dark tiles
- `cartodb-light`: CartoDB light/voyager tiles
- `open-topo`: OpenTopoMap tiles
- `osm-carto`: OpenStreetMap standard tiles
- `osm-hot`: Humanitarian OpenStreetMap tiles

## Scope Considerations

Service workers can only intercept requests within their scope. If your tiles are loaded from a different origin, the SW will still work because it intercepts the `fetch` event before the request goes out.

The SW scope must include the page that registers it. Typically:
- Place `sw.js` in your app's root directory
- Or specify a narrower scope if needed

## Bundling

If you're bundling your application (Rollup, Webpack, Vite, etc.), you may need to copy the PMTiles data file to your output directory. See **[Bundling the PMTiles Asset](../data/bundling-pmtiles.md)** for instructions.

## License

Unlicense
