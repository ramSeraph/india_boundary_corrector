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
    external: ['leaflet', 'protomaps-leaflet', '@india-boundary-corrector/data', '@india-boundary-corrector/layer-configs'],
  },
  // UMD build for CDN usage
  {
    entry: ['src/index.js'],
    format: ['iife'],
    globalName: 'IndiaBoundaryCorrector',
    outDir: 'dist',
    outExtension: () => ({ js: '.umd.js' }),
    sourcemap: true,
    // Bundle dependencies for UMD
    noExternal: ['@india-boundary-corrector/data', '@india-boundary-corrector/layer-configs'],
    external: ['leaflet', 'protomaps-leaflet'],
    footer: {
      js: 'if (typeof window !== "undefined") { window.IndiaBoundaryCorrector = IndiaBoundaryCorrector; }',
    },
  },
]);
