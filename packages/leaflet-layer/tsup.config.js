import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  dts: false,
  clean: true,
  outDir: 'dist',
  sourcemap: true,
  platform: 'browser',
  external: ['leaflet'],
  noExternal: ['@india-boundary-corrector/tilefixer', '@india-boundary-corrector/layer-configs'],
});
