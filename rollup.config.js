import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import jsonfile from 'jsonfile';

import pkg from './package.json';

const babelrc = jsonfile.readFileSync('./.babelrc');

babelrc.presets = babelrc.presets.map((x) => (x === 'env' ? ['env', { modules: false }] : x));

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
    },
    plugins: [
      babel({
        babelrc: false,
        runtimeHelpers: false,
        exclude: 'node_modules/**',
        presets: babelrc.presets,
        plugins: babelrc.plugins,
      }),
      resolve({
        customResolveOptions: {
          moduleDirectory: 'node_modules',
        },
      }),
      commonjs(),
    ],
    external: Object.keys(pkg.dependencies),
  },
];
