import * as uuid from 'uuid'
import pgrm from '../db/arpajs-database'
import config from '../config/configParser'
import * as R from 'ramda'
import SQL from 'sql-template-strings'

export const issueTokens = async (userId, clientUserId, scopes, issueRefreshToken, done) => {
  try {
    const accessToken = uuid.v4()
    let refreshToken

    const [{ accessTokenId }] = await pgrm.queryRowsAsync(
      // language=PostgreSQL
      `INSERT INTO oauth_access_token (oauth_access_token_value, user_account_id, oauth_client_id,
                                oauth_access_token_valid_until)
SELECT $1, $2, oauth_client_id, NOW() + INTERVAL '${config.oauth.accessTokenExpirySeconds} seconds'
FROM oauth_client
WHERE oauth_client_user_id = $3
RETURNING oauth_access_token_id AS "accessTokenId"`,
      [accessToken, userId, clientUserId]
    )

    await pgrm.queryAsync(
      // language=PostgreSQL
      SQL`INSERT INTO oauth_access_token__scope
         SELECT ${accessTokenId}, oauth_scope_id
         FROM oauth_scope
         WHERE oauth_scope_name = ANY (${scopes})`
    )

    if (issueRefreshToken) {
      refreshToken = uuid.v4()
      const [{ refreshTokenId }] = await pgrm.queryRowsAsync(
        // language=PostgreSQL
        `INSERT INTO oauth_refresh_token (oauth_refresh_token_value, user_account_id, oauth_client_id, oauth_refresh_token_valid_until)
SELECT $1, $2, oauth_client_id, NOW() + INTERVAL '${config.oauth.refreshTokenExpirySeconds} seconds'
FROM oauth_client
WHERE oauth_client_user_id = $3
RETURNING oauth_refresh_token_id AS "refreshTokenId"`,
        [refreshToken, userId, clientUserId]
      )

      await pgrm.queryAsync(
        // language=PostgreSQL
        SQL`INSERT INTO oauth_refresh_token__scope
           SELECT ${refreshTokenId}, oauth_scope_id
           FROM oauth_scope
           WHERE oauth_scope_name = ANY (${scopes})`
      )
    }

    return done(null, accessToken, refreshToken, {
      scope: scopes.join(' '),
      expires_in: config.oauth.accessTokenExpirySeconds
    })
  } catch (e) {
    return done(e)
  }
}

export const verifyClientHasScopes = async (clientUserId, scopes) => {
  const [{ allowedScopes }] = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT array_agg(oauth_scope_name) AS "allowedScopes"
       FROM oauth_scope
                NATURAL JOIN oauth_client__scope
                NATURAL JOIN oauth_client
       WHERE oauth_client_user_id = ${clientUserId}
         AND oauth_scope_name = ANY (${scopes})`
  )

  return R.without(allowedScopes || [], scopes)
}

export const issueAuthorizationCode = async (codeChallenge, scope, userId, clientUserId) => {
  const code = uuid.v4()
  const [{ authorizationCodeId }] = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    `INSERT INTO oauth_authorization_code (oauth_client_id,
                                           oauth_authorization_code_value,
                                           oauth_authorization_code_code_challenge,
                                           user_account_id,
                                           oauth_authorization_code_valid_until)
     SELECT oauth_client_id, $1, $2, $3, NOW() + INTERVAL '${config.oauth.authorizationCodeExpirySeconds} seconds'
     FROM oauth_client
     WHERE oauth_client_user_id = $4
     RETURNING oauth_authorization_code_id as "authorizationCodeId"
    `,
    [code, codeChallenge, userId, clientUserId]
  )

  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`INSERT INTO oauth_authorization_code__scope (oauth_authorization_code_id, oauth_scope_id)
       SELECT ${authorizationCodeId}, oauth_scope_id
       FROM oauth_scope
       WHERE oauth_scope_name = ANY (${scope})
    `
  )

  return code
}

export const queryAuthorizationCodeDetails = async authorizationCode => {
  const [codeDetails] = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT oauth_authorization_code_id AS "codeId",
              user_account_id             AS "userId",
              oauth_client_user_id        AS "clientUserId",
              oauth_client_redirect_uri   AS "redirectUri",
              array_agg(oauth_scope_name) as "scopes"
       FROM oauth_authorization_code
                NATURAL JOIN oauth_client
                NATURAL JOIN oauth_authorization_code__scope
                NATURAL JOIN oauth_scope
       WHERE oauth_authorization_code_value = ${authorizationCode}
       GROUP BY 1, 2, 3, 4
    `
  )
  return codeDetails
}

export const consumeAuthorizationCode = async authorizationCodeId => {
  const res = await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`DELETE
       FROM oauth_authorization_code
       WHERE oauth_authorization_code_id =
             (SELECT oauth_authorization_code_id
              FROM oauth_authorization_code
                       NATURAL JOIN oauth_client
              WHERE oauth_authorization_code_id = ${authorizationCodeId}
                AND oauth_authorization_code_valid_until > NOW())
    `
  )

  if (res.rowCount !== 1) {
    throw new Error(`Expected to delete 1 authorization code. Instead ${res.rowCount} rows affected!`)
  }
}

export const consumeRefreshToken = async refreshToken => {
  // language=PostgreSQL
  const res = await pgrm.queryAsync(
    SQL`DELETE
FROM oauth_refresh_token
WHERE oauth_refresh_token_id =
      (SELECT oauth_refresh_token_id
       FROM oauth_refresh_token
                NATURAL JOIN oauth_client
       WHERE oauth_refresh_token_value = ${refreshToken}
         AND oauth_refresh_token_valid_until > NOW())
  `
  )
  if (res.rowCount !== 1) {
    throw new Error(`Expected to delete 1 refresh token. Instead ${res.rowCount} rows affected!`)
  }
}

export const queryRefreshTokenDetails = async refreshToken => {
  const rows = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT user_account_id as "userId", array_agg(oauth_scope_name) AS scopes
FROM oauth_refresh_token
         NATURAL JOIN oauth_refresh_token__scope
         NATURAL JOIN oauth_scope
WHERE oauth_refresh_token_value = ${refreshToken}
  AND oauth_refresh_token_valid_until > NOW()
GROUP BY 1
  `
  )

  return rows[0]
}

export const queryAuthorizedClients = userId =>
  pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT DISTINCT oauth_client_id AS id, oauth_client_name AS name, ARRAY_AGG(DISTINCT oauth_scope_name) AS scopes
FROM (SELECT DISTINCT oauth_client_id, oauth_scope_id
      FROM oauth_refresh_token
               NATURAL JOIN oauth_refresh_token__scope
      WHERE user_account_id = ${userId}
        AND NOW() < oauth_refresh_token_valid_until
      UNION ALL
      SELECT DISTINCT oauth_client_id, oauth_scope_id
      FROM oauth_access_token
               NATURAL JOIN oauth_access_token__scope
      WHERE user_account_id = ${userId}
        AND NOW() < oauth_access_token_valid_until) valid_oauth_clients
         NATURAL JOIN oauth_client
         NATURAL JOIN oauth_scope
GROUP BY 1, 2
`
  )

export const deleteRefreshTokens = async (clientId, userId) => {
  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`DELETE
       FROM oauth_refresh_token
       WHERE oauth_client_id = ${clientId}
         AND user_account_id = ${userId}`
  )
}

export const deleteAccessTokens = async (clientId, userId) => {
  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`DELETE
       FROM oauth_access_token
       WHERE oauth_client_id = ${clientId}
         AND user_account_id = ${userId}`
  )
}

export const deleteAuthorizationCodes = async (clientId, userId) => {
  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`DELETE
       FROM oauth_authorization_code
       WHERE oauth_client_id = ${clientId}
         AND user_account_id = ${userId}`
  )
}

export const queryClient = async clientUserId => {
  const [client] = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT oauth_client_id                                    AS "clientId",
              oauth_client_name                                  AS "clientName",
              oauth_client_user_id                               AS "clientUserId",
              oauth_client_redirect_uri                          AS "redirectUri",
              extract_origin_from_uri(oauth_client_redirect_uri) AS "allowedOrigin"
       FROM oauth_client
       WHERE oauth_client_user_id = ${clientUserId}`
  )

  return client
}

export const queryAccessTokenDetails = async accessToken => {
  const [accessTokenDetails] = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT user_account_id                                    AS "userId",
              extract_origin_from_uri(oauth_client_redirect_uri) AS "allowedOrigin",
              array_agg(oauth_scope_name)                        AS scopes
       FROM oauth_access_token
                NATURAL JOIN oauth_access_token__scope
                NATURAL JOIN oauth_scope
                NATURAL JOIN oauth_client
       WHERE oauth_access_token_value = ${accessToken}
         AND oauth_access_token_valid_until > NOW()
       GROUP BY oauth_access_token_id, "allowedOrigin"`
  )

  return accessTokenDetails
}

export const verifyClientCredentials = async (clientUserId, clientSecret) => {
  const res = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT oauth_client_user_id AS "clientUserId"
FROM oauth_client
WHERE oauth_client_user_id = ${clientUserId}
  AND oauth_client_secret = crypt(${clientSecret}, oauth_client_secret)`
  )

  return res.length === 1
}

export const verifyPkceChallenge = async (clientId, redirectUri, code, challenge) => {
  const res = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT EXISTS(SELECT 1
                           FROM oauth_authorization_code
                                    NATURAL JOIN oauth_client
                           WHERE oauth_client_user_id = ${clientId}
                             AND oauth_authorization_code_value = ${code}
                             AND oauth_client_redirect_uri = ${redirectUri}
                             AND oauth_authorization_code_code_challenge = ${challenge})`
  )

  return res[0] !== undefined && res[0].exists
}

export const storeTransactionDetails = async (transactionId, username, clientName, scopes) => {
  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`INSERT INTO oauth_transaction_details
(oauth_transaction_details_transaction_id,
 oauth_transaction_details_username,
 oauth_transaction_details_client_name, 
 oauth_transaction_details_scopes)
VALUES (${transactionId}, ${username}, ${clientName}, ${scopes})`
  )
}

export const queryTransactionDetails = async transactionId => {
  const [details] = await pgrm.queryRowsAsync(
    // language=PostgreSQL
    SQL`SELECT oauth_transaction_details_username    AS username,
       oauth_transaction_details_client_name AS "clientName",
       oauth_transaction_details_scopes      AS scopes
FROM oauth_transaction_details
WHERE oauth_transaction_details_transaction_id = ${transactionId}`
  )

  return details
}

export const deleteTranscationDetails = async transactionId => {
  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`DELETE FROM oauth_transaction_details WHERE oauth_transaction_details_transaction_id = ${transactionId}`
  )
}

export const removeOldTransactions = async () => {
  await pgrm.queryAsync(
    // language=PostgreSQL
    SQL`DELETE
FROM oauth_transaction_details
WHERE oauth_transaction_details_created_at < NOW() - interval '1 days'`
  )
}
