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
import { layers, getPmtilesUrl, setPmtilesUrl, getDataVersion } from '@india-boundary-corrector/data';

// Get URL to PMTiles file (auto-detected from environment)
const url = getPmtilesUrl();

// Override the PMTiles URL for custom hosting
setPmtilesUrl('https://my-cdn.com/india_boundary_corrections.pmtiles');

// Get data version (OSM timestamp + NE version)
const version = getDataVersion(); // e.g., "osm_20231215_143022_ne_5.1.2"
```

## Data Sources

- OpenStreetMap boundary relations for India, Pakistan, and disputed territories
- Natural Earth Admin 0 Countries (standard and India-perspective versions)

## License

Code: Unlicense

Data: See [LICENSE](LICENSE) file for OpenStreetMap (ODbL) and Natural Earth (Public Domain) data licenses.
