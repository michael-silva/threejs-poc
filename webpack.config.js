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
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: babelConfig,
        },
      },
    ],
  },
};
