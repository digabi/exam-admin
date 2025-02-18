'use strict'

import config from '../config/configParser'
import { logger } from '../logger'
import pg from 'pg-using-bluebird'
export const pgrm = pg({ dbUrl: config.arpaDbUrl })
import { migrations } from '@digabi/js-utils'

pgrm.on('error', err => {
  logger.error('Database error', err)
})

export async function runMigrations(quiet = true) {
  await migrations.migrate({
    logger,
    dbUrl: config.arpaDbUrl,
    dbNames: ['arpa-unittests', 'arpa', 'arpajs'],
    quiet
  })
}
