'use strict'

import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import * as auth from './auth/auth'
import * as userDb from './db/user-management-data'
import { config } from './config'

export default function passportSetup() {
  passport.use(new LocalStrategy(checkUserCredentials))
  passport.use(new BearerStrategy(checkUserCredentialsFromToken))

  passport.serializeUser((credentials, done) => {
    done(null, credentials.userId)
  })

  passport.deserializeUser(async (userId, done) => {
    const userName = await userDb.getUserNameByUserId(userId)
    done(!userName && new Error('Could not find user'), { userName, userId })
  })
}

function checkUserCredentials(username, password, done) {
  // security throttle, prevent user to hit authenticate without delay
  const throttleDelay = config().runningInCloud ? 200 : 0
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
  const throttleDelay = config().runningInCloud ? 200 : 0
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
