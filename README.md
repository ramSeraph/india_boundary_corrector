# India Boundary Corrector

A set of JavaScript packages to display maps with India's official boundaries, correcting the disputed territory representations commonly found in international map tile providers.

## The Problem

Most international map tile providers (OpenStreetMap, Carto, etc.) show disputed territories like Kashmir and Arunachal Pradesh with boundaries that don't match India's official position. This can be problematic for applications targeting Indian users or requiring compliance with Indian mapping regulations.

## The Solution

This monorepo provides map library integrations that overlay correction vectors on top of existing raster tile layers:
1. **Delete layers**: Draw lines matching the background color to mask incorrect boundaries
2. **Add layers**: Draw the correct India boundaries

The corrections use different data sources based on zoom level:
- **Lower zoom (< 5)**: Natural Earth data corrections
- **Higher zoom (≥ 5)**: OpenStreetMap data corrections

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
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';

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

const corrector = addBoundaryCorrector(map, { layerConfig: 'osm-carto' });
```

## Supported Tile Providers

Built-in configurations for:
- **OSM Carto Dark** (`osm-carto-dark`): CartoDB dark_all tiles
- **OSM Carto** (`osm-carto`): OpenStreetMap standard tiles

Custom configurations can be created for other tile providers.

## Data Sources

- **OpenStreetMap**: Boundary relations for India, Pakistan, and disputed territories
- **Natural Earth**: Admin 0 Countries (standard and India-perspective versions)

## License

Code: [Unlicense](https://unlicense.org/)

Data: See [packages/data/LICENSE](./packages/data/LICENSE) for OpenStreetMap (ODbL) and Natural Earth (Public Domain) data licenses.
