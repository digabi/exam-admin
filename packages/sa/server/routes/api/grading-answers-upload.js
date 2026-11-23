'use strict'

import express from 'express'
import { proxyToArpa } from '../../proxying'
import { logger } from '../../logger'

/**
 * Streams an answer package to arpa. The two upload routes differ only in the arpa path
 * they target, and through it in the response shape arpa answers with.
 * TODO: Route parametre can be removed when the old KTP servers are no longer supported.
 */
export default function answersUploadRouter(arpaPath) {
  const router = express.Router()

  router.post('/', (req, res, next) => {
    logger.info('Incoming answers meb', { size: Number(req.headers['content-length']), arpaPath })
    proxyToArpa(arpaPath, { timeout: 4 * 60 * 1000 })(req, res, next)
  })

  return router
}
