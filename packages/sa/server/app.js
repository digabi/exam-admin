'use strict'

import express from 'express'
import path from 'path'
import { logger } from './logger'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import { setupDefaultErrorHandlers } from '@digabi/express-utils'
import { requestLogger } from '@digabi/logger'
import session from 'express-session'
import config from './config/configParser'
import * as proxying from './proxying'
import { mathSvgResponse as mathSvgHandler } from 'rich-text-editor/server/mathSvg'
import URI from 'urijs'
const app = express()
import { ensureAuthenticated, ensureSuperuser, isSuperuser } from './auth/auth-session'
import passport from 'passport'
import passportSetup from './passport-setup'
import connectPgSimple from 'connect-pg-simple'
const pgSession = connectPgSimple(session)
import compress from 'compression'
import pgrm from './db/arpajs-database'
import { markup } from './indexHtml'
import webpackAssets from './webpack-middleware'
import answersMebRouter from './routes/api/grading-answers-upload'
import gradingRouter from './routes/api/grading-proxy'
import composingProxyRouter from './routes/api/composing-proxy'
import examProxyRouter from './routes/api/exam-proxy'
import schoolRouter from './routes/root'
import userPageRouter from './routes/user-page'
import publicPagesRouter from './routes/public_pages'
import userRouter from './routes/api/user'
import sendAnswerEmailsRouter from './routes/api/send-answer-emails'
import examRouter from './routes/api/exam'
import registrationRouter from './routes/api/registration'
import settingsRouter from './routes/api/settings'
import userDevRouter from './routes/dev/users'
import registrationDevRouter from './routes/dev/registration'
import examDevRouter from './routes/dev/exam'
import { importExamHandler } from './routes/api/import-exam-handler'
import cors from 'cors'
import helmet from 'helmet'

app.get('/health-check', (req, res) => res.sendStatus(200))
if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy)
} else {
  app.enable('trust proxy')
}

app.get('/root-page', (req, res) => res.redirect(config.rootPage))

app.get('/kayttoehdot', (req, res) =>
  config.termsOfServicePage ? res.redirect(config.termsOfServicePage.fi) : res.sendStatus(404)
)

app.get('/licensavtal', (req, res) =>
  config.termsOfServicePage ? res.redirect(config.termsOfServicePage.sv) : res.sendStatus(404)
)

passportSetup()
app.use(compress())
app.use(
  helmet.contentSecurityPolicy(
    config.runningInCloud
      ? {}
      : {
          directives: {
            upgradeInsecureRequests: null,
            'worker-src': ['blob:']
          }
        }
  )
)

// Disable response caching at the client side to force IE re-issue ajax requests. Etag support still works and response content
// is not re-sent if it hasn't changed. With this, all requests always hit the server, but content is not necessarily sent if etags match.
app.use((req, res, next) => {
  res.setHeader('Expires', '-1')
  req.connection.encrypted = req.headers['x-forwarded-proto'] === 'https' // eslint-disable-line no-extra-parens
  next()
})

function externalModule(name) {
  return path.dirname(require.resolve(`${name}/package.json`))
}

app.use('/css/attachments.css', (req, res) => res.sendFile(path.resolve(__dirname, '../public/dist/attachments.css')))
app.use('/dist', webpackAssets())
app.use('/locales', express.static(path.join(__dirname, '../public/locales')))
app.use('/mathjax', express.static(externalModule('mathjax')))
app.use('/js/lib/MathJax', express.static(externalModule('mathjax')))
app.use('/js/lib/jquery', express.static(externalModule('jquery')))
app.use('/js/lib/lodash', express.static(externalModule('lodash')))

app.use(requestLogger(logger, { getRemoteUser: req => req.user?.userName }))

app.get('/math.svg', mathSvgHandler)

// The OAuth API needs to be included before the express-session is initialized
// in order to not return the session cookie to the calling application.
if (config.oauth.enabled) {
  import('./auth/oauth')
    .then(oauth => {
      app.options('/resource/exam', cors())
      app.post('/resource/exam', oauth.allowOAuthTokenWithScope('exam:write'), importExamHandler)
      return
    })
    .catch(error => logger.error('Failed to import oauth,', error))
}

app.use(
  session({
    store: new pgSession({
      pool: pgrm.pool,
      tableName: 'session',
      pruneSessionInterval: 60
    }),
    name: 'kurkoSession',
    secret: config.secrets.sessionSecret,
    rolling: true,
    resave: false, // connect-pg-simple recommended value
    saveUninitialized: false,
    cookie: {
      secure: config.runningInCloud,
      maxAge: config.sessionTimeout
    },
    httpOnly: true,
    sameSite: true
  })
)

app.use(/.*(fi|sv)\.json$/, (req, res, next) => {
  delete req.headers['if-none-match']
  delete req.headers['if-modified-since']
  next()
})
function sendFile(filename) {
  return (req, res) => res.sendFile(path.resolve(__dirname, '..', 'public', filename))
}

app.use(passport.initialize())
app.use(passport.session())
// Proxies before bodyParser
app.get('/', (req, res) => {
  res.send(markup(isSuperuser(req)))
})
app.get('/admin', ensureSuperuser, sendFile('admin.html'))
app.use('/exam-api/grading/student/answers', proxying.proxy(`${config.examUri}/grading/student/answers`))
app.use('/exam-api/grading/student/exam', proxying.proxy(`${config.examUri}/grading/student/exam`))
app.use('/screenshot', proxying.proxy(`${config.examUri}/grading/screenshot`)) // Screenshots in rich text answers
app.use('/audio', proxying.proxy(`${config.examUri}/grading/audio`)) // Audio files in audio answers
app.use('/exam-api/grading/answers-meb', ensureAuthenticated, answersMebRouter)
app.use('/exam-api/grading', ensureAuthenticated, gradingRouter)
app.use('/exam-api/composing', ensureAuthenticated, composingProxyRouter)
app.use('/exam-api/exams', examProxyRouter)

app.use(bodyParser.json({ limit: 1024 * 1024 }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieParser())

// The bodyParser.urlencoded needs to be initialized before the OAuth authorization, consent and token routes
if (config.oauth.enabled) {
  import('./auth/oauth')
    .then(oauth => {
      app.get('/oauth/login', sendFile('oauth-login.html'))
      app.get('/oauth/authorize', oauth.authorization)
      app.get('/oauth/consent', sendFile('oauth-consent.html'))

      app.get('/oauth/consent/:transactionId', ensureAuthenticated, oauth.getTransactionDetails)
      app.post('/oauth/consent', oauth.decision)
      app.post('/oauth/token', oauth.allowClientOrigin, oauth.token)
      return
    })
    .catch(error => logger.error('Failed to import oauth,', error))
}

app.post('/redirectSink', redirectSink)
app.use('/school', schoolRouter)
app.use('/registration', userPageRouter)
app.use('/', publicPagesRouter)
app.use('/kurko-api/user', userRouter)
app.use('/kurko-api/send-answer-emails', ensureAuthenticated, sendAnswerEmailsRouter)
app.use('/kurko-api/exam', ensureAuthenticated, examRouter)
app.use('/kurko-api/registration', registrationRouter)
app.use('/kurko-api/settings', settingsRouter)
app.use(
  '/admin-api/impersonate',
  ensureAuthenticated,
  ensureSuperuser,
  proxying.proxy(`${config.examUri}/admin/impersonate/${config.superUserUsername}`)
)
app.use('/admin-api', ensureAuthenticated, ensureSuperuser, proxying.proxy(`${config.examUri}/admin`))
app.use('/digabi2', proxying.proxy(`${config.examUri}/digabi2`))

if (!config.runningInCloud) {
  logger.warn('Enabling dev routes')
  app.use('/kurko-dev/users', userDevRouter)
  app.use('/kurko-dev/registration', registrationDevRouter)
  app.use('/kurko-dev/exam', examDevRouter)
  app.use('/stylesheets/less', express.static(path.join(__dirname, 'less')))
  app.use(allowCrossDomain)
}

function allowCrossDomain(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
}

setupDefaultErrorHandlers(app, config.stackTracesOnErrorResponses, logger)

function redirectSink(req, res) {
  const redirectURI = req.body.redirectUri
  if (!!redirectURI && new URI(redirectURI).is('relative')) {
    res.redirect(req.body.redirectUri)
  } else {
    res.status(403).end()
  }
}

export default app
