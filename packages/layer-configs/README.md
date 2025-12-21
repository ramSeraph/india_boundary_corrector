# @india-boundary-corrector/layer-configs

Pre-built layer configurations for `@india-boundary-corrector/maplibre`.

## Available Configs

- `osmCartoDark` - CartoDB dark_all tiles
- `osmCarto` - OpenStreetMap standard tiles

## Usage

```javascript
import { 
  osmCartoDark, 
  osmCarto, 
  layerConfigs, 
  LayerConfig 
} from '@india-boundary-corrector/layer-configs';
import { addIndiaBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Use a pre-defined config
addIndiaBoundaryCorrector(map, {
  pmtilesUrl: 'https://example.com/india_boundary_corrections.pmtiles',
  layerConfig: osmCartoDark,
});

// Or detect from tile URLs using the registry
const tileUrls = [
  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
];
const config = layerConfigs.detectFromUrls(tileUrls);
if (config) {
  addIndiaBoundaryCorrector(map, {
    pmtilesUrl: 'https://example.com/india_boundary_corrections.pmtiles',
    layerConfig: config,
  });
}

// List available config ids
console.log(layerConfigs.getAvailableIds()); // ['osm-carto-dark', 'osm-carto']

// Get a config by id
const darkConfig = layerConfigs.get('osm-carto-dark');

// Create and register a custom config
const myConfig = new LayerConfig({
  id: 'my-custom-style',
  zoomThreshold: 5,
  tileUrlPattern: /mytiles\.com/,
  osmAddLineColor: '#262626',
  osmAddLineWidth: 3,
  osmDelLineColor: '#090909',
  osmDelLineWidth: 4,
  neAddLineColor: '#262626',
  neAddLineWidth: 2,
  neDelLineColor: '#090909',
  neDelLineWidth: 3,
});
layerConfigs.register(myConfig);

// Remove a config
layerConfigs.remove('my-custom-style');
```

## LayerConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | string | required | Unique identifier for the config |
| `zoomThreshold` | number | 5 | Zoom level to switch between NE and OSM styles |
| `tileUrlPattern` | RegExp \| string | null | Pattern for matching tile URLs |
| `osmAddLineColor` | string | 'green' | Line color for additions (zoom >= threshold) |
| `osmAddLineWidth` | number | 1 | Line width for additions (zoom >= threshold) |
| `osmDelLineColor` | string | 'red' | Line color for deletions (zoom >= threshold) |
| `osmDelLineWidth` | number | 1 | Line width for deletions (zoom >= threshold) |
| `neAddLineColor` | string | osmAddLineColor | Line color for additions (zoom < threshold) |
| `neAddLineWidth` | number | osmAddLineWidth | Line width for additions (zoom < threshold) |
| `neDelLineColor` | string | osmDelLineColor | Line color for deletions (zoom < threshold) |
| `neDelLineWidth` | number | osmDelLineWidth | Line width for deletions (zoom < threshold) |

## License

Unlicense
