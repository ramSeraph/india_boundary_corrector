# @india-boundary-corrector/layer-configs

Pre-built layer configurations for `@india-boundary-corrector/maplibre`.

## Available Configs

- `osmCartoDark` - CartoDB dark_all tiles

## Usage

```typescript
import { osmCartoDark, detectLayerFromUrls, getAvailableConfigs } from '@india-boundary-corrector/layer-configs';
import { addIndiaBoundaryCorrector } from '@india-boundary-corrector/maplibre';

// Use a pre-defined config
addIndiaBoundaryCorrector(map, {
  pmtilesUrl: 'https://example.com/india_boundary_corrections.pmtiles',
  layerConfig: osmCartoDark,
});

// Or detect from tile URLs
const tileUrls = [
  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
];
const config = await detectLayerFromUrls(tileUrls);
if (config) {
  addIndiaBoundaryCorrector(map, {
    pmtilesUrl: 'https://example.com/india_boundary_corrections.pmtiles',
    layerConfig: config,
  });
}

// List available configs
console.log(getAvailableConfigs()); // ['osm-carto-dark']
```

## License

Unlicense
