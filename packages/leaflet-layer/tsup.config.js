import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.js'],
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    outDir: 'dist',
    sourcemap: true,
    platform: 'browser',
    external: ['leaflet'],
    noExternal: ['@india-boundary-corrector/tilefixer', '@india-boundary-corrector/layer-configs'],
  },
  {
    entry: ['src/index.js'],
    format: ['iife'],
    dts: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.global.js' }),
    sourcemap: true,
    platform: 'browser',
    globalName: 'IndiaBoundaryCorrector',
    external: ['leaflet'],
    noExternal: ['@india-boundary-corrector/tilefixer', '@india-boundary-corrector/layer-configs'],
    // Copy both pmtiles files - .gz is for CDN workaround (see packages/data/pmtiles-filename-note.md)
    onSuccess: 'cp ../data/india_boundary_corrections.pmtiles ../data/india_boundary_corrections.pmtiles.gz dist/',
  },
]);
