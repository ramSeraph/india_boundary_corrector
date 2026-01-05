import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    name: 'IndiaBoundaryTest',
  },
  plugins: [
    resolve(),
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
