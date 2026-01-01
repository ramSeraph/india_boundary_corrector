# @india-boundary-corrector/layer-configs

Pre-built layer configurations for India boundary corrector packages.

## Available Configs

- `cartoDbDark` - CartoDB dark_all tiles
- `osmCarto` - OpenStreetMap standard tiles (with dashed boundary lines)

## Usage

```javascript
import { 
  cartoDbDark, 
  osmCarto, 
  layerConfigs, 
  LayerConfig 
} from '@india-boundary-corrector/layer-configs';
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Use a pre-defined config
addBoundaryCorrector(map, {
  layerConfig: cartoDbDark,
});

// Or detect from tile URLs using the registry
const tileUrls = [
  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
];
const config = layerConfigs.detectFromUrls(tileUrls);
if (config) {
  addBoundaryCorrector(map, { layerConfig: config });
}

// List available config ids
console.log(layerConfigs.getAvailableIds()); // ['cartodb-dark', 'osm-carto']

// Get a config by id
const darkConfig = layerConfigs.get('cartodb-dark');

// Create and register a custom config
const myConfig = new LayerConfig({
  id: 'my-custom-style',
  startZoom: 0,
  zoomThreshold: 5,
  tileUrlTemplates: ['https://mytiles.com/{z}/{x}/{y}.png'],
  // Zoom-to-width interpolation map
  lineWidthStops: { 1: 0.6, 10: 3 },
  // Line styles - drawn in order
  lineStyles: [
    { color: '#262626' },                                    // solid line
    { color: '#262626', widthFraction: 0.5, dashArray: [30, 2, 8, 2] }, // dashed overlay
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
| `startZoom` | number | 0 | Minimum zoom level to start rendering corrections |
| `zoomThreshold` | number | 5 | Zoom level to switch between NE and OSM data |
| `tileUrlTemplates` | string \| string[] | [] | URL templates for matching tiles (e.g., `https://{s}.tile.example.com/{z}/{x}/{y}.png`) |
| `lineWidthStops` | object | { 1: 0.5, 10: 2.5 } | Zoom-to-width interpolation map |
| `lineStyles` | array | [{ color: 'green' }] | Array of line styles to draw |

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
| `widthFraction` | number | 1.0 | Width as fraction of base line width |
| `dashArray` | number[] | - | Dash pattern array (omit for solid line) |

### Line Width Calculation

Line widths are interpolated/extrapolated from the `lineWidthStops` map:
- **Addition lines**: Interpolated from `lineWidthStops` based on zoom level
- **Deletion lines**: Twice the addition line width

## License

Unlicense
