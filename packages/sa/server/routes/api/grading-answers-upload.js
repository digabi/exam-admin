'use strict'

import express from 'express'
const router = express.Router()
import config from '../../config/configParser'
import { proxyWithOpts } from '@digabi/express-utils'
import { logger } from '../../logger'

router.post('/', (req, res, next) => {
  logger.info('Incoming answers meb', { size: Number(req.headers['content-length']) })
  proxyWithOpts(`${config.examUri}/grading/answers-meb`, { timeout: 4 * 60 * 1000 }, logger)(req, res, next)
})

export default router
