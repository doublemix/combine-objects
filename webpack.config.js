/* eslint-disable */
var webpack = require('webpack');
var path = require('path');
var minimize = webpack.optimize.minimize;
var env = process.env.WEBPACK_ENV;

var libraryName = 'index';
var plugins = [];
var outputFile = libraryName + '.js';

var config = {
  entry: __dirname + '/src/index.js',
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        use: {
          loader: 'babel-loader',
        },
        exclude: /(node_modules|bower_components)/
      },
    ]
  },
  resolve: {
    modules: [path.resolve('./src'), 'node_modules'],
    extensions: ['.js']
  },
  plugins: plugins,
};

module.exports = config;