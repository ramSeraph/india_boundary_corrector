# @india-boundary-corrector/maplibre

MapLibre GL JS integration for displaying India maps with corrected boundaries.

## Installation

```bash
npm install @india-boundary-corrector/maplibre maplibre-gl pmtiles
```

## Usage

```typescript
import maplibregl from 'maplibre-gl';
import { addPmtilesProtocol, addIndiaBoundaryCorrector } from '@india-boundary-corrector/maplibre';
import { osmCartoDark } from '@india-boundary-corrector/layer-configs';
import { getPmtilesUrl } from '@india-boundary-corrector/data';

// Add PMTiles protocol (once, before creating maps)
addPmtilesProtocol(maplibregl);

const map = new maplibregl.Map({
  container: 'map',
  style: { version: 8, sources: {}, layers: [] },
  center: [78.9629, 20.5937], // India center
  zoom: 4,
});

map.on('load', () => {
  // Add the corrected India map
  addIndiaBoundaryCorrector(map, {
    pmtilesUrl: getPmtilesUrl(),
    layerConfig: osmCartoDark,
    addProtocol: false, // already added above
  });
});
```

## How It Works

1. **Base raster layer**: Renders the original raster tile source (e.g., OSM Carto Dark)
2. **Delete layers**: Draws lines matching the background color over incorrect boundaries
3. **Add layers**: Draws the correct India boundaries

The package uses different correction layers based on zoom level:
- **Lower zoom (< 5)**: Uses Natural Earth (`to-del-ne`, `to-add-ne`) corrections
- **Higher zoom (≥ 5)**: Uses OpenStreetMap (`to-del-osm`, `to-add-osm`) corrections

## API

### `addPmtilesProtocol(maplibregl)`

Registers the PMTiles protocol with MapLibre. Call once before using.

### `addIndiaBoundaryCorrectorAbove(map, options)`

Automatically detect layer config and add corrections above an existing raster layer.

**Options:**
- `pmtilesUrl`: URL to the PMTiles file
- `rasterSourceId`: ID of the existing raster source
- `rasterLayerId`: ID of the existing raster layer to place corrections above
- `addProtocol`: Whether to auto-add PMTiles protocol (default: `true`)
- `detectLayerFromUrls`: Layer detection function from `@india-boundary-corrector/layer-configs`

**Returns:** `Promise<{ sourceIds: string[], layerIds: string[] } | null>`

**Example:**
```typescript
import { detectLayerFromUrls } from '@india-boundary-corrector/layer-configs';

// Assuming you already have a raster layer
map.addSource('my-raster', {
  type: 'raster',
  tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png']
});
map.addLayer({ id: 'my-raster-layer', type: 'raster', source: 'my-raster' });

// Automatically add boundary corrections
await addIndiaBoundaryCorrectorAbove(map, {
  pmtilesUrl: getPmtilesUrl(),
  rasterSourceId: 'my-raster',
  rasterLayerId: 'my-raster-layer',
  detectLayerFromUrls, // Pass the function from layer-configs
});
```

### `addIndiaBoundaryCorrector(map, options)`

Adds boundary-corrected sources and layers to the map.

**Options:**
- `pmtilesUrl`: URL to the PMTiles file
- `layerConfig`: Layer configuration object (from `india-boundary-corrector-layer-configs`)
- `addProtocol`: Whether to auto-add PMTiles protocol (default: `true`)

**Returns:** `{ sourceIds: string[], layerIds: string[] }`

### `removeIndiaBoundaryCorrector(map, layerConfigId)`

Removes all sources and layers for a given config ID.

### `generateSourcesAndLayers(options)`

Low-level function to generate source/layer specifications without adding to a map.

## Custom Layer Configs

```typescript
import type { LayerConfig } from 'india-boundary-corrector-maplibre';

const myConfig: LayerConfig = {
  id: 'my-custom-map',
  tiles: ['https://my-tile-server/{z}/{x}/{y}.png'],
  attribution: '© My Attribution',
  zoomThreshold: 5,
  addLineColor: '#000000',
  delLineColor: '#f5f5f3',
  lineWidth: 1.5,
};
```

## License

MIT
