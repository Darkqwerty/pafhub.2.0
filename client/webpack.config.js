const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash].js',
    clean: true,
    publicPath: '/',
  },
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        catalog: {
          test: /[\\/]node_modules[\\/]mantine-react-table[\\/]/,
          name: 'catalog-vendor',
          chunks: 'async',
          priority: 40,
          enforce: true,
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react-vendor',
          priority: 30,
          enforce: true,
        },
        ui: {
          test: /[\\/]node_modules[\\/](@mantine|@tabler)[\\/]/,
          name: 'ui-vendor',
          priority: 20,
          enforce: true,
        },
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: './src/index.html', title: 'PAFHub — game discovery' })],
  devServer: {
    port: 8080,
    historyApiFallback: true,
    hot: true,
    proxy: [{ context: ['/api'], target: 'http://localhost:3001' }],
  },
};
