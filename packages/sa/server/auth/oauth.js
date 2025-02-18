import * as oauth2orize from 'oauth2orize'
import passport from 'passport'
import { ensureAuthenticatedWithFallback } from './auth-session'
import * as R from 'ramda'
import base64url from 'base64url'
import crypto from 'crypto'
import cors from 'cors'
import { URL, URLSearchParams } from 'url'
import { logger } from '../logger'
import {
  consumeAuthorizationCode,
  consumeRefreshToken,
  deleteAccessTokens,
  deleteAuthorizationCodes,
  deleteRefreshTokens,
  deleteTranscationDetails,
  issueAuthorizationCode,
  issueTokens,
  queryAccessTokenDetails,
  queryAuthorizationCodeDetails,
  queryAuthorizedClients,
  queryClient,
  queryRefreshTokenDetails,
  queryTransactionDetails,
  removeOldTransactions,
  storeTransactionDetails,
  verifyClientCredentials,
  verifyClientHasScopes,
  verifyPkceChallenge
} from './oauth-model'
import { extensions } from '@passport-next/oauth2orize-pkce'

const wwwAuthenticateHeaderValue = 'Basic realm="SA"'

// Custom error class used to define when the user should not be redirected back to the redirect uri
export class AuthorizationClientError extends oauth2orize.AuthorizationError {
  constructor(message, code, uri, status) {
    super(message, code, uri, status)
  }
}

const sendLogin = res => {
  const loginFile = '/public/oauth-login.html'
  res.sendFile(loginFile, { root: `${__dirname}/../..` })
}

const server = oauth2orize.createServer()
server.grant(extensions())

const shouldRedirect = function (err) {
  return !(err instanceof AuthorizationClientError) && err instanceof oauth2orize.AuthorizationError
}

const errorHandler = (err, req, res, next) => {
  try {
    const errorToReturn = {
      error: err.code,
      error_description: err.message,
      error_uri: err.uri
    }

    if (shouldRedirect(err)) {
      const data = { ...req.query, ...req.body }
      const redirectUri = data.redirect_uri
      const redirectLocation = new URL(redirectUri)
      const params = new URLSearchParams()
      Object.entries(errorToReturn).forEach(([k, v]) => {
        params.append(k, v)
      })
      redirectLocation.search = params.toString()

      let url = redirectLocation.toString()
      // URL class adds a slash after the authority even if it did not exist in the string given to the constructor
      if (!redirectUri.endsWith('/') && url[redirectUri.length] === '/') {
        url = url.replace('/?', '?')
      }

      res.redirect(url)
      return
    }

    if (!(err instanceof AuthorizationClientError)) {
      logger.error('OAuth request failed:', err)
    }

    res.status(err.status || 500)
    if (req.headers.authorization) {
      res.setHeader('WWW-Authenticate', wwwAuthenticateHeaderValue)
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(errorToReturn))
  } catch (e) {
    logger.error('Unknown OAuth error:', e)
    next(err)
  }
}

server.serializeClient((client, done) => done(null, client.clientUserId))

server.deserializeClient(async (id, done) => {
  try {
    const client = await queryClient(id)

    if (!client) {
      done(new Error('Client not found for the given id'))
      return
    }

    done(null, client)
  } catch (e) {
    done(e)
  }
})

const userHasConsented = async (client, user, scopes) => {
  const authorizedClients = await queryAuthorizedClients(user.userId)
  const matchingClient = authorizedClients.find(R.propEq('id', client))

  return matchingClient !== undefined && R.isEmpty(R.without(matchingClient.scopes, scopes))
}

const objectContainsKeys = (keys, obj) => keys.every(k => k in obj)

const missingParametersError = (parameterNames, parameters) => ({
  error: 'invalid_request',
  error_description: `Missing required parameter(s). The request must include the following parameter(s): ${parameterNames.join(
    ', '
  )}`,
  state: parameters.state
})

const verifyQueryContains =
  parameterNames =>
  ({ query }, res, next) => {
    if (!objectContainsKeys(parameterNames, query)) {
      res.status(400).send(missingParametersError(parameterNames, query))
    } else {
      next()
    }
  }

const verifyBodyContains =
  parameterNames =>
  ({ body }, res, next) => {
    if (!objectContainsKeys(parameterNames, body)) {
      res.status(400).send(missingParametersError(parameterNames, body))
    } else {
      next()
    }
  }

const verifyTokenParameters = (req, res, next) => {
  const grantType = req.body.grant_type
  const requiredParameters =
    grantType === 'authorization_code'
      ? ['redirect_uri', 'code']
      : grantType === 'refresh_token'
        ? ['refresh_token']
        : undefined

  if (requiredParameters === undefined) {
    next(
      new oauth2orize.TokenError(
        'Unsupported grant type. Supported grant types are authorization_code and refresh_token.',
        'unsupported_grant_type',
        undefined,
        400
      )
    )
  } else {
    const isPCKERequest = req.body.code_verifier !== undefined
    if (isPCKERequest) {
      requiredParameters.push('client_id')
    }

    verifyBodyContains(requiredParameters)(req, res, next)
  }
}

// When the user doesn't consent, oauth2orize adds a trailing '/' after origin even if it is not included in the redirect_uri
// i.e. /consent/?redirect_uri=http://somehost.com&... -> http://somehost.com/?error=access_denied&...
export const decision = [
  ensureAuthenticatedWithFallback(sendLogin),
  async (req, res, next) => {
    try {
      next()
      await deleteTranscationDetails(req.body.transaction_id)
      await removeOldTransactions()
    } catch (e) {
      next(e)
    }
  },
  server.decision()
]

export async function getTransactionDetails(req, res, next) {
  try {
    const details = await queryTransactionDetails(req.params.transactionId)
    if (details) {
      res.send(details)
    } else {
      res.status(400).send({ error: 'Invalid transaction id' })
    }
  } catch (e) {
    next(e)
  }
}

export const token = [
  verifyTokenParameters,
  passport.authenticate(['pkce', 'oauth-basic'], { session: false }),
  server.token(),
  errorHandler
]

export const authorization = [
  verifyQueryContains(['client_id']),
  ensureAuthenticatedWithFallback(sendLogin),
  server.authorization(
    async (clientUserId, redirectUri, scopes, done) => {
      try {
        const client = await queryClient(clientUserId)

        if (client === undefined) {
          done(new AuthorizationClientError('OAuth client not found', 'invalid_client', undefined, 401))
          return
        }

        if (client.redirectUri !== redirectUri) {
          done(new AuthorizationClientError('Redirect URI does not match', 'invalid_request', undefined, 400))
          return
        }

        if (!scopes) {
          done(new oauth2orize.AuthorizationError('No scopes provided', 'invalid_request'))
          return
        }

        const unavailableScopes = await verifyClientHasScopes(client.clientUserId, scopes)
        if (unavailableScopes.length !== 0) {
          done(
            new oauth2orize.AuthorizationError(`Unavailable scopes: ${unavailableScopes.join(', ')}`, 'invalid_scope')
          )
          return
        }

        done(null, client, redirectUri)
      } catch (e) {
        done(e)
      }
    },
    async (client, user, scopes, done) => {
      const hasConsent = await userHasConsented(client.clientId, user, scopes)
      done(null, hasConsent)
    }
  ),
  (req, res, next) => {
    try {
      const isPKCERequest = req.query.code_challenge_method || req.query.code_challenge
      if (isPKCERequest && (!req.query.code_challenge || req.query.code_challenge_method !== 'S256')) {
        next(
          new oauth2orize.AuthorizationError(
            'code_challenge must be provided and code_challenge_method must be S256 for PKCE requests',
            'invalid_request'
          )
        )
        return
      }
      next()
    } catch (e) {
      next(e)
    }
  },
  async (req, res, next) => {
    try {
      await storeTransactionDetails(
        req.oauth2.transactionID,
        req.user.userName,
        req.oauth2.client.clientName,
        req.oauth2.req.scope
      )

      res.redirect(`/oauth/consent?transaction_id=${req.oauth2.transactionID}`)
    } catch (e) {
      next(e)
    }
  },
  errorHandler
]

server.grant(
  oauth2orize.grant.code(async (client, redirectUri, user, ares, req, done) => {
    try {
      const authorizationCode = await issueAuthorizationCode(
        req.codeChallenge,
        req.scope,
        user.userId,
        client.clientUserId
      )

      done(null, authorizationCode)
    } catch (e) {
      logger.error('Authorization code request handling failed:', e)
      done(e)
    }
  })
)

server.exchange(
  oauth2orize.exchange.code(async (client, authorizationCode, redirectUri, done) => {
    try {
      const codeDetails = await queryAuthorizationCodeDetails(authorizationCode)

      if (redirectUri !== client.redirectUri) {
        done(new oauth2orize.TokenError('Invalid client', 'invalid_client', undefined, 401))
        return
      }

      if (!codeDetails && redirectUri === client.redirectUri) {
        done(new oauth2orize.TokenError('Invalid authorization code', 'invalid_grant', undefined, 400))
        return
      }

      if (codeDetails.scopes.length === 0) {
        logger.error('No scopes found for authorization code', { codeId: codeDetails.codeId })
        done(new oauth2orize.TokenError('No scopes found for the authorization code', 'invalid_grant', undefined, 400))
        return
      }

      await consumeAuthorizationCode(codeDetails.codeId)

      issueTokens(codeDetails.userId, codeDetails.clientUserId, codeDetails.scopes, !client.pkce, done)
    } catch (e) {
      logger.error('OAuth authorization code exchange failed:', e)
      done(e)
    }
  })
)

server.exchange(
  oauth2orize.exchange.refreshToken(async (client, refreshToken, scope, done) => {
    try {
      const refreshTokenDetails = await queryRefreshTokenDetails(refreshToken)

      if (refreshTokenDetails === undefined) {
        done(new oauth2orize.TokenError('Refresh token not found', 'invalid_grant', undefined, 400))
        return
      }

      const { userId, scopes } = refreshTokenDetails

      if (scope && scopes !== scope) {
        done(new oauth2orize.TokenError('Invalid scopes', 'invalid_request'))
        return
      }

      await consumeRefreshToken(refreshToken)

      issueTokens(userId, client.clientUserId, scopes, !client.pkce, done)
    } catch (e) {
      logger.error('Access token request with refresh token failed:', e)
      done(e)
    }
  })
)

export async function verifyClient(clientUserId, clientSecret, done) {
  try {
    const credentialsOk = await verifyClientCredentials(clientUserId, clientSecret)
    if (!credentialsOk) {
      done(new AuthorizationClientError('Invalid client', 'invalid_client', undefined, 401))
      return
    }

    const clientDetails = await queryClient(clientUserId)

    done(null, clientDetails)
  } catch (e) {
    done(e)
  }
}

export async function verifyPkce(req, done) {
  try {
    const isPKCEAccessTokenRequest = req.body.code_verifier !== undefined
    if (!isPKCEAccessTokenRequest) {
      done(null, false)
      return
    }

    const { client_id: clientUserId, code, redirect_uri: redirectUri } = req.body
    const clientDetails = await queryClient(clientUserId)

    if (!clientDetails || clientDetails.redirectUri !== redirectUri) {
      done(new oauth2orize.TokenError('Invalid client', 'invalid_client', undefined, 401))
      return
    }

    const challenge = base64url.encode(crypto.createHash('sha256').update(req.body.code_verifier).digest())

    const challengeOk = await verifyPkceChallenge(clientUserId, redirectUri, code, challenge)

    if (challengeOk) {
      done(null, { ...clientDetails, pkce: true })
    } else {
      done(new oauth2orize.TokenError('Code challenge did not match', 'invalid_grant', undefined, 400))
    }
  } catch (e) {
    done(e)
  }
}

export async function verifyBearer(token, done) {
  const accessTokenDetails = await queryAccessTokenDetails(token)
  if (accessTokenDetails === undefined) {
    done(null, false)
    return
  }

  const { userId, ...info } = accessTokenDetails

  if (!userId) {
    done(null, false)
  } else {
    done(null, { userId }, info)
  }
}

export async function allowClientOrigin(req, res, next) {
  try {
    const client = await queryClient(req.body.client_id)
    if (!client) {
      next()
    } else {
      cors({ origin: client.allowedOrigin })(req, res, next)
    }
  } catch (e) {
    next(e)
  }
}

export const allowOAuthTokenWithScope = (module.exports.hasOAuthScope = scope => (req, res, next) => {
  try {
    passport.authenticate('oauth-bearer', { session: false }, (err, user, info) => {
      if (err) {
        next(err)
        return
      }
      if (!user) {
        res.setHeader('WWW-Authenticate', wwwAuthenticateHeaderValue)
        res.status(401).end('Unauthorized')
        return
      }
      if (!info.scope || info.scope.includes(scope)) {
        req.login({ userId: user.userId }, { session: false }, () =>
          cors({ origin: info.allowedOrigin })(req, res, next)
        )
      } else {
        res.status(403).end('Forbidden')
      }
    })(req, res, next)
  } catch (e) {
    next(e)
  }
})

export async function removeAuthorizedClientFromUser(clientId, userId) {
  await deleteAuthorizationCodes(clientId, userId)
  await deleteAccessTokens(clientId, userId)
  await deleteRefreshTokens(clientId, userId)
}
