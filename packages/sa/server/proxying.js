'use strict'

import { config } from './config'
import { logger } from './logger'
import { postJsonAsync } from '@digabi/fetch'
import { proxyWithOpts } from '@digabi/express-utils'

export function POST(url, body, next) {
  return postJsonAsync(url, body).catch(error => {
    logger.error('Post proxy error', { error, url })
    return next(error)
  })
}

/**
 * Use URL which normalizes the path to detect path traversal.
 */
export function hasPathTraversal(targetPrefix, requestUrl) {
  const requestPath = requestUrl.split(/[?#]/, 1)[0]
  try {
    const prefixPath = new URL(targetPrefix).pathname
    const expectedPath = (prefixPath === '/' ? '' : prefixPath) + requestPath
    return new URL(targetPrefix + requestPath).pathname !== expectedPath
  } catch {
    return true
  }
}

/**
 * The only way sa forwards a raw request to arpajs: req.url is appended to the given arpajs path.
 *
 * arpajs does no authentication of its own and trusts whatever sa sends, so a request whose path
 * arpajs would read differently from how sa routed and authorised it is refused with 400.
 * Do not call proxyWithOpts directly.
 *
 * Any request that is proxied therefore technically has admin privileges, and the only safety
 * mechanism is manually limiting the paths that can be proxied.
 *
 * The real fix would be that the proxied request to arpajs would use the user's authentication and authorization,
 * but that would require more fundamental changes to both repos.
 */
export function proxyToArpa(arpaPathPrefix, opts = {}) {
  const targetPrefix = config().examUri + arpaPathPrefix
  const forward = proxyWithOpts(targetPrefix, opts, logger)
  return (req, res, next) => {
    if (hasPathTraversal(targetPrefix, req.url)) {
      logger.warn('Refused to proxy a request with path traversal to arpajs', {
        method: req.method,
        originalUrl: req.originalUrl,
        remoteAddress: req.ip
      })
      res.sendStatus(400)
      return
    }
    forward(req, res, next)
  }
}
