# Bundling the PMTiles Asset

When using a bundler (Rollup, Webpack, Vite, tsup, etc.) to build your application, the PMTiles file containing India boundary corrections needs special handling.

## PMTiles Filename Note

This package includes two versions of the same PMTiles file:

- `india_boundary_corrections.pmtiles` - Original file
- `india_boundary_corrections.pmtiles.gz` - Same file with `.gz` suffix (not actually gzipped)

The `.gz` suffixed version exists to work around CDN transparent compression issues. Use the `.gz` file when serving from CDNs that apply transparent compression (like jsDelivr, GitHub Pages, Cloudflare, etc.), as this prevents the CDN from re-compressing the file and breaking range requests. For local development or servers where you control compression settings, use the original `.pmtiles` file.

See [`pmtiles-filename-note.md`](./pmtiles-filename-note.md) for more details on this issue.

## Why This Is Needed

The `@india-boundary-corrector/data` package includes a ~2MB PMTiles file (`india_boundary_corrections.pmtiles`). By default, the library auto-detects the PMTiles URL from `import.meta.url`, which works well for:

- **CDN usage** (jsDelivr, etc.) - the file is served alongside the JS module
- **Unbundled ESM** - the file path resolves correctly

However, when bundled, `import.meta.url` points to the bundle location, not the original `node_modules` path. If the PMTiles file isn't copied to your output directory, requests will 404.

## Solutions

### Option 1: Use the CDN (Easiest)

If you don't need offline support, the library automatically falls back to jsDelivr CDN when it can't resolve the local file. No configuration needed!

### Option 2: Copy the PMTiles File

Configure your bundler to copy the PMTiles file to your output directory.

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

### Option 3: Manual URL Override

If your setup doesn't match the above, or you're hosting the PMTiles file elsewhere:

```javascript
import { setPmtilesUrl } from '@india-boundary-corrector/data';

// Point to your self-hosted file
setPmtilesUrl('/assets/india_boundary_corrections.pmtiles');

// Or use a different CDN
setPmtilesUrl('https://my-cdn.com/india_boundary_corrections.pmtiles');
```

For the service worker package, use:

```javascript
const sw = await registerCorrectionServiceWorker('./sw.js', {
  pmtilesUrl: '/assets/india_boundary_corrections.pmtiles'
});
```

## Server Requirements

The PMTiles file is approximately 2MB, but the entire file is **never downloaded at once**. PMTiles uses HTTP Range Requests to fetch only the specific tile data needed for the current map view—typically just a few KB per tile request.

Your server must support **HTTP Range Requests** for this to work. Most web servers and CDNs support range requests by default, including:
- nginx
- Apache
- Cloudflare
- jsDelivr
- AWS S3 / CloudFront
- Google Cloud Storage
- Azure Blob Storage

If you're using a custom server or proxy, ensure it:
1. Accepts `Range` headers in requests
2. Returns `206 Partial Content` responses with `Content-Range` headers
3. Returns `Accept-Ranges: bytes` in responses
