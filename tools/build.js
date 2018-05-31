'use strict';

const fs = require('fs');
const del = require('del');
const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const pkg = require('../package.json');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require( 'rollup-plugin-commonjs');

let promise = Promise.resolve();

// Clean up the output directory
promise = promise.then(() => del(['dist/*']));

// Compile source code into a distributable format with Babel
// ['es', 'cjs', 'umd'].forEach((format) => {
//   promise = promise.then(() => rollup.rollup({
//     input: 'src/index.js',
//     output: {
//       file: 'dist/index.js',
//       format: format,
//     },
//     plugins: [babel(Object.assign(pkg.babel, {
//       babelrc: false,
//       exclude: 'node_modules/**',
//       runtimeHelpers: true,
//       presets: pkg.babel.presets.map(x => (x === 'latest' ? ['latest', { es2015: { modules: false } }] : x)),
//     })), resolve(), commonjs()],
//   }).then(bundle => bundle.write({
//     dest: `dist/${format === 'cjs' ? 'index' : `index.${format}`}.js`,
//     format,
//     sourceMap: true,
//     moduleName: format === 'umd' ? pkg.name : undefined,
//   })));
// });

// Copy package.json and LICENSE.txt
promise = promise.then(() => {
  delete pkg.private;
  delete pkg.devDependencies;
  delete pkg.scripts;
  delete pkg.eslintConfig;
  delete pkg.babel;
  pkg.main = 'index.js';
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
  // fs.writeFileSync('dist/LICENSE.txt', fs.readFileSync('LICENSE.txt', 'utf-8'), 'utf-8');
});

promise.catch(err => console.error(err.stack)); // eslint-disable-line no-console
