'use strict'

import { logger } from './logger'
import * as jsUtils from '@digabi/js-utils'

export function POST(url, body, next) {
  return jsUtils.postJsonAsync(url, body).catch(error => {
    logger.error('Post proxy error', { error, url })
    return next(error)
  })
}

export function proxy(targetPrefix) {
  return jsUtils.expressUtils.proxyWithOpts(targetPrefix, {}, logger)
}
