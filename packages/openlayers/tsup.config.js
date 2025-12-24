import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM and CJS builds for bundler users
  {
    entry: ['src/index.js'],
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    outDir: 'dist',
    sourcemap: true,
    external: ['ol', 'ol-pmtiles', /^ol\//, '@india-boundary-corrector/data', '@india-boundary-corrector/layer-configs'],
  },
  // IIFE build for CDN usage (bundles OL dependencies like ol-pmtiles does)
  // Usage: Load ol.js first, then this script, then use IndiaBoundaryCorrector global
  {
    entry: ['src/index.js'],
    format: ['iife'],
    globalName: 'IndiaBoundaryCorrector',
    outDir: 'dist',
    outExtension: () => ({ js: '.umd.js' }),
    sourcemap: true,
    // Bundle our internal packages
    noExternal: ['@india-boundary-corrector/data', '@india-boundary-corrector/layer-configs'],
    // Keep ol-pmtiles external since users load it separately or it has its own bundle
    external: ['ol-pmtiles'],
    esbuildOptions(options) {
      options.platform = 'browser';
    },
    footer: {
      js: 'if (typeof window !== "undefined") { window.IndiaBoundaryCorrector = IndiaBoundaryCorrector; }',
    },
  },
]);
