# @india-boundary-corrector/tilefixer

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/tilefixer)](https://www.npmjs.com/package/@india-boundary-corrector/tilefixer)

Core library for fetching and applying India boundary corrections to raster map tiles.

## Installation

```bash
npm install @india-boundary-corrector/tilefixer
```

## Usage

```javascript
import { TileFixer } from '@india-boundary-corrector/tilefixer';
import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';

// Create a boundary corrector
const corrector = new TileFixer(getPmtilesUrl());

// Get corrections for a tile
const corrections = await corrector.getCorrections(z, x, y);
// Returns: { 'to-add-osm': [...], 'to-del-osm': [...], 'to-add-ne': [...], 'to-del-ne': [...] }

// Apply corrections to a raster tile
const layerConfig = layerConfigs.get('osm-carto');
const fixedTileData = await corrector.fixTile(
  corrections,
  originalTileArrayBuffer,
  layerConfig,
  z        // zoom level (tile size is derived from image)
);
```

## API

### `TileFixer`

#### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `TileFixer.getOrCreate(pmtilesUrl)` | `TileFixer` | Get or create a TileFixer for a URL (reuses existing instances) |
| `TileFixer.setDefaultCacheMaxFeatures(count)` | `void` | Set default max features to cache for new instances (default: 25000) |

#### Constructor

```javascript
new TileFixer(pmtilesUrl, options?)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pmtilesUrl` | string | URL to the PMTiles file |
| `options.cacheMaxFeatures` | number | Maximum features to cache |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getCorrections(z, x, y)` | `Promise<Object>` | Get correction features for a tile. Supports overzoom beyond zoom 14. |
| `fixTile(corrections, rasterTile, layerConfig, zoom)` | `Promise<ArrayBuffer>` | Apply corrections to a raster tile and return corrected PNG. Tile size is derived from the image. |
| `fetchAndFixTile(tileUrl, z, x, y, layerConfig, options?)` | `Promise<Object>` | Fetch a tile, apply corrections, and return result. See below. |
| `getSource()` | `PMTiles` | Get the underlying PMTiles source object |
| `clearCache()` | `void` | Clear the tile cache |

#### `fetchAndFixTile` Options and Return Value

```javascript
const result = await corrector.fetchAndFixTile(tileUrl, z, x, y, layerConfig, {
  signal: abortSignal,  // AbortSignal for cancellation
  mode: 'cors',         // Fetch mode
});

// result: {
//   data: ArrayBuffer,           // The tile image data
//   wasFixed: boolean,           // Whether corrections were applied
//   correctionsFailed: boolean,  // Whether corrections fetch failed
//   correctionsError: Error|null // The error if corrections failed
// }
```

## How It Works

1. **Fetching corrections**: The corrector fetches vector tile data from the PMTiles file containing boundary correction geometries.

2. **Overzoom support**: For zoom levels > 14 (max data zoom), parent tile data is fetched and transformed to the correct sub-tile quadrant.

3. **Applying corrections**:
   - **Deletions**: Uses median blur along deletion paths to erase incorrect boundary lines
   - **Additions**: Draws correct boundary lines with configurable colors and dash patterns

4. **Caching**: Parsed vector tiles are cached in an LRU cache to avoid repeated fetches.

## License

Unlicense
