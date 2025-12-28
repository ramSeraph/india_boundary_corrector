import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  platform: 'browser',
  external: ['maplibre-gl'],
});
