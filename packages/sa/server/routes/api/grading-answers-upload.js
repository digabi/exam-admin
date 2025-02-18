'use strict'

import express from 'express'
const router = express.Router()
import config from '../../config/configParser'
import * as jsUtils from '@digabi/js-utils'
import { logger } from '../../logger'

router.post(['/', '/pregrading'], (req, res, next) =>
  jsUtils.expressUtils.proxyWithOpts(`${config.examUri}/grading/answers-meb`, { timeout: 4 * 60 * 1000 }, logger)(
    req,
    res,
    next
  )
)

export default router
