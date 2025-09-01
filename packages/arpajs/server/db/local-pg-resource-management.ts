import { migrate } from '@digabi/database-utils'
import config from '../config/configParser'
import { logger } from '../logger'
import pg from 'pg-using-bluebird'
export const pgrm = pg({ dbUrl: config.arpaDbUrl })

pgrm.on('error', err => {
  logger.error('Database error', err)
})

export async function runMigrations(quiet = true) {
  await migrate({
    logger,
    dbUrl: config.arpaDbUrl,
    dbNames: ['arpa-unittests', 'arpa', 'arpajs'],
    quiet
  })
}
