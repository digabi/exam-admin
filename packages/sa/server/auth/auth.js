'use strict'

import { using } from 'bluebird'
import pgrm from '../db/arpajs-database'
import { logger } from '../logger'

export async function usernameExists(username) {
  const rows = await pgrm.queryRowsAsync(
    'SELECT EXISTS (SELECT 1 FROM user_account WHERE lower(user_account_username) = lower($1)) as exists',
    [username]
  )
  return rows[0].exists
}

export function authenticateByPassword(username, passwd) {
  return authenticate(
    'SELECT user_account_id FROM user_account WHERE lower(user_account_username) = lower($1) AND user_account_passwd = crypt($2, user_account_passwd)',
    [username, passwd]
  )
}

export function authenticateByToken(token) {
  return pgrm
    .queryRowsAsync(
      'SELECT user_account_id, user_account_username, user_account_details FROM user_account WHERE token = $1 AND token is NOT NULL',
      [token]
    )
    .then(rows => {
      const row = rows[0]
      return rows.length
        ? {
            token,
            userId: row.user_account_id,
            userName: row.user_account_username,
            userAccountDetails: row.user_account_details
          }
        : undefined
    })
    .catch(e => {
      if (e && e.cause && e.cause.toString().includes('invalid input syntax for type uuid')) {
        return undefined
      } else {
        logger.error('Error authenticating with token', { token })
        return undefined
      }
    })
}

export function consumeToken(token, userDetails) {
  return using(pgrm.getTransaction(), connection => {
    let details
    return connection
      .queryAsync(
        'UPDATE user_account SET token = null WHERE token = $1 AND token IS NOT NULL RETURNING user_account_id, user_account_passwd, user_account_username',
        [token]
      )
      .then(result => {
        if (result.rows.length > 0) {
          const row = result.rows[0]
          details = {
            userId: row.user_account_id,
            pwHash: row.user_account_passwd,
            userName: row.user_account_username,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName
          }
          return details
        } else {
          logger.error('Error when consuming token', { token, userDetails })
          throw new Error('Error when consuming token.')
        }
      })
  })
}

function authenticate(sqlStmt, params) {
  return pgrm.queryRowsAsync(sqlStmt, params).then(rows => (rows.length > 0 ? userRowToDataObj(rows[0]) : undefined))
}

// currently only for dev purposes
export function createUser(email, passwd, language) {
  return pgrm
    .queryRowsAsync(
      `insert into user_account (user_account_username, user_account_passwd, user_account_exam_language) values ($1, crypt($2, gen_salt('bf', 8)), $3) returning user_account_id, user_account_username, user_account_passwd`,
      [email, passwd, language]
    )
    .then(rows => {
      if (rows.length === 1) {
        return userRowToDataObj(rows[0])
      }
      logger.error('User creation failed for email', { email })
      throw new Error('User creation failed for email.')
    })
}

export function createRegistrationToken(email) {
  return pgrm
    .queryRowsAsync(
      `INSERT INTO user_account (user_account_username, token, token_created) VALUES (lower($1), uuid_generate_v4(), now()) ON CONFLICT (user_account_username) DO UPDATE SET token=excluded.token, token_created=excluded.token_created RETURNING token`,
      [email]
    )
    .then(rows => {
      if (rows.length > 0) {
        return rows[0].token
      }
      logger.error('User token creation failed for email', { email })
      throw new Error('User token creation failed for email.')
    })
}

export async function startUpdateUsername(tx, userId, newUsername) {
  const result = await tx.queryAsync(
    `UPDATE user_account
     SET user_account_details = jsonb_set(coalesce(user_account_details, '{}'),
                                          '{newUsername}',
                                          to_jsonb($2 :: text)),
         token = uuid_generate_v4(),
         token_created = now()
     WHERE user_account_id = $1
     RETURNING token`,
    [userId, newUsername]
  )
  assertRowCount(result, 1, 'Invalid userId')
  return result.rows[0].token
}

export async function finishUpdateUsername(tx, userId, token) {
  const result = await tx.queryAsync(
    `UPDATE user_account
      SET user_account_username = user_account_details ->> 'newUsername',
          token = NULL,
          user_account_details = user_account_details - 'newUsername'
      WHERE user_account_id = $1 AND token = $2
      RETURNING user_account_id, user_account_username`,
    [userId, token]
  )
  assertRowCount(result, 1, 'Invalid userId or token')
  return result.rows[0]
}

export function updateUserDetails(token, passwd, details) {
  return using(pgrm.getTransaction(), tx =>
    removeConcurrentSessions(tx, token)
      .then(() => updateUser(tx, passwd, details, token))
      .then(result => result.rows)
      .then(rows => {
        if (rows.length > 0) {
          return rows[0]
        } else {
          logger.error('Error when updating user details', { token, details })
          throw new Error('`Error when updating user details.')
        }
      })
  )

  function removeConcurrentSessions(tx, token) {
    // eslint-disable-line no-shadow
    return tx.queryAsync(
      "DELETE from session WHERE sess -> 'passport' ->> 'user' = (SELECT user_account_id FROM user_account WHERE token = $1)::text",
      [token]
    )
  }

  function updateUser(tx, passwd, details, token) {
    // eslint-disable-line no-shadow
    return tx.queryAsync(
      "UPDATE user_account SET user_account_passwd = crypt($1, gen_salt('bf', 8)), user_account_details = $2 WHERE token = $3 AND token IS NOT NULL returning user_account_id",
      [passwd, details, token]
    )
  }
}

function userRowToDataObj(row) {
  return {
    userId: row.user_account_id,
    userName: row.user_account_username,
    schoolId: row.school_id
  }
}

function assertRowCount(result, rowCount, errorMessage) {
  if (result.rows.length !== rowCount) {
    throw new Error(errorMessage)
  }
}
