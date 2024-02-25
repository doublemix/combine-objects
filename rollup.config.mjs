import pkg from './package.json' with { type: 'json' };

export default [
  {
    input: 'src/index.js',
    output: [
      {
        format: 'cjs',
        file: 'dist/index.js',
      },
      {
        format: 'umd',
        file: 'dist/umd/combine.js',
        name: 'combine',
      }
    ],
  },
];
