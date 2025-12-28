# @india-boundary-corrector/tilefixer

Core library for fetching and applying India boundary corrections to raster map tiles.

## Installation

```bash
npm install @india-boundary-corrector/tilefixer
```

## Usage

```javascript
import { BoundaryCorrector } from '@india-boundary-corrector/tilefixer';
import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';

// Create a boundary corrector
const corrector = new BoundaryCorrector(getPmtilesUrl());

// Get corrections for a tile
const corrections = await corrector.getCorrections(z, x, y);
// Returns: { 'to-add-osm': [...], 'to-del-osm': [...], 'to-add-ne': [...], 'to-del-ne': [...] }

// Apply corrections to a raster tile
const layerConfig = layerConfigs.get('osm-carto');
const fixedTileData = await corrector.fixTile(
  corrections,
  originalTileArrayBuffer,
  layerConfig,
  z,       // zoom level
  256      // tile size (optional, defaults to 256)
);
```

## API

### `BoundaryCorrector`

#### Constructor

```javascript
new BoundaryCorrector(pmtilesUrl, options?)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pmtilesUrl` | string | URL to the PMTiles file |
| `options.cacheSize` | number | Maximum tiles to cache (default: 512) |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getCorrections(z, x, y)` | `Promise<Object>` | Get correction features for a tile. Supports overzoom beyond zoom 14. |
| `fixTile(corrections, rasterTile, layerConfig, zoom, tileSize?)` | `Promise<ArrayBuffer>` | Apply corrections to a raster tile and return corrected PNG. |
| `getSource()` | `PMTiles` | Get the underlying PMTiles source object |
| `getCache()` | `TileCache` | Get the tile cache instance |
| `clearCache()` | `void` | Clear the tile cache |

## How It Works

1. **Fetching corrections**: The corrector fetches vector tile data from the PMTiles file containing boundary correction geometries.

2. **Overzoom support**: For zoom levels > 14 (max data zoom), parent tile data is fetched and transformed to the correct sub-tile quadrant.

3. **Applying corrections**:
   - **Deletions**: Uses median blur along deletion paths to erase incorrect boundary lines
   - **Additions**: Draws correct boundary lines with configurable colors and dash patterns

4. **Caching**: Parsed vector tiles are cached in an LRU cache to avoid repeated fetches.

## License

Unlicense
