# @india-boundary-corrector/data

[![npm version](https://img.shields.io/npm/v/@india-boundary-corrector/data)](https://www.npmjs.com/package/@india-boundary-corrector/data)

PMTiles data package for India boundary corrections.

[**🗺️ View PMTiles data on pmtiles.io**](https://pmtiles.io/#url=https%3A%2F%2Fcdn.jsdelivr.net%2Fnpm%2F%40india-boundary-corrector%2Fdata%2Findia_boundary_corrections.pmtiles)

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

## PMTiles URL Resolution

The `getPmtilesUrl()` function automatically detects the best URL for the PMTiles file:

1. **ESM environments** (direct import, unpkg, jsDelivr): Uses `import.meta.url` to resolve the file relative to the module location
2. **JS-only CDNs** (esm.sh, Skypack): These CDNs transform JS modules but don't serve static files, so falls back to jsDelivr CDN
3. **Bundled/other environments**: When `import.meta.url` isn't available (CJS, UMD), falls back to jsDelivr CDN with pinned package version

### CDN fallback

When the package is loaded from jsDelivr or unpkg, the PMTiles file is resolved relative to the module URL - no extra configuration needed.

When bundled (Rollup IIFE, Webpack, etc.), `import.meta.url` typically points to the bundle location. If the PMTiles file isn't copied alongside the bundle, the resolved URL will 404. In this case, either:
- Copy the PMTiles file to your output directory (see below)
- Use `setPmtilesUrl()` to point to a CDN or self-hosted URL

### Self-hosted / Bundled builds

If you want to bundle the PMTiles file with your application (for offline use or to avoid CDN dependency), you'll need to configure your bundler to copy the file:

#### Rollup

```bash
npm install rollup-plugin-copy --save-dev
```

```javascript
// rollup.config.js
import copy from 'rollup-plugin-copy';

export default {
  // ...your config
  plugins: [
    copy({
      targets: [
        {
          src: 'node_modules/@india-boundary-corrector/data/india_boundary_corrections.pmtiles',
          dest: 'dist',
        },
      ],
    }),
  ],
};
```

#### Webpack

```bash
npm install copy-webpack-plugin --save-dev
```

```javascript
// webpack.config.js
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  // ...your config
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/@india-boundary-corrector/data/india_boundary_corrections.pmtiles',
          to: 'india_boundary_corrections.pmtiles',
        },
      ],
    }),
  ],
};
```

#### Vite

```bash
npm install vite-plugin-static-copy --save-dev
```

```javascript
// vite.config.js
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default {
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@india-boundary-corrector/data/india_boundary_corrections.pmtiles',
          dest: '.',
        },
      ],
    }),
  ],
};
```

#### tsup

Use the `onSuccess` hook to copy the file after build:

```javascript
// tsup.config.js
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js'],
  format: ['iife'],
  outDir: 'dist',
  onSuccess: 'cp node_modules/@india-boundary-corrector/data/india_boundary_corrections.pmtiles dist/',
});
```

#### Manual override

If your setup doesn't match the above, you can manually set the URL:

```javascript
import { setPmtilesUrl } from '@india-boundary-corrector/data';

// Point to your self-hosted file
setPmtilesUrl('/assets/india_boundary_corrections.pmtiles');
```

## Data Sources

- OpenStreetMap boundary relations for India, Pakistan, and disputed territories
- Natural Earth Admin 0 Countries (standard and India-perspective versions)

## License

Code: Unlicense

Data: See [LICENSE](LICENSE) file for OpenStreetMap (ODbL) and Natural Earth (Public Domain) data licenses.
