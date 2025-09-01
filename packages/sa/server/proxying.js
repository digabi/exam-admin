'use strict'

import { logger } from './logger'
import { postJsonAsync } from '@digabi/fetch'
import { proxyWithOpts } from '@digabi/express-utils'

export function POST(url, body, next) {
  return postJsonAsync(url, body).catch(error => {
    logger.error('Post proxy error', { error, url })
    return next(error)
  })
}

export function proxy(targetPrefix) {
  return proxyWithOpts(targetPrefix, {}, logger)
}
