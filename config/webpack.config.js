'use strict';

const { merge } = require('webpack-merge');

const common = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) =>
  merge(common, {
    entry: {
      fetch_homework_storage: PATHS.src + '/fetch_homework_storage.ts',
      show_homework_storage: PATHS.src + '/show_homework_storage.ts',
      popup: PATHS.src + '/popup.ts',
    },
    devtool: argv.mode === 'production' ? false : 'source-map',
  });

module.exports = config;
