# @india-boundary-corrector/layer-configs

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/layer-configs)](https://www.npmjs.com/package/@india-boundary-corrector/layer-configs)

Pre-built layer configurations for India boundary corrector packages.

## Available Configs

| Config ID | Description | Example |
|-----------|-------------|---------|
| `cartodb-dark` | CartoDB dark tiles | [View](https://ramseraph.github.io/india_boundary_corrector/examples/leaflet/tile-layer.html#5/33.2778/75.3412/cartodb-dark) |
| `cartodb-light` | CartoDB light/voyager tiles | [View](https://ramseraph.github.io/india_boundary_corrector/examples/leaflet/tile-layer.html#5/33.2778/75.3412/cartodb-light) |
| `open-topo` | OpenTopoMap tiles | [View](https://ramseraph.github.io/india_boundary_corrector/examples/leaflet/tile-layer.html#5/33.2778/75.3412/open-topo) |
| `osm-carto` | OpenStreetMap standard tiles | [View](https://ramseraph.github.io/india_boundary_corrector/examples/leaflet/tile-layer.html#5/33.2778/75.3412/osm-carto) |
| `osm-hot` | Humanitarian OpenStreetMap tiles | [View](https://ramseraph.github.io/india_boundary_corrector/examples/leaflet/tile-layer.html#5/33.2778/75.3412/osm-hot) |

Use the [Config Editor](https://ramseraph.github.io/india_boundary_corrector/) to craft custom configs for new basemaps.

## Usage

```javascript
import { 
  layerConfigs, 
  LayerConfig 
} from '@india-boundary-corrector/layer-configs';

// Get a config by id
const darkConfig = layerConfigs.get('cartodb-dark');

// Or detect from tile URL templates using the registry
const tileUrlTemplates = [
  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
];
const config = layerConfigs.detectFromTemplates(tileUrlTemplates);

// Or detect from actual tile URLs (with numeric coordinates)
const actualTileUrl = 'https://a.basemaps.cartocdn.com/dark_all/5/10/15.png';
const config2 = layerConfigs.detectFromTileUrls([actualTileUrl]);

// List available config ids
console.log(layerConfigs.getAvailableIds()); 
// ['cartodb-dark', 'cartodb-light', 'open-topo', 'osm-carto', 'osm-hot']

// Create and register a custom config
const myConfig = new LayerConfig({
  id: 'my-custom-style',
  tileUrlTemplates: ['https://mytiles.com/{z}/{x}/{y}.png'],
  // Zoom-to-width interpolation map
  lineWidthStops: { 1: 0.6, 10: 3 },
  // Line styles - drawn in order. layerSuffix determines which PMTiles layer to use.
  lineStyles: [
    { color: '#262626', layerSuffix: 'ne', endZoom: 4 },           // Natural Earth at low zooms
    { color: '#262626', layerSuffix: 'osm', startZoom: 5 },        // OSM data at higher zooms
    { color: '#262626', layerSuffix: 'osm', widthFraction: 0.5, dashArray: [30, 2, 8, 2], startZoom: 5 }, // dashed overlay
  ],
});
layerConfigs.register(myConfig);

// Remove a config
layerConfigs.remove('my-custom-style');
```

## LayerConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | string | required | Unique identifier for the config |
| `tileUrlTemplates` | string \| string[] | [] | URL templates for matching tiles (e.g., `https://{s}.tile.example.com/{z}/{x}/{y}.png`) |
| `lineWidthStops` | object | { 1: 0.5, 10: 2.5 } | Zoom-to-width interpolation map. Interpolated/extrapolated values are capped at a minimum of 0.1 in tilefixer. |
| `lineStyles` | array | required | Array of line styles to draw (see below) |

### URL Template Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{z}` | Zoom level |
| `{x}` | Tile X coordinate |
| `{y}` | Tile Y coordinate |
| `{s}` | Subdomain - Leaflet style (optional, matches a, b, c, etc.) |
| `{a-c}` | Subdomain - OpenLayers style (matches a, b, c) |
| `{1-4}` | Subdomain - OpenLayers numeric style (matches 1, 2, 3, 4) |
| `{r}` | Retina suffix (optional, matches @2x, etc.) |

### LineStyle Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | string | required | Line color (CSS color string) |
| `layerSuffix` | string | required | Data layer suffix (`osm`, `ne`, `osm-disp`, `ne-disp`, `osm-internal`, `ne-internal`). Determines which PMTiles layer to use (`to-add-{suffix}`, `to-del-{suffix}`). |
| `widthFraction` | number | `1.0` | Width as fraction of base line width |
| `dashArray` | number[] | `undefined` | Dash pattern array (omit for solid line) |
| `alpha` | number | `1.0` | Opacity/alpha value from 0 (transparent) to 1 (opaque) |
| `startZoom` | number | `0` | Minimum zoom level for this style |
| `endZoom` | number | `-1` (no limit) | Maximum zoom level for this style. Use -1 (INFINITY constant) for no limit. |
| `lineExtensionFactor` | number | `0.0` | Factor to extend lines by (multiplied by deletion line width). Helps cover gaps where deleted lines meet the new boundary. Set to 0 to disable. |
| `delWidthFactor` | number | `1.5` | Factor to multiply line width for deletion blur. Higher values leave gaps where wiped lines meet existing lines. Lower values mean wiped lines show through. |

### Zoom-Specific Line Styles

Line styles can be active only at certain zoom levels using `startZoom` and `endZoom`. The `layerSuffix` property determines which data layer to use:

- `osm`: OpenStreetMap-derived boundaries (higher detail, for higher zooms)
- `ne`: Natural Earth boundaries (lower detail, for lower zooms)  
- `osm-disp`: Disputed boundary lines from OSM data
- `ne-disp`: Disputed boundary lines from Natural Earth data
- `osm-internal`: Internal state boundaries from OSM data (e.g., Ladakh, J&K, Arunachal Pradesh)
- `ne-internal`: Internal state boundaries from Natural Earth data (e.g., J&K + PoK combined)

```javascript
const config = new LayerConfig({
  id: 'my-config',
  lineWidthStops: { 1: 0.5, 10: 2.5 },
  lineStyles: [
    // Natural Earth data at low zooms (z0-4)
    { color: 'rgb(200, 180, 200)', layerSuffix: 'ne', endZoom: 4 },
    // OSM data at higher zooms (z5+)
    { color: 'rgb(200, 180, 200)', layerSuffix: 'osm', startZoom: 5 },
    // Dashed overlay at all zooms using OSM data
    { color: 'rgb(160, 120, 160)', layerSuffix: 'osm', widthFraction: 0.33, dashArray: [30, 2, 8, 2] },
  ],
});

// Get active styles for a specific zoom
config.getLineStylesForZoom(3); // Returns NE style only
config.getLineStylesForZoom(7); // Returns OSM styles
```

### Line Width Calculation

Line widths are interpolated/extrapolated from the `lineWidthStops` map:
- **Addition lines**: `baseLineWidth * widthFraction` where baseLineWidth is interpolated from `lineWidthStops`
- **Deletion lines**: `baseLineWidth * maxWidthFraction * delWidthFactor` where maxWidthFraction is the largest widthFraction among active styles

## License

Unlicense
