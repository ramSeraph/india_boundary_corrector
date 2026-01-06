# @india-boundary-corrector/data

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/data)](https://www.npmjs.com/package/@india-boundary-corrector/data)

PMTiles data package for India boundary corrections.

[**🗺️ View PMTiles data on pmtiles.io**](https://pmtiles.io/#url=https%3A%2F%2Fcdn.jsdelivr.net%2Fnpm%2F%40india-boundary-corrector%2Fdata%2Findia_boundary_corrections.pmtiles)

## Layers

The PMTiles file contains 4 layers:

| Layer | Description |
|-------|-------------|
| `to-add-osm` | Boundary lines to add over OSM-based tiles (higher zoom) |
| `to-del-osm` | Boundary lines to mask/delete from OSM-based tiles |
| `to-add-ne` | Boundary lines to add over Natural Earth tiles (lower zoom) |
| `to-del-ne` | Boundary lines to mask/delete from Natural Earth tiles |

## Usage

```javascript
import { layers, getPmtilesUrl, setPmtilesUrl, getDataVersion } from '@india-boundary-corrector/data';

// Get URL to PMTiles file (auto-detected from environment)
const url = getPmtilesUrl();

// Override the PMTiles URL for custom hosting
setPmtilesUrl('https://my-cdn.com/india_boundary_corrections.pmtiles');

// Get data version (OSM timestamp + NE version)
const version = getDataVersion(); // e.g., "osm_20231215_143022_ne_5.1.2"
```

## PMTiles URL Resolution

The `getPmtilesUrl()` function automatically detects the best URL for the PMTiles file:

1. **ESM environments** (direct import, jsDelivr): Uses `import.meta.url` to resolve the file relative to the module location
2. **CDNs requiring fallback** (esm.sh, Skypack, unpkg): These are redirected to jsDelivr (see below)
3. **Bundled/other environments**: When `import.meta.url` isn't available (CJS, UMD), falls back to jsDelivr CDN with pinned package version

### CDN fallback

When the package is loaded from jsDelivr, the PMTiles file is resolved relative to the module URL - no extra configuration needed.

The following CDNs automatically fall back to jsDelivr:
- **esm.sh, Skypack**: These CDNs transform JS modules but don't serve static files
- **unpkg**: Has issues serving PMTiles files (see [#13](https://github.com/ramSeraph/india_boundary_corrector/issues/13))

When bundled (Rollup IIFE, Webpack, etc.), `import.meta.url` typically points to the bundle location. If the PMTiles file isn't copied alongside the bundle, the resolved URL will 404. In this case, either:
- Copy the PMTiles file to your output directory (see below)
- Use `setPmtilesUrl()` to point to a CDN or self-hosted URL

### Self-hosted / Bundled builds

If you're bundling this package with a tool like Rollup, Webpack, Vite, or tsup, you may need to copy the PMTiles file to your output directory.

See **[Bundling the PMTiles Asset](./bundling-pmtiles.md)** for detailed instructions.

## Data Sources

- OpenStreetMap boundary relations for India, Pakistan, and disputed territories
- Natural Earth Admin 0 Countries (standard and India-perspective versions)

## License

Code: Unlicense

Data: See [LICENSE](LICENSE) file for OpenStreetMap (ODbL) and Natural Earth (Public Domain) data licenses.
