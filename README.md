# India Boundary Corrector

> ⚠️ **WORK IN PROGRESS** ⚠️
>
> This project is currently under active development and is not yet ready for production use.

**[Live Demo](https://ramseraph.github.io/india_boundary_corrector/)** - See the boundary corrections in action across Leaflet, MapLibre, and OpenLayers.

A set of JavaScript packages to display maps with India's official boundaries, correcting the disputed territory representations commonly found in international map tile providers.

## The Problem

Most international map tile providers (OpenStreetMap, Carto, etc.) show disputed territories like Kashmir and Arunachal Pradesh with boundaries that don't match India's official position. This can be problematic for applications targeting Indian users or requiring compliance with Indian mapping regulations.

## The Solution

This monorepo provides map library integrations that overlay correction vectors on top of existing raster tile layers:
1. **Delete layers**: Draw lines matching the background color to mask incorrect boundaries
2. **Add layers**: Draw the correct India boundaries

The corrections use different data sources based on zoom level:
- **Lower zoom (< threshold)**: Natural Earth data corrections
- **Higher zoom (≥ threshold)**: OpenStreetMap data corrections

Line widths scale dynamically with zoom level for consistent appearance.

## Packages

| Package | Description |
|---------|-------------|
| [@india-boundary-corrector/maplibre](./packages/maplibre) | MapLibre GL JS integration |
| [@india-boundary-corrector/leaflet](./packages/leaflet) | Leaflet integration |
| [@india-boundary-corrector/openlayers](./packages/openlayers) | OpenLayers integration |
| [@india-boundary-corrector/layer-configs](./packages/layer-configs) | Pre-built layer configurations |
| [@india-boundary-corrector/data](./packages/data) | PMTiles data with boundary corrections |

## Quick Start

### MapLibre GL JS

```javascript
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Register pmtiles protocol
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.example.com/style.json',
  center: [78.9629, 20.5937],
  zoom: 4,
});

map.on('load', () => {
  const corrector = addBoundaryCorrector(map);
});
```

### Leaflet

```javascript
import L from 'leaflet';
import { addBoundaryCorrector } from '@india-boundary-corrector/leaflet';

const map = L.map('map').setView([20.5937, 78.9629], 4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png').addTo(map);

const corrector = addBoundaryCorrector(map);
```

### OpenLayers

```javascript
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { useGeographic } from 'ol/proj';
import { addBoundaryCorrector } from '@india-boundary-corrector/openlayers';

useGeographic();

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: [78.9629, 20.5937], zoom: 4 }),
});

const corrector = addBoundaryCorrector(map);
```

## Supported Tile Providers

Built-in configurations for:
- **OSM Carto Dark** (`osm-carto-dark`): CartoDB dark_all tiles
- **OSM Carto** (`osm-carto`): OpenStreetMap standard tiles (with dashed boundary lines)

Custom configurations can be created for other tile providers using `LayerConfig`.

## LayerConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | string | required | Unique identifier |
| `startZoom` | number | 0 | Minimum zoom to start rendering |
| `zoomThreshold` | number | 5 | Zoom level to switch NE/OSM data |
| `tileUrlPattern` | RegExp | null | Pattern for URL auto-detection |
| `osmAddLineColor` | string | 'green' | Addition line color (high zoom) |
| `osmDelLineColor` | string | 'red' | Deletion line color (high zoom) |
| `neAddLineColor` | string | osmAddLineColor | Addition line color (low zoom) |
| `neDelLineColor` | string | osmDelLineColor | Deletion line color (low zoom) |
| `addLineDashed` | boolean | false | Use dashed lines for additions |
| `addLineDashArray` | number[] | [] | Dash pattern |
| `addLineHaloRatio` | number | 0 | Halo width ratio |
| `addLineHaloAlpha` | number | 0 | Halo opacity |
| `lineWidthMultiplier` | number | 1.0 | Width multiplier |

## Data Sources

- **OpenStreetMap**: Boundary relations for India, Pakistan, and disputed territories
- **Natural Earth**: Admin 0 Countries (standard and India-perspective versions)

## Credits

This solution was originally conceived by [@planemad](https://github.com/planemad) in [osm-in/osm-in.github.io#38](https://github.com/osm-in/osm-in.github.io/issues/38#issuecomment-706880270).

## License

Code: [Unlicense](https://unlicense.org/)

Data: See [packages/data/LICENSE](./packages/data/LICENSE) for OpenStreetMap (ODbL) and Natural Earth (Public Domain) data licenses.
