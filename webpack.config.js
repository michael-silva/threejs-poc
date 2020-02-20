// eslint-disable-next-line import/no-extraneous-dependencies
const path = require('path');
const babelConfig = require('./.babelrc');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  watch: true,
  devServer: {
    port: 3000,
    contentBase: path.join(__dirname, 'src'),
  },
  entry: {
    example1: './src/example1/index.js',
    example2: './src/example2/index.js',
    example3: './src/example3/index.js',
    example4: './src/example4/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components|vendor)/,
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        },
      },
    ],
  },
};
