# @india-boundary-corrector/data

PMTiles data package for India boundary corrections.

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
import { pmtilesPath, layers, getPmtilesUrl, getDataVersion } from '@india-boundary-corrector/data';

// For Node.js / bundler - get local file path
console.log(pmtilesPath);

// For browser - get URL relative to module location
const url = getPmtilesUrl(); // auto-detects and uses correct URL

// Get data version (OSM timestamp + NE version)
const version = await getDataVersion(); // e.g., "osm_20231215_143022_ne_5.1.2"
```

## Data Sources

- OpenStreetMap boundary relations for India, Pakistan, and disputed territories
- Natural Earth Admin 0 Countries (standard and India-perspective versions)

## License

Code: Unlicense

Data: See [LICENSE](LICENSE) file for OpenStreetMap (ODbL) and Natural Earth (Public Domain) data licenses.
