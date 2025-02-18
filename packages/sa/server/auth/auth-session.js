'use strict'

import Promise from 'bluebird'
import config from '../config/configParser'

export function ensureAuthenticatedWithFallback(fallback) {
  return (req, res, next) => checkAuth(req, res, next, fallback)
}

export function ensureAuthenticated(req, res, next) {
  return checkAuth(req, res, next)
}

export function isSuperuser(req) {
  return req?.user?.userName === config.superUserUsername
}

export function ensureSuperuser(req, res, next) {
  if (isSuperuser(req)) {
    next()
  } else {
    res.status(401).end()
  }
}

function checkAuth(req, res, next, fallback) {
  if (req.isAuthenticated()) {
    return next()
  }
  return fallback ? fallback(res) : res.status(401).send('null')
}

export function endSessionAsync(req) {
  return Promise.fromNode(callback => req.session.destroy(callback))
}
