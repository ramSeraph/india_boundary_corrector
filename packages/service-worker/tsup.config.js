import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.js'],
    format: ['esm', 'cjs'],
    dts: false,
    clean: true,
    outDir: 'dist',
    sourcemap: true,
  },
  {
    entry: ['src/index.js'],
    format: ['iife'],
    dts: false,
    outDir: 'dist',
    outExtension: () => ({ js: '.global.js' }),
    sourcemap: true,
    globalName: 'IndiaBoundaryCorrector',
    platform: 'browser',
    target: 'es2020',
  },
  {
    entry: { 'worker': 'src/worker.js' },
    format: ['iife'],
    dts: false,
    outDir: 'dist',
    sourcemap: true,
    noExternal: [/.*/],
    globalName: 'IndiaBoundaryCorrector',
    platform: 'browser',
    target: 'es2020',
    // Copy both pmtiles files - .gz is for CDN workaround (see packages/data/pmtiles-filename-note.md)
    onSuccess: 'cp ../data/india_boundary_corrections.pmtiles ../data/india_boundary_corrections.pmtiles.gz dist/',
  }
]);
