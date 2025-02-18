import express from 'express'
import * as path from 'path'
import { logger } from './logger'

const isDev = process.env.NODE_ENV !== 'production'
const isCI = !!process.env.BUILD_NUMBER

export default function webpackAssets() {
  if (!isDev || isCI) {
    logger.info('Serving prebuilt webpack assets')
    return express.static(path.resolve(__dirname, '../public/dist'))
  }

  logger.info('Serving webpack assets using dev middleware')
  const webpackConfig = require(path.resolve(__dirname, '../webpack.config')) // force dynamic module lookup
  const compiler = require('webpack')(webpackConfig())
  return require('webpack-dev-middleware')(compiler, {
    publicPath: '/', // relative to mount path
    stats: 'minimal'
  })
}
