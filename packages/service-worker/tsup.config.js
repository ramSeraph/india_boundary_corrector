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
    entry: { 'worker': 'src/worker.js' },
    format: ['iife'],
    dts: false,
    outDir: 'dist',
    sourcemap: true,
    noExternal: [/.*/],
    globalName: 'IndiaBoundaryCorrector',
    platform: 'browser',
    target: 'es2020',
  }
]);
