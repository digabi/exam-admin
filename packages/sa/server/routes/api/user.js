'use strict'

import _ from 'lodash'
import express from 'express'
const router = express.Router()
import * as authSession from '../../auth/auth-session'
import * as auth from '../../auth/auth'
import { logger } from '../../logger'
import passport from 'passport'

router.get('/', authSession.ensureAuthenticated, (req, res) => {
  const user = {
    ...req.user,
    firstName: req.session.firstName,
    lastName: req.session.lastName,
    details: {}
  }
  res.json({ userName: req.user.userName, user: user })
})

// for token account creation
router.post('/token', passport.authenticate('bearer', { session: false }), (req, res) =>
  res.json({ userName: req.user.userName, userDetails: req.user.userAccountDetails })
)

// for user creation
router.post('/details', passport.authenticate('bearer'), (req, res) => {
  // eslint-disable-line consistent-return
  const userDetails = req.body.details
  const password = req.body.password
  if (!isStringAndShortEnough(password, 60) || !validUserDetails(userDetails)) {
    logger.error('POST /user/details input error:', { password, details: userDetails })
    return res.status(400).end()
  }
  auth
    .updateUserDetails(req.user.token, password, userDetails)
    .then(() => auth.consumeToken(req.user.token, userDetails))
    .then(() => res.status(204).end())
    .catch(err => {
      logger.error('POST /user/details system error:', { error: err })
      return res.status(500).end()
    })
})

function isStringAndShortEnough(str, maxLength) {
  return typeof str === 'string' && str.length < maxLength
}

function validUserDetails(userDetails) {
  const userDetailsValidation = {
    firstName: _.partial(nullable, isNaturalNameAndShortEnough),
    lastName: _.partial(nullable, isNaturalNameAndShortEnough),
    noMailing: _.partial(mandatory, isBoolean),
    noContacting: _.partial(mandatory, isBoolean),
    acceptTerms: _.partial(mandatory, isTrue)
  }

  const surplusKeys = _.difference(_.keys(userDetails), _.keys(userDetailsValidation))
  if (surplusKeys.length > 0) {
    return false
  }
  const fieldValidations = _.map(userDetailsValidation, (f, key) => f(userDetails[key]))

  return fieldValidations.reduce((result, A) => result && A)

  function nullable(f, value) {
    return value === null || f(value)
  }

  function mandatory(f, value) {
    return value !== null && f(value)
  }

  function isNaturalNameAndShortEnough(name) {
    return typeof name === 'string' && name.search(/^[\u00C0-\u00FFa-zA-Z -]+$/) !== -1 && name.length < 101
  }

  function isBoolean(value) {
    return typeof value === 'boolean'
  }

  function isTrue(value) {
    return isBoolean(value) && value === true
  }
}

router.post('/login', passport.authenticate('local'), (req, res) => res.status(204).end())

router.get('/logout', logout)
router.post('/logout', logout)

function logout(req, res) {
  if (req.user) {
    return authSession.endSessionAsync(req).then(() => res.redirect('/'))
  }
  res.status(200).end()
}

export default router
