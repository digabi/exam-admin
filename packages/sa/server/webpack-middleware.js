import express from 'express'
import * as path from 'path'
import { config } from './config'
import { logger } from './logger'

export default function webpackAssets() {
  if (!config().useWebpackDevMiddleware) {
    logger.info('Serving prebuilt webpack assets')
    return express.static(path.resolve(__dirname, '../public/dist'))
  }

  logger.info('Serving webpack assets using dev middleware')
  const webpackConfig = require(path.resolve(__dirname, '../webpack.config')) // force dynamic module lookup
  const compiler = require('webpack')(webpackConfig())
  return require('webpack-dev-middleware')(compiler, {
    publicPath: '/dist/', // relative to mount path
    stats: 'minimal'
  })
}
