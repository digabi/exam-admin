'use strict'

import pgrm from './arpajs-database'
import SQL from 'sql-template-strings'

export async function getUserNameByUserId(userId) {
  const result = await pgrm.queryRowsAsync(
    SQL`SELECT user_account_username FROM user_account acc WHERE user_account_id = ${userId}`
  )
  return result[0]?.user_account_username
}
