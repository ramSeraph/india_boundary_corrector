# @india-boundary-corrector/data

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/data)](https://www.npmjs.com/package/@india-boundary-corrector/data)

PMTiles data package for India boundary corrections.

[**🗺️ View PMTiles data on pmtiles.io**](https://pmtiles.io/#url=https%3A%2F%2Fcdn.jsdelivr.net%2Fnpm%2F%40india-boundary-corrector%2Fdata%2Findia_boundary_corrections.pmtiles.gz)

## Layers

The PMTiles file contains 12 layers:

| Layer | Description |
|-------|-------------|
| `to-add-osm` | Boundary lines to add over OSM-based tiles (higher zoom) |
| `to-del-osm` | Boundary lines to mask/delete from OSM-based tiles |
| `to-add-osm-disp` | Disputed boundary lines to add over OSM-based tiles |
| `to-del-osm-disp` | Disputed boundary lines to delete from OSM-based tiles (same as add-osm-disp) |
| `to-add-osm-internal` | Internal state boundary lines to add (Indian states within claimed territory) |
| `to-del-osm-internal` | Internal boundary lines to delete (Chinese state boundaries within India's claimed territory) |
| `to-add-ne` | Boundary lines to add over Natural Earth tiles (lower zoom) |
| `to-del-ne` | Boundary lines to mask/delete from Natural Earth tiles |
| `to-add-ne-disp` | Disputed boundary lines to add over Natural Earth tiles |
| `to-del-ne-disp` | Disputed boundary lines to delete from Natural Earth tiles (same as add-ne-disp) |
| `to-add-ne-internal` | Internal state boundary lines to add over Natural Earth tiles (J&K + PoK combined) |
| `to-del-ne-internal` | Internal boundary lines to delete from Natural Earth tiles (Chinese state boundaries within India's claimed territory) |

The `-disp` layers contain boundaries of disputed regions that fall on India's official boundary. These are boundaries that India claims but are disputed by China or Pakistan. The `to-del-*-disp` layers are identical to `to-add-*-disp` layers - they delete the original lines at the same location where the corrected disputed lines are drawn.

The `-internal` layers handle internal state boundaries within India's claimed territory. `to-del-*-internal` contains Chinese state boundaries (e.g., Tibet) that fall within India's claimed boundary. `to-add-osm-internal` contains Indian state boundaries (e.g., Ladakh, Jammu and Kashmir, Arunachal Pradesh) that overlap with the main deletion areas. `to-add-ne-internal` contains India's official J&K boundary (combining Jammu and Kashmir + PoK).

## Usage

```javascript
import { getPmtilesUrl, setPmtilesUrl, getDataVersion } from '@india-boundary-corrector/data';

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
