'use strict'

import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import { BasicStrategy } from 'passport-http'
import { Strategy as CustomStrategy } from 'passport-custom'
import * as auth from './auth/auth'
import * as oauth from './auth/oauth'
import * as userDb from './db/user-management-data'
import config from './config/configParser'

export default function passportSetup() {
  passport.use(new LocalStrategy(checkUserCredentials))
  passport.use(new BearerStrategy(checkUserCredentialsFromToken))
  passport.use('oauth-bearer', new BearerStrategy(oauth.verifyBearer))
  passport.use('oauth-basic', new BasicStrategy(oauth.verifyClient))
  passport.use('pkce', new CustomStrategy(oauth.verifyPkce))

  passport.serializeUser((credentials, done) => {
    done(null, credentials.userId)
  })

  passport.deserializeUser(async (userId, done) => {
    const userName = await userDb.getUserNameByUserId(userId)
    done(!userName && new Error(`Could not find user: ${userId}`), { userName, userId })
  })
}

function checkUserCredentials(username, password, done) {
  // security throttle, prevent user to hit authenticate without delay
  const throttleDelay = config.runningInCloud ? 200 : 0
  return auth
    .authenticateByPassword(username, password)
    .then(success => {
      if (success) {
        return success
      } else {
        return false
      }
    })
    .delay(throttleDelay)
    .nodeify(done)
}

function checkUserCredentialsFromToken(token, done) {
  // security throttle, prevent user to hit authenticate without delay
  const throttleDelay = config.runningInCloud ? 200 : 0
  return auth
    .authenticateByToken(token)
    .then(success => {
      if (success) {
        return success
      } else {
        return false
      }
    })
    .delay(throttleDelay)
    .nodeify(done)
}
