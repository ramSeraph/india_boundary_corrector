# @india-boundary-corrector/service-worker

Service worker that intercepts map tile requests and applies India boundary corrections automatically.

## Installation

```bash
npm install @india-boundary-corrector/service-worker
```

## Usage

### 1. Create a Service Worker File

Create `sw.js` in your public directory:

```javascript
importScripts('https://unpkg.com/@india-boundary-corrector/service-worker/dist/worker.global.js');
```

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
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// OpenLayers
new TileLayer({ source: new XYZ({ url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png' }) });

// MapLibre
{ type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'] }
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
  tileUrlPattern: /tile\.openstreetmap\.de/,
  osmAddLineColor: 'rgb(165, 180, 165)',
  neAddLineColor: 'rgb(165, 180, 165)',
  lineWidthMultiplier: 1.5,
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
}));
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

Returns: `Promise<CorrectionServiceWorker>`

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

## Built-in Configs

The service worker comes with pre-registered configs:

- `osm-carto`: OpenStreetMap standard tiles
- `cartodb-dark`: CartoDB dark tiles

## Scope Considerations

Service workers can only intercept requests within their scope. If your tiles are loaded from a different origin, the SW will still work because it intercepts the `fetch` event before the request goes out.

The SW scope must include the page that registers it. Typically:
- Place `sw.js` in your app's root directory
- Or specify a narrower scope if needed

## License

Unlicense
