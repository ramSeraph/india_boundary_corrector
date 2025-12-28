# @india-boundary-corrector/layer-configs

Pre-built layer configurations for India boundary corrector packages.

## Available Configs

- `osmCartoDark` - CartoDB dark_all tiles
- `osmCarto` - OpenStreetMap standard tiles (with dashed boundary lines)

## Usage

```javascript
import { 
  osmCartoDark, 
  osmCarto, 
  layerConfigs, 
  LayerConfig 
} from '@india-boundary-corrector/layer-configs';
import { addBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Use a pre-defined config
addBoundaryCorrector(map, {
  layerConfig: osmCartoDark,
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
console.log(layerConfigs.getAvailableIds()); // ['osm-carto-dark', 'osm-carto']

// Get a config by id
const darkConfig = layerConfigs.get('osm-carto-dark');

// Create and register a custom config
const myConfig = new LayerConfig({
  id: 'my-custom-style',
  startZoom: 0,
  zoomThreshold: 5,
  tileUrlPattern: /mytiles\.com/,
  osmAddLineColor: '#262626',
  neAddLineColor: '#262626',
  // Optional: dashed line styling for additions
  addLineDashed: true,
  addLineDashArray: [10, 1, 2, 1],
  addLineHaloRatio: 1.0,
  addLineHaloAlpha: 0.5,
  // Optional: width multiplier
  lineWidthMultiplier: 1.2,
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
| `tileUrlPattern` | RegExp \| string | null | Pattern for matching tile URLs |
| `osmAddLineColor` | string | 'green' | Line color for additions (zoom >= threshold) |
| `neAddLineColor` | string | osmAddLineColor | Line color for additions (zoom < threshold) |
| `addLineDashed` | boolean | false | Whether addition lines should be dashed |
| `addLineDashArray` | number[] | [] | Dash pattern array (e.g., `[10, 1, 2, 1]`) |
| `addLineHaloRatio` | number | 0 | Halo width as ratio of line width (0 = no halo) |
| `addLineHaloAlpha` | number | 0 | Halo opacity (0-1, 0 = no halo) |
| `lineWidthMultiplier` | number | 1.0 | Multiplier for all line widths |

### Line Width Calculation

Line widths are calculated dynamically based on zoom level:
- **Addition lines**: `zoom / 4 * lineWidthMultiplier` (minimum 0.5px)
- **Deletion lines**: `zoom / 2 * lineWidthMultiplier` (minimum 1px)

## License

Unlicense
