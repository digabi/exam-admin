'use strict'

import config from '../config/configParser'
import { logger } from '../logger'
import pg from 'pg-using-bluebird'
const pgrm = pg({ dbUrl: config.arpajsDbUrl })

pgrm.on('error', err => {
  logger.error('pgrm emitted an error:\n', err && err.stack)
})

export default pgrm
