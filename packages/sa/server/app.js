'use strict'

import express from 'express'
import path from 'path'
import { logger } from './logger'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import { setupDefaultErrorHandlers, extendTimeoutForUploadRouteWithLargeFiles } from '@digabi/express-utils'
import { requestLogger } from '@digabi/logger'
import session from 'express-session'
import { config } from './config'
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
import ytlConnectionRouter from './routes/api/ytl-connection/session-routes'
import ytlApiRouter, { verifyYtlApiKey } from './routes/api/ytl-connection/api-routes'
import ytlConnectionPublicRouter from './routes/api/ytl-connection/public-routes'
import userDevRouter from './routes/dev/users'
import registrationDevRouter from './routes/dev/registration'
import examDevRouter from './routes/dev/exam'
import helmet from 'helmet'

app.use((req, _res, next) => {
  req.on('aborted', () => {
    logger.warn('Request aborted by the client', { originalUrl: req.originalUrl })
  })
  next()
})

app.get('/health-check', (req, res) => res.sendStatus(200))
if (config().trustProxy) {
  app.set('trust proxy', config().trustProxy)
} else {
  app.enable('trust proxy')
}

app.get('/root-page', (req, res) => res.redirect(config().rootPage))

app.get('/kayttoehdot', (req, res) =>
  config().termsOfServicePage ? res.redirect(config().termsOfServicePage.fi) : res.sendStatus(404)
)

app.get('/licensavtal', (req, res) =>
  config().termsOfServicePage ? res.redirect(config().termsOfServicePage.sv) : res.sendStatus(404)
)

passportSetup()
app.use(compress())
app.use(
  helmet.contentSecurityPolicy(
    config().runningInCloud
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

app.use(
  session({
    store: new pgSession({
      pool: pgrm.pool,
      tableName: 'session',
      pruneSessionInterval: 60
    }),
    name: 'kurkoSession',
    secret: config().sessionSecret,
    rolling: true,
    resave: false, // connect-pg-simple recommended value
    saveUninitialized: false,
    cookie: {
      secure: config().runningInCloud,
      maxAge: config().sessionTimeout
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
app.use('/exam-api/grading/student/answers', proxying.proxy(`${config().examUri}/grading/student/answers`))
app.use('/exam-api/grading/student/exam', proxying.proxy(`${config().examUri}/grading/student/exam`))
app.use('/screenshot', proxying.proxy(`${config().examUri}/grading/screenshot`)) // Screenshots in rich text answers
app.use('/audio', proxying.proxy(`${config().examUri}/grading/audio`)) // Audio files in audio answers
app.use(
  '/exam-api/grading/answers-meb',
  extendTimeoutForUploadRouteWithLargeFiles,
  ensureAuthenticated,
  answersMebRouter
)
app.use('/exam-api/grading', ensureAuthenticated, gradingRouter)
app.use('/exam-api/composing', ensureAuthenticated, composingProxyRouter)
app.use('/exam-api/exams', examProxyRouter)

app.use(bodyParser.json({ limit: 1024 * 1024 }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieParser())

app.post('/redirectSink', redirectSink)
app.use('/school', schoolRouter)
app.use('/registration', userPageRouter)
app.use('/', publicPagesRouter)
app.use('/kurko-api/user', userRouter)
app.use('/kurko-api/send-answer-emails', ensureAuthenticated, sendAnswerEmailsRouter)
app.use('/kurko-api/exam', ensureAuthenticated, examRouter)
app.use('/kurko-api/registration', registrationRouter)
app.use('/kurko-api/settings', settingsRouter)

// Public (no auth needed — digabi2 calls this to exchange PIN for API key)
app.use(ytlConnectionPublicRouter)

// Session-authenticated UI routes
app.use('/kurko-api/ytl-connection', ytlConnectionRouter)

// API-key-protected routes (digabi2 calls with x-ktp-api-key header)
app.use('/ytl-connection', verifyYtlApiKey, ytlApiRouter)

app.use(
  '/admin-api/impersonate',
  ensureAuthenticated,
  ensureSuperuser,
  proxying.proxy(`${config().examUri}/admin/impersonate/${config().superUserUsername}`)
)
app.use('/admin-api', ensureAuthenticated, ensureSuperuser, proxying.proxy(`${config().examUri}/admin`))
app.use('/digabi2', proxying.proxy(`${config().examUri}/digabi2`))

if (!config().runningInCloud) {
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

setupDefaultErrorHandlers(app, config().stackTracesOnErrorResponses, logger)

function redirectSink(req, res) {
  const redirectURI = req.body.redirectUri
  if (!!redirectURI && new URI(redirectURI).is('relative')) {
    res.redirect(req.body.redirectUri)
  } else {
    res.status(403).end()
  }
}

export default app
