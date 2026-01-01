# @india-boundary-corrector/layer-configs

Pre-built layer configurations for India boundary corrector packages.

## Available Configs

- `cartodb-dark` - CartoDB dark tiles
- `cartodb-light` - CartoDB light/voyager tiles
- `open-topo` - OpenTopoMap tiles
- `osm-carto` - OpenStreetMap standard tiles
- `osm-hot` - Humanitarian OpenStreetMap tiles

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
| `delWidthFactor` | number | 1.5 | Multiplier for deletion line width |

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
| `alpha` | number | 1.0 | Opacity/alpha value from 0 (transparent) to 1 (opaque) |
| `startZoom` | number | layerConfig.startZoom | Minimum zoom level for this style |
| `endZoom` | number | Infinity | Maximum zoom level for this style |

### Zoom-Specific Line Styles

Line styles can be active only at certain zoom levels:

```javascript
const config = new LayerConfig({
  id: 'zoom-specific',
  startZoom: 1,
  lineStyles: [
    { color: 'red' },                              // Active at z1+ (all zooms)
    { color: 'blue', startZoom: 5 },               // Active at z5+
    { color: 'green', endZoom: 4 },                // Active at z1-4
    { color: 'yellow', startZoom: 3, endZoom: 6 }, // Active at z3-6 only
  ],
});

// Get active styles for a specific zoom
config.getLineStylesForZoom(3); // Returns styles: red, green, yellow
config.getLineStylesForZoom(7); // Returns styles: red, blue
```

### Line Width Calculation

Line widths are interpolated/extrapolated from the `lineWidthStops` map:
- **Addition lines**: `baseLineWidth * widthFraction` where baseLineWidth is interpolated from `lineWidthStops`
- **Deletion lines**: `baseLineWidth * maxWidthFraction * delWidthFactor` where maxWidthFraction is the largest widthFraction among active styles

## License

Unlicense
